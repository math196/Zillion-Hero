import { renderHeroPanel } from './herois.js';
import { renderCombate } from './combate.js';
import { renderDungeon } from './dungeons.js';
import { renderPetSystem } from './pets.js';

// Estado global do jogo
window.estado = {
  herois: [
    { nome: '🔥 Kael', dps: 20, nivel: 1 },
    { nome: '💧 Lina', dps: 12, nivel: 1 }
  ],
  ouro: 0,
  pets: []
};

// Funções de carregamento de views
window.loadPainelHerois = () => {
  document.getElementById('conteudo').innerHTML = '';
  document.getElementById('conteudo').appendChild(renderHeroPanel());
};

window.loadCombate = () => {
  document.getElementById('conteudo').innerHTML = '';
  document.getElementById('conteudo').appendChild(renderCombate());
};

window.loadDungeon = () => {
  document.getElementById('conteudo').innerHTML = '';
  document.getElementById('conteudo').appendChild(renderDungeon());
};

window.loadPets = () => {
  document.getElementById('conteudo').innerHTML = '';
  document.getElementById('conteudo').appendChild(renderPetSystem());
};

// Carrega a view inicial
window.loadPainelHerois();