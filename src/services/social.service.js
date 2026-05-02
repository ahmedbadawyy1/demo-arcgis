const axios = require("axios");
const { env } = require("../config/env");
const { withRetry } = require("../utils/retry");

function clamp(num, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num));
}

function normalizePost(rawPost, keyword) {
  const data = rawPost?.data || {};
  return {
    id: data.id || "",
    title: data.title || "",
    subreddit: data.subreddit || "unknown",
    score: Number(data.score || 0),
    comments: Number(data.num_comments || 0),
    createdUtc: Number(data.created_utc || 0),
    permalink: data.permalink ? `https://www.reddit.com${data.permalink}` : "",
    keyword,
  };
}

async function searchPostsForKeyword(keyword) {
  const response = await axios.get(env.providers.redditBaseUrl, {
    timeout: env.requestTimeoutMs,
    headers: { "User-Agent": "arcgis-flood-intelligence/1.0" },
    params: {
      q: keyword,
      sort: "new",
      t: "day",
      limit: 25,
    },
  });
  const children = response.data?.data?.children || [];
  return children.map((post) => normalizePost(post, keyword)).filter((p) => p.id);
}

function aggregateKeywordCounts(posts) {
  return posts.reduce((acc, post) => {
    acc[post.keyword] = (acc[post.keyword] || 0) + 1;
    return acc;
  }, {});
}

function aggregateSubredditCounts(posts) {
  return posts.reduce((acc, post) => {
    acc[post.subreddit] = (acc[post.subreddit] || 0) + 1;
    return acc;
  }, {});
}

function sortCountMap(countMap) {
  return Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

async function getSocialSignal(location) {
  return withRetry(
    async () => {
      const keywords = env.socialKeywords.map((k) => `${k} ${location.name}`);
      const postBuckets = await Promise.all(keywords.map((k) => searchPostsForKeyword(k)));
      const allPosts = postBuckets.flat();

      // Deduplicate posts that match multiple keywords.
      const byId = new Map();
      for (const post of allPosts) {
        if (!byId.has(post.id)) byId.set(post.id, post);
      }
      const uniquePosts = [...byId.values()];

      const socialCount = uniquePosts.length;
      const engagementTotal = uniquePosts.reduce((acc, p) => acc + p.score + p.comments, 0);
      const avgScore = socialCount ? uniquePosts.reduce((acc, p) => acc + p.score, 0) / socialCount : 0;
      const maxScore = socialCount ? Math.max(...uniquePosts.map((p) => p.score)) : 0;

      const keywordCounts = sortCountMap(aggregateKeywordCounts(uniquePosts));
      const subredditCounts = sortCountMap(aggregateSubredditCounts(uniquePosts));
      const topPosts = [...uniquePosts]
        .sort((a, b) => b.score + b.comments - (a.score + a.comments))
        .slice(0, 5);

      // Velocity blends volume and engagement so spikes from low-count/high-impact posts are captured.
      const socialVelocity = clamp(socialCount * 1.2 + engagementTotal / 20);

      return {
        locationId: location.locationId,
        socialCount,
        socialVelocity,
        socialEngagement: engagementTotal,
        socialAvgScore: Number(avgScore.toFixed(2)),
        socialMaxScore: maxScore,
        socialTopKeyword: keywordCounts[0]?.label || "none",
        socialTopSubreddit: subredditCounts[0]?.label || "none",
        keywordBreakdown: keywordCounts,
        subredditBreakdown: subredditCounts,
        topPosts,
        source: "reddit",
        observedAt: new Date().toISOString(),
      };
    },
    {
      attempts: env.retryAttempts,
      delayMs: env.retryDelayMs,
    }
  );
}

module.exports = { getSocialSignal };
