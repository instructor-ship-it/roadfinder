# TC Work Zone Locator

## Data Query Sources Documentation

### Complete Reference for All Data APIs and Sources

**Version: RC 1.9.8**

**Date: March 28, 2026**

---

## 1. Overview

TC Work Zone Locator integrates data from multiple sources to provide comprehensive work zone information for Traffic Controllers in Western Australia. This document details all data sources, their API endpoints, query parameters, data structures, and how they are used within the application. Understanding these sources is essential for troubleshooting, maintenance, and future enhancements.

### 1.1 Data Source Categories

The application uses four main categories of data sources:

- **MRWA ArcGIS Services** - Official road network, speed zones, rail crossings, and signage data from Main Roads Western Australia
- **External Weather APIs** - Open-Meteo for weather forecasts and BOM for weather warnings
- **OpenStreetMap Services** - Overpass API for amenities and Nominatim for geocoding
- **WA Government Data Services** - WA Health SLIP Services for hospital data, FuelWatch WA for fuel prices

---

## 2. Main Roads WA ArcGIS Services

Main Roads Western Australia (MRWA) provides open access to their road data through an ArcGIS REST API. This is the primary data source for all road-related information.

**Base URL:**

```
https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer
```

### 2.1 Available Layers

| Layer | Name                | Description                                        |
| ----- | ------------------- | -------------------------------------------------- |
| 17    | Road Network        | All roads with geometry, SLK, and region (RA_NAME) |
| 24    | State Road Network  | State roads (H/M prefix) with intersection nodes   |
| 6     | Intersections       | Road intersection nodes and names                  |
| 8     | Legal Speed Limit   | Speed zones with SPEED_LIMIT field                 |
| 15    | Rail Crossings      | Railway crossing locations and types               |
| 22    | Regulatory Signs    | Speed restriction, STOP, GIVE WAY signs            |
| 23    | Warning Signs       | Curve, advisory speed, hazard warnings             |
| 25    | Local Road Network  | Local roads layer                                  |
| 27    | Traffic Count Sites | AADT and heavy vehicle data                        |
| 12    | Pavement Data       | Lanes, widths, shoulders                           |

### 2.2 Layer 17 - Road Network (All Roads)

Layer 17 is the primary road network layer containing geometry and attributes for all roads in WA, including state highways, main roads, and local roads. This is the most comprehensive layer with region (RA_NAME) information for all roads.

| Field          | Description                                      |
| -------------- | ------------------------------------------------ |
| ROAD / ROAD_ID | Unique road identifier (e.g., H005, M031)        |
| ROAD_NAME      | Full road name (e.g., Great Eastern Hwy)         |
| START_SLK      | Start SLK of road segment                        |
| END_SLK        | End SLK of road segment                          |
| RA_NAME        | MRWA region name (e.g., Wheatbelt, Metropolitan) |
| NETWORK_TYPE   | Road type (State Road, Local Road)               |
| geometry.paths | Array of [lon, lat] coordinates                  |

**Query Example - Get Road by ID:**

```
GET /17/query?where=ROAD='H005'&outFields=ROAD,ROAD_NAME,START_SLK,END_SLK,RA_NAME&returnGeometry=true&f=json
```

### 2.3 Layer 6 - Intersections (NEW)

Layer 6 contains road intersection nodes with names and SLK positions. Used for finding nearest cross roads for emergency location.

| Field          | Description                                               |
| -------------- | --------------------------------------------------------- |
| NODE_NAME      | Intersection name (e.g., "Great Eastern Hwy & Orrong Rd") |
| ROAD           | Reference road ID                                         |
| SLK            | SLK position on reference road                            |
| CONNECTED_ROAD | ID of intersecting road                                   |

### 2.4 Layer 24 - State Road Network

Layer 24 contains state roads only (H and M prefix roads) with additional node information for intersection detection. Used for finding intersection nodes with START_NODE_NO and END_NODE_NO fields.

| Field           | Description                               |
| --------------- | ----------------------------------------- |
| START_NODE_NO   | Intersection node number at segment start |
| START_NODE_NAME | Intersection name at segment start        |
| END_NODE_NO     | Intersection node number at segment end   |
| END_NODE_NAME   | Intersection name at segment end          |
| CWY             | Carriageway (Left, Right, Single)         |

### 2.5 Layer 8 - Legal Speed Limit

Layer 8 contains legal speed zones with the SPEED_LIMIT field containing actual speed values or descriptive text for default zones. This layer is used for speed zone lookahead and corridor signage reporting.

