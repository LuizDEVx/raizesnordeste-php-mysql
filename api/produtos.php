<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dbconfig.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Lista todos os produtos cadastrados no cardápio
    $stmt = $pdo->query("SELECT * FROM produtos");
    $produtos = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $produtos], JSON_UNESCAPED_UNICODE);
}
elseif ($method === 'POST') {
    // Recebe os dados enviados via JSON
    $data = json_decode(file_get_contents('php://input'), true);

    // Validação dos campos obrigatórios do produto
    if (empty($data['nome']) || empty($data['preco'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Campos obrigatórios faltando: informe o nome e o preco do produto.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $descricao = $data['descricao'] ?? '';

    // Inserção segura no banco utilizando PDO
    $stmt = $pdo->prepare("INSERT INTO produtos (nome, descricao, preco) VALUES (?, ?, ?)");
    $stmt->execute([
        $data['nome'],
        $descricao,
        $data['preco']
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Produto cadastrado com sucesso no cardápio!',
        'id' => $pdo->lastInsertId()
    ], JSON_UNESCAPED_UNICODE);
}
