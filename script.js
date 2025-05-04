// Configurações iniciais do jogo
const CONFIG = {
  resources: {
    "Madeira": { category: "primary", basePrice: 5 },
    "Pedra": { category: "primary", basePrice: 7 },
    "Ferro": { category: "primary", basePrice: 10 },
    "Trigo": { category: "primary", basePrice: 3 },
    "Ouro": { category: "primary", basePrice: 50 },

    // Recursos Secundários (exigem receita e fábrica)
    "Tábuas": {
      category: "secondary",
      recipe: { "Madeira": 10 },
      requiredFactory: "Carpintaria",
      basePrice: 15
    },
    "Carvão": {
      category: "secondary",
      recipe: { "Madeira": 20 },
      requiredFactory: "Fornalha",
      basePrice: 8
    },
    "Tijolos": {
      category: "secondary",
      recipe: { "Pedra": 15 },
      requiredFactory: "Olaria",
      basePrice: 12
    },
    "BarraFerro": {
      category: "secondary",
      recipe: { "Ferro": 5 },
      requiredFactory: "Fundição",
      basePrice: 25
    }
  },

  factories: {
    "Madeireira": {
      produces: "Madeira",
      production: 1,
      cost: { "Madeira": 50 }
    },
    "Pedreira": {
      produces: "Pedra",
      production: 0.5,
      cost: { "Madeira": 100 }
    },
    "Carpintaria": {
      produces: "Tábuas",
      production: 0.2,
      cost: { "Madeira": 200 }
    },
    "Fornalha": {
      produces: "Carvão",
      production: 0.3,
      cost: { "Tábuas": 50 }
    },
    "Olaria": {
      produces: "Tijolos",
      production: 0.25,
      cost: { "Pedra": 100, "Madeira": 50 }
    },
    "Fundição": {
      produces: "BarraFerro",
      production: 0.1,
      cost: { "Ferro": 50, "Carvão": 20 }
    }
  },

  player: {
    balance: 0,
    taxRate: 0.1
  }
};

// Estado inicial do jogo
let gameState = {
  resources: {},
  factories: {},
  prices: {},
  history: {},
  categories: { primary: true, secondary: true, factories: true },
  player: {
    balance: CONFIG.player.balance,
    taxRate: CONFIG.player.taxRate
  }
};

// Função de login do usuário
async function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  document.getElementById("loginMessage").textContent = "";
  
  try {
    const response = await fetch('login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Login bem-sucedido: esconde seção de login e mostra jogo
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('game-section').style.display = 'block';
      document.getElementById('playerName').textContent = username;
      // Inicia o jogo
      initGame();
    } else {
      // Exibe mensagem de erro
      document.getElementById("loginMessage").textContent = result.message;
    }
  } catch (error) {
    console.error('Erro no login:', error);
    document.getElementById("loginMessage").textContent = "Erro no login.";
  }
}

// Função de registro de novo usuário
async function registerUser() {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;
  
  if (!username || !password) {
    document.getElementById("registerMessage").textContent = "Preencha todos os campos.";
    return;
  }
  
  document.getElementById("registerMessage").textContent = "";
  
  try {
    const response = await fetch('register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const result = await response.json();
    
    if (result.success) {
      document.getElementById("registerMessage").textContent = "Registrado com sucesso! Redirecionando...";
      // Alterna para tela de login automaticamente
      setTimeout(() => { showLogin(); }, 1500);
    } else {
      document.getElementById("registerMessage").textContent = result.message;
    }
  } catch (error) {
    console.error('Erro no registro:', error);
    document.getElementById("registerMessage").textContent = "Erro no servidor.";
  }
}

// Funções de navegação entre telas
function showRegister() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-section').style.display = 'block';
}

function showLogin() {
  document.getElementById('register-section').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
}

function logout() {
  window.location.href = 'logout.php';
}

