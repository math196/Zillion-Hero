export function renderHeroPanel() {
  const container = document.createElement('div');
  
  window.estado.herois.forEach(heroi => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${heroi.nome}</h3>
      <p>Nível: ${heroi.nivel}</p>
      <p>DPS: ${heroi.dps}</p>
    `;
    container.appendChild(card);
  });
  
  return container;
}