// Configurações iniciais do jogo
const CONFIG = {
  resources: {
    "Madeira": { category: "primary", basePrice: 5 },
    "Pedra": { category: "primary", basePrice: 7 },
    "Ferro": { category: "primary", basePrice: 10 },
    "Trigo": { category: "primary", basePrice: 3 },
    "Ouro": { category: "primary", basePrice: 50 },
    "Tábuas": { category: "secondary", recipe: { "Madeira": 10 }, requiredFactory: "Carpintaria", basePrice: 15 },
    "Carvão": { category: "secondary", recipe: { "Madeira": 20 }, requiredFactory: "Fornalha", basePrice: 8 },
    "Tijolos": { category: "secondary", recipe: { "Pedra": 15 }, requiredFactory: "Olaria", basePrice: 12 },
    "BarraFerro": { category: "secondary", recipe: { "Ferro": 5 }, requiredFactory: "Fundição", basePrice: 25 }
  },
  factories: {
    "Madeireira": { produces: "Madeira", production: 1, cost: { "Madeira": 50 } },
    "Pedreira": { produces: "Pedra", production: 0.5, cost: { "Madeira": 100 } },
    "Carpintaria": { produces: "Tábuas", production: 0.2, cost: { "Madeira": 200 } },
    "Fornalha": { produces: "Carvão", production: 0.3, cost: { "Tábuas": 50 } },
    "Olaria": { produces: "Tijolos", production: 0.25, cost: { "Pedra": 100, "Madeira": 50 } },
    "Fundição": { produces: "BarraFerro", production: 0.1, cost: { "Ferro": 50, "Carvão": 20 } }
  },
  player: { balance: 0, taxRate: 0.1 }
};

// Estado inicial do jogo
let gameState = {
  resources: {}, factories: {}, prices: {}, history: {}, globalSupply: {},
  categories: { primary: true, secondary: true, factories: true },
  player: { balance: CONFIG.player.balance, taxRate: CONFIG.player.taxRate }
};

// Funções de autenticação
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
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('game-section').style.display = 'block';
      document.getElementById('playerName').textContent = username;
      initGame();
    } else {
      document.getElementById("loginMessage").textContent = result.message;
    }
  } catch (error) {
    console.error('Erro no login:', error);
    document.getElementById("loginMessage").textContent = "Erro no login.";
  }
}

async function registerUser() {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;
  
  if (!username || !password) {
    document.getElementById("registerMessage").textContent = "Preencha todos os campos.";
    return;
  }
  
  try {
    const response = await fetch('register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const result = await response.json();
    
    if (result.success) {
      document.getElementById("registerMessage").textContent = "Registrado com sucesso! Redirecionando...";
      setTimeout(showLogin, 1500);
    } else {
      document.getElementById("registerMessage").textContent = result.message;
    }
  } catch (error) {
    console.error('Erro no registro:', error);
    document.getElementById("registerMessage").textContent = "Erro no servidor.";
  }
}

// Navegação
const showRegister = () => {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-section').style.display = 'block';
}

const showLogin = () => {
  document.getElementById('register-section').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
}

const logout = () => window.location.href = 'logout.php';

// Interface
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

// Funções de jogo
async function loadGame() {
  try {
    const response = await fetch('load_game.php');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const savedData = await response.json();
    if (!savedData.success) {
      console.error('Erro ao carregar dados:', savedData.message);
      return;
    }

    // Carrega dados
    gameState.player.balance = savedData.player?.balance ?? CONFIG.player.balance;
    gameState.player.taxRate = savedData.player?.tax_rate ?? CONFIG.player.taxRate;

    // Inicializa recursos
    Object.keys(CONFIG.resources).forEach(res => {
      gameState.resources[res] = savedData.resources?.[res] ?? 0;
      gameState.history[res] = [];
    });

    // Inicializa fábricas
    Object.keys(CONFIG.factories).forEach(factory => {
      gameState.factories[factory] = savedData.factories?.[factory] ?? 0;
    });
  } catch (error) {
    console.error('Erro ao carregar jogo:', error);
    showNotification('Erro ao carregar dados do jogo', 'error');
  }
}

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

// Transações
function validateTransaction(resource, quantity, action) {
  if (!['buy', 'sell'].includes(action) || !Number.isInteger(quantity) || quantity <= 0 || 
      !Object.keys(CONFIG.resources).includes(resource)) {
    showNotification('Parâmetros inválidos para transação', 'error');
    return false;
  }
  return true;
}

async function handleApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro na requisição');
    }
    return await response.json();
  } catch (error) {
    showNotification(error.message, 'error');
    throw error;
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

function buyResource() {
  tradeResource('buy');
}

function sellResource() {
  tradeResource('sell');
}

async function tradeResource(action) {
  const resource = document.getElementById("resourceSelector").value;
  const qty = parseInt(document.getElementById("tradeAmount").value);
  
  if (!validateTransaction(resource, qty, action)) return;
  
  try {
    const result = await handleApiCall('trade.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, resource, quantity: qty })
    });
    
    if (result.success) {
      if (result.new_balance !== undefined) {
        gameState.player.balance = result.new_balance;
      }
      
      await loadGame();
      updateUI();
      updatePrices();
      showNotification(
        `${action === 'buy' ? 'Compra' : 'Venda'} realizada: ${qty} ${resource}`,
        'success'
      );
    }
  } catch (error) {
    console.error('Erro na transação:', error);
  }
}

