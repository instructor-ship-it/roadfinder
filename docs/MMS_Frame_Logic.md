# MMS Frame Layout Logic for Australian TGS Diagrams
# Generated: 2026-04-22
# Purpose: Self-contained reference so any AI session can understand MMS framing rules
#          without retraining. Read this file first when working with TGS/MMS layouts.

===============================================================================
SECTION 1: WHAT IS AN MMS (MULTI-MESSAGE SIGN)?
===============================================================================

- An MMS is a modular sign frame that holds interchangeable sign plates
- Plates slide/clip into the frame in vertical slots
- A single frame can hold 1, 2, or 3 plates stacked vertically
- On reversible flow setups, frames can be double-sided (approach + departure)
- MMS codes (e.g. MMS-ADV-11, MMS-REG-1) identify standard plate types:
  - ADV = Advisory (warning, no legal speed change)
  - REG = Regulatory (legally enforceable)
  - TER = Termination (ending a zone)

===============================================================================
SECTION 2: PLATE COUNT RULES
===============================================================================

RULE 2.1: A frame may hold 1, 2, or 3 plates — NEVER more than 3
RULE 2.2: 2 plates per frame is the most common and preferred configuration
RULE 2.3: 3 plates is the maximum — beyond that readability suffers at speed
RULE 2.4: On high-speed roads (>=100 km/h), 2 plates is preferred for readability
RULE 2.5: NO BLANK PLATES — never leave an empty slot in a frame
  - Use a single-plate frame for 1 plate, double for 2, triple for 3
  - Never use a larger frame with a blank/empty plate slot
RULE 2.6: "ROAD WORK AHEAD" is ONE plate, not two separate words

===============================================================================
SECTION 3: APPROACH SIDE — SPEED REDUCTION FRAMES
===============================================================================

The approach side reduces speed from the posted speed down to the worksite speed
in steps. Each speed reduction gets its own frame.

RULE 3.1: SPEED STEP SEQUENCE
  - Speed reduces in steps, NOT a single jump
  - Typical steps: Posted -> 80 -> 60 -> 40 (as needed)
  - Each step is a separate frame
  - The number of frames depends on how low the worksite speed goes

RULE 3.2: SPEED FRAME CONTENT (each speed reduction frame)
  For EVERY speed reduction frame:
    Plate 1 (top):    The speed number (e.g. 80, 60, 40) — REGULATORY
    Plate 2 (middle): Symbolic/Advisory plate (varies by position)
    Plate 3 (bottom): REDUCE SPEED

  Examples:
    Frame for 80:  80 | ROAD WORK AHEAD      | DRIVE SLOWLY
    Frame for 60:  60 | ROAD WORKER SYMBOLIC  | REDUCE SPEED
    Frame for 40:  40 | SYMBOLIC CONTROL DEVICE| REDUCE SPEED

RULE 3.3: FIRST SPEED FRAME (highest reduction, e.g. 80)
  Plate 1: 80
  Plate 2: ROAD WORK AHEAD
  Plate 3: DRIVE SLOWLY
  Note: This is the first frame drivers encounter — it warns AND reduces speed

RULE 3.4: SUBSEQUENT SPEED FRAMES (60, 40, etc.)
  Plate 1: Speed number
  Plate 2: Symbolic sign appropriate to that zone
    - 60 frame: ROAD WORKER SYMBOLIC (workers present)
    - 40 frame: SYMBOLIC CONTROL DEVICE (traffic control ahead)
  Plate 3: REDUCE SPEED

RULE 3.5: SPEED REDUCTION IS REGULATORY
  - A speed sign in a red circle is REGULATORY — it legally changes the limit
  - An "XX AHEAD" sign is ADVISORY — it warns of a speed zone coming
  - "XX AHEAD" always appears BEFORE the actual "XX" regulatory sign

===============================================================================
SECTION 4: APPROACH SIDE — TRAFFIC CONTROL FRAMES
===============================================================================

After the speed reduction frames, traffic control frames instruct drivers at the
worksite entry point.

RULE 4.1: PREPARE TO STOP FRAME (second-to-last approach frame)
  Plate 1 (top):    PREPARE TO STOP
  Plate 2 (middle): BAT MAN SYMBOLIC (traffic controller with stop/slow bat)
  Plate 3 (bottom): DO NOT OVERTAKE
  This is ALWAYS a triple frame

