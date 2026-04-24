# MRWA GIS Datasets Reference

## Primary ArcGIS Services

### Road Assets Data Portal (Statewide)
**Base URL**: `https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer`

| Layer ID | Name | Geometry | Records | Notes |
|----------|------|----------|---------|-------|
| 0 | Bike Count Sites | Point | — | |
| 1 | Control of Access | Polyline | — | |
| 2 | **Culvert** | Point | 28,368 | Culvert type, material, barrels, dimensions, skew |
| 3 | **Floodway** | Point | — | Floodway type, length, description |
| 4 | Focal Point Marker | Point | — | |
| 5 | Functional Class | Polyline | — | |
| 6 | Intersections | Point | — | |
| 7 | Kerb | Polyline | — | Kerb L/R type, date installed |
| 8 | Legal Speed Limit | Polyline | — | |
| 9 | Legal Speed Zones | Polyline | — | |
| 10 | Line Marking | Polyline | — | |
| 11 | Main Roads Regions | Polygon | — | |
| 12 | Pavement and Surfacing State | Polyline | — | |
| 13 | Pavement Detail | Polyline | — | |
| 14 | Pedestrian Crossing | Point | — | |
| 15 | Rail Crossing | Point | — | |
| 16 | Road Hierarchy | Polyline | — | |
| 17 | Road Network | Polyline | — | |
| 18 | Road Network SLK Search | Polyline | — | |
| 19 | Road Stopping Place | Point | — | |
| 20 | Signs Guide Route Marker | Point | — | |
| 21 | Signs Guide Other | Point | — | |
| 22 | Signs Regulatory | Point | — | |
| 23 | Signs Warning | Point | — | |
| 24 | State Road Network | Polyline | — | |
| 25 | Bushfire Critical Road Assets | Point | — | |
| 26 | Structures | Point | — | |
| 27 | Traffic Digest | Point | — | |
| 28 | Traffic Signal Sites | Point | — | |
| 29 | Wall Type or Fence | Polyline | — | |
| 30 | M-Links Road Network | Polyline | — | |
| 31 | Special Use | Polyline | — | |
| 32 | Traffic Video Survey | Point | — | |

### Travel Information (Live Alerts)
**Base URL**: `https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/TravelInformation/MapServer`

| Layer ID | Name | Description |
|----------|------|-------------|
| 0 | MRWA Incidents | Crashes, hazards, road damage, livestock, cyclones |
| 1 | MRWA Road Works | Maintenance, construction, long-term closures |
| 2 | MRWA Events Management | Planned events (sporting, festivals) |
| 3 | Road Closures | Current road closures |
| 4 | Detour | Active detour routes |

## Drainage Datasets (Metropolitan Region Only)

Served from ArcGIS Online, NOT the MRWA internal GIS.

| Dataset | Geometry | Records | FeatureServer URL |
|---------|----------|---------|-------------------|
| **Drainage Pipes** | Polyline | 43,543 | `https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/Drainage_P_View/FeatureServer/3` |
| **Drainage Pits** | Point | 49,534 | `https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/Drainage_Pits_View/FeatureServer/0` |
| **Drainage Sumps** | Polygon | 1,864 | `https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/Drainage_S/FeatureServer/4` |
| **Drainage Headwalls** | Point | 6,247 | `https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/Drainage_H_View/FeatureServer/1` |

### Key Drainage Data Points
- Pipes and Pits are a **connected network** — pipes reference `Up_Pit_No` and `Dn_Pit_No`
- Sumps have **hydraulic data** (TWL for 1yr/5yr/10yr/20yr/100yr ARI events)
- All include `Acid_Sulphate` flags and `Confidence_Rating`
- **Metropolitan Region only** — no rural/regional coverage

## Other Services

| Service | URL | Content |
|---------|-----|---------|
| HVS Network Map | `.../HvsNetworkMap/MapServer` | Heavy vehicle route networks (680+ layers) |
| Crash Map | `.../CrashMap/MapServer` | Crash data |
| Overlay | `.../Overlay/MapServer` | Electorate boundaries, regions, suburbs, LGAs |
| RoadView Curve Survey | `.../RoadView/CurveSurvey/MapServer` | Curve survey data |

## WA Open Data Portal

Search URL: `https://catalogue.data.wa.gov.au/api/3/action/package_search?q=mrwa+drainage`

Related non-MRWA datasets:
- Perth Metropolitan Stormwater Drainage – Pipe (DWER-089)
- Perth Metropolitan Stormwater Drainage – Pits (DWER-090)
- Perth Metropolitan Stormwater Drainage – OSDS Area (DWER-094)
- Soil landscape land quality - Site Drainage Potential (DPIRD-043)

## SLK (Straight Line Kilometreage)

MRWA uses SLK for linear referencing. Key fields:
- `START_SLK` / `END_SLK` — SLK range
- `START_TRUE_DIST` / `END_TRUE_DIST` — true distance
- `CWY` — carriageway (Left/Right/Full)
- `ROAD` — MRWA road number (e.g. H001 = Great Northern Hwy)
- `ROUTE_NE_ID` — network element ID
