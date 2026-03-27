**TC Work Zone Locator**

**Data Dictionary**

Version RC 1.7.18

Comprehensive Data Structure Reference

---

## Table of Contents

1. Core Road Data Structures
2. Work Zone Result Structures
3. Speed Zone Data Structures
4. Speed Sign Override Structures
5. AfterCare Data Structures
6. Signage Data Structures
7. Emergency Location Data Structures (NEW)
8. GPS Tracking Data Structures
9. Weather Data Structures
10. Places and Amenities
11. Traffic Data Structures
12. Storage Data Structures
13. PWA Manifest Structure

---

## 1. Core Road Data Structures

### 1.1 Road (UI Selection)

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| road_id | string | Unique road identifier (e.g., M031) |
| road_name | string | Official road name |
| min_slk | number | Minimum SLK value |
| max_slk | number | Maximum SLK value |
| region | string? | MRWA region name |

### 1.2 RoadData (IndexedDB Storage)

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| road_id | string | Unique identifier |
| road_name | string | Road name |
| slk_from | number | Start SLK |
| slk_to | number | End SLK |
| geometry | GeoJSON | Road geometry |
| network_type | string | State Road, Local Road, etc. |
| region | string | MRWA region |

### 1.3 PavementData (IndexedDB Storage)

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| road_id | string | Road identifier |
| slk | number | Location SLK |
| lanes | number | Number of lanes |
| road_width | number | Total road width in meters |
| left_shoulder | number | Left shoulder width |
| right_shoulder | number | Right shoulder width |
| left_shoulder_type | string | Sealed/Unsealed |
| right_shoulder_type | string | Sealed/Unsealed |
| kerb_l | string | Left kerb type |
| kerb_r | string | Right kerb type |

---

## 2. Work Zone Result Structures

### 2.1 WorkZoneResult

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| road_id | string | Road identifier |
| road_name | string | Road name |
| network_type | string? | Road type |
| work_zone | WorkZone | Work zone boundaries |
| tc_positions | TCPositions | TC start/end positions |
| speed_zones | SpeedZones | Zone speed limits |
| carriageway | string | Left, Right, or Single |
| lanes | number? | Number of lanes |
| road_width | number? | Road width in meters |
| midpoint | GeoPoint? | Work zone center |
| google_maps | GoogleMapsLinks | Navigation links |

### 2.2 WorkZone

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| start_slk | number | Start SLK |
| end_slk | number | End SLK |
| start_coords | GeoPoint | Start coordinates |
| end_coords | GeoPoint | End coordinates |
| length_m | number | Zone length in meters |

### 2.3 TCPositions

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| tc_start | TCPosition | TC start position (-100m) |
| tc_end | TCPosition | TC end position (+100m) |

### 2.4 TCPosition

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| slk | number | SLK location |
| lat | number | Latitude |
| lon | number | Longitude |
| speed_limit | number? | Speed limit at position |
| google_maps_url | string | Navigation link |
| street_view_url | string | Street View link |

---

## 3. Speed Zone Data Structures

### 3.1 ParsedSpeedZone

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| road_id | string | Road identifier |
| road_name | string | Road name |
| start_slk | number | Zone start SLK |
| end_slk | number | Zone end SLK |
| speed_limit | number | Speed limit in km/h |
| carriageway | string | Left, Right, or Single |
| is_override | boolean? | Is this an override? |
| override_id | string? | Override source ID |
| override_source | string? | Override source type |

### 3.2 SpeedZoneForDirection

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| road_id | string | Road identifier |
| start_slk | number | Zone start SLK |
| end_slk | number | Zone end SLK |
| speed_limit | number | Speed limit in km/h |
| carriageway | string | Left, Right, or Single |
| source | string | "mrwa" or "override" |

---

## 4. Speed Sign Override Structures

### 4.1 SpeedSignOverride

Primary structure for community-verified speed sign data:

| **Field** | **Type** | **Required** | **Description** |
|-----------|----------|--------------|-----------------|
| id | string | Yes | Unique identifier (e.g., M031-S001) |
| road_id | string | Yes | Road identifier |
| road_name | string | Yes | Official road name |
| common_usage_name | string | No | Common name if different |
| slk | number | Yes | Sign location SLK |
| lat | number | No | GPS latitude of sign |
| lon | number | No | GPS longitude of sign |
| direction | enum | Yes | "True Left" or "True Right" |
| sign_type | enum | Yes | "Single" or "Double" |
| replicated | boolean | Yes | Matching sign on opposite side |
| start_slk | number | Yes | Zone start SLK |
| end_slk | number | No | Zone end SLK (if replicated) |
| approach_speed | number | No | Speed before this sign |
| front_speed | number | Yes | Speed on front face |
| back_speed | number | No | Speed on back face (double only) |
| verified_by | string | No | Who verified this sign |
| verified_date | string | No | Date of verification |
| note | string | No | Additional notes |
| source | string | No | e.g., "community_verified" |
| mrwa_slk | number | No | MRWA database SLK (for comparison) |
| discrepancy_m | number | No | Distance discrepancy in meters |

