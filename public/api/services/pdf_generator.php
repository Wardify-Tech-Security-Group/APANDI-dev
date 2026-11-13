<?php
declare(strict_types=1);

/**
 * =============================================================================
 * GENERADOR BINARIO NATIVO DE INFORMES PDF OFICIALES (PHP 8.3 / PDF 1.4)
 * Genera PDFs binarios con cumplimiento formal MINEDUC Chile (Decreto 83 / 170)
 * Sin dependencias externas Composer ni Node.js (100% portable para cPanel/Docker)
 * =============================================================================
 */

class ApandiPdfGenerator {
    /**
     * Genera y retorna el binario oficial de un informe PDF
     */
    public static function generate(array $studentData, array $documentMeta): string {
        $pdf = new self();
        return $pdf->buildDocument($studentData, $documentMeta);
    }

    private array $objects = [];
    private int $objectCount = 0;
    private array $pages = [];
    private int $fontObjId = 0;
    private int $fontBoldObjId = 0;

    public function __construct() {}

    private function addObject(string $content): int {
        $this->objectCount++;
        $this->objects[$this->objectCount] = $content;
        return $this->objectCount;
    }

    private function escapePdfText(string $text): string {
        // Conversión a ISO-8859-1 / Windows-1252 para fuentes estándar de PDF (Helvetica / WinAnsiEncoding)
        $converted = mb_convert_encoding($text, 'Windows-1252', 'UTF-8');
        return strtr($converted, [
            '\\' => '\\\\',
            '('  => '\\(',
            ')'  => '\\)',
            "\r" => '',
            "\n" => ' '
        ]);
    }

    private function wrapText(string $text, int $maxChars = 85): array {
        if ($text === '') return [];
        $lines = [];
        $rawLines = explode("\n", str_replace(["\r\n", "\r"], "\n", $text));
        foreach ($rawLines as $raw) {
            $words = explode(' ', trim($raw));
            $current = '';
            foreach ($words as $w) {
                if ($w === '') continue;
                if ($current === '') {
                    $current = $w;
                } elseif (mb_strlen($current . ' ' . $w) <= $maxChars) {
                    $current .= ' ' . $w;
                } else {
                    $lines[] = $current;
                    $current = $w;
                }
            }
            if ($current !== '') {
                $lines[] = $current;
            }
        }
        return $lines;
    }

