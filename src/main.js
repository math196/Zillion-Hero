// Game State
window.gameState = {
  heroes: [
    { id: 1, name: "Kael", element: "fire", dps: 5, level: 1 },
    { id: 2, name: "Lina", element: "water", dps: 3, level: 1 }
  ],
  currentArea: null,
  areaProgress: 0,
  gold: 0,
  crystals: 0,
  language: "en"
};

// Initialize
function init() {
  loadLanguage('en');
  loadHeroes();
  startIdleLoop();
}

// Language System
function loadLanguage(lang) {
  gameState.language = lang;
  const elements = document.querySelectorAll('[data-translate]');
  elements.forEach(el => {
    const key = el.getAttribute('data-translate');
    el.textContent = translations[lang][key];
  });
}

window.toggleLanguage = () => {
  const newLang = gameState.language === 'en' ? 'pt' : 'en';
  loadLanguage(newLang);
};

// View Loaders
window.loadHeroes = () => {
  document.getElementById('content').innerHTML = '';
  document.getElementById('content').appendChild(renderHeroes());
};

window.loadCombat = () => {
  document.getElementById('content').innerHTML = '';
  document.getElementById('content').appendChild(renderCombat());
};

window.loadShop = () => {
  document.getElementById('content').innerHTML = '';
  document.getElementById('content').appendChild(renderShop());
};

// Idle Game Loop
function startIdleLoop() {
  let lastTime = Date.now();
  
  function loop() {
    const now = Date.now();
    const delta = (now - lastTime) / 1000; // in seconds
    lastTime = now;
    
    if (gameState.currentArea) {
      // Progress combat
      const totalDPS = gameState.heroes.reduce((sum, hero) => sum + hero.dps, 0);
      gameState.areaProgress += totalDPS * delta;
      
      // Check if area completed
      if (gameState.areaProgress >= 100) {
        gameState.gold += Math.floor(10 + (totalDPS * 0.5));
        gameState.areaProgress = 0;
      }
      
      updateCombatUI();
    }
    
    requestAnimationFrame(loop);
  }
  
  loop();
}

function updateCombatUI() {
  const progressBar = document.getElementById('combat-progress');
  const combatStats = document.getElementById('combat-stats');
  
  if (gameState.currentArea) {
    const totalDPS = gameState.heroes.reduce((sum, hero) => sum + hero.dps, 0);
    progressBar.style.width = `${gameState.areaProgress}%`;
    combatStats.innerHTML = `
      ${translations[gameState.language]['current_area']}: ${translations[gameState.language][gameState.currentArea.id]}<br>
      ${translations[gameState.language]['progress']}: ${Math.floor(gameState.areaProgress)}%<br>
      ${translations[gameState.language]['gold_per_sec']}: ${Math.floor(totalDPS * 0.5)}
    `;
  } else {
    progressBar.style.width = '0%';
    combatStats.textContent = translations[gameState.language]['no_area_selected'];
  }
}

// Start the game
init();