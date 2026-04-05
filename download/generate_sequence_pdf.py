from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.units import inch, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Create document
doc = SimpleDocTemplate(
    "/home/z/my-project/download/Speed_Sign_Covering_Sequence.pdf",
    pagesize=A4,
    rightMargin=2*cm,
    leftMargin=2*cm,
    topMargin=2*cm,
    bottomMargin=2*cm,
    title="Speed Sign Covering Sequence",
    author='Z.ai',
    creator='Z.ai',
    subject='Sequence for Covering and Uncovering Speed Signs in Temporary Traffic Management'
)

# Define styles
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    name='TitleStyle',
    fontName='Times New Roman',
    fontSize=20,
    leading=28,
    alignment=TA_CENTER,
    spaceAfter=20,
    textColor=colors.HexColor('#1F4E79')
)

heading1_style = ParagraphStyle(
    name='Heading1Style',
    fontName='Times New Roman',
    fontSize=14,
    leading=20,
    alignment=TA_LEFT,
    spaceBefore=18,
    spaceAfter=12,
    textColor=colors.HexColor('#1F4E79')
)

heading2_style = ParagraphStyle(
    name='Heading2Style',
    fontName='Times New Roman',
    fontSize=12,
    leading=18,
    alignment=TA_LEFT,
    spaceBefore=12,
    spaceAfter=8,
    textColor=colors.HexColor('#2E75B6')
)

body_style = ParagraphStyle(
    name='BodyStyle',
    fontName='Times New Roman',
    fontSize=11,
    leading=16,
    alignment=TA_LEFT,
    spaceAfter=10
)

citation_style = ParagraphStyle(
    name='CitationStyle',
    fontName='Times New Roman',
    fontSize=10,
    leading=14,
    alignment=TA_LEFT,
    leftIndent=20,
    spaceAfter=8,
    textColor=colors.HexColor('#404040'),
    backColor=colors.HexColor('#F5F5F5')
)

note_style = ParagraphStyle(
    name='NoteStyle',
    fontName='Times New Roman',
    fontSize=10,
    leading=14,
    alignment=TA_LEFT,
    leftIndent=10,
    spaceAfter=8,
    textColor=colors.HexColor('#666666')
)

# Build document content
story = []

# Title
story.append(Paragraph("Sequence for Covering and Uncovering Speed Signs", title_style))
story.append(Paragraph("in Temporary Traffic Management", title_style))
story.append(Spacer(1, 20))
story.append(Paragraph("<b>Document Purpose</b>", heading1_style))
story.append(Paragraph(
    "This document provides guidance for traffic controllers on the correct sequence for covering and uncovering "
    "existing speed signs during temporary traffic management operations. It includes citations from authoritative "
    "documents to support proper practice and help demonstrate compliance to other traffic management personnel.",
    body_style
))

# Section 1: The Sequence
story.append(Paragraph("<b>1. The Required Sequence</b>", heading1_style))

story.append(Paragraph("<b>1.1 Installation Sequence (Putting Up Traffic Management)</b>", heading2_style))
story.append(Paragraph(
    "When setting up temporary traffic management that involves speed reductions, the following sequence must be followed:",
    body_style
))

# Installation table
install_data = [
    [Paragraph('<b>Step</b>', body_style), Paragraph('<b>Action</b>', body_style), Paragraph('<b>Purpose</b>', body_style)],
    [Paragraph('1', body_style), Paragraph('Install temporary speed signs', body_style), Paragraph('Establish the temporary speed limit BEFORE removing the existing limit', body_style)],
    [Paragraph('2', body_style), Paragraph('Cover permanent speed signs', body_style), Paragraph('Remove conflicting speed information from driver view', body_style)],
    [Paragraph('3', body_style), Paragraph('Erect tapers and delineation devices', body_style), Paragraph('Complete the traffic management setup', body_style)],
]

install_table = Table(install_data, colWidths=[1.5*cm, 5*cm, 7*cm])
install_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(install_table)
story.append(Spacer(1, 12))

story.append(Paragraph("<b>1.2 Removal Sequence (Taking Down Traffic Management)</b>", heading2_style))
story.append(Paragraph(
    "When removing temporary traffic management, the sequence is reversed:",
    body_style
))

