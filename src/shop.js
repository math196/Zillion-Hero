export function renderShop() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h2 data-translate="shop"></h2>
    <div class="stats">
      <p>${translations[gameState.language]['total_gold']}: ${gameState.gold}</p>
      <p>${translations[gameState.language]['total_crystals']}: ${gameState.crystals}</p>
    </div>
  `;
  
  return container;
}