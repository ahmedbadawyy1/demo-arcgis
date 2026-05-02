const { computeRiskScore } = require("../src/engines/risk-score.engine");

describe("computeRiskScore", () => {
  test("returns high risk for heavy rain and social spike", () => {
    const result = computeRiskScore({
      weather: { precipitationMm: 30, windSpeedKmh: 45 },
      risk: { floodProbability: 90 },
      social: { socialVelocity: 85 },
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.band).toBe("high");
  });

  test("handles missing social gracefully", () => {
    const result = computeRiskScore({
      weather: { precipitationMm: 2, windSpeedKmh: 6 },
      risk: { floodProbability: 10 },
      social: {},
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(["low", "medium", "high"]).toContain(result.band);
  });
});
