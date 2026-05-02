const axios = require("axios");
const { env } = require("../config/env");

let tokenCache = {
  token: env.arcgis.token || "",
  expiresAt: 0,
};
let resolvedFeatureLayerUrl = env.arcgis.featureLayerUrl || "";
let resolvedQueryUrl = env.arcgis.queryUrl || "";

function sanitizeUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function normalizeLayer0Url(url) {
  const clean = sanitizeUrl(url);
  if (!clean) return "";
  return /\/FeatureServer\/\d+$/i.test(clean) ? clean : `${clean}/0`;
}

function hasCachedValidToken() {
  return Boolean(tokenCache.token) && Date.now() < tokenCache.expiresAt;
}

async function generatePortalToken() {
  if (!env.arcgis.portalUrl || !env.arcgis.username || !env.arcgis.password) {
    return env.arcgis.token || "";
  }

  if (hasCachedValidToken()) return tokenCache.token;

  const url = `${env.arcgis.portalUrl.replace(/\/$/, "")}/sharing/rest/generateToken`;
  const payload = new URLSearchParams({
    f: "json",
    username: env.arcgis.username,
    password: env.arcgis.password,
    referer: env.arcgis.referer,
    client: "referer",
    expiration: String(env.arcgis.tokenExpirationMinutes),
  });

  const response = await axios.post(url, payload, {
    timeout: env.requestTimeoutMs,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!response.data?.token) {
    throw new Error(response.data?.error?.message || "failed to generate ArcGIS token");
  }

  tokenCache = {
    token: response.data.token,
    // refresh 1 minute before expected expiry
    expiresAt: Date.now() + (env.arcgis.tokenExpirationMinutes * 60 - 60) * 1000,
  };
  return tokenCache.token;
}

function getPortalBase() {
  return env.arcgis.portalUrl.replace(/\/$/, "");
}

function buildHostedFeatureLayerUrl(serviceName) {
  return `${getPortalBase()}/rest/services/Hosted/${serviceName}/FeatureServer/0`;
}

function buildHostedQueryUrl(serviceName) {
  return `${buildHostedFeatureLayerUrl(serviceName)}/query`;
}

function parseArcGisErrorMessage(data, fallback) {
  const details = data?.error?.details;
  if (Array.isArray(details) && details.length) return details.join(" | ");
  return data?.error?.message || fallback;
}

function normalizeServiceUrl(urlLike) {
  if (!urlLike) return "";
  const raw = sanitizeUrl(urlLike);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, "");
  if (raw.startsWith("/")) return `${getPortalBase()}${raw}`.replace(/\/$/, "");
  return "";
}

