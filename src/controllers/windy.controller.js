const { buildWindyEmbedUrl } = require("../services/windy.service");

function getWindyEmbed(req, res) {
  const embedUrl = buildWindyEmbedUrl({
    lat: req.query.lat,
    lon: req.query.lon,
    zoom: req.query.zoom,
    overlay: req.query.overlay,
    detailLat: req.query.detailLat,
    detailLon: req.query.detailLon,
    level: req.query.level,
    metricWind: req.query.metricWind,
    metricTemp: req.query.metricTemp,
    radarRange: req.query.radarRange,
  });

  res.json({
    embedUrl,
    iframeSnippet: `<iframe width="800" height="520" src="${embedUrl}" frameborder="0"></iframe>`,
    terms:
      "Use Windy only per Windy Terms of Service; keep Windy logo/branding visible (official embed).",
    docs: "https://embed.windy.com/config/map",
  });
}

module.exports = { getWindyEmbed };
