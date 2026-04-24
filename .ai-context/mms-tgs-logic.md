# MMS Frame Logic & TGS Layout Reference

## Quick Load Instruction

When the user says **"Read the MMS frame logic files"** or **"Load the TGS logic"**, read these two files:

1. **`docs/MMS_Frame_Logic.md`** — Human-readable rule set (14 sections, 370 lines)
2. **`docs/MMS_Frame_Layouts.json`** — Machine-readable data (spacing tables, frame templates, MMS codes, RF-046/047 complete layouts)

Read BOTH files. The .md has the full rules and explanations; the .json has the structured data for programmatic use.

## Summary of What's Covered

### MMS Frame Logic (docs/MMS_Frame_Logic.md)

14 sections covering the complete rule set:

| Section | Topic | Key Rules |
|---------|-------|-----------|
| 1 | What is an MMS | Modular sign frame, 1-3 plates, double-sided for reversible flow |
| 2 | Plate Count Rules | Max 3 plates, NO BLANK PLATES, ROAD WORK AHEAD = 1 plate |
| 3 | Approach Speed Frames | Each speed step is a separate frame: Speed \| Symbolic \| REDUCE SPEED |
| 4 | Traffic Control Frames | PREPARE TO STOP (triple) → STOP HERE WHEN DIRECTED (single) |
| 5 | Departure Side | Lowest speed frame gets reverse: Posted speed \| END ROAD WORK \| DRIVE SAFELY |
| 6 | Sign Spacing | D-values from AGTTM Part 3 Table 2.2 (110→200m, 100→175m, etc.) |
| 7 | Speed-Conditional Rules | ≥100: 300m + AHEAD signs. ≥80: 200m + REDUCE SPEED + EoQ. <80: shorter D |
| 8 | Reversible Flow | Symmetrical layout, only lowest speed frame double-sided |
| 9 | Worksite Speed | >3.0m→60, 1.2-3.0m→60, <1.2m→40. Max 40km/h zone = 500m |
| 10 | Frame Templates | RF-047 (60km/h, 4 frames), RF-046 (40km/h, 5 frames), low-speed (3 frames) |
| 11 | MMS Codes | REG-1/2, ADV-3/10/11/27/28/38/47/48/52A/79/82, TER-1/4 |
| 12 | Symbolic Signs | Road Worker, Bat Man, Symbolic Control Device — when each is used |
| 13 | Common Mistakes | 7 documented mistakes with correct/wrong examples |
| 14 | Logic Flowchart | Step-by-step decision tree for determining any MMS layout |

### MMS Frame Layouts (docs/MMS_Frame_Layouts.json)

Structured data containing:
- **spacingTable** — D-values by posted speed
- **worksiteSpeedRules** — Distance from lane → worksite speed → RF reference
- **speedFrameTemplate** — First frame vs subsequent frame plate structure
- **trafficControlFrames** — PTS + SHWD frame definitions
- **departureTemplate** — Reverse side content
- **conditionalRules** — Speed-dependent requirements
- **frameLayouts** — Complete RF-046 and RF-047 layouts with MMS codes
- **mmsCodeReference** — All 15 MMS code definitions
- **commonMistakes** — 6 documented mistakes in structured format

### TGS Diagram Index (public/library/mrwa/tmp/tgs-index.json)

Complete index of all MRWA TMP TGS diagrams organised by category:
- **IW** (Setup & Guidance) — 11 entries
- **RF-Guide** (End of Queue Protection) — 3 entries
- **EW** (Emergency Response) — 21 entries
- **AC** (Aftercare) — 14 entries
- **LC** (Lane Closure) — 20 entries
- **LS** (Lateral Shift) — 15 entries
- **MS2** (Class 2 Mobile) — 19 entries
- **MS3** (Class 3 Mobile) — 11 entries
- **RA** (Rail Approach) — 12 entries
- **RF** (Reversible Flow) — 38 entries
- **STLI** (Short Term Low Impact) — 21 entries
- **TH** (Traffic Hold) — 9 entries
- **WR** (Works off Road) — 18 entries

Each entry has: id, title, postedSpeed, tempSpeed, page, implementation level

## Key Rules to Never Forget

1. **ROAD WORK AHEAD = ONE plate** (not two)
2. **No blank plates** — match frame size to plate count
3. **Lowest speed frame** gets both REDUCE SPEED (plate 3) AND departure messaging (reverse)
4. **F1 doesn't need departure messaging** — only the lowest speed frame
5. **XX AHEAD comes BEFORE the regulatory XX sign** — advisory first, then regulatory
6. **Signs at the same position** go on one multi-plate frame, not separate frames
7. **80→60 frame spacing**: 300m at ≥100 km/h, 200m at ≥80 km/h
8. **Worksite speed <1.2m = 40 km/h** (5 approach frames), **1.2-3.0m = 60 km/h** (4 approach frames)

## Quick Reference: Frame Layouts

### RF-047 (60 km/h worksite, 1.2-3.0m from lane)
```
F1: 80 | ROAD WORK AHEAD | DRIVE SLOWLY         (triple, ~1000m)
F2: 60 | ROAD WORKER SYMBOLIC | REDUCE SPEED     (triple, ~800m) ← reverse: 110 | END ROAD WORK | DRIVE SAFELY
F3: PREPARE TO STOP | BAT MAN SYMBOLIC | DO NOT OVERTAKE  (triple, ~300m)
F4: STOP HERE WHEN DIRECTED                       (single, at TC)
```

### RF-046 (40 km/h worksite, within 1.2m)
```
F1: 80 | ROAD WORK AHEAD | DRIVE SLOWLY         (triple)
F2: 60 | ROAD WORKER SYMBOLIC | REDUCE SPEED     (triple)
F3: 40 | SYMBOLIC CONTROL DEVICE | REDUCE SPEED  (triple) ← reverse: 110 | END ROAD WORK | DRIVE SAFELY
F4: PREPARE TO STOP | BAT MAN SYMBOLIC | DO NOT OVERTAKE  (triple)
F5: STOP HERE WHEN DIRECTED                       (single)
```
