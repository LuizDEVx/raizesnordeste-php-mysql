<?php

declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../dbconfig.php';

set_exception_handler(static function (Throwable $exception): void {
    error_log($exception->__toString());
    jsonResponse([
        'success' => false,
        'message' => 'Erro interno da API. Consulte o log do PHP para mais detalhes.',
    ], 500);
});

function jsonResponse(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function input(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return $_POST ?: [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function currentUser(): ?array
{
    return $_SESSION['user'] ?? null;
}

function requireAuth(): array
{
    $user = currentUser();
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Usuário não autenticado.'], 401);
    }
    return $user;
}

function requireRole(string $role): array
{
    $user = requireAuth();
    if (($user['role'] ?? null) !== $role) {
        jsonResponse(['success' => false, 'message' => 'Acesso não autorizado.'], 403);
    }
    return $user;
}

function method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function cleanString(mixed $value): string
{
    return trim((string) ($value ?? ''));
}

function decimal(mixed $value): float
{
    return round((float) ($value ?? 0), 2);
}

function positiveInt(mixed $value): int
{
    return max(0, (int) ($value ?? 0));
}