# Removal table
removal_data = [
    [Paragraph('<b>Step</b>', body_style), Paragraph('<b>Action</b>', body_style), Paragraph('<b>Purpose</b>', body_style)],
    [Paragraph('1', body_style), Paragraph('Remove tapers and delineation devices', body_style), Paragraph('Begin dismantling from the work area outward', body_style)],
    [Paragraph('2', body_style), Paragraph('Uncover permanent speed signs', body_style), Paragraph('Restore the original speed limit to driver view', body_style)],
    [Paragraph('3', body_style), Paragraph('Remove temporary speed signs', body_style), Paragraph('Complete removal AFTER original limit is visible', body_style)],
]

removal_table = Table(removal_data, colWidths=[1.5*cm, 5*cm, 7*cm])
removal_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(removal_table)
story.append(Spacer(1, 12))

# Section 2: Why This Sequence
story.append(Paragraph("<b>2. Why This Sequence Matters</b>", heading1_style))

story.append(Paragraph("<b>2.1 The Critical Principle</b>", heading2_style))
story.append(Paragraph(
    "The fundamental principle is that <b>drivers must always have a valid speed limit visible</b>. At no point should "
    "a driver be without a speed sign to follow. This is why temporary speed signs must be installed BEFORE permanent "
    "signs are covered, and permanent signs must be uncovered BEFORE temporary signs are removed.",
    body_style
))

story.append(Paragraph("<b>2.2 What Happens With Incorrect Sequencing</b>", heading2_style))
story.append(Paragraph(
    "If the sequence is reversed, drivers may encounter a situation where:",
    body_style
))
story.append(Paragraph(
    "• <b>During Installation:</b> If permanent signs are covered before temporary signs are installed, drivers "
    "have no speed limit to follow. This creates confusion and potential for excessive speeds through the worksite.",
    body_style
))
story.append(Paragraph(
    "• <b>During Removal:</b> If temporary signs are removed before permanent signs are uncovered, drivers again "
    "have no speed limit visible. This is particularly dangerous if the permanent limit has been restored.",
    body_style
))

# Section 3: Citations
story.append(Paragraph("<b>3. Authoritative Citations</b>", heading1_style))

story.append(Paragraph("<b>3.1 AGTTM Part 3: Static Worksites</b>", heading2_style))
story.append(Paragraph(
    "The Austroads Guide to Temporary Traffic Management (AGTTM) Part 3 provides the foundation for traffic management "
    "practice in Australia. The following citation from Page 114 establishes the sequence:",
    body_style
))
story.append(Paragraph(
    "\"Before work commences, erect traffic control devices in accordance with AGTTM Part 6. "
    "Once all signs are installed, erect tapers and other delineation devices.\"",
    citation_style
))
story.append(Paragraph(
    "<i>Source: AGTTM Part 3 (2021), Page 114 - Section on Installation Sequence</i>",
    note_style
))
story.append(Spacer(1, 8))

story.append(Paragraph(
    "This clearly establishes that <b>signs must be fully installed BEFORE tapers and delineation</b> are erected. "
    "This applies equally to speed signs - temporary speed signs must be in place before the permanent signs they "
    "replace are covered.",
    body_style
))

story.append(Paragraph("<b>3.2 MRWA Code of Practice</b>", heading2_style))
story.append(Paragraph(
    "The Main Roads Western Australia Traffic Management Code of Practice (May 2025) provides additional guidance:",
    body_style
))
story.append(Paragraph(
    "\"The implementation, operation and/or removal of the temporary traffic management must be considered part of "
    "the works, therefore the TMP must provide details on how this activity will be conducted safely (refer to AGTTM "
    "Part 5 and Part 6) including order of set up and pack down. This may require an additional TGS for the traffic "
    "management personnel to follow. The following must be considered: The requirement to install and remove traffic "
    "management devices in the sequence described in AGTTM Part 6.\"",
    citation_style
))
story.append(Paragraph(
    "<i>Source: MRWA Code of Practice (May 2025), Section 4.2.5 - Traffic Management Implementation and Removal</i>",
    note_style
))
story.append(Spacer(1, 8))

story.append(Paragraph(
    "Section 6.4.1 of the MRWA Code of Practice further states:",
    body_style
))
story.append(Paragraph(
    "\"In accordance with Clause 4.2.5 of AS 1742.3 - 2019 'Any signs and traffic control devices, including regulatory, "
    "warning guide signs and pavement marking, which are inappropriate to, or conflict with, the temporary worksite "
    "situation must be covered, obliterated or removed'.\"",
    citation_style
))
story.append(Paragraph(
    "<i>Source: MRWA Code of Practice (May 2025), Section 6.4.1 - Existing Signs</i>",
    note_style
))

