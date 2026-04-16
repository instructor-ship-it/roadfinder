**TC Work Zone Locator**

**Data Dictionary**

Version 1.28.5

Comprehensive Data Structure Reference

---

## Table of Contents

1. Core Road Data Structures
2. Work Zone Result Structures
3. Speed Zone Data Structures
4. Speed Sign Override Structures
5. AfterCare Data Structures
6. Signage Data Structures
7. Emergency Location Data Structures
8. GPS Tracking Data Structures
9. Weather Data Structures
10. Places and Amenities
11. Traffic Data Structures
12. Traffic Counter Data Structures
13. Storage Data Structures
14. PWA Manifest Structure

---

## 1. Core Road Data Structures

### 1.1 Road (UI Selection)

| **Field** | **Type** | **Description**                     |
| --------- | -------- | ----------------------------------- |
| road_id   | string   | Unique road identifier (e.g., M031) |
| road_name | string   | Official road name                  |
| min_slk   | number   | Minimum SLK value                   |
| max_slk   | number   | Maximum SLK value                   |
| region    | string?  | MRWA region name                    |

### 1.2 RoadData (IndexedDB Storage)

| **Field**    | **Type** | **Description**              |
| ------------ | -------- | ---------------------------- |
| road_id      | string   | Unique identifier            |
| road_name    | string   | Road name                    |
| slk_from     | number   | Start SLK                    |
| slk_to       | number   | End SLK                      |
| geometry     | GeoJSON  | Road geometry                |
| network_type | string   | State Road, Local Road, etc. |
| region       | string   | MRWA region                  |

### 1.3 PavementData (IndexedDB Storage)

| **Field**           | **Type** | **Description**            |
| ------------------- | -------- | -------------------------- |
| road_id             | string   | Road identifier            |
| slk                 | number   | Location SLK               |
| lanes               | number   | Number of lanes            |
| road_width          | number   | Total road width in meters |
| left_shoulder       | number   | Left shoulder width        |
| right_shoulder      | number   | Right shoulder width       |
| left_shoulder_type  | string   | Sealed/Unsealed            |
| right_shoulder_type | string   | Sealed/Unsealed            |
| kerb_l              | string   | Left kerb type             |
| kerb_r              | string   | Right kerb type            |

---

## 2. Work Zone Result Structures

### 2.1 WorkZoneResult

| **Field**    | **Type**        | **Description**        |
| ------------ | --------------- | ---------------------- |
| road_id      | string          | Road identifier        |
| road_name    | string          | Road name              |
| network_type | string?         | Road type              |
| work_zone    | WorkZone        | Work zone boundaries   |
| tc_positions | TCPositions     | TC start/end positions |
| speed_zones  | SpeedZones      | Zone speed limits      |
| carriageway  | string          | Left, Right, or Single |
| lanes        | number?         | Number of lanes        |
| road_width   | number?         | Road width in meters   |
| midpoint     | GeoPoint?       | Work zone center       |
| google_maps  | GoogleMapsLinks | Navigation links       |

### 2.2 WorkZone

| **Field**    | **Type** | **Description**       |
| ------------ | -------- | --------------------- |
| start_slk    | number   | Start SLK             |
| end_slk      | number   | End SLK               |
| start_coords | GeoPoint | Start coordinates     |
| end_coords   | GeoPoint | End coordinates       |
| length_m     | number   | Zone length in meters |

### 2.3 TCPositions

| **Field** | **Type**   | **Description**           |
| --------- | ---------- | ------------------------- |
| tc_start  | TCPosition | TC start position (-100m) |
| tc_end    | TCPosition | TC end position (+100m)   |

### 2.4 TCPosition

| **Field**       | **Type** | **Description**         |
| --------------- | -------- | ----------------------- |
| slk             | number   | SLK location            |
| lat             | number   | Latitude                |
| lon             | number   | Longitude               |
| speed_limit     | number?  | Speed limit at position |
| google_maps_url | string   | Navigation link         |
| street_view_url | string   | Street View link        |

---

## 3. Speed Zone Data Structures

### 3.1 ParsedSpeedZone

| **Field**       | **Type** | **Description**        |
| --------------- | -------- | ---------------------- |
| road_id         | string   | Road identifier        |
| road_name       | string   | Road name              |
| start_slk       | number   | Zone start SLK         |
| end_slk         | number   | Zone end SLK           |
| speed_limit     | number   | Speed limit in km/h    |
| carriageway     | string   | Left, Right, or Single |
| is_override     | boolean? | Is this an override?   |
| override_id     | string?  | Override source ID     |
| override_source | string?  | Override source type   |

### 3.2 SpeedZoneForDirection

| **Field**   | **Type** | **Description**        |
| ----------- | -------- | ---------------------- |
| road_id     | string   | Road identifier        |
| start_slk   | number   | Zone start SLK         |
| end_slk     | number   | Zone end SLK           |
| speed_limit | number   | Speed limit in km/h    |
| carriageway | string   | Left, Right, or Single |
| source      | string   | "mrwa" or "override"   |

### 3.3 SpeedZoneCorrection

Manual correction for speed zone data:

