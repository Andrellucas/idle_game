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
$action = $input['action'] ?? ''; // 'buy' ou 'sell'

if (empty($resource) || $quantity <= 0 || !in_array($action, ['buy', 'sell'])) {
    echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos']);
    exit;
}

try {
    // Obtém o preço atual do recurso do mercado global
    $stmt = $pdo->prepare("
        SELECT COALESCE(
            (SELECT price FROM global_market 
             WHERE resource_name = ? 
             ORDER BY timestamp DESC LIMIT 1),
            CASE 
                WHEN ? = 'Madeira' THEN 5
                WHEN ? = 'Pedra' THEN 7
                WHEN ? = 'Ferro' THEN 10
                WHEN ? = 'Trigo' THEN 3
                WHEN ? = 'Ouro' THEN 50
                WHEN ? = 'Tábuas' THEN 15
                WHEN ? = 'Carvão' THEN 8
                WHEN ? = 'Tijolos' THEN 12
                WHEN ? = 'BarraFerro' THEN 25
                ELSE 5
            END
        ) AS price
    ");
    $stmt->execute([$resource, $resource, $resource, $resource, $resource, $resource, $resource, $resource, $resource, $resource]);
    $result = $stmt->fetch();
    $price = $result['price'];
    
    // Calcula o total da transação
    $totalCost = $price * $quantity;

    $pdo->beginTransaction();

    // Busca o saldo do jogador
    $stmt = $pdo->prepare("SELECT balance FROM players WHERE id = ?");
    $stmt->execute([$userId]);
    $player = $stmt->fetch();
    $balance = $player['balance'];

    // Obtém a quantidade total do recurso no mercado (oferta)
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(quantity), 0) AS total_quantity 
        FROM player_resources 
        WHERE resource_name = ?
    ");
    $stmt->execute([$resource]);
    $result = $stmt->fetch();
    $totalQuantity = $result['total_quantity'];

    if ($action === 'buy') {
        // Verifica se o jogador tem dinheiro suficiente
        if ($balance < $totalCost) {
            throw new Exception('Saldo insuficiente para comprar');
        }

        // Atualiza o saldo do jogador
        $stmt = $pdo->prepare("UPDATE players SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$totalCost, $userId]);

        // Adiciona recursos ao jogador
        $stmt = $pdo->prepare("
            INSERT INTO player_resources (player_id, resource_name, quantity) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE quantity = quantity + ?
        ");
        $stmt->execute([$userId, $resource, $quantity, $quantity]);
        
        // Registra a transação
        $stmt = $pdo->prepare("
            INSERT INTO trade_history (player_id, resource_name, quantity, price, trade_type) 
            VALUES (?, ?, ?, ?, 'buy')
        ");
        $stmt->execute([$userId, $resource, $quantity, $price]);
        
        // Atualiza o preço no mercado global (aumenta com base na oferta e demanda)
        // Quanto menor a oferta, maior o aumento de preço
        $demandFactor = 1.0 + (0.03 * $quantity / max($totalQuantity, 1));
        $newPrice = $price * $demandFactor;
        
        // Limita o aumento máximo a 8% por transação
        $newPrice = min($newPrice, $price * 1.08);
        
        $stmt = $pdo->prepare("
            INSERT INTO global_market (resource_name, quantity, price)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$resource, $quantity, $newPrice]);

    } else { // sell
        // Verifica se o jogador tem recursos suficientes
        $stmt = $pdo->prepare("
            SELECT quantity FROM player_resources 
            WHERE player_id = ? AND resource_name = ?
        ");
        $stmt->execute([$userId, $resource]);
        $result = $stmt->fetch();
        
        if (!$result || $result['quantity'] < $quantity) {
            throw new Exception('Quantidade insuficiente para vender');
        }

        // Remove recursos do jogador
        $stmt = $pdo->prepare("
            UPDATE player_resources 
            SET quantity = quantity - ? 
            WHERE player_id = ? AND resource_name = ?
        ");
        $stmt->execute([$quantity, $userId, $resource]);

        // Adiciona dinheiro ao jogador
        $stmt = $pdo->prepare("UPDATE players SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$totalCost, $userId]);
        
        // Registra a transação
        $stmt = $pdo->prepare("
            INSERT INTO trade_history (player_id, resource_name, quantity, price, trade_type) 
            VALUES (?, ?, ?, ?, 'sell')
        ");
        $stmt->execute([$userId, $resource, $quantity, $price]);
        
        // Atualiza o preço no mercado global (diminui com base na oferta e demanda)
        // Quanto maior a oferta, maior a queda de preço
        $supplyFactor = 1.0 - (0.02 * $quantity / max($totalQuantity, 1));
        $newPrice = $price * $supplyFactor;
        
        // Limita a diminuição máxima a 7% por transação
        $newPrice = max($newPrice, $price * 0.93);
        
        $stmt = $pdo->prepare("
            INSERT INTO global_market (resource_name, quantity, price)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$resource, $quantity, $newPrice]);
    }

    $pdo->commit();
    
    // Retorna os dados atualizados
    echo json_encode([
        'success' => true, 
        'price' => $price,
        'total' => $totalCost,
        'new_balance' => $action === 'buy' ? $balance - $totalCost : $balance + $totalCost
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>