function buildDefaultFieldSchema() {
  return [
    { name: "OBJECTID", type: "esriFieldTypeOID", alias: "OBJECTID", nullable: false, editable: false },
    { name: "locationId", type: "esriFieldTypeString", alias: "locationId", length: 100, nullable: true, editable: true },
    { name: "name", type: "esriFieldTypeString", alias: "name", length: 150, nullable: true, editable: true },
    { name: "emirateCode", type: "esriFieldTypeString", alias: "emirateCode", length: 10, nullable: true, editable: true },
    { name: "country", type: "esriFieldTypeString", alias: "country", length: 40, nullable: true, editable: true },
    { name: "lat", type: "esriFieldTypeDouble", alias: "lat", nullable: true, editable: true },
    { name: "lon", type: "esriFieldTypeDouble", alias: "lon", nullable: true, editable: true },
    { name: "observationTime", type: "esriFieldTypeString", alias: "observationTime", length: 60, nullable: true, editable: true },
    { name: "feelsLikeC", type: "esriFieldTypeDouble", alias: "feelsLikeC", nullable: true, editable: true },
    { name: "humidityPct", type: "esriFieldTypeDouble", alias: "humidityPct", nullable: true, editable: true },
    { name: "pressureHpa", type: "esriFieldTypeDouble", alias: "pressureHpa", nullable: true, editable: true },
    { name: "cloudCoverPct", type: "esriFieldTypeDouble", alias: "cloudCoverPct", nullable: true, editable: true },
    { name: "visibilityM", type: "esriFieldTypeDouble", alias: "visibilityM", nullable: true, editable: true },
    { name: "tempC", type: "esriFieldTypeDouble", alias: "tempC", nullable: true, editable: true },
    { name: "windKmh", type: "esriFieldTypeDouble", alias: "windKmh", nullable: true, editable: true },
    { name: "windGustKmh", type: "esriFieldTypeDouble", alias: "windGustKmh", nullable: true, editable: true },
    { name: "rainMm", type: "esriFieldTypeDouble", alias: "rainMm", nullable: true, editable: true },
    { name: "forecastTempMax24h", type: "esriFieldTypeDouble", alias: "forecastTempMax24h", nullable: true, editable: true },
    { name: "forecastRain24h", type: "esriFieldTypeDouble", alias: "forecastRain24h", nullable: true, editable: true },
    { name: "windGustMax24h", type: "esriFieldTypeDouble", alias: "windGustMax24h", nullable: true, editable: true },
    { name: "tempTrend1h", type: "esriFieldTypeDouble", alias: "tempTrend1h", nullable: true, editable: true },
    { name: "rainTrend1h", type: "esriFieldTypeDouble", alias: "rainTrend1h", nullable: true, editable: true },
    { name: "windTrend1h", type: "esriFieldTypeDouble", alias: "windTrend1h", nullable: true, editable: true },
    { name: "aqi", type: "esriFieldTypeDouble", alias: "aqi", nullable: true, editable: true },
    { name: "floodProbability", type: "esriFieldTypeDouble", alias: "floodProbability", nullable: true, editable: true },
    { name: "socialCount", type: "esriFieldTypeInteger", alias: "socialCount", nullable: true, editable: true },
    { name: "socialVelocity", type: "esriFieldTypeDouble", alias: "socialVelocity", nullable: true, editable: true },
    { name: "socialEngagement", type: "esriFieldTypeDouble", alias: "socialEngagement", nullable: true, editable: true },
    { name: "socialAvgScore", type: "esriFieldTypeDouble", alias: "socialAvgScore", nullable: true, editable: true },
    { name: "socialMaxScore", type: "esriFieldTypeDouble", alias: "socialMaxScore", nullable: true, editable: true },
    { name: "socialTopKeyword", type: "esriFieldTypeString", alias: "socialTopKeyword", length: 150, nullable: true, editable: true },
    { name: "socialTopSubreddit", type: "esriFieldTypeString", alias: "socialTopSubreddit", length: 150, nullable: true, editable: true },
    { name: "riskScore", type: "esriFieldTypeDouble", alias: "riskScore", nullable: true, editable: true },
    { name: "riskBand", type: "esriFieldTypeString", alias: "riskBand", length: 30, nullable: true, editable: true },
    { name: "alertLevel", type: "esriFieldTypeString", alias: "alertLevel", length: 30, nullable: true, editable: true },
    { name: "riskReason", type: "esriFieldTypeString", alias: "riskReason", length: 255, nullable: true, editable: true },
    { name: "sourceWeather", type: "esriFieldTypeString", alias: "sourceWeather", length: 80, nullable: true, editable: true },
    { name: "sourceSocial", type: "esriFieldTypeString", alias: "sourceSocial", length: 80, nullable: true, editable: true },
    { name: "sourceRisk", type: "esriFieldTypeString", alias: "sourceRisk", length: 80, nullable: true, editable: true },
    { name: "dataQualityScore", type: "esriFieldTypeDouble", alias: "dataQualityScore", nullable: true, editable: true },
    { name: "ingestionId", type: "esriFieldTypeString", alias: "ingestionId", length: 80, nullable: true, editable: true },
    { name: "updatedAt", type: "esriFieldTypeString", alias: "updatedAt", length: 60, nullable: true, editable: true },
    { name: "updatedUnix", type: "esriFieldTypeDouble", alias: "updatedUnix", nullable: true, editable: true },
  ];
}

