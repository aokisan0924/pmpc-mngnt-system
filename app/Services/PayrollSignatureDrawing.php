<?php

declare(strict_types=1);

namespace App\Services;

use DOMDocument;
use DOMElement;
use Illuminate\Support\Str;
use ZipArchive;

class PayrollSignatureDrawing
{
    private const XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';

    private const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';

    private const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    private const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';

    public function add(ZipArchive $zip, int $sheet, string $cell, string $name, string $png): void
    {
        $sheetRelsPath = "xl/worksheets/_rels/sheet$sheet.xml.rels";
        $sheetRels = $this->xml($zip->getFromName($sheetRelsPath), self::PKG, 'Relationships');
        $target = null;
        foreach ($sheetRels->documentElement->childNodes as $rel) {
            if ($rel instanceof DOMElement && $rel->getAttribute('Type') === self::R.'/drawing') {
                $target = 'xl/drawings/'.basename($rel->getAttribute('Target'));
            }
        }
        if (! $target) {
            $target = "xl/drawings/signatures$sheet.xml";
            $rid = 'signatureDrawing';
            $rel = $sheetRels->createElementNS(self::PKG, 'Relationship');
            foreach (['Id' => $rid, 'Type' => self::R.'/drawing', 'Target' => '../drawings/'.basename($target)] as $key => $value) {
                $rel->setAttribute($key, $value);
            }
            $sheetRels->documentElement->appendChild($rel);
            $worksheet = $this->xml($zip->getFromName("xl/worksheets/sheet$sheet.xml"));
            $drawing = $worksheet->createElementNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'drawing');
            $drawing->setAttributeNS(self::R, 'r:id', $rid);
            $worksheet->documentElement->insertBefore($drawing, $worksheet->getElementsByTagName('extLst')->item(0));
            $zip->addFromString("xl/worksheets/sheet$sheet.xml", $worksheet->saveXML());
            $zip->addFromString($sheetRelsPath, $sheetRels->saveXML());
        }
        $doc = $this->xml($zip->getFromName($target), self::XDR, 'xdr:wsDr');
        $relsPath = 'xl/drawings/_rels/'.basename($target).'.rels';
        $rels = $this->xml($zip->getFromName($relsPath), self::PKG, 'Relationships');
        $uuid = (string) Str::uuid();
        $rid = 'signature'.$uuid;
        $media = 'signature-'.$uuid.'.png';
        $rel = $rels->createElementNS(self::PKG, 'Relationship');
        foreach (['Id' => $rid, 'Type' => self::R.'/image', 'Target' => '../media/'.$media] as $key => $value) {
            $rel->setAttribute($key, $value);
        }
        $rels->documentElement->appendChild($rel);
        preg_match('/^([A-Z]+)(\d+)$/', $cell, $parts);
        $col = 0;
        foreach (str_split($parts[1]) as $char) {
            $col = $col * 26 + ord($char) - 64;
        }
        [$width, $height] = getimagesizefromstring($png);
        $scale = min(120 / $width, 20 / $height);
        $cx = (int) round($width * $scale * 9525);
        $cy = (int) round($height * $scale * 9525);
        $anchor = $doc->createElementNS(self::XDR, 'xdr:oneCellAnchor');
        $from = $doc->createElementNS(self::XDR, 'xdr:from');
        foreach (['col' => $col - 1, 'colOff' => 0, 'row' => (int) $parts[2] - 1, 'rowOff' => 0] as $key => $value) {
            $from->appendChild($doc->createElementNS(self::XDR, 'xdr:'.$key, (string) $value));
        }
        $anchor->appendChild($from);
        $ext = $doc->createElementNS(self::XDR, 'xdr:ext');
        $ext->setAttribute('cx', (string) $cx);
        $ext->setAttribute('cy', (string) $cy);
        $anchor->appendChild($ext);
        $pic = $doc->createElementNS(self::XDR, 'xdr:pic');
        $nv = $doc->createElementNS(self::XDR, 'xdr:nvPicPr');
        $pr = $doc->createElementNS(self::XDR, 'xdr:cNvPr');
        $ids = [0];
        foreach ($doc->getElementsByTagName('cNvPr') as $existing) {
            $ids[] = (int) $existing->getAttribute('id');
        }
        $pr->setAttribute('id', (string) (max($ids) + 1));
        $pr->setAttribute('name', 'Signature - '.$name);
        $nv->appendChild($pr);
        $nv->appendChild($doc->createElementNS(self::XDR, 'xdr:cNvPicPr'));
        $pic->appendChild($nv);
        $fill = $doc->createElementNS(self::XDR, 'xdr:blipFill');
        $blip = $doc->createElementNS(self::A, 'a:blip');
        $blip->setAttributeNS(self::R, 'r:embed', $rid);
        $fill->appendChild($blip);
        $stretch = $doc->createElementNS(self::A, 'a:stretch');
        $stretch->appendChild($doc->createElementNS(self::A, 'a:fillRect'));
        $fill->appendChild($stretch);
        $pic->appendChild($fill);
        $sp = $doc->createElementNS(self::XDR, 'xdr:spPr');
        $transform = $doc->createElementNS(self::A, 'a:xfrm');
        $offset = $doc->createElementNS(self::A, 'a:off');
        $offset->setAttribute('x', '0');
        $offset->setAttribute('y', '0');
        $transform->appendChild($offset);
        $size = $doc->createElementNS(self::A, 'a:ext');
        $size->setAttribute('cx', (string) $cx);
        $size->setAttribute('cy', (string) $cy);
        $transform->appendChild($size);
        $sp->appendChild($transform);
        $geom = $doc->createElementNS(self::A, 'a:prstGeom');
        $geom->setAttribute('prst', 'rect');
        $geom->appendChild($doc->createElementNS(self::A, 'a:avLst'));
        $sp->appendChild($geom);
        $pic->appendChild($sp);
        $anchor->appendChild($pic);
        $anchor->appendChild($doc->createElementNS(self::XDR, 'xdr:clientData'));
        $doc->documentElement->appendChild($anchor);
        $zip->addFromString($target, $doc->saveXML());
        $zip->addFromString($relsPath, $rels->saveXML());
        $zip->addFromString('xl/media/'.$media, $png);
        $types = $this->xml($zip->getFromName('[Content_Types].xml'));
        $hasPng = false;
        $hasDrawing = false;
        foreach ($types->documentElement->childNodes as $type) {
            if ($type instanceof DOMElement) {
                $hasPng = $hasPng || $type->getAttribute('Extension') === 'png';
                $hasDrawing = $hasDrawing || $type->getAttribute('PartName') === '/'.$target;
            }
        }
        foreach ([! $hasPng ? ['Default', 'Extension', 'png', 'image/png'] : null, ! $hasDrawing ? ['Override', 'PartName', '/'.$target, 'application/vnd.openxmlformats-officedocument.drawing+xml'] : null] as $type) {
            if ($type) {
                $node = $types->createElementNS($types->documentElement->namespaceURI, $type[0]);
                $node->setAttribute($type[1], $type[2]);
                $node->setAttribute('ContentType', $type[3]);
                $types->documentElement->appendChild($node);
            }
        }
        $zip->addFromString('[Content_Types].xml', $types->saveXML());
    }

    private function xml(string|false $xml, ?string $namespace = null, ?string $root = null): DOMDocument
    {
        $doc = new DOMDocument;
        if ($xml !== false) {
            if (! $doc->loadXML($xml, LIBXML_NONET)) {
                throw new \RuntimeException('Invalid signature drawing XML.');
            }
        } else {
            $doc->appendChild($doc->createElementNS($namespace, $root));
        }

        return $doc;
    }
}
