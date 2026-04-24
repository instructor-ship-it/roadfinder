#!/usr/bin/env python3
"""
MRWA Banner Alert PDF Processor
================================
Processes Red/Amber/Grey Banner Alert PDFs and adds them to the library.

Usage:
    python3 process_banner_alerts.py /path/to/banner_alert.pdf [/path/to/another.pdf ...]

This script:
1. Extracts text from each PDF
2. Parses all standard banner alert fields
3. Renames the file following the naming convention
4. Places it in the correct colour folder (red/, amber/, grey/)
5. Updates index.json with full metadata
6. Outputs git commands to commit and push

File naming convention:
    YYYY-MM-DD_[EQSafe]_[Colour-Type]_[Brief-Description].pdf

Folder structure:
    data/banner_alerts/pdf/
    ├── red/        # Red Banner — serious/LTI/high-potential near miss (preliminary)
    ├── amber/      # Amber Banner — significant incident/near miss (preliminary)
    ├── grey/       # Grey Banner — final report with lessons learnt
    └── archive/    # Closed/resolved pairs
"""

import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# --- Configuration ---
REPO_ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = REPO_ROOT / "data" / "banner_alerts" / "pdf"
INDEX_FILE = PDF_DIR / "index.json"
GITHUB_REMOTE = "https://${GITHUB_TOKEN}@github.com/instructor-ship-it/roadfinder.git"
BRANCH = "main"

# --- Field Parsers ---

def extract_pdf_text(pdf_path):
    """Extract text from PDF using pdftotext."""
    try:
        result = subprocess.run(
            ["pdftotext", str(pdf_path), "-"],
            capture_output=True, text=True, timeout=30
        )
        return result.stdout
    except Exception as e:
        print(f"  ERROR: Could not extract text from {pdf_path}: {e}")
        return ""


def detect_banner_colour(text, filename):
    """Detect Red/Amber/Grey banner from text or filename."""
    fn_lower = filename.lower()
    text_lower = text.lower()
    
    if "red banner" in fn_lower or "red banner" in text_lower:
        return "red"
    elif "amber banner" in fn_lower or "amber banner" in text_lower:
        return "amber"
    elif "grey banner" in fn_lower or "gray banner" in fn_lower or "grey banner" in text_lower:
        return "grey"
    
    # Fallback: check for consequence levels that indicate severity
    if "potential consequence" in text_lower and "major" in text_lower:
        return "red"
    elif "potential consequence" in text_lower and "moderate" in text_lower:
        return "amber"
    
    return "red"  # default to red for safety


def detect_notice_type(text, filename):
    """Detect Preliminary Notice vs Final Notice."""
    fn_lower = filename.lower()
    if "preliminary" in fn_lower or "preliminary notice" in text.lower():
        return "Preliminary Notice"
    elif "final" in fn_lower or "final notice" in text.lower():
        return "Final Notice"
    return "Unknown"


