import { applyEffects } from "./buffs.js";
import { EQUIPMENT } from "./gameData.js";
import { HEROES, HERO_BY_ID, SUMMON_RATES } from "./heroesData.js";

export const MAX_ACTIVE_HEROES = 20;
export const HERO_SUMMON_COST = 5;

const IV_STATS = ["hp", "attack", "defense", "critRate", "critDamage", "hpRecovery", "attackSpeed"];

export function rollIVs(random = Math.random) {
  return Object.fromEntries(IV_STATS.map((stat) => [stat, Number((0.9 + random() * 0.2).toFixed(4))]));
}

export function ivScore(ivs) {
  return IV_STATS.reduce((total, stat) => total + (ivs?.[stat] ?? 1), 0) / IV_STATS.length;
}

export function createHeroInstance(heroId, random = Math.random, overrides = {}) {
  return {
    heroId,
    level: 1,
    xp: 0,
    xpToNext: 50,
    stars: 1,
    shards: 0,
    ivs: rollIVs(random),
    equipmentId: null,
    favorite: false,
    cooldownRemaining: 0,
    ...overrides,
  };
}

export function createStarterCollection() {
  return {
    201: createHeroInstance(201, () => 0.58, { level: 1, xp: 15, xpToNext: 50, stars: 2 }),
    503: createHeroInstance(503, () => 0.62, { level: 2, xp: 30, xpToNext: 70, stars: 3, equipmentId: "flaming-sword" }),
  };
}

export function getHeroInstance(state, heroId) {
  return state.collection[String(heroId)] ?? state.collection[heroId] ?? null;
}

export function calculateHeroStats(state, heroId, effects = []) {
  const hero = HERO_BY_ID.get(Number(heroId));
  const instance = getHeroInstance(state, heroId);
  if (!hero || !instance) return null;

  const levelMultiplier = 1 + (instance.level - 1) * 0.08;
  const starMultiplier = 1 + (instance.stars - 1) * 0.18;
  const baseStats = {};
  for (const stat of IV_STATS) {
    baseStats[stat] = hero.stats[stat] * (instance.ivs?.[stat] ?? 1) * levelMultiplier * starMultiplier;
  }

  const inventoryItem = state.equipment.inventory.find((item) => item.id === instance.equipmentId);
  const template = inventoryItem ? EQUIPMENT.find((item) => item.id === inventoryItem.id) : null;
  if (template) {
    baseStats.attack += template.attack * (1 + (inventoryItem.stars - 1) * 0.25);
    if (inventoryItem.stars >= 5) {
      if (template.id === "flaming-sword" && hero.element === "fire") baseStats.attack *= 1.2;
      if (template.id === "ice-dagger") baseStats.critRate *= 1.15;
      if (template.id === "thunder-hammer") baseStats.attackSpeed *= 1.18;
      if (template.id === "moon-katana") baseStats.critDamage *= 1.3;
      if (template.id === "stone-aegis") baseStats.defense *= 1.22;
      if (template.id === "verdant-codex") baseStats.hpRecovery *= 1.2;
      if (template.id === "gear-heart") baseStats.attack += template.attack * 0.25;
    }
  }

  const trainingLevel = state.shop.upgrades.training ?? 0;
  const essenceMultiplier = 1 + state.resources.essence * 0.03;
  const progressionEffects = [
    { stat: "attack", multiplier: 1 + trainingLevel * 0.12, target: "team", remaining: Infinity },
    { stat: "attack", multiplier: essenceMultiplier, target: "team", remaining: Infinity },
  ];
  return applyEffects(baseStats, [...progressionEffects, ...effects], "team");
}

export function calculateHeroDps(state, heroId, effects = []) {
  const stats = calculateHeroStats(state, heroId, effects);
  if (!stats) return 0;
  const attacksPerSecond = Math.max(0.15, stats.attackSpeed / 100);
  const criticalFactor = 1 + (stats.critRate / 100) * Math.max(0, stats.critDamage / 100 - 1);
  return stats.attack * attacksPerSecond * criticalFactor;
}

