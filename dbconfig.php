<?php

declare(strict_types=1);

/**
 * Configuração local MySQL/MariaDB.
 * Ajuste os valores abaixo conforme seu ambiente.
 */
$dbHost = '127.0.0.1';
$dbPort = '3306';
$dbName = 'raizesnordeste';
$dbUser = 'root';
$dbPass = '';

$dbCharset = 'utf8mb4';

$dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset={$dbCharset}";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
} catch (PDOException $exception) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Não foi possível conectar ao banco de dados. Verifique o dbconfig.php.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