// Função para alternar exibição de categorias
function toggleCategory(category) {
  const content = document.getElementById(`${category}Content`);
  const arrow = content.previousElementSibling.querySelector('.arrow');
  
  if (content.classList.contains('visible')) {
    content.classList.remove('visible');
    arrow.textContent = '▶';
  } else {
    content.classList.add('visible');
    arrow.textContent = '▼';
  }
}

// Carrega o estado do jogo do servidor
async function loadGame() {
  try {
    const response = await fetch('load_game.php');
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const savedData = await response.json();
    
    if (!savedData.success) {
      console.error('Erro ao carregar dados:', savedData.message);
      return;
    }

    // Configura informações do jogador
    gameState.player.balance = savedData.player?.balance ?? CONFIG.player.balance;
    gameState.player.taxRate = savedData.player?.tax_rate ?? CONFIG.player.taxRate;

    // Inicializa recursos do jogo
    Object.keys(CONFIG.resources).forEach(res => {
      gameState.resources[res] = savedData.resources?.[res] ?? 0;
    });

    // Inicializa fábricas (Madeireira é garantida pelo servidor)
    Object.keys(CONFIG.factories).forEach(factory => {
      gameState.factories[factory] = savedData.factories?.[factory] ?? 0;
    });

  } catch (error) {
    console.error('Erro ao carregar jogo:', error);
  }
}

// Salva o estado do jogo no servidor
async function saveGame() {
  try {
    const response = await fetch('save_game.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: gameState.player,
        resources: gameState.resources,
        factories: gameState.factories
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('Erro ao salvar jogo:', result.message);
    }
  } catch (error) {
    console.error('Erro ao salvar jogo:', error);
  }
}

// Lógica de produção de recursos a cada intervalo
function updateProduction() {
  Object.entries(gameState.factories).forEach(([name, qty]) => {
    if (qty > 0 && CONFIG.factories[name]) {
      const factory = CONFIG.factories[name];
      const resourceName = factory.produces;
      
      if (gameState.resources[resourceName] !== undefined) {
        gameState.resources[resourceName] = Number(
          (gameState.resources[resourceName] + (factory.production * qty)).toFixed(2)
        );
      }
    }
  });
}

// Validação de transações
function validateTransaction(resource, quantity, action) {
  if (!['buy', 'sell'].includes(action)) {
    alert('Ação inválida');
    return false;
  }
  
  if (!Number.isInteger(quantity) || quantity <= 0) {
    alert('Quantidade inválida');
    return false;
  }
  
  if (!Object.keys(CONFIG.resources).includes(resource)) {
    alert('Recurso inválido');
    return false;
  }
  
  return true;
}

// Processamento de transações de compra/venda
async function sellResource() {
  const resource = document.getElementById("resourceSelector").value;
  const qty = parseInt(document.getElementById("tradeAmount").value);
  
  if (!validateTransaction(resource, qty, 'sell')) return;
  
  // Verifica se o jogador possui recursos suficientes
  if (gameState.resources[resource] < qty) {
    alert(`Você não possui ${qty} unidades de ${resource}`);
    return;
  }
  
  try {
    const response = await fetch('trade.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sell', resource, quantity: qty })
    });
    
    const result = await response.json();
    
    if (result.success) {
      await loadGame(); // Recarregar dados
      updateUI();
    } else {
      alert(result.message || 'Erro ao vender recurso');
    }
  } catch (error) {
    console.error('Erro na transação:', error);
  }
}

async function buyResource() {
  const resource = document.getElementById("resourceSelector").value;
  const qty = parseInt(document.getElementById("tradeAmount").value);
  
  if (!validateTransaction(resource, qty, 'buy')) return;
  
  try {
    const response = await fetch('trade.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'buy', resource, quantity: qty })
    });
    
    const result = await response.json();
    
    if (result.success) {
      await loadGame();
      updateUI();
    } else {
      alert(result.message || 'Erro ao comprar recurso');
    }
  } catch (error) {
    console.error('Erro na transação:', error);
  }
}

