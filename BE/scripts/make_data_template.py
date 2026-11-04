"""Build the UST data-collection spreadsheet from the DB columns in BE/db/schema.sql.

Usage (from the repo root):
    BE\\.venv\\Scripts\\python.exe BE\\scripts\\make_data_template.py

Output: docs/data-template/TaraTrip_Places_Template.xlsx
Re-run after changing COLUMNS so the template and the DB stay in sync.
"""
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).resolve().parents[2] / "docs" / "data-template" / "TaraTrip_Places_Template.xlsx"
LAST_ROW = 500  # validation range; plenty for the MVP
DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
CATEGORIES = ["restaurant", "market", "shop", "attraction"]

# (column key, required, width, format, description, example 1, example 2)
COLUMNS = [
    ("place_id", True, 12, "MNL-0001, MNL-0002, ...",
     "Unique ID. Number the rows in order and never reuse an ID.", "EXAMPLE-1", "EXAMPLE-2"),
    ("name", True, 28, "Text",
     "Name as shown on the sign or Google Maps.", "Sample Lumpia Stall", "Sample Heritage Church"),
    ("category", True, 13, "Pick from list",
     "restaurant = food/drink, market = traditional market or food hall, "
     "shop = small store or souvenir shop, attraction = sight, museum, park, church.",
     "restaurant", "attraction"),
    ("is_small_business", True, 10, "Yes / No",
     "Yes if locally owned and not a chain, franchise or mall store.", "Yes", "No"),
    ("lat", True, 11, "Decimal, e.g. 14.5995",
     "Latitude. In Google Maps, right-click the place: the first line shows 'lat, lng'. "
     "Paste the first number here.", 14.6, 14.59),
    ("lng", True, 11, "Decimal, e.g. 120.9842",
     "Longitude: the second number from the same right-click.", 120.975, 120.975),
    ("address", True, 34, "Text",
     "Street address including barangay/district.", "123 Sample St, Binondo, Manila",
     "Sample Rd, Intramuros, Manila"),
    ("district", False, 13, "Text",
     "Area name tourists know, e.g. Binondo, Intramuros, Ermita.", "Binondo", "Intramuros"),
    ("price_min", False, 10, "Whole number, PHP",
     "Typical spend per person, low end (one snack, cheapest item). Leave empty if not applicable.",
     50, None),
    ("price_max", False, 10, "Whole number, PHP",
     "Typical spend per person, high end (a full meal or usual purchase).", 150, None),
    ("entry_fee", True, 10, "Whole number, PHP",
     "Entrance ticket per adult. 0 if free.", 0, 75),
    ("avg_stay_minutes", True, 11, "Whole number",
     "How long a tourist usually spends here, in minutes.", 30, 45),
    *[(f"hours_{d}", True, 12, "HH:MM-HH:MM or closed",
       f"Opening hours on {d.capitalize()}, 24-hour clock, e.g. 08:00-20:00. "
       "Write 'closed' if closed that day.",
       "08:00-20:00", "closed" if d == "mon" else "09:00-17:00") for d in DAYS],
    ("tags", True, 26, "Comma-separated keywords",
     "What a tourist might search for: food types, features, themes. "
     "e.g. street food, chinese, dessert, history, church, souvenirs, budget.",
     "street food, chinese, budget", "history, church, photo spot"),
    ("description", True, 40, "1-3 sentences, English",
     "What makes it worth visiting. Shown to tourists in the app.",
     "Family-run stall known for fresh lumpia. (example row: values are made up)",
     "Spanish-era church with a small museum. (example row: values are made up)"),
    ("photos", False, 30, "Image URLs, comma-separated",
     "Direct links to photos you took or are allowed to use. Optional.", None, None),
    ("contact", False, 20, "Text",
     "Phone number or Facebook page, if public.", "0917 000 0000", None),
    ("source", True, 16, "Your name + how",
     "Who collected this and how: visited, phoned, Google Maps, Facebook page.",
     "Kian - visited", "Keisha - Google Maps"),
    ("last_checked", True, 12, "Date YYYY-MM-DD",
     "Date the information was checked.", "2026-11-10", "2026-11-10"),
]

HEADER_FILL = PatternFill("solid", fgColor="1F4E78")
OPTIONAL_FILL = PatternFill("solid", fgColor="5B7FA6")
EXAMPLE_FILL = PatternFill("solid", fgColor="EDEDED")
WHITE_BOLD = Font(bold=True, color="FFFFFF")
GREY_ITALIC = Font(italic=True, color="808080")