RULE 4.2: STOP HERE WHEN DIRECTED FRAME (last approach frame)
  Single plate: STOP HERE WHEN DIRECTED
  This is ALWAYS a single frame

RULE 4.3: These two frames always appear together and in this order

===============================================================================
SECTION 5: DEPARTURE SIDE — REVERSE OF LOWEST SPEED FRAME
===============================================================================

RULE 5.1: THE LOWEST SPEED FRAME CARRIES DEPARTURE MESSAGING ON ITS REVERSE
  - This is the ONLY frame that needs a reverse side in most cases
  - It marks the boundary between worksite speed and return to normal

RULE 5.2: DEPARTURE SIDE CONTENT
  Plate 1 (top):    Posted speed (e.g. 110) — returns to original speed
  Plate 2 (middle): END ROAD WORK
  Plate 3 (bottom): DRIVE SAFELY

RULE 5.3: WHY THE LOWEST SPEED FRAME?
  - On the approach: it's the last instruction before entering the worksite
  - On departure: it's the first sign a driver sees LEAVING the worksite
  - Same physical location = natural transition point in both directions

RULE 5.4: OTHER FRAMES ARE APPROACH-ONLY (single-sided)
  - F1 (80 frame) — no reverse needed
  - Traffic control frames (PREPARE TO STOP, STOP HERE) — no reverse needed
  - Only the lowest speed frame needs departure messaging

===============================================================================
SECTION 6: SIGN SPACING (AGTTM PART 3 TABLE 2.2)
===============================================================================

RULE 6.1: 'D' VALUES BY POSTED SPEED
  Posted Speed (km/h) | D (meters)
  --------------------|----------
  110                 | 200m
  100                 | 175m
  80                  | 150m
  70                  | 120m
  65                  | 100m
  60                  | 80m
  55 or less          | 15m

RULE 6.2: FRAME SPACING — APPROACH SIDE
  F1 to F2:        300m (only on posted >= 100 km/h)
  F1 to F2:        200m (only on posted >= 80 km/h)
  Subsequent gaps: D metres per AGTTM Table 2.2
  F(n-1) to last:  D metres (minimum 30m)

RULE 6.3: TOLERANCES
  - Position of signs: minimum 10% less, maximum 25% more than given distance
  - Spacing of delineating devices: maximum 10% more than given spacing

RULE 6.4: DECELERATION REFERENCE
  - 80 km/h to 60 km/h: ~2.8 seconds, ~54m at comfortable deceleration (2.0 m/s^2)
  - D-spacing is about WARNING TIME, not deceleration distance
  - Drivers need time to see, read, and react — not just physically slow down

===============================================================================
SECTION 7: SPEED-CONDITIONAL RULES
===============================================================================

RULE 7.1: ON POSTED SPEED >= 100 km/h
  - 300m spacing between first two speed frames (instead of 200m)
  - "XX AHEAD" advisory sign required before the worksite speed sign
  - PREPARE TO STOP required at 300m from traffic control point

RULE 7.2: ON POSTED SPEED >= 80 km/h
  - 200m spacing between first two speed frames
  - REDUCE SPEED plate required
  - End of Queue protection mandatory (refer RF-022, 023, 044)

RULE 7.3: ON POSTED SPEED < 80 km/h
  - Shorter D-spacing per Table 2.2
  - No REDUCE SPEED plate required
  - No End of Queue protection required

RULE 7.4: "XX AHEAD" SIGNS
  - Only required on roads with posted speed >= 100 km/h
  - They are ADVISORY — they do not change the speed limit
  - They always appear BEFORE the actual regulatory speed sign they reference
  - On default speed roads, may replace the 80 sign with "60 AHEAD"

===============================================================================
SECTION 8: REVERSIBLE FLOW SPECIFICS
===============================================================================

RULE 8.1: DOUBLE-SIDED FRAMES
  - In reversible flow, traffic alternates direction through a single lane
  - Only the lowest speed frame needs to be double-sided
  - Approach side shows speed reduction + warning
  - Departure side shows speed restoration + end of worksite

RULE 8.2: MIRROR LAYOUT
  - Both approaches have the SAME sign sequence (symmetrical)
  - The traffic controller/bat person serves both directions
  - When flow direction reverses, the same frames serve the other approach