// Atualiza preços do mercado global
async function updatePrices() {
  try {
    const response = await fetch('global_market.php');
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const marketData = await response.json();
    
    if (Array.isArray(marketData)) {
      marketData.forEach(item => {
        const price = parseFloat(item.preco_medio) || 0;
        gameState.prices[item.recurso] = price.toFixed(2);
        
        // Adiciona ao histórico para gráficos
        if (!gameState.history[item.recurso]) {
          gameState.history[item.recurso] = [];
        }
        
        if (gameState.history[item.recurso].length > 30) {
          gameState.history[item.recurso].shift();
        }
        
        gameState.history[item.recurso].push(price);
      });
      
      updateChart();
    }
  } catch (error) {
    console.error('Erro ao buscar preços:', error);
  }
}

// Atualiza a interface do usuário
function updateUI() {
  // Atualiza recursos primários e secundários
  ["primary", "secondary"].forEach(category => {
    const content = document.getElementById(`${category}Content`);
    content.innerHTML = Object.entries(CONFIG.resources)
      .filter(([_, cfg]) => cfg.category === category)
      .map(([name]) => {
        const cantidad = gameState.resources[name] ?? 0;
        
        return `
          <div class="resource-item">
            <span>${name}</span>
            <div>
              <span>${cantidad.toFixed(2)}</span>
              ${category === "secondary" ? `<button onclick="craft('${name}')">🛠️</button>` : ''}
            </div>
          </div>
        `;
      }).join("");
  });

  // Atualiza lista de fábricas
  const factoriesContent = document.getElementById("factoriesContent");
  factoriesContent.innerHTML = Object.entries(CONFIG.factories)
    .map(([name, cfg]) => {
      const currentQty = gameState.factories[name] || 0;
      const production = (cfg.production * currentQty).toFixed(2);
      
      const canBuild = Object.entries(cfg.cost).every(([item, qty]) =>
        (gameState.resources[item] || 0) >= qty
      );
      
      const costText = Object.entries(cfg.cost)
        .map(([r, a]) => `${a} ${r}`)
        .join(", ");
      
      return `
        <div class="resource-item">
          <span>${name} (Produz: ${cfg.produces}/s: ${production})</span>
          <div>
            <span>${currentQty}</span>
            <button onclick="buildFactory('${name}')" ${!canBuild ? 'disabled' : ''}>
              Construir (${costText})
            </button>
          </div>
        </div>`;
    }).join("");

  // Atualiza saldo do jogador
  document.getElementById("balanceValue").textContent =
    Math.floor(gameState.player.balance);
}

// Função para construir fábricas
function buildFactory(factory) {
  const cfg = CONFIG.factories[factory];
  
  const canBuild = Object.entries(cfg.cost).every(([item, qty]) => 
    (gameState.resources[item] || 0) >= qty
  );
  
  if (canBuild) {
    // Consome recursos
    Object.entries(cfg.cost).forEach(([item, qty]) => {
      gameState.resources[item] -= qty;
    });
    
    // Incrementa fábrica
    gameState.factories[factory] = (gameState.factories[factory] || 0) + 1;
    
    // Atualiza interface
    updateUI();
  }
}

// Função para produzir recursos secundários (craft)
function craft(resource) {
  const cfg = CONFIG.resources[resource];
  
  if (!cfg || cfg.category !== 'secondary') {
    return;
  }
  
  if (!gameState.factories[cfg.requiredFactory]) {
    alert(`Requer ${cfg.requiredFactory}!`);
    return;
  }
  
  const canCraft = Object.entries(cfg.recipe).every(([item, qty]) => 
    (gameState.resources[item] || 0) >= qty
  );
  
  if (canCraft) {
    // Consome recursos
    Object.entries(cfg.recipe).forEach(([item, qty]) => {
      gameState.resources[item] -= qty;
    });
    
    // Incrementa recurso produzido
    gameState.resources[resource] = (gameState.resources[resource] || 0) + 1;
    
    // Atualiza interface
    updateUI();
  } else {
    alert(`Recursos insuficientes para produzir ${resource}`);
  }
}


