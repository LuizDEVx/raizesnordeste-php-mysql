<?php

declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

function listarPedidos(PDO $pdo, ?string $canal = null): array
{
    $sql = 'SELECT p.*, u.nome AS unidade_nome FROM pedidos p LEFT JOIN unidades u ON u.id = p.unidade_id';
    $params = [];
    if ($canal !== null && $canal !== '') { $sql .= ' WHERE p.canalPedido = ?'; $params[] = strtoupper($canal); }
    $sql .= ' ORDER BY p.criado_em DESC, p.id DESC';
    $stmt = $pdo->prepare($sql); $stmt->execute($params);
    return $stmt->fetchAll();
}

if (method() === 'GET') {
    $canal = cleanString($_GET['canalPedido'] ?? '');
    if ($canal !== '' && !in_array(strtoupper($canal), ['APP', 'TOTEM', 'BALCAO', 'PICKUP', 'WEB'], true)) {
        jsonResponse(['success' => false, 'message' => 'canalPedido inválido.'], 422);
    }
    $response = ['success' => true, 'data' => listarPedidos($pdo, $canal)];
    if ($canal !== '') $response['filtro'] = strtoupper($canal);
    jsonResponse($response);
}

if (method() === 'POST') {
    $data = input();
    $unitId = positiveInt($data['unidade_id'] ?? 0);
    $name = cleanString($data['cliente_nome'] ?? '');
    $channel = strtoupper(cleanString($data['canalPedido'] ?? ''));
    $total = decimal($data['valor_total'] ?? 0);
    if ($unitId <= 0 || $name === '' || $channel === '' || $total <= 0) jsonResponse(['success' => false, 'message' => 'Informe unidade_id, cliente_nome, canalPedido e valor_total.'], 400);
    if (!in_array($channel, ['APP', 'TOTEM', 'BALCAO', 'PICKUP', 'WEB'], true)) jsonResponse(['success' => false, 'message' => 'canalPedido inválido. Use APP, TOTEM, BALCAO, PICKUP ou WEB.'], 400);

    $clientId = positiveInt($data['cliente_id'] ?? 0);
    if ($clientId <= 0) {
        $email = 'pedido_' . date('YmdHis') . '_' . random_int(100, 999) . '@local';
        $stmt = $pdo->prepare("INSERT INTO clientes (nome, telefone, email, senha, perfil) VALUES (?, ?, ?, ?, 'cliente')");
        $stmt->execute([$name, cleanString($data['cliente_telefone'] ?? ''), $email, password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT)]);
        $clientId = (int) $pdo->lastInsertId();
    }
    $number = 'PED-' . date('YmdHis') . '-' . random_int(100, 999);
    $stmt = $pdo->prepare("INSERT INTO pedidos (numero, cliente_id, unidade_id, cliente_nome, cliente_telefone, canalPedido, forma_pagamento, subtotal, valor_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$number, $clientId, $unitId, $name, cleanString($data['cliente_telefone'] ?? ''), $channel, cleanString($data['forma_pagamento'] ?? 'Não informado'), $total, $total]);
    jsonResponse(['success' => true, 'message' => 'Pedido registrado com sucesso!', 'id' => $pdo->lastInsertId()], 201);
}

jsonResponse(['success' => false, 'message' => 'Método não permitido.'], 405);
