export function renderCombate() {
  const container = document.createElement('div');
  const log = document.createElement('div');
  log.className = 'log';
  log.id = 'log-combate';
  
  const btnAtacar = document.createElement('button');
  btnAtacar.textContent = 'Atacar Inimigo';
  btnAtacar.onclick = () => {
    const danoTotal = window.estado.herois.reduce((total, h) => total + h.dps, 0);
    log.innerHTML += `<p>⚔️ Seus heróis causaram ${danoTotal} de dano!</p>`;
    log.scrollTop = log.scrollHeight;
    window.estado.ouro += Math.floor(danoTotal / 2);
  };
  
  container.appendChild(btnAtacar);
  container.appendChild(log);
  return container;
}