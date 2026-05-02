const { env } = require("../config/env");

/**
 * Builds a compact risk + alarms snapshot for dashboards (Arabic copy).
 */
function buildRiskBrief(records = [], earthquakes = [], wildfires = []) {
  const locations = records.map((r) => ({
    locationId: r.location.locationId,
    name: r.location.name,
    lat: r.location.lat,
    lon: r.location.lon,
    score: r.riskScore.score,
    band: r.riskScore.band,
    rainMm: Number(r.weather?.precipitationMm ?? 0),
    windKmh: Number(r.weather?.windSpeedKmh ?? 0),
  }));

  const alarms = [];
  let highest = locations[0];
  for (const loc of locations) {
    if (!highest || loc.score > highest.score) highest = loc;
  }

  for (const loc of locations) {
    if (loc.band === "high") {
      alarms.push({
        level: "critical",
        code: "flood_risk_high",
        text: `خطر فيضان مرتفع — ${loc.name} (${Math.round(loc.score)})`,
        locationId: loc.locationId,
      });
    } else if (loc.band === "medium") {
      alarms.push({
        level: "warning",
        code: "flood_risk_medium",
        text: `تنبيه خطر متوسط — ${loc.name} (${Math.round(loc.score)})`,
        locationId: loc.locationId,
      });
    }
    if (loc.windKmh >= 55) {
      alarms.push({
        level: "warning",
        code: "strong_wind",
        text: `رياح قوية — ${loc.name} (${Math.round(loc.windKmh)} km/h)`,
        locationId: loc.locationId,
      });
    }
    if (loc.rainMm >= 8) {
      alarms.push({
        level: "warning",
        code: "heavy_rain",
        text: `هطول مرتفع — ${loc.name} (${loc.rainMm.toFixed(1)} mm)`,
        locationId: loc.locationId,
      });
    }
  }

  const strongQuakes = earthquakes.filter((e) => Number(e.magnitude) >= 5);
  for (const e of strongQuakes.slice(0, 4)) {
    alarms.push({
      level: "info",
      code: "earthquake",
      text: `زلزال ${e.magnitudeBand || `M${e.magnitude}`} — ${e.place || "منطقة مجاورة"}`,
      eventId: e.eventId,
    });
  }

  if (wildfires.length > 0) {
    const uaeOrNearby = wildfires.filter((f) => f.scope === "in_uae" || f.scope === "nearby").length;
    if (uaeOrNearby > 0) {
      alarms.push({
        level: "warning",
        code: "wildfire_region",
        text: `حرائق مرصودة (${uaeOrNearby} نقطة قريبة من الإمارات)`,
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const a of alarms) {
    const key = `${a.code}:${a.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
    if (deduped.length >= 14) break;
  }

  return {
    generatedAt: new Date().toISOString(),
    overall: {
      maxScore: highest ? Number(highest.score) : 0,
      maxBand: highest?.band ?? "low",
      worstLocation: highest?.name ?? null,
      worstLocationId: highest?.locationId ?? null,
    },
    locations,
    alarms: deduped,
    hazards: {
      earthquakeCount: earthquakes.length,
      wildfireCount: wildfires.length,
    },
    thresholds: {
      medium: env.thresholds.medium,
      high: env.thresholds.high,
    },
  };
}

module.exports = { buildRiskBrief };
