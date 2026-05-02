const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3000),
  ingestCron: process.env.INGEST_CRON || "*/5 * * * *",
  dryRun: process.env.DRY_RUN === "true",
  requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 10000),
  retryAttempts: toNumber(process.env.RETRY_ATTEMPTS, 2),
  retryDelayMs: toNumber(process.env.RETRY_DELAY_MS, 500),
  defaultLocations: (
    process.env.DEFAULT_LOCATIONS ||
    "uae-abudhabi,24.4539,54.3773,Abu Dhabi;uae-dubai,25.2048,55.2708,Dubai;uae-sharjah,25.3463,55.4209,Sharjah;uae-ajman,25.4052,55.5136,Ajman;uae-umm-al-quwain,25.5647,55.5552,Umm Al Quwain;uae-ras-al-khaimah,25.8007,55.9762,Ras Al Khaimah;uae-fujairah,25.1288,56.3265,Fujairah"
  )
    .split(";")
    .map((item) => {
      const [locationId, lat, lon, name] = item.split(",");
      return {
        locationId: locationId || "unknown",
        lat: Number(lat),
        lon: Number(lon),
        name: name || locationId || "Unknown",
      };
    }),
  weights: {
    rain: toNumber(process.env.RISK_WEIGHT_RAIN, 0.45),
    wind: toNumber(process.env.RISK_WEIGHT_WIND, 0.25),
    social: toNumber(process.env.RISK_WEIGHT_SOCIAL, 0.3),
  },
  thresholds: {
    medium: toNumber(process.env.RISK_THRESHOLD_MEDIUM, 35),
    high: toNumber(process.env.RISK_THRESHOLD_HIGH, 70),
  },
  socialKeywords: (process.env.SOCIAL_KEYWORDS || "flood UAE,rain Dubai,storm Abu Dhabi")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
  providers: {
    openMeteoBaseUrl: process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com/v1",
    gfmsBaseUrl: process.env.GFMS_BASE_URL || "https://flood.umd.edu/images/MoMOutlook",
    redditBaseUrl: process.env.REDDIT_BASE_URL || "https://www.reddit.com/search.json",
    usgsEarthquakesUrl:
      process.env.USGS_EARTHQUAKES_URL ||
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    eonetWildfiresUrl:
      process.env.EONET_WILDFIRES_URL ||
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires",
  },
  arcgis: {
    portalUrl: process.env.ARCGIS_PORTAL_URL || "",
    username: process.env.ARCGIS_USERNAME || "",
    password: process.env.ARCGIS_PASSWORD || "",
    referer: process.env.ARCGIS_REFERER || "http://localhost",
    featureLayerUrl: process.env.ARCGIS_FEATURE_LAYER_URL || "",
    queryUrl: process.env.ARCGIS_QUERY_URL || "",
    token: process.env.ARCGIS_TOKEN || "",
    tokenExpirationMinutes: toNumber(process.env.ARCGIS_TOKEN_EXP_MINUTES, 60),
    autoCreateLayer: toBool(process.env.ARCGIS_AUTO_CREATE_LAYER, true),
    serviceName: process.env.ARCGIS_SERVICE_NAME || "FloodIntelligence",
    layerName: process.env.ARCGIS_LAYER_NAME || "FloodIntelligencePoints",
    weatherHourlyLayerUrl: process.env.ARCGIS_WEATHER_HOURLY_LAYER_URL || "",
    weatherHourlyQueryUrl: process.env.ARCGIS_WEATHER_HOURLY_QUERY_URL || "",
    socialSignalsLayerUrl: process.env.ARCGIS_SOCIAL_SIGNALS_LAYER_URL || "",
    socialSignalsQueryUrl: process.env.ARCGIS_SOCIAL_SIGNALS_QUERY_URL || "",
    earthquakesLayerUrl: process.env.ARCGIS_EARTHQUAKES_LAYER_URL || "",
    earthquakesQueryUrl: process.env.ARCGIS_EARTHQUAKES_QUERY_URL || "",
    firePointsLayerUrl: process.env.ARCGIS_FIREPOINTS_LAYER_URL || "",
    firePointsQueryUrl: process.env.ARCGIS_FIREPOINTS_QUERY_URL || "",
  },
  windy: {
    defaultLat: toNumber(process.env.WINDY_DEFAULT_LAT, 24.45),
    defaultLon: toNumber(process.env.WINDY_DEFAULT_LON, 54.38),
    defaultZoom: toNumber(process.env.WINDY_DEFAULT_ZOOM, 6),
    overlay: process.env.WINDY_OVERLAY || "wind",
    level: process.env.WINDY_LEVEL || "surface",
    metricWind: process.env.WINDY_METRIC_WIND || "kmh",
    metricTemp: process.env.WINDY_METRIC_TEMP || "default",
    radarRange: process.env.WINDY_RADAR_RANGE || "-1",
  },
};

module.exports = { env };
