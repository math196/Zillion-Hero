import { formatEffectPercent } from "./buffs.js";
import { ensureEnemy, manualHeal, manualStrike, partySnapshot, teamSurvivalStats, tickCombat } from "./combat.js";
import { abandonDungeon, startDungeon, tickDungeon } from "./dungeons.js";
import { equipHero, summonEquipment } from "./equipment.js";
import { BOSSES, DUNGEONS, EQUIPMENT, PETS, SHOP_UPGRADES, areaForFloor } from "./gameData.js";
import { COMBAT_SPEEDS, combatSpeedRequirementKey, currentCombatSpeed, isCombatSpeedUnlocked, scaledCombatElapsed, setCombatSpeed } from "./gameSpeed.js";
import { gameTerm, localizeEntity, localizeHero, localizeHeroAction, localizeKnownAbility, localizeKnownName } from "./gameText.js";
import {
  HERO_SUMMON_COST,
  MAX_ACTIVE_HEROES,
  activeTeamLimit,
  calculateHeroDps,
  calculateTeamDps,
  getHeroInstance,
  isPassiveUnlocked,
  ivScore,
  ownedHeroes,
  summonHero,
  toggleTeamHero,
} from "./heroes.js";
import { HEROES, HERO_BY_ID, RARITY_ORDER, SUMMON_RATES } from "./heroesData.js";
import { translate, translateStatic } from "./i18n.js";
import { collectOre, expandMineStorage, manualMine, orePerCycle, tickMining } from "./mining.js";
import { PET_SUMMON_COST, selectPet, summonPet } from "./pets.js";
import {
  SYSTEM_UNLOCKS,
  advanceTutorial,
  clearUnlockNotice,
  hideTutorial,
  isSystemUnlocked,
  nextLockedSystem,
  reopenTutorial,
  skipTutorial,
  syncProgression,
  systemUnlock,
} from "./progression.js";
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
  tutorial: document.querySelector("#tutorial-panel"),
  help: document.querySelector("#help-dialog"),
};

