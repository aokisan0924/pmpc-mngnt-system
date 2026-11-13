"""Build resources/payroll/management-template.xlsx from HR's monthly management payroll workbook.

Usage: python scripts/build-payroll-template.py "<path to source .xlsx>"

Keeps labels, header rows, styles, column widths, merged cells and print areas. Removes every formula,
employee value, signatory name and voucher amount, gives each office sheet 6 employee rows and puts
{{prepared}} / {{certified}} / {{approved}} markers where the signatory names were, plus a
{{noted}} / {{noted_title}} "Noted by" sign-off beside each block.
Keeps only pictures anchored in rows 1-4 (the PMPC logos); every lower picture is a real signature and is dropped.
"""

import copy
import re
import sys
from pathlib import Path

import openpyxl
import openpyxl.reader.drawings
from openpyxl.drawing.image import Image
from openpyxl.formatting.formatting import ConditionalFormattingList
from openpyxl.utils import column_index_from_string, get_column_letter
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
    add_noted_by(ws, total)


def free(ws, row, col, rows=3):
    return col > 0 and all(ws.cell(r, col).value in (None, '') for r in range(row, row + rows))


def add_noted_by(ws, total):
    """A fourth sign-off, "Noted by", in the first free columns to the right of each "Approved by" block.

    The search stays left of the next block (the next "Prepared by:" label on the same row), so it never
    writes over another table.
    """
    for title in [c for row in ws.iter_rows(min_row=total + 1) for c in row if str(c.value or '').strip() == 'PRESIDENT']:
        name_row, label_row = title.row - 1, title.row - 3
        next_block = min([c.column for c in ws[label_row] if str(c.value or '').strip() == 'Prepared by:' and c.column > title.column] or [ws.max_column + 1])
        right = [col for col in range(title.column + 2, min(title.column + 10, next_block - 1))
                 if all(free(ws, label_row, x, rows=4) for x in (col, col + 1))]
        if right:
            spot = (label_row, right[0])
        else:
            # No room beside it: one line under the block, below "Prepared by".
            prepared = next(c for c in ws[label_row] if str(c.value or '').strip() == 'Prepared by:' and c.column < title.column and c.column >= title.column - 15)
            spot = (title.row + 2, prepared.column)
            if not all(free(ws, spot[0], x, rows=4) for x in (spot[1], spot[1] + 1)):
                raise SystemExit(f'No room for Noted by on {ws.title} near {title.coordinate}')
        row, col = spot
        ws.cell(row, col).value = 'Noted by:'
        ws.cell(row + 2, col).value = '{{noted}}'
        ws.cell(row + 3, col).value = '{{noted_title}}'


def reorder_signoffs(ws):
    """November 2026 order: Prepared by Reynold and Kurt side by side, Certified Correct, the President last.

    The four slots keep their cells; what each one says moves one slot along and "Noted by" goes away.
    Old -> new: prepared stays, certified -> second preparer, approved -> certified, noted -> approved.
    """
    names = {'{{certified}}': '{{prepared_2}}', '{{approved}}': '{{certified}}', '{{noted}}': '{{approved}}'}
    titles = {'{{certified}}': '{{prepared_2_title}}', '{{approved}}': 'ACCOUNTING CLERK', '{{noted}}': 'PRESIDENT'}
    labels = {'{{certified}}': ('Certified Correct:', None), '{{approved}}': ('Approved by:', 'Certified Correct:'), '{{noted}}': ('Noted by:', 'Approved by:')}
    marks = [c for row in ws.iter_rows() for c in row if c.value in names]
    for c in marks:
        old = c.value
        ws.cell(c.row + 1, c.column).value = titles[old]
        label_old, label_new = labels[old]
        # The label sits two rows up, at or a few columns left of the name (one Cubao block has none: write it).
        label = next((ws.cell(c.row - 2, col) for col in range(c.column, max(0, c.column - 4), -1) if str(ws.cell(c.row - 2, col).value or '').strip() == label_old), ws.cell(c.row - 2, c.column))
        label.value = label_new
        c.value = names[old]


