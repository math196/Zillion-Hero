
export function renderHeroPanel() {
  const container = document.createElement('div');
  container.className = 'painel-herois';

  const herois = [
    {
      nome: '🔥 Kael',
      raridade: 'Épico',
      estrelas: 3,
      dps: 187,
      iv: 0.82,
      cdReduction: 12,
      defesa: 18
    },
    {
      nome: '💧 Lina',
      raridade: 'Raro',
      estrelas: 2,
      dps: 104,
      iv: 0.64,
      cdReduction: 7,
      defesa: 12
    }
  ];

  herois.forEach(h => {
    const card = document.createElement('div');
    card.className = 'card-heroi';
    card.innerHTML = `
      <h3>${h.nome} (${h.raridade})</h3>
      ⭐ Estrelas: ${h.estrelas}<br>
      ⚔️ DPS: ${h.dps}<br>
      🧬 IV: ${(h.iv * 100).toFixed(1)}%<br>
      ⏱️ CD Reduction: ${h.cdReduction}%<br>
      🛡️ Defesa: ${h.defesa}<br>
    `;
    container.appendChild(card);
  });

  return container;
}
