"""Build resources/payroll/management-template.xlsx from HR's monthly management payroll workbook.

Usage: python scripts/build-payroll-template.py "<path to source .xlsx>"

Keeps labels, header rows, styles, column widths, merged cells and print areas. Removes every formula,
employee value, signatory name and voucher amount, gives each office sheet 6 employee rows and puts
{{prepared}} / {{certified}} / {{approved}} markers where the signatory names were.
Keeps only pictures anchored in rows 1-4 (the PMPC logos); every lower picture is a real signature and is dropped.
"""

import copy
import re
import sys
from pathlib import Path

import openpyxl
import openpyxl.reader.drawings
from openpyxl.drawing.image import Image
from openpyxl.worksheet.cell_range import CellRange

ROWS = 6
FIRST_ROW = 11
MARKERS = {'PAYROLL OFFICER': '{{prepared}}', 'ACCOUNTING CLERK': '{{certified}}', 'PRESIDENT': '{{approved}}'}
PERIOD = re.compile(r'^[A-Z]+ \d+ - \d+, \d{4}$')
LOGO_ROWS = 3  # 0-based: logos sit in rows 0-3 (the voucher logo at row 3); signatures sit lower
OUT = Path(__file__).resolve().parent.parent / 'resources' / 'payroll' / 'management-template.xlsx'


class Picture(Image):
    """Pillow-free image: keeps PNG/JPEG bytes as they are; openpyxl drops any other format as WMF."""

    def __init__(self, fp):
        self.ref = fp.read()
        self.format = 'png' if self.ref[:4] == b'\x89PNG' else 'jpeg' if self.ref[:2] == b'\xff\xd8' else 'wmf'
        self.width = self.height = 0  # only used for string anchors; read pictures keep their own anchor

    def _data(self):
        return self.ref


openpyxl.reader.drawings.PILImage = True
openpyxl.reader.drawings.Image = Picture


def total_row(ws):
    return next(r for r in range(FIRST_ROW, ws.max_row + 1) if str(ws.cell(r, 2).value or '').strip() == 'TOTAL')


def grow(ws):
    total = total_row(ws)
    extra = ROWS - (total - FIRST_ROW)
    if extra <= 0:
        return
    merged = [CellRange(str(r)) for r in ws.merged_cells.ranges]
    for r in merged:
        ws.unmerge_cells(str(r))
    heights = {r: d.height for r, d in ws.row_dimensions.items() if r >= total}
    ws.insert_rows(total, extra)
    for r, h in sorted(heights.items(), reverse=True):
        ws.row_dimensions[r + extra].height = h
    for r in range(total, total + extra):
        ws.row_dimensions[r].height = ws.row_dimensions[total - 1].height
        for col in range(1, ws.max_column + 1):
            ws.cell(r, col)._style = copy.copy(ws.cell(total - 1, col)._style)
    for r in merged:
        if r.min_row >= total:
            r.shift(row_shift=extra)
        ws.merge_cells(str(r))
    if ws.print_area:
        ws.print_area = re.sub(r'\$(\d+)', lambda m: '$' + str(int(m.group(1)) + extra if int(m.group(1)) >= total else m.group(1)), re.sub(r"'[^']*'!", '', ws.print_area))


def clean_office(ws):
    grow(ws)
    total = total_row(ws)
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if v is None:
                continue
            if isinstance(v, (int, float)) or (isinstance(v, str) and v.startswith('=')):
                c.value = None
            elif c.row == 9 and isinstance(v, str) and PERIOD.match(v.strip()):
                c.value = None
            elif FIRST_ROW <= c.row < total:
                c.value = None
    for row in ws.iter_rows(min_row=total + 1):
        for c in row:
            marker = MARKERS.get(str(c.value or '').strip())
            if marker and c.row > 1:
                ws.cell(c.row - 1, c.column).value = marker


def clean_voucher(ws):
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if v is None:
                continue
            code = isinstance(v, (int, float)) and c.column_letter == 'G'
            if (isinstance(v, (int, float)) and not code) or (isinstance(v, str) and v.startswith('=')) or not isinstance(v, (str, int, float)):
                c.value = None
    for ref in ('C11', 'I11', 'C31', 'D31', 'H31'):
        ws[ref].value = None


def main():
    wb = openpyxl.load_workbook(sys.argv[1])
    for ws in wb.worksheets:
        ws._images = [i for i in ws._images if i.anchor._from.row <= LOGO_ROWS]
    for ws in wb.worksheets[:4]:
        clean_office(ws)
    clean_voucher(wb.worksheets[4])
    wb.calculation.fullCalcOnLoad = False
    wb.save(OUT)
    print('wrote', OUT)


if __name__ == '__main__':
    main()
