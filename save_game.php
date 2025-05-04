<?php
header('Content-Type: application/json');
session_start();
require 'config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}

$userId = $_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['resources']) || !isset($data['factories']) || !isset($data['player'])) {
    echo json_encode(['success' => false, 'message' => 'Dados incompletos']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // Atualiza informações do jogador
    $stmt = $pdo->prepare("UPDATE players SET balance = ?, tax_rate = ? WHERE id = ?");
    $stmt->execute([
        $data['player']['balance'],
        $data['player']['tax_rate'],
        $userId
    ]);

    // Atualiza recursos
    foreach ($data['resources'] as $resource => $quantity) {
        $stmt = $pdo->prepare("INSERT INTO player_resources (player_id, resource_name, quantity) 
                              VALUES (?, ?, ?) 
                              ON DUPLICATE KEY UPDATE quantity = ?");
        $stmt->execute([$userId, $resource, $quantity, $quantity]);
    }

    // Atualiza fábricas
    foreach ($data['factories'] as $factory => $quantity) {
        $stmt = $pdo->prepare("INSERT INTO player_factories (player_id, factory_name, quantity) 
                              VALUES (?, ?, ?) 
                              ON DUPLICATE KEY UPDATE quantity = ?");
        $stmt->execute([$userId, $factory, $quantity, $quantity]);
    }

    $pdo->commit();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Erro ao salvar: ' . $e->getMessage()]);
}
?>