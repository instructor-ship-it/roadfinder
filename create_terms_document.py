from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.units import inch, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont, registerFontFamily

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Define terms and descriptions
terms = [
    ("85th percentile", "The speed at or below which 85% of vehicles are observed to travel under free-flowing conditions past a nominated point."),
    ("AADT", "see annual average daily traffic"),
    ("AGTTM", "Austroads Guide to Temporary Traffic Management"),
    ("adjacent clearance area", "The area immediately adjacent to the traffic lane, and typically between the traffic lane and the worksite that should be kept free from features that would be potentially hazardous to errant vehicles."),
    ("advance warning area", "Area in advance of the worksite where advance warning traffic control devices are erected to warn and inform of changes to traffic conditions ahead and to give road users time to adjust their driving behaviour."),
    ("advance warning distance", "Distance measured between successive signs in the advance warning area and the distance from the beginning of the taper or closure or work area to the first advance sign."),
    ("annual average daily traffic", "The total volume of traffic passing a roadside observation point over the period of a calendar year, divided by the number of days in that year (365 or 366 days)."),
    ("around the worksite", "Methods of hazard elimination, when the entire work area (including all vehicles and plant) is located 6 m or more clear from the nearest edge of a traffic lane."),
    ("arterial road", "A road that predominantly carries through traffic from one region to another, forming principal avenues of travel for traffic movements. Sub-definitions: Rural - A general term for the main road carrying mostly long-distance traffic. Urban - A general term for a main traffic route, specifically referring to certain streets so designated in a local authority's district scheme."),
    ("AS", "Australian Standard"),
    ("AS/NZS", "Australian / New Zealand Standard"),
    ("auxiliary lane", "A portion of the roadway adjoining the through traffic lanes, used for speed change or for other purposes supplementary to through traffic movement."),
    ("B-double", "A combination consisting of a prime mover towing two semitrailers, with the first semitrailer being attached directly to the prime mover by a fifth wheel coupling and the second semitrailer being mounted on the rear of the first semitrailer by a fifth wheel coupling on the first semitrailer."),
    ("B-triple", "A prime mover towing three semitrailers. The first and second semitrailers are connected to the following semitrailer by a fifth wheel permanently located toward the rear of the semitrailer. Under the Heavy Vehicle National Law, a B-triple is categorised as a road train."),
    ("barricade", "Barricades comprise either barrier boards or stand-alone non-interconnected lightweight modules. They must be used to inhibit access to a work area."),
    ("barrier board", "Boards 150 mm to 200 mm in height and not more than 4 m in length. They are mounted on trestles or fixed posts at about 1 m above the pavement. The colour combination used for barrier boards must be alternate diagonal stripes of black and retroreflective yellow, terminating in yellow at each end."),
    ("barrier line", "A pair of longitudinal lines marked on the roadway to prohibit overtaking movement in one or both directions."),
    ("buffer zone", "An advance warning area if speed on the approach to a temporary speed zone is more than 30 km/h higher than the temporary speed limit and needs to be reduced in stages."),
    ("built-up area", "In relation to a length of road, means an area in which either of the following is present for a distance of at least 500 metres, for the whole of the road: buildings, not over 100 metres apart on land next to the road and/or street lights not over 100 metres apart (see urban road) or, if the length of road is shorter than 500 metres."),
    ("centreline", "The line which defines the axis or alignment of the centre of a road or other work. In relation to any portion of a roadway not marked with a flush median - a dotted or solid line or lines of paint or raised studs intended to separate opposing traffic. In relation to an unmarked roadway - the inferred line down the longitudinal centre of the roadway."),
    ("chicane", "The lateral movement of traffic from one or more lanes onto another alignment before a shift back toward the original road alignment but not necessarily into the original lane or lanes. Typically applied to reduce the speed of traffic."),
    ("closure", "The physical area from which the road users are to be excluded. This includes but is not limited to shoulder closures, lane closures and road closures."),
    ("competent person", "A person who has, through a combination of training, qualification and experience, acquired knowledge and skills enabling that person to correctly perform a specified task."),
    ("containment fence", "Physical barrier sufficient to provide separation between the travelled path, or paths used by cyclists and pedestrians, from the work area, but not as rigid as to become a hazard if struck by vehicles, or to act as a safety barrier."),
    ("contractor", "A person, organisation or company responsible for implementation of an activity on or affecting a road. Examples include but are not limited to construction and maintenance crews, utility companies, surveyors, filming crews and event management."),
    ("contraflow", "Traffic flow in a direction opposite to the normal flow, where two-way flow is maintained at all times."),
    ("detour", "A temporary, alternative route to guide road users around a worksite operation, most commonly during temporary closure of a road or path."),
    ("divided road", "A road with separate roadways for traffic travelling in opposite directions."),
    ("dividing line", "A road marking formed by a line, or two parallel lines, whether broken or continuous, designed to indicate the parts of the road to be used by vehicles travelling in opposite directions."),
    ("double barrier line", "see barrier line"),
    ("dynamic deflection", "The largest transverse deflection of a road safety barrier system during an actual crash or during a full-scale impact test (i.e. the amount the road safety barrier deflects from its initial position during impact)."),
    ("emergency services", "An entity that has a statutory responsibility to respond to an emergency and includes: an ambulance service, a fire brigade (including volunteer fire brigade), a police force or police service, a disaster or emergency organisation of the Commonwealth or a State or Territory."),
    ("flare (road safety barrier)", "The change in the offset of a road safety barrier to move it further from the travelled way or closer to the travelled way."),
    ("gore", "A triangular area where two roads either meet or split."),
    ("hazard (roadside)", "Any object or feature located between the edge of a traffic lane and the road reserve boundary, or within a median, that could cause significant personal injury (including fatal injury) to road users when impacted by an errant vehicle."),
    ("intersection", "The place at which two or more roads meet or cross."),
    ("lane line", "A line (usually painted), other than the centreline, that divides adjacent traffic lanes travelling in the same direction. This line is usually painted but may be raised delineating devices."),
    ("long term", "The description which applies when a traffic guidance scheme is required to operate both day and night and may be left unattended."),
    ("may", "Indicates the existence of an option"),
    ("median", "A strip of road, not normally intended for use by traffic, which separates carriageways for traffic in opposite directions. Usually formed by painted lines, kerbed and paved areas, grassed areas, etc."),
    ("mobile work", "Work that entails vehicles moving progressively along the roadway at speeds significantly lower than other traffic, with all traffic control devices being either vehicle mounted or regularly moved along the road."),
    ("motorway", "A divided highway, freeway, expressway, controlled access highway etc. for through traffic with no access for traffic between interchanges and with grade separation at some interchanges. Certain activities or uses may be restricted or prohibited by legislative provision."),
    ("multilane", "Two or more running lanes in one direction."),
    ("must", "Indicates that a statement is mandatory"),
    ("off-peak period", "The periods that have low demand volumes of traffic during the day (see peak period)."),
    ("offset speed zone", "Temporary speed zones which result in speed limits which are different for each direction of travel at a particular location."),
    ("open road area", "Roadside development less frequent than that specified for a built-up area (see built-up area)."),
    ("past the worksite", "Methods of hazard control, when the entire work area (including all vehicles and plant) is located within 6 m from the nearest edge of a traffic lane."),
    ("peak period", "The period that has the highest demand volume of traffic and/or number of passengers during the day (peak hour, peak half hour, etc.) (see off-peak period)."),
    ("permanent speed limit", "The maximum legal speed limit for a specific section of road indicated by permanent speed limit signs. These signs are in place 24 hours a day, seven days a week and have been implemented after a speed limit review has been carried out."),
    ("portable traffic control device (PTCD)", "An approved portable device used to control traffic to enhance the safety and protection of road users and road workers at the worksite, specifically an option to improve safety for traffic controllers. Portable traffic controller devices may include PTSS or boom barriers."),
    ("portable traffic signal systems (PTSS)", "An approved portable traffic signal device allowing traffic controllers to perform their roles at a safe distance from traffic in high risk environments."),
    ("primary sign", "The first sign closest to the worksite, work area or hazard. This sign is followed by repeater signs placed further from the worksite, work area or hazard."),
    ("road reserve", "An area of land between the legal road boundaries, usually a fence line to fence line. This typically includes the roadway, footpaths, other access ways and unpaved areas, which are dedicated to allow the passage of road users. The road reserve also includes an airspace of six metre directly above the road surface."),
    ("road safety barrier system", "A physical barrier separating the work area and the travelled path, designed to resist penetration by an errant vehicle and as far as reasonably practicable, to redirect errant vehicles back into the travelled path."),
    ("road train", "A combination, other than a B-double, consisting of a motor vehicle towing at least two trailers, excluding any converter dolly supporting a semitrailer."),
    ("road user", "Any driver, rider, passenger or pedestrian using the road."),
    ("roadway", "Any one part of the width of a road devoted particularly to the use of vehicles, inclusive of shoulders and auxiliary lanes."),
    ("running lane", "The portion of the roadway allotted for the use of a single line of vehicles. Cyclists operating in these lanes are considered vehicles."),
    ("rural road", "A general term for the road carrying mostly long-distance traffic, as distinct from local traffic and located in open road areas."),
    ("safety buffer", "The unoccupied space between the additional warning area and work area which allows for an errant vehicle to pull up before reaching the work area."),
    ("safe work method statement (SWMS)", "A document which identifies the type of work being undertaken, the risks, the hazards and controls to be implemented to eliminate the risk."),
    ("short term (traffic control)", "Description that applies when a traffic guidance scheme is required only while work personnel are in attendance, and is generally limited to the duration of a single work shift."),
    ("should", "Indicates a recommendation"),
    ("shoulder", "A sealed or unsealed part of the road outside the edge line, or inferred edge line, which is trafficable, adjacent to the traffic lane and flush with the surface of the pavement."),
    ("shuttle flow", "Where a portion of the roadway is closed so that a single lane is used alternately by traffic from opposite directions. It is one-way flow with one direction first, then the other. This is used where insufficient width is available for maintaining two-way flow at all times."),
    ("shuttle lane", "The lane that is open to traffic in a shuttle flow temporary traffic management arrangement."),
    ("sight distance", "The distance, measured along the road over which visibility occurs between a driver or rider and an object or between two drivers at specific heights above the roadway in their lane of travel."),
    ("speed", "Distance travelled per unit of time (km per hour)."),
    ("speed of traffic (traffic speed)", "The posted speed limit at a location when being adhered to by the majority of road users (see 85th percentile). This can be checked by travelling in the stream of vehicles and comparing to the posted speed limit."),
    ("static works", "All works which are greater in scope and duration than can be handled by short term, low impact methods or mobile works and are contained within a fixed area."),
    ("swept path", "The area bounded by lines traced by the extremities of the bodywork of a vehicle while turning."),
    ("taper", "A straight or smoothly curved row of delineation devices used to shift traffic laterally, e.g. from a lane to the shoulder."),
    ("temporary speed limit", "A speed limit that is applied on some sections of road as a result of roadworks, school zones or other variable speed limits which are in place to suit driving and travel conditions. These are not permanent speed limits."),
    ("termination area", "Where road users have passed the work area and normal traffic conditions resume."),
    ("through the worksite", "Methods of hazard separation by stopping all road user's movement for short periods when workers need to occupy the roadway."),
    ("traffic", "All vehicles or persons travelling on a road unless the context indicates otherwise."),
    ("traffic controller", "A competent person whose duty it is to control traffic at a worksite."),
    ("traffic control device", "Any traffic sign, road marking, traffic signal, or other device, placed or erected under public authority for the purpose of regulating, directing, warning or guiding traffic."),
    ("traffic guidance schemes (TGS)", "An arrangement of temporary traffic control devices to warn traffic and guide it around, through or past a worksite or temporary hazard."),
    ("traffic management plan (TMP)", "A document describing all essential traffic management matters associated with roadworks or works on roads. This includes risk assessment, traffic demand and accommodation, traffic routing and control and provision for vulnerable road users and special vehicles."),
    ("travelled path", "That part of the roadway which is made available to vehicles and which may consist of one or more running lanes."),
    ("truck mounted attenuator (TMA)", "A safety device designed to reduce the severity of collision that should be fitted to slow moving or stationary work vehicles which are exposed to potential impact from behind by approaching traffic."),
    ("two-way roadway", "A roadway having running lanes allotted for use by traffic in opposing directions."),
    ("undivided road", "A road without a median (see divided road)."),
    ("unsealed road", "A road that does not have a hard or smooth surface. Unsealed road surfaces include gravel, sand or dirt."),
    ("variable message sign (VMS)", "Variable message signs can be changed to display information messages to alert drivers of on-road incidents on the road ahead. They are also used to warn road users about weather conditions and other important information."),
    ("vehicles per day (vpd)", "The number of vehicles observed passing a point in both directions on a road for 24 hours."),
    ("vehicles per hour (vph)", "The number of vehicles observed passing a point in both directions on a road for one hour."),
    ("vulnerable road user", "Pedestrians, cyclists, motorcyclists."),
    ("work area", "Area where maintenance or construction work is being done."),
    ("worksite", "An area which includes the work area(s) and any additional length of road required for advance signing, tapers, sidetracks or other areas needed for associated purposes."),
]

