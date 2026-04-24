# Banner Alert Workflow Reference

## What Are Banner Alerts?

MRWA issues formal workplace safety notifications called **Banner Alerts**. These are distributed via email to all Main Roads personnel and contracting organisations. They are NOT the same as live traffic alerts from the Travel Map API.

## Banner Colours & Severity

| Colour | Type | When Issued |
|--------|------|-------------|
| **Red** | Preliminary Notice | Serious incident, LTI, near miss with high potential |
| **Amber** | Preliminary Notice | Significant incident, near miss |
| **Grey** | Final Notice | After ICAM investigation — includes contributing factors, corrective actions, lessons learnt |

## Workflow

```
Incident → Red/Amber Banner (preliminary) → ICAM Investigation → Grey Banner (final) → Archive
```

- Red/Amber and Grey banners for the SAME incident share the **same EQSafe number**
- Link them in `index.json` via `linked_red_banner` and `linked_grey_banner` fields

## How to Process a New PDF

### Method 1: Use the Script
```bash
python3 scripts/process_banner_alerts.py /path/to/new-alert.pdf
```
The script extracts text, parses all fields, renames the file, updates index.json, and outputs git commands.

### Method 2: Manual Processing in Chat
When the user sends a PDF in chat:
1. Extract text with `pdftotext`
2. Parse all standard fields (see field list below)
3. Rename file: `YYYY-MM-DD_[EQSafe]_[Colour-Type]_[Brief-Description].pdf`
4. Place in correct folder: `data/banner_alerts/pdf/{red,amber,grey}/`
5. Update `data/banner_alerts/pdf/index.json` with full metadata
6. Git add, commit, push

## Standard PDF Fields

Every banner alert contains:

| Field | Key in index.json |
|-------|-------------------|
| Date of Incident | `date_of_incident` |
| Time of Incident | `time_of_incident` |
| Directorate / Region | `directorates` |
| Main Roads or Contractor | `main_roads_or_contractor` |
| EQSafe Event Type | `event_type` |
| EQSafe Incident Number | `eqsafe_number` |
| Actual Consequence | `actual_consequence` |
| Potential Consequence | `potential_consequence` |
| Incident Short Description | `short_description` |
| What Happened | Extracted into `work_activity`, `injury_type`, `key_details` |
| Contributing Factors | `contributing_factors` (Grey only) |
| Corrective Actions | `corrective_actions` (Grey only) |
| Distribution Reference | `distribution_reference` |
| Distribution Date | `distribution_date` |

## Additional Fields to Extract When Present

- `critical_risk_profile` — e.g. "Mobile Plant", "Vehicles and Driving"
- `worksafe_notified` — true/false
- `is_lti` — Lost Time Injury (detect from text)
- `investigation_type` — "ICAM" or "ICAM Lite"
- `investigation_status` — "Commenced" / "Completed"
- `road` — if a road name is mentioned
- `additional_learnings` — from Grey banners

## Consequence Levels

Low → Moderate → Major → Extreme

## Event Types Seen

- Injury / Illness
- Lost Time Injury
- Procedure Breach
- Damage / Loss
- Near Miss
- Environmental

## Duplicate Detection

Check `index.json` before adding — match on `eqsafe_number` + `banner_colour`. The same EQSafe number can appear once in red AND once in grey (they're the same incident at different stages).

## Current Library Stats (as of 2026-04-24)

- 4 Red Banners (3 active, 1 pending Grey)
- 3 Grey Banners (all closed)
- 0 Amber Banners
- Regions: Kimberley, Mid West-Gascoyne, Goldfields-Esperance, Great Southern, Wheatbelt
- Most are Moderate/Moderate — two are Moderate/Major (57801, 57937)
