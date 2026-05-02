const { toArcGISFeature, toGeoJSONFeature } = require("../src/transformers/feature.transformer");

describe("feature transformer", () => {
  test("maps aggregate data to ArcGIS and GeoJSON", () => {
    const arc = toArcGISFeature({
      location: { locationId: "uae-abudhabi", name: "Abu Dhabi", lat: 24.45, lon: 54.38 },
      weather: { observedAt: "2026-04-30T00:00:00Z", temperatureC: 35, windSpeedKmh: 10, precipitationMm: 5 },
      risk: { floodProbability: 40 },
      social: { socialCount: 12, socialVelocity: 24 },
      riskScore: { score: 50, band: "medium" },
    });

    expect(arc.attributes.locationId).toBe("uae-abudhabi");
    expect(arc.geometry.x).toBe(54.38);

    const geo = toGeoJSONFeature(arc);
    expect(geo.type).toBe("Feature");
    expect(geo.geometry.coordinates).toEqual([54.38, 24.45]);
  });
});