# Create document
doc = SimpleDocTemplate(
    "/home/z/my-project/download/AGTTM_Terms_and_Definitions.pdf",
    pagesize=A4,
    title="AGTTM Terms and Definitions",
    author='Z.ai',
    creator='Z.ai',
    subject='Terms and Definitions from Austroads Guide to Temporary Traffic Management Part 1',
    leftMargin=1.5*cm,
    rightMargin=1.5*cm,
    topMargin=2*cm,
    bottomMargin=2*cm
)

# Define styles
title_style = ParagraphStyle(
    name='Title',
    fontName='Times New Roman',
    fontSize=18,
    leading=22,
    alignment=TA_CENTER,
    spaceAfter=6
)

subtitle_style = ParagraphStyle(
    name='Subtitle',
    fontName='Times New Roman',
    fontSize=12,
    leading=16,
    alignment=TA_CENTER,
    spaceAfter=20
)

term_style = ParagraphStyle(
    name='Term',
    fontName='Times New Roman',
    fontSize=10,
    leading=14,
    textColor=colors.HexColor('#1F4E79'),
    alignment=TA_LEFT,
)

desc_style = ParagraphStyle(
    name='Description',
    fontName='Times New Roman',
    fontSize=10,
    leading=14,
    alignment=TA_LEFT,
)