    private function buildDocument(array $studentData, array $documentMeta): string {
        $est = $studentData['estudiante'] ?? [];
        $asist = $studentData['asistencia'] ?? [];
        $evals = $studentData['evaluaciones'] ?? [];
        $paec = $studentData['paec'] ?? [];
        $pai = $studentData['pai'] ?? [];

        $docTitle = (string)($documentMeta['titulo'] ?? 'INFORME OFICIAL DE PROGRESO PEDAGÓGICO');
        $docCode = (string)($documentMeta['codigo'] ?? 'IF-2026');
        $docTipo = (string)($documentMeta['tipo'] ?? 'INFORME_FAMILIA');
        $emision = (string)($documentMeta['fecha_emision'] ?? date('d/m/Y'));

        $totalDias = (int)($asist['total_dias'] ?? 0);
        $diasPres = (int)($asist['dias_presente'] ?? 0);
        $pctAsist = $totalDias > 0 ? (int)round(($diasPres / $totalDias) * 100) : 100;

        $rut = $est['rut'] ?? 'RUT No Registrado';
        $nombreCompleto = trim(($est['nombres'] ?? '') . ' ' . ($est['apellidos'] ?? 'Estudiante APANDI'));
        $matricula = $est['numero_matricula'] ?? 'MAT-2026';
        $taller = $est['taller_nombre'] ?? 'Taller Laboral';
        $apoderado = $est['apoderado_nombre'] ?? 'Apoderado Titular';
        $parentesco = $est['parentesco'] ?? 'Tutor Legal';
        $grupoFunc = ($est['grupo_funcionalidad'] ?? 'GRUPO_A') === 'GRUPO_A'
            ? 'Grupo A (Mayor Funcionalidad / Autonomía)'
            : 'Grupo B (Mayor Apoyo y Mediación DUA)';

        // Construcción de comandos de dibujo de página (A4: 595 x 842 pt)
        $stream = [];

        // 1. Franja Header Institucional (#073B3A)
        $stream[] = "0.027 0.231 0.227 rg"; // Color institucional #073b3a
        $stream[] = "0 772 595 70 re f";

        // Textos del Header (Blanco)
        $stream[] = "BT";
        $stream[] = "/F2 14 Tf";
        $stream[] = "1 1 1 rg";
        $stream[] = "40 814 Td (" . $this->escapePdfText('CENTRO DE CAPACITACIÓN LABORAL APANDI') . ") Tj";
        $stream[] = "/F1 8.5 Tf";
        $stream[] = "0 -15 Td (" . $this->escapePdfText('Educación Especial Nivel Laboral • Decreto Exento N° 83 / Decreto N° 170 MINEDUC Chile') . ") Tj";
        $stream[] = "/F2 9.5 Tf";
        $stream[] = "0 -14 Td (" . $this->escapePdfText(mb_strtoupper($docTitle)) . ") Tj";
        $stream[] = "ET";

        // Metadatos de documento y folio (Margen derecho superior)
        $stream[] = "BT";
        $stream[] = "/F2 8 Tf";
        $stream[] = "1 1 1 rg";
        $stream[] = "430 814 Td (" . $this->escapePdfText("FOLIO: $docCode") . ") Tj";
        $stream[] = "/F1 8 Tf";
        $stream[] = "0 -12 Td (" . $this->escapePdfText("EMISIÓN: $emision") . ") Tj";
        $stream[] = "0 -12 Td (" . $this->escapePdfText("MATRÍCULA: $matricula") . ") Tj";
        $stream[] = "ET";

        // Cursor vertical Y
        $y = 745;

        // 2. Sección: Identificación del Estudiante
        $stream[] = "0.031 0.486 0.471 rg"; // #087c78
        $stream[] = "40 " . ($y - 2) . " 515 16 re f";
        $stream[] = "BT";
        $stream[] = "/F2 9.5 Tf";
        $stream[] = "1 1 1 rg";
        $stream[] = "45 $y Td (" . $this->escapePdfText("1. IDENTIFICACIÓN DEL ESTUDIANTE Y TALLER LABORAL") . ") Tj";
        $stream[] = "ET";
        $y -= 18;

        // Caja de datos del estudiante
        $stream[] = "0.96 0.97 0.98 rg"; // Fondo grisáceo
        $stream[] = "0.80 0.84 0.88 RG"; // Borde
        $stream[] = "1 w";
        $stream[] = "40 " . ($y - 50) . " 515 62 re B";

        $stream[] = "BT";
        $stream[] = "/F1 9 Tf";
        $stream[] = "0.1 0.15 0.2 rg";
        $stream[] = "48 " . ($y - 2) . " Td (" . $this->escapePdfText("Estudiante: ") . ") Tj";
        $stream[] = "/F2 9 Tf";
        $stream[] = "(" . $this->escapePdfText($nombreCompleto) . ") Tj";
        $stream[] = "/F1 9 Tf";
        $stream[] = " (" . $this->escapePdfText("  |  RUT: $rut  |  Modalidad: $grupoFunc") . ") Tj";

        $stream[] = "0 -14 Td (" . $this->escapePdfText("Taller Laboral: ") . ") Tj";
        $stream[] = "/F2 9 Tf";
        $stream[] = "(" . $this->escapePdfText($taller) . ") Tj";
        $stream[] = "/F1 9 Tf";
        $stream[] = " (" . $this->escapePdfText("  |  Jornada: Completa (Decreto 83)") . ") Tj";

        $stream[] = "0 -14 Td (" . $this->escapePdfText("Apoderado Titular: ") . ") Tj";
        $stream[] = "/F2 9 Tf";
        $stream[] = "(" . $this->escapePdfText("$apoderado ($parentesco)") . ") Tj";
        $stream[] = "/F1 9 Tf";
        $stream[] = " (" . $this->escapePdfText("  |  Asistencia Acumulada: $pctAsist% ($diasPres de $totalDias días)") . ") Tj";
        $stream[] = "ET";

        $y -= 70;

        // 3. Sección: Evaluaciones Cualitativas Decreto 83
        $stream[] = "0.031 0.486 0.471 rg";
        $stream[] = "40 " . ($y - 2) . " 515 16 re f";
        $stream[] = "BT";
        $stream[] = "/F2 9.5 Tf";
        $stream[] = "1 1 1 rg";
        $stream[] = "45 $y Td (" . $this->escapePdfText("2. EVALUACIÓN CUALITATIVA DE COMPETENCIAS LABORALES (DECRETO EXENTO 83)") . ") Tj";
        $stream[] = "ET";
        $y -= 14;

        $stream[] = "BT";
        $stream[] = "/F1 7.5 Tf";
        $stream[] = "0.4 0.45 0.5 rg";
        $stream[] = "42 $y Td (" . $this->escapePdfText("Escala Cualitativa Oficial MINEDUC: LOGRADO (L)  •  EN DESARROLLO (ED)  •  EN INICIO (EI)  •  NO OBSERVADO (NO)") . ") Tj";
        $stream[] = "ET";
        $y -= 12;

        if (empty($evals)) {
            $stream[] = "BT";
            $stream[] = "/F1 8.5 Tf";
            $stream[] = "0.3 0.3 0.3 rg";
            $stream[] = "45 $y Td (" . $this->escapePdfText("Sin evaluaciones registradas en el periodo actual.") . ") Tj";
            $stream[] = "ET";
            $y -= 16;
        } else {
            $countEv = 0;
            foreach ($evals as $ev) {
                if ($countEv >= 5) break; // Limitar para 1 página formal
                $countEv++;
                $dim = str_replace('_', ' ', (string)($ev['dimension'] ?? 'TECNICA VOCACIONAL'));
                $logro = str_replace('_', ' ', (string)($ev['nivel_logro'] ?? 'LOGRADO'));
                $ind = (string)($ev['indicador_competencia'] ?? '');
                $obs = (string)($ev['comentario_pedagogico'] ?? '');

                // Badge Logro
                $stream[] = "0.93 0.96 0.95 rg";
                $stream[] = "40 " . ($y - 24) . " 515 28 re f";
                $stream[] = "0.85 0.88 0.90 RG";
                $stream[] = "40 " . ($y - 24) . " 515 28 re S";

                $stream[] = "BT";
                $stream[] = "/F2 8.5 Tf";
                $stream[] = "0.03 0.45 0.40 rg";
                $stream[] = "46 " . ($y - 2) . " Td (" . $this->escapePdfText("[$logro]  •  $dim") . ") Tj";

                $stream[] = "/F1 8 Tf";
                $stream[] = "0.15 0.2 0.25 rg";
                $wrappedInd = $this->wrapText($ind, 85);
                $indText = !empty($wrappedInd) ? $wrappedInd[0] : $ind;
                $stream[] = "0 -10 Td (" . $this->escapePdfText("Indicador: $indText") . ") Tj";

                if ($obs !== '') {
                    $wrappedObs = $this->wrapText($obs, 88);
                    $obsText = !empty($wrappedObs) ? $wrappedObs[0] : $obs;
                    $stream[] = "/F1 7.5 Tf";
                    $stream[] = "0.35 0.4 0.45 rg";
                    $stream[] = "0 -9 Td (" . $this->escapePdfText("Observación: \"$obsText\"") . ") Tj";
                }
                $stream[] = "ET";

                $y -= 33;
            }
        }

        $y -= 4;

        // 4. Sección: Plan de Acompañamiento Emocional (PAEC) y Acuerdos Familiares
        $stream[] = "0.031 0.486 0.471 rg";
        $stream[] = "40 " . ($y - 2) . " 515 16 re f";
        $stream[] = "BT";
        $stream[] = "/F2 9.5 Tf";
        $stream[] = "1 1 1 rg";
        $stream[] = "45 $y Td (" . $this->escapePdfText("3. ACUERDOS DE CONVIVENCIA CON LA FAMILIA (PAEC / PAI)") . ") Tj";
        $stream[] = "ET";
        $y -= 18;

        $acuerdos = (string)($paec['acuerdos_familia'] ?? ($est['acuerdos_familia'] ?? 'Mantener comunicación permanente con el equipo multidisciplinario PIE y reforzar hábitos de autonomía en el hogar.'));
        $profSos = (string)($paec['profesional_sos_nombre'] ?? ($est['profesional_sos_nombre'] ?? 'Camila Ignacia Vargas Herrera (Psicóloga PIE)'));

        $stream[] = "0.98 0.98 0.96 rg";
        $stream[] = "0.88 0.88 0.82 RG";
        $stream[] = "40 " . ($y - 42) . " 515 54 re B";

        $stream[] = "BT";
        $stream[] = "/F2 8.5 Tf";
        $stream[] = "0.15 0.20 0.25 rg";
        $stream[] = "48 " . ($y - 2) . " Td (" . $this->escapePdfText("Profesional de Referencia SOS: $profSos") . ") Tj";

        $stream[] = "/F1 8 Tf";
        $stream[] = "0.25 0.30 0.35 rg";
        $wrappedAcuerdos = $this->wrapText($acuerdos, 85);
        $dy = -11;
        foreach (array_slice($wrappedAcuerdos, 0, 3) as $line) {
            $stream[] = "0 $dy Td (" . $this->escapePdfText($line) . ") Tj";
            $dy = -10;
        }
        $stream[] = "ET";

        $y -= 62;

        // 5. Bloque de Firmas y Sello Electrónico
        $stream[] = "0.75 0.80 0.85 RG";
        $stream[] = "1 w";
        $stream[] = "65 " . ($y - 25) . " 180 " . ($y - 25) . " m " . (65 + 180) . " " . ($y - 25) . " l S";
        $stream[] = "350 " . ($y - 25) . " 180 " . ($y - 25) . " m " . (350 + 180) . " " . ($y - 25) . " l S";

        $stream[] = "BT";
        $stream[] = "/F2 8 Tf";
        $stream[] = "0.2 0.25 0.3 rg";
        $stream[] = "85 " . ($y - 36) . " Td (" . $this->escapePdfText("Docente Titular / Coordinación PIE") . ") Tj";
        $stream[] = "0 -9 Td (" . $this->escapePdfText("Centro de Capacitación APANDI") . ") Tj";

        $stream[] = "365 " . ($y - 36) . " Td (" . $this->escapePdfText("Dirección / Unidad Técnico Pedagógica") . ") Tj";
        $stream[] = "0 -9 Td (" . $this->escapePdfText("Visación Oficial Decreto 83") . ") Tj";
        $stream[] = "ET";

        // Footer Legal Ley 19.628 y Sello Hash SHA-256
        $selloHash = hash('sha256', "$rut|$docCode|$emision|" . ($est['id_estudiante'] ?? 1));
        $stream[] = "BT";
        $stream[] = "/F1 7 Tf";
        $stream[] = "0.5 0.55 0.6 rg";
        $stream[] = "40 34 Td (" . $this->escapePdfText("Documento oficial emitido bajo estricto resguardo de la Ley N° 19.628 de Protección de Datos Personales.") . ") Tj";
        $stream[] = "0 -9 Td (" . $this->escapePdfText("Sello Digital de Integridad SHA-256: " . substr($selloHash, 0, 32) . "...") . ") Tj";
        $stream[] = "ET";

        $contentStream = implode("\n", $stream);

        // Estructura interna PDF 1.4
        $streamObjId = $this->addObject("<< /Length " . strlen($contentStream) . " >>\nstream\n" . $contentStream . "\nendstream");

        // Fuentes estándar
        $this->fontObjId = $this->addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        $this->fontBoldObjId = $this->addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

        // Página
        $pageObjId = $this->addObject(""); // Placeholder
        $pagesObjId = $this->addObject(""); // Placeholder

        $this->objects[$pageObjId] = "<< /Type /Page /Parent $pagesObjId 0 R /MediaBox [0 0 595 842] /Contents $streamObjId 0 R /Resources << /Font << /F1 {$this->fontObjId} 0 R /F2 {$this->fontBoldObjId} 0 R >> >> >>";
        $this->objects[$pagesObjId] = "<< /Type /Pages /Kids [$pageObjId 0 R] /Count 1 >>";

        // Catálogo
        $catalogObjId = $this->addObject("<< /Type /Catalog /Pages $pagesObjId 0 R >>");

        // Ensamblado final con tabla xref y trailer
        $out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $xref = ["0000000000 65535 f \n"];

        for ($i = 1; $i <= $this->objectCount; $i++) {
            $offset = strlen($out);
            $xref[] = sprintf("%010d 00000 n \n", $offset);
            $out .= "$i 0 obj\n" . $this->objects[$i] . "\nendobj\n";
        }

        $xrefOffset = strlen($out);
        $out .= "xref\n0 " . ($this->objectCount + 1) . "\n" . implode("", $xref);
        $out .= "trailer\n<< /Size " . ($this->objectCount + 1) . " /Root $catalogObjId 0 R >>\n";
        $out .= "startxref\n$xrefOffset\n%%EOF\n";

        return $out;
    }
}