| **Field**      | **Type** | **Required** | **Description**              |
| -------------- | -------- | ------------ | ---------------------------- |
| road_id        | string   | Yes          | Road identifier              |
| start_slk      | number   | Yes          | Zone start SLK               |
| end_slk        | number   | Yes          | Zone end SLK                 |
| direction      | enum     | Yes          | "increasing" or "decreasing" |
| correct_speed  | number   | Yes          | Corrected speed limit        |
| original_speed | number   | Yes          | Original MRWA speed          |
| notes          | string   | No           | Correction notes             |
| created_at     | string   | Yes          | ISO timestamp                |

### 3.4 SpeedSignInfo

Speed sign near a specific SLK:

| **Field**   | **Type** | **Description**        |
| ----------- | -------- | ---------------------- |
| slk         | number   | Sign location SLK      |
| carriageway | string   | Left, Right, or Single |
| sign_type   | string   | Type of speed sign     |

---

## 4. Speed Sign Override Structures

### 4.1 SpeedSignOverride

Primary structure for community-verified speed sign data:

| **Field**         | **Type** | **Required** | **Description**                     |
| ----------------- | -------- | ------------ | ----------------------------------- |
| id                | string   | Yes          | Unique identifier (e.g., M031-S001) |
| road_id           | string   | Yes          | Road identifier                     |
| road_name         | string   | Yes          | Official road name                  |
| common_usage_name | string   | No           | Common name if different            |
| slk               | number   | Yes          | Sign location SLK                   |
| lat               | number   | No           | GPS latitude of sign                |
| lon               | number   | No           | GPS longitude of sign               |
| direction         | enum     | Yes          | "True Left" or "True Right"         |
| sign_type         | enum     | Yes          | "Single" or "Double"                |
| replicated        | boolean  | Yes          | Matching sign on opposite side      |
| start_slk         | number   | Yes          | Zone start SLK                      |
| end_slk           | number   | No           | Zone end SLK (if replicated)        |
| approach_speed    | number   | No           | Speed before this sign              |
| front_speed       | number   | Yes          | Speed on front face                 |
| back_speed        | number   | No           | Speed on back face (double only)    |
| verified_by       | string   | No           | Who verified this sign              |
| verified_date     | string   | No           | Date of verification                |
| note              | string   | No           | Additional notes                    |
| source            | string   | No           | e.g., "community_verified"          |
| mrwa_slk          | number   | No           | MRWA database SLK (for comparison)  |
| discrepancy_m     | number   | No           | Distance discrepancy in meters      |

### 4.2 GeneratedSpeedZone

Zone generated from sign data by signsToSpeedZones():

| **Field**   | **Type** | **Description**              |
| ----------- | -------- | ---------------------------- |
| road_id     | string   | Road identifier              |
| start_slk   | number   | Zone start SLK               |
| end_slk     | number   | Zone end SLK                 |
| speed_limit | number   | Speed limit in km/h          |
| carriageway | string   | "Left", "Right", or "Single" |
| source_id   | string   | ID of source sign            |
| is_override | true     | Always true for overrides    |

### 4.3 Direction Values

| **Direction** | **Carriageway**   | **SLK Movement** |
| ------------- | ----------------- | ---------------- |
| True Left     | Left Carriageway  | INCREASING SLK   |
| True Right    | Right Carriageway | DECREASING SLK   |

### 4.4 Zone Generation Logic

| **Sign Type** | **Replicated** | **Zones Created**           |
| ------------- | -------------- | --------------------------- |
| Single        | No             | None (repeater only)        |
| Single        | Yes            | One directional zone        |
| Double        | Same speeds    | One Single carriageway zone |
| Double        | Diff speeds    | Two directional zones       |

---

## 5. AfterCare Data Structures

### 5.1 AfterCareJob

Primary container for signage tracking:

| **Field**  | **Type**        | **Required** | **Description**                                   |
| ---------- | --------------- | ------------ | ------------------------------------------------- |
| id         | string          | Yes          | Unique job identifier (e.g., "job_1709234567890") |
| job_name   | string          | Yes          | Display name (auto-generated or custom)           |
| road_id    | string          | Yes          | Road identifier                                   |
| road_name  | string          | No           | Road name                                         |
| signs      | AfterCareSign[] | Yes          | Array of signs in this job                        |
| created_at | string          | Yes          | ISO timestamp of creation                         |
| updated_at | string          | Yes          | ISO timestamp of last update                      |
| notes      | string          | No           | Job-level notes                                   |

### 5.2 AfterCareSign

Individual sign within a job:

| **Field**       | **Type** | **Required** | **Description**                   |
| --------------- | -------- | ------------ | --------------------------------- |
| id              | string   | Yes          | Unique sign identifier            |
| slk             | number   | Yes          | Location SLK                      |
| direction       | enum     | Yes          | "True Left" or "True Right"       |
| category        | enum     | Yes          | "Surface", "Speed", or "Hazard"   |
| sign_type       | string   | Yes          | Sign type (from preset or custom) |
| description     | string   | No           | Additional description            |
| lat             | number   | No           | GPS latitude                      |
| lon             | number   | No           | GPS longitude                     |
| retrieval_type  | enum     | Yes          | See RetrievalType below           |
| retrieval_date  | string   | No           | Scheduled retrieval date (ISO)    |
| status          | enum     | No           | See SignStatus below              |
| status_override | boolean  | No           | Manual status override active     |
| placed_date     | string   | No           | Date sign was placed              |
| retrieved_date  | string   | No           | Date sign was retrieved           |
| maintained_date | string   | No           | Date of last maintenance          |
| created_at      | string   | Yes          | ISO timestamp of creation         |
| updated_at      | string   | Yes          | ISO timestamp of last update      |

