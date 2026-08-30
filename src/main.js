import { formatEffectPercent } from "./buffs.js";
import { ensureEnemy, manualStrike, tickCombat } from "./combat.js";
import { abandonDungeon, startDungeon, tickDungeon } from "./dungeons.js";
import { equipHero, summonEquipment } from "./equipment.js";
import { DUNGEONS, EQUIPMENT, PETS, SHOP_UPGRADES, areaForFloor } from "./gameData.js";
import {
  HERO_SUMMON_COST,
  MAX_ACTIVE_HEROES,
  calculateHeroDps,
  calculateTeamDps,
  getHeroInstance,
  ivScore,
  ownedHeroes,
  summonHero,
  toggleTeamHero,
} from "./heroes.js";
import { HEROES, HERO_BY_ID, RARITY_ORDER, SUMMON_RATES } from "./heroesData.js";
import { translate, translateStatic } from "./i18n.js";
import { collectOre, expandMineStorage, manualMine, orePerCycle, tickMining } from "./mining.js";
import { PET_SUMMON_COST, selectPet, summonPet } from "./pets.js";
import { essenceReward, performRebirth } from "./rebirth.js";
import { clearSave, downloadSave, importSaveFile, loadGame, offlineSecondsFor, saveGame } from "./save.js";
import { buyShopEquipment, buyUpgrade, craftEquipment, rerollShop, upgradeCost } from "./shop.js";
import { createInitialState } from "./state.js";

const elements = {
  view: document.querySelector("#game-view"),
  log: document.querySelector("#event-log"),
  toast: document.querySelector("#toast"),
  saveStatus: document.querySelector("#save-status"),
  gold: document.querySelector("#stat-gold"),
  crystals: document.querySelector("#stat-crystals"),
  ore: document.querySelector("#stat-ore"),
  essence: document.querySelector("#stat-essence"),
  dps: document.querySelector("#stat-dps"),
  floor: document.querySelector("#stat-zone"),
};

let state = loadGame() ?? createInitialState();
let currentView = "combat";
let renderAt = 0;
let toastTimer = null;
const heroFilters = { search: "", rarity: "all", role: "all", page: 0 };

const language = () => state.language;
const t = (key, variables) => translate(language(), key, variables);
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function formatNumber(value) {
  return new Intl.NumberFormat(language() === "pt" ? "pt-BR" : "en-US", {
    notation: Math.abs(value) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
  }).format(value || 0);
}

function percent(value) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 2600);
}

function addLog(message, type = "info") {
  const item = document.createElement("li");
  item.dataset.time = new Date().toLocaleTimeString(language() === "pt" ? "pt-BR" : "en-US", { hour: "2-digit", minute: "2-digit" });
  item.dataset.type = type;
  item.textContent = message;
  elements.log.prepend(item);
  while (elements.log.children.length > 60) elements.log.lastElementChild.remove();
}

function describeEvents(events) {
  for (const event of events) {
    if (event.type === "kills") {
      addLog(language() === "pt"
        ? `${event.count} inimigo(s) derrotado(s). +${event.heroXp} XP para a formação.`
        : `${event.count} enemy/enemies defeated. +${event.heroXp} formation XP.`);
    } else if (event.type === "floor") {
      const { reward } = event;
      addLog(language() === "pt"
        ? `Andar ${event.floor} concluído: +${reward.gold} ouro, +${reward.ore} minério, +${reward.crystals} cristais.`
        : `Floor ${event.floor} cleared: +${reward.gold} gold, +${reward.ore} ore, +${reward.crystals} crystals.`, "success");
      if (reward.loot?.item) addLog(`${language() === "pt" ? "Loot" : "Loot"}: ${reward.loot.item.name}.`, "loot");
    } else if (event.type === "bossEntered") {
      addLog(`${event.name}: “${event.quote}”`, "boss");
    } else if (event.type === "bossDefeated") {
      addLog(language() === "pt" ? `${event.name} foi derrotado no andar ${event.floor}.` : `${event.name} was defeated on floor ${event.floor}.`, "success");
    } else if (event.type === "bossSkill") {
      addLog(`${event.boss} — ${event.ability}.`, "boss");
    } else if (event.type === "skill") {
      addLog(`${event.hero}: ${event.ability}.`, "skill");
    } else if (event.type === "dungeonBoss") {
      addLog(language() === "pt" ? `Boss de dungeon detectado: ${event.name}.` : `Dungeon boss detected: ${event.name}.`, "boss");
    } else if (event.type === "dungeonComplete") {
      addLog(language() === "pt"
        ? `${event.name} ${event.floor} concluída: +${event.crystals} cristais, +${event.gold} ouro.`
        : `${event.name} ${event.floor} cleared: +${event.crystals} crystals, +${event.gold} gold.`, "success");
    }
  }
}

