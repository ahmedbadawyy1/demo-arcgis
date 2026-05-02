# ArcGIS Flood Intelligence Backend

Node.js data aggregator that collects weather, risk proxy, and social signals, computes a risk score, and syncs to ArcGIS Hosted Feature Layer with hybrid upsert (`update` if exists, otherwise `add`).

## Architecture

Open APIs -> Node Aggregator -> Risk Engine -> ArcGIS applyEdits -> ArcGIS Dashboard

## Quick Start

1. Install deps:
   - `npm install`
2. Configure:
   - `cp .env.example .env`
   - fill `ARCGIS_PORTAL_URL`, `ARCGIS_USERNAME`, `ARCGIS_PASSWORD`
   - fill `ARCGIS_FEATURE_LAYER_URL`, `ARCGIS_QUERY_URL`
3. Run:
   - Dev: `npm run dev`
   - Prod: `npm start`

## Endpoints

- `GET /health`: service and pipeline status (last run/sync/error)
- `GET /api/live-data`: executes one ingestion cycle and returns normalized output + GeoJSON

## ArcGIS Sync

- Query existing features by `locationId`
- Build `updates` for matching records (`OBJECTID` attached)
- Build `adds` for unknown records
- Post both to `.../applyEdits`
- Auto-generate portal token from `generateToken` when portal credentials are set
- Auto-create hosted feature service + schema on first run when `ARCGIS_AUTO_CREATE_LAYER=true`
- Enable `DRY_RUN=true` to validate payload counts without writing

### First-Run Auto Bootstrap

If `ARCGIS_FEATURE_LAYER_URL` does not exist yet, the service will attempt:

- Create hosted feature service named `ARCGIS_SERVICE_NAME`
- Add point layer `ARCGIS_LAYER_NAME`
- Add all required dashboard fields
- Continue normal hybrid upsert (`adds/updates`)

## Free Data Sources Used

- Weather: Open-Meteo (`current` temperature, precipitation, wind)
- Risk proxy: Open-Meteo precipitation probability (adapter is structured for future Copernicus/GFMS swap)
- Social signal: Reddit search keyword counts (UAE flood/rain/storm phrases)

## Dashboard Binding

See `docs/dashboard-field-mapping.md` for widget-to-field mapping.

## Testing

- `npm test`

