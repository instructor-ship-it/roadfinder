# AI Session Context — START HERE

> **When starting a new chat session, tell the AI to read this file first.**
> Example: *"Read the .ai-context/START_HERE.md in the roadfinder repo before we start"*

## Who You're Working With

The user is a road/traffic engineering professional working in Western Australia. They work with MRWA (Main Roads WA) standards, TMP/TGS layouts, and GIS data for road assets. They need practical, accurate engineering support — not generic advice.

## Current Project: RoadFinder

A road network intelligence tool that combines MRWA open data with traffic management standards.

### GitHub Repo
- **Repo**: `instructor-ship-it/roadfinder`
- **Token**: `${GITHUB_TOKEN}`
- **Branch**: `main`

## Quick-Load Prompts

Use these phrases to load context into a new session:

| You Say | AI Reads | Purpose |
|---------|----------|---------|
| **"Read the MMS frame logic files"** | `docs/MMS_Frame_Logic.md` + `docs/MMS_Frame_Layouts.json` | Full MMS/TGS sign layout rule set |
| **"Load the TGS logic"** | Same as above | Same as above |
| **"Read the .ai-context folder"** | All files in `.ai-context/` | Complete project context |
| **"Load the GIS datasets"** | `.ai-context/mrwa-gis-datasets.md` | All known MRWA GIS endpoints |
| **"Load banner alert workflow"** | `.ai-context/banner-alert-workflow.md` | How to process HSE banner alert PDFs |

## Active Workstreams

| Workstream | Status | Key Files |
|-----------|--------|-----------|
| MMS Frame Logic | Complete | `docs/MMS_Frame_Logic.md`, `docs/MMS_Frame_Layouts.json` |
| TGS Diagram Index | Complete | `public/library/mrwa/tmp/tgs-index.json` (200+ diagrams across 13 categories) |
| MRWA GIS Data | Active | Various `dataset_*.json` files in root |
| Banner Alert Library | Active | `data/banner_alerts/` (7 PDFs indexed so far) |
| Drainage Datasets | Identified | See `.ai-context/mrwa-gis-datasets.md` |

## Important Rules

1. **Don't guess at MMS frame layouts** — Read `docs/MMS_Frame_Logic.md` for the established rules
2. **MRWA GIS data** — Check `.ai-context/mrwa-gis-datasets.md` for known endpoints before searching
3. **Banner Alert PDFs** — Use `scripts/process_banner_alerts.py` or process manually following `.ai-context/banner-alert-workflow.md`
4. **Australian standards** — AGTTM Part 3, AS 1742.3, MRWA TMP/TGS diagrams (RF-series)
5. **No blank MMS plates** — Match frame size to plate count
6. **Lowest speed frame** gets REDUCE SPEED on plate 3 AND departure messaging on reverse
7. **ROAD WORK AHEAD** is ONE plate, not two
8. **XX AHEAD comes BEFORE the regulatory XX sign** — advisory first, then regulatory

## Context Files in This Folder

| File | What It Contains |
|------|-----------------|
| `START_HERE.md` | This file — project overview, rules, quick-load prompts |
| `mms-tgs-logic.md` | MMS frame logic summary, key rules, RF-046/047 layouts, TGS index overview |
| `banner-alert-workflow.md` | How to process Red/Amber/Grey banner PDFs, field definitions, naming convention |
| `mrwa-gis-datasets.md` | All known MRWA GIS endpoints, layer IDs, record counts, drainage data |

## File Structure Map

```
roadfinder/
├── .ai-context/              ← YOU ARE HERE — AI session context files
│   ├── START_HERE.md         ← Read this first in every session
│   ├── mms-tgs-logic.md      ← MMS/TGS frame logic quick reference
│   ├── banner-alert-workflow.md  ← Banner alert processing workflow
│   └── mrwa-gis-datasets.md  ← MRWA GIS dataset endpoints
├── data/
│   ├── banner_alerts/
│   │   ├── banner_alerts.json       # Live API snapshot (297 records)
│   │   ├── banner_alerts_schema.json
│   │   └── pdf/
│   │       ├── red/                  # Red Banner PDFs (4 files)
│   │       ├── amber/                # Amber Banner PDFs
│   │       ├── grey/                 # Grey Banner PDFs (3 files)
│   │       ├── archive/              # Resolved pairs
│   │       ├── index.json            # Document index (7 entries)
│   │       └── README.md
│   └── speed-overrides.json
├── docs/
│   ├── MMS_Frame_Logic.md           # MMS sign layout rules (14 sections)
│   ├── MMS_Frame_Layouts.json       # Machine-readable MMS data + RF-046/047
│   └── MRWA_Banner_Alerts_Library.md
├── scripts/
│   └── process_banner_alerts.py     # PDF processing script
├── public/library/mrwa/tmp/
│   └── tgs-index.json               # Complete TGS diagram index (200+ entries)
└── [many dataset JSON files in root]
```