### 5.3 RetrievalType

| **Value** | **Description**      | **Auto-flag Behavior** |
| --------- | -------------------- | ---------------------- |
| standard  | Default retrieval    | After 2 days           |
| scheduled | Specific date set    | On retrieval_date      |
| tba       | Indefinite           | Never auto-flags       |
| daily     | Maintenance schedule | After 1 day            |
| weekly    | Maintenance schedule | After 7 days           |
| monthly   | Maintenance schedule | After 30 days          |

### 5.4 SignStatus

| **Value**       | **Description**                     |
| --------------- | ----------------------------------- |
| placed          | Active on road, not yet due         |
| due-retrieval   | Past retrieval date/standard period |
| due-maintenance | Maintenance interval passed         |
| maintained      | Marked as maintained today          |
| retrieved       | Collected from road                 |

### 5.5 ComputedJobStatus

Calculated status derived from sign statuses:

| **Value**       | **Description**              |
| --------------- | ---------------------------- |
| due-retrieval   | Any sign due for retrieval   |
| due-maintenance | Any sign due for maintenance |
| tba             | All signs are TBA            |
| active          | All signs placed, none due   |
| retrieved       | All signs retrieved          |
| archived        | Job archived after retrieval |

### 5.6 SignPreset

User-defined sign type presets:

| **Field** | **Type** | **Description**                 |
| --------- | -------- | ------------------------------- |
| category  | string   | "Surface", "Speed", or "Hazard" |
| sign_type | string   | Sign type name                  |
| is_custom | boolean  | User-created vs built-in        |

### 5.7 NearbySign

Sign with distance for drive page display:

| **Field** | **Type**      | **Description**                          |
| --------- | ------------- | ---------------------------------------- |
| sign      | AfterCareSign | The sign data                            |
| job       | AfterCareJob  | Parent job                               |
| distance  | number        | Distance in meters from current position |
| position  | enum          | "ahead" or "behind"                      |

---

## 6. Signage Data Structures

### 6.1 SignageItem

| **Field**   | **Type** | **Description**                            |
| ----------- | -------- | ------------------------------------------ |
| type        | string   | Intersection, SpeedSign, WarningSign, etc. |
| slk         | number   | Location SLK                               |
| lat         | number   | Latitude                                   |
| lon         | number   | Longitude                                  |
| description | string   | Sign description                           |
| speed_limit | number?  | For speed signs                            |
| carriageway | string?  | Left, Right, or Single                     |

### 6.2 Intersection

| **Field**       | **Type** | **Description**          |
| --------------- | -------- | ------------------------ |
| cross_road_id   | string   | Crossing road identifier |
| cross_road_name | string   | Crossing road name       |
| slk             | number   | Location SLK             |
| lat             | number   | Latitude                 |
| lon             | number   | Longitude                |
| type            | string   | Intersection type        |

### 6.3 RailCrossing

| **Field**    | **Type** | **Description**       |
| ------------ | -------- | --------------------- |
| slk          | number   | Location SLK          |
| lat          | number   | Latitude              |
| lon          | number   | Longitude             |
| type         | string   | "Public" or "Private" |
| railway_name | string?  | Railway line name     |

---

## 7. Emergency Location Data Structures

### 7.1 CrossRoad

Nearest cross road for emergency location:

| **Field** | **Type** | **Description**                    |
| --------- | -------- | ---------------------------------- |
| name      | string   | Cross road name                    |
| distance  | string   | Distance description (e.g., "50m") |
| distanceM | number   | Distance in meters                 |
| direction | string   | Direction (e.g., "north of")       |

### 7.2 NearestTown

Nearest town/city for emergency location:

| **Field** | **Type** | **Description**                    |
| --------- | -------- | ---------------------------------- |
| name      | string   | Town name                          |
| distance  | string   | Distance description (e.g., "5km") |
| distanceM | number   | Distance in meters                 |
| direction | string   | Direction from town                |

### 7.3 NearestHospital

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| name      | string   | Hospital name   |
| distance  | number   | Distance in km  |
| lat       | number   | Latitude        |
| lon       | number   | Longitude       |
| phone     | string   | Phone number    |

### 7.4 NearestFireStation

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| name      | string   | Station name    |
| distance  | number   | Distance in km  |
| lat       | number   | Latitude        |
| lon       | number   | Longitude       |

### 7.5 NearestPoliceStation

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| name      | string   | Station name    |
| distance  | number   | Distance in km  |
| lat       | number   | Latitude        |
| lon       | number   | Longitude       |

### 7.6 EmergencyData

Complete emergency location data:

| **Field**   | **Type**     | **Description**    |
| ----------- | ------------ | ------------------ |
| roadName    | string       | Current road name  |
| lat         | number       | Current latitude   |
| lon         | number       | Current longitude  |
| crossRoad   | CrossRoad?   | Nearest cross road |
| nearestTown | NearestTown? | Nearest town/city  |

