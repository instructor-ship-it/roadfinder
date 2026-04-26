#!/usr/bin/env python3
"""
Process MRWA Banner Alert PDFs:
1. Deduplicate files (remove (1)/(2) suffix copies)
2. Parse filenames for colour, EQ#, date, description
3. Identify linked Red+Grey pairs
4. Extract text from PDFs
5. Build updated index.json
6. Copy files to correct subdirectories
7. Generate summary report
"""

import os
import re
import json
import shutil
import pdfplumber
from pathlib import Path
from datetime import datetime

RAW_DIR = Path("/home/z/my-project/upload/banner_alerts_raw/extracted")
DATA_DIR = Path("/home/z/my-project/data/banner_alerts/pdf")
INDEX_PATH = DATA_DIR / "index.json"

# Ensure subdirectories exist
for sub in ["red", "grey", "amber", "blue", "archive"]:
    (DATA_DIR / sub).mkdir(parents=True, exist_ok=True)


def load_existing_index():
    with open(INDEX_PATH, "r") as f:
        return json.load(f)


def get_existing_eq_numbers(index_data):
    return {doc["alert"]["eqsafe_number"] for doc in index_data["documents"]}


def deduplicate_files(filenames):
    """Remove files with (1), (2) suffixes — keep the original."""
    # Sort so originals come before duplicates
    unique = {}
    duplicates = []
    for fn in filenames:
        # Check for duplicate pattern: filename(1).ext or filename(2).ext
        dedup_pattern = re.compile(r'^(.+)\(\d+\)(\.\w+)$', re.IGNORECASE)
        m = dedup_pattern.match(fn)
        if m:
            original_name = m.group(1).rstrip() + m.group(2)
            # Check if original exists in our list
            duplicates.append(fn)
            # Don't add duplicate to unique
        else:
            unique[fn] = fn
    
    # Also check: if we have duplicates whose originals are NOT in the list,
    # keep one copy (the one without the suffix, or the (1) version)
    for fn in duplicates:
        dedup_pattern = re.compile(r'^(.+)\(\d+\)(\.\w+)$', re.IGNORECASE)
        m = dedup_pattern.match(fn)
        if m:
            original_name = m.group(1).rstrip() + m.group(2)
            if original_name not in unique:
                # Original not in list; keep the first duplicate we find
                # (subsequent duplicates of same original will be dropped)
                if original_name not in [v for v in unique.values()]:
                    unique[fn] = original_name  # map duplicate to original name
    
    return list(unique.keys()), list(unique.values()), duplicates