### 4.2 GeneratedSpeedZone

Zone generated from sign data by signsToSpeedZones():

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| road_id | string | Road identifier |
| start_slk | number | Zone start SLK |
| end_slk | number | Zone end SLK |
| speed_limit | number | Speed limit in km/h |
| carriageway | string | "Left", "Right", or "Single" |
| source_id | string | ID of source sign |
| is_override | true | Always true for overrides |

### 4.3 Direction Values

| **Direction** | **Carriageway** | **SLK Movement** |
|---------------|-----------------|------------------|
| True Left | Left Carriageway | INCREASING SLK |
| True Right | Right Carriageway | DECREASING SLK |

### 4.4 Zone Generation Logic

| **Sign Type** | **Replicated** | **Zones Created** |
|---------------|----------------|-------------------|
| Single | No | None (repeater only) |
| Single | Yes | One directional zone |
| Double | Same speeds | One Single carriageway zone |
| Double | Diff speeds | Two directional zones |

---

## 5. AfterCare Data Structures

### 5.1 AfterCareJob

Primary container for signage tracking:

| **Field** | **Type** | **Required** | **Description** |
|-----------|----------|--------------|-----------------|
| id | string | Yes | Unique job identifier (e.g., "job_1709234567890") |
| job_name | string | Yes | Display name (auto-generated or custom) |
| road_id | string | Yes | Road identifier |
| road_name | string | No | Road name |
| signs | AfterCareSign[] | Yes | Array of signs in this job |
| created_at | string | Yes | ISO timestamp of creation |
| updated_at | string | Yes | ISO timestamp of last update |
| notes | string | No | Job-level notes |

### 5.2 AfterCareSign

Individual sign within a job:

| **Field** | **Type** | **Required** | **Description** |
|-----------|----------|--------------|-----------------|
| id | string | Yes | Unique sign identifier |
| slk | number | Yes | Location SLK |
| direction | enum | Yes | "True Left" or "True Right" |
| category | enum | Yes | "Surface", "Speed", or "Hazard" |
| sign_type | string | Yes | Sign type (from preset or custom) |
| description | string | No | Additional description |
| lat | number | No | GPS latitude |
| lon | number | No | GPS longitude |
| retrieval_type | enum | Yes | See RetrievalType below |
| retrieval_date | string | No | Scheduled retrieval date (ISO) |
| status | enum | No | See SignStatus below |
| status_override | boolean | No | Manual status override active |
| placed_date | string | No | Date sign was placed |
| retrieved_date | string | No | Date sign was retrieved |
| maintained_date | string | No | Date of last maintenance |
| created_at | string | Yes | ISO timestamp of creation |
| updated_at | string | Yes | ISO timestamp of last update |

### 5.3 RetrievalType

| **Value** | **Description** | **Auto-flag Behavior** |
|-----------|-----------------|------------------------|
| standard | Default retrieval | After 2 days |
| scheduled | Specific date set | On retrieval_date |
| tba | Indefinite | Never auto-flags |
| daily | Maintenance schedule | After 1 day |
| weekly | Maintenance schedule | After 7 days |
| monthly | Maintenance schedule | After 30 days |

### 5.4 SignStatus

| **Value** | **Description** |
|-----------|-----------------|
| placed | Active on road, not yet due |
| due-retrieval | Past retrieval date/standard period |
| due-maintenance | Maintenance interval passed |
| maintained | Marked as maintained today |
| retrieved | Collected from road |

### 5.5 ComputedJobStatus

Calculated status derived from sign statuses:

| **Value** | **Description** |
|-----------|-----------------|
| due-retrieval | Any sign due for retrieval |
| due-maintenance | Any sign due for maintenance |
| tba | All signs are TBA |
| active | All signs placed, none due |
| retrieved | All signs retrieved |
| archived | Job archived after retrieval |

### 5.6 SignPreset

User-defined sign type presets:

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| category | string | "Surface", "Speed", or "Hazard" |
| sign_type | string | Sign type name |
| is_custom | boolean | User-created vs built-in |

### 5.7 NearbySign

Sign with distance for drive page display:

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| sign | AfterCareSign | The sign data |
| job | AfterCareJob | Parent job |
| distance | number | Distance in meters from current position |
| position | enum | "ahead" or "behind" |

---

## 6. Signage Data Structures