### 7.7 NearestIntersection (from MRWA Layer 6)

| **Field**         | **Type** | **Description**                                      |
| ----------------- | -------- | ---------------------------------------------------- |
| nodeName          | string   | Intersection name (e.g., "Dawson St & Elizabeth St") |
| slkOnRefRoad      | number   | SLK position on reference road                       |
| lat               | number   | Intersection latitude                                |
| lon               | number   | Intersection longitude                               |
| connectedRoadId   | string?  | ID of intersecting road                              |
| connectedRoadName | string?  | Name of intersecting road                            |

---

## 8. GPS Tracking Data Structures

### 8.1 GpsReading

| **Field** | **Type** | **Description**      |
| --------- | -------- | -------------------- |
| lat       | number   | Latitude in degrees  |
| lon       | number   | Longitude in degrees |
| accuracy  | number   | Accuracy in meters   |
| speed     | number   | Speed in m/s         |
| heading   | number   | Heading in degrees   |
| timestamp | number   | Unix timestamp       |

### 8.2 EkfState

| **Field**  | **Type**   | **Description**                       |
| ---------- | ---------- | ------------------------------------- |
| x          | number[]   | State vector [lat, lon, v_lat, v_lon] |
| P          | number[][] | Covariance matrix                     |
| lastUpdate | number     | Last update timestamp                 |

### 8.3 EkfOutput

| **Field**   | **Type** | **Description**                 |
| ----------- | -------- | ------------------------------- |
| lat         | number   | Filtered latitude               |
| lon         | number   | Filtered longitude              |
| uncertainty | number   | Position uncertainty in meters  |
| confidence  | string   | High, Medium, Low, or Predicted |
| isPredicted | boolean  | Is this a prediction?           |

### 8.4 GpsSettings

| **Field**            | **Type** | **Default** | **Description**                     |
| -------------------- | -------- | ----------- | ----------------------------------- |
| ekfFiltering         | boolean  | true        | Enable EKF filtering                |
| roadConstraint       | boolean  | true        | Snap to road geometry               |
| maxPredictionTime    | number   | 30          | Max GPS outage prediction (seconds) |
| showUncertainty      | boolean  | true        | Show ±Xm accuracy                   |
| earlyWarnings        | boolean  | true        | Alert earlier at higher speeds      |
| speedLookahead       | number   | 5           | Lookahead time (seconds)            |
| gpsLagCompensation   | number   | 0           | Measured GPS lag (seconds)          |
| showSpeedDisplay     | boolean  | false       | Show speed during tracking          |
| showAfterCareOnDrive | boolean  | true        | Show AfterCare banner               |
| afterCareLookaheadKm | number   | 5           | AfterCare lookahead distance (km)   |

---

## 9. Weather Data Structures

### 9.1 WeatherData

| **Field** | **Type**         | **Description**       |
| --------- | ---------------- | --------------------- |
| location  | string           | Location name         |
| current   | CurrentWeather   | Current conditions    |
| sun       | SunData          | Sunrise/sunset info   |
| forecast  | ForecastItem[]   | 8-hour forecast       |
| warnings  | WeatherWarning[] | BOM warnings (if any) |
| cached_at | number?          | Cache timestamp       |

### 9.2 CurrentWeather

| **Field**      | **Type** | **Description**           |
| -------------- | -------- | ------------------------- |
| temperature    | number   | Temperature in °C         |
| condition      | string   | Weather condition text    |
| humidity       | number   | Relative humidity %       |
| wind_speed     | number   | Wind speed in km/h        |
| wind_gusts     | number   | Wind gusts in km/h        |
| wind_direction | number   | Wind direction in degrees |
| uv_index       | number   | UV index                  |

### 9.3 SunData

| **Field**      | **Type** | **Description**      |
| -------------- | -------- | -------------------- |
| sunrise        | string   | Sunrise time (HH:MM) |
| sunset         | string   | Sunset time (HH:MM)  |
| daylight_hours | number   | Hours of daylight    |

### 9.4 WeatherWarning

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| title     | string   | Warning title   |
| type      | string   | Warning type    |
| severity  | string   | Severity level  |
| issued    | string   | Issue time      |
| expires   | string   | Expiry time     |
| link      | string   | BOM link        |

### 9.5 CachedWeather

Cached weather data for offline access:

| **Field** | **Type** | **Description**        |
| --------- | -------- | ---------------------- |
| lat       | number   | Location latitude      |
| lon       | number   | Location longitude     |
| data      | any      | Weather data structure |
| cached_at | string   | ISO timestamp of cache |
| location  | string?  | Location name          |

---

## 10. Places and Amenities

### 10.1 AmenityPlace

Individual amenity location:

