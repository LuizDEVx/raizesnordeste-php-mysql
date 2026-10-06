<?php
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once __DIR__ . '/../dbconfig.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // Recebe os dados email e senha
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['email']) || empty($data['senha'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Informe o e-mail e a senha.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Busca o usuário pelo e-mail
    $stmt = $pdo->prepare("SELECT * FROM clientes WHERE email = ?");
    $stmt->execute([$data['email']]);
    $usuario = $stmt->fetch();

    //Faz a verificação do usuario pela senha e o hash do banco.
    if ($usuario && password_verify($data['senha'], $usuario['senha'])) {
        $_SESSION['user'] = [
    'id' => $usuario['id'],
    'nome' => $usuario['nome'],
    'email' => $usuario['email'],
    'role' => $usuario['perfil'] ?? 'cliente'
];
        echo json_encode([
            'success' => true,
            'message' => 'Login realizado com sucesso!',
            'token' => bin2hex(random_bytes(32)), // Simulando o token
            'usuario' => [
                'id' => $usuario['id'],
                'nome' => $usuario['nome'],
                'email' => $usuario['email'],
                'perfil' => $usuario['perfil'] ?? 'cliente'
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        // Erro de credenciais (401)
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'E-mail ou senha inválidos.'], JSON_UNESCAPED_UNICODE);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.'], JSON_UNESCAPED_UNICODE);
}
