# MRWA Banner Alerts Library

This library provides real-time traffic alert data from Main Roads Western Australia's Travel Information GIS service.

## Data Source

**ArcGIS REST API**: `https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/TravelInformation/MapServer`

## Alert Categories

| Category | Layer ID | Description | Typical Count |
|----------|----------|-------------|---------------|
| Incidents | 0 | Crashes, hazards, road surface damage, livestock, cyclones | 10-50 |
| Road Works | 1 | Maintenance, construction, long-term closures | 200-400 |
| Events Management | 2 | Planned events affecting traffic (sporting, festivals) | 5-30 |
| Road Closures | 3 | Current road closures (polygon geometry) | Varies |
| Detours | 4 | Active detour routes | Varies |

## Data Schema

### Incidents (Layer 0)

| Field | Type | Description |
|-------|------|-------------|
| Id | Integer | Unique incident ID |
| Location | String | Description of location (road, landmark, issue) |
| TrafficImpact | String | Impact description (lane closures, speed restrictions, etc.) |
| IncidentType | String | Type: Pothole/Road Surface Damage, Crash, Animal/Livestock, Tropical Low/Cyclone, Fire, Flooding, etc. |
| ClosureType | String | Type of closure if applicable |
| publishExternally | String | Yes/No — whether shown on public channels |
| publishToPlaybook | String | Yes/No — whether sent to playbook systems |
| TrafficCondition | String | Current condition: All Lanes Open, Speed Restrictions Apply, Reduced to Single Lane, etc. |
| EntryDate | String | When alert was created (DD/MM/YYYY HH:MM:SS) |
| UpdateDateTime | String | Last update timestamp |
| Road | String | MRWA road name |
| Region | String | MRWA region (Kimberley, Mid West Gascoyne, Metropolitan, etc.) |
| IncidentLevel | String | Level 1, Level 2, Level 3 |
| Suburb | String | Local government area or suburb |

### Road Works (Layer 1)

| Field | Type | Description |
|-------|------|-------------|
| Id | Integer | Unique road work ID |
| DateStarted | String | Work start date |
| EstimatedCompletionDate | String | Expected completion date |
| WorkStatus | String | Current status |
| WorkType | String | Maintenance, Construction, etc. |
| Description | String | Full description of works |
| TrafficImpact | String | Impact on traffic |
| Road | String | MRWA road name |
| Suburb | String | Location |
| Region | String | MRWA region |
| EntryDate | String | When alert was created |

### Events Management (Layer 2)

| Field | Type | Description |
|-------|------|-------------|
| Id | Integer | Unique event ID |
| EventDescription | String | Description of event |
| Road | String | Affected road |
| LocalRoadName | String | Local road name |
| DateTimeStart | String | Event start |
| DateTimeEnd | String | Event end |
| EventType | String | Type of event |
| EventName | String | Event name |
| Suburb | String | Location |
| TrafficImpact | String | Impact on traffic |
| Region | String | MRWA region |
| EntryDate | String | When alert was created |

## Incident Types (Observed Values)

- Pothole / Road Surface Damage
- Crash
- Animal / Livestock
- Tropical Low / Cyclone
- Fire
- Flooding
- Breakdown
- Debris
- Signal Fault

## Incident Levels

| Level | Meaning |
|-------|---------|
| Level 1 | Minor — all lanes open, exercise caution |
| Level 2 | Moderate — lanes restricted, speed reductions |
| Level 3 | Major — road closed or significant disruption |

## Traffic Conditions (Observed Values)

- All Lanes Open
- Speed Restrictions Apply
- Reduced to Single Lane Traffic
- Road Closed
- Reduced to Single Lane Alternating

## Files

| File | Format | Description |
|------|--------|-------------|
| `data/banner_alerts.json` | JSON | Full current alert data (all categories) |
| `data/banner_alerts_schema.json` | JSON | Schema definitions and API endpoints |

## Refreshing the Data

The banner alerts are **live data** — they change continuously. To fetch the latest:

```bash
# Fetch all incidents
curl "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/TravelInformation/MapServer/0/query?where=1%3D1&outFields=*&f=json" -o incidents.json

# Fetch all road works  
curl "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/TravelInformation/MapServer/1/query?where=1%3D1&outFields=*&f=json" -o road_works.json

# Fetch events management
curl "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/TravelInformation/MapServer/2/query?where=1%3D1&outFields=*&f=json" -o events.json
```

## Using in RoadFinder

The banner alerts can be used to:
1. **Display current alerts** on the map for a selected road/region
2. **Filter by road** — match `Road` field to the user's route
3. **Filter by severity** — use `IncidentLevel` to highlight major disruptions
4. **Correlate with TGS** — check if road works match active traffic management schemes
5. **Historical tracking** — snapshot daily for trend analysis

## API Query Examples

### Filter by Road
```
/MapServer/0/query?where=Road='Great Northern Hwy'&outFields=*&f=json
```

### Filter by Region
```
/MapServer/0/query?where=Region='Kimberley'&outFields=*&f=json
```

### Filter by Severity
```
/MapServer/0/query?where=IncidentLevel='Level 3'&outFields=*&f=json
```

### Active Road Works (not completed)
```
/MapServer/1/query?where=WorkStatus<>'Completed'&outFields=*&f=json
```
