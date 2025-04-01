export function renderDungeon() {
  const container = document.createElement('div');
  const log = document.createElement('div');
  log.className = 'log';
  
  const btnExplorar = document.createElement('button');
  btnExplorar.textContent = 'Explorar Dungeon (Custo: 10 Ouro)';
  btnExplorar.onclick = () => {
    if (window.estado.ouro >= 10) {
      window.estado.ouro -= 10;
      const cristaisGanhos = Math.floor(Math.random() * 3) + 1;
      window.estado.cristais = (window.estado.cristais || 0) + cristaisGanhos;
      log.innerHTML += `<p>🏰 Dungeon completa! +${cristaisGanhos} cristais (Total: ${window.estado.cristais})</p>`;
    } else {
      log.innerHTML += `<p>❌ Ouro insuficiente!</p>`;
    }
    log.scrollTop = log.scrollHeight;
  };
  
  container.innerHTML = '<h2>🏰 Dungeon</h2>';
  container.appendChild(btnExplorar);
  container.appendChild(log);
  return container;
}