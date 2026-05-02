const { runIngestionCycle, getPipelineState } = require("../pipeline");

async function getLiveData(req, res, next) {
  try {
    const result = await runIngestionCycle();
    res.json({
      generatedAt: new Date().toISOString(),
      sync: result.syncResult,
      extraSync: result.extraSync,
      data: result.records.map((record) => ({
        location: record.location,
        weather: record.weather,
        risk: record.risk,
        social: record.social,
        riskScore: record.riskScore,
        geojson: record.geojson,
      })),
    });
  } catch (error) {
    next(error);
  }
}

function getHealth(req, res) {
  res.json({
    status: "ok",
    pipeline: getPipelineState(),
    now: new Date().toISOString(),
  });
}

module.exports = { getLiveData, getHealth };