def parse_field(text, field_name, fallback=None):
    """Extract a field value from the text by field name."""
    # Try multiple patterns
    patterns = [
        rf"{re.escape(field_name)}\s*\n\s*(.+?)(?:\n\n|\n[A-Z])",
        rf"{re.escape(field_name)}\s+(.+?)(?:\n\n|\n[A-Z])",
        rf"{re.escape(field_name)}\s*\n\s*(.+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            # Clean up multi-line values
            value = re.sub(r'\s+', ' ', value)
            if value:
                return value
    return fallback


def parse_date(date_str):
    """Parse various date formats to YYYY-MM-DD."""
    if not date_str:
        return None
    
    date_str = date_str.strip()
    
    # Try various formats
    formats = [
        "%d/%m/%Y",        # 04/03/2026
        "%dth %B %Y",      # 15th April 2026
        "%dst %B %Y",      # 1st April 2026
        "%dnd %B %Y",      # 2nd April 2026
        "%drd %B %Y",      # 3rd April 2026
        "%d %B %Y",        # 15 April 2026
        "%Y-%m-%d",        # 2026-04-15
    ]
    
    # Remove ordinal suffixes
    date_str_clean = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', date_str)
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str_clean, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    return date_str  # Return as-is if can't parse


def parse_incident_number(text, filename):
    """Extract EQSafe Incident Number."""
    # From filename
    fn_match = re.search(r'(\d{4,6})', filename)
    fn_num = fn_match.group(1) if fn_match else None
    
    # From text
    text_match = re.search(r'EQSafe Incident Number\s*\n?\s*(\d+)', text, re.IGNORECASE)
    text_num = int(text_match.group(1)) if text_match else None
    
    return text_num or (int(fn_num) if fn_num else None)


def parse_consequence(text, level):
    """Parse actual/potential consequence."""
    pattern = rf"{level} Consequence\s*\n?\s*(Low|Moderate|Major|High|Extreme)"
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        val = match.group(1).strip().capitalize()
        # Normalise
        if val == "High":
            val = "Major"
        return val
    return None


def parse_what_happened(text):
    """Extract the 'What Happened' narrative."""
    patterns = [
        r"What Happened\s*\n\s*(.+?)(?:\n\n[A-Z]|\n(?:Incident Photos|Contributing Factors|Distribution|Images|Photo))",
        r"What Happened\s*\n\s*(.+?)(?:\n\n)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            narrative = match.group(1).strip()
            # Clean up
            narrative = re.sub(r'\n', ' ', narrative)
            narrative = re.sub(r'\s+', ' ', narrative)
            return narrative
    return None


def parse_contributing_factors(text):
    """Extract contributing factors as a list."""
    # Find the contributing factors section
    match = re.search(
        r"Contributing Factors\s*\n(.+?)(?:\n\n(?:Corrective|Distribution|Additional|New longer))",
        text, re.DOTALL | re.IGNORECASE
    )
    if not match:
        return None
    
    section = match.group(1)
    # Split by bullet points
    factors = []
    for line in section.split('\n'):
        line = line.strip().lstrip('•').lstrip('*').lstrip('-').strip()
        if line and len(line) > 5:
            factors.append(line)
    
    return factors if factors else None


def parse_corrective_actions(text):
    """Extract corrective actions as a list."""
    match = re.search(
        r"Corrective Actions[^[]*?\s*\n(.+?)(?:\n\n(?:Distribution|Additional|New longer|Image))",
        text, re.DOTALL | re.IGNORECASE
    )
    if not match:
        return None
    
    section = match.group(1)
    actions = []
    for line in section.split('\n'):
        line = line.strip().lstrip('•').lstrip('*').lstrip('-').strip()
        if line and len(line) > 5:
            actions.append(line)
    
    return actions if actions else None


def detect_critical_risk(text):
    """Detect if incident aligns with a Critical Risk profile."""
    match = re.search(
        r"Critical Risk profile relating to\s*\n?\s*(.+?)(?:\n|$)",
        text, re.IGNORECASE
    )
    if match:
        return match.group(1).strip()
    return None


def detect_worksafe_notified(text):
    """Check if WorkSafe was notified."""
    return bool(re.search(r"WorkSafe.*notified", text, re.IGNORECASE))


def detect_lti(text, description):
    """Detect if the incident resulted in a Lost Time Injury."""
    combined = (text + " " + (description or "")).lower()
    return (
        "lost time injury" in combined or 
        "resulting in a lti" in combined or 
        "resulting in an lti" in combined or
        "unfit for work" in combined or
        "unfit.*lta" in combined
    )


def generate_short_filename(alert):
    """Generate the standardised filename."""
    date = alert.get("date_of_incident", "UNKNOWN-DATE")
    eqsafe = alert.get("eqsafe_number", "UNKNOWN")
    colour = alert.get("banner_colour", "UNKNOWN").capitalize()
    notice = alert.get("notice_type", "Unknown").replace(" ", "-")
    
    # Create brief description from short_description
    desc = alert.get("short_description", "incident")
    desc = desc.lower()
    # Truncate and clean
    desc = re.sub(r'[^a-z0-9\s-]', '', desc)
    desc = re.sub(r'\s+', '-', desc)
    desc = desc[:60]  # Limit length
    desc = desc.strip('-')
    
    return f"{date}_{eqsafe}_{colour}-{notice}_{desc}.pdf"


# --- Main Processing ---

def process_pdf(pdf_path):
    """Process a single banner alert PDF."""
    pdf_path = Path(pdf_path)
    filename = pdf_path.name
    
    print(f"\n{'='*60}")
    print(f"Processing: {filename}")
    print(f"{'='*60}")
    
    # Extract text
    text = extract_pdf_text(pdf_path)
    if not text:
        print("  ERROR: Could not extract text. Skipping.")
        return None
    
    # Parse all fields
    banner_colour = detect_banner_colour(text, filename)
    notice_type = detect_notice_type(text, filename)
    eqsafe_number = parse_incident_number(text, filename)
    date_of_incident = parse_date(parse_field(text, "Date of Incident"))
    time_of_incident = parse_field(text, "Time of Incident")
    directorates = parse_field(text, "Directorate / Region") or parse_field(text, "Directorate")
    main_roads_or_contractor = parse_field(text, "Main Roads or Contractor") or parse_field(text, "Main Roads or\nContractor")
    event_type = parse_field(text, "EQSafe Event Type")
    actual_consequence = parse_consequence(text, "Actual")
    potential_consequence = parse_consequence(text, "Potential")
    short_description = parse_field(text, "Incident Short Description") or parse_field(text, "Incident Short\nDescription")
    what_happened = parse_what_happened(text)
    contributing_factors = parse_contributing_factors(text)
    corrective_actions = parse_corrective_actions(text)
    critical_risk = detect_critical_risk(text)
    worksafe_notified = detect_worksafe_notified(text)
    is_lti = detect_lti(text, short_description)
    
    # Distribution reference
    dist_match = re.search(r'(D\d+#\d+)\s*[–-]\s*(.+?)(?:\n|Page)', text)
    distribution_reference = dist_match.group(1) if dist_match else None
    distribution_date_str = dist_match.group(2).strip() if dist_match else None
    distribution_date = parse_date(distribution_date_str) if distribution_date_str else None
    
    # Build alert object
    alert = {
        "banner_colour": banner_colour.capitalize(),
        "notice_type": notice_type,
        "eqsafe_number": eqsafe_number,
        "date_of_incident": date_of_incident,
        "time_of_incident": time_of_incident,
        "directorates": directorates,
        "main_roads_or_contractor": main_roads_or_contractor,
        "event_type": event_type,
        "actual_consequence": actual_consequence,
        "potential_consequence": potential_consequence,
        "short_description": short_description,
        "road": None,
        "slk": None,
        "work_activity": None,
        "injury_type": None,
        "is_lti": is_lti,
        "investigation_type": "ICAM" if "ICAM" in text else None,
        "investigation_status": "Commenced" if "ICAM investigation has commenced" in text else ("Completed" if notice_type == "Final Notice" else None),
    }
    
    # Add Grey-banner specific fields
    if contributing_factors:
        alert["contributing_factors"] = contributing_factors
    if corrective_actions:
        alert["corrective_actions"] = corrective_actions
    if critical_risk:
        alert["critical_risk_profile"] = critical_risk
    if worksafe_notified:
        alert["worksafe_notified"] = True
    
    # Distribution
    if distribution_reference:
        alert["distribution_reference"] = distribution_reference
    if distribution_date:
        alert["distribution_date"] = distribution_date
    
    # Generate filename and folder
    new_filename = generate_short_filename(alert)
    folder = banner_colour  # red, amber, or grey
    
    # Build document entry
    doc_entry = {
        "filename": new_filename,
        "folder": folder,
        "original_filename": filename,
        "upload_date": datetime.now().strftime("%Y-%m-%d"),
        "alert": alert,
        "linked_grey_banner": None,
        "linked_red_banner": None,
        "status": "active" if notice_type == "Preliminary Notice" else "closed"
    }
    
    # Print summary
    print(f"  Banner:        {banner_colour.upper()} — {notice_type}")
    print(f"  EQSafe:        {eqsafe_number}")
    print(f"  Date:          {date_of_incident} at {time_of_incident}")
    print(f"  Region:        {directorates}")
    print(f"  Who:           {main_roads_or_contractor}")
    print(f"  Event:         {event_type}")
    print(f"  Consequence:   {actual_consequence} → {potential_consequence}")
    print(f"  LTI:           {is_lti}")
    print(f"  Description:   {short_description}")
    if critical_risk:
        print(f"  Critical Risk: {critical_risk}")
    if worksafe_notified:
        print(f"  WorkSafe:      NOTIFIED")
    print(f"  New filename:  {new_filename}")
    print(f"  Folder:        {folder}/")
    
    return {
        "source_path": pdf_path,
        "new_filename": new_filename,
        "folder": folder,
        "doc_entry": doc_entry
    }


def update_index(entries):
    """Update index.json with new document entries."""
    # Load existing index
    if INDEX_FILE.exists():
        with open(INDEX_FILE, "r") as f:
            index = json.load(f)
    else:
        index = {
            "version": "2.0.0",
            "description": "MRWA Banner Alert PDF Library — Workplace Safety Incident Alerts",
            "documents": []
        }
    
    # Check for duplicates by EQSafe number
    existing_eqsafe = set()
    for doc in index.get("documents", []):
        num = doc.get("alert", {}).get("eqsafe_number")
        colour = doc.get("alert", {}).get("banner_colour", "").lower()
        if num:
            existing_eqsafe.add((num, colour))
    
    added = 0
    skipped = 0
    for entry in entries:
        eqsafe = entry["doc_entry"]["alert"]["eqsafe_number"]
        colour = entry["doc_entry"]["alert"]["banner_colour"].lower()
        key = (eqsafe, colour)
        
        if key in existing_eqsafe:
            print(f"\n  SKIP: EQSafe {eqsafe} ({colour} banner) already exists in index")
            skipped += 1
        else:
            index["documents"].append(entry["doc_entry"])
            existing_eqsafe.add(key)
            added += 1
    
    index["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2, default=str)
    
    print(f"\n  Index updated: {added} added, {skipped} skipped, {len(index['documents'])} total documents")
    return added


def copy_and_rename(entries):
    """Copy PDFs to the correct folders with new names."""
    for entry in entries:
        dest_dir = PDF_DIR / entry["folder"]
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / entry["new_filename"]
        
        shutil.copy2(str(entry["source_path"]), str(dest_path))
        print(f"  Copied: {entry['new_filename']} → {entry['folder']}/")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nERROR: No PDF files specified.")
        print("Usage: python3 process_banner_alerts.py /path/to/alert1.pdf [/path/to/alert2.pdf ...]")
        sys.exit(1)
    
    pdf_files = sys.argv[1:]
    
    print("MRWA Banner Alert PDF Processor")
    print("=" * 60)
    print(f"Processing {len(pdf_files)} PDF(s)")
    print(f"Target: {PDF_DIR}")
    
    # Process each PDF
    results = []
    for pdf_path in pdf_files:
        if not os.path.exists(pdf_path):
            print(f"\n  ERROR: File not found: {pdf_path}")
            continue
        result = process_pdf(pdf_path)
        if result:
            results.append(result)
    
    if not results:
        print("\nNo PDFs processed successfully. Exiting.")
        sys.exit(1)
    
    # Copy files to correct folders
    print(f"\n{'='*60}")
    print("Copying files to library...")
    copy_and_rename(results)
    
    # Update index
    print(f"\n{'='*60}")
    print("Updating index.json...")
    added = update_index(results)
    
    # Output git commands
    print(f"\n{'='*60}")
    print("Git commands to commit and push:")
    print(f"{'='*60}")
    
    eqsafe_list = ", ".join(str(r["doc_entry"]["alert"]["eqsafe_number"]) for r in results if r["doc_entry"]["alert"]["eqsafe_number"])
    colours = set(r["doc_entry"]["alert"]["banner_colour"] for r in results)
    
    print(f"""
    cd {REPO_ROOT}
    git add data/banner_alerts/
    git commit -m "Add banner alerts: EQSafe {eqsafe_list}"
    git push {GITHUB_REMOTE} {BRANCH}
    """)
    
    print(f"\nDone! {added} new banner alert(s) processed.")


if __name__ == "__main__":
    main()