| Field       | Description                            |
| ----------- | -------------------------------------- |
| SPEED_LIMIT | Speed limit value or default zone text |
| START_SLK   | Start SLK of speed zone                |
| END_SLK     | End SLK of speed zone                  |
| CWY         | Carriageway direction                  |

**Speed Limit Parsing Logic:**

The SPEED_LIMIT field can contain:

- Numeric values (e.g., 110, 80, 60)
- Default zone text (e.g., '50km/h applies in built up areas or 110km/h outside built up areas')

Default zones are flagged as `requires_verification=true` and default to 110 km/h. Client-side correction logic adjusts to 50 km/h for built-up areas based on adjacent zones.

### 2.6 Layer 15 - Railway Crossings

Layer 15 contains all railway crossings on the road network with crossing type (Public/Private) and crossing numbers for contacting Arc Infrastructure.

| Field         | Description                                |
| ------------- | ------------------------------------------ |
| CROSSING_TYPE | Public or Private crossing                 |
| CROSSING_NO   | Crossing identifier for Arc Infrastructure |
| SLK           | SLK location of crossing                   |

### 2.7 Layer 22 - Regulatory Signs

Layer 22 contains regulatory signs including speed restriction signs, STOP signs, and GIVE WAY signs. The application filters this layer to only include speed and railway-related signs for the signage corridor report.

| Field         | Description                                |
| ------------- | ------------------------------------------ |
| PANEL_DESIGN  | Sign design code (e.g., R4-1)              |
| PANEL_MEANING | Sign meaning text (e.g., 'Speed Limit 60') |
| SIGN_TYPE     | Sign type classification                   |

### 2.8 Layer 23 - Warning Signs

Layer 23 contains warning signs including curve warnings, advisory speeds, and hazard warnings. The application filters to keep only curves, advisory speeds, signals, and railway-related signs.

| Field         | Description                          |
| ------------- | ------------------------------------ |
| PANEL_DESIGN  | Warning sign design code             |
| PANEL_MEANING | Warning text (e.g., 'Curve 65 km/h') |
| SIGN_TYPE     | Warning sign type                    |

### 2.9 Layer 27 - Traffic Count Sites

Layer 27 contains traffic count data from MRWA Traffic Digest. Used for AADT (Annual Average Daily Traffic) and heavy vehicle percentage information.

| Field             | Description                                       |
| ----------------- | ------------------------------------------------- |
| SITE_NO           | Traffic count site number                         |
| LOCATION_DESC     | Location description (e.g., 'East of Leeming Rd') |
| TRAFFIC_YEAR      | Year of traffic count                             |
| MON_SUN           | AADT (Annual Average Daily Traffic)               |
| PCT_HEAVY_MON_SUN | Heavy vehicle percentage                          |

### 2.10 Layer 12 - Pavement Data

Layer 12 contains pavement and surfacing data including lane counts and road widths.

| Field        | Description                 |
| ------------ | --------------------------- |
| LANES        | Number of lanes             |
| ROAD_WIDTH   | Road width in metres        |
| SURFACE_TYPE | Surface type classification |

---

## 3. Weather APIs

### 3.1 Open-Meteo Weather API

Open-Meteo provides free weather API access without requiring an API key. The application uses this for current conditions, forecasts, and astronomical data.

**Base URL:** `https://api.open-meteo.com/v1/forecast`

| Parameter       | Values                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| current         | temperature_2m, relative_humidity_2m, wind_speed_10m, wind_direction_10m, wind_gusts_10m, weather_code |
| hourly          | temperature_2m, wind_speed_10m, wind_direction_10m, weather_code                                       |
| daily           | sunrise, sunset, uv_index_max                                                                          |
| wind_speed_unit | kmh (kilometers per hour)                                                                              |
| timezone        | UTC (converted to AWST client-side)                                                                    |

**Query Parameters:**

```
?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=sunrise,sunset,uv_index_max&timezone=UTC&wind_speed_unit=kmh
```

**WMO Weather Codes:**

| Code  | Condition | Description                      |
| ----- | --------- | -------------------------------- |
| 0     | Clear     | No clouds                        |
| 1-3   | Cloudy    | Mainly clear to overcast         |
| 45-48 | Fog       | Fog conditions                   |
| 51-67 | Rain      | Drizzle to heavy rain            |
| 71-77 | Snow      | Snow conditions                  |
| 80-82 | Showers   | Light to heavy showers           |
| 95-99 | Storms    | Thunderstorms with possible hail |

### 3.2 BOM Weather Warnings RSS

