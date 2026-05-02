const axios = require("axios");
const { env } = require("../config/env");
const { withRetry } = require("../utils/retry");

function pickDailyValue(daily, key, index = 0) {
  if (!daily || !Array.isArray(daily[key])) return 0;
  return Number(daily[key][index] || 0);
}

function buildHourly24(hourly) {
  const times = Array.isArray(hourly?.time) ? hourly.time : [];
  const rows = times.slice(0, 24).map((time, i) => ({
    forecastTime: time,
    tempC: Number(hourly.temperature_2m?.[i] || 0),
    rainMm: Number(hourly.precipitation?.[i] || 0),
    windKmh: Number(hourly.wind_speed_10m?.[i] || 0),
    windGustKmh: Number(hourly.wind_gusts_10m?.[i] || 0),
    humidityPct: Number(hourly.relative_humidity_2m?.[i] || 0),
    visibilityM: Number(hourly.visibility?.[i] || 0),
  }));
  return rows;
}

async function getWeatherForLocation(location) {
  return withRetry(
    async () => {
      const response = await axios.get(`${env.providers.openMeteoBaseUrl}/forecast`, {
        timeout: env.requestTimeoutMs,
        params: {
          latitude: location.lat,
          longitude: location.lon,
          current:
            "temperature_2m,apparent_temperature,precipitation,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,pressure_msl,cloud_cover,visibility",
          hourly:
            "temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,visibility",
          daily: "temperature_2m_max,precipitation_sum,wind_gusts_10m_max",
          forecast_days: 2,
          forecast_hours: 24,
          timezone: "auto",
        },
      });

      const current = response.data.current || {};
      const daily = response.data.daily || {};
      const hourly = response.data.hourly || {};
      const hourly24 = buildHourly24(hourly);
      const nextHour = hourly24[1] || hourly24[0] || {};
      return {
        locationId: location.locationId,
        observedAt: current.time || new Date().toISOString(),
        temperatureC: Number(current.temperature_2m || 0),
        feelsLikeC: Number(current.apparent_temperature || 0),
        humidityPct: Number(current.relative_humidity_2m || 0),
        pressureHpa: Number(current.pressure_msl || 0),
        cloudCoverPct: Number(current.cloud_cover || 0),
        visibilityM: Number(current.visibility || 0),
        precipitationMm: Number(current.precipitation || 0),
        windSpeedKmh: Number(current.wind_speed_10m || 0),
        windGustKmh: Number(current.wind_gusts_10m || 0),
        forecastTempMax24h: pickDailyValue(daily, "temperature_2m_max", 0),
        forecastRain24h: pickDailyValue(daily, "precipitation_sum", 0),
        windGustMax24h: pickDailyValue(daily, "wind_gusts_10m_max", 0),
        tempTrend1h: Number(((nextHour.tempC || 0) - Number(current.temperature_2m || 0)).toFixed(2)),
        rainTrend1h: Number(((nextHour.rainMm || 0) - Number(current.precipitation || 0)).toFixed(2)),
        windTrend1h: Number(((nextHour.windKmh || 0) - Number(current.wind_speed_10m || 0)).toFixed(2)),
        hourly24,
        provider: "open-meteo",
      };
    },
    { attempts: env.retryAttempts, delayMs: env.retryDelayMs }
  );
}

module.exports = { getWeatherForLocation };
