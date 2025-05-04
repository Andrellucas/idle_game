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
$input = json_decode(file_get_contents('php://input'), true);

$resource = $input['resource'] ?? '';
$quantity = intval($input['quantity'] ?? 0);
$action = $input['action'] ?? '';

if (empty($resource) || $quantity <= 0 || !in_array($action, ['buy', 'sell'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos']);
    exit;
}

try {
    // Obtém o preço atual do recurso
    $stmt = $pdo->prepare("
        SELECT COALESCE(
            (SELECT price FROM global_market 
             WHERE resource_name = ? 
             ORDER BY timestamp DESC LIMIT 1),
            (SELECT basePrice FROM resources_config WHERE resource_name = ?)
        ) AS price
    ");
    $stmt->execute([$resource, $resource]);
    $result = $stmt->fetch();
    $price = $result['price'];
    $totalCost = $price * $quantity;

    $pdo->beginTransaction();

    // Atualiza saldo do jogador
    $stmt = $pdo->prepare("SELECT balance FROM players WHERE id = ?");
    $stmt->execute([$userId]);
    $player = $stmt->fetch();
    $balance = $player['balance'];

    if ($action === 'buy') {
        $newPrice = min($price * 1.03, $price + ($price * 0.01 * $quantity));
        if ($balance < $totalCost) {
            throw new Exception('Saldo insuficiente');
        }

        $stmt = $pdo->prepare("UPDATE players SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$totalCost, $userId]);

        // Adiciona recurso ao jogador
        $stmt = $pdo->prepare("
            INSERT INTO player_resources (player_id, resource_name, quantity) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE quantity = quantity + ?
        ");
        $stmt->execute([$userId, $resource, $quantity, $quantity]);

        // Atualiza preço global (demanda)
        $newPrice = min($price * 1.08, $price * (1 + (0.03 * $quantity / max(1, $quantity))));
    } else {
        $newPrice = max($price * 0.97, $price - ($price * 0.008 * $quantity));
        // Verifica estoque
        $stmt = $pdo->prepare("SELECT quantity FROM player_resources WHERE player_id = ? AND resource_name = ?");
        $stmt->execute([$userId, $resource]);
        $stock = $stmt->fetch();
        
        if (!$stock || $stock['quantity'] < $quantity) {
            throw new Exception('Recursos insuficientes');
        }

        // Remove recursos e adiciona saldo
        $stmt = $pdo->prepare("UPDATE player_resources SET quantity = quantity - ? WHERE player_id = ? AND resource_name = ?");
        $stmt->execute([$quantity, $userId, $resource]);
        $stmt = $pdo->prepare("UPDATE players SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$totalCost, $userId]);

        // Atualiza preço global (oferta)
        $newPrice = max($price * 0.93, $price * (1 - (0.02 * $quantity / max(1, $quantity))));
    }

    // Registra transação
    $stmt = $pdo->prepare("
        INSERT INTO trade_history (player_id, resource_name, quantity, price, trade_type)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $resource, $quantity, $price, $action]);

    // Atualiza mercado global
    $stmt = $pdo->prepare("INSERT INTO global_market (resource_name, quantity, price) VALUES (?, ?, ?)");
    $stmt->execute([$resource, ($action === 'buy' ? $quantity : -$quantity), $newPrice]);

    $pdo->commit();
    echo json_encode(['success' => true, 'new_balance' => $action === 'buy' ? $balance - $totalCost : $balance + $totalCost]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>