def insert_column(ws, at, source):
    """Insert one column at `at` (1-based) styled like `source`, shifting merges, widths, pictures and print area.

    openpyxl's insert_cols moves only the cells, so everything else is moved here by hand.
    """
    widths = {}
    for dim in ws.column_dimensions.values():
        for i in range(dim.min or 1, (dim.max or dim.min or 1) + 1):
            widths[i] = (dim.width, dim.hidden)
    merged = [CellRange(str(r)) for r in ws.merged_cells.ranges]
    for r in merged:
        ws.unmerge_cells(str(r))
    ws.insert_cols(at)
    for r in merged:
        if r.min_col >= at:
            r.shift(col_shift=1)
        elif r.max_col >= at:
            r.expand(right=1)
        ws.merge_cells(str(r))
    for key in list(ws.column_dimensions.keys()):
        del ws.column_dimensions[key]
    for i, (width, hidden) in sorted(widths.items()):
        target = i + 1 if i >= at else i
        if width:
            ws.column_dimensions[get_column_letter(target)].width = width
        ws.column_dimensions[get_column_letter(target)].hidden = hidden
    if source in widths and widths[source][0]:
        ws.column_dimensions[get_column_letter(at)].width = widths[source][0]
    for row in range(1, ws.max_row + 1):
        ws.cell(row, at)._style = copy.copy(ws.cell(row, source)._style)
    for image in ws._images:
        for marker in (image.anchor._from, getattr(image.anchor, 'to', None)):
            if marker is not None and marker.col >= at - 1:
                marker.col += 1
    formats = [(cf.sqref, cf.rules) for cf in ws.conditional_formatting]
    ws.conditional_formatting = ConditionalFormattingList()
    for sqref, rules in formats:
        ranges = []
        for r in sqref.ranges:
            r = CellRange(r.coord)
            if r.min_col >= at:
                r.shift(col_shift=1)
            elif r.max_col >= at:
                r.expand(right=1)
            ranges.append(r.coord)
        for rule in rules:
            ws.conditional_formatting.add(' '.join(ranges), rule)
    if ws.print_area:
        def shift(m):
            col = column_index_from_string(m.group(1))
            return '$' + get_column_letter(col + 1 if col >= at else col) + '$'
        ws.print_area = re.sub(r'\$([A-Z]+)\$', shift, re.sub(r"'[^']*'!", '', ws.print_area))


def add_electricity_columns(ws):
    """November 2026: an ELECTRICITY column right after every RENTAL column (deduction and govt source tables)."""
    rentals = [c.column for c in ws[10] if str(c.value or '').strip().upper().startswith('RENTAL')]
    for col in sorted(rentals, reverse=True):
        insert_column(ws, col + 1, col)
        ws.cell(10, col + 1).value = 'ELECTRICITY'


def add_adjustment_columns(ws):
    """November 2026: an ADJUSTMENT column before each payroll grid's GROSS PAY and after every ELECTRICITY column.

    It holds the difference from a gross or net HR typed on step 3 (an amount agreed with the employee).
    """
    spots = []
    for c in ws[10]:
        header = str(c.value or '').strip().upper()
        if header == 'GROSS PAY':
            spots.append((c.column, c.column - 1))
        elif header == 'ELECTRICITY':
            spots.append((c.column + 1, c.column))
    for at, source in sorted(spots, reverse=True):
        # A sign-off label left of the new column whose name is right of it would drift apart: move it along.
        labels = [c for row in ws.iter_rows(min_row=18) for c in row
                  if c.column < at and str(c.value or '').strip().endswith(':')
                  and any(str(ws.cell(c.row + 2, col).value or '').startswith('{{') for col in range(at, c.column + 4))]
        insert_column(ws, at, source)
        ws.cell(10, at).value = 'ADJUSTMENT'
        for label in labels:
            target = ws.cell(label.row, label.column + 1)
            if target.value in (None, ''):
                target.value, label.value = label.value, None


def relayout_voucher(ws):
    """Voucher: Prepared by Reynold (C31) and Kurt (D31), Certified Correct by Katherine (H31)."""
    ws['D29'].value = None
    ws['D32'].value = None
    ws['G29'].value = 'Certified Correct:'


def clean_voucher(ws):
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if v is None:
                continue
            code = isinstance(v, (int, float)) and c.column_letter == 'G'
            if (isinstance(v, (int, float)) and not code) or (isinstance(v, str) and v.startswith('=')) or not isinstance(v, (str, int, float)):
                c.value = None
    for ref in ('I11', 'C31', 'D31', 'H31', 'H32'):
        ws[ref].value = None
    # As on the October voucher: the payee is fixed; Noted by (H31/H32) is filled by the export.
    ws['C11'].value = 'Alexander Feria et. al.'


def main():
    wb = openpyxl.load_workbook(sys.argv[1])
    for ws in wb.worksheets:
        ws._images = [i for i in ws._images if i.anchor._from.row <= LOGO_ROWS]
    for ws in wb.worksheets[:4]:
        clean_office(ws)
        reorder_signoffs(ws)
        add_electricity_columns(ws)
        add_adjustment_columns(ws)
    clean_voucher(wb.worksheets[4])
    relayout_voucher(wb.worksheets[4])
    wb.calculation.fullCalcOnLoad = False
    # The source file's author and print dates are personal data; never carry them into the template.
    wb.properties.creator = None
    wb.properties.lastModifiedBy = None
    wb.properties.lastPrinted = None
    wb.properties.title = None
    wb.save(OUT)
    print('wrote', OUT)


if __name__ == '__main__':
    main()