| **Field**        | **Type**  | **Description**                                                    |
| ---------------- | --------- | ------------------------------------------------------------------ |
| name             | string    | Place name                                                         |
| type             | enum      | "hospital", "fuel", or "toilet"                                    |
| lat              | number    | Latitude                                                           |
| lon              | number    | Longitude                                                          |
| distance         | number?   | Distance from current location                                     |
| address          | string?   | Street address                                                     |
| phone            | string?   | Phone number                                                       |
| opening_hours    | string?   | Opening hours                                                      |
| emergency        | boolean?  | Is emergency facility                                              |
| hospitalType     | string?   | Hospital type: 'Public', 'Private', 'Nursing Post'                 |
| hospitalCategory | string?   | Hospital category (e.g., 'Acute Hospital')                         |
| beds             | number?   | Number of hospital beds                                            |
| suburb           | string?   | Suburb/town name                                                   |
| fuelBrand        | string?   | Fuel station brand name                                            |
| fuelPrice        | number?   | Diesel price in cents/L (e.g., 231.3 = $2.313/L)                   |
| fuelDate         | string?   | Date of fuel price (YYYY-MM-DD)                                    |
| siteFeatures     | string[]? | Station features array (e.g., ['Open 24 hours', 'Toilets', 'ATM']) |

### 10.2 AmenitiesCache

Cached amenities by region:

| **Field**    | **Type**       | **Description**              |
| ------------ | -------------- | ---------------------------- |
| region       | string         | MRWA region                  |
| hospitals    | AmenityPlace[] | Hospital locations           |
| fuelStations | AmenityPlace[] | Fuel station locations       |
| toilets      | AmenityPlace[] | Public toilet locations      |
| last_updated | string         | ISO timestamp of last update |

### 10.3 Place (Legacy)

| **Field**        | **Type**  | **Description**                                                    |
| ---------------- | --------- | ------------------------------------------------------------------ |
| name             | string    | Place name                                                         |
| type             | string    | hospital, fuel, toilet                                             |
| distance         | string    | Distance from work zone                                            |
| lat              | number    | Latitude                                                           |
| lon              | number    | Longitude                                                          |
| phone            | string?   | Phone number                                                       |
| address          | string?   | Street address                                                     |
| googleMapsUrl    | string    | Google Maps link                                                   |
| isEmergency      | boolean?  | Emergency facility?                                                |
| hospitalType     | string?   | Hospital type: 'Public', 'Private', 'Nursing Post'                 |
| hospitalCategory | string?   | Hospital category (e.g., 'Acute Hospital')                         |
| beds             | number?   | Number of hospital beds                                            |
| suburb           | string?   | Suburb/town name                                                   |
| fuelBrand        | string?   | Fuel station brand name                                            |
| fuelPrice        | number?   | Diesel price in cents/L (e.g., 231.3 = $2.313/L)                   |
| fuelDate         | string?   | Date of fuel price (YYYY-MM-DD)                                    |
| siteFeatures     | string[]? | Station features array (e.g., ['Open 24 hours', 'Toilets', 'ATM']) |

---

## 10.4 PlacesData

Container for all amenity data returned by `fetchPlaces()` on the home page, with source tracking:

| **Field**      | **Type**       | **Description**                                                |
| -------------- | -------------- | -------------------------------------------------------------- |
| hospitals      | Hospital[]     | Hospital results                                               |
| fuelStations   | FuelStation[]  | Fuel station results                                           |
| toilets        | AmenityPlace[] | Public toilet results                                          |
| hospitalSource | string?        | Data source for hospitals: 'WA Health SLIP' \| 'OpenStreetMap' |
| fuelSource     | string?        | Data source for fuel: 'FuelWatch WA' \| 'OpenStreetMap'        |

---

## 10.5 FuelStation (API Response)

Fuel station data from `/api/fuel-stations`, merging FuelWatch WA and Overpass data:

| **Field**     | **Type**                       | **Description**                                              |
| ------------- | ------------------------------ | ------------------------------------------------------------ |
| name          | string                         | Display name                                                 |
| brand         | string                         | Brand name (e.g., 'BP', 'Caltex')                            |
| tradingName   | string                         | Full trading name                                            |
| location      | string                         | Town/suburb                                                  |
| address       | string                         | Street address                                               |
| phone         | string \| null                 | Phone number                                                 |
| price         | number \| null                 | Diesel price in cents per litre (null if from Overpass)      |
| fuelType      | string                         | Fuel type code (e.g., 'DL')                                  |
| date          | string                         | Price date (YYYY-MM-DD)                                      |
| lat           | number                         | Latitude                                                     |
| lon           | number                         | Longitude                                                    |
| distanceKm    | number                         | Distance from search center in km                            |
| googleMapsUrl | string                         | Google Maps navigation URL                                   |
| siteFeatures  | string[]                       | Station features (e.g., ['Open 24 hours', 'Toilets', 'ATM']) |
| source        | 'FuelWatch' \| 'OpenStreetMap' | Data source                                                  |

---

## 10.6 Hospital (API Response)

Hospital data from `/api/nearest-hospital` via WA Health SLIP Services:

| **Field**     | **Type**                           | **Description**                             |
| ------------- | ---------------------------------- | ------------------------------------------- |
| name          | string                             | Establishment name                          |
| address       | string                             | Street address                              |
| suburb        | string                             | Suburb                                      |
| phone         | string \| null                     | Phone number                                |
| category      | string                             | Hospital category (e.g., 'Acute Hospital')  |
| type          | 'Public' \| 'Private' \| 'Unknown' | Establishment type                          |
| hasED         | boolean                            | Has Emergency Department (ed_reporti = 'Y') |
| beds          | number \| null                     | Number of beds                              |
| lat           | number                             | Latitude                                    |
| lon           | number                             | Longitude                                   |
| distanceM     | number                             | Distance from search center in metres       |
| googleMapsUrl | string                             | Google Maps URL                             |

