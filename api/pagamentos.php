<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dbconfig.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Lista todos os pagamentos registrados
    $stmt = $pdo->query("SELECT * FROM pagamentos");
    $pagamentos = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $pagamentos], JSON_UNESCAPED_UNICODE);
}
elseif ($method === 'POST') {
    // Recebe os dados enviados via JSON
    $data = json_decode(file_get_contents('php://input'), true);

    // Validação dos campos obrigatórios do pagamento
    if (empty($data['pedido_id']) || empty($data['forma_pagamento']) || empty($data['valor'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Campos obrigatórios faltando: informe pedido_id, forma_pagamento e valor.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $status = $data['status'] ?? 'APROVADO';

    // Inserção segura no banco utilizando PDO
    $stmt = $pdo->prepare("INSERT INTO pagamentos (pedido_id, forma_pagamento, valor, status) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $data['pedido_id'],
        $data['forma_pagamento'],
        $data['valor'],
        $status
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Pagamento registrado com sucesso!',
        'id' => $pdo->lastInsertId()
    ], JSON_UNESCAPED_UNICODE);
}