function viewHeader(label, titleKey, descriptionKey) {
  return `
    <header class="view-header">
      <p class="panel-label">${escapeHtml(label)}</p>
      <h2>${escapeHtml(t(titleKey))}</h2>
      <p>${escapeHtml(t(descriptionKey))}</p>
    </header>`;
}

function renderStats() {
  elements.gold.textContent = formatNumber(state.resources.gold);
  elements.crystals.textContent = formatNumber(state.resources.crystals);
  elements.ore.textContent = formatNumber(state.resources.ore);
  elements.essence.textContent = formatNumber(state.resources.essence);
  elements.dps.textContent = formatNumber(calculateTeamDps(state, state.combat.activeEffects));
  elements.floor.textContent = formatNumber(state.combat.floor);
}

function renderCombat() {
  const enemy = ensureEnemy(state);
  const area = areaForFloor(state.combat.floor);
  const enemyHp = enemy.maxHp ? (enemy.hp / enemy.maxHp) * 100 : 0;
  const cleared = state.combat.enemiesTotal - state.combat.enemiesRemaining;
  const hordeProgress = state.combat.phase === "boss" ? 100 : (cleared / state.combat.enemiesTotal) * 100;
  const teamNames = state.activeTeam.slice(0, 6).map((id) => HERO_BY_ID.get(Number(id))?.name).filter(Boolean);
  const effectMarkup = state.combat.activeEffects.length
    ? state.combat.activeEffects.slice(0, 10).map((effect) => `<span class="effect-chip ${effect.target}">${escapeHtml(effect.stat)} ${formatEffectPercent(effect.multiplier)} · ${Math.ceil(effect.remaining)}s</span>`).join("")
    : `<span class="empty-inline">${language() === "pt" ? "Nenhum efeito temporário." : "No temporary effects."}</span>`;

  elements.view.innerHTML = `
    ${viewHeader(`${area.name} // ${t("resource.zone")} ${state.combat.floor}`, "view.combatTitle", "view.combatDesc")}
    <section class="combat-card">
      <div class="combat-meta">
        <div>
          <span class="micro-label">${t("combat.target")} // ${enemy.type.toUpperCase()}</span>
          <h3>${escapeHtml(enemy.name)}</h3>
        </div>
        <span class="tag ${enemy.type === "boss" ? "danger-tag" : ""}">${state.combat.paused ? t("combat.paused") : t("combat.inCombat")}</span>
      </div>

      <div class="health-row">
        <span>${t("combat.enemy")}</span>
        <div class="meter enemy"><span style="width:${percent(enemyHp)}"></span></div>
        <strong>${formatNumber(Math.max(0, enemy.hp))} / ${formatNumber(enemy.maxHp)}</strong>
      </div>
      <div class="health-row">
        <span>${t("combat.horde")}</span>
        <div class="meter"><span style="width:${percent(hordeProgress)}"></span></div>
        <strong>${state.combat.phase === "boss" ? t("combat.boss") : `${state.combat.enemiesRemaining} ${t("combat.remaining")}`}</strong>
      </div>

      <div class="battle-readout">
        <div><span class="micro-label">DPS</span><strong>${formatNumber(calculateTeamDps(state, state.combat.activeEffects))}</strong></div>
        <div><span class="micro-label">${t("combat.team")}</span><strong>${state.activeTeam.length} / ${MAX_ACTIVE_HEROES}</strong></div>
        <div><span class="micro-label">${language() === "pt" ? "REGIÃO" : "REGION"}</span><strong>${escapeHtml(area.name)}</strong></div>
      </div>

      <div class="team-line"><span>${teamNames.join(" · ")}${state.activeTeam.length > 6 ? ` · +${state.activeTeam.length - 6}` : ""}</span></div>
      <div class="effect-box"><span class="micro-label">${t("combat.effects")}</span><div>${effectMarkup}</div></div>

      <div class="action-row">
        <button class="primary-action" type="button" data-action="toggle-pause">${state.combat.paused ? t("combat.resume") : t("combat.pause")}</button>
        <button class="secondary-action" type="button" data-action="manual-strike">${t("combat.manual")}</button>
      </div>
    </section>`;
}

function heroCard(hero) {
  const instance = getHeroInstance(state, hero.id);
  const active = state.activeTeam.includes(hero.id);
  const dps = instance ? calculateHeroDps(state, hero.id, state.combat.activeEffects) : 0;
  const rarityLabel = hero.rarity.toUpperCase();
  const action = !instance
    ? `<button class="small-action" type="button" disabled>${t("heroes.locked")}</button>`
    : `<button class="small-action ${active ? "active" : ""}" type="button" data-action="toggle-hero" data-id="${hero.id}">${active ? t("heroes.remove") : t("heroes.add")}</button>`;
  const equipmentControl = instance ? `
    <div class="equipment-control">
      <select id="equipment-${hero.id}" aria-label="Equipment for ${escapeHtml(hero.name)}">
        <option value="">NO EQUIPMENT</option>
        ${state.equipment.inventory.map((entry) => {
          const item = EQUIPMENT.find((candidate) => candidate.id === entry.id);
          return `<option value="${entry.id}" ${instance.equipmentId === entry.id ? "selected" : ""}>${escapeHtml(item?.name ?? entry.id)} ${"★".repeat(entry.stars)}</option>`;
        }).join("")}
      </select>
      <button class="small-action" data-action="equip-hero" data-id="${hero.id}">EQUIP</button>
    </div>` : "";
  const progress = instance
    ? `<span>LV ${instance.level}</span><span>${"★".repeat(instance.stars)}${"☆".repeat(5 - instance.stars)}</span><span>${formatNumber(dps)} DPS</span><span>IV ${(ivScore(instance.ivs) * 100).toFixed(1)}</span>`
    : `<span>${hero.element.toUpperCase()}</span><span>${hero.role.toUpperCase()}</span>`;
  return `
    <article class="hero-card rarity-${hero.rarity} ${active ? "selected" : ""} ${instance ? "owned" : "locked"}">
      <div class="card-topline"><span>${rarityLabel}</span><span>#${hero.id}</span></div>
      <h3>${escapeHtml(hero.name)}</h3>
      <p class="hero-title">${escapeHtml(hero.title)}</p>
      <div class="hero-stats-inline">${progress}</div>
      <div class="card-actions">${action}</div>
      <details>
        <summary>${t("heroes.details")}</summary>
        <p>${escapeHtml(hero.appearance)}</p>
        <p><strong>${escapeHtml(hero.ability.name)}</strong><br>${escapeHtml(hero.ability.description)}</p>
        ${equipmentControl}
      </details>
    </article>`;
}

function renderHeroes() {
  const query = heroFilters.search.trim().toLocaleLowerCase();
  const filtered = HEROES
    .filter((hero) => !query || `${hero.name} ${hero.title}`.toLocaleLowerCase().includes(query))
    .filter((hero) => heroFilters.rarity === "all" || hero.rarity === heroFilters.rarity)
    .filter((hero) => heroFilters.role === "all" || hero.role === heroFilters.role)
    .sort((a, b) => Number(Boolean(getHeroInstance(state, b.id))) - Number(Boolean(getHeroInstance(state, a.id))) || RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || a.id - b.id);
  const pageSize = 24;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  heroFilters.page = Math.min(heroFilters.page, pageCount - 1);
  const page = filtered.slice(heroFilters.page * pageSize, (heroFilters.page + 1) * pageSize);
  const ownedCount = ownedHeroes(state).length;

  elements.view.innerHTML = `
    ${viewHeader("200 HEROES // UNLIMITED COLLECTION", "view.heroesTitle", "view.heroesDesc")}
    <section class="summary-grid three">
      <div class="summary-card"><span>${t("heroes.owned")}</span><strong>${ownedCount}</strong></div>
      <div class="summary-card"><span>${t("heroes.active")}</span><strong>${state.activeTeam.length} / ${MAX_ACTIVE_HEROES}</strong></div>
      <div class="summary-card"><span>${t("heroes.total")}</span><strong>${HEROES.length}</strong></div>
    </section>
    <section class="filter-bar">
      <input id="hero-search" value="${escapeHtml(heroFilters.search)}" placeholder="${escapeHtml(t("heroes.search"))}" aria-label="${escapeHtml(t("heroes.search"))}">
      <select id="hero-rarity" aria-label="Rarity">
        <option value="all">${t("heroes.allRarities")}</option>
        ${RARITY_ORDER.map((rarity) => `<option value="${rarity}" ${heroFilters.rarity === rarity ? "selected" : ""}>${rarity.toUpperCase()}</option>`).join("")}
      </select>
      <select id="hero-role" aria-label="Role">
        <option value="all">${t("heroes.allRoles")}</option>
        ${["dps", "tank", "healer", "support", "controller"].map((role) => `<option value="${role}" ${heroFilters.role === role ? "selected" : ""}>${role.toUpperCase()}</option>`).join("")}
      </select>
    </section>
    <section class="hero-grid">${page.map(heroCard).join("") || `<p class="empty-state">No heroes match these filters.</p>`}</section>
    <nav class="pagination" aria-label="Hero pages">
      <button class="text-button" data-action="hero-page" data-page="${heroFilters.page - 1}" ${heroFilters.page === 0 ? "disabled" : ""}>←</button>
      <span>${heroFilters.page + 1} / ${pageCount} · ${filtered.length}</span>
      <button class="text-button" data-action="hero-page" data-page="${heroFilters.page + 1}" ${heroFilters.page >= pageCount - 1 ? "disabled" : ""}>→</button>
    </nav>`;
}

function renderDungeons() {
  const active = state.dungeons.active;
  const activeMarkup = active ? `
    <section class="combat-card dungeon-active">
      <div class="combat-meta"><div><span class="micro-label">ACTIVE RUN // FLOOR ${active.floor}</span><h3>${escapeHtml(DUNGEONS.find((d) => d.id === active.id)?.name)}</h3></div><span class="tag">${active.phase.toUpperCase()}</span></div>
      <div class="health-row"><span>${t("combat.enemy")}</span><div class="meter enemy"><span style="width:${percent(active.enemy ? active.enemy.hp / active.enemy.maxHp * 100 : 100)}"></span></div><strong>${active.enemy ? `${formatNumber(active.enemy.hp)} / ${formatNumber(active.enemy.maxHp)}` : "—"}</strong></div>
      <div class="health-row"><span>${t("combat.horde")}</span><div class="meter"><span style="width:${percent((active.enemiesTotal - active.enemiesRemaining) / active.enemiesTotal * 100)}"></span></div><strong>${active.enemiesRemaining} ${t("combat.remaining")}</strong></div>
      <button class="secondary-action" data-action="abandon-dungeon">${t("dungeon.abandon")}</button>
    </section>` : "";

  elements.view.innerHTML = `
    ${viewHeader("PHASE 3 // CRYSTAL SOURCE", "view.dungeonTitle", "view.dungeonDesc")}
    ${activeMarkup}
    <section class="data-grid">
      ${DUNGEONS.map((dungeon) => {
        const locked = state.player.highestFloor < dungeon.minFloor;
        const weak = calculateTeamDps(state) < dungeon.requiredDps;
        const record = state.dungeons.records[dungeon.id] ?? 0;
        return `<article class="data-card">
          <div class="card-topline"><span>${locked ? t("dungeon.locked") : `${dungeon.goldCost} GOLD`}</span><span>${dungeon.maxFloor}F</span></div>
          <h3>${escapeHtml(dungeon.name)}</h3>
          <p>${t("dungeon.record")}: ${record} · ${t("dungeon.required")}: ${formatNumber(dungeon.requiredDps)}</p>
          <p>Crystal base: ${dungeon.crystalBase} · ${20}–${50} enemies/floor</p>
          <button class="small-action" data-action="start-dungeon" data-id="${dungeon.id}" ${locked || weak || active ? "disabled" : ""}>${t("dungeon.explore")}</button>
        </article>`;
      }).join("")}
    </section>`;
}

function renderMining() {
  const fill = state.mining.storage / state.mining.storageCap * 100;
  elements.view.innerHTML = `
    ${viewHeader("PASSIVE RESOURCE // 3S CYCLE", "view.miningTitle", "view.miningDesc")}
    <section class="combat-card">
      <div class="combat-meta"><div><span class="micro-label">STORAGE</span><h3>${formatNumber(state.mining.storage)} / ${formatNumber(state.mining.storageCap)} ORE</h3></div><span class="tag">+${formatNumber(orePerCycle(state))} / 3S</span></div>
      <div class="meter large"><span style="width:${percent(fill)}"></span></div>
      <div class="battle-readout"><div><span class="micro-label">TOTAL MINED</span><strong>${formatNumber(state.mining.totalMined)}</strong></div><div><span class="micro-label">PICKAXE</span><strong>LV ${state.shop.upgrades.pickaxe}</strong></div><div><span class="micro-label">NEXT CYCLE</span><strong>${Math.max(0, 3 - state.mining.progress).toFixed(1)}S</strong></div></div>
      <div class="action-row"><button class="primary-action" data-action="manual-mine">${t("mining.manual")}</button><button class="secondary-action" data-action="collect-ore">${t("mining.collect")}</button><button class="secondary-action" data-action="expand-storage">${t("mining.expand")}</button></div>
    </section>`;
}

function renderSummon() {
  const last = state.summon.last ? HERO_BY_ID.get(Number(state.summon.last.heroId)) : null;
  const lastMarkup = last ? `
    <article class="result-card rarity-${last.rarity}">
      <span class="panel-label">${state.summon.last.isNew ? t("summon.new") : t("summon.duplicate")}</span>
      <h3>${escapeHtml(last.name)} // ${last.rarity.toUpperCase()}</h3>
      <p>${escapeHtml(last.title)} · ${last.role.toUpperCase()} · ${last.element.toUpperCase()}</p>
      <p>${state.summon.last.improvedIVs ? "IV UPGRADED · " : ""}${state.summon.last.starUp ? "STAR UP" : ""}</p>
    </article>` : `<p class="empty-state">${t("summon.none")}</p>`;
  elements.view.innerHTML = `
    ${viewHeader("GACHA // NO REAL-MONEY PURCHASES", "view.summonTitle", "view.summonDesc")}
    <section class="summon-layout">
      <div class="combat-card summon-console">
        <div class="pity-number"><span>${t("summon.pity")}</span><strong>${state.summon.pity} / 100</strong></div>
        <div class="meter large"><span style="width:${percent(state.summon.pity)}"></span></div>
        <div class="odds-row">${Object.entries(SUMMON_RATES).map(([rarity, rate]) => `<span class="rarity-${rarity}">${rarity.toUpperCase()} ${(rate * 100).toFixed(0)}%</span>`).join("")}</div>
        <button class="primary-action wide" data-action="summon-hero" ${state.resources.crystals < HERO_SUMMON_COST ? "disabled" : ""}>${t("summon.one")}</button>
      </div>
      <div><p class="panel-label">${t("summon.result")}</p>${lastMarkup}</div>
    </section>`;
}

function renderMarket() {
  elements.view.innerHTML = `
    ${viewHeader("GOLD + ORE ECONOMY", "view.marketTitle", "view.marketDesc")}
    <h3 class="section-title">UPGRADES</h3>
    <section class="data-grid">
      ${SHOP_UPGRADES.map((upgrade) => {
        const level = state.shop.upgrades[upgrade.id] ?? 0;
        const cost = upgradeCost(state, upgrade.id);
        return `<article class="data-card"><div class="card-topline"><span>${upgrade.currency.toUpperCase()}</span><span>LV ${level}/${upgrade.maxLevel}</span></div><h3>${escapeHtml(upgrade.name)}</h3><p>${escapeHtml(upgrade.description)}</p><button class="small-action" data-action="buy-upgrade" data-id="${upgrade.id}" ${level >= upgrade.maxLevel ? "disabled" : ""}>${formatNumber(cost)} ${upgrade.currency.toUpperCase()}</button></article>`;
      }).join("")}
    </section>
    <div class="section-heading"><h3 class="section-title">ROTATING EQUIPMENT</h3><button class="text-button" data-action="reroll-shop">${t("market.reroll")}</button></div>
    <section class="data-grid">
      ${state.shop.rotation.map((id) => EQUIPMENT.find((item) => item.id === id)).filter(Boolean).map((item) => `<article class="data-card rarity-${item.rarity}"><div class="card-topline"><span>${item.rarity.toUpperCase()}</span><span>${item.element.toUpperCase()}</span></div><h3>${escapeHtml(item.name)}</h3><p>+${item.attack} ATK · ${escapeHtml(item.passive)}</p><button class="small-action" data-action="buy-equipment" data-id="${item.id}">${item.cost} GOLD</button></article>`).join("")}
    </section>
    <div class="action-row spaced"><button class="secondary-action" data-action="craft-equipment">${t("market.craft")}</button><button class="secondary-action" data-action="summon-equipment">SUMMON EQUIPMENT — 100 GOLD</button></div>
    <h3 class="section-title">INVENTORY</h3>
    <section class="inventory-list">${state.equipment.inventory.map((entry) => { const item = EQUIPMENT.find((candidate) => candidate.id === entry.id); return `<span>${escapeHtml(item?.name ?? entry.id)} · ${"★".repeat(entry.stars)}${entry.stars === 5 ? " · PASSIVE" : ""}</span>`; }).join("")}</section>`;
}

function renderPets() {
  elements.view.innerHTML = `
    ${viewHeader("PHASE 4 // CRYSTAL GACHA", "view.petsTitle", "view.petsDesc")}
    <section class="combat-card pet-console"><div class="pity-number"><span>PET PITY</span><strong>${state.pets.pity} / 50</strong></div><button class="primary-action" data-action="summon-pet" ${state.resources.crystals < PET_SUMMON_COST ? "disabled" : ""}>${t("pets.summon")}</button></section>
    <section class="data-grid">
      ${PETS.map((pet) => {
        const instance = state.pets.collection[pet.id];
        const active = state.pets.active === pet.id;
        return `<article class="data-card rarity-${pet.rarity} ${active ? "selected" : ""}"><div class="card-topline"><span>${pet.rarity.toUpperCase()}</span><span>${instance ? `${"★".repeat(instance.stars)}` : "LOCKED"}</span></div><h3>${escapeHtml(pet.name)}</h3><p><strong>${escapeHtml(pet.activeAbility.name)}</strong> · ${escapeHtml(pet.activeAbility.effect)} · CD ${pet.activeAbility.cooldown}s</p><p>${escapeHtml(pet.passive)}</p>${instance ? `<button class="small-action" data-action="select-pet" data-id="${pet.id}" ${active ? "disabled" : ""}>${t("pets.select")}</button>` : ""}</article>`;
      }).join("")}
    </section>`;
}

function renderProfile() {
  elements.view.innerHTML = `
    ${viewHeader("LOCAL PLAYER // NO ACCOUNT", "view.profileTitle", "view.profileDesc")}
    <section class="profile-grid">
      <div class="combat-card">
        <label class="field-label" for="player-name">${t("profile.name")}</label>
        <div class="inline-field"><input id="player-name" maxlength="24" value="${escapeHtml(state.settings.playerName)}"><button class="secondary-action" data-action="apply-name">${t("profile.apply")}</button></div>
        <div class="profile-list">
          <p><span>PLAYER LEVEL</span><strong>${state.player.level}</strong></p>
          <p><span>PLAYER XP</span><strong>${formatNumber(state.player.xp)} / ${formatNumber(state.player.xpToNext)}</strong></p>
          <p><span>HIGHEST FLOOR</span><strong>${state.player.highestFloor}</strong></p>
          <p><span>ENEMIES</span><strong>${formatNumber(state.player.enemiesDefeated)}</strong></p>
          <p><span>BOSSES</span><strong>${formatNumber(state.player.bossesDefeated)}</strong></p>
          <p><span>SUMMONS</span><strong>${formatNumber(state.summon.total)}</strong></p>
          <p><span>HEROES</span><strong>${ownedHeroes(state).length} / ${HEROES.length}</strong></p>
          <p><span>PLAY TIME</span><strong>${(state.player.totalPlaySeconds / 3600).toFixed(1)}H</strong></p>
        </div>
      </div>
      <div class="data-card danger-zone"><h3>${t("profile.newGame")}</h3><p>${language() === "pt" ? "Apaga apenas o progresso salvo neste navegador." : "Deletes only the progress saved in this browser."}</p><button class="danger-action" data-action="new-game">${t("profile.newGame")}</button></div>
    </section>`;
}

function renderLegacy() {
  const reward = essenceReward(state);
  elements.view.innerHTML = `
    ${viewHeader("LONG-TERM PROGRESSION", "view.legacyTitle", "view.legacyDesc")}
    <section class="combat-card legacy-card">
      <div class="pity-number"><span>ESSENCE REWARD</span><strong>+${reward}</strong></div>
      <p>${language() === "pt" ? "A coleção, estrelas, equipamentos, pets e Essência são mantidos. Níveis da run e ouro são reiniciados." : "Collection, stars, equipment, pets, and Essence are kept. Run levels and gold are reset."}</p>
      <div class="battle-readout"><div><span class="micro-label">REQUIRED</span><strong>FLOOR 50</strong></div><div><span class="micro-label">CURRENT</span><strong>FLOOR ${state.player.highestFloor}</strong></div><div><span class="micro-label">REBIRTHS</span><strong>${state.player.rebirths}</strong></div></div>
      <button class="primary-action" data-action="rebirth" ${reward <= 0 ? "disabled" : ""}>${t("legacy.rebirth")}</button>
    </section>`;
}

function renderCurrentView() {
  renderStats();
  const renderers = { combat: renderCombat, heroes: renderHeroes, dungeons: renderDungeons, mining: renderMining, summon: renderSummon, shop: renderMarket, pets: renderPets, profile: renderProfile, legacy: renderLegacy };
  (renderers[currentView] ?? renderCombat)();
}

function setView(view) {
  currentView = view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  renderCurrentView();
  elements.view.focus();
}

function persist(showStatus = false) {
  saveGame(state);
  if (showStatus) {
    elements.saveStatus.textContent = t("status.saved");
    setTimeout(() => { elements.saveStatus.textContent = t("status.ready"); }, 1200);
  }
}

function performAction(action, target) {
  const id = target.dataset.id;
  if (action === "toggle-pause") state.combat.paused = !state.combat.paused;
  else if (action === "manual-strike") {
    const result = manualStrike(state);
    describeEvents(result.events);
    showToast(`${t("combat.manual")}: ${formatNumber(result.damage)}`);
  } else if (action === "toggle-hero") {
    const result = toggleTeamHero(state, Number(id));
    if (!result.ok) showToast(result.reason === "teamFull" ? t("heroes.teamFull") : "Action unavailable.");
  } else if (action === "hero-page") heroFilters.page = Math.max(0, Number(target.dataset.page));
  else if (action === "summon-hero") {
    const result = summonHero(state);
    if (!result.ok) showToast(language() === "pt" ? "Cristais insuficientes." : "Not enough crystals.");
    else addLog(`${result.hero.name} // ${result.rarity.toUpperCase()} // ${result.isNew ? t("summon.new") : t("summon.duplicate")}.`, "loot");
  } else if (action === "equip-hero") {
    const equipmentId = document.querySelector(`#equipment-${id}`).value;
    if (equipmentId) equipHero(state, Number(id), equipmentId);
    else state.collection[String(id)].equipmentId = null;
  } else if (action === "start-dungeon") {
    const result = startDungeon(state, id);
    if (!result.ok) showToast(`Dungeon unavailable: ${result.reason}.`);
    else addLog(`${result.template.name} // floor ${result.floor} started.`, "boss");
  } else if (action === "abandon-dungeon") abandonDungeon(state);
  else if (action === "manual-mine") showToast(`+${manualMine(state)} ore`);
  else if (action === "collect-ore") showToast(`+${collectOre(state)} ore`);
  else if (action === "expand-storage") {
    const result = expandMineStorage(state);
    if (!result.ok) showToast(language() === "pt" ? "Ouro insuficiente." : "Not enough gold.");
  } else if (action === "buy-upgrade") {
    const result = buyUpgrade(state, id);
    showToast(result.ok ? `Upgrade LV ${result.level}` : `Unavailable: ${result.reason}`);
  } else if (action === "reroll-shop") {
    const result = rerollShop(state);
    if (!result.ok) showToast(language() === "pt" ? "Ouro insuficiente." : "Not enough gold.");
  } else if (action === "buy-equipment") {
    const result = buyShopEquipment(state, id);
    showToast(result.ok ? "Equipment acquired." : `Unavailable: ${result.reason}`);
  } else if (action === "craft-equipment") {
    const result = craftEquipment(state);
    showToast(result.ok ? `${result.item.name} acquired.` : `Unavailable: ${result.reason}`);
  } else if (action === "summon-equipment") {
    const result = summonEquipment(state);
    showToast(result.ok ? `${result.item.name} acquired.` : `Unavailable: ${result.reason}`);
  } else if (action === "summon-pet") {
    const result = summonPet(state);
    if (result.ok) addLog(`${result.pet.name} // PET ${result.rarity.toUpperCase()}.`, "loot");
    else showToast(language() === "pt" ? "Cristais insuficientes." : "Not enough crystals.");
  } else if (action === "select-pet") selectPet(state, id);
  else if (action === "apply-name") state.settings.playerName = document.querySelector("#player-name").value.trim().slice(0, 24) || "Commander";
  else if (action === "new-game") {
    if (!confirm(language() === "pt" ? "Apagar todo o progresso local?" : "Delete all local progress?")) return;
    clearSave();
    state = createInitialState();
    elements.log.replaceChildren();
    translateStatic(language());
    addLog(language() === "pt" ? "Novo jogo iniciado." : "New game started.");
  } else if (action === "rebirth") {
    if (!confirm(language() === "pt" ? "Reiniciar esta run?" : "Reset this run?")) return;
    const result = performRebirth(state);
    if (result.ok) addLog(`Rebirth complete. +${result.reward} Essence.`, "success");
  }
  persist();
  renderCurrentView();
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
elements.view.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (target) performAction(target.dataset.action, target);
});
elements.view.addEventListener("input", (event) => {
  if (event.target.id === "hero-search") {
    heroFilters.search = event.target.value;
    heroFilters.page = 0;
    renderHeroes();
    document.querySelector("#hero-search").focus();
    document.querySelector("#hero-search").setSelectionRange(heroFilters.search.length, heroFilters.search.length);
  }
});
elements.view.addEventListener("change", (event) => {
  if (event.target.id === "hero-rarity") heroFilters.rarity = event.target.value;
  if (event.target.id === "hero-role") heroFilters.role = event.target.value;
  if (event.target.id === "hero-rarity" || event.target.id === "hero-role") {
    heroFilters.page = 0;
    renderHeroes();
  }
});

