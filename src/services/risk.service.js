const axios = require("axios");
const { env } = require("../config/env");
const { withRetry } = require("../utils/retry");

async function getRiskForLocation(location) {
  return withRetry(
    async () => {
      // MVP risk proxy: derive hydrological stress from weather-friendly public endpoint availability.
      // Replace with Copernicus/GFMS official endpoint payload mapping in production.
      const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
        timeout: env.requestTimeoutMs,
        params: {
          latitude: location.lat,
          longitude: location.lon,
          hourly: "precipitation_probability",
          forecast_days: 1,
        },
      });

      const hourly = response.data.hourly || {};
      const probs = Array.isArray(hourly.precipitation_probability)
        ? hourly.precipitation_probability
        : [];
      const maxProbability = probs.length ? Math.max(...probs) : 0;

      return {
        locationId: location.locationId,
        floodProbability: Number(maxProbability),
        source: "risk-proxy-open-meteo",
        observedAt: new Date().toISOString(),
      };
    },
    { attempts: env.retryAttempts, delayMs: env.retryDelayMs }
  );
}

module.exports = { getRiskForLocation };
