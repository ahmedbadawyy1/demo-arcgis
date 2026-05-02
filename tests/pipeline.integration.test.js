jest.mock("../src/services/weather.service", () => ({
  getWeatherForLocation: jest.fn(async (loc) => ({
    locationId: loc.locationId,
    observedAt: "2026-04-30T00:00:00Z",
    temperatureC: 30,
    precipitationMm: 8,
    windSpeedKmh: 20,
    hourly24: [],
  })),
}));

jest.mock("../src/services/risk.service", () => ({
  getRiskForLocation: jest.fn(async (loc) => ({
    locationId: loc.locationId,
    floodProbability: 55,
  })),
}));

jest.mock("../src/services/social.service", () => ({
  getSocialSignal: jest.fn(async (loc) => ({
    locationId: loc.locationId,
    socialCount: 20,
    socialVelocity: 40,
  })),
}));

jest.mock("../src/services/arcgis.service", () => ({
  syncFeaturesHybrid: jest.fn(async (features) => ({
    dryRun: true,
    adds: features.length,
    updates: 0,
  })),
  syncFeaturesToLayer: jest.fn(async () => ({
    dryRun: true,
    adds: 0,
    updates: 0,
  })),
}));

jest.mock("../src/services/hazards.service", () => ({
  getEarthquakesMena: jest.fn(async () => []),
  getWildfiresMena: jest.fn(async () => []),
}));

const { runIngestionCycle } = require("../src/pipeline");

describe("pipeline integration", () => {
  test("completes ingestion cycle and returns sync stats", async () => {
    const result = await runIngestionCycle();
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.syncResult.dryRun).toBe(true);
    expect(result.syncResult.adds).toBe(result.records.length);
  });
});
