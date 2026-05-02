const { env } = require("../config/env");

/**
 * Official Windy embed (iframe). Terms require Windy branding to remain visible.
 * Configure interactively: https://embed.windy.com/config/map
 */
function buildWindyEmbedUrl(overrides = {}) {
  const lat = Number(overrides.lat ?? env.windy.defaultLat);
  const lon = Number(overrides.lon ?? env.windy.defaultLon);
  const zoom = Number(overrides.zoom ?? env.windy.defaultZoom);
  const overlay = String(overrides.overlay || env.windy.overlay || "wind").trim();

  const detailLat = overrides.detailLat != null ? Number(overrides.detailLat) : lat;
  const detailLon = overrides.detailLon != null ? Number(overrides.detailLon) : lon;

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    zoom: String(zoom),
    level: String(overrides.level || env.windy.level || "surface"),
    overlay,
    menu: "",
    message: "",
    marker: "",
    calendar: "",
    pressure: "",
    type: "map",
    location: "coordinates",
    detail: "",
    detailLat: String(detailLat),
    detailLon: String(detailLon),
    metricWind: String(overrides.metricWind || env.windy.metricWind || "kmh"),
    metricTemp: String(overrides.metricTemp || env.windy.metricTemp || "default"),
    radarRange: String(overrides.radarRange ?? env.windy.radarRange ?? "-1"),
  });

  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

module.exports = { buildWindyEmbedUrl };