### 6.1 SignageItem

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| type | string | Intersection, SpeedSign, WarningSign, etc. |
| slk | number | Location SLK |
| lat | number | Latitude |
| lon | number | Longitude |
| description | string | Sign description |
| speed_limit | number? | For speed signs |
| carriageway | string? | Left, Right, or Single |

### 6.2 Intersection

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| cross_road_id | string | Crossing road identifier |
| cross_road_name | string | Crossing road name |
| slk | number | Location SLK |
| lat | number | Latitude |
| lon | number | Longitude |
| type | string | Intersection type |

### 6.3 RailCrossing

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| slk | number | Location SLK |
| lat | number | Latitude |
| lon | number | Longitude |
| type | string | "Public" or "Private" |
| railway_name | string? | Railway line name |

---

## 7. Emergency Location Data Structures (NEW)

### 13.1 EmergencyLocation

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| crossRoad | string | Nearest intersecting road name |
| crossRoadDistance | number | Distance to cross road in meters |
| crossRoadDirection | string | Direction to cross road (e.g., "at", "50m north of") |
| locality | string | Local government area or town name |
| nearestTown | string? | Name of nearest town/city |
| nearestTownDistance | number? | Distance to nearest town in km |
| nearestTownDirection | string? | Direction from town to user (e.g., "southeast of Moora") |

### 13.2 EmergencyFacility

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| name | string | Facility name |
| type | string | "hospital", "fire_station", "police_station" |
| distance | number | Distance in km |
| lat | number | Latitude |
| lon | number | Longitude |
| phone | string? | Phone number |

### 13.3 NearestIntersection (from MRWA Layer 6)

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| nodeName | string | Intersection name (e.g., "Dawson St & Elizabeth St") |
| slkOnRefRoad | number | SLK position on reference road |
| lat | number | Intersection latitude |
| lon | number | Intersection longitude |
| connectedRoadId | string? | ID of intersecting road |
| connectedRoadName | string? | Name of intersecting road |

---

## 8. GPS Tracking Data Structures

### 13.1 GpsReading

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| lat | number | Latitude in degrees |
| lon | number | Longitude in degrees |
| accuracy | number | Accuracy in meters |
| speed | number | Speed in m/s |
| heading | number | Heading in degrees |
| timestamp | number | Unix timestamp |

### 13.2 EkfState

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| x | number[] | State vector [lat, lon, v_lat, v_lon] |
| P | number[][] | Covariance matrix |
| lastUpdate | number | Last update timestamp |

### 13.3 EkfOutput

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| lat | number | Filtered latitude |
| lon | number | Filtered longitude |
| uncertainty | number | Position uncertainty in meters |
| confidence | string | High, Medium, Low, or Predicted |
| isPredicted | boolean | Is this a prediction? |

### 13.4 GpsSettings

| **Field** | **Type** | **Default** | **Description** |
|-----------|----------|-------------|-----------------|
| ekfFiltering | boolean | true | Enable EKF filtering |
| roadConstraint | boolean | true | Snap to road geometry |
| maxPredictionTime | number | 30 | Max GPS outage prediction (seconds) |
| showUncertainty | boolean | true | Show ±Xm accuracy |
| earlyWarnings | boolean | true | Alert earlier at higher speeds |
| speedLookahead | number | 5 | Lookahead time (seconds) |
| gpsLagCompensation | number | 0 | Measured GPS lag (seconds) |
| showSpeedDisplay | boolean | false | Show speed during tracking |
| showAfterCareOnDrive | boolean | true | Show AfterCare banner |
| afterCareLookaheadKm | number | 5 | AfterCare lookahead distance (km) |

---

## 9. Weather Data Structures

### 13.1 WeatherData

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| location | string | Location name |
| current | CurrentWeather | Current conditions |
| sun | SunData | Sunrise/sunset info |
| forecast | ForecastItem[] | 8-hour forecast |
| warnings | WeatherWarning[] | BOM warnings (if any) |
| cached_at | number? | Cache timestamp |

### 13.2 CurrentWeather

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| temperature | number | Temperature in °C |
| condition | string | Weather condition text |
| humidity | number | Relative humidity % |
| wind_speed | number | Wind speed in km/h |
| wind_gusts | number | Wind gusts in km/h |
| wind_direction | number | Wind direction in degrees |
| uv_index | number | UV index |

### 13.3 SunData

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| sunrise | string | Sunrise time (HH:MM) |
| sunset | string | Sunset time (HH:MM) |
| daylight_hours | number | Hours of daylight |

### 13.4 WeatherWarning

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| title | string | Warning title |
| type | string | Warning type |
| severity | string | Severity level |
| issued | string | Issue time |
| expires | string | Expiry time |
| link | string | BOM link |

---

## 10. Places and Amenities

