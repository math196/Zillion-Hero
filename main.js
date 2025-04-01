
import { renderHeroPanel } from './herois.js';
import { renderCombate } from './combate.js';
import { mostrarPerfilJogador } from './save.js';

window.loadPainelHerois = () => {
  const div = document.getElementById("conteudo");
  div.innerHTML = '';
  div.appendChild(renderHeroPanel());
};

window.loadCombate = () => {
  const div = document.getElementById("conteudo");
  div.innerHTML = '';
  div.appendChild(renderCombate());
};

window.loadPerfil = () => {
  mostrarPerfilJogador();
};

window.loadPainelHerois();