story.append(Paragraph("<b>3.3 AS 1742.3 - 2019</b>", heading2_style))
story.append(Paragraph(
    "Australian Standard AS 1742.3 - 2019 is referenced by both AGTTM and MRWA Code of Practice. The requirement "
    "to cover conflicting signs is established in Clause 4.2.5, which forms the basis for the sequence requirements.",
    body_style
))

# Section 4: Practical Application
story.append(Paragraph("<b>4. Practical Application</b>", heading1_style))

story.append(Paragraph("<b>4.1 Before Starting Work</b>", heading2_style))
story.append(Paragraph(
    "Before commencing any traffic management installation, ensure the following:",
    body_style
))
story.append(Paragraph(
    "1. A Traffic Management Plan (TMP) has been authorised by the Road Infrastructure Manager (RIM).",
    body_style
))
story.append(Paragraph(
    "2. All signs and devices have been loaded and checked against the Traffic Guidance Scheme (TGS).",
    body_style
))
story.append(Paragraph(
    "3. Workers are familiar with the sequence and their responsibilities.",
    body_style
))

story.append(Paragraph("<b>4.2 Covering Existing Signs</b>", heading2_style))
story.append(Paragraph(
    "When covering existing speed signs, the following materials and methods are appropriate:",
    body_style
))
story.append(Paragraph(
    "• Use opaque material approved in Main Roads Specification 601 - Signs.",
    body_style
))
story.append(Paragraph(
    "• <b>Do NOT use black plastic or similar materials</b> - these can cause permanent damage to sign faces "
    "within 24 hours due to heat absorption and moisture retention.",
    body_style
))
story.append(Paragraph(
    "• Ensure the covering is secure and will not come loose during the works.",
    body_style
))

story.append(Paragraph("<b>4.3 Removing Coverings</b>", heading2_style))
story.append(Paragraph(
    "When removing coverings from permanent signs:",
    body_style
))
story.append(Paragraph(
    "1. Remove coverings carefully to avoid damaging the sign face.",
    body_style
))
story.append(Paragraph(
    "2. Ensure the permanent sign is fully visible and legible before removing temporary signs.",
    body_style
))
story.append(Paragraph(
    "3. Check that the speed limit shown matches the intended permanent limit.",
    body_style
))

# Section 5: Summary
story.append(Paragraph("<b>5. Summary</b>", heading1_style))

story.append(Paragraph(
    "The sequence for covering and uncovering speed signs is a critical safety procedure that ensures drivers always "
    "have a valid speed limit to follow. The correct sequence is:",
    body_style
))

summary_data = [
    [Paragraph('<b>Phase</b>', body_style), Paragraph('<b>Sequence</b>', body_style)],
    [Paragraph('Installation', body_style), Paragraph('Install temporary signs → Cover permanent signs → Erect tapers', body_style)],
    [Paragraph('Removal', body_style), Paragraph('Remove tapers → Uncover permanent signs → Remove temporary signs', body_style)],
]

summary_table = Table(summary_data, colWidths=[3.5*cm, 10*cm])
summary_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
]))
story.append(summary_table)
story.append(Spacer(1, 12))

story.append(Paragraph(
    "This sequence is mandated by AGTTM Part 3 and reinforced by the MRWA Code of Practice. Following this sequence "
    "ensures compliance with national and state standards, and most importantly, maintains safety for road users and "
    "traffic management personnel.",
    body_style
))

# References Section
story.append(Paragraph("<b>6. References</b>", heading1_style))

ref_style = ParagraphStyle(
    name='RefStyle',
    fontName='Times New Roman',
    fontSize=10,
    leading=14,
    alignment=TA_LEFT,
    leftIndent=20,
    spaceAfter=6
)

story.append(Paragraph(
    "1. Austroads Guide to Temporary Traffic Management (AGTTM) Part 3: Static Worksites (2021), Page 114",
    ref_style
))
story.append(Paragraph(
    "2. Austroads Guide to Temporary Traffic Management (AGTTM) Part 6: Field Staff",
    ref_style
))
story.append(Paragraph(
    "3. Main Roads Western Australia Traffic Management Code of Practice (May 2025), Section 4.2.5 and Section 6.4",
    ref_style
))
story.append(Paragraph(
    "4. Australian Standard AS 1742.3 - 2019 Manual of uniform traffic control devices Part 3: Traffic control for works on roads",
    ref_style
))

# Build the document
doc.build(story)
print("PDF generated successfully!")
