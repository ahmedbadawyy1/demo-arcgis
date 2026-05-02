const { getRiskBrief } = require("../pipeline");

function corsRiskBrief(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
}

function getRiskBriefHttp(req, res) {
  const brief = getRiskBrief();
  if (!brief) {
    return res.json({
      ok: false,
      message:
        "لا توجد لقطة خطر بعد. انتظر دورة الجمع التلقائية أو نادِ GET /api/live-data مرة واحدة.",
    });
  }
  res.json({ ok: true, ...brief });
}

module.exports = { corsRiskBrief, getRiskBriefHttp };