The Bureau of Meteorology (BOM) provides RSS feeds for weather warnings. The application uses the WA Land Areas feed (IDZ00067) for real-time weather alerts.

**RSS URL:** `https://www.bom.gov.au/fwo/IDZ00067.warnings_wa.xml`

| Property       | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Feed ID        | IDZ00067                                               |
| Coverage       | Western Australia Land Areas                           |
| Cache Duration | 5 minutes (300 seconds)                                |
| User-Agent     | TCWorkZoneLocator/5.3 (WA Traffic Control Application) |

**RSS Item Structure:**

Each warning item in the RSS feed contains:

- `title` - Warning title (e.g., 'Severe Weather Warning for Heavy Rainfall')
- `description` - Full warning text
- `link` - URL to full warning on BOM website
- `pubDate` - Publication timestamp
- `category` - Warning category
- `urgency` - 'Immediate', 'Expected', or 'Future'
- `severity` - 'Minor', 'Moderate', 'Severe', or 'Extreme'

---

## 4. OpenStreetMap Services

### 4.1 Overpass API - Amenities

The Overpass API queries OpenStreetMap data for nearby amenities including hospitals, fuel stations, and public toilets. Multiple servers are used with automatic fallback.

| Server     | URL                                                     |
| ---------- | ------------------------------------------------------- |
| Primary    | https://overpass-api.de/api/interpreter                 |
| Fallback 1 | https://maps.mail.ru/osm/tools/overpass/api/interpreter |
| Fallback 2 | https://overpass.kumi.systems/api/interpreter           |

**Amenity Queries:**

The application searches within 100km radius for rural WA coverage:

```
Hospital: node["amenity"="hospital"](around:100000,{lat},{lon});
Fuel: node["amenity"="fuel"](around:100000,{lat},{lon});
Toilets: node["amenity"="toilets"](around:100000,{lat},{lon});
```

**Hospital Filtering:**

Hospitals are filtered to exclude non-emergency medical facilities. Excluded terms: dental, orthodontic, fertility, IVF, day surgery, cosmetic, psychology, counselling, private clinic. Emergency hospitals are prioritized in results.

### 4.2 Nominatim - Reverse Geocoding

Nominatim provides reverse geocoding to convert coordinates to location names for weather display and emergency location.

**URL:** `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json`

---

## 5. Internal API Routes

The application provides internal API routes that aggregate data from multiple sources. These routes are server-side only and do not expose external API keys.

### 5.1 Core Routes

| Route                      | Method   | Purpose                                           |
| -------------------------- | -------- | ------------------------------------------------- |
| /api/roads                 | GET/POST | Region list, road search, SLK coordinate lookup   |
| /api/gps                   | GET      | Convert GPS coordinates to road/SLK               |
| /api/weather               | GET      | Weather conditions from Open-Meteo                |
| /api/warnings              | GET      | BOM weather warnings RSS feed                     |
| /api/weather/warnings      | GET      | Combined weather data with warnings               |
| /api/traffic               | GET      | AADT data from MRWA Layer 27                      |
| /api/places                | GET      | Nearby amenities from Overpass API                |
| /api/intersections         | GET      | Cross road detection using MRWA nodes             |
| /api/nearest-intersections | GET      | Find nearest intersections for emergency location |

### 5.2 Emergency Routes

| Route                   | Method | Purpose                                                 |
| ----------------------- | ------ | ------------------------------------------------------- |
| /api/emergency-stations | GET    | All emergency facility locations                        |
| /api/hospitals          | GET    | Hospital locations from WA Health SLIP Services         |
| /api/nearest-hospital   | GET    | Nearest hospital from WA Health SLIP Services           |
| /api/fuel-stations      | GET    | Diesel fuel stations from FuelWatch WA + Overpass merge |
| /api/police-stations    | GET    | Police station locations                                |

### 5.3 Speed Zone Routes

| Route              | Method   | Purpose                            |
| ------------------ | -------- | ---------------------------------- |
| /api/overrides     | GET/POST | Override storage pass-through      |
| /api/speed-compare | GET      | MRWA vs OSM speed limit comparison |
| /api/osm-speed     | GET      | OpenStreetMap speed limit data     |
| /api/speed-verify  | GET      | Speed verification                 |
| /api/speedlimit    | GET      | Speed limit lookup                 |

### 5.4 Data Management Routes

