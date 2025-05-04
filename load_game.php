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

try {
    // Busca informações do jogador
    $stmt = $pdo->prepare("SELECT balance, tax_rate FROM players WHERE id = ?");
    $stmt->execute([$userId]);
    $player = $stmt->fetch();
    
    if (!$player) {
        throw new Exception("Jogador não encontrado");
    }
    
    // Busca recursos do jogador
    $stmt = $pdo->prepare("SELECT resource_name, quantity FROM player_resources WHERE player_id = ?");
    $stmt->execute([$userId]);
    $resources = [];
    while ($row = $stmt->fetch()) {
        $resources[$row['resource_name']] = floatval($row['quantity']);
    }
    
    // Busca fábricas do jogador
    $stmt = $pdo->prepare("SELECT factory_name, quantity FROM player_factories WHERE player_id = ?");
    $stmt->execute([$userId]);
    $factories = [];
    while ($row = $stmt->fetch()) {
        $factories[$row['factory_name']] = intval($row['quantity']);
    }
    
    // Se o jogador não tem a Madeireira, adiciona uma
    if (!isset($factories['Madeireira']) || $factories['Madeireira'] < 1) {
        $factories['Madeireira'] = 1;
        $stmt = $pdo->prepare("INSERT INTO player_factories (player_id, factory_name, quantity) 
                               VALUES (?, 'Madeireira', 1) 
                               ON DUPLICATE KEY UPDATE quantity = 1");
        $stmt->execute([$userId]);
    }
    
    echo json_encode([
        'success' => true,
        'player' => [
            'balance' => floatval($player['balance']),
            'tax_rate' => floatval($player['tax_rate'])
        ],
        'resources' => $resources,
        'factories' => $factories
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>