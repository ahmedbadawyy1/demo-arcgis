const axios = require("axios");
const { env } = require("../config/env");
const { withRetry } = require("../utils/retry");

function isInUaeBounds(lon, lat) {
  // UAE-focused operational bounds (includes all emirates and nearby coastal area).
  return lon >= 51.0 && lon <= 56.7 && lat >= 22.4 && lat <= 26.7;
}

function isInNearbyUaeBounds(lon, lat) {
  // Wider operational envelope around UAE (~300-500km context window).
  return lon >= 49.5 && lon <= 58.5 && lat >= 20.5 && lat <= 28.5;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function earthquakeBand(mag) {
  if (mag >= 6) return "major";
  if (mag >= 4) return "moderate";
  return "minor";
}

function earthquakeSeverity(mag) {
  if (mag >= 6) return "warning";
  if (mag >= 4) return "watch";
  return "normal";
}

async function getEarthquakesMena() {
  return withRetry(async () => {
    const response = await axios.get(env.providers.usgsEarthquakesUrl, {
      timeout: env.requestTimeoutMs,
    });
    const features = response.data?.features || [];
    const rows = features
      .map((f) => {
        const c = f.geometry?.coordinates || [];
        const lon = Number(c[0]);
        const lat = Number(c[1]);
        const magnitude = Number(f.properties?.mag || 0);
        const distanceToUAEkm = Number(haversineKm(lat, lon, 24.4539, 54.3773).toFixed(2));
        return {
          eventId: String(f.id || ""),
          magnitude,
          depthKm: Number(c[2] || 0),
          place: f.properties?.place || "unknown",
          eventTime: new Date(Number(f.properties?.time || Date.now())).toISOString(),
          source: "usgs",
          lon,
          lat,
          magnitudeBand: earthquakeBand(magnitude),
          severityLabel: earthquakeSeverity(magnitude),
          distanceToUAEkm,
          updatedAt: new Date().toISOString(),
        };
      })
      .filter((e) => e.eventId && Number.isFinite(e.lon) && Number.isFinite(e.lat));

    const inUae = rows
      .filter((e) => isInUaeBounds(e.lon, e.lat))
      .map((e) => ({ ...e, scope: "in_uae" }));
    if (inUae.length) return inUae;

    const nearby = rows
      .filter((e) => isInNearbyUaeBounds(e.lon, e.lat) || e.distanceToUAEkm <= 500)
      .sort((a, b) => a.distanceToUAEkm - b.distanceToUAEkm)
      .slice(0, 100)
      .map((e) => ({ ...e, scope: "nearby" }));
    if (nearby.length) return nearby;

    // Final fallback: keep nearest global events to avoid empty operational table.
    return rows
      .sort((a, b) => a.distanceToUAEkm - b.distanceToUAEkm)
      .slice(0, 50)
      .map((e) => ({ ...e, scope: "global_fallback" }));
  });
}

async function getWildfiresMena() {
  return withRetry(async () => {
    const response = await axios.get(env.providers.eonetWildfiresUrl, {
      timeout: env.requestTimeoutMs,
    });
    const events = response.data?.events || [];
    const rows = [];
    for (const event of events) {
      const geom = Array.isArray(event.geometry) ? event.geometry[event.geometry.length - 1] : null;
      const coords = geom?.coordinates || [];
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      const title = String(event.title || "").toLowerCase();
      const looksStrong = title.includes("major") || title.includes("extreme") || title.includes("severe");
      const distanceToUAEkm = Number(haversineKm(lat, lon, 24.4539, 54.3773).toFixed(2));
      rows.push({
        eventId: String(event.id || ""),
        brightness: null,
        confidence: "unknown-eonet",
        confidenceScore: looksStrong ? 80 : 50,
        brightnessBand: looksStrong ? "high" : "unknown",
        acqDate: geom?.date || new Date().toISOString(),
        acqTime: geom?.date || new Date().toISOString(),
        source: "nasa-eonet-events",
        lon,
        lat,
        distanceToUAEkm,
        scope: isInUaeBounds(lon, lat) ? "in_uae" : "nearby",
        isNearUrban: lat >= 22 && lat <= 27 && lon >= 51 && lon <= 57 ? "yes" : "no",
        updatedAt: new Date().toISOString(),
      });
    }
    const inUae = rows.filter((e) => e.scope === "in_uae");
    if (inUae.length) return inUae;
    const nearby = rows
      .filter((e) => isInNearbyUaeBounds(e.lon, e.lat) || e.distanceToUAEkm <= 500)
      .sort((a, b) => a.distanceToUAEkm - b.distanceToUAEkm)
      .slice(0, 150);
    if (nearby.length) return nearby;

    // Final fallback: nearest global wildfire events.
    return rows
      .sort((a, b) => a.distanceToUAEkm - b.distanceToUAEkm)
      .slice(0, 80)
      .map((e) => ({ ...e, scope: "global_fallback" }));
  });
}

module.exports = { getEarthquakesMena, getWildfiresMena };
