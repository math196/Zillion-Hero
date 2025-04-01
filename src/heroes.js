export function renderHeroes() {
  const container = document.createElement('div');
  container.innerHTML = '<h2 data-translate="heroes"></h2>';
  
  gameState.heroes.forEach(hero => {
    const heroCard = document.createElement('div');
    heroCard.className = 'card';
    heroCard.innerHTML = `
      <h3>${hero.name}</h3>
      <p>Level: ${hero.level}</p>
      <p>DPS: ${hero.dps}</p>
      <p>Element: ${hero.element}</p>
    `;
    container.appendChild(heroCard);
  });
  
  return container;
}