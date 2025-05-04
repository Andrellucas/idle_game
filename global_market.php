<?php
header('Content-Type: application/json');
session_start();
require 'config.php';

try {
    // Parâmetros do mercado
    $baseQuantities = [
        'Madeira' => 5000,
        'Pedra' => 3000,
        'Ferro' => 2000,
        'Trigo' => 4000,
        'Ouro' => 500,
        'Tábuas' => 1500,
        'Carvão' => 2000,
        'Tijolos' => 1000,
        'BarraFerro' => 800
    ];
    
    $baselinePrices = [
        'Madeira' => 5,
        'Pedra' => 7,
        'Ferro' => 10,
        'Trigo' => 3,
        'Ouro' => 50,
        'Tábuas' => 15,
        'Carvão' => 8,
        'Tijolos' => 12,
        'BarraFerro' => 25
    ];

    // Limpar registros antigos (opcional: manter apenas últimas 7 dias)
    $cleanup = $pdo->prepare("DELETE FROM global_market WHERE timestamp < NOW() - INTERVAL 7 DAY");
    $cleanup->execute();

    // Obter quantidades totais
    $stmt = $pdo->prepare(
        "SELECT resource_name AS recurso, COALESCE(SUM(quantity),0) AS quantidade_total FROM player_resources GROUP BY resource_name"
    );
    $stmt->execute();
    $resources = $stmt->fetchAll();
    $resourceQuantities = [];
    foreach ($resources as $r) {
        $resourceQuantities[$r['recurso']] = (float)$r['quantidade_total'];
    }

    // Obter preços mais recentes via join (evita uso de (col1,col2) IN)
    $stmt = $pdo->prepare(
        "SELECT gm.resource_name, gm.price
         FROM global_market gm
         JOIN (
             SELECT resource_name, MAX(timestamp) AS max_ts
             FROM global_market GROUP BY resource_name
         ) sub ON gm.resource_name = sub.resource_name AND gm.timestamp = sub.max_ts"
    );
    $stmt->execute();
    $priceResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $currentPrices = [];
    foreach ($priceResults as $pr) {
        $currentPrices[$pr['resource_name']] = (float)$pr['price'];
    }

    $marketData = [];
    $pdo->beginTransaction();
    $insert = $pdo->prepare(
        "INSERT INTO global_market (resource_name, quantity, price) VALUES (?, ?, ?)"
    );

    foreach ($baselinePrices as $nome => $precoBase) {
        $quantidade = $resourceQuantities[$nome] ?? 0;
        $precoAtual = $currentPrices[$nome] ?? $precoBase;
        $baseQuantity = $baseQuantities[$nome] ?? 1;

        // Cálculo de oferta e demanda
        $ratio = max($quantidade,1) / max($baseQuantity,1);
        $priceMultiplier = pow(1 / $ratio, 0.5);
        $priceMultiplier = min(max($priceMultiplier, 0.5), 2.0);

        // Ponderar entre preço atual e base
        $novoPreco = ($precoAtual * 0.8) + ($precoBase * $priceMultiplier * 0.2);
        $novoPreco = max($novoPreco, $precoBase * 0.2);

        // Registrar novo preço
        $insert->execute([$nome, $quantidade, $novoPreco]);

        $marketData[] = [
            'recurso' => $nome,
            'quantidade_total' => $quantidade,
            'preco_medio' => round($novoPreco, 4)
        ];
    }

    $pdo->commit();

    echo json_encode($marketData, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Erro no banco de dados: ' . $e->getMessage()]);
}
?>
