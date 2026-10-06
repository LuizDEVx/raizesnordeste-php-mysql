<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Lista todos os pagamentos registrados
    $stmt = $pdo->query("SELECT * FROM pagamentos");
    $pagamentos = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $pagamentos], JSON_UNESCAPED_UNICODE);
}
elseif ($method === 'POST') {
    $data = input();

    $pedidoId = positiveInt($data['pedido_id'] ?? 0);
    $formaPagamento = cleanString($data['forma_pagamento'] ?? '');
    $valor = decimal($data['valor'] ?? 0);
    $status = strtoupper(cleanString($data['status'] ?? 'APROVADO'));

    // Validação dos campos obrigatórios
    if ($pedidoId <= 0 || $formaPagamento === '' || $valor <= 0) {
        jsonResponse([
            'success' => false,
            'message' => 'Campos obrigatórios faltando: informe pedido_id, forma_pagamento e valor.'
        ], 400);
    }

    // Verifica se o pedido existe
    $stmt = $pdo->prepare(
        "SELECT id, valor_total FROM pedidos WHERE id = ?"
    );
    $stmt->execute([$pedidoId]);
    $pedido = $stmt->fetch();

    if (!$pedido) {
        jsonResponse([
            'success' => false,
            'message' => 'Pedido não encontrado.'
        ], 404);
    }

    // Aceita apenas os status previstos
    if (!in_array($status, ['APROVADO', 'RECUSADO'], true)) {
        jsonResponse([
            'success' => false,
            'message' => 'Status de pagamento inválido.'
        ], 400);
    }

    // Registra o pagamento
    $stmt = $pdo->prepare(
        "INSERT INTO pagamentos
        (pedido_id, forma_pagamento, valor, status)
        VALUES (?, ?, ?, ?)"
    );

    $stmt->execute([
        $pedidoId,
        $formaPagamento,
        $valor,
        $status
    ]);

    // Atualiza o status do pedido conforme o resultado do pagamento
    $novoStatus = $status === 'APROVADO'
        ? 'Confirmado'
        : 'Cancelado';

    $stmt = $pdo->prepare(
        "UPDATE pedidos SET status = ? WHERE id = ?"
    );

    $stmt->execute([
        $novoStatus,
        $pedidoId
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'Pagamento registrado com sucesso!',
        'pagamento_id' => $pdo->lastInsertId(),
        'pedido_id' => $pedidoId,
        'status_pagamento' => $status,
        'status_pedido' => $novoStatus
    ], 201);
}
else {
    jsonResponse([
        'success' => false,
        'message' => 'Método não permitido.'
    ], 405);
}