export function getTeamSynergyEffects(state) {
  const heroes = state.activeTeam.map((id) => HERO_BY_ID.get(Number(id))).filter(Boolean);
  const elements = new Map();
  const roles = new Map();
  for (const hero of heroes) {
    elements.set(hero.element, (elements.get(hero.element) ?? 0) + 1);
    roles.set(hero.role, (roles.get(hero.role) ?? 0) + 1);
  }

  const effects = [];
  for (const [element, count] of elements) {
    if (count >= 4) effects.push({ sourceId: `synergy-${element}`, stat: "attack", multiplier: 1 + Math.min(0.25, count * 0.015), target: "team", remaining: Infinity });
  }
  if ((roles.get("support") ?? 0) >= 3) effects.push({ sourceId: "synergy-support", stat: "attackSpeed", multiplier: 1.12, target: "team", remaining: Infinity });
  if ((roles.get("tank") ?? 0) >= 3) effects.push({ sourceId: "synergy-tank", stat: "defense", multiplier: 1.15, target: "team", remaining: Infinity });
  if ((roles.get("healer") ?? 0) >= 2) effects.push({ sourceId: "synergy-healer", stat: "hpRecovery", multiplier: 1.12, target: "team", remaining: Infinity });
  return effects;
}

export function calculateTeamDps(state, activeEffects = []) {
  const effects = [...getTeamSynergyEffects(state), ...activeEffects];
  return state.activeTeam.reduce((total, heroId) => total + calculateHeroDps(state, heroId, effects), 0);
}

export function toggleTeamHero(state, heroId) {
  const numericId = Number(heroId);
  if (!getHeroInstance(state, numericId)) return { ok: false, reason: "locked" };
  const index = state.activeTeam.indexOf(numericId);
  if (index >= 0) {
    if (state.activeTeam.length <= 1) return { ok: false, reason: "lastHero" };
    state.activeTeam.splice(index, 1);
    return { ok: true, active: false };
  }
  if (state.activeTeam.length >= MAX_ACTIVE_HEROES) return { ok: false, reason: "teamFull" };
  state.activeTeam.push(numericId);
  return { ok: true, active: true };
}

function rollRarity(pity, random) {
  if (pity >= 99) return "legendary";
  const roll = random();
  if (roll < SUMMON_RATES.legendary) return "legendary";
  if (roll < SUMMON_RATES.legendary + SUMMON_RATES.epic) return "epic";
  if (roll < SUMMON_RATES.legendary + SUMMON_RATES.epic + SUMMON_RATES.rare) return "rare";
  return "common";
}

function randomHeroByRarity(rarity, random) {
  const pool = HEROES.filter((hero) => hero.rarity === rarity);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export function summonHero(state, random = Math.random) {
  if (state.resources.crystals < HERO_SUMMON_COST) return { ok: false, reason: "crystals" };
  state.resources.crystals -= HERO_SUMMON_COST;
  const rarity = rollRarity(state.summon.pity, random);
  const hero = randomHeroByRarity(rarity, random);
  const rolledIVs = rollIVs(random);
  const existing = getHeroInstance(state, hero.id);
  let isNew = false;
  let improvedIVs = false;
  let starUp = false;

  if (!existing) {
    state.collection[String(hero.id)] = createHeroInstance(hero.id, random, { ivs: rolledIVs });
    isNew = true;
    if (state.activeTeam.length < MAX_ACTIVE_HEROES) state.activeTeam.push(hero.id);
  } else {
    existing.shards += 1;
    if (ivScore(rolledIVs) > ivScore(existing.ivs)) {
      existing.ivs = rolledIVs;
      improvedIVs = true;
    }
    const shardsNeeded = Math.min(8, existing.stars + 2);
    if (existing.stars < 5 && existing.shards >= shardsNeeded) {
      existing.shards -= shardsNeeded;
      existing.stars += 1;
      starUp = true;
    } else if (existing.stars >= 5) {
      state.resources.tokens += 1;
    }
  }

  state.summon.total += 1;
  state.summon.pity = rarity === "legendary" ? 0 : state.summon.pity + 1;
  state.summon.last = { heroId: hero.id, rarity, isNew, improvedIVs, starUp };
  return { ok: true, hero, rarity, isNew, improvedIVs, starUp };
}

export function grantTeamXp(state, amount) {
  const levelUps = [];
  for (const heroId of state.activeTeam) {
    const instance = getHeroInstance(state, heroId);
    instance.xp += amount;
    while (instance.xp >= instance.xpToNext) {
      instance.xp -= instance.xpToNext;
      instance.level += 1;
      instance.xpToNext = Math.floor(50 + instance.level * 22 + Math.pow(instance.level, 1.35) * 4);
      levelUps.push(heroId);
    }
  }
  return levelUps;
}

export function ownedHeroes(state) {
  return Object.keys(state.collection)
    .map(Number)
    .map((id) => HERO_BY_ID.get(id))
    .filter(Boolean);
}

