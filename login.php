<?php
header('Content-Type: application/json');
session_start();
require 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Por favor, preencha usuário e senha.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, password, balance, tax_rate FROM players WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        // Regenera ID de sessão para prevenir ataques de fixação de sessão
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $username;
        $_SESSION['balance'] = $user['balance'];
        $_SESSION['tax_rate'] = $user['tax_rate'];
        
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Usuário ou senha inválidos']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>