def parse_filename(filename):
    """Extract banner colour, EQ# number, date, and description from filename."""
    name = filename
    # Remove extension
    name_no_ext = os.path.splitext(name)[0]
    
    # Determine banner colour
    colour = None
    if re.search(r'Red\s+Banner', name_no_ext, re.IGNORECASE):
        colour = "Red"
    elif re.search(r'Grey\s+Banner', name_no_ext, re.IGNORECASE):
        colour = "Grey"
    elif re.search(r'Amber\s+Banner', name_no_ext, re.IGNORECASE):
        colour = "Amber"
    elif re.search(r'Blue\s+Banner', name_no_ext, re.IGNORECASE):
        colour = "Blue"
    
    # Determine notice type
    notice_type = None
    if re.search(r'Preliminary\s+Notice', name_no_ext, re.IGNORECASE):
        notice_type = "Preliminary Notice"
    elif re.search(r'Final\s+Notice', name_no_ext, re.IGNORECASE):
        notice_type = "Final Notice"
    elif colour == "Red":
        notice_type = "Preliminary Notice"
    elif colour == "Grey":
        notice_type = "Final Notice"
    
    # Extract EQ# number (5-digit number)
    eq_match = re.search(r'[-\s](\d{5})\s*[-\s]', name_no_ext)
    if not eq_match:
        eq_match = re.search(r'[-\s](\d{5})', name_no_ext)
    eq_number = int(eq_match.group(1)) if eq_match else None
    
    # Extract date - multiple formats
    date_str = None
    # Format: DD Month YYYY or DD Month YYYY
    date_match = re.search(r'[-\s]\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})', name_no_ext, re.IGNORECASE)
    if date_match:
        day = date_match.group(1).zfill(2)
        month_name = date_match.group(2)
        year = date_match.group(3)
        months = {"january":"01","february":"02","march":"03","april":"04","may":"05","june":"06",
                  "july":"07","august":"08","september":"09","october":"10","november":"11","december":"12"}
        month = months.get(month_name.lower(), "01")
        date_str = f"{year}-{month}-{day}"
    
    # Format: DD MM YYYY (e.g. "09 04 2024")
    if not date_str:
        date_match2 = re.search(r'[-\s~]\s*(\d{2})\s+(\d{2})\s+(\d{4})', name_no_ext)
        if date_match2:
            day = date_match2.group(1)
            month = date_match2.group(2)
            year = date_match2.group(3)
            date_str = f"{year}-{month}-{day}"
    
    # Format: DD-MM-YYYY or YYYY-MM-DD
    if not date_str:
        date_match3 = re.search(r'(\d{4}-\d{2}-\d{2})', name_no_ext)
        if date_match3:
            date_str = date_match3.group(1)
        else:
            date_match4 = re.search(r'(\d{2}-\d{2}-\d{4})', name_no_ext)
            if date_match4:
                parts = date_match4.group(1).split('-')
                date_str = f"{parts[2]}-{parts[1]}-{parts[0]}"
    
    # Extract description - everything after the EQ# number and before the date
    description = ""
    if eq_number:
        # Find text after EQ number
        after_eq = re.sub(r'.*?\d{5}\s*[-\s]*', '', name_no_ext, count=1)
        # Remove the date portion
        after_eq = re.sub(r'\s*[-\s~]?\s*\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}.*$', '', after_eq, flags=re.IGNORECASE)
        after_eq = re.sub(r'\s*[-\s~]?\s*\d{2}\s+\d{2}\s+\d{4}.*$', '', after_eq)
        after_eq = re.sub(r'\s*[-\s~]?\s*\d{4}-\d{2}-\d{2}.*$', '', after_eq)
        after_eq = re.sub(r'\s*[-\s~]?\s*\d{2}-\d{2}-\d{4}.*$', '', after_eq)
        # Clean up
        description = after_eq.strip().strip('-').strip('~').strip().strip('-').strip()
        # Remove leading dash or tilde
        description = re.sub(r'^[-\s~]+', '', description)
    
    # If description is empty, try to get text between "Banner Alert" and the EQ number
    if not description and eq_number:
        between = re.search(r'Banner\s+(?:Alert\s+)?(?:-\s*)?(?:Preliminary\s+Notice\s+)?(?:-\s*)?(.*?)(?:\s*[-\s]\s*\d{5})', name_no_ext, re.IGNORECASE)
        if between:
            description = between.group(1).strip().strip('-').strip()
    
    return {
        "banner_colour": colour,
        "notice_type": notice_type,
        "eqsafe_number": eq_number,
        "date_of_incident": date_str,
        "short_description": description if description else "See PDF for details"
    }


def extract_pdf_text(pdf_path):
    """Extract text from a PDF using pdfplumber."""
    try:
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text.strip() if text.strip() else None
    except Exception as e:
        return f"ERROR_EXTRACTING: {str(e)}"


