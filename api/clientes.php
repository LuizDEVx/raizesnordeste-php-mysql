<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dbconfig.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Lista todos os clientes cadastrados (e pontos de fidelidade)
    $stmt = $pdo->query("SELECT * FROM clientes");
    $clientes = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $clientes], JSON_UNESCAPED_UNICODE);
}
elseif ($method === 'POST') {
    // Recebe os dados enviados via JSON
    $data = json_decode(file_get_contents('php://input'), true);

    // Validação dos campos obrigatórios do cliente
    if (empty($data['nome']) || empty($data['email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Campos obrigatórios faltando: informe o nome e o email do cliente.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $telefone = $data['telefone'] ?? '';
    $pontos = $data['pontos'] ?? 0;

    // Inserção segura no banco utilizando PDO
    $senha = password_hash($data['senha'] ?? bin2hex(random_bytes(8)), PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO clientes (nome, email, telefone, pontos, senha, perfil) VALUES (?, ?, ?, ?, ?, 'cliente')");
    $stmt->execute([
        $data['nome'],
        $data['email'],
        $telefone,
        $pontos,
        $senha
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Cliente cadastrado com sucesso!',
        'id' => $pdo->lastInsertId()
    ], JSON_UNESCAPED_UNICODE);
}