RULE 8.3: TRAFFIC CONTROL OPTIONS
  - Manual traffic controller (accredited person with stop/slow bat)
  - Portaboom (automated boom gate)
  - Temporary traffic signals
  - PTCD (Portable Traffic Control Device) required on high-volume/high-speed roads
  - Manual control NOT permitted on Main Roads network except per Section 4.1.7

===============================================================================
SECTION 9: WORKSITE SPEED DETERMINATION
===============================================================================

RULE 9.1: WORKSITE SPEED BASED ON DISTANCE FROM TRAFFIC LANE
  Distance from lane   | Worksite speed
  ---------------------|---------------
  Greater than 3.0m    | May retain posted speed or 60 km/h
  Between 1.2m and 3.0m| 60 km/h
  Within 1.2m          | 40 km/h

RULE 9.2: MAXIMUM LENGTH OF 40 km/h SPEED ZONE = 500m

RULE 9.3: SPEED FEEDBACK SIGNAGE
  - Mandatory use per Section 4.1.8 of the TMP

===============================================================================
SECTION 10: COMPLETE FRAME TEMPLATES BY SCENARIO
===============================================================================

--- SCENARIO A: 110 km/h posted, 60 km/h worksite, between 1.2m and 3.0m ---
Reference: RF-047

APPROACH:
  F1 | 80              | ROAD WORK AHEAD    | DRIVE SLOWLY     | Triple
  F2 | 60              | ROAD WORKER SYMBOLIC | REDUCE SPEED   | Triple  <-- departure reverse
  F3 | PREPARE TO STOP | BAT MAN SYMBOLIC   | DO NOT OVERTAKE  | Triple
  F4 | STOP HERE WHEN DIRECTED                |                  | Single

DEPARTURE (reverse of F2 only):
  F2 reverse | 110           | END ROAD WORK | DRIVE SAFELY     | Triple

SPACING: F1--300m--F2--D--F3--D(min30m)--F4

--- SCENARIO B: 110 km/h posted, 40 km/h worksite, within 1.2m ---
Reference: RF-046

APPROACH:
  F1 | 80              | ROAD WORK AHEAD    | DRIVE SLOWLY     | Triple
  F2 | 60              | ROAD WORKER SYMBOLIC | REDUCE SPEED   | Triple
  F3 | 40              | SYMBOLIC CONTROL DEVICE | REDUCE SPEED | Triple  <-- departure reverse
  F4 | PREPARE TO STOP | BAT MAN SYMBOLIC   | DO NOT OVERTAKE  | Triple
  F5 | STOP HERE WHEN DIRECTED                |                  | Single

DEPARTURE (reverse of F3 only):
  F3 reverse | 110           | END ROAD WORK | DRIVE SAFELY     | Triple

SPACING: F1--300m--F2--200m--F3--D--F4--D(min30m)--F5

--- SCENARIO C: Lower speed roads (<=60 km/h posted) ---
Reference: RF-001, RF-005

APPROACH:
  F1 | AS POSTED       | ROAD WORK AHEAD    | DRIVE SLOWLY     | Triple
  F2 | PREPARE TO STOP | BAT MAN SYMBOLIC   | DO NOT OVERTAKE  | Triple
  F3 | STOP HERE WHEN DIRECTED                |                  | Single

SPACING: Shorter D values per Table 2.2

===============================================================================
SECTION 11: QUICK REFERENCE — MMS CODES
===============================================================================

CODE         | DESCRIPTION
-------------|-------------------------------------------
MMS-REG-1    | Regulatory speed sign (speed in red circle)
MMS-REG-2    | Regulatory END speed sign
MMS-ADV-3    | Advisory "XX AHEAD" sign
MMS-ADV-10   | Advisory — symbolic control device plate
MMS-ADV-11   | Advisory — road work ahead plate
MMS-ADV-27   | Advisory — do not overtake plate
MMS-ADV-28   | Advisory — reduce speed plate
MMS-ADV-38   | Advisory — drive slowly plate
MMS-ADV-47   | Advisory — symbolic bat man / traffic controller
MMS-ADV-48   | Advisory — symbolic portaboom
MMS-ADV-52A  | Advisory — symbolic control device (alternative)
MMS-ADV-79   | Advisory — symbolic temporary signal
MMS-ADV-82   | Advisory — prepare to stop / stop here when directed
MMS-TER-1    | Termination — end road work
MMS-TER-4    | Termination — end speed zone