document.querySelector("#clear-log").addEventListener("click", () => { elements.log.replaceChildren(); addLog(language() === "pt" ? "Registro limpo." : "Log cleared."); });
document.querySelector("#save-button").addEventListener("click", () => persist(true));
document.querySelector("#export-button").addEventListener("click", () => downloadSave(state));
document.querySelector("#import-button").addEventListener("click", () => document.querySelector("#import-file").click());
document.querySelector("#import-file").addEventListener("change", async (event) => {
  try {
    state = await importSaveFile(event.target.files[0]);
    persist();
    translateStatic(language());
    renderCurrentView();
    showToast(language() === "pt" ? "Save importado." : "Save imported.");
  } catch {
    showToast(language() === "pt" ? "Arquivo inválido." : "Invalid save file.");
  }
  event.target.value = "";
});
document.querySelector("#language-button").addEventListener("click", () => {
  state.language = state.language === "pt" ? "en" : "pt";
  document.documentElement.lang = state.language === "pt" ? "pt-BR" : "en";
  document.querySelector("#language-button").textContent = state.language === "pt" ? "ENGLISH" : "PORTUGUÊS";
  translateStatic(language());
  renderCurrentView();
  persist();
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea, select")) return;
  if (/^[1-9]$/.test(event.key)) document.querySelectorAll("[data-view]")[Number(event.key) - 1]?.click();
  if (event.code === "Space") {
    event.preventDefault();
    state.combat.paused = !state.combat.paused;
    renderCurrentView();
  }
});