// Atualização do mercado
async function updatePrices() {
  try {
    const response = await fetch('global_market.php');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const marketData = await response.json();
    
    marketData.forEach(item => {
      if (!item.resource) return;
      
      const resourceName = item.resource;
      gameState.prices[resourceName] = item.current_price;
      gameState.globalSupply[resourceName] = item.total_quantity;
      
      if (!gameState.history[resourceName]) {
        gameState.history[resourceName] = [];
      }
      
      if (gameState.history[resourceName].length >= 20) {
        gameState.history[resourceName].shift();
      }
      
      gameState.history[resourceName].push(item.current_price);
    });
    
    updateMarketSelectors();
    updateChart();
  } catch (error) {
    console.error('Erro ao atualizar preços:', error);
    showNotification('Erro ao atualizar preços do mercado', 'error');
  }
}

function updateMarketSelectors() {
  const selector = document.getElementById('resourceSelector');
  if (!selector) return;
  
  selector.innerHTML = Object.keys(CONFIG.resources)
    .map(res => `<option value="${res}">${res} (${gameState.prices[res]?.toFixed(2) || '0.00'})</option>`)
    .join('');
}

// Interface do usuário
function updateUI() {
  // Atualiza recursos 
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

  // Atualiza fábricas
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

  // Atualiza saldo
  document.getElementById("balanceValue").textContent = Math.floor(gameState.player.balance);
}

// Ações do jogador
function buildFactory(factory) {
  const cfg = CONFIG.factories[factory];
  const canBuild = Object.entries(cfg.cost).every(([item, qty]) => 
    (gameState.resources[item] || 0) >= qty
  );

  if (canBuild) {
    Object.entries(cfg.cost).forEach(([item, qty]) => {
      gameState.resources[item] -= qty;
    });
    gameState.factories[factory] = (gameState.factories[factory] || 0) + 1;
    
    saveGame().then(() => {
      updateUI();
    }).catch(error => {
      console.error('Erro ao salvar:', error);
    });
  }
}

function craft(resource) {
  const cfg = CONFIG.resources[resource];
  
  if (!cfg || cfg.category !== 'secondary') return;
  
  if (!gameState.factories[cfg.requiredFactory] || gameState.factories[cfg.requiredFactory] < 1) {
    showNotification(`Requer pelo menos 1 ${cfg.requiredFactory}!`, 'error');
    return;
  }
  
  const canCraft = Object.entries(cfg.recipe).every(([item, qty]) => 
    (gameState.resources[item] || 0) >= qty
  );
  
  if (canCraft) {
    Object.entries(cfg.recipe).forEach(([item, qty]) => {
      gameState.resources[item] -= qty;
    });
    
    gameState.resources[resource] = (gameState.resources[resource] || 0) + 1;
    saveGame().then(updateUI).catch(error => {
      console.error('Erro ao salvar após craft:', error);
    });
  } else {
    showNotification(`Recursos insuficientes para produzir ${resource}`, 'error');
  }
}

