<?php

declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
requireRole('admin');

$metrics = $pdo->query("SELECT
    (SELECT COUNT(*) FROM pedidos) total_pedidos,
    (SELECT COUNT(*) FROM pedidos WHERE status NOT IN ('Concluído','Cancelado')) pedidos_abertos,
    (SELECT COALESCE(SUM(estoque), 0) FROM produtos WHERE ativo = 1) estoque_produtos,
    (SELECT COUNT(*) FROM estoque_cozinha WHERE quantidade <= estoque_minimo) estoque_baixo,
    (SELECT COALESCE(SUM(quantidade * custo_unitario), 0) FROM estoque_cozinha) valor_estoque,
    (SELECT COALESCE(SUM(valor_total), 0) FROM pedidos WHERE status <> 'Cancelado') receita")->fetch();
$recentOrders = $pdo->query('SELECT id, numero, cliente_nome, valor_total, status, criado_em FROM pedidos ORDER BY criado_em DESC, id DESC LIMIT 4')->fetchAll();
$recentMovements = $pdo->query('SELECT id, item_nome, tipo, quantidade, unidade, observacao, criado_em FROM movimentacoes_estoque ORDER BY criado_em DESC, id DESC LIMIT 5')->fetchAll();
$lowStock = $pdo->query('SELECT id, nome, quantidade, estoque_minimo, unidade FROM estoque_cozinha WHERE quantidade <= estoque_minimo ORDER BY quantidade, nome LIMIT 20')->fetchAll();

jsonResponse([
    'success' => true,
    'metrics' => ['totalOrders' => (int) $metrics['total_pedidos'], 'openOrders' => (int) $metrics['pedidos_abertos'], 'productStock' => (int) $metrics['estoque_produtos'], 'lowStockItems' => (int) $metrics['estoque_baixo'], 'inventoryValue' => (float) $metrics['valor_estoque'], 'revenue' => (float) $metrics['receita']],
    'recentOrders' => array_map(static fn(array $row): array => ['id' => (int) $row['id'], 'number' => $row['numero'], 'customerName' => $row['cliente_nome'], 'total' => (float) $row['valor_total'], 'status' => $row['status'], 'createdAt' => $row['criado_em']], $recentOrders),
    'recentMovements' => array_map(static fn(array $row): array => ['id' => (int) $row['id'], 'itemName' => $row['item_nome'], 'type' => $row['tipo'], 'quantity' => (float) $row['quantidade'], 'unit' => $row['unidade'], 'note' => $row['observacao'], 'createdAt' => $row['criado_em']], $recentMovements),
    'lowStock' => array_map(static fn(array $row): array => ['id' => (int) $row['id'], 'name' => $row['nome'], 'quantity' => (float) $row['quantidade'], 'minStock' => (float) $row['estoque_minimo'], 'unit' => $row['unidade']], $lowStock),
]);