# Build content
story = []
story.append(Paragraph("<b>AGTTM Part 1: Terms and Definitions</b>", title_style))
story.append(Paragraph("Extracted from Austroads Guide to Temporary Traffic Management Part 1: Introduction<br/>Table 3.1: Definitions (Pages 9-13 of the PDF, pages 13-17 of document)", subtitle_style))
story.append(Spacer(1, 12))

# Define header and cell styles
header_style = ParagraphStyle(
    name='TableHeader',
    fontName='Times New Roman',
    fontSize=11,
    textColor=colors.white,
    alignment=TA_CENTER,
)

cell_term_style = ParagraphStyle(
    name='CellTerm',
    fontName='Times New Roman',
    fontSize=9,
    leading=12,
    textColor=colors.HexColor('#1F4E79'),
    alignment=TA_LEFT,
)

cell_desc_style = ParagraphStyle(
    name='CellDesc',
    fontName='Times New Roman',
    fontSize=9,
    leading=12,
    alignment=TA_LEFT,
)

# Build table data
table_data = [[
    Paragraph('<b>Term</b>', header_style),
    Paragraph('<b>Description</b>', header_style)
]]

for i, (term, desc) in enumerate(terms):
    table_data.append([
        Paragraph(f"<b>{term}</b>", cell_term_style),
        Paragraph(desc, cell_desc_style)
    ])

# Create table
col_widths = [4.5*cm, 14*cm]
table = Table(table_data, colWidths=col_widths, repeatRows=1)

table.setStyle(TableStyle([
    # Header styling
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    
    # Alternating row colors
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    
    # Grid and alignment
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))

# Apply alternating row colors for all rows
for i in range(1, len(table_data)):
    if i % 2 == 0:
        table.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F5F5F5'))]))
    else:
        table.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), colors.white)]))

story.append(table)

# Build PDF
doc.build(story)
print("PDF created successfully!")
