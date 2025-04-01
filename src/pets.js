export function renderPetSystem() {
  const container = document.createElement('div');
  const log = document.createElement('div');
  log.className = 'log';
  
  const btnInvocar = document.createElement('button');
  btnInvocar.textContent = 'Invocar Pet (5 Cristais)';
  btnInvocar.onclick = () => {
    if ((window.estado.cristais || 0) >= 5) {
      window.estado.cristais -= 5;
      const pets = ['🐉 Dragão', '🐺 Lobo', '🦅 Águia', '🐍 Serpente'];
      const pet = pets[Math.floor(Math.random() * pets.length)];
      window.estado.pets = window.estado.pets || [];
      window.estado.pets.push(pet);
      log.innerHTML += `<p>✨ Você invocou: ${pet}!</p>`;
    } else {
      log.innerHTML += `<p>❌ Cristais insuficientes!</p>`;
    }
    log.scrollTop = log.scrollHeight;
  };
  
  container.innerHTML = `
    <h2>🐾 Pets</h2>
    <p>Cristais: ${window.estado.cristais || 0}</p>
    <p>Pets: ${(window.estado.pets || []).join(', ')}</p>
  `;
  container.appendChild(btnInvocar);
  container.appendChild(log);
  return container;
}