| Route               | Method   | Purpose                       |
| ------------------- | -------- | ----------------------------- |
| /api/admin-sync     | GET/POST | Direct sync from MRWA servers |
| /api/download-signs | GET      | Sign data download            |
| /api/export-pdf     | POST     | Work zone report export       |
| /api/sync-data      | POST     | Offline data sync             |
| /api/route          | GET      | Route API                     |

### 5.5 QA Routes

| Route         | Method   | Purpose                     |
| ------------- | -------- | --------------------------- |
| /api/qa       | GET      | QA test data and validation |
| /api/qa-saved | GET/POST | Saved QA test results       |

### 5.6 Fuel Stations Route

| Route              | Method | Purpose                                                 |
| ------------------ | ------ | ------------------------------------------------------- |
| /api/fuel-stations | GET    | Diesel fuel stations from FuelWatch WA + Overpass merge |

**Query Parameters:**

| Parameter | Type   | Default | Description                  |
| --------- | ------ | ------- | ---------------------------- |
| lat       | number | —       | Latitude (required)          |
| lon       | number | —       | Longitude (required)         |
| radius    | number | 100     | Search radius in km          |
| fuelType  | string | DL      | Fuel type code (DL = diesel) |

**Response Structure:**

- `nearest`: Closest station to search center
- `cheapest`: Station with lowest price (if different from nearest)
- `stations`: Top 20 stations sorted by distance

**Merge/Dedup Logic:**

- FuelWatch WA provides price data for ~700 stations (updated daily)
- Overpass API fills coverage gaps for stations not in FuelWatch
- Deduplication: stations within 200m proximity are merged (FuelWatch data takes priority)
- Source tracking: each station includes `source` field ('FuelWatch' or 'OpenStreetMap')
- Server-side cache: 30 minutes

### 5.7 Incidents Route

| Route          | Method | Purpose                                  |
| -------------- | ------ | ---------------------------------------- |
| /api/incidents | GET    | Live road incidents (future integration) |

---

## 6. Offline Data Storage

For offline capability, MRWA data is stored in IndexedDB on the client device. This allows the application to work without internet connectivity in remote areas.

### 6.1 IndexedDB Object Stores

| Store Name      | Key     | Contents                            |
| --------------- | ------- | ----------------------------------- |
| regions         | region  | Road data grouped by MRWA region    |
| speedZones      | road_id | Speed zones indexed by road         |
| railCrossings   | road_id | Rail crossings indexed by road      |
| regulatorySigns | road_id | Filtered regulatory signs           |
| warningSigns    | road_id | Filtered warning signs              |
| metadata        | key     | Download date, total roads, regions |
| datasetMeta     | dataset | Sync status per dataset             |
| amenities       | region  | Amenities cached by region          |

### 6.2 Data Flow

1. User clicks 'Download Data' in Settings
2. Static JSON files from /public/data/ are loaded OR MRWA ArcGIS API is queried directly
3. Data is transformed and stored in IndexedDB
4. Metadata (download date, record counts) is saved
5. Application can now operate offline using stored data

### 6.3 localStorage Data

| Key                  | Purpose                             |
| -------------------- | ----------------------------------- |
| speedZoneCorrections | User-defined speed zone corrections |
| speedSignOverrides   | Speed sign override data            |
| afterCareJobs        | AfterCare job and sign tracking     |
| afterCarePresets     | Custom sign type presets            |
| defaultRegion        | User's preferred region             |
| gpsSettings          | GPS/EKF configuration               |
| trafficCountHistory  | Manual traffic count records        |
| qaResults            | QA test results                     |

---

## 7. Code References

| File                                       | Purpose                                            |
| ------------------------------------------ | -------------------------------------------------- |
| src/lib/mrwa_api.ts                        | MRWA ArcGIS queries and transforms                 |
| src/app/api/weather/route.ts               | Open-Meteo weather integration                     |
| src/app/api/warnings/route.ts              | BOM RSS warning parser                             |
| src/app/api/weather/warnings/route.ts      | Combined weather endpoint                          |
| src/app/api/places/route.ts                | Overpass API amenity search                        |
| src/app/api/traffic/route.ts               | MRWA traffic count queries                         |
| src/app/api/admin-sync/route.ts            | MRWA bulk data sync                                |
| src/app/api/emergency-stations/route.ts    | Emergency facility queries                         |
| src/app/api/hospitals/route.ts             | Hospital location queries (WA Health SLIP)         |
| src/app/api/nearest-hospital/route.ts      | Nearest hospital finder (WA Health SLIP)           |
| src/app/api/fuel-stations/route.ts         | FuelWatch WA + Overpass merged fuel station search |
| src/app/api/police-stations/route.ts       | Police station queries                             |
| src/app/api/incidents/route.ts             | Road incidents (future)                            |
| src/app/api/nearest-intersections/route.ts | Intersection finder                                |
| src/app/api/qa/route.ts                    | QA test endpoints                                  |
| src/app/api/qa-saved/route.ts              | QA results storage                                 |
| src/lib/offline-db.ts                      | IndexedDB operations                               |
| src/lib/offline-storage.ts                 | Offline data management                            |
| src/lib/aftercare.ts                       | AfterCare storage operations                       |
| src/lib/traffic-counter-storage.ts         | Traffic count storage                              |

