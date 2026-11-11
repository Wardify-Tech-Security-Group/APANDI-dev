<?php
if (!defined('APANDI_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

// 9. Documentación Institucional (PAI, PAEC, PACI, IEP, IF, AN, PV) — Integración Figma
$docsStoragePath = sys_get_temp_dir() . '/apandi_institutional_docs.json';
if ($route === 'documentos' && $method === 'GET') {
    $stored = [];
    if (is_readable($docsStoragePath)) {
        $stored = json_decode((string)file_get_contents($docsStoragePath), true) ?: [];
    }
    echo json_encode(['ok' => true, 'documentos' => $stored]);
    exit;
}

if ($route === 'documentos' && $method === 'POST') {
    $idEst = (int)($body['studentId'] ?? ($body['id_estudiante'] ?? 1));
    $docType = (string)($body['type'] ?? ($body['documentType'] ?? 'pai'));
    $title = trim((string)($body['title'] ?? 'Documento Institucional'));
    $status = in_array($body['status'] ?? '', ['borrador', 'finalizado']) ? $body['status'] : 'borrador';
    $date = trim((string)($body['date'] ?? date('Y-m-d')));
    $content = is_array($body['content'] ?? null) ? $body['content'] : [];
    $observations = trim((string)($body['observations'] ?? ''));
    $responsibleName = trim((string)($body['responsibleName'] ?? $authUser['nombre_completo']));

    $stored = [];
    if (is_readable($docsStoragePath)) {
        $stored = json_decode((string)file_get_contents($docsStoragePath), true) ?: [];
    }

    $newDoc = [
        'id' => 'doc-' . time() . '-' . random_int(100, 999),
        'student' => $idEst,
        'studentId' => $idEst,
        'documentType' => $docType,
        'type' => $docType,
        'title' => $title,
        'status' => $status,
        'date' => $date,
        'content' => $content,
        'observations' => $observations,
        'responsibleName' => $responsibleName,
        'createdBy' => $authUser['nombre_completo'],
        'createdAt' => date('c')
    ];

    array_unshift($stored, $newDoc);
    @file_put_contents($docsStoragePath, json_encode($stored, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    logAudit($pdo, $authUser['id_usuario'], $idEst, 'DOCUMENTACION_INSTITUCIONAL', 'CREACION', "Generación de documento institucional (" . strtoupper($docType) . "): $title ($status)");

    echo json_encode(['ok' => true, 'documento' => $newDoc]);
    exit;
}