def parse_extracted_text(text, parsed_info):
    """Parse extracted PDF text for structured fields."""
    result = {
        "contributing_factors": [],
        "corrective_actions": [],
        "key_details": [],
        "work_activity": None,
        "injury_type": None,
        "is_lti": False,
        "is_mti": False,
        "road": None,
        "slk": None,
        "investigation_type": None,
        "investigation_status": None,
        "event_type": None,
        "actual_consequence": None,
        "potential_consequence": None,
        "directorates": None,
        "main_roads_or_contractor": None,
        "time_of_incident": None,
        "distribution_reference": None,
        "distribution_date": None,
        "additional_learnings": [],
    }
    
    if not text or text.startswith("ERROR_EXTRACTING"):
        result["_extraction_note"] = "Image-only PDF or extraction failed"
        return result
    
    lines = text.split('\n')
    current_section = None
    
    # Section headers to look for
    section_keywords = {
        "contributing_factors": ["contributing factor", "causal factor", "root cause"],
        "corrective_actions": ["corrective action", "recommendation", "action taken", "actions taken", "remedial"],
        "key_details": ["key detail", "incident detail", "what happened", "summary of event", "circumstance"],
        "additional_learnings": ["additional learning", "lesson learnt", "lesson learned", "key learning"]
    }
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        
        line_lower = line_stripped.lower()
        
        # Detect section headers
        for section, keywords in section_keywords.items():
            for kw in keywords:
                if kw in line_lower and len(line_stripped) < 100:
                    current_section = section
                    break
        
        # Collect items for current section
        if current_section and line_stripped.startswith(('•', '-', '*', '●', '►', '○')):
            item = line_stripped.lstrip('•-*●►○ ').strip()
            if item and len(item) > 3:
                result[current_section].append(item)
        elif current_section and re.match(r'^\d+[\.\)]', line_stripped):
            item = re.sub(r'^\d+[\.\)]\s*', '', line_stripped).strip()
            if item and len(item) > 3:
                result[current_section].append(item)
        elif current_section and len(result[current_section]) > 0 and not any(kw in line_lower for kw in ['contributing', 'corrective', 'key detail', 'additional', 'lesson']):
            # Continuation of previous item or new unbulleted item
            if len(line_stripped) > 10 and not line_stripped.isupper():
                # Might be a continuation
                pass
        
        # Detect section ends (new header not matching current section)
        if any(kw in line_lower for kw in ['distribution', 'appendix', 'attachment', 'investigation type']):
            current_section = None
    
    # Extract specific fields
    # Work activity
    work_act_match = re.search(r'(?:Work Activity|Activity)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if work_act_match:
        result["work_activity"] = work_act_match.group(1).strip()
    
    # Injury type
    injury_match = re.search(r'(?:Injury Type|Nature of Injury|Injury)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if injury_match:
        result["injury_type"] = injury_match.group(1).strip()
    elif parsed_info.get("short_description"):
        # Try to infer from description
        desc_lower = parsed_info["short_description"].lower()
        if "lti" in desc_lower:
            result["is_lti"] = True
        if "mti" in desc_lower:
            result["is_mti"] = True
    
    # LTI/MTI detection from full text
    text_lower = text.lower()
    if re.search(r'\blti\b', text_lower) or 'lost time injury' in text_lower:
        result["is_lti"] = True
    if re.search(r'\bmti\b', text_lower) or 'modified duties' in text_lower or 'minor injury' in text_lower:
        result["is_mti"] = True
    
    # Road
    road_match = re.search(r'(?:Road|Highway|Location)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if road_match:
        result["road"] = road_match.group(1).strip()
    
    # SLK
    slk_match = re.search(r'SLK\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if slk_match:
        result["slk"] = slk_match.group(1).strip()
    
    # Investigation type
    inv_match = re.search(r'(?:Investigation Type|Type of Investigation)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if inv_match:
        result["investigation_type"] = inv_match.group(1).strip()
    elif 'icam' in text_lower:
        if 'icam lite' in text_lower:
            result["investigation_type"] = "ICAM Lite"
        elif 'icam' in text_lower:
            result["investigation_type"] = "ICAM"
    
    # Investigation status
    status_match = re.search(r'(?:Investigation Status|Status)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if status_match:
        result["investigation_status"] = status_match.group(1).strip()
    
    # Event type
    event_match = re.search(r'(?:Event Type|Type of Event)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if event_match:
        result["event_type"] = event_match.group(1).strip()
    
    # Directorate
    dir_match = re.search(r'(?:Directorate|Region)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if dir_match:
        result["directorates"] = dir_match.group(1).strip()
    
    # Main Roads or Contractor
    mr_match = re.search(r'(?:Main Roads or Contractor|Employer)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if mr_match:
        result["main_roads_or_contractor"] = mr_match.group(1).strip()
    
    # Time
    time_match = re.search(r'(?:Time of Incident|Time)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if time_match:
        result["time_of_incident"] = time_match.group(1).strip()
    
    # Distribution reference
    dist_ref_match = re.search(r'D\d+#\d+', text)
    if dist_ref_match:
        result["distribution_reference"] = dist_ref_match.group(0)
    
    # Date of incident from text (if not already parsed from filename)
    if not parsed_info.get("date_of_incident"):
        date_text_match = re.search(r'(?:Date of Incident|Date)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
        if date_text_match:
            date_val = date_text_match.group(1).strip()
            # Try to parse various formats
            for fmt in ["%d/%m/%Y", "%d %B %Y", "%Y-%m-%d", "%d-%m-%Y"]:
                try:
                    dt = datetime.strptime(date_val, fmt)
                    parsed_info["date_of_incident"] = dt.strftime("%Y-%m-%d")
                    break
                except ValueError:
                    continue
    
    # Actual consequence
    cons_match = re.search(r'(?:Actual Consequence)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if cons_match:
        result["actual_consequence"] = cons_match.group(1).strip()
    
    # Potential consequence
    pot_match = re.search(r'(?:Potential Consequence)\s*[:\-]\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if pot_match:
        result["potential_consequence"] = pot_match.group(1).strip()
    
    return result


def generate_standard_filename(parsed_info):
    """Generate standard filename: YYYY-MM-DD_EQ####_Colour-Type_Description.pdf"""
    date = parsed_info.get("date_of_incident", "UNKNOWN")
    eq = parsed_info.get("eqsafe_number", "00000")
    colour = parsed_info.get("banner_colour", "Unknown")
    notice = parsed_info.get("notice_type", "Unknown")
    desc = parsed_info.get("short_description", "Incident")
    
    # Clean description for filename
    desc_clean = re.sub(r'[^\w\s-]', '', desc)
    desc_clean = re.sub(r'\s+', '-', desc_clean.strip())
    desc_clean = desc_clean[:60]  # Limit length
    desc_clean = desc_clean.rstrip('-')
    
    notice_short = "Preliminary" if "Preliminary" in notice else "Final" if "Final" in notice else notice
    
    return f"{date}_{eq}_{colour}-{notice_short}_{desc_clean}.pdf"


def assess_three_pillars_relevance(alert_data, extracted_text=""):
    """Assess relevance to 3 Pillars + 1 Practice safety framework."""
    pillars = {
        "conditions_changed_mid_job": False,
        "crew_competency_gaps": False,
        "plan_adequacy_failures": False,
        "equipment_issues": False,
        "paperwork_vs_reality_gap": False,
    }
    
    combined = ""
    if alert_data.get("short_description"):
        combined += alert_data["short_description"].lower() + " "
    if extracted_text:
        combined += extracted_text.lower()
    if alert_data.get("work_activity"):
        combined += " " + alert_data["work_activity"].lower()
    
    # Conditions changed mid-job
    conditions_kw = ['changed condition', 'unforeseen', 'unexpected', 'conditions changed', 'weather', 
                     'wet surface', 'rain', 'visibility', 'road condition', 'surface change',
                     'unplanned', 'deviation', 'not anticipated']
    if any(kw in combined for kw in conditions_kw):
        pillars["conditions_changed_mid_job"] = True
    
    # Crew competency gaps
    competency_kw = ['competency', 'qualified', 'training', 'certification', 'unlicensed', 'learner',
                     'inexperienced', 'induction', 'supervision', 'competent person', 'not trained',
                     'fatigue', 'excessive hours', 'unaware', 'lack of knowledge']
    if any(kw in combined for kw in competency_kw):
        pillars["crew_competency_gaps"] = True
    
    # Plan adequacy failures
    plan_kw = ['procedure breach', 'swms', 'risk assessment', 'work method', 'traffic management',
               'traffic guidance', 'management plan', 'procedure not followed', ' inadequate plan',
               'plan inadequate', 'within 1.2m', '1.2m of live', 'breach of procedure', 'incorrect scheme',
               'not in accordance', 'non-compliance', 'failed to follow', 'no procedure']
    if any(kw in combined for kw in plan_kw):
        pillars["plan_adequacy_failures"] = True
    
    # Equipment issues
    equip_kw = ['equipment failure', 'chain snapped', 'mechanical failure', 'equipment defect',
                'malfunction', 'spring dislodge', 'overhead power', 'power line', 'blade',
                'saw', 'plant', 'vehicle defect', 'rollover', 'tire', 'tyre']
    if any(kw in combined for kw in equip_kw):
        pillars["equipment_issues"] = True
    
    # Paperwork vs reality gap (had paperwork but still had incident)
    paperwork_kw = ['swms did not', 'swms not', 'procedure in place', 'paperwork', 'documentation',
                    'risk register did not', 'work instruction not updated', 'prestart form',
                    'compliant but', 'had procedure', 'inspection completed', 'signage present',
                    'induction completed', 'toolbox', 'supervisor']
    if any(kw in combined for kw in paperwork_kw):
        pillars["paperwork_vs_reality_gap"] = True
    
    # Overall relevance score
    score = sum(1 for v in pillars.values() if v)
    
    return pillars, score


def main():
    print("=" * 80)
    print("MRWA BANNER ALERT PDF PROCESSOR")
    print("=" * 80)
    
    # Step 1: Load existing index
    index_data = load_existing_index()
    existing_eq_numbers = get_existing_eq_numbers(index_data)
    print(f"\nExisting entries in index: {len(index_data['documents'])}")
    print(f"Existing EQ# numbers: {sorted(existing_eq_numbers)}")
    
    # Step 2: List all raw PDF files
    all_files = sorted(os.listdir(RAW_DIR))
    pdf_files = [f for f in all_files if f.lower().endswith(('.pdf', '.PDF'))]
    print(f"\nTotal PDF files found: {len(pdf_files)}")
    
    # Step 3: Deduplicate
    unique_files, original_names, duplicates = deduplicate_files(pdf_files)
    print(f"Unique files (after dedup): {len(unique_files)}")
    print(f"Duplicate files removed: {len(pdf_files) - len(unique_files)}")
    
    # Show duplicates
    dup_set = set(pdf_files) - set(unique_files)
    if dup_set:
        print("\nRemoved duplicates:")
        for d in sorted(dup_set):
            print(f"  - {d}")
    
    # Step 4: Parse all unique filenames
    parsed_alerts = []
    for i, fn in enumerate(unique_files):
        parsed = parse_filename(fn)
        parsed["original_filename"] = fn
        parsed["filepath"] = str(RAW_DIR / fn)
        parsed_alerts.append(parsed)
        if not parsed["eqsafe_number"]:
            print(f"  WARNING: Could not extract EQ# from: {fn}")
    
    # Step 5: Identify linked Red+Grey pairs
    eq_colours = {}  # eq_number -> {Red: [...], Grey: [...], ...}
    for pa in parsed_alerts:
        eq = pa["eqsafe_number"]
        if eq not in eq_colours:
            eq_colours[eq] = {}
        colour = pa["banner_colour"]
        if colour not in eq_colours[eq]:
            eq_colours[eq][colour] = []
        eq_colours[eq][colour].append(pa)
    
    linked_pairs = []
    for eq, colours in eq_colours.items():
        if "Red" in colours and "Grey" in colours:
            linked_pairs.append({
                "eqsafe_number": eq,
                "red": colours["Red"],
                "grey": colours["Grey"]
            })
    
    print(f"\nLinked Red+Grey pairs found: {len(linked_pairs)}")
    for pair in linked_pairs:
        print(f"  EQ#{pair['eqsafe_number']}: Red + Grey")
    
    # Step 6: Extract text from PDFs
    print("\nExtracting text from PDFs...")
    extraction_results = {}
    
    for i, pa in enumerate(parsed_alerts):
        filepath = pa["filepath"]
        eq = pa["eqsafe_number"]
        colour = pa["banner_colour"]
        print(f"  [{i+1}/{len(parsed_alerts)}] EQ#{eq} ({colour})...", end=" ")
        
        text = extract_pdf_text(filepath)
        extraction_results[eq] = {
            "colour": colour,
            "text": text,
            "original_filename": pa["original_filename"]
        }
        
        if text and not text.startswith("ERROR"):
            print(f"OK ({len(text)} chars)")
        else:
            print("NO TEXT (image-only or error)")
    
    # Step 7: Build new index entries
    print("\nBuilding index entries...")
    new_entries = []
    
    for pa in parsed_alerts:
        eq = pa["eqsafe_number"]
        colour = pa["banner_colour"]
        
        # Skip if already in index
        if eq in existing_eq_numbers and colour == "Grey":
            # Check if there's already an entry for this EQ
            existing_entry = next((d for d in index_data["documents"] if d["alert"]["eqsafe_number"] == eq), None)
            if existing_entry:
                print(f"  Skipping EQ#{eq} — already in index")
                continue
        
        if eq in existing_eq_numbers:
            existing_entry = next((d for d in index_data["documents"] if d["alert"]["eqsafe_number"] == eq), None)
            if existing_entry:
                print(f"  Skipping EQ#{eq} — already in index")
                continue
        
        # Parse extracted text
        ext = extraction_results.get(eq, {})
        text = ext.get("text", None)
        text_parsed = parse_extracted_text(text, pa)
        
        # Determine status
        has_linked_pair = any(p["eqsafe_number"] == eq for p in linked_pairs)
        if colour == "Grey":
            status = "closed"
        elif colour == "Red" and has_linked_pair:
            status = "closed"
        elif colour == "Amber":
            status = "active"
        else:
            status = "active"
        
        # Determine folder
        folder = colour.lower() if colour else "red"
        
        # Generate standard filename
        std_filename = generate_standard_filename(pa)
        
        # Build linked references
        linked_grey = None
        linked_red = None
        if colour == "Red" and has_linked_pair:
            pair = next(p for p in linked_pairs if p["eqsafe_number"] == eq)
            grey_parsed = pair["grey"][0]
            grey_std = generate_standard_filename(grey_parsed)
            linked_grey = grey_std
        elif colour == "Grey" and has_linked_pair:
            pair = next(p for p in linked_pairs if p["eqsafe_number"] == eq)
            red_parsed = pair["red"][0]
            red_std = generate_standard_filename(red_parsed)
            linked_red = red_std
        
        # Build alert object
        alert_obj = {
            "banner_colour": colour,
            "notice_type": pa["notice_type"],
            "eqsafe_number": eq,
            "date_of_incident": pa["date_of_incident"],
            "time_of_incident": text_parsed.get("time_of_incident"),
            "directorates": text_parsed.get("directorates"),
            "main_roads_or_contractor": text_parsed.get("main_roads_or_contractor"),
            "event_type": text_parsed.get("event_type"),
            "actual_consequence": text_parsed.get("actual_consequence"),
            "potential_consequence": text_parsed.get("potential_consequence"),
            "short_description": pa["short_description"],
            "road": text_parsed.get("road"),
            "slk": text_parsed.get("slk"),
            "work_activity": text_parsed.get("work_activity"),
            "injury_type": text_parsed.get("injury_type"),
            "is_lti": text_parsed.get("is_lti", False),
            "investigation_type": text_parsed.get("investigation_type"),
            "investigation_status": text_parsed.get("investigation_status"),
        }
        
        # Add optional fields only if they have values
        if text_parsed.get("contributing_factors"):
            alert_obj["contributing_factors"] = text_parsed["contributing_factors"]
        if text_parsed.get("corrective_actions"):
            alert_obj["corrective_actions"] = text_parsed["corrective_actions"]
        if text_parsed.get("key_details"):
            alert_obj["key_details"] = text_parsed["key_details"]
        if text_parsed.get("additional_learnings"):
            alert_obj["additional_learnings"] = text_parsed["additional_learnings"]
        if text_parsed.get("distribution_reference"):
            alert_obj["distribution_reference"] = text_parsed["distribution_reference"]
        if text_parsed.get("distribution_date"):
            alert_obj["distribution_date"] = text_parsed["distribution_date"]
        if text_parsed.get("_extraction_note"):
            alert_obj["_extraction_note"] = text_parsed["_extraction_note"]
        
        entry = {
            "filename": std_filename,
            "folder": folder,
            "original_filename": pa["original_filename"],
            "upload_date": datetime.now().strftime("%Y-%m-%d"),
            "alert": alert_obj,
            "linked_grey_banner": linked_grey,
            "linked_red_banner": linked_red,
            "status": status
        }
        
        new_entries.append(entry)
        print(f"  Added EQ#{eq} ({colour}) -> {std_filename}")
    
    # Update existing entries that now have linked pairs
    for pair in linked_pairs:
        eq = pair["eqsafe_number"]
        existing_entry = next((d for d in index_data["documents"] if d["alert"]["eqsafe_number"] == eq), None)
        if existing_entry:
            if existing_entry["alert"]["banner_colour"] == "Red" and not existing_entry.get("linked_grey_banner"):
                grey_parsed = pair["grey"][0]
                grey_std = generate_standard_filename(grey_parsed)
                existing_entry["linked_grey_banner"] = grey_std
                existing_entry["status"] = "closed"
                print(f"  Updated existing EQ#{eq} Red entry — linked to Grey, status -> closed")
    
    # Merge new entries into index
    all_entries = index_data["documents"] + new_entries
    
    # Sort by date
    all_entries.sort(key=lambda x: x["alert"].get("date_of_incident") or "0000-00-00")
    
    # Write updated index
    index_data["documents"] = all_entries
    index_data["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    
    with open(INDEX_PATH, "w") as f:
        json.dump(index_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nIndex updated: {len(all_entries)} total entries")
    
    # Step 8: Copy files to correct subdirectories
    print("\nCopying files to subdirectories...")
    copied_count = 0
    
    for entry in all_entries:
        std_filename = entry["filename"]
        folder = entry["folder"]
        original = entry.get("original_filename", "")
        
        dest_dir = DATA_DIR / folder
        dest_path = dest_dir / std_filename
        
        # Check if already copied
        if dest_path.exists():
            continue
        
        # Find source file
        source = None
        # First check if original file exists in raw dir
        raw_path = RAW_DIR / original
        if raw_path.exists():
            source = raw_path
        else:
            # Try finding by EQ number
            for fn in os.listdir(RAW_DIR):
                if str(entry["alert"]["eqsafe_number"]) in fn:
                    # Check it's the right colour
                    colour = entry["alert"]["banner_colour"]
                    if colour.lower() in fn.lower():
                        source = RAW_DIR / fn
                        break
        
        if source and source.exists():
            shutil.copy2(source, dest_path)
            copied_count += 1
            print(f"  Copied: {std_filename} -> {folder}/")
        else:
            print(f"  WARNING: Source not found for {std_filename} (original: {original})")
    
    print(f"\nTotal files copied: {copied_count}")
    
    # Step 9: Generate summary report
    print("\n" + "=" * 80)
    print("SUMMARY REPORT")
    print("=" * 80)
    
    total_unique = len(all_entries)
    new_count = len(new_entries)
    existing_count = total_unique - new_count
    
    red_count = sum(1 for e in all_entries if e["alert"]["banner_colour"] == "Red")
    grey_count = sum(1 for e in all_entries if e["alert"]["banner_colour"] == "Grey")
    amber_count = sum(1 for e in all_entries if e["alert"]["banner_colour"] == "Amber")
    
    active_count = sum(1 for e in all_entries if e["status"] == "active")
    closed_count = sum(1 for e in all_entries if e["status"] == "closed")
    
    lti_count = sum(1 for e in all_entries if e["alert"].get("is_lti"))
    mti_count = sum(1 for e in all_entries if e["alert"].get("is_mti"))
    
    # Text extraction stats
    extracted_ok = sum(1 for eq, data in extraction_results.items() 
                       if data["text"] and not data["text"].startswith("ERROR") and len(data["text"]) > 50)
    image_only = sum(1 for eq, data in extraction_results.items() 
                     if not data["text"] or data["text"].startswith("ERROR") or len(data.get("text","")) <= 50)
    
    print(f"\nTotal unique alerts processed: {total_unique}")
    print(f"  - Previously existing: {existing_count}")
    print(f"  - Newly added: {new_count}")
    print(f"\nBy Banner Colour:")
    print(f"  - Red (Preliminary): {red_count}")
    print(f"  - Grey (Final): {grey_count}")
    print(f"  - Amber: {amber_count}")
    print(f"\nBy Status:")
    print(f"  - Active: {active_count}")
    print(f"  - Closed: {closed_count}")
    print(f"\nInjury Classification:")
    print(f"  - LTI (Lost Time Injury): {lti_count}")
    print(f"  - MTI (Modified/Minor): {mti_count}")
    print(f"\nLinked Red+Grey Pairs: {len(linked_pairs)}")
    for pair in linked_pairs:
        print(f"  - EQ#{pair['eqsafe_number']}")
    
    print(f"\nPDF Text Extraction:")
    print(f"  - Successfully extracted: {extracted_ok}")
    print(f"  - Image-only / Failed: {image_only}")
    
    # Categorised list
    print("\n" + "-" * 40)
    print("ALERTS BY CATEGORY")
    print("-" * 40)
    
    categories = {
        "Traffic Management Breaches": [],
        "Vehicle Incidents / Rollovers": [],
        "Injury - Musculoskeletal / Strain": [],
        "Injury - Crush / Strike": [],
        "Injury - Slip / Trip / Fall": [],
        "Journey Management": [],
        "Equipment / Plant Issues": [],
        "Procedure Breach / Compliance": [],
        "Public Interaction": [],
        "Near Miss": [],
        "Other": []
    }
    
    for entry in all_entries:
        desc = (entry["alert"].get("short_description") or "").lower()
        eq = entry["alert"]["eqsafe_number"]
        colour = entry["alert"]["banner_colour"]
        label = f"EQ#{eq} ({colour}) - {entry['alert'].get('short_description', 'N/A')[:80]}"
        
        if '1.2m' in desc or 'traffic management' in desc or 'traffic guidance' in desc or 'traffic controller' in desc or 'traffic breach' in desc:
            categories["Traffic Management Breaches"].append(label)
        elif 'rollover' in desc or 'vehicle' in desc or 'drove' in desc or 'truck' in desc or 'car off road' in desc or 'lost control' in desc:
            categories["Vehicle Incidents / Rollovers"].append(label)
        elif 'strain' in desc or 'back' in desc or 'muscle' in desc or 'shoulder' in desc or 'knee' in desc:
            categories["Injury - Musculoskeletal / Strain"].append(label)
        elif 'crush' in desc or 'struck' in desc or 'hit' in desc or 'falls from' in desc or 'falling' in desc or 'strikes' in desc:
            categories["Injury - Crush / Strike"].append(label)
        elif 'slip' in desc or 'trip' in desc or 'rolled ankle' in desc or 'fell' in desc or 'windrow' in desc:
            categories["Injury - Slip / Trip / Fall"].append(label)
        elif 'journey' in desc or 'en route' in desc or 'travelling from' in desc or 'travelling to' in desc or 'camp' in desc or 'accommodation' in desc:
            categories["Journey Management"].append(label)
        elif 'equipment' in desc or 'plant' in desc or 'chain' in desc or 'power line' in desc or 'leaf spring' in desc:
            categories["Equipment / Plant Issues"].append(label)
        elif 'procedure' in desc or 'breach' in desc or 'unlicensed' in desc or 'bac' in desc or 'hours' in desc or 'signage' in desc:
            categories["Procedure Breach / Compliance"].append(label)
        elif 'mop' in desc or 'member of public' in desc or 'livestock' in desc or 'public' in desc:
            categories["Public Interaction"].append(label)
        elif 'near miss' in desc:
            categories["Near Miss"].append(label)
        else:
            categories["Other"].append(label)
    
    for cat, items in categories.items():
        if items:
            print(f"\n{cat} ({len(items)}):")
            for item in items:
                print(f"  • {item}")
    
    # 3 Pillars + 1 Practice Assessment
    print("\n" + "=" * 80)
    print("3 PILLARS + 1 PRACTICE RELEVANCE ASSESSMENT")
    print("=" * 80)
    
    pillar_results = []
    for entry in all_entries:
        eq = entry["alert"]["eqsafe_number"]
        ext = extraction_results.get(eq, {})
        text = ext.get("text", "")
        pillars, score = assess_three_pillars_relevance(entry["alert"], text)
        if score > 0:
            pillar_results.append({
                "eq": eq,
                "colour": entry["alert"]["banner_colour"],
                "desc": entry["alert"].get("short_description", ""),
                "pillars": pillars,
                "score": score
            })
    
    # Sort by relevance score
    pillar_results.sort(key=lambda x: x["score"], reverse=True)
    
    print(f"\nAlerts with 3 Pillars + 1 Practice relevance: {len(pillar_results)}")
    print(f"\nHIGH RELEVANCE (score 3+):")
    for pr in pillar_results:
        if pr["score"] >= 3:
            active_pillars = [k.replace("_", " ").title() for k, v in pr["pillars"].items() if v]
            print(f"  ★ EQ#{pr['eq']} ({pr['colour']}) - {pr['desc'][:70]}")
            print(f"    Pillars: {', '.join(active_pillars)}")
    
    print(f"\nMODERATE RELEVANCE (score 2):")
    for pr in pillar_results:
        if pr["score"] == 2:
            active_pillars = [k.replace("_", " ").title() for k, v in pr["pillars"].items() if v]
            print(f"  • EQ#{pr['eq']} ({pr['colour']}) - {pr['desc'][:70]}")
            print(f"    Pillars: {', '.join(active_pillars)}")
    
    print(f"\nSOME RELEVANCE (score 1):")
    for pr in pillar_results:
        if pr["score"] == 1:
            active_pillars = [k.replace("_", " ").title() for k, v in pr["pillars"].items() if v]
            print(f"  ○ EQ#{pr['eq']} ({pr['colour']}) - {pr['desc'][:70]}")
            print(f"    Pillars: {', '.join(active_pillars)}")
    
    # Paperwork vs Reality Gap - specifically highlight
    print(f"\n{'=' * 80}")
    print("PAPERWORK vs REALITY GAP — KEY FINDINGS")
    print("=" * 80)
    print("These incidents demonstrate the gap between having documentation in order")
    print("and still experiencing a safety incident:\n")
    
    paperwork_alerts = [pr for pr in pillar_results if pr["pillars"]["paperwork_vs_reality_gap"]]
    for pr in paperwork_alerts:
        eq = pr["eq"]
        ext = extraction_results.get(eq, {})
        text = ext.get("text", "")
        # Find specific evidence
        evidence = []
        for kw in ['swms did not', 'swms not', 'procedure in place', 'risk register did not',
                    'work instruction not updated', 'prestart form', 'compliant but',
                    'had procedure', 'inspection completed', 'induction completed']:
            if kw in (text.lower() if text else ""):
                # Find the line
                for line in (text or "").split('\n'):
                    if kw in line.lower() and len(line.strip()) > 10:
                        evidence.append(line.strip()[:120])
                        break
        
        print(f"EQ#{pr['eq']} ({pr['colour']}): {pr['desc'][:80]}")
        if evidence:
            for e in evidence[:3]:
                print(f"  Evidence: {e}")
        print()
    
    # Save summary to file
    summary_path = DATA_DIR / "processing_summary.json"
    summary = {
        "processing_date": datetime.now().isoformat(),
        "total_unique_alerts": total_unique,
        "previously_existing": existing_count,
        "newly_added": new_count,
        "duplicates_removed": len(pdf_files) - len(unique_files),
        "by_colour": {"red": red_count, "grey": grey_count, "amber": amber_count},
        "by_status": {"active": active_count, "closed": closed_count},
        "lti_count": lti_count,
        "mti_count": mti_count,
        "linked_pairs": [{"eqsafe_number": p["eqsafe_number"]} for p in linked_pairs],
        "text_extraction": {"successful": extracted_ok, "image_only_failed": image_only},
        "three_pillars_high_relevance": [
            {"eq": pr["eq"], "colour": pr["colour"], "desc": pr["desc"], 
             "pillars": pr["pillars"], "score": pr["score"]}
            for pr in pillar_results if pr["score"] >= 3
        ],
        "paperwork_gap_alerts": [
            {"eq": pr["eq"], "colour": pr["colour"], "desc": pr["desc"], "score": pr["score"]}
            for pr in paperwork_alerts
        ]
    }
    
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\nProcessing summary saved to: {summary_path}")
    print(f"Updated index saved to: {INDEX_PATH}")
    print("\nDONE.")


if __name__ == "__main__":
    main()
