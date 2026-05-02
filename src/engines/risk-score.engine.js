const { env } = require("../config/env");

function clamp(num, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num));
}

function riskBand(score) {
  if (score >= env.thresholds.high) return "high";
  if (score >= env.thresholds.medium) return "medium";
  return "low";
}

function computeRiskScore({ weather = {}, risk = {}, social = {} }) {
  const rainScore = clamp((Number(weather.precipitationMm || 0) / 20) * 100);
  const windScore = clamp((Number(weather.windSpeedKmh || 0) / 60) * 100);
  const socialScore = clamp(Number(social.socialVelocity || 0));
  const floodProbabilityScore = clamp(Number(risk.floodProbability || 0));

  const weighted =
    rainScore * env.weights.rain +
    windScore * env.weights.wind +
    socialScore * env.weights.social;

  const finalScore = clamp((weighted + floodProbabilityScore) / 2);
  return {
    score: Number(finalScore.toFixed(2)),
    band: riskBand(finalScore),
    contributors: {
      rainScore,
      windScore,
      socialScore,
      floodProbabilityScore,
    },
  };
}

module.exports = { computeRiskScore };