let state = loadGame() ?? createInitialState();
const startupUnlocks = syncProgression(state);
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
      if (reward.loot?.item) addLog(`${t("log.loot")}: ${localizeEntity(reward.loot.item, "equipment", language()).name}.`, "loot");
    } else if (event.type === "bossEntered") {
      const boss = BOSSES.find((candidate) => candidate.name === event.name);
      const copy = localizeEntity(boss, "boss", language());
      addLog(`${copy?.name ?? event.name}: “${copy?.quote ?? event.quote}”`, "boss");
    } else if (event.type === "bossDefeated") {
      addLog(language() === "pt" ? `${localizeKnownName(event.name, language())} foi derrotado no andar ${event.floor}.` : `${event.name} was defeated on floor ${event.floor}.`, "success");
      if (event.floor === 10) {
        addLog(t("combat.tutorialComplete"), "success");
        addLog(t("combat.speedUnlocked", { speed: 2 }), "success");
        showToast(t("combat.speedUnlocked", { speed: 2 }));
      } else if (event.floor === 20) {
        addLog(t("combat.speedUnlocked", { speed: 3 }), "success");
        showToast(t("combat.speedUnlocked", { speed: 3 }));
      }
    } else if (event.type === "bossSkill") {
      addLog(`${localizeKnownName(event.boss, language())} — ${localizeKnownAbility(event.ability, language())}.`, "boss");
    } else if (event.type === "skill") {
      addLog(`${event.hero}: ${localizeKnownAbility(event.ability, language())}.`, "skill");
    } else if (event.type === "heroAction") {
      const hero = HEROES.find((candidate) => candidate.name === event.actor);
      addLog(`${localizeKnownName(event.actor, language())} → ${localizeHeroAction(hero, event.action, language())} → ${localizeKnownName(event.target, language())}: ${formatNumber(event.amount)}${event.critical ? ` ${t("combat.critical")}` : ""}.`, event.kind === "special" ? "skill" : "info");
    } else if (event.type === "enemyAction") {
      addLog(`${localizeKnownName(event.actor, language())} → ${localizeKnownAbility(event.action, language())} → ${event.target}: -${formatNumber(event.amount)} HP${event.ko ? " · KO" : ""}.`, "danger");
    } else if (event.type === "heal") {
      addLog(`${localizeKnownName(event.healer, language())} → ${event.target}: +${formatNumber(event.amount)} HP.`, "heal");
    } else if (event.type === "revive") {
      addLog(t("log.revive", { healer: localizeKnownName(event.healer, language()), target: event.target, amount: formatNumber(event.amount) }), "heal");
    } else if (event.type === "guard") {
      addLog(t("log.guard", { actor: event.actor }), "guard");
    } else if (event.type === "teamDefeated") {
      addLog(language() === "pt" ? `A formação caiu. Reagrupando por ${event.recovery}s.` : `The formation fell. Regrouping for ${event.recovery}s.`, "danger");
    } else if (event.type === "teamRecovered") {
      addLog(language() === "pt" ? "A formação se recuperou e voltou ao combate." : "The formation recovered and returned to combat.", "success");
    } else if (event.type === "dungeonBoss") {
      addLog(t("log.dungeonBoss", { name: localizeKnownName(event.name, language()) }), "boss");
    } else if (event.type === "dungeonComplete") {
      addLog(language() === "pt"
        ? `${localizeKnownName(event.name, language())} ${event.floor} concluída: +${event.crystals} cristais, +${event.gold} ouro.`
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

function localizedLastAction(hero, value) {
  if (!value || value === "—" || value === "KO") return value;
  if (value === "GUARD") return t("combat.guard");
  const [action, target] = value.split(" → ");
  return target
    ? `${localizeHeroAction(hero, action, language())} → ${localizeKnownName(target, language())}`
    : localizeHeroAction(hero, action, language());
}

function renderStats() {
  elements.gold.textContent = formatNumber(state.resources.gold);
  const crystalUnlocked = isSystemUnlocked(state, "summon") || isSystemUnlocked(state, "dungeons");
  const resourceVisibility = {
    crystals: { unlocked: crystalUnlocked, requirement: systemUnlock("summon") },
    ore: { unlocked: isSystemUnlocked(state, "mining"), requirement: systemUnlock("mining") },
    essence: { unlocked: isSystemUnlocked(state, "legacy"), requirement: systemUnlock("legacy") },
  };
  for (const [resource, config] of Object.entries(resourceVisibility)) {
    const container = document.querySelector(`[data-resource="${resource}"]`);
    const output = elements[resource];
    output.textContent = config.unlocked ? formatNumber(state.resources[resource]) : "—";
    container.classList.toggle("locked-resource", !config.unlocked);
    container.title = config.unlocked ? "" : t(config.requirement.requirementKey);
  }
  elements.dps.textContent = formatNumber(calculateTeamDps(state, state.combat.activeEffects));
  elements.floor.textContent = formatNumber(state.combat.floor);
}

function renderCombat() {
  const enemy = ensureEnemy(state);
  const area = areaForFloor(state.combat.floor);
  const areaCopy = localizeEntity(area, "area", language());
  const enemyHp = enemy.maxHp ? (enemy.hp / enemy.maxHp) * 100 : 0;
  const enemyAtb = Math.min(100, enemy.atb ?? 0);
  const cleared = state.combat.enemiesTotal - state.combat.enemiesRemaining;
  const hordeProgress = state.combat.phase === "boss" ? 100 : (cleared / state.combat.enemiesTotal) * 100;
  const party = partySnapshot(state);
  const survival = teamSurvivalStats(state);
  const partyHpPercent = survival.maxHp ? survival.hp / survival.maxHp * 100 : 0;
  const recovering = state.combat.recovering > 0;
  const inTutorial = state.combat.floor <= 10;
  const selectedSpeed = currentCombatSpeed(state);
  const speedMarkup = COMBAT_SPEEDS.map((speed) => {
    const unlocked = isCombatSpeedUnlocked(state, speed);
    const requirementKey = combatSpeedRequirementKey(speed);
    const title = unlocked || !requirementKey ? "" : t(requirementKey);
    return `<button class="speed-button ${selectedSpeed === speed ? "active" : ""}" type="button" data-action="set-combat-speed" data-speed="${speed}" aria-pressed="${selectedSpeed === speed}" ${unlocked ? "" : "disabled"} title="${escapeHtml(title)}">${unlocked ? "" : "🔒 "}${speed}×</button>`;
  }).join("");
  const nextSpeedHint = !isCombatSpeedUnlocked(state, 2)
    ? t("combat.speed2Requirement")
    : !isCombatSpeedUnlocked(state, 3)
      ? t("combat.speed3Requirement")
      : t("combat.allSpeedsUnlocked");
  const effectMarkup = state.combat.activeEffects.length
    ? state.combat.activeEffects.slice(0, 10).map((effect) => `<span class="effect-chip ${effect.target}">${escapeHtml(gameTerm("stat", effect.stat, language()))} ${formatEffectPercent(effect.multiplier)} · ${Math.ceil(effect.remaining)}s</span>`).join("")
    : `<span class="empty-inline">${language() === "pt" ? "Nenhum efeito temporário." : "No temporary effects."}</span>`;
  const partyMarkup = party.map(({ heroId, hero, battle }) => {
    const copy = localizeHero(hero, language());
    const hpPercent = battle.maxHp ? battle.hp / battle.maxHp * 100 : 0;
    const status = battle.hp <= 0 ? "KO" : battle.guard > 0 ? (language() === "pt" ? "GUARDA" : "GUARD") : battle.atb >= 100 ? (language() === "pt" ? "AGINDO" : "ACTING") : "ATB";
    const instance = getHeroInstance(state, heroId);
    const passiveActive = isPassiveUnlocked(instance, hero);
    const cooldown = Math.ceil(instance.cooldownRemaining ?? 0);
    return `<article class="party-member role-${hero.role} ${battle.hp <= 0 ? "ko" : ""}">
      <div class="party-member-head"><strong>${escapeHtml(hero.name)}</strong><span>${escapeHtml(gameTerm("role", hero.role, language()).toUpperCase())} · ${status}</span></div>
      <div class="unit-meter"><span>HP</span><div class="meter hp"><i style="width:${percent(hpPercent)}"></i></div><b>${formatNumber(battle.hp)} / ${formatNumber(battle.maxHp)}</b></div>
      <div class="unit-meter"><span>ATB</span><div class="meter atb"><i style="width:${percent(battle.atb)}"></i></div><b>${Math.floor(Math.min(100, battle.atb))}%</b></div>
      <p>${t("combat.lastAction")}: ${escapeHtml(localizedLastAction(hero, battle.lastAction))}</p>
      <details class="party-kit" ${party.length <= 4 ? "open" : ""}>
        <summary>${t("combat.kitSummary")}</summary>
        <div class="kit-entry"><span>${t("combat.attack")}</span><strong>${escapeHtml(copy.basicAttack.name)}</strong><small>${escapeHtml(copy.basicAttack.description)} · ${(copy.basicAttack.coefficient * 100).toFixed(0)}% ${gameTerm("stat", "attack", language())}</small></div>
        <div class="kit-entry special"><span>${t("combat.special")}</span><strong>${escapeHtml(copy.special.name)}</strong><small>${escapeHtml(copy.special.description)} · ${t("combat.cooldown")} ${copy.special.cooldown}s${cooldown > 0 ? ` · ${cooldown}s ${t("combat.remainingTime")}` : ` · ${t("status.ready")}`}</small></div>
        <div class="kit-entry passive ${passiveActive ? "active" : "locked"}"><span>${t("combat.passive")}</span><strong>${escapeHtml(copy.passive.name)}</strong><small>${escapeHtml(copy.passive.description)} · ${passiveActive ? t("combat.active") : `${t("combat.unlocksAt")} 5★`}</small></div>
      </details>
    </article>`;
  }).join("");

  elements.view.innerHTML = `
    ${viewHeader(`${areaCopy.name} // ${t("resource.zone")} ${state.combat.floor}`, "view.combatTitle", "view.combatDesc")}
    <section class="combat-card">
      <div class="combat-meta">
        <div>
          <span class="micro-label">${t("combat.target")} // ${gameTerm("type", enemy.type, language()).toUpperCase()}</span>
          <h3>${escapeHtml(localizeKnownName(enemy.name, language()))}</h3>
        </div>
        <div class="combat-status">
          ${inTutorial ? `<span class="tag">${t("combat.tutorialFloor", { floor: state.combat.floor })}</span>` : ""}
          <span class="tag ${enemy.type === "boss" || recovering ? "danger-tag" : ""}">${recovering ? `${t("combat.regrouping")} ${state.combat.recovering.toFixed(1)}s` : state.combat.paused ? t("combat.paused") : `${t("combat.autoAtb")} · ${selectedSpeed}×`}</span>
          <div class="speed-control" role="group" aria-label="${escapeHtml(t("combat.speed"))}"><span class="micro-label">${t("combat.speed")}</span>${speedMarkup}</div>
          <small class="speed-unlock-hint">${escapeHtml(nextSpeedHint)}</small>
        </div>
      </div>

      <div class="health-row">
        <span>${t("combat.enemy")}</span>
        <div class="meter enemy"><span style="width:${percent(enemyHp)}"></span></div>
        <strong>${formatNumber(Math.max(0, enemy.hp))} / ${formatNumber(enemy.maxHp)}</strong>
      </div>
      <div class="health-row">
        <span>${t("combat.enemyAtb")}</span>
        <div class="meter atb enemy-atb"><span style="width:${percent(enemyAtb)}"></span></div>
        <strong>${Math.floor(enemyAtb)}%</strong>
      </div>
      <div class="health-row">
        <span>${t("combat.horde")}</span>
        <div class="meter"><span style="width:${percent(hordeProgress)}"></span></div>
        <strong>${state.combat.phase === "boss" ? t("combat.boss") : `${state.combat.enemiesRemaining} ${t("combat.remaining")}`}</strong>
      </div>
      <div class="health-row party-total">
        <span>${t("combat.party")}</span>
        <div class="meter hp"><span style="width:${percent(partyHpPercent)}"></span></div>
        <strong>${formatNumber(survival.hp)} / ${formatNumber(survival.maxHp)}</strong>
      </div>

      <div class="battle-readout four">
        <div><span class="micro-label">${t("combat.alive")}</span><strong>${survival.alive} / ${party.length}</strong></div>
        <div><span class="micro-label">${t("combat.defense")}</span><strong>${formatNumber(survival.defense)}</strong></div>
        <div><span class="micro-label">${t("combat.healers")}</span><strong>${survival.healers}</strong></div>
        <div><span class="micro-label">${t("combat.lastHeal")}</span><strong>${state.combat.lastHealer ? `${escapeHtml(localizeKnownName(state.combat.lastHealer, language()))} +${formatNumber(state.combat.lastHealAmount)}` : "—"}</strong></div>
      </div>

      <div class="section-heading battle-party-title"><h3 class="section-title">${t("combat.atbParty")}</h3><span>${state.activeTeam.length} / ${activeTeamLimit(state)}</span></div>
      <section class="party-grid">${partyMarkup}</section>
      <div class="effect-box"><span class="micro-label">${t("combat.effects")}</span><div>${effectMarkup}</div></div>

      <div class="action-row">
        <button class="primary-action" type="button" data-action="toggle-pause">${state.combat.paused ? t("combat.resume") : t("combat.pause")}</button>
        <button class="secondary-action" type="button" data-action="manual-strike" ${state.combat.manualStrikeCooldown > 0 || recovering ? "disabled" : ""}>${language() === "pt" ? "ATAQUE COORDENADO" : "FOCUS ATTACK"}${state.combat.manualStrikeCooldown > 0 ? ` · ${Math.ceil(state.combat.manualStrikeCooldown)}s` : ""}</button>
        <button class="secondary-action heal-action" type="button" data-action="manual-heal" ${state.combat.manualHealCooldown > 0 || recovering || survival.hp >= survival.maxHp ? "disabled" : ""}>${language() === "pt" ? "PRIMEIROS SOCORROS" : "FIRST AID"}${state.combat.manualHealCooldown > 0 ? ` · ${Math.ceil(state.combat.manualHealCooldown)}s` : ""}</button>
      </div>
    </section>`;
}

function heroCard(hero) {
  const copy = localizeHero(hero, language());
  const instance = getHeroInstance(state, hero.id);
  const active = state.activeTeam.includes(hero.id);
  const dps = instance ? calculateHeroDps(state, hero.id, state.combat.activeEffects) : 0;
  const rarityLabel = gameTerm("rarity", hero.rarity, language()).toUpperCase();
  const action = !instance
    ? `<button class="small-action" type="button" disabled>${t("heroes.locked")}</button>`
    : `<button class="small-action ${active ? "active" : ""}" type="button" data-action="toggle-hero" data-id="${hero.id}">${active ? t("heroes.remove") : t("heroes.add")}</button>`;
  const equipmentControl = instance ? `
    <div class="equipment-control">
      <select id="equipment-${hero.id}" aria-label="${escapeHtml(t("heroes.equipmentFor", { hero: hero.name }))}">
        <option value="">${t("heroes.noEquipment")}</option>
        ${state.equipment.inventory.map((entry) => {
          const item = EQUIPMENT.find((candidate) => candidate.id === entry.id);
          const itemCopy = localizeEntity(item, "equipment", language());
          return `<option value="${entry.id}" ${instance.equipmentId === entry.id ? "selected" : ""}>${escapeHtml(itemCopy?.name ?? entry.id)} ${"★".repeat(entry.stars)}</option>`;
        }).join("")}
      </select>
      <button class="small-action" data-action="equip-hero" data-id="${hero.id}">${t("heroes.equip")}</button>
    </div>` : "";
  const progress = instance
    ? `<span>${gameTerm("role", hero.role, language()).toUpperCase()}</span><span>${t("common.levelShort")} ${instance.level}</span><span>${"★".repeat(instance.stars)}${"☆".repeat(5 - instance.stars)}</span><span>${formatNumber(dps)} DPS</span><span>IV ${(ivScore(instance.ivs) * 100).toFixed(1)}</span>`
    : `<span>${gameTerm("element", hero.element, language()).toUpperCase()}</span><span>${gameTerm("role", hero.role, language()).toUpperCase()}</span>`;
  return `
    <article class="hero-card rarity-${hero.rarity} ${active ? "selected" : ""} ${instance ? "owned" : "locked"}">
      <div class="card-topline"><span>${rarityLabel}</span><span>#${hero.id}</span></div>
      <h3>${escapeHtml(hero.name)}</h3>
      <p class="hero-title">${escapeHtml(copy.title)}</p>
      <div class="hero-stats-inline">${progress}</div>
      <div class="card-actions">${action}</div>
      <details>
        <summary>${t("heroes.details")}</summary>
        <p>${escapeHtml(copy.appearance)}</p>
        <div class="hero-kit">
          <p><span class="micro-label">${t("combat.basicAttack")}</span><strong>${escapeHtml(copy.basicAttack.name)}</strong><br>${escapeHtml(copy.basicAttack.description)} · ${(copy.basicAttack.coefficient * 100).toFixed(0)}% ${gameTerm("stat", "attack", language())}</p>
          <p><span class="micro-label">${t("combat.special")}</span><strong>${escapeHtml(copy.special.name)}</strong><br>${escapeHtml(copy.special.description)} · ${t("combat.cooldown")} ${copy.special.cooldown}s</p>
          <p class="${instance && isPassiveUnlocked(instance, hero) ? "passive-active" : "passive-locked"}"><span class="micro-label">${t("combat.passive")} · ${instance && isPassiveUnlocked(instance, hero) ? t("combat.active") : `${t("combat.unlocksAt")} 5★`}</span><strong>${escapeHtml(copy.passive.name)}</strong><br>${escapeHtml(copy.passive.description)}</p>
        </div>
        ${equipmentControl}
      </details>
    </article>`;
}

function renderHeroes() {
  const query = heroFilters.search.trim().toLocaleLowerCase();
  const filtered = HEROES
    .filter((hero) => !query || `${hero.name} ${localizeHero(hero, language()).title}`.toLocaleLowerCase().includes(query))
    .filter((hero) => heroFilters.rarity === "all" || hero.rarity === heroFilters.rarity)
    .filter((hero) => heroFilters.role === "all" || hero.role === heroFilters.role)
    .sort((a, b) => Number(Boolean(getHeroInstance(state, b.id))) - Number(Boolean(getHeroInstance(state, a.id))) || RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || a.id - b.id);
  const pageSize = 24;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  heroFilters.page = Math.min(heroFilters.page, pageCount - 1);
  const page = filtered.slice(heroFilters.page * pageSize, (heroFilters.page + 1) * pageSize);
  const ownedCount = ownedHeroes(state).length;

  elements.view.innerHTML = `
    ${viewHeader(t("eyebrow.heroes"), "view.heroesTitle", "view.heroesDesc")}
    <section class="summary-grid three">
      <div class="summary-card"><span>${t("heroes.owned")}</span><strong>${ownedCount}</strong></div>
      <div class="summary-card"><span>${t("heroes.active")}</span><strong>${state.activeTeam.length} / ${activeTeamLimit(state)} <small>${language() === "pt" ? `(máx. ${MAX_ACTIVE_HEROES})` : `(max ${MAX_ACTIVE_HEROES})`}</small></strong></div>
      <div class="summary-card"><span>${t("heroes.total")}</span><strong>${HEROES.length}</strong></div>
    </section>
    <section class="filter-bar">
      <input id="hero-search" value="${escapeHtml(heroFilters.search)}" placeholder="${escapeHtml(t("heroes.search"))}" aria-label="${escapeHtml(t("heroes.search"))}">
      <select id="hero-rarity" aria-label="${t("heroes.rarity")}">
        <option value="all">${t("heroes.allRarities")}</option>
        ${RARITY_ORDER.map((rarity) => `<option value="${rarity}" ${heroFilters.rarity === rarity ? "selected" : ""}>${gameTerm("rarity", rarity, language()).toUpperCase()}</option>`).join("")}
      </select>
      <select id="hero-role" aria-label="${t("heroes.role")}">
        <option value="all">${t("heroes.allRoles")}</option>
        ${["dps", "tank", "healer", "support", "controller"].map((role) => `<option value="${role}" ${heroFilters.role === role ? "selected" : ""}>${gameTerm("role", role, language()).toUpperCase()}</option>`).join("")}
      </select>
    </section>
    <section class="hero-grid">${page.map(heroCard).join("") || `<p class="empty-state">${t("heroes.noMatches")}</p>`}</section>
    <nav class="pagination" aria-label="${t("heroes.pages")}">
      <button class="text-button" data-action="hero-page" data-page="${heroFilters.page - 1}" ${heroFilters.page === 0 ? "disabled" : ""}>←</button>
      <span>${heroFilters.page + 1} / ${pageCount} · ${filtered.length}</span>
      <button class="text-button" data-action="hero-page" data-page="${heroFilters.page + 1}" ${heroFilters.page >= pageCount - 1 ? "disabled" : ""}>→</button>
    </nav>`;
}

function renderDungeons() {
  const active = state.dungeons.active;
  const activeDungeon = active ? localizeEntity(DUNGEONS.find((dungeon) => dungeon.id === active.id), "dungeon", language()) : null;
  const activeMarkup = active ? `
    <section class="combat-card dungeon-active">
      <div class="combat-meta"><div><span class="micro-label">${t("dungeon.activeRun")} // ${t("resource.zone")} ${active.floor}</span><h3>${escapeHtml(activeDungeon?.name)}</h3></div><span class="tag">${gameTerm("phase", active.phase, language()).toUpperCase()}</span></div>
      <div class="health-row"><span>${t("combat.enemy")}</span><div class="meter enemy"><span style="width:${percent(active.enemy ? active.enemy.hp / active.enemy.maxHp * 100 : 100)}"></span></div><strong>${active.enemy ? `${formatNumber(active.enemy.hp)} / ${formatNumber(active.enemy.maxHp)}` : "—"}</strong></div>
      <div class="health-row"><span>${t("combat.horde")}</span><div class="meter"><span style="width:${percent((active.enemiesTotal - active.enemiesRemaining) / active.enemiesTotal * 100)}"></span></div><strong>${active.enemiesRemaining} ${t("combat.remaining")}</strong></div>
      <button class="secondary-action" data-action="abandon-dungeon">${t("dungeon.abandon")}</button>
    </section>` : "";

  elements.view.innerHTML = `
    ${viewHeader(t("eyebrow.dungeons"), "view.dungeonTitle", "view.dungeonDesc")}
    ${activeMarkup}
    <section class="data-grid">
      ${DUNGEONS.map((dungeon) => {
        const copy = localizeEntity(dungeon, "dungeon", language());
        const locked = state.player.highestFloor < dungeon.minFloor;
        const weak = calculateTeamDps(state) < dungeon.requiredDps;
        const record = state.dungeons.records[dungeon.id] ?? 0;
        return `<article class="data-card">
          <div class="card-topline"><span>${locked ? t("dungeon.locked") : `${dungeon.goldCost} ${gameTerm("currency", "gold", language()).toUpperCase()}`}</span><span>${dungeon.maxFloor}${t("common.floorShort")}</span></div>
          <h3>${escapeHtml(copy.name)}</h3>
          <p>${t("dungeon.record")}: ${record} · ${t("dungeon.required")}: ${formatNumber(dungeon.requiredDps)}</p>
          <p>${t("dungeon.crystalBase")}: ${dungeon.crystalBase} · ${t("dungeon.enemiesPerFloor", { min: 20, max: 50 })}</p>
          <button class="small-action" data-action="start-dungeon" data-id="${dungeon.id}" ${locked || weak || active ? "disabled" : ""}>${t("dungeon.explore")}</button>
        </article>`;
      }).join("")}
    </section>`;
}

function renderMining() {
  const fill = state.mining.storage / state.mining.storageCap * 100;
  elements.view.innerHTML = `
    ${viewHeader(t("eyebrow.mining"), "view.miningTitle", "view.miningDesc")}
    <section class="combat-card">
      <div class="combat-meta"><div><span class="micro-label">${t("mining.storage")}</span><h3>${formatNumber(state.mining.storage)} / ${formatNumber(state.mining.storageCap)} ${gameTerm("currency", "ore", language()).toUpperCase()}</h3></div><span class="tag">+${formatNumber(orePerCycle(state))} / 3S</span></div>
      <div class="meter large"><span style="width:${percent(fill)}"></span></div>
      <div class="battle-readout"><div><span class="micro-label">${t("mining.totalMined")}</span><strong>${formatNumber(state.mining.totalMined)}</strong></div><div><span class="micro-label">${t("mining.pickaxe")}</span><strong>${t("common.levelShort")} ${state.shop.upgrades.pickaxe}</strong></div><div><span class="micro-label">${t("mining.nextCycle")}</span><strong>${Math.max(0, 3 - state.mining.progress).toFixed(1)}S</strong></div></div>
      <div class="action-row"><button class="primary-action" data-action="manual-mine">${t("mining.manual")}</button><button class="secondary-action" data-action="collect-ore">${t("mining.collect")}</button><button class="secondary-action" data-action="expand-storage">${t("mining.expand")}</button></div>
    </section>`;
}

function renderSummon() {
  const last = state.summon.last ? HERO_BY_ID.get(Number(state.summon.last.heroId)) : null;
  const lastMarkup = last ? `
    <article class="result-card rarity-${last.rarity}">
      <span class="panel-label">${state.summon.last.isNew ? t("summon.new") : t("summon.duplicate")}</span>
      <h3>${escapeHtml(last.name)} // ${gameTerm("rarity", last.rarity, language()).toUpperCase()}</h3>
      <p>${escapeHtml(localizeHero(last, language()).title)} · ${gameTerm("role", last.role, language()).toUpperCase()} · ${gameTerm("element", last.element, language()).toUpperCase()}</p>
      <p>${state.summon.last.improvedIVs ? `${t("summon.ivUpgraded")} · ` : ""}${state.summon.last.starUp ? t("summon.starUp") : ""}</p>
    </article>` : `<p class="empty-state">${t("summon.none")}</p>`;
  elements.view.innerHTML = `
    ${viewHeader(t("eyebrow.summon"), "view.summonTitle", "view.summonDesc")}
    <section class="summon-layout">
      <div class="combat-card summon-console">
        <div class="pity-number"><span>${t("summon.pity")}</span><strong>${state.summon.pity} / 100</strong></div>
        <div class="meter large"><span style="width:${percent(state.summon.pity)}"></span></div>
        <div class="odds-row">${Object.entries(SUMMON_RATES).map(([rarity, rate]) => `<span class="rarity-${rarity}">${gameTerm("rarity", rarity, language()).toUpperCase()} ${(rate * 100).toFixed(0)}%</span>`).join("")}</div>
        <button class="primary-action wide" data-action="summon-hero" ${state.resources.crystals < HERO_SUMMON_COST ? "disabled" : ""}>${t("summon.one")}</button>
      </div>
      <div><p class="panel-label">${t("summon.result")}</p>${lastMarkup}</div>
    </section>`;
}

function renderMarket() {
  elements.view.innerHTML = `
    ${viewHeader(t("eyebrow.market"), "view.marketTitle", "view.marketDesc")}
    <h3 class="section-title">${t("market.upgrades")}</h3>
    <section class="data-grid">
      ${SHOP_UPGRADES.map((upgrade) => {
        const copy = localizeEntity(upgrade, "upgrade", language());
        const level = state.shop.upgrades[upgrade.id] ?? 0;
        const cost = upgradeCost(state, upgrade.id);
        return `<article class="data-card"><div class="card-topline"><span>${gameTerm("currency", upgrade.currency, language()).toUpperCase()}</span><span>${t("common.levelShort")} ${level}/${upgrade.maxLevel}</span></div><h3>${escapeHtml(copy.name)}</h3><p>${escapeHtml(copy.description)}</p><button class="small-action" data-action="buy-upgrade" data-id="${upgrade.id}" ${level >= upgrade.maxLevel ? "disabled" : ""}>${formatNumber(cost)} ${gameTerm("currency", upgrade.currency, language()).toUpperCase()}</button></article>`;
      }).join("")}
    </section>
    <div class="section-heading"><h3 class="section-title">${t("market.rotatingEquipment")}</h3><button class="text-button" data-action="reroll-shop">${t("market.reroll")}</button></div>
    <section class="data-grid">
      ${state.shop.rotation.map((id) => EQUIPMENT.find((item) => item.id === id)).filter(Boolean).map((item) => { const copy = localizeEntity(item, "equipment", language()); return `<article class="data-card rarity-${item.rarity}"><div class="card-topline"><span>${gameTerm("rarity", item.rarity, language()).toUpperCase()}</span><span>${gameTerm("element", item.element, language()).toUpperCase()}</span></div><h3>${escapeHtml(copy.name)}</h3><p>+${item.attack} ${gameTerm("stat", "attack", language())} · ${escapeHtml(copy.passive)}</p><button class="small-action" data-action="buy-equipment" data-id="${item.id}">${item.cost} ${gameTerm("currency", "gold", language()).toUpperCase()}</button></article>`; }).join("")}
    </section>
    <div class="action-row spaced"><button class="secondary-action" data-action="craft-equipment">${t("market.craft")}</button><button class="secondary-action" data-action="summon-equipment">${t("market.summonEquipment")}</button></div>
    <h3 class="section-title">${t("market.inventory")}</h3>
    <section class="inventory-list">${state.equipment.inventory.map((entry) => { const item = EQUIPMENT.find((candidate) => candidate.id === entry.id); const copy = localizeEntity(item, "equipment", language()); return `<span>${escapeHtml(copy?.name ?? entry.id)} · ${"★".repeat(entry.stars)}${entry.stars === 5 ? ` · ${t("combat.passive").toUpperCase()}` : ""}</span>`; }).join("")}</section>`;
}

function renderPets() {
  elements.view.innerHTML = `
    ${viewHeader(t("eyebrow.pets"), "view.petsTitle", "view.petsDesc")}
    <section class="combat-card pet-console"><div class="pity-number"><span>${t("pets.pity")}</span><strong>${state.pets.pity} / 50</strong></div><button class="primary-action" data-action="summon-pet" ${state.resources.crystals < PET_SUMMON_COST ? "disabled" : ""}>${t("pets.summon")}</button></section>
    <section class="data-grid">
      ${PETS.map((pet) => {
        const copy = localizeEntity(pet, "pet", language());
        const instance = state.pets.collection[pet.id];
        const active = state.pets.active === pet.id;
        return `<article class="data-card rarity-${pet.rarity} ${active ? "selected" : ""}"><div class="card-topline"><span>${gameTerm("rarity", pet.rarity, language()).toUpperCase()}</span><span>${instance ? `${"★".repeat(instance.stars)}` : t("heroes.locked")}</span></div><h3>${escapeHtml(copy.name)}</h3><p><strong>${escapeHtml(copy.activeAbility.name)}</strong> · ${escapeHtml(copy.activeAbility.effect)} · ${t("combat.cooldown")} ${copy.activeAbility.cooldown}s</p><p>${escapeHtml(copy.passive)}</p>${instance ? `<button class="small-action" data-action="select-pet" data-id="${pet.id}" ${active ? "disabled" : ""}>${t("pets.select")}</button>` : ""}</article>`;
      }).join("")}
    </section>`;
}

function renderProfile() {
  elements.view.innerHTML = `
    ${viewHeader(t("eyebrow.profile"), "view.profileTitle", "view.profileDesc")}
    <section class="profile-grid">
      <div class="combat-card">
        <label class="field-label" for="player-name">${t("profile.name")}</label>
        <div class="inline-field"><input id="player-name" maxlength="24" value="${escapeHtml(state.settings.playerName)}"><button class="secondary-action" data-action="apply-name">${t("profile.apply")}</button></div>
        <div class="profile-list">
          <p><span>${t("profile.playerLevel")}</span><strong>${state.player.level}</strong></p>
          <p><span>${t("profile.playerXp")}</span><strong>${formatNumber(state.player.xp)} / ${formatNumber(state.player.xpToNext)}</strong></p>
          <p><span>${t("profile.highestFloor")}</span><strong>${state.player.highestFloor}</strong></p>
          <p><span>${t("profile.enemies")}</span><strong>${formatNumber(state.player.enemiesDefeated)}</strong></p>
          <p><span>${t("profile.bosses")}</span><strong>${formatNumber(state.player.bossesDefeated)}</strong></p>
          <p><span>${t("profile.summons")}</span><strong>${formatNumber(state.summon.total)}</strong></p>
          <p><span>${t("profile.heroes")}</span><strong>${ownedHeroes(state).length} / ${HEROES.length}</strong></p>
          <p><span>${t("profile.damageTaken")}</span><strong>${formatNumber(state.combat.damageTaken)}</strong></p>
          <p><span>${t("profile.healingDone")}</span><strong>${formatNumber(state.combat.healingDone)}</strong></p>
          <p><span>${t("profile.playTime")}</span><strong>${(state.player.totalPlaySeconds / 3600).toFixed(1)}H</strong></p>
        </div>
      </div>
      <div class="data-card danger-zone"><h3>${t("profile.newGame")}</h3><p>${language() === "pt" ? "Apaga apenas o progresso salvo neste navegador." : "Deletes only the progress saved in this browser."}</p><button class="danger-action" data-action="new-game">${t("profile.newGame")}</button></div>
    </section>`;
}

function renderLegacy() {
  const reward = essenceReward(state);
  elements.view.innerHTML = `
    ${viewHeader(t("eyebrow.legacy"), "view.legacyTitle", "view.legacyDesc")}
    <section class="combat-card legacy-card">
      <div class="pity-number"><span>${t("legacy.essenceReward")}</span><strong>+${reward}</strong></div>
      <p>${language() === "pt" ? "A coleção, estrelas, equipamentos, companheiros e Essência são mantidos. Os níveis da campanha e o ouro são reiniciados." : "Collection, stars, equipment, pets, and Essence are kept. Run levels and gold are reset."}</p>
      <div class="battle-readout"><div><span class="micro-label">${t("legacy.required")}</span><strong>${t("resource.zone")} 50</strong></div><div><span class="micro-label">${t("legacy.current")}</span><strong>${t("resource.zone")} ${state.player.highestFloor}</strong></div><div><span class="micro-label">${t("legacy.rebirths")}</span><strong>${state.player.rebirths}</strong></div></div>
      <button class="primary-action" data-action="rebirth" ${reward <= 0 ? "disabled" : ""}>${t("legacy.rebirth")}</button>
    </section>`;
}

function renderCurrentView() {
  renderStats();
  syncNavigation();
  renderTutorial();
  const renderers = { combat: renderCombat, heroes: renderHeroes, dungeons: renderDungeons, mining: renderMining, summon: renderSummon, shop: renderMarket, pets: renderPets, profile: renderProfile, legacy: renderLegacy };
  (renderers[currentView] ?? renderCombat)();
}

function setView(view) {
  if (!isSystemUnlocked(state, view)) {
    showToast(t(systemUnlock(view)?.requirementKey ?? "unlock.combat.requirement"));
    return;
  }
  currentView = view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  renderCurrentView();
  elements.view.focus();
}

function systemName(id) {
  const keys = { combat: "nav.expedition", heroes: "nav.heroes", dungeons: "nav.dungeons", mining: "nav.mining", summon: "nav.summon", shop: "nav.market", pets: "nav.pets", profile: "nav.profile", legacy: "nav.legacy" };
  return t(keys[id] ?? id);
}

function syncNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    const unlocked = isSystemUnlocked(state, button.dataset.view);
    button.disabled = !unlocked;
    button.classList.toggle("locked", !unlocked);
    button.title = unlocked ? "" : t(systemUnlock(button.dataset.view).requirementKey);
    let hint = button.querySelector(".nav-lock");
    if (!hint) {
      hint = document.createElement("small");
      hint.className = "nav-lock";
      button.append(hint);
    }
    hint.textContent = unlocked ? "" : `🔒 ${t(systemUnlock(button.dataset.view).requirementKey)}`;
    hint.hidden = unlocked;
  });
}

function renderTutorial() {
  const tutorial = state.progression.tutorial;
  elements.tutorial.hidden = tutorial.hidden;
  if (tutorial.hidden) return;

  const basics = [
    ["tutorial.welcomeTitle", "tutorial.welcomeBody"],
    ["tutorial.combatTitle", "tutorial.combatBody"],
    ["tutorial.resourcesTitle", "tutorial.resourcesBody"],
    ["tutorial.unlocksTitle", "tutorial.unlocksBody"],
  ];
  let kicker;
  let title;
  let body;
  let primaryAction;
  let primaryLabel;
  let primaryView = "";

  if (tutorial.notice) {
    const system = systemUnlock(tutorial.notice);
    kicker = t("tutorial.unlocked");
    title = systemName(system.id);
    body = `${t(`unlock.${system.id}.description`)}${system.reward?.crystals ? ` ${t("tutorial.crystalBonus", { amount: system.reward.crystals })}` : ""}`;
    primaryAction = "open-system";
    primaryLabel = t("tutorial.openSystem");
    primaryView = system.id;
  } else if (tutorial.step < basics.length) {
    kicker = t("tutorial.step", { current: tutorial.step + 1, total: basics.length });
    title = t(basics[tutorial.step][0]);
    body = t(basics[tutorial.step][1]);
    primaryAction = "next";
    primaryLabel = tutorial.step === basics.length - 1 ? t("tutorial.finishBasics") : t("tutorial.next");
  } else {
    const next = nextLockedSystem(state);
    kicker = next ? t("tutorial.nextUnlock") : t("tutorial.complete");
    title = next ? systemName(next.id) : t("tutorial.completeTitle");
    body = next
      ? `${t(`unlock.${next.id}.description`)} ${t(next.requirementKey)}`
      : t("tutorial.completeBody");
    primaryAction = "hide";
    primaryLabel = t("tutorial.closeForNow");
  }

  const restart = state.player.highestFloor > 1 && tutorial.step === 0
    ? `<button class="text-button tutorial-restart" type="button" data-tutorial-action="new-game">${escapeHtml(t("tutorial.restart"))}</button>`
    : "";
  const skip = tutorial.step < basics.length
    ? `<button class="text-button" type="button" data-tutorial-action="skip">${escapeHtml(t("tutorial.skip"))}</button>`
    : "";

  elements.tutorial.innerHTML = `
    <p class="panel-label">${escapeHtml(kicker)}</p>
    <h2 id="tutorial-title">${escapeHtml(title)}</h2>
    <p>${escapeHtml(body)}</p>
    <div class="tutorial-actions">
      <button class="primary-action" type="button" data-tutorial-action="${primaryAction}" ${primaryView ? `data-view-target="${primaryView}"` : ""}>${escapeHtml(primaryLabel)}</button>
      ${restart}${skip}
    </div>`;
}

function renderHelpDialog() {
  const pt = language() === "pt";
  const roadmap = SYSTEM_UNLOCKS.filter((system) => !["combat", "profile"].includes(system.id)).map((system) => `
    <li class="${isSystemUnlocked(state, system.id) ? "done" : ""}">
      <strong>${escapeHtml(systemName(system.id))}</strong>
      <span>${escapeHtml(isSystemUnlocked(state, system.id) ? (pt ? "LIBERADO" : "UNLOCKED") : t(system.requirementKey))}</span>
    </li>`).join("");
  elements.help.innerHTML = `
    <div class="help-heading"><div><p class="panel-label">${pt ? "MANUAL DO COMANDANTE" : "COMMANDER MANUAL"}</p><h2 id="help-title">${pt ? "COMO O JOGO FUNCIONA" : "HOW THE GAME WORKS"}</h2></div><button class="text-button" type="button" data-help-close>${t("action.close")}</button></div>
    <section class="help-section"><h3>${t("help.coreTitle")}</h3><p>${t("help.coreBody")}</p></section>
    <section class="help-section"><h3>${t("help.atbTitle")}</h3><p>${t("help.atbBody")}</p></section>
    <section class="help-grid">
      <article><strong>${pt ? "OURO" : "GOLD"}</strong><p>${pt ? "Compra melhorias e equipamentos no Mercado." : "Buys upgrades and equipment in the Market."}</p></article>
      <article><strong>${pt ? "CRISTAIS" : "CRYSTALS"}</strong><p>${t("help.crystals")}</p></article>
      <article><strong>${pt ? "MINÉRIO" : "ORE"}</strong><p>${t("help.ore")}</p></article>
      <article><strong>${pt ? "ESSÊNCIA" : "ESSENCE"}</strong><p>${t("help.essence")}</p></article>
      <article><strong>DPS</strong><p>${pt ? "Dano que sua formação causa por segundo." : "Damage your formation deals per second."}</p></article>
      <article><strong>IV</strong><p>${pt ? "Variação individual dos atributos. Quanto maior, melhor." : "Individual stat variation. Higher is better."}</p></article>
      <article><strong>${t("help.pityLabel")}</strong><p>${t("help.pity")}</p></article>
      <article><strong>${t("help.buffsLabel")}</strong><p>${t("help.buffs")}</p></article>
    </section>
    <section class="help-section"><h3>${pt ? "ROTA DE DESBLOQUEIO" : "UNLOCK ROADMAP"}</h3><ol class="unlock-roadmap">${roadmap}</ol></section>`;
}

function checkUnlocks() {
  const unlocked = syncProgression(state);
  for (const system of unlocked) {
    addLog(t("tutorial.unlockLog", { system: systemName(system.id) }), "success");
  }
  if (unlocked.length > 0) showToast(t("tutorial.unlockToast", { system: systemName(unlocked.at(-1).id) }));
  return unlocked;
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
  else if (action === "set-combat-speed") {
    const result = setCombatSpeed(state, Number(target.dataset.speed));
    const requirementKey = combatSpeedRequirementKey(Number(target.dataset.speed));
    showToast(result.ok ? t("combat.speedSelected", { speed: result.speed }) : t(requirementKey ?? "combat.speed2Requirement"));
  }
  else if (action === "manual-strike") {
    const result = manualStrike(state);
    describeEvents(result.events);
    showToast(result.ok ? `${language() === "pt" ? "Ataque coordenado" : "Focus attack"}: ${formatNumber(result.damage)}` : `${language() === "pt" ? "Ação em recarga" : "Action on cooldown"}.`);
  } else if (action === "manual-heal") {
    const result = manualHeal(state);
    describeEvents(result.events);
    showToast(result.ok ? `+${formatNumber(result.amount)} HP` : language() === "pt" ? "Cura indisponível." : "Healing unavailable.");
  } else if (action === "toggle-hero") {
    const result = toggleTeamHero(state, Number(id));
    if (!result.ok) showToast(result.reason === "teamFull" ? t("heroes.teamFull") : t("action.unavailable"));
  } else if (action === "hero-page") heroFilters.page = Math.max(0, Number(target.dataset.page));
  else if (action === "summon-hero") {
    const result = summonHero(state);
    if (!result.ok) showToast(language() === "pt" ? "Cristais insuficientes." : "Not enough crystals.");
    else addLog(`${result.hero.name} // ${gameTerm("rarity", result.rarity, language()).toUpperCase()} // ${result.isNew ? t("summon.new") : t("summon.duplicate")}.`, "loot");
  } else if (action === "equip-hero") {
    const equipmentId = document.querySelector(`#equipment-${id}`).value;
    if (equipmentId) equipHero(state, Number(id), equipmentId);
    else state.collection[String(id)].equipmentId = null;
  } else if (action === "start-dungeon") {
    const result = startDungeon(state, id);
    if (!result.ok) showToast(t("dungeon.unavailable", { reason: t(`reason.${result.reason}`) }));
    else addLog(t("dungeon.started", { name: localizeEntity(result.template, "dungeon", language()).name, floor: result.floor }), "boss");
  } else if (action === "abandon-dungeon") abandonDungeon(state);
  else if (action === "manual-mine") showToast(`+${manualMine(state)} ${gameTerm("currency", "ore", language())}`);
  else if (action === "collect-ore") showToast(`+${collectOre(state)} ${gameTerm("currency", "ore", language())}`);
  else if (action === "expand-storage") {
    const result = expandMineStorage(state);
    if (!result.ok) showToast(language() === "pt" ? "Ouro insuficiente." : "Not enough gold.");
  } else if (action === "buy-upgrade") {
    const result = buyUpgrade(state, id);
    showToast(result.ok ? t("market.upgradeLevel", { level: result.level }) : t("action.unavailableReason", { reason: t(`reason.${result.reason}`) }));
  } else if (action === "reroll-shop") {
    const result = rerollShop(state);
    if (!result.ok) showToast(language() === "pt" ? "Ouro insuficiente." : "Not enough gold.");
  } else if (action === "buy-equipment") {
    const result = buyShopEquipment(state, id);
    showToast(result.ok ? t("market.equipmentAcquired") : t("action.unavailableReason", { reason: t(`reason.${result.reason}`) }));
  } else if (action === "craft-equipment") {
    const result = craftEquipment(state);
    showToast(result.ok ? t("market.itemAcquired", { item: localizeEntity(result.item, "equipment", language()).name }) : t("action.unavailableReason", { reason: t(`reason.${result.reason}`) }));
  } else if (action === "summon-equipment") {
    const result = summonEquipment(state);
    showToast(result.ok ? t("market.itemAcquired", { item: localizeEntity(result.item, "equipment", language()).name }) : t("action.unavailableReason", { reason: t(`reason.${result.reason}`) }));
  } else if (action === "summon-pet") {
    const result = summonPet(state);
    if (result.ok) addLog(`${result.pet.name} // ${t("pets.single").toUpperCase()} ${gameTerm("rarity", result.rarity, language()).toUpperCase()}.`, "loot");
    else showToast(language() === "pt" ? "Cristais insuficientes." : "Not enough crystals.");
  } else if (action === "select-pet") selectPet(state, id);
  else if (action === "apply-name") state.settings.playerName = document.querySelector("#player-name").value.trim().slice(0, 24) || t("profile.defaultName");
  else if (action === "new-game") {
    if (!confirm(language() === "pt" ? "Apagar todo o progresso local?" : "Delete all local progress?")) return;
    clearSave();
    state = createInitialState();
    syncProgression(state);
    currentView = "combat";
    elements.log.replaceChildren();
    translateStatic(language());
    addLog(language() === "pt" ? "Novo jogo iniciado." : "New game started.");
  } else if (action === "rebirth") {
    if (!confirm(language() === "pt" ? "Reiniciar esta campanha?" : "Reset this run?")) return;
    const result = performRebirth(state);
    if (result.ok) addLog(t("legacy.complete", { reward: result.reward }), "success");
  }
  checkUnlocks();
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

elements.tutorial.addEventListener("click", (event) => {
  const target = event.target.closest("[data-tutorial-action]");
  if (!target) return;
  const action = target.dataset.tutorialAction;
  if (action === "next") advanceTutorial(state);
  else if (action === "hide") hideTutorial(state);
  else if (action === "skip") skipTutorial(state);
  else if (action === "open-system") {
    const view = target.dataset.viewTarget;
    clearUnlockNotice(state);
    hideTutorial(state);
    setView(view);
  } else if (action === "new-game") {
    if (!confirm(t("tutorial.restartConfirm"))) return;
    clearSave();
    state = createInitialState();
    syncProgression(state);
    currentView = "combat";
    elements.log.replaceChildren();
    addLog(t("tutorial.restartLog"), "success");
  }
  persist();
  renderCurrentView();
});

document.querySelector("#guide-button").addEventListener("click", () => {
  reopenTutorial(state);
  renderTutorial();
  persist();
});
document.querySelector("#help-button").addEventListener("click", () => {
  renderHelpDialog();
  elements.help.showModal();
});
elements.help.addEventListener("click", (event) => {
  if (event.target.closest("[data-help-close]")) elements.help.close();
});

document.querySelector("#clear-log").addEventListener("click", () => { elements.log.replaceChildren(); addLog(language() === "pt" ? "Registro limpo." : "Log cleared."); });
document.querySelector("#save-button").addEventListener("click", () => persist(true));
document.querySelector("#export-button").addEventListener("click", () => downloadSave(state));
document.querySelector("#import-button").addEventListener("click", () => document.querySelector("#import-file").click());
document.querySelector("#import-file").addEventListener("change", async (event) => {
  try {
    state = await importSaveFile(event.target.files[0]);
    checkUnlocks();
    if (!isSystemUnlocked(state, currentView)) currentView = "combat";
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
  elements.log.replaceChildren();
  addLog(t("log.languageChanged"), "success");
  renderCurrentView();
  if (elements.help.open) renderHelpDialog();
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
  const mineWasUnlocked = isSystemUnlocked(state, "mining");
  describeEvents(tickCombat(state, offlineSeconds));
  describeEvents(tickDungeon(state, offlineSeconds));
  const mined = mineWasUnlocked ? tickMining(state, offlineSeconds) : 0;
  addLog(language() === "pt"
    ? `Progresso desconectado de ${(offlineSeconds / 3600).toFixed(1)}h aplicado. Mina: +${mined}.`
    : `${(offlineSeconds / 3600).toFixed(1)}h of offline progress applied. Mine: +${mined}.`, "success");
}
checkUnlocks();
state.meta.lastTickAt = Date.now();
translateStatic(language());
document.querySelector("#language-button").textContent = state.language === "pt" ? "ENGLISH" : "PORTUGUÊS";
addLog(language() === "pt" ? "Zillion Hero iniciado. Formação pronta para avançar." : "Zillion Hero started. Formation ready to advance.");
for (const system of startupUnlocks) addLog(t("tutorial.unlockLog", { system: systemName(system.id) }), "success");
renderCurrentView();

let previousTime = performance.now();
function loop(currentTime) {
  const elapsed = Math.min(2, Math.max(0, (currentTime - previousTime) / 1000));
  previousTime = currentTime;
  describeEvents(tickCombat(state, scaledCombatElapsed(state, elapsed)));
  describeEvents(tickDungeon(state, elapsed));
  if (isSystemUnlocked(state, "mining")) tickMining(state, elapsed);
  const unlocked = checkUnlocks();
  state.meta.lastTickAt = Date.now();
  renderStats();
  if (unlocked.length > 0 || (currentTime - renderAt > 350 && ["combat", "dungeons", "mining"].includes(currentView))) {
    renderAt = currentTime;
    renderCurrentView();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setInterval(() => persist(), 10000);
document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); });
window.addEventListener("beforeunload", () => persist());