function requiredBusinessFields() {
  return buildDefaultFieldSchema().filter((f) => f.name !== "OBJECTID" && f.name !== "GlobalID");
}

async function fetchLayerDefinition(featureLayerUrl, token) {
  const response = await axios.get(featureLayerUrl, {
    params: {
      f: "json",
      token: token || undefined,
    },
    timeout: env.requestTimeoutMs,
  });
  return response.data || {};
}

async function ensureLayerFields(featureLayerUrl, token, fieldDefs = requiredBusinessFields()) {
  const def = await fetchLayerDefinition(featureLayerUrl, token);
  const existing = new Set((def.fields || []).map((f) => String(f.name || "").toLowerCase()));
  const missing = fieldDefs.filter((f) => !existing.has(String(f.name).toLowerCase()));
  if (!missing.length) return { added: 0 };

  const addPayload = JSON.stringify({ fields: missing });
  const publicUrl = `${featureLayerUrl.replace(/\/$/, "")}/addToDefinition`;

  const adminUrl = featureLayerUrl
    .replace("/rest/services/", "/rest/admin/services/")
    .replace(/\/$/, "")
    .concat("/addToDefinition");

  const candidates = [publicUrl, adminUrl];
  let lastError = null;

  for (const addUrl of candidates) {
    const payload = new URLSearchParams({
      f: "json",
      token: token || "",
      addToDefinition: addPayload,
    });
    const response = await axios.post(addUrl, payload, {
      timeout: env.requestTimeoutMs,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const errMsg = parseArcGisErrorMessage(response.data, "failed to add missing layer fields");
    const alreadyExistsish =
      String(errMsg).toLowerCase().includes("already exists") ||
      String(errMsg).toLowerCase().includes("duplicate");
    if (!response.data?.error || alreadyExistsish) {
      return { added: missing.length };
    }
    lastError = `${errMsg} (addToDefinitionUrl=${addUrl})`;
  }

  throw new Error(lastError || "failed to add layer fields");
}

async function layerExists(url, token) {
  if (!url) return false;
  try {
    const response = await axios.get(url, {
      params: { f: "json", token: token || undefined },
      timeout: env.requestTimeoutMs,
    });
    return Boolean(response.data) && !response.data.error;
  } catch (error) {
    return false;
  }
}

async function createHostedFeatureService(token) {
  const serviceName = env.arcgis.serviceName;
  const createUrl = `${getPortalBase()}/sharing/rest/content/users/${encodeURIComponent(
    env.arcgis.username
  )}/createService`;

  const createParameters = {
    name: serviceName,
    serviceName,
    serviceDescription: "Flood intelligence auto-created service",
    spatialReference: { wkid: 4326 },
    capabilities: "Create,Delete,Query,Update,Editing",
    maxRecordCount: 2000,
    hasStaticData: false,
    supportedQueryFormats: "JSON,geoJSON",
  };

  const payload = new URLSearchParams({
    f: "json",
    token,
    outputType: "featureService",
    createParameters: JSON.stringify(createParameters),
  });

  const createResponse = await axios.post(createUrl, payload, {
    timeout: env.requestTimeoutMs,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (createResponse.data?.error && !String(createResponse.data.error?.message || "").includes("already exists")) {
    throw new Error(parseArcGisErrorMessage(createResponse.data, "failed to create hosted feature service"));
  }

  const discoveredUrl =
    createResponse.data?.serviceurl ||
    createResponse.data?.serviceUrl ||
    createResponse.data?.encodedServiceURL ||
    "";
  return normalizeServiceUrl(discoveredUrl);
}

async function addLayerDefinition(token, featureLayerUrl) {
  const normalizedFeatureLayerUrl = sanitizeUrl(featureLayerUrl);
  if (!normalizedFeatureLayerUrl || !/^https?:\/\//i.test(normalizedFeatureLayerUrl)) {
    throw new Error(`Invalid URL for feature layer: ${String(featureLayerUrl || "empty")}`);
  }
  const serviceAddToDefinitionUrl = `${getPortalBase()}/admin/services/Hosted/${encodeURIComponent(
    env.arcgis.serviceName
  )}.FeatureServer/addToDefinition`;

  const createLayerDefinition = {
    layers: [
      {
        id: 0,
        name: env.arcgis.layerName,
        type: "Feature Layer",
        displayField: "name",
        geometryType: "esriGeometryPoint",
        objectIdField: "OBJECTID",
        fields: buildDefaultFieldSchema(),
        extent: {
          xmin: 51,
          ymin: 22,
          xmax: 57,
          ymax: 27,
          spatialReference: { wkid: 4326 },
        },
        spatialReference: { wkid: 4326 },
      },
    ],
  };

  const createLayerPayload = new URLSearchParams({
    f: "json",
    token,
    addToDefinition: JSON.stringify(createLayerDefinition),
  });

  const createLayerResponse = await axios.post(serviceAddToDefinitionUrl, createLayerPayload, {
    timeout: env.requestTimeoutMs,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const createLayerMessage = parseArcGisErrorMessage(
    createLayerResponse.data,
    "failed to create layer definition"
  );
  const createLayerAlreadyExists =
    String(createLayerMessage).toLowerCase().includes("already exists") ||
    String(createLayerMessage).toLowerCase().includes("duplicate");
  if (createLayerResponse.data?.error && !createLayerAlreadyExists) {
    throw new Error(
      `${createLayerMessage} (serviceAddToDefinitionUrl=${serviceAddToDefinitionUrl})`
    );
  }
}

async function ensureFeatureLayerReady(token) {
  const explicitConfigured = resolvedFeatureLayerUrl || env.arcgis.featureLayerUrl;
  if (await layerExists(explicitConfigured, token)) {
    resolvedFeatureLayerUrl = explicitConfigured;
    resolvedQueryUrl = resolvedQueryUrl || env.arcgis.queryUrl || `${explicitConfigured}/query`;
    return;
  }

  if (!env.arcgis.autoCreateLayer) {
    return;
  }
  if (!env.arcgis.portalUrl || !env.arcgis.username) {
    return;
  }

  const discoveredUrl = await createHostedFeatureService(token);

  const autoUrl = discoveredUrl || buildHostedFeatureLayerUrl(env.arcgis.serviceName);
  await addLayerDefinition(token, autoUrl);
  const existsAfterCreate = await layerExists(autoUrl, token);
  if (!existsAfterCreate) {
    throw new Error("feature layer still unavailable after auto-create");
  }
  resolvedFeatureLayerUrl = autoUrl;
  resolvedQueryUrl = buildHostedQueryUrl(env.arcgis.serviceName);
}

function buildQueryParams(locationIds, token) {
  const safeIds = locationIds.map((id) => `'${String(id).replace(/'/g, "''")}'`);
  return {
    f: "json",
    where: `locationId IN (${safeIds.join(",")})`,
    outFields: "OBJECTID,locationId",
    returnGeometry: false,
    token: token || undefined,
  };
}

async function queryExistingByKeys(queryUrl, keyField, ids, token) {
  if (!queryUrl) return new Map();
  const byKey = new Map();
  if (!ids.length) return byKey;

  const chunkSize = 40;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const where = `${keyField} IN (${chunk.map((id) => `'${String(id).replace(/'/g, "''")}'`).join(",")})`;

    const payload = new URLSearchParams({
      f: "json",
      where,
      outFields: `OBJECTID,${keyField}`,
      returnGeometry: "false",
    });
    if (token) payload.append("token", token);

    const response = await axios.post(queryUrl, payload, {
      timeout: env.requestTimeoutMs,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const features = response.data?.features || [];
    for (const feature of features) {
      const attrs = feature.attributes || {};
      if (attrs[keyField] && attrs.OBJECTID) byKey.set(attrs[keyField], attrs.OBJECTID);
    }
  }
  return byKey;
}

async function queryObjectIdsByWhere(queryUrl, where, token) {
  if (!queryUrl || !where) return [];
  const payload = new URLSearchParams({
    f: "json",
    where,
    outFields: "OBJECTID",
    returnGeometry: "false",
  });
  if (token) payload.append("token", token);
  const response = await axios.post(queryUrl, payload, {
    timeout: env.requestTimeoutMs,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return (response.data?.features || [])
    .map((f) => f?.attributes?.OBJECTID)
    .filter((id) => Number.isFinite(Number(id)))
    .map((id) => Number(id));
}

async function syncFeaturesToLayer({
  featureLayerUrl,
  queryUrl,
  keyField,
  fieldsToEnsure = [],
  features,
  deleteWhere = "",
}) {
  const token = await generatePortalToken();
  const layer0Url = normalizeLayer0Url(featureLayerUrl);
  const queryEndpoint = sanitizeUrl(queryUrl || `${layer0Url}/query`);
  if (!layer0Url) {
    return { dryRun: true, reason: "missing-feature-layer-url", adds: features.length, updates: 0 };
  }

  try {
    if (fieldsToEnsure.length) await ensureLayerFields(layer0Url, token, fieldsToEnsure);
  } catch (error) {
    return {
      dryRun: true,
      reason: "arcgis-schema-ensure-failed",
      details: error.message,
      adds: features.length,
      updates: 0,
    };
  }

  const ids = features.map((f) => f.attributes[keyField]).filter(Boolean);
  const existing = await queryExistingByKeys(queryEndpoint, keyField, ids, token);
  const adds = [];
  const updates = [];

  for (const feature of features) {
    const existingObjectId = existing.get(feature.attributes[keyField]);
    if (existingObjectId) {
      updates.push({
        ...feature,
        attributes: { ...feature.attributes, OBJECTID: existingObjectId },
      });
    } else {
      adds.push(feature);
    }
  }

  if (env.dryRun) {
    return { dryRun: true, adds: adds.length, updates: updates.length, deletes: 0 };
  }

  let deleteObjectIds = [];
  if (deleteWhere) {
    try {
      deleteObjectIds = await queryObjectIdsByWhere(queryEndpoint, deleteWhere, token);
    } catch (_error) {
      deleteObjectIds = [];
    }
  }

  const payload = new URLSearchParams({
    f: "json",
    adds: JSON.stringify(adds),
    updates: JSON.stringify(updates),
    deletes: deleteObjectIds.join(","),
  });
  if (token) payload.append("token", token);

  const response = await axios.post(`${layer0Url}/applyEdits`, payload, {
    timeout: env.requestTimeoutMs,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return {
    dryRun: false,
    adds: adds.length,
    updates: updates.length,
    deletes: deleteObjectIds.length,
    result: response.data,
  };
}

async function syncFeaturesHybrid(features) {
  const token = await generatePortalToken();
  try {
    await ensureFeatureLayerReady(token);
  } catch (error) {
    return {
      dryRun: true,
      reason: "arcgis-bootstrap-failed",
      details: error.message,
      adds: features.length,
      updates: 0,
    };
  }

  return syncFeaturesToLayer({
    featureLayerUrl: resolvedFeatureLayerUrl || env.arcgis.featureLayerUrl,
    queryUrl: resolvedQueryUrl || env.arcgis.queryUrl,
    keyField: "locationId",
    fieldsToEnsure: requiredBusinessFields(),
    features,
  });
}

module.exports = { syncFeaturesHybrid, generatePortalToken, syncFeaturesToLayer };
