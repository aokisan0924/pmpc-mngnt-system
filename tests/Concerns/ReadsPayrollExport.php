<?php

declare(strict_types=1);

namespace Tests\Concerns;

use DOMDocument;
use ZipArchive;

/** Reads an exported management workbook by header text, so tests do not hard-code column letters. */
trait ReadsPayrollExport
{
    /** @return array<string, string> cell address => text or number */
    protected function sheetCells(string $path, int $sheet): array
    {
        $zip = new ZipArchive;
        $zip->open($path);
        $doc = new DOMDocument;
        $doc->loadXML($zip->getFromName('xl/worksheets/sheet'.$sheet.'.xml'));
        $zip->close();
        $cells = [];
        foreach ($doc->getElementsByTagName('c') as $cell) {
            $cells[$cell->getAttribute('r')] = trim($cell->textContent);
        }

        return $cells;
    }

    /**
     * Value under a row-10 header in one block (0 = 1st grid, 1 = 2nd grid, 2 = 1st govt table,
     * 3 = 1st deductions, 4 = 2nd deductions, 5 = 2nd govt table).
     */
    protected function underHeader(array $cells, int $block, string $header, int $row): ?string
    {
        return $cells[$this->headerColumn($cells, $block, $header).$row] ?? null;
    }

    protected function headerColumn(array $cells, int $block, string $header): string
    {
        $headers = [];
        foreach ($cells as $address => $text) {
            if (preg_match('/^([A-Z]+)10$/', $address, $match) && $text !== '') {
                $headers[$this->columnNumber($match[1])] = [$match[1], $text];
            }
        }
        ksort($headers);
        $index = -1;
        foreach ($headers as [$letter, $text]) {
            if ($text === 'EMPLOYEE NAME') {
                $index++;
            }
            if ($index === $block && str_starts_with($text, $header)) {
                return $letter;
            }
        }
        $this->fail("Header '$header' not found in block $block.");
    }

    /** Journal amount for the label starting with $prefix (debit two columns right of the label, credit three). */
    protected function journal(array $cells, string $prefix, bool $debit = false): ?string
    {
        foreach ($cells as $address => $text) {
            preg_match('/^([A-Z]+)(\d+)$/', $address, $match);
            // Journal rows only: below the payroll grids, above the supplemental detail block at row 88+.
            if ((int) $match[2] > 17 && (int) $match[2] < 80 && str_starts_with(mb_strtolower($text), mb_strtolower($prefix))) {
                return $cells[$this->columnLetter($this->columnNumber($match[1]) + ($debit ? 2 : 3)).$match[2]] ?? null;
            }
        }

        return null;
    }

    private function columnNumber(string $letters): int
    {
        return array_reduce(str_split($letters), fn (int $sum, string $char): int => $sum * 26 + ord($char) - 64, 0);
    }

    private function columnLetter(int $number): string
    {
        $letters = '';
        while ($number > 0) {
            $number--;
            $letters = chr(65 + $number % 26).$letters;
            $number = intdiv($number, 26);
        }

        return $letters;
    }
}