---

## 11. Traffic Data Structures

### 11.1 TrafficData

| **Field**             | **Type** | **Description**              |
| --------------------- | -------- | ---------------------------- |
| road_id               | string   | Road identifier              |
| aadt                  | number   | Annual Average Daily Traffic |
| aadt_year             | string   | Data year                    |
| heavy_vehicle_percent | number   | Heavy vehicle %              |
| peak_hour_volume      | number   | Peak hour volume             |
| source                | string   | Data source                  |

### 11.2 TrafficVolume (Cached)

| **Field**     | **Type** | **Description**              |
| ------------- | -------- | ---------------------------- |
| road_id       | string   | Road identifier              |
| slk           | number   | Location SLK                 |
| aadt          | number   | Annual Average Daily Traffic |
| year          | number   | Data year                    |
| heavy_percent | number   | Heavy vehicle percentage     |

### 11.3 TrafficSite

Traffic counting site data:

| **Field**   | **Type** | **Description**  |
| ----------- | -------- | ---------------- |
| site_id     | string   | Site identifier  |
| road_id     | string   | Road identifier  |
| slk         | number   | Location SLK     |
| lat         | number   | Latitude         |
| lon         | number   | Longitude        |
| description | string   | Site description |

---

## 12. Traffic Counter Data Structures

### 12.1 TrafficCountRecord

Manual traffic count record stored in localStorage:

| **Field**         | **Type**            | **Required** | **Description**                              |
| ----------------- | ------------------- | ------------ | -------------------------------------------- |
| id                | string              | Yes          | Unique record identifier (UUID)              |
| road_id           | string              | Yes          | Road identifier (e.g., "H001")               |
| road_name         | string              | Yes          | Road name (e.g., "Albany Highway")           |
| slk               | number \| null      | No           | Location SLK (Straight Line Kilometre)       |
| lat               | number \| null      | No           | GPS latitude                                 |
| lon               | number \| null      | No           | GPS longitude                                |
| region            | string              | Yes          | MRWA region                                  |
| duration_minutes  | number              | Yes          | Actual count duration in minutes             |
| direction_mode    | CountDirection      | Yes          | "one-way" or "both-ways"                     |
| true_left_light   | number              | Yes          | Light vehicles - True Left (increasing SLK)  |
| true_left_heavy   | number              | Yes          | Heavy vehicles - True Left                   |
| true_right_light  | number              | Yes          | Light vehicles - True Right (decreasing SLK) |
| true_right_heavy  | number              | Yes          | Heavy vehicles - True Right                  |
| total_light       | number              | Yes          | Total light vehicles counted                 |
| total_heavy       | number              | Yes          | Total heavy vehicles counted                 |
| total_vehicles    | number              | Yes          | Sum of all vehicles                          |
| heavy_percentage  | number              | Yes          | Heavy vehicle percentage (0-100)             |
| vph_true_left     | number              | Yes          | Vehicles per hour - True Left direction      |
| vph_true_right    | number              | Yes          | Vehicles per hour - True Right direction     |
| vph_combined      | number              | Yes          | Combined VPH (both directions)               |
| vph_one_direction | number              | Yes          | Single direction VPH (max of left/right)     |
| queue_length      | number \| undefined | No           | Estimated queue length in meters             |
| date              | string              | Yes          | ISO date (YYYY-MM-DD)                        |
| start_time        | string              | Yes          | Start time (HH:MM format)                    |
| end_time          | string              | Yes          | End time (HH:MM format)                      |
| notes             | string              | Yes          | User notes (may be empty string)             |
| created_at        | string              | Yes          | ISO timestamp when record created            |

**Notes:**

- `duration_minutes` reflects actual elapsed time, not planned duration
- `queue_length` calculated using AGTTM Part 3 multipliers based on VPH and stopping time
- `vph_one_direction` used for lane capacity reference tables
- Records stored in localStorage key `trafficCounterHistory`

### 12.2 TrafficCountStats

Statistics for traffic counting:

| **Field**            | **Type** | **Description**               |
| -------------------- | -------- | ----------------------------- |
| totalRecords         | number   | Total count records           |
| totalVehiclesCounted | number   | Sum of all vehicles           |
| averageHeavyPercent  | number   | Average heavy vehicle %       |
| mostCountedRoad      | object?  | { road_id, road_name, count } |

### 12.3 CountDirection

| **Value** | **Description**                                  |
| --------- | ------------------------------------------------ |
| one-way   | Single direction count (True Left only)          |
| both-ways | Both directions counted (True Left + True Right) |

### 12.4 Queue Length Calculation

Queue length is estimated using AGTTM Part 3, Table 4.3 multipliers:

**Stopping Time Estimation:**

| VPH Range | Stopping Time |
| --------- | ------------- |
| > 600     | 2 minutes     |
| 300-600   | 5 minutes     |
| < 300     | 10 minutes    |

**Multipliers:**

| Stopping Time | Light Vehicles | Heavy Vehicles |
| ------------- | -------------- | -------------- |
| 2 min         | ×2.4           | ×8             |
| 5 min         | ×6             | ×20            |
| 10 min        | ×12            | N/A            |

