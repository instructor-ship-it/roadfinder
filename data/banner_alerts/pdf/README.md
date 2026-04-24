# MRWA Banner Alert PDF Library

This folder contains incident investigation PDFs received via email from MRWA. These are **separate** from the live API banner alerts — they contain formal incident investigation documentation that is not available through the Travel Information GIS service.

## Folder Structure

```
pdf/
├── incidents/        # Active incident alert PDFs (emailed notifications)
├── investigations/   # Full incident investigation reports and findings
├── archive/          # Resolved/closed alerts moved here for reference
├── index.json        # Machine-readable index of all uploaded PDFs
└── README.md         # This file
```

## File Naming Convention

Upload PDFs using this naming pattern:

```
YYYY-MM-DD_[Road-Name]_[Incident-Type]_[Brief-Description].pdf
```

### Examples:
```
2026-04-24_Great-Northern-Hwy_Pothole_Guda-Guda-Community.pdf
2026-04-20_Mitchell-Fwy_Crash_Hepburn-Ave-Exit.pdf
2026-03-15_North-West-Coastal-Hwy_Flooding_Lyndon-River-Bridge.pdf
2026-04-10_Stock-Rd_Breakdown_Leach-Hwy-Intersection.pdf
```

### Rules:
- Use the **date the alert was received** (or incident date if different, note in index)
- Replace spaces in road names with hyphens
- Use the incident type as categorised by MRWA
- Keep the brief description short but identifiable
- No special characters (parentheses, slashes, etc.)

## How to Upload

### Option 1: Direct Git Push
Place the PDF in the appropriate folder, update `index.json`, then push:

```bash
# 1. Copy your PDF to the right folder
cp ~/Downloads/alert.pdf data/banner_alerts/pdf/incidents/

# 2. Rename to follow convention
mv data/banner_alerts/pdf/incidents/alert.pdf \
   data/banner_alerts/pdf/incidents/2026-04-24_Great-Northern-Hwy_Pothole_Guda-Guda.pdf

# 3. Update the index (see index.json format below)

# 4. Commit and push
git add data/banner_alerts/pdf/
git commit -m "Add incident alert: Great Northern Hwy pothole Guda Guda"
git push
```

### Option 2: Send PDF to the AI assistant
Attach or share the PDF in chat. The assistant will:
1. Parse the PDF content
2. Extract key metadata (road, SLK, incident type, dates, region)
3. Rename and place in the correct folder
4. Update index.json
5. Commit and push to GitHub

## index.json Format

Each uploaded document gets an entry like this:

```json
{
  "filename": "2026-04-24_Great-Northern-Hwy_Pothole_Guda-Guda.pdf",
  "folder": "incidents",
  "upload_date": "2026-04-24",
  "incident": {
    "date": "2026-04-24",
    "road": "Great Northern Hwy",
    "road_no": "H001",
    "slk": null,
    "region": "Kimberley",
    "suburb": "Shire of Wyndham-East Kimberley",
    "type": "Pothole / Road Surface Damage",
    "level": "Level 1",
    "description": "Road surface damage at Guda Guda Community",
    "traffic_impact": "Reduced to Single Lane Traffic Only. Temporary Traffic Signals in Place.",
    "status": "active"
  },
  "investigation": {
    "report_no": null,
    "findings": null,
    "recommendations": null,
    "root_cause": null
  },
  "source": "email",
  "notes": ""
}
```

## Incident Types

Match to MRWA categories where possible:
- Pothole / Road Surface Damage
- Crash
- Break Down / Tow Away
- Animal / Livestock
- Vehicle Fire
- Flooding
- Tropical Low / Cyclone
- Public Utilities (gas, water, power)
- Debris
- Signal Fault
- Other

## Investigation Workflow

1. **Alert received** → PDF goes in `incidents/`
2. **Investigation initiated** → Investigation report PDF goes in `investigations/`
3. **Incident resolved** → Both PDFs move to `archive/`, status changes to "closed"
4. **Link entries** in index.json by road + date to connect alerts to their investigations
