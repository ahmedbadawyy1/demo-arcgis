function toArcGISFeature({ location, weather, risk, social, riskScore, ingestionId }) {
  const emirateCodeMap = {
    "uae-abudhabi": "AUH",
    "uae-dubai": "DXB",
    "uae-sharjah": "SHJ",
    "uae-ajman": "AJM",
    "uae-umm-al-quwain": "UAQ",
    "uae-ras-al-khaimah": "RAK",
    "uae-fujairah": "FUJ",
  };
  const updatedAt = new Date().toISOString();
  const dataQualityScore = [weather.temperatureC, weather.humidityPct, weather.windSpeedKmh, social.socialCount]
    .filter((v) => Number.isFinite(Number(v))).length * 25;
  const riskReason =
    riskScore.score >= 70
      ? "High combined weather and social pressure"
      : riskScore.score >= 35
      ? "Moderate weather-social pressure"
      : "Low combined pressure";
  return {
    attributes: {
      locationId: location.locationId,
      name: location.name,
      emirateCode: emirateCodeMap[location.locationId] || "UAE",
      country: "UAE",
      lat: location.lat,
      lon: location.lon,
      observationTime: weather.observedAt,
      feelsLikeC: weather.feelsLikeC,
      humidityPct: weather.humidityPct,
      pressureHpa: weather.pressureHpa,
      cloudCoverPct: weather.cloudCoverPct,
      visibilityM: weather.visibilityM,
      tempC: weather.temperatureC,
      windKmh: weather.windSpeedKmh,
      windGustKmh: weather.windGustKmh,
      rainMm: weather.precipitationMm,
      forecastTempMax24h: weather.forecastTempMax24h,
      forecastRain24h: weather.forecastRain24h,
      windGustMax24h: weather.windGustMax24h,
      tempTrend1h: weather.tempTrend1h,
      rainTrend1h: weather.rainTrend1h,
      windTrend1h: weather.windTrend1h,
      aqi: Number.isFinite(Number(weather.aqi)) ? Number(weather.aqi) : null,
      floodProbability: risk.floodProbability,
      socialCount: social.socialCount,
      socialVelocity: social.socialVelocity,
      socialEngagement: social.socialEngagement,
      socialAvgScore: social.socialAvgScore,
      socialMaxScore: social.socialMaxScore,
      socialTopKeyword: social.socialTopKeyword,
      socialTopSubreddit: social.socialTopSubreddit,
      riskScore: riskScore.score,
      riskBand: riskScore.band,
      alertLevel: riskScore.band === "high" ? "Warning" : riskScore.band === "medium" ? "Watch" : "Normal",
      riskReason,
      sourceWeather: weather.provider || "open-meteo",
      sourceSocial: social.source || "reddit",
      sourceRisk: risk.source || "risk-proxy-open-meteo",
      dataQualityScore,
      ingestionId: ingestionId || updatedAt,
      updatedAt,
      updatedUnix: Date.now(),
    },
    geometry: {
      x: location.lon,
      y: location.lat,
      spatialReference: { wkid: 4326 },
    },
  };
}

function toGeoJSONFeature(arcgisFeature) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [arcgisFeature.geometry.x, arcgisFeature.geometry.y],
    },
    properties: { ...arcgisFeature.attributes },
  };
}

module.exports = { toArcGISFeature, toGeoJSONFeature };
