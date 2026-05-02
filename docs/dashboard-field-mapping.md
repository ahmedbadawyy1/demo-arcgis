# ArcGIS Dashboard Field Mapping

Use these hosted feature layer fields to bind ArcGIS Dashboard widgets.

## Feature Fields

- `locationId` (text): Stable key for upsert and selectors.
- `name` (text): Human-readable location name.
- `observationTime` (date/text): Last observation timestamp.
- `tempC` (number): Temperature indicator value.
- `windKmh` (number): Wind speed gauge.
- `rainMm` (number): Rain intensity map symbology or indicator.
- `floodProbability` (number): Risk feed probability metric.
- `socialCount` (number): Raw social mention volume.
- `socialVelocity` (number): Normalized social spike signal.
- `riskScore` (number): Final aggregated risk score.
- `riskBand` (text): `low` / `medium` / `high`.

## Recommended Dashboard Widgets

- Indicator: `tempC` (format in C).
- Gauge: `windKmh` with warning thresholds.
- Serial/Bar chart: `rainMm` by `name`.
- Indicator/Card: `riskScore` and `riskBand`.
- List: locations sorted by `riskScore` descending.

## Refresh Cadence

- Backend ingestion: every 5 minutes (`INGEST_CRON`).
- Dashboard data refresh: every 1-2 minutes.
- Keep dashboard refresh <= ingestion cadence for near-live experience.
