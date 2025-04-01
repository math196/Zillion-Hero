
// 💾 Save game progress (Salvar progresso do jogo)
function salvarJogo() {
  localStorage.setItem('idleSave', JSON.stringify(estado));
  console.log('✅ Game saved successfully. (Jogo salvo com sucesso)');
}

// 🧼 Reset game progress (Reiniciar progresso do jogo)
function novoJogo() {
  if (confirm('Are you sure you want to reset the game? This will erase all progress. (Você tem certeza que quer reiniciar o jogo?)')) {
    localStorage.removeItem('idleSave');
    console.log('🔁 Reloading... (Recarregando...)');
    location.reload();
  }
}

// 📤 Export save data to JSON file (Exportar dados salvos para arquivo JSON)
function exportarJogo() {
  const dados = JSON.stringify(estado, null, 2);
  const blob = new Blob([dados], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().split('T')[0];
  a.download = `zillion-hero-save-${timestamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 📥 Import save data from JSON file (Importar dados salvos de arquivo JSON)
function importarJogo(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const dados = JSON.parse(reader.result);
      if (!dados.jogador || !dados.herois || typeof dados.ouro !== 'number') {
        throw new Error('Missing essential data');
      }
      estado.jogador = dados.jogador || estado.jogador;
      estado.ouro = dados.ouro || estado.ouro;
      estado.herois = dados.herois || estado.herois;
      salvarJogo();
      console.log('✅ Save imported successfully. Reloading... (Progresso importado com sucesso. Recarregando...)');
      location.reload();
    } catch (e) {
      alert('Error importing progress. Invalid file. (Erro ao importar o progresso)');
    }
  };
  reader.readAsText(file);
}

// 👤 Show player profile panel (Mostrar painel de perfil do jogador)
function mostrarPerfilJogador() {
  const painel = document.createElement('div');
  painel.style.border = '1px solid #0f0';
  painel.style.padding = '10px';
  painel.style.marginTop = '10px';
  painel.style.background = '#000';

  const { jogador, ouro } = estado;

  painel.innerHTML = `
    <h3>👤 Player Profile (Perfil do Jogador)</h3>
    <div>Level (Nível): ${jogador.nivel}</div>
    <div>XP: ${jogador.xp}/${jogador.xpProximoNivel}</div>
    <div>Gold (Ouro): ${ouro}</div>
    <div>Enemies Defeated (Inimigos Derrotados): ⚔️ (simulated)</div>
  `;

  const divConteudo = document.getElementById('conteudo');

  divConteudo.innerHTML = '';
  divConteudo.appendChild(painel);
}

// 🔄 Load game progress from local storage (Carregar progresso salvo do armazenamento local)
// 🧭 Add 'Profile' button to main menu (Adicionar botão 'Perfil' ao menu principal)
const menu = document.querySelector('.menu');
if (menu) {
  const btnPerfil = document.createElement('button');
  btnPerfil.textContent = '👤 Profile';
  btnPerfil.onclick = mostrarPerfilJogador;
  menu.appendChild(btnPerfil);
}

function carregarJogo() {
  const dados = localStorage.getItem('idleSave');
  if (dados) {
    const salvo = JSON.parse(dados);
    estado.jogador = salvo.jogador || estado.jogador;
    estado.ouro = salvo.ouro || estado.ouro;
    estado.herois = salvo.herois || estado.herois;
  }
}
