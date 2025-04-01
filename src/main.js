
import { renderHeroPanel } from './herois.js';
import { renderCombate } from './combate.js';

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

window.loadPainelHerois();
