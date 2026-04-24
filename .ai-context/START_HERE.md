# AI Session Context — START HERE

> **When starting a new chat session, tell the AI to read this file first.**
> Example: *"Read the .ai-context folder in the roadfinder repo before we start"*

## Who You're Working With

The user is a road/traffic engineering professional working in Western Australia. They work with MRWA (Main Roads WA) standards, TMP/TGS layouts, and GIS data for road assets. They need practical, accurate engineering support — not generic advice.

## Current Project: RoadFinder

A road network intelligence tool that combines MRWA open data with traffic management standards.

### GitHub Repo
- **Repo**: `instructor-ship-it/roadfinder`
- **Token**: `${GITHUB_TOKEN}`
- **Branch**: `main`

## Active Workstreams

| Workstream | Status | Key Files |
|-----------|--------|-----------|
| MMS Frame Logic | Complete | `docs/MMS_Frame_Logic.md`, `docs/MMS_Frame_Layouts.json` |
| MRWA GIS Data | Active | Various `dataset_*.json` files in root |
| Banner Alert Library | Active | `data/banner_alerts/` |
| Drainage Datasets | Identified | See `.ai-context/mrwa-gis-datasets.md` |

## Important Rules

1. **Don't guess at MMS frame layouts** — Read `docs/MMS_Frame_Logic.md` for the established rules
2. **MRWA GIS data** — Check `.ai-context/mrwa-gis-datasets.md` for known endpoints before searching
3. **Banner Alert PDFs** — Use the script at `scripts/process_banner_alerts.py` or process manually following `.ai-context/banner-alert-workflow.md`
4. **Australian standards** — AGTTM Part 3, AS 1742.3, MRWA TMP/TGS diagrams (RF-series)
5. **No blank MMS plates** — Match frame size to plate count
6. **Lowest speed frame** gets REDUCE SPEED on plate 3 AND departure messaging on reverse
7. **ROAD WORK AHEAD** is ONE plate, not two

## File Structure Map

```
roadfinder/
├── .ai-context/              ← YOU ARE HERE — AI session context files
│   ├── START_HERE.md         ← Read this first in every session
│   ├── banner-alert-workflow.md
│   └── mrwa-gis-datasets.md
├── data/
│   ├── banner_alerts/
│   │   ├── banner_alerts.json       # Live API snapshot
│   │   ├── banner_alerts_schema.json
│   │   └── pdf/
│   │       ├── red/                  # Red Banner PDFs
│   │       ├── amber/                # Amber Banner PDFs
│   │       ├── grey/                 # Grey Banner PDFs
│   │       ├── archive/              # Resolved pairs
│   │       ├── index.json            # Document index
│   │       └── README.md
│   └── speed-overrides.json
├── docs/
│   ├── MMS_Frame_Logic.md           # MMS sign layout rules
│   ├── MMS_Frame_Layouts.json       # Machine-readable MMS data
│   └── MRWA_Banner_Alerts_Library.md
├── scripts/
│   └── process_banner_alerts.py     # PDF processing script
└── [many dataset JSON files in root]
```