---

## 7.1 WA Government Data Services

### 7.1.1 FuelWatch WA

FuelWatch WA is a service provided by the WA Government (Department of Local Government, Industry Regulation and Safety) that publishes daily updated fuel prices for all service stations in Western Australia.

**RSS Feed Endpoint:**

```
https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS?fuelType=DL
```

| Property         | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| Provider         | WA Government, Dept of Local Government, Industry Regulation and Safety |
| Data Type        | RSS/XML feed                                                            |
| Fuel Type        | DL (Diesel)                                                             |
| Authentication   | None required (free)                                                    |
| Update Frequency | Daily                                                                   |
| Coverage         | 700+ service stations statewide                                         |
| Cache Duration   | 30 minutes (server-side)                                                |

**RSS Feed Data Fields:**

- `name` — Station name
- `brand` — Brand name (e.g., BP, Caltex, Shell)
- `trading-name` — Full trading name
- `location` — Town/suburb
- `address` — Street address
- `phone` — Phone number
- `price` — Price in cents per litre
- `fuel-type` — Fuel type code
- `date` — Price date
- `latitude` — Latitude coordinate
- `longitude` — Longitude coordinate
- `site-features` — Station features (pipe-delimited)

### 7.1.2 WA Health SLIP Services

The WA Health SLIP (Shared Location Information Platform) provides hospital facility data for Western Australia.

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| Provider       | WA Health (Government)                 |
| Layers Used    | Layer 6 & Layer 7                      |
| Authentication | SLIP API key (server-side)             |
| Coverage       | All WA hospitals and health facilities |

Used by `/api/hospitals` and `/api/nearest-hospital` for authoritative hospital data including ED status, bed counts, and hospital type classification.

---

## 7.2 Amenity Architecture Note

The home page (`fetchPlaces()` in `src/app/page.tsx`) uses a **3-source parallel architecture** for fetching amenity data:

1. **Hospitals**: WA Health SLIP Services (primary, via `/api/nearest-hospital`) → Overpass API (fallback via `/api/places`)
2. **Fuel Stations**: FuelWatch WA + Overpass merge (via `/api/fuel-stations`) → Overpass API (fallback via `/api/places`)
3. **Toilets**: Overpass API only (via `/api/places`) — no better alternative exists

**Fallback Chain:** Each source has its own try/catch. If the primary source fails (timeout, error), the home page automatically falls back to the Overpass-based `/api/places` endpoint.

**Source Tracking:** The `PlacesData` interface includes `hospitalSource` and `fuelSource` fields to track which data source was used, enabling transparency in the UI.

**Note:** `/api/places` still exists as a general-purpose Overpass endpoint but the home page only uses it for toilet data (and hospital/fuel fallback).

---

## 8. Rate Limits and Caching

| API            | Rate Limit           | Caching Strategy                  |
| -------------- | -------------------- | --------------------------------- |
| MRWA ArcGIS    | 2000 records/request | Client-side IndexedDB             |
| Open-Meteo     | None (free)          | Per-request, 30-min offline cache |
| BOM RSS        | Reasonable use       | 5-minute server cache             |
| FuelWatch WA   | None (free RSS)      | 30-min server cache               |
| WA Health SLIP | Per API terms        | Per-request, no client cache      |
| Overpass       | Varies by server     | No caching, fallback servers      |
| Nominatim      | 1 req/sec            | No caching, used once per lookup  |

---

## 9. Offline Data Files (public/data/)

| File                | Purpose                                 |
| ------------------- | --------------------------------------- |
| metadata.json       | Region list, road counts, download info |
| roads/{region}.json | Road geometry by MRWA region            |
| pavement.json       | Pavement data (lanes, widths)           |
| traffic-volume.json | Traffic count data                      |
| amenities.json      | Nearby amenities                        |

---

_This document is part of the TC Work Zone Locator documentation suite, Version RC 1.9.8._
