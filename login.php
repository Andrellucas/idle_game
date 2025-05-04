<?php
header('Content-Type: application/json');
session_start();
require 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Preencha usuário e senha']);
    exit;
}

try {
    // Verificação de tentativas falhadas
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS attempts 
        FROM login_attempts 
        WHERE ip = ? AND timestamp > NOW() - INTERVAL 15 MINUTE
    ");
    $stmt->execute([$_SERVER['REMOTE_ADDR']]);
    $attempts = $stmt->fetch()['attempts'];

    if ($attempts > 5) {
        http_response_code(429);
        echo json_encode(['success' => false, 'message' => 'Muitas tentativas. Tente mais tarde.']);
        exit;
    }

    // Query corrigida (removido filtro de last_login)
    $stmt = $pdo->prepare("
        SELECT id, password, balance, tax_rate 
        FROM players 
        WHERE username = ?
    ");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $username;
        
        // Atualiza último login
        $pdo->prepare("UPDATE players SET last_login = NOW() WHERE id = ?")
            ->execute([$user['id']]);
        
        // Limpa tentativas falhadas
        $pdo->prepare("DELETE FROM login_attempts WHERE ip = ?")
            ->execute([$_SERVER['REMOTE_ADDR']]);
        
        echo json_encode(['success' => true]);
    } else {
        // Registra tentativa falhada
        $pdo->prepare("INSERT INTO login_attempts (ip, username) VALUES (?, ?)")
            ->execute([$_SERVER['REMOTE_ADDR'], $username]);
        
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Usuário ou senha inválidos']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro no servidor']);
}
?>