def build_places_sheet(ws):
    ws.title = "Places"
    for i, (key, required, width, fmt, desc, *_examples) in enumerate(COLUMNS, start=1):
        cell = ws.cell(row=1, column=i, value=key)
        cell.font = WHITE_BOLD
        cell.fill = HEADER_FILL if required else OPTIONAL_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        note = f"{'REQUIRED' if required else 'Optional'}\nFormat: {fmt}\n\n{desc}"
        cell.comment = Comment(note, "TaraTrip", width=300, height=160)
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.row_dimensions[1].height = 32
    ws.freeze_panes = "C2"  # keep header row and place_id/name visible

    for r, ex_index in ((2, 5), (3, 6)):
        for i, col in enumerate(COLUMNS, start=1):
            cell = ws.cell(row=r, column=i, value=col[ex_index])
            cell.fill = EXAMPLE_FILL
            cell.font = GREY_ITALIC

    col_of = {c[0]: get_column_letter(i) for i, c in enumerate(COLUMNS, start=1)}

    def add(dv, key):
        dv.add(f"{col_of[key]}2:{col_of[key]}{LAST_ROW}")
        ws.add_data_validation(dv)

    def listed(options, key, title):
        dv = DataValidation(type="list", formula1='"' + ",".join(options) + '"', allow_blank=True,
                            showErrorMessage=True, errorTitle=title,
                            error="Pick a value from the dropdown.")
        add(dv, key)

    listed(CATEGORIES, "category", "category")
    listed(["Yes", "No"], "is_small_business", "is_small_business")

    # Metro Manila bounding box (with margin) catches swapped lat/lng and typos.
    for key, lo, hi in (("lat", 14.2, 15.0), ("lng", 120.8, 121.3)):
        add(DataValidation(type="decimal", operator="between", formula1=str(lo), formula2=str(hi),
                           allow_blank=True, showErrorMessage=True, errorTitle=key,
                           error=f"{key} for Metro Manila should be between {lo} and {hi}. "
                                 "Did you swap lat and lng?"), key)

    for key in ("price_min", "price_max", "entry_fee"):
        add(DataValidation(type="whole", operator="between", formula1="0", formula2="100000",
                           allow_blank=True, showErrorMessage=True, errorTitle=key,
                           error="Whole number of pesos, 0 or more."), key)
    add(DataValidation(type="whole", operator="between", formula1="5", formula2="480",
                       allow_blank=True, showErrorMessage=True, errorTitle="avg_stay_minutes",
                       error="Minutes between 5 and 480."), "avg_stay_minutes")

    for d in DAYS:
        c = col_of[f"hours_{d}"]
        formula = (f'OR(LOWER({c}2)="closed",AND(LEN({c}2)=11,MID({c}2,3,1)=":",'
                   f'MID({c}2,6,1)="-",MID({c}2,9,1)=":"))')
        add(DataValidation(type="custom", formula1=formula, allow_blank=True, showErrorMessage=True,
                           errorTitle=f"hours_{d}",
                           error="Use HH:MM-HH:MM (e.g. 08:00-20:00) or 'closed'."), f"hours_{d}")


def build_guide_sheet(ws):
    ws.title = "Guide"
    ws.column_dimensions["A"].width = 20
    ws.column_dimensions["B"].width = 11
    ws.column_dimensions["C"].width = 26
    ws.column_dimensions["D"].width = 90

    intro = [
        ("TaraTrip - Manila place data template", Font(bold=True, size=14)),
        ("Fill one row per place in the 'Places' sheet. The SCH team loads this sheet into the "
         "database as-is, so please keep the column names and formats unchanged.", None),
        ("1. Rows 2-3 (grey) are made-up examples showing the format. Delete them before sending.", None),
        ("2. Dark-blue headers are required. Lighter-blue headers are optional.", None),
        ("3. Hover over a header to see what goes in it. Dropdowns and checks warn about wrong formats.", None),
        ("4. Coordinates: in Google Maps, right-click the exact spot. The first line shows "
         "'14.5995, 120.9842'; click it to copy, then paste the first number in lat and the second in lng.", None),
        ("5. Prices are in PHP, per person, as whole numbers. Opening hours use 24-hour time.", None),
        ("6. Aim for a mix: small local restaurants, market stalls and shops, plus the attractions "
         "tourists come for, so routes can link them.", None),
        ("Questions: contact Hyungeun Kim (SCH, data & DB).", Font(italic=True)),
    ]
    for r, (text, font) in enumerate(intro, start=1):
        cell = ws.cell(row=r, column=1, value=text)
        if font:
            cell.font = font
    start = len(intro) + 2
    for i, h in enumerate(["Column", "Required", "Format", "What to enter"], start=1):
        cell = ws.cell(row=start, column=i, value=h)
        cell.font = WHITE_BOLD
        cell.fill = HEADER_FILL
    for r, (key, required, _w, fmt, desc, *_e) in enumerate(COLUMNS, start=start + 1):
        ws.cell(row=r, column=1, value=key).font = Font(bold=True)
        ws.cell(row=r, column=2, value="Yes" if required else "Optional")
        ws.cell(row=r, column=3, value=fmt)
        cell = ws.cell(row=r, column=4, value=desc)
        cell.alignment = Alignment(wrap_text=True, vertical="top")


def main():
    wb = Workbook()
    build_guide_sheet(wb.active)
    build_places_sheet(wb.create_sheet())
    wb.active = 1  # open on the Places sheet
    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