===============================================================================
SECTION 12: PICTOGRAPHIC / SYMBOLIC SIGNS
===============================================================================

ROAD WORKER SYMBOLIC:
  - Pictograph of worker with shovel (TW-series)
  - Warns that workers are present in the worksite
  - Appears on the 60 km/h speed frame

BAT MAN SYMBOLIC:
  - Pictograph of traffic controller holding stop/slow bat
  - Indicates manual traffic control ahead
  - Appears on the PREPARE TO STOP frame

SYMBOLIC CONTROL DEVICE:
  - Generic pictograph for traffic control device
  - Represents PTCD, portaboom, or signals
  - Appears on the 40 km/h speed frame

===============================================================================
SECTION 13: COMMON MISTAKES TO AVOID
===============================================================================

MISTAKE 1: Splitting "ROAD WORK AHEAD" into two plates
  CORRECT: One plate saying "ROAD WORK AHEAD"
  WRONG:   Two plates "ROAD WORK" + "AHEAD"

MISTAKE 2: Putting STOP HERE WHEN DIRECTED and DO NOT OVERTAKE on separate frames
  CORRECT: Combine on one frame with PREPARE TO STOP (triple frame)
  WRONG:   STOP HERE WHEN DIRECTED on its own frame + DO NOT OVERTAKE on another

MISTAKE 3: Placing the regulatory 60 sign BEFORE the "60 AHEAD" advisory
  CORRECT: "60 AHEAD" comes first (advisory), then the regulatory 60 sign
  WRONG:   60 regulatory sign, then "60 AHEAD" after it

MISTAKE 4: Adding departure messaging to frames other than the lowest speed
  CORRECT: Only the lowest speed frame gets departure messaging on reverse
  WRONG:   Every frame has reverse-side messaging

MISTAKE 5: Leaving blank plates in a frame
  CORRECT: Match frame size to plate count (single/double/triple)
  WRONG:   Triple frame with only 2 plates and 1 blank slot

MISTAKE 6: Forgetting REDUCE SPEED on the lowest speed frame
  CORRECT: Every speed frame has REDUCE SPEED on plate 3
  WRONG:   Only putting REDUCE SPEED on some speed frames

MISTAKE 7: Spacing two separate frames at the same position
  CORRECT: Combine signs at the same position into one multi-plate frame
  WRONG:   Two separate single-plate frames side by side

===============================================================================
SECTION 14: LOGIC FLOWCHART FOR DETERMINING MMS LAYOUT
===============================================================================

START
  |
  v
[1] What is the posted speed? → Determines D-spacing (Section 6)
  |
  v
[2] How close is the worksite to the traffic lane?
    > 3.0m → worksite speed = 60 km/h
    1.2m–3.0m → worksite speed = 60 km/h
    < 1.2m → worksite speed = 40 km/h
  |
  v
[3] Build speed reduction frames (Section 3)
    Posted → 80 (always first step if posted >= 80)
    Then → 60 (if worksite speed is 60 or 40)
    Then → 40 (if worksite speed is 40)
    Each frame: Speed | Symbolic | REDUCE SPEED
    First frame: 80 | ROAD WORK AHEAD | DRIVE SLOWLY
  |
  v
[4] Add traffic control frames (Section 4)
    PREPARE TO STOP | BAT MAN SYMBOLIC | DO NOT OVERTAKE  (triple)
    STOP HERE WHEN DIRECTED  (single)
  |
  v
[5] Add departure messaging (Section 5)
    Reverse of lowest speed frame: Posted speed | END ROAD WORK | DRIVE SAFELY
  |
  v
[6] Apply spacing rules (Section 6-7)
    >= 100 km/h: 300m between first two frames
    >= 80 km/h: 200m between first two frames
    Remaining: D-spacing per Table 2.2
  |
  v
[7] Apply conditional rules (Section 7)
    >= 100 km/h: Add "XX AHEAD" advisory
    >= 80 km/h: Add REDUCE SPEED plates, End of Queue protection
  |
  v
DONE — Frame layout complete

===============================================================================
END OF DOCUMENT
===============================================================================