const offlineSeconds = offlineSecondsFor(state);
if (offlineSeconds > 5) {
  describeEvents(tickCombat(state, offlineSeconds));
  describeEvents(tickDungeon(state, offlineSeconds));
  const mined = tickMining(state, offlineSeconds);
  addLog(language() === "pt"
    ? `Progresso offline de ${(offlineSeconds / 3600).toFixed(1)}h aplicado. Mina: +${mined}.`
    : `${(offlineSeconds / 3600).toFixed(1)}h of offline progress applied. Mine: +${mined}.`, "success");
}
state.meta.lastTickAt = Date.now();
translateStatic(language());
document.querySelector("#language-button").textContent = state.language === "pt" ? "ENGLISH" : "PORTUGUÊS";
addLog(language() === "pt" ? "Zillion Hero iniciado. Formação pronta para avançar." : "Zillion Hero started. Formation ready to advance.");
renderCurrentView();

let previousTime = performance.now();
function loop(currentTime) {
  const elapsed = Math.min(2, Math.max(0, (currentTime - previousTime) / 1000));
  previousTime = currentTime;
  describeEvents(tickCombat(state, elapsed));
  describeEvents(tickDungeon(state, elapsed));
  tickMining(state, elapsed);
  state.meta.lastTickAt = Date.now();
  renderStats();
  if (currentTime - renderAt > 350 && ["combat", "dungeons", "mining"].includes(currentView)) {
    renderAt = currentTime;
    renderCurrentView();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setInterval(() => persist(), 10000);
document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); });
window.addEventListener("beforeunload", () => persist());

