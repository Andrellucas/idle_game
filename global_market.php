<?php
header('Content-Type: application/json');
require 'config.php';

try {
    // Query corrigida para usar basePrice da tabela resources_config
    $stmt = $pdo->prepare("
        SELECT 
            rc.resource_name,
            COALESCE(SUM(gm.quantity), 0) AS total_quantity,
            COALESCE(
                (SELECT price FROM global_market 
                WHERE resource_name = rc.resource_name 
                ORDER BY timestamp DESC LIMIT 1),
                rc.basePrice
            ) AS current_price,
            rc.basePrice
        FROM resources_config rc
        LEFT JOIN global_market gm ON rc.resource_name = gm.resource_name
        GROUP BY rc.resource_name
    ");
    
    $stmt->execute();
    $marketData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [];
    foreach ($marketData as $item) {
        $response[] = [
            'resource' => $item['resource_name'],
            'total_quantity' => (int)$item['total_quantity'],
            'current_price' => round($item['current_price'], 2),
            'base_price' => $item['basePrice'] // Usando a coluna correta
        ];
    }

    echo json_encode($response);

} catch (PDOException $e) {
    error_log("Market Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao carregar dados. Tente recarregar a página.']);
}
?>