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
    $stmt = $pdo->prepare("SELECT id FROM players WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Nome de usuário já está em uso.']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $pdo->beginTransaction();
    
    // Insere o jogador
    $stmt = $pdo->prepare("INSERT INTO players (username, password, balance, tax_rate) VALUES (?, ?, 0, 0.10)");
    $stmt->execute([$username, $passwordHash]);
    $playerId = $pdo->lastInsertId();
    
    // Inicializa recursos padrão
    $resources = ['Madeira', 'Pedra', 'Ferro', 'Trigo', 'Ouro', 'Tábuas', 'Carvão', 'Tijolos', 'BarraFerro'];
    foreach ($resources as $resource => $quantity) {
        $stmt = $pdo->prepare("INSERT INTO player_resources (player_id, resource_name, quantity) VALUES (?, ?, ?)");
        $stmt->execute([$playerId, $resource, $quantity]);
      }
    
    // Inicializa a primeira fábrica padrão (Madeireira)
    $stmt = $pdo->prepare("INSERT INTO player_factories (player_id, factory_name, quantity) VALUES (?, 'Madeireira', 1)");
    $stmt->execute([$playerId]);
    
    $pdo->commit();
    
    $_SESSION['user_id'] = $playerId;
    $_SESSION['username'] = $username;
    $_SESSION['balance'] = 0;
    $_SESSION['tax_rate'] = 0.10;

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>