<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dbconfig.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM unidades");
    $unidades = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $unidades], JSON_UNESCAPED_UNICODE);
}
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['nome']) || empty($data['cnpj']) || empty($data['endereco'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Preencha nome, cnpj e endereco.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $cnpj = !empty($data['cnpj']) ? $data['cnpj'] : null;
    $stmt = $pdo->prepare("INSERT INTO unidades (nome, cnpj, endereco) VALUES (?, ?, ?)");
    $stmt->execute([$data['nome'], $cnpj, $data['endereco']]);

    echo json_encode(['success' => true, 'message' => 'Unidade cadastrada com sucesso!', 'id' => $pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
}
