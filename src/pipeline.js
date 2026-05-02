const { env } = require("./config/env");
const { logger } = require("./utils/logger");
const { getWeatherForLocation } = require("./services/weather.service");
const { getRiskForLocation } = require("./services/risk.service");
const { getSocialSignal } = require("./services/social.service");
const { getEarthquakesMena, getWildfiresMena } = require("./services/hazards.service");
const { computeRiskScore } = require("./engines/risk-score.engine");
const { toArcGISFeature, toGeoJSONFeature } = require("./transformers/feature.transformer");
const { syncFeaturesHybrid, syncFeaturesToLayer } = require("./services/arcgis.service");
const { buildRiskBrief } = require("./utils/risk-brief.builder");

const state = {
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastSync: null,
  lastRiskBrief: null,
};

async function collectForLocation(location, ingestionId) {
  const [weather, risk, social] = await Promise.all([
    getWeatherForLocation(location),
    getRiskForLocation(location),
    getSocialSignal(location).catch((error) => {
      logger.warn(
        {
          locationId: location.locationId,
          provider: "reddit",
          status: error?.response?.status || null,
          reason: error?.message || "social unavailable",
        },
        "social signal unavailable; using fallback"
      );
      return {
        locationId: location.locationId,
        socialCount: 0,
        socialVelocity: 0,
        socialEngagement: 0,
        socialAvgScore: 0,
        socialMaxScore: 0,
        socialTopKeyword: "none",
        socialTopSubreddit: "none",
        keywordBreakdown: [],
        subredditBreakdown: [],
        topPosts: [],
        source: "fallback-none",
        observedAt: new Date().toISOString(),
      };
    }),
  ]);
  const riskScore = computeRiskScore({ weather, risk, social });
  const arcgisFeature = toArcGISFeature({ location, weather, risk, social, riskScore, ingestionId });
  const geojson = toGeoJSONFeature(arcgisFeature);
  return { location, weather, risk, social, riskScore, arcgisFeature, geojson };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toHourlyFeatures(records) {
  const features = [];
  for (const record of records) {
    const rows = Array.isArray(record.weather.hourly24) ? record.weather.hourly24 : [];
    for (const hour of rows) {
      features.push({
        attributes: {
          forecastKey: `${record.location.locationId}:${hour.forecastTime}`,
          locationId: record.location.locationId,
          name: record.location.name,
          emirateCode: record.arcgisFeature.attributes.emirateCode,
          country: "UAE",
          lat: record.location.lat,
          lon: record.location.lon,
          forecastTime: hour.forecastTime,
          tempC: hour.tempC,
          rainMm: hour.rainMm,
          windKmh: hour.windKmh,
          windGustKmh: hour.windGustKmh,
          humidityPct: hour.humidityPct,
          visibilityM: hour.visibilityM,
          sourceWeather: record.weather.provider || "open-meteo",
          ingestionId: record.arcgisFeature.attributes.ingestionId,
          updatedAt: new Date().toISOString(),
          updatedUnix: Date.now(),
        },
        geometry: {
          x: record.location.lon,
          y: record.location.lat,
          spatialReference: { wkid: 4326 },
        },
      });
    }
  }
  return features;
}

function toSocialFeatures(records) {
  return records.map((record) => ({
    attributes: {
      locationId: record.location.locationId,
      name: record.location.name,
      emirateCode: record.arcgisFeature.attributes.emirateCode,
      country: "UAE",
      lat: record.location.lat,
      lon: record.location.lon,
      socialCount: record.social.socialCount,
      socialEngagement: record.social.socialEngagement,
      socialVelocity: record.social.socialVelocity,
      socialAvgScore: record.social.socialAvgScore,
      socialMaxScore: record.social.socialMaxScore,
      socialTopKeyword: record.social.socialTopKeyword,
      socialTopSubreddit: record.social.socialTopSubreddit,
      keywordBreakdownJson: JSON.stringify(record.social.keywordBreakdown || []),
      subredditBreakdownJson: JSON.stringify(record.social.subredditBreakdown || []),
      topPostsJson: JSON.stringify(record.social.topPosts || []),
      topPostTitle: record.social.topPosts?.[0]?.title || "",
      topPostSubreddit: record.social.topPosts?.[0]?.subreddit || "",
      topPostScore: Number(record.social.topPosts?.[0]?.score || 0),
      topPostComments: Number(record.social.topPosts?.[0]?.comments || 0),
      topPostUrl: record.social.topPosts?.[0]?.permalink || "",
      observedAt: record.social.observedAt,
      sourceSocial: record.social.source || "reddit",
      dataQualityScore: record.arcgisFeature.attributes.dataQualityScore,
      ingestionId: record.arcgisFeature.attributes.ingestionId,
      updatedAt: new Date().toISOString(),
      updatedUnix: Date.now(),
    },
    geometry: {
      x: record.location.lon,
      y: record.location.lat,
      spatialReference: { wkid: 4326 },
    },
  }));
}

function inferNearestEmirate(lat, lon) {
  const candidates = env.defaultLocations || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !candidates.length) return "Unknown";
  let best = { name: "Unknown", d2: Number.POSITIVE_INFINITY };
  for (const loc of candidates) {
    const dLat = Number(lat) - Number(loc.lat);
    const dLon = Number(lon) - Number(loc.lon);
    const d2 = dLat * dLat + dLon * dLon;
    if (d2 < best.d2) best = { name: loc.name, d2 };
  }
  return best.name || "Unknown";
}

