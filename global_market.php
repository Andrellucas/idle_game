<?php
header('Content-Type: application/json');
require 'config.php';

try {
    // Configuração dos parâmetros de ajuste de preço baseado na oferta
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
    
    // Obter a quantidade total de cada recurso disponível em todo o jogo
    $stmt = $pdo->prepare("
        SELECT 
            r.resource_name AS recurso,
            COALESCE(SUM(r.quantity), 0) AS quantidade_total,
            COALESCE(
                (SELECT price FROM global_market 
                 WHERE resource_name = r.resource_name 
                 ORDER BY timestamp DESC LIMIT 1), 
                CASE 
                    WHEN r.resource_name = 'Madeira' THEN 5
                    WHEN r.resource_name = 'Pedra' THEN 7
                    WHEN r.resource_name = 'Ferro' THEN 10
                    WHEN r.resource_name = 'Trigo' THEN 3
                    WHEN r.resource_name = 'Ouro' THEN 50
                    WHEN r.resource_name = 'Tábuas' THEN 15
                    WHEN r.resource_name = 'Carvão' THEN 8
                    WHEN r.resource_name = 'Tijolos' THEN 12
                    WHEN r.resource_name = 'BarraFerro' THEN 25
                    ELSE 5
                END
            ) AS preco_atual
        FROM player_resources r
        GROUP BY r.resource_name
    ");
    $stmt->execute();
    $resources = $stmt->fetchAll();
    
    $marketData = [];
    
    foreach ($resources as $resource) {
        $nome = $resource['recurso'];
        $quantidade = $resource['quantidade_total'];
        $precoAtual = $resource['preco_atual'];
        
        // Calcular o novo preço baseado na oferta
        if (array_key_exists($nome, $baseQuantities)) {
            $baseQuantity = $baseQuantities[$nome];
            $basePrice = $baselinePrices[$nome];
            
            // Fórmula de ajuste de preço:
            // - Quando quantidade = baseQuantity, preço = preço base
            // - Quando quantidade > baseQuantity, preço diminui (lei da oferta e demanda)
            // - Quando quantidade < baseQuantity, preço aumenta
            
            // Fator de elasticidade (quanto maior, mais sensível à oferta)
            $elasticity = 0.5;
            
            // Razão entre quantidade atual e quantidade base
            $ratio = $quantidade / $baseQuantity;
            
            // Ajuste logarítmico para suavizar mudanças extremas
            $priceMultiplier = pow(1 / $ratio, $elasticity);
            
            // Limitador para evitar preços irrealistas
            $priceMultiplier = min(max($priceMultiplier, 0.5), 2.0);
            
            // Blend entre preço atual e preço calculado (para evitar mudanças bruscas)
            $novoPreco = ($precoAtual * 0.8) + ($basePrice * $priceMultiplier * 0.2);
            
            // Evitar preços negativos ou zero
            $novoPreco = max($novoPreco, $basePrice * 0.2);
            
            // Atualizar o preço no mercado global
            $stmt = $pdo->prepare("
                INSERT INTO global_market (resource_name, quantity, price)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$nome, $quantidade, $novoPreco]);
            
            // Preparar dados para retornar ao cliente
            $marketData[] = [
                'recurso' => $nome,
                'quantidade_total' => $quantidade,
                'preco_medio' => $novoPreco
            ];
        }
    }
    
    // Se não houver dados para alguns recursos, adicionar com valores padrão
    foreach ($baselinePrices as $nome => $preco) {
        $found = false;
        foreach ($marketData as $item) {
            if ($item['recurso'] === $nome) {
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            $marketData[] = [
                'recurso' => $nome,
                'quantidade_total' => $baseQuantities[$nome] * 0.1, // Quantidade inicial baixa
                'preco_medio' => $preco * 1.5 // Preço inicial mais alto por escassez
            ];
            
            // Inserir no mercado global
            $stmt = $pdo->prepare("
                INSERT INTO global_market (resource_name, quantity, price)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$nome, $baseQuantities[$nome] * 0.1, $preco * 1.5]);
        }
    }
    
    echo json_encode($marketData, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro no banco de dados: ' . $e->getMessage()]);
}
?>