**Formula:** `Queue = (light_count × Ma) + (heavy_count × Mo)`

For both-ways mode, the worst case (higher queue) direction is used.

---

## 13. Storage Data Structures

### 13.1 localStorage Keys

| **Key**              | **Type**              | **Description**            |
| -------------------- | --------------------- | -------------------------- |
| speedSignOverrides   | SpeedSignOverride[]   | Speed sign overrides       |
| speedZoneCorrections | SpeedZoneCorrection[] | Speed zone corrections     |
| afterCareJobs        | AfterCareJob[]        | AfterCare jobs and signs   |
| signPresets          | SignPreset[]          | User-defined sign presets  |
| gpsSettings          | GpsSettings           | GPS/EKF settings           |
| windGustThreshold    | number                | Wind gust alert threshold  |
| defaultRegion        | string                | Default region selection   |
| offlineToggles       | OfflineToggles        | Data source toggles        |
| trafficCountHistory  | TrafficCountRecord[]  | Traffic count records      |
| cycleTimers          | CycleTimer[]          | Cycle timer records        |
| trafficEventLogger   | TrafficEventState     | Traffic event logger state |
| ai_api_key           | string                | AI API key for Q&A         |

### 13.2 OfflineToggles

| **Field**       | **Type** | **Default** | **Description**                      |
| --------------- | -------- | ----------- | ------------------------------------ |
| roadsList       | boolean  | false       | Use offline roads list               |
| workZoneLookup  | boolean  | false       | Use offline work zone lookup         |
| speedZones      | boolean  | false       | Show speed zones from IndexedDB      |
| railCrossings   | boolean  | false       | Show rail crossings from IndexedDB   |
| regulatorySigns | boolean  | false       | Show regulatory signs from IndexedDB |
| warningSigns    | boolean  | false       | Show warning signs from IndexedDB    |

### 13.3 DatasetMetadata

Metadata for synced datasets:

| **Field**   | **Type** | **Description**            |
| ----------- | -------- | -------------------------- |
| dataset     | string   | Dataset name               |
| lastSync    | string   | ISO timestamp of last sync |
| recordCount | number   | Number of records          |
| source      | enum     | "static" or "mrwa"         |

### 13.4 IndexedDB Stores

| **Store**       | **Key**          | **Description**                   |
| --------------- | ---------------- | --------------------------------- |
| roads           | road_id + region | Road network data (69,000+ roads) |
| speedZones      | id               | MRWA speed zone data              |
| railCrossings   | id               | Rail crossing locations           |
| regulatorySigns | id               | Regulatory signage                |
| warningSigns    | id               | Warning signage                   |
| pavement        | road_id + slk    | Pavement and lane data            |
| trafficVolume   | road_id + slk    | Traffic count data                |
| datasetMeta     | dataset          | Dataset metadata                  |

---

## 14. Traffic Event Logger Data Structures

### 14.1 TrafficEventState

State for the traffic event logger:

| **Field**           | **Type**       | **Description**                           |
| ------------------- | -------------- | ----------------------------------------- |
| events              | TrafficEvent[] | Array of logged events                    |
| roadId              | string         | Current road ID                           |
| slk                 | number         | Current SLK position                      |
| tcAssignmentLeft    | string \| null | TC assigned to True Left (TC1, TC2, TC3)  |
| tcAssignmentRight   | string \| null | TC assigned to True Right (TC1, TC2, TC3) |
| isHoldOn            | boolean        | Hold timer active                         |
| isBreakOn           | boolean        | Break timer active                        |
| isShuttleMode       | boolean        | Shuttle mode enabled                      |
| holdStartTime       | number \| null | Hold start timestamp                      |
| breakStartTime      | number \| null | Break start timestamp                     |
| sentCountLeft       | number         | Vehicles sent True Left                   |
| sentCountRight      | number         | Vehicles sent True Right                  |
| rlrCount            | number         | Red light runner count                    |
| tripOutCount        | number         | Trip out count                            |
| lastSentTime        | number \| null | Last sent event timestamp                 |
| lastShuttleSendTime | number \| null | Last shuttle send timestamp               |
| note                | string         | Current note text                         |
| sheetsId            | string \| null | Google Sheets ID for sync                 |
| sheetsRange         | string \| null | Google Sheets range                       |
| offlineQueue        | QueuedEvent[]  | Events queued for later sync              |

### 14.2 TrafficEvent

Individual logged event:

| **Field**  | **Type**         | **Description**                      |
| ---------- | ---------------- | ------------------------------------ |
| id         | string           | Unique event ID (UUID)               |
| type       | TrafficEventType | Event type (see below)               |
| timestamp  | number           | Unix timestamp                       |
| roadId     | string           | Road ID at event time                |
| slk        | number           | SLK at event time                    |
| lat        | number \| null   | GPS latitude                         |
| lon        | number \| null   | GPS longitude                        |
| direction  | string \| null   | TL, TR, or Both                      |
| tcAssigned | string \| null   | TC assignment (TC1, TC2, TC3)        |
| note       | string           | Event note                           |
| duration   | number \| null   | Duration in seconds (for Hold/Break) |