function updateMarketInfo() {
  const selected = document.getElementById("chartSelector").value;
  if (!selected) return;
  
  if (selected && gameState.prices[selected]) {
    const price = parseFloat(gameState.prices[selected]);
    const basePrice = CONFIG.resources[selected].basePrice;
    const ratio = price / basePrice;
    
    // Status e tendência
    let marketStatus = "equilibrado";
    let trend = "estável";
    let trendClass = "neutral";
    
    if (ratio > 1.5) {
      marketStatus = "alta demanda";
      trend = "↗️ alta";
      trendClass = "up";
    } else if (ratio > 1.1) {
      marketStatus = "demanda moderada";
      trend = "↗️ alta leve";
      trendClass = "up";
    } else if (ratio < 0.7) {
      marketStatus = "excesso de oferta";
      trend = "↘️ baixa";
      trendClass = "down";
    } else if (ratio < 0.9) {
      marketStatus = "oferta abundante";
      trend = "↘️ baixa leve";
      trendClass = "down";
    }
    
    // Variação de preço
    const history = gameState.history[selected];
    let variation = "0%";
    let variationClass = "neutral";
    
    if (history && history.length >= 2) {
      const oldPrice = history[history.length - 2] || history[history.length - 1];
      const currentPrice = history[history.length - 1];
      const percentChange = ((currentPrice - oldPrice) / oldPrice) * 100;
      
      if (percentChange > 0) {
        variation = `+${percentChange.toFixed(1)}%`;
        variationClass = "up";
      } else if (percentChange < 0) {
        variation = `${percentChange.toFixed(1)}%`;
        variationClass = "down";
      }
    }
    
    // Atualizar interface
    document.getElementById('marketInfo').innerHTML = `
      <div class="market-status">
        <p><strong>Recurso:</strong> ${selected}</p>
        <p><strong>Preço Atual:</strong> ${price.toFixed(2)} (${ratio > 1 ? '+' : ''}${((ratio - 1) * 100).toFixed(1)}% do valor base)</p>
        <p><strong>Status do Mercado:</strong> <span class="status-${marketStatus.replace(/\s+/g, '-')}">${marketStatus}</span></p>
      </div>
    `;
    
    // Métricas
    document.getElementById('supplyValue').textContent = gameState.globalSupply[selected]?.toFixed(0) || '0';
    document.getElementById('priceVariation').textContent = variation;
    document.getElementById('priceVariation').className = `metric-value ${variationClass}`;
    document.getElementById('marketTrend').textContent = trend;
    document.getElementById('marketTrend').className = `metric-value ${trendClass}`;
  }
}

function updateChart() {
  const selected = document.getElementById("chartSelector").value;
  if (!selected) return;
  
  const ctx = document.getElementById('marketChart').getContext('2d');
  
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
    
    updateMarketInfo();
  }
}

// Inicialização do jogo
async function initGame() {
  await loadGame();

  // Popula selects
  const selectors = ["resourceSelector", "chartSelector"];
  selectors.forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = '';
    
    if (id === "chartSelector") {
      select.innerHTML = '<option value="">-- Selecione Recurso --</option>';
    }
    
    Object.keys(CONFIG.resources).forEach(res => {
      const option = document.createElement("option");
      option.value = res;
      option.textContent = res;
      select.appendChild(option);
    });
  });

  updateUI();
  await updatePrices();

  // Expandir categorias
  ["primary", "secondary", "factories"].forEach(category => {
    const content = document.getElementById(`${category}Content`);
    const arrow = content.previousElementSibling.querySelector('.arrow');
    content.classList.add('visible');
    arrow.textContent = '▼';
  });

  // Loop principal
  setInterval(() => {
    updateProduction();
    updatePrices();
    updateUI();
    saveGame();
  }, 1000);
}