function updateMarketInfo() {
  const selected = document.getElementById("chartSelector").value;
  if (!selected) return;
  
  // Exibe informações adicionais sobre oferta e demanda
  const infoContainer = document.getElementById('marketInfo');
  if (!infoContainer) {
    // Criar contêiner de informações se não existir
    const container = document.createElement('div');
    container.id = 'marketInfo';
    container.className = 'market-info';
    
    // Inserir após o gráfico
    const chartElement = document.getElementById('marketChart');
    chartElement.parentNode.insertBefore(container, chartElement.nextSibling);
  }
  
  // Atualiza as informações
  if (selected && gameState.prices[selected]) {
    const price = parseFloat(gameState.prices[selected]);
    const basePrice = CONFIG.resources[selected].basePrice;
    const ratio = price / basePrice;
    
    let marketStatus = "equilibrado";
    let trend = "estável";
    
    if (ratio > 1.5) {
      marketStatus = "alta demanda";
      trend = "tendência de alta";
    } else if (ratio > 1.1) {
      marketStatus = "demanda moderada";
      trend = "tendência de alta";
    } else if (ratio < 0.7) {
      marketStatus = "excesso de oferta";
      trend = "tendência de baixa";
    } else if (ratio < 0.9) {
      marketStatus = "oferta abundante";
      trend = "tendência de baixa";
    }
    
    document.getElementById('marketInfo').innerHTML = `
      <div class="market-status">
        <p><strong>Recurso:</strong> ${selected}</p>
        <p><strong>Preço Atual:</strong> ${price.toFixed(2)} (${ratio > 1 ? '+' : ''}${((ratio - 1) * 100).toFixed(1)}% do valor base)</p>
        <p><strong>Status do Mercado:</strong> <span class="status-${marketStatus.replace(/\s+/g, '-')}">${marketStatus}</span></p>
        <p><strong>Tendência:</strong> ${trend}</p>
      </div>
    `;
  }
}


// Atualiza gráfico de preço de recursos
function updateChart() {
  const selected = document.getElementById("chartSelector").value;
  if (!selected) return;
  
  const ctx = document.getElementById('marketChart').getContext('2d');
  
  // Destrói gráfico existente se houver
  if (window.chart) {
    window.chart.destroy();
  }
  
  if (selected && gameState.history[selected] && gameState.history[selected].length > 0) {
    window.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: gameState.history[selected].map((_, i) => i),
        datasets: [{
          label: `Preço de ${selected}`,
          data: gameState.history[selected],
          borderColor: 'rgba(46, 204, 113, 1.0)',
          backgroundColor: 'rgba(46, 204, 113, 0.3)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { display: true, title: { display: true, text: 'Tempo' } },
          y: { display: true, title: { display: true, text: 'Preço' } }
        }
      }
    });
    
    // Atualiza informações adicionais
    updateMarketInfo();
  }
}

// Função inicial para configurar o jogo após login
async function initGame() {
  await loadGame();

  // Popula selects de mercado com recursos
  const selectors = ["resourceSelector", "chartSelector"];
  
  selectors.forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = ''; // Limpa opções existentes
    
    if (id === "chartSelector") {
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "-- Selecione Recurso --";
      select.appendChild(defaultOption);
    }
    
    Object.keys(CONFIG.resources).forEach(res => {
      const option = document.createElement("option");
      option.value = res;
      option.textContent = res;
      select.appendChild(option);
    });
  });

  // Atualiza UI inicial
  updateUI();
  
  // Busca preços iniciais
  await updatePrices();

  // Loop principal do jogo: produção, preços, UI e salvar
  setInterval(() => {
    updateProduction();
    updatePrices();
    updateUI();
    saveGame();
  }, 1000);
}