### 13.1 Place

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| name | string | Place name |
| type | string | hospital, fuel, toilet |
| distance | string | Distance from work zone |
| lat | number | Latitude |
| lon | number | Longitude |
| phone | string? | Phone number |
| address | string? | Street address |
| googleMapsUrl | string | Google Maps link |
| isEmergency | boolean? | Emergency facility? |

### 13.2 AmenitiesData (Cached)

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| region | string | MRWA region |
| hospitals | Place[] | Hospital locations |
| fuel_stations | Place[] | Fuel station locations |
| toilets | Place[] | Public toilet locations |

---

## 11. Traffic Data Structures

### 13.1 TrafficData

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| road_id | string | Road identifier |
| aadt | number | Annual Average Daily Traffic |
| aadt_year | string | Data year |
| heavy_vehicle_percent | number | Heavy vehicle % |
| peak_hour_volume | number | Peak hour volume |
| source | string | Data source |

### 13.2 TrafficVolume (Cached)

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| road_id | string | Road identifier |
| slk | number | Location SLK |
| aadt | number | Annual Average Daily Traffic |
| year | number | Data year |
| heavy_percent | number | Heavy vehicle percentage |

---

## 12. Storage Data Structures

### 13.1 localStorage Keys

| **Key** | **Type** | **Description** |
|---------|----------|-----------------|
| speedSignOverrides | SpeedSignOverride[] | Speed sign overrides |
| afterCareJobs | AfterCareJob[] | AfterCare jobs and signs |
| signPresets | SignPreset[] | User-defined sign presets |
| gpsSettings | GpsSettings | GPS/EKF settings |
| windGustThreshold | number | Wind gust alert threshold |
| defaultRegion | string | Default region selection |
| offlineToggles | OfflineToggles | Data source toggles |

### 13.2 OfflineToggles

| **Field** | **Type** | **Default** | **Description** |
|-----------|----------|-------------|-----------------|
| roadsList | boolean | false | Use offline roads list |
| workZoneLookup | boolean | false | Use offline work zone lookup |
| speedZones | boolean | false | Show speed zones from IndexedDB |
| railCrossings | boolean | false | Show rail crossings from IndexedDB |
| regulatorySigns | boolean | false | Show regulatory signs from IndexedDB |
| warningSigns | boolean | false | Show warning signs from IndexedDB |

### 13.3 IndexedDB Stores

| **Store** | **Key** | **Description** |
|-----------|---------|-----------------|
| roads | road_id + region | Road network data (69,000+ roads) |
| speedZones | id | MRWA speed zone data |
| railCrossings | id | Rail crossing locations |
| regulatorySigns | id | Regulatory signage |
| warningSigns | id | Warning signage |
| pavement | road_id + slk | Pavement and lane data |
| trafficVolume | road_id + slk | Traffic count data |

---

## 13. PWA Manifest Structure

### 13.1 manifest.json

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| name | string | "TC Work Zone Locator" |
| short_name | string | "TC Locator" |
| description | string | App description |
| start_url | string | "/" |
| display | string | "standalone" |
| background_color | string | "#0f172a" |
| theme_color | string | "#0ea5e9" |
| icons | Icon[] | App icons array |
| shortcuts | Shortcut[] | Quick action shortcuts |

### 13.2 Icon

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| src | string | Icon path |
| sizes | string | "192x192" or "512x512" |
| type | string | "image/png" |
| purpose | string | "any maskable" |

### 13.3 Shortcut

| **Field** | **Type** | **Description** |
|-----------|----------|-----------------|
| name | string | Shortcut name |
| short_name | string | Short name |
| description | string | Description |
| url | string | Target URL |
| icons | Icon[] | Shortcut icons |

### 13.4 Service Worker Cache

| **Cache Name** | **Contents** |
|----------------|--------------|
| static-assets | JS, CSS, HTML files |
| road-data | MRWA road geometry |
| speed-zones | Speed zone data |
| map-tiles | OpenStreetMap tiles |

---

## Appendix: Type Definitions Summary

### Enum Types

```typescript
type Direction = 'True Left' | 'True Right';

type SignType = 'Single' | 'Double';

type SignCategory = 'Surface' | 'Speed' | 'Hazard';

type RetrievalType = 'standard' | 'scheduled' | 'tba' | 'daily' | 'weekly' | 'monthly';

type SignStatus = 'placed' | 'due-retrieval' | 'due-maintenance' | 'maintained' | 'retrieved';

type ComputedJobStatus = 'due-retrieval' | 'due-maintenance' | 'tba' | 'active' | 'retrieved' | 'archived';

type Carriageway = 'Left' | 'Right' | 'Single';

type ConfidenceLevel = 'High' | 'Medium' | 'Low' | 'Predicted';

type PlaceType = 'hospital' | 'fuel' | 'toilet';
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
