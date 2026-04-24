# MRWA Banner Alert PDF Library

This library contains **workplace safety incident banner alerts** issued by MRWA. These are formal HSE (Health, Safety & Environment) notifications distributed to Main Roads personnel and contracting organisations — they are **not** the live traffic alerts from the Travel Map API.

## Banner Alert Types

| Colour | Severity | Description |
|--------|----------|-------------|
| **Red** | Serious | Injury / Illness resulting in LTI, or near miss with high potential consequence. Issued as preliminary notice. |
| **Amber** | Significant | Significant incident or near miss. Issued as preliminary notice. |
| **Grey** | Final | Lessons learnt report with investigation findings and recommendations. Issued after ICAM investigation. |

## Banner Workflow

```
Incident occurs
    │
    ▼
Red or Amber Banner (Preliminary Notice)
    │   ─── Immediate notification to all personnel
    │   ─── Basic facts: what happened, where, consequence level
    │
    ▼
ICAM Investigation Commenced
    │   ─── Systematic investigation of contributing factors
    │   ─── Root cause analysis
    │
    ▼
Grey Banner (Final Report)
    │   ─── Lessons learnt
    │   ─── Recommendations and corrective actions
    │   ─── Distributed to all personnel
    │
    ▼
Archived (Red + Grey pair linked together)
```

## Folder Structure

```
pdf/
├── red/              # Red Banner Alerts (serious, LTI, high-potential near miss)
├── amber/            # Amber Banner Alerts (significant incident / near miss)
├── grey/             # Grey Banner Alerts (final lessons learnt reports)
├── archive/          # Closed/resolved alert pairs
├── index.json        # Machine-readable index of all uploaded PDFs
└── README.md         # This file
```

## File Naming Convention

```
YYYY-MM-DD_[EQSafe-Number]_[Banner-Colour]-[Notice-Type]_[Brief-Description].pdf
```

### Examples:
```
2026-04-15_57935_Red-Preliminary_Worker-struck-shin-sledgehammer-LTI.pdf
2026-04-20_58012_Amber-Preliminary_Near-miss-falling-branch-culvert.pdf
2026-05-01_57935_Grey-Final_Worker-struck-shin-sledgehammer-LTI.pdf
```

### Rules:
- Date is the **incident date**, not the distribution date
- Use the **EQSafe Incident Number** for traceability
- Include **Banner Colour** and **Notice Type** (Preliminary/Final)
- The Grey banner for the same incident uses the **same EQSafe number**
- Keep description short but identifiable
- No special characters

## How to Upload

### Send PDF in chat
Attach or share the PDF in the conversation. The AI assistant will:
1. Parse the PDF content
2. Extract all metadata fields (EQSafe number, dates, directorate, event type, consequence, description)
3. Rename and place in the correct colour folder
4. Update `index.json` with structured metadata
5. Link to related banners (e.g. Red → Grey pair by EQSafe number)
6. Commit and push to GitHub

### Manual Git Push
```bash
# 1. Copy PDF to the right colour folder
cp ~/Downloads/alert.pdf data/banner_alerts/pdf/red/

# 2. Rename
mv data/banner_alerts/pdf/red/alert.pdf \
   data/banner_alerts/pdf/red/2026-04-15_57935_Red-Preliminary_Worker-struck-shin-sledgehammer-LTI.pdf

# 3. Update index.json with the document entry

# 4. Commit and push
git add data/banner_alerts/pdf/
git commit -m "Add Red Banner 57935: Worker struck shin with sledgehammer LTI"
git push
```

## PDF Content Structure (Standard Fields)

Every banner alert PDF contains these fields:

| Field | Description |
|-------|-------------|
| Date of Incident | When the incident occurred |
| Time of Incident | Time of incident |
| Directorate / Region | MRWA region or directorate |
| Main Roads or Contractor | Who was involved |
| EQSafe Event Type | Injury/Illness, Near Miss, Environmental, etc. |
| EQSafe Incident Number | Unique tracking number |
| Actual Consequence | Low / Moderate / High / Extreme |
| Potential Consequence | Low / Moderate / High / Extreme |
| Incident Short Description | One-line summary |
| What Happened | Detailed narrative of the incident |
| Distribution of Notice | Reference number and date |
| Distribution | "Main Roads Personnel and Contracting Organisations" |

## index.json Document Entry Format

```json
{
  "filename": "2026-04-15_57935_Red-Preliminary_Worker-struck-shin-sledgehammer-LTI.pdf",
  "folder": "red",
  "original_filename": "Red Banner Alert - Preliminary Notice - 57935- Worker struck on shin with sledgehammer, resulting in a LTI- 15 April 2026.pdf",
  "upload_date": "2026-04-24",
  "alert": {
    "banner_colour": "Red",
    "notice_type": "Preliminary Notice",
    "eqsafe_number": 57935,
    "date_of_incident": "2026-04-15",
    "time_of_incident": "10:15 AM",
    "directorates": "RMO – Great Southern Region",
    "main_roads_or_contractor": "Main Roads",
    "event_type": "Injury / Illness",
    "actual_consequence": "Moderate",
    "potential_consequence": "Moderate",
    "short_description": "Maintenance worker struck his shin with a sledgehammer, resulting in an LTI",
    "road": null,
    "slk": null,
    "work_activity": "Removing fallen tree branch from side drain at culvert face",
    "injury_type": "Shin strike by sledgehammer",
    "is_lti": true,
    "investigation_type": "ICAM",
    "investigation_status": "Commenced",
    "distribution_reference": "D26#479158",
    "distribution_date": "2026-04-17"
  },
  "linked_grey_banner": null,
  "status": "active"
}
```

## Consequence Levels

| Level | Description |
|-------|-------------|
| Low | First aid only, no lost time |
| Moderate | LTI (1 day+), medical treatment |
| High | Serious injury, hospitalisation |
| Extreme | Fatality, permanent disability |

## Event Types

- Injury / Illness
- Near Miss
- Environmental
- Property Damage
- Security