function toEarthquakeFeatures(events) {
  return events.map((e) => ({
    attributes: {
      ...e,
      country: "UAE",
      region: inferNearestEmirate(e.lat, e.lon),
    },
    geometry: { x: e.lon, y: e.lat, spatialReference: { wkid: 4326 } },
  }));
}

function toFireFeatures(events) {
  return events.map((e) => ({
    attributes: {
      ...e,
      country: "UAE",
      region: inferNearestEmirate(e.lat, e.lon),
    },
    geometry: { x: e.lon, y: e.lat, spatialReference: { wkid: 4326 } },
  }));
}

async function runIngestionCycle() {
  state.lastRunAt = new Date().toISOString();
  try {
    const ingestionId = `ing-${Date.now()}`;
    const records = [];
    for (const loc of env.defaultLocations) {
      try {
        const record = await collectForLocation(loc, ingestionId);
        records.push(record);
        // Small pacing gap reduces API burst pressure (Open-Meteo 429 protection).
        await sleep(250);
      } catch (error) {
        logger.warn(
          {
            locationId: loc.locationId,
            reason: error?.message || "unknown error",
          },
          "location collection failed; skipping"
        );
      }
    }

    if (!records.length) {
      throw new Error("all location collections failed");
    }

    const features = records.map((r) => r.arcgisFeature);
    const syncResult = await syncFeaturesHybrid(features);

    const [earthquakes, wildfires] = await Promise.all([
      getEarthquakesMena().catch(() => []),
      getWildfiresMena().catch(() => []),
    ]);

    const weatherHourlySync = await syncFeaturesToLayer({
      featureLayerUrl: env.arcgis.weatherHourlyLayerUrl,
      queryUrl: env.arcgis.weatherHourlyQueryUrl,
      keyField: "forecastKey",
      fieldsToEnsure: [
        { name: "forecastKey", type: "esriFieldTypeString", alias: "forecastKey", length: 150, nullable: true, editable: true },
        { name: "locationId", type: "esriFieldTypeString", alias: "locationId", length: 100, nullable: true, editable: true },
        { name: "name", type: "esriFieldTypeString", alias: "name", length: 100, nullable: true, editable: true },
        { name: "emirateCode", type: "esriFieldTypeString", alias: "emirateCode", length: 10, nullable: true, editable: true },
        { name: "country", type: "esriFieldTypeString", alias: "country", length: 40, nullable: true, editable: true },
        { name: "lat", type: "esriFieldTypeDouble", alias: "lat", nullable: true, editable: true },
        { name: "lon", type: "esriFieldTypeDouble", alias: "lon", nullable: true, editable: true },
        { name: "forecastTime", type: "esriFieldTypeString", alias: "forecastTime", length: 60, nullable: true, editable: true },
        { name: "tempC", type: "esriFieldTypeDouble", alias: "tempC", nullable: true, editable: true },
        { name: "rainMm", type: "esriFieldTypeDouble", alias: "rainMm", nullable: true, editable: true },
        { name: "windKmh", type: "esriFieldTypeDouble", alias: "windKmh", nullable: true, editable: true },
        { name: "windGustKmh", type: "esriFieldTypeDouble", alias: "windGustKmh", nullable: true, editable: true },
        { name: "humidityPct", type: "esriFieldTypeDouble", alias: "humidityPct", nullable: true, editable: true },
        { name: "visibilityM", type: "esriFieldTypeDouble", alias: "visibilityM", nullable: true, editable: true },
        { name: "sourceWeather", type: "esriFieldTypeString", alias: "sourceWeather", length: 80, nullable: true, editable: true },
        { name: "ingestionId", type: "esriFieldTypeString", alias: "ingestionId", length: 80, nullable: true, editable: true },
        { name: "updatedAt", type: "esriFieldTypeString", alias: "updatedAt", length: 60, nullable: true, editable: true },
        { name: "updatedUnix", type: "esriFieldTypeDouble", alias: "updatedUnix", nullable: true, editable: true },
      ],
      features: toHourlyFeatures(records),
    });

    const socialSignalsSync = await syncFeaturesToLayer({
      featureLayerUrl: env.arcgis.socialSignalsLayerUrl,
      queryUrl: env.arcgis.socialSignalsQueryUrl,
      keyField: "locationId",
      fieldsToEnsure: [
        { name: "locationId", type: "esriFieldTypeString", alias: "locationId", length: 100, nullable: true, editable: true },
        { name: "name", type: "esriFieldTypeString", alias: "name", length: 100, nullable: true, editable: true },
        { name: "emirateCode", type: "esriFieldTypeString", alias: "emirateCode", length: 10, nullable: true, editable: true },
        { name: "country", type: "esriFieldTypeString", alias: "country", length: 40, nullable: true, editable: true },
        { name: "lat", type: "esriFieldTypeDouble", alias: "lat", nullable: true, editable: true },
        { name: "lon", type: "esriFieldTypeDouble", alias: "lon", nullable: true, editable: true },
        { name: "socialCount", type: "esriFieldTypeInteger", alias: "socialCount", nullable: true, editable: true },
        { name: "socialEngagement", type: "esriFieldTypeDouble", alias: "socialEngagement", nullable: true, editable: true },
        { name: "socialVelocity", type: "esriFieldTypeDouble", alias: "socialVelocity", nullable: true, editable: true },
        { name: "socialAvgScore", type: "esriFieldTypeDouble", alias: "socialAvgScore", nullable: true, editable: true },
        { name: "socialMaxScore", type: "esriFieldTypeDouble", alias: "socialMaxScore", nullable: true, editable: true },
        { name: "socialTopKeyword", type: "esriFieldTypeString", alias: "socialTopKeyword", length: 150, nullable: true, editable: true },
        { name: "socialTopSubreddit", type: "esriFieldTypeString", alias: "socialTopSubreddit", length: 150, nullable: true, editable: true },
        { name: "keywordBreakdownJson", type: "esriFieldTypeString", alias: "keywordBreakdownJson", length: 4000, nullable: true, editable: true },
        { name: "subredditBreakdownJson", type: "esriFieldTypeString", alias: "subredditBreakdownJson", length: 4000, nullable: true, editable: true },
        { name: "topPostsJson", type: "esriFieldTypeString", alias: "topPostsJson", length: 4000, nullable: true, editable: true },
        { name: "topPostTitle", type: "esriFieldTypeString", alias: "topPostTitle", length: 500, nullable: true, editable: true },
        { name: "topPostSubreddit", type: "esriFieldTypeString", alias: "topPostSubreddit", length: 120, nullable: true, editable: true },
        { name: "topPostScore", type: "esriFieldTypeDouble", alias: "topPostScore", nullable: true, editable: true },
        { name: "topPostComments", type: "esriFieldTypeDouble", alias: "topPostComments", nullable: true, editable: true },
        { name: "topPostUrl", type: "esriFieldTypeString", alias: "topPostUrl", length: 700, nullable: true, editable: true },
        { name: "observedAt", type: "esriFieldTypeString", alias: "observedAt", length: 60, nullable: true, editable: true },
        { name: "sourceSocial", type: "esriFieldTypeString", alias: "sourceSocial", length: 80, nullable: true, editable: true },
        { name: "dataQualityScore", type: "esriFieldTypeDouble", alias: "dataQualityScore", nullable: true, editable: true },
        { name: "ingestionId", type: "esriFieldTypeString", alias: "ingestionId", length: 80, nullable: true, editable: true },
        { name: "updatedAt", type: "esriFieldTypeString", alias: "updatedAt", length: 60, nullable: true, editable: true },
        { name: "updatedUnix", type: "esriFieldTypeDouble", alias: "updatedUnix", nullable: true, editable: true },
      ],
      features: toSocialFeatures(records),
    });

    const earthquakesSync = await syncFeaturesToLayer({
      featureLayerUrl: env.arcgis.earthquakesLayerUrl,
      queryUrl: env.arcgis.earthquakesQueryUrl,
      keyField: "eventId",
      deleteWhere:
        "(scope IS NULL OR scope <> 'global_fallback') AND (lat < 20.5 OR lat > 28.5 OR lon < 49.5 OR lon > 58.5)",
      fieldsToEnsure: [
        { name: "eventId", type: "esriFieldTypeString", alias: "eventId", length: 100, nullable: true, editable: true },
        { name: "magnitude", type: "esriFieldTypeDouble", alias: "magnitude", nullable: true, editable: true },
        { name: "depthKm", type: "esriFieldTypeDouble", alias: "depthKm", nullable: true, editable: true },
        { name: "place", type: "esriFieldTypeString", alias: "place", length: 255, nullable: true, editable: true },
        { name: "eventTime", type: "esriFieldTypeString", alias: "eventTime", length: 60, nullable: true, editable: true },
        { name: "source", type: "esriFieldTypeString", alias: "source", length: 40, nullable: true, editable: true },
        { name: "country", type: "esriFieldTypeString", alias: "country", length: 40, nullable: true, editable: true },
        { name: "region", type: "esriFieldTypeString", alias: "region", length: 80, nullable: true, editable: true },
        { name: "scope", type: "esriFieldTypeString", alias: "scope", length: 20, nullable: true, editable: true },
        { name: "magnitudeBand", type: "esriFieldTypeString", alias: "magnitudeBand", length: 40, nullable: true, editable: true },
        { name: "severityLabel", type: "esriFieldTypeString", alias: "severityLabel", length: 40, nullable: true, editable: true },
        { name: "distanceToUAEkm", type: "esriFieldTypeDouble", alias: "distanceToUAEkm", nullable: true, editable: true },
        { name: "lon", type: "esriFieldTypeDouble", alias: "lon", nullable: true, editable: true },
        { name: "lat", type: "esriFieldTypeDouble", alias: "lat", nullable: true, editable: true },
        { name: "updatedAt", type: "esriFieldTypeString", alias: "updatedAt", length: 60, nullable: true, editable: true },
      ],
      features: toEarthquakeFeatures(earthquakes),
    });

    const fireSync = await syncFeaturesToLayer({
      featureLayerUrl: env.arcgis.firePointsLayerUrl,
      queryUrl: env.arcgis.firePointsQueryUrl,
      keyField: "eventId",
      deleteWhere:
        "(scope IS NULL OR scope <> 'global_fallback') AND (lat < 20.5 OR lat > 28.5 OR lon < 49.5 OR lon > 58.5)",
      fieldsToEnsure: [
        { name: "eventId", type: "esriFieldTypeString", alias: "eventId", length: 100, nullable: true, editable: true },
        { name: "brightness", type: "esriFieldTypeDouble", alias: "brightness", nullable: true, editable: true },
        { name: "brightnessBand", type: "esriFieldTypeString", alias: "brightnessBand", length: 40, nullable: true, editable: true },
        { name: "confidence", type: "esriFieldTypeString", alias: "confidence", length: 50, nullable: true, editable: true },
        { name: "confidenceScore", type: "esriFieldTypeDouble", alias: "confidenceScore", nullable: true, editable: true },
        { name: "acqDate", type: "esriFieldTypeString", alias: "acqDate", length: 60, nullable: true, editable: true },
        { name: "acqTime", type: "esriFieldTypeString", alias: "acqTime", length: 60, nullable: true, editable: true },
        { name: "source", type: "esriFieldTypeString", alias: "source", length: 50, nullable: true, editable: true },
        { name: "country", type: "esriFieldTypeString", alias: "country", length: 40, nullable: true, editable: true },
        { name: "region", type: "esriFieldTypeString", alias: "region", length: 80, nullable: true, editable: true },
        { name: "scope", type: "esriFieldTypeString", alias: "scope", length: 20, nullable: true, editable: true },
        { name: "isNearUrban", type: "esriFieldTypeString", alias: "isNearUrban", length: 10, nullable: true, editable: true },
        { name: "lon", type: "esriFieldTypeDouble", alias: "lon", nullable: true, editable: true },
        { name: "lat", type: "esriFieldTypeDouble", alias: "lat", nullable: true, editable: true },
        { name: "updatedAt", type: "esriFieldTypeString", alias: "updatedAt", length: 60, nullable: true, editable: true },
      ],
      features: toFireFeatures(wildfires),
    });

    state.lastSuccessAt = new Date().toISOString();
    state.lastError = null;
    state.lastSync = syncResult;

    logger.info(
      {
        locations: records.length,
        adds: syncResult.adds,
        updates: syncResult.updates,
        dryRun: syncResult.dryRun,
        weatherHourlyAdds: weatherHourlySync.adds || 0,
        socialSignalsAdds: socialSignalsSync.adds || 0,
      },
      "ingestion cycle finished"
    );

    state.lastRiskBrief = buildRiskBrief(records, earthquakes, wildfires);

    return {
      records,
      syncResult,
      extraSync: {
        weatherHourly: weatherHourlySync,
        socialSignals: socialSignalsSync,
        earthquakes: earthquakesSync,
        firePoints: fireSync,
      },
    };
  } catch (error) {
    state.lastError = error.message;
    logger.error({ err: error }, "ingestion cycle failed");
    throw error;
  }
}

function getPipelineState() {
  return { ...state };
}

function getRiskBrief() {
  return state.lastRiskBrief;
}

module.exports = { runIngestionCycle, getPipelineState, getRiskBrief };
