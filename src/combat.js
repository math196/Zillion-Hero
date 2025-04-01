// Combat Areas Data
const combatAreas = [
  { id: "spirit_forest", element: "earth", baseReward: 10 },
  { id: "dark_marsh", element: "dark", baseReward: 15 },
  { id: "volcano", element: "fire", baseReward: 12 }
];

const dungeons = [
  { id: "ancient_crypt", floors: 10, baseReward: 50 }
];

export function renderCombat() {
  const container = document.createElement('div');
  container.className = 'combat-container';
  
  // Create tabs
  container.innerHTML = `
    <div class="tab-bar">
      <button class="tab active" data-tab="world" data-translate="world"></button>
      <button class="tab" data-tab="dungeons" data-translate="dungeons"></button>
    </div>
    <div id="combat-view"></div>
  `;
  
  // Set up tab switching
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      if (tab.dataset.tab === 'world') {
        renderWorldView();
      } else {
        renderDungeonsView();
      }
    });
  });
  
  // Initial render
  renderWorldView();
  
  return container;
}

function renderWorldView() {
  const view = document.getElementById('combat-view');
  view.innerHTML = '<h2 data-translate="world"></h2>';
  
  combatAreas.forEach(area => {
    const areaCard = document.createElement('div');
    areaCard.className = 'area-card';
    areaCard.innerHTML = `
      <h3>${translations[gameState.language][area.id]}</h3>
      <p>Element: ${area.element}</p>
      <button onclick="selectArea('${area.id}')" data-translate="select">Select</button>
    `;
    view.appendChild(areaCard);
  });
}

function renderDungeonsView() {
  const view = document.getElementById('combat-view');
  view.innerHTML = '<h2 data-translate="dungeons"></h2>';
  
  dungeons.forEach(dungeon => {
    const dungeonCard = document.createElement('div');
    dungeonCard.className = 'dungeon-card';
    dungeonCard.innerHTML = `
      <h3>${translations[gameState.language][dungeon.id]}</h3>
      <p>Floors: ${dungeon.floors}</p>
      <button onclick="selectDungeon('${dungeon.id}')" data-translate="enter">Enter</button>
    `;
    view.appendChild(dungeonCard);
  });
}

window.selectArea = (areaId) => {
  const area = combatAreas.find(a => a.id === areaId);
  gameState.currentArea = {
    id: area.id,
    element: area.element,
    maxProgress: 100,
    reward: area.baseReward
  };
  gameState.areaProgress = 0;
  updateCombatUI();
};

window.selectDungeon = (dungeonId) => {
  // Similar to selectArea but with dungeon logic
};