### 14.3 TrafficEventType

Event types enum:

| **Value**         | **Description**                 |
| ----------------- | ------------------------------- |
| sent_tl           | Vehicle sent True Left          |
| sent_tr           | Vehicle sent True Right         |
| rlr_tl            | Red light runner True Left      |
| rlr_tr            | Red light runner True Right     |
| spot_call         | Spot call event                 |
| shuttle_send      | Shuttle send event              |
| hold_on           | Hold started                    |
| hold_off          | Hold ended (includes duration)  |
| break_on          | Break started                   |
| break_off         | Break ended (includes duration) |
| suspend           | Data entry suspended            |
| resume            | Data entry resumed              |
| start_tc_tl       | TC assigned to True Left        |
| start_tc_tr       | TC assigned to True Right       |
| end_tc_both       | TC assignments ended            |
| flasher_tl_on     | Advanced flasher True Left on   |
| flasher_tr_on     | Advanced flasher True Right on  |
| flasher_both_on   | Advanced flasher Both on        |
| flasher_off       | All flashers off                |
| shift_start       | Shift started                   |
| pre_start         | Pre-start activity              |
| travel_to_site    | Traveling to site               |
| arrived_at_site   | Arrived at site                 |
| site_setup        | Site setup complete             |
| wait_for_crew     | Waiting for crew                |
| crew_arrived      | Crew arrived                    |
| spot_for_crew     | Spotting for crew               |
| crew_departed     | Crew departed                   |
| pack_up_site      | Pack up site                    |
| work_site_debrief | Work site debrief               |
| travel_to_depot   | Traveling to depot              |
| arrived_at_depot  | Arrived at depot                |
| shift_end         | Shift ended                     |

### 14.4 CycleTimer

Cycle timer for tracking vehicle travel times:

| **Field** | **Type**       | **Description**              |
| --------- | -------------- | ---------------------------- |
| id        | string         | Unique timer ID              |
| name      | string         | Timer name (e.g., "Truck 1") |
| isRunning | boolean        | Timer currently running      |
| startTime | number \| null | Current lap start timestamp  |
| laps      | LapRecord[]    | Array of completed laps      |
| createdAt | string         | ISO timestamp of creation    |

### 14.5 LapRecord

Completed lap record:

| **Field**  | **Type** | **Description**              |
| ---------- | -------- | ---------------------------- |
| id         | string   | Unique lap ID                |
| startTime  | number   | Lap start timestamp          |
| endTime    | number   | Lap end timestamp            |
| durationMs | number   | Lap duration in milliseconds |

---

## 15. PWA Manifest Structure

### 14.1 manifest.json

| **Field**        | **Type**   | **Description**        |
| ---------------- | ---------- | ---------------------- |
| name             | string     | "TC Work Zone Locator" |
| short_name       | string     | "TC Locator"           |
| description      | string     | App description        |
| start_url        | string     | "/"                    |
| display          | string     | "standalone"           |
| background_color | string     | "#0f172a"              |
| theme_color      | string     | "#0ea5e9"              |
| icons            | Icon[]     | App icons array        |
| shortcuts        | Shortcut[] | Quick action shortcuts |

### 14.2 Icon

| **Field** | **Type** | **Description**        |
| --------- | -------- | ---------------------- |
| src       | string   | Icon path              |
| sizes     | string   | "192x192" or "512x512" |
| type      | string   | "image/png"            |
| purpose   | string   | "any maskable"         |

### 14.3 Shortcut

| **Field**   | **Type** | **Description** |
| ----------- | -------- | --------------- |
| name        | string   | Shortcut name   |
| short_name  | string   | Short name      |
| description | string   | Description     |
| url         | string   | Target URL      |
| icons       | Icon[]   | Shortcut icons  |

### 14.4 Service Worker Cache

| **Cache Name** | **Contents**        |
| -------------- | ------------------- |
| static-assets  | JS, CSS, HTML files |
| road-data      | MRWA road geometry  |
| speed-zones    | Speed zone data     |
| map-tiles      | OpenStreetMap tiles |

---

## Appendix: Type Definitions Summary

### Enum Types

```typescript
type Direction = 'True Left' | 'True Right';

type SignType = 'Single' | 'Double';

type SignCategory = 'Surface' | 'Speed' | 'Hazard';

type RetrievalType = 'standard' | 'scheduled' | 'tba' | 'daily' | 'weekly' | 'monthly';

type SignStatus = 'placed' | 'due-retrieval' | 'due-maintenance' | 'maintained' | 'retrieved';

type ComputedJobStatus =
  | 'due-retrieval'
  | 'due-maintenance'
  | 'tba'
  | 'active'
  | 'retrieved'
  | 'archived';

type Carriageway = 'Left' | 'Right' | 'Single';

type ConfidenceLevel = 'High' | 'Medium' | 'Low' | 'Predicted';

type PlaceType = 'hospital' | 'fuel' | 'toilet';

type CountDirection = 'one-way' | 'both-ways';

type DataSource = 'static' | 'mrwa';
```

### Coordinate Types

```typescript
interface GeoPoint {
  lat: number;
  lon: number;
}

interface SlkPoint {
  road_id: string;
  slk: number;
  direction?: Direction;
}
```
