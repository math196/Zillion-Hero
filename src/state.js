import { GAME_VERSION, enemiesInFloor } from "./gameData.js";
import { activeTeamLimit, createStarterCollection } from "./heroes.js";
import { createProgressionState, normalizeProgression } from "./progression.js";

export function createInitialState(now = Date.now()) {
  return {
    version: GAME_VERSION,
    language: "pt",
    settings: {
      playerName: "Comandante",
      theme: "terminal",
      volume: 0,
      offlineCapHours: 12,
    },
    player: {
      level: 1,
      xp: 0,
      xpToNext: 100,
      enemiesDefeated: 0,
      bossesDefeated: 0,
      highestFloor: 1,
      totalPlaySeconds: 0,
      rebirths: 0,
    },
    resources: {
      gold: 40,
      crystals: 0,
      ore: 0,
      tokens: 0,
      essence: 0,
    },
    collection: createStarterCollection(),
    activeTeam: [105, 201],
    summon: {
      pity: 0,
      total: 0,
      last: null,
    },
    combat: {
      floor: 1,
      phase: "horde",
      enemiesRemaining: enemiesInFloor(1),
      enemiesTotal: enemiesInFloor(1),
      enemy: null,
      attackTimer: 0,
      skillTimer: 0,
      enemyAttackTimer: 0,
      manualStrikeCooldown: 0,
      manualHealCooldown: 0,
      recovering: 0,
      teamHp: null,
      teamMaxHp: null,
      lastTeamDamage: 0,
      lastHealAmount: 0,
      lastHealer: null,
      damageTaken: 0,
      healingDone: 0,
      party: {},
      paused: false,
      activeEffects: [],
      lastFloorReward: null,
    },
    dungeons: {
      selected: "ancient-crypt",
      records: {},
      runs: 0,
      lastResult: null,
    },
    mining: {
      progress: 0,
      totalMined: 0,
      storage: 0,
      storageCap: 500,
    },
    equipment: {
      inventory: [],
    },
    shop: {
      upgrades: { training: 0, fortune: 0, pickaxe: 0, focus: 0 },
      rotation: ["ice-dagger", "thunder-hammer", "stone-aegis"],
      rotationCount: 0,
    },
    pets: {
      collection: {},
      active: null,
      pity: 0,
      totalSummons: 0,
    },
    progression: createProgressionState(),
    meta: {
      createdAt: now,
      lastSavedAt: now,
      lastTickAt: now,
    },
  };
}

export function normalizeState(raw, now = Date.now()) {
  const base = createInitialState(now);
  if (!raw || typeof raw !== "object") return base;
  const state = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...raw.settings },
    player: { ...base.player, ...raw.player },
    resources: { ...base.resources, ...raw.resources },
    summon: { ...base.summon, ...raw.summon },
    combat: { ...base.combat, ...raw.combat, party: { ...base.combat.party, ...raw.combat?.party } },
    dungeons: { ...base.dungeons, ...raw.dungeons, records: { ...base.dungeons.records, ...raw.dungeons?.records } },
    mining: { ...base.mining, ...raw.mining },
    equipment: { ...base.equipment, ...raw.equipment, inventory: Array.isArray(raw.equipment?.inventory) ? raw.equipment.inventory : base.equipment.inventory },
    shop: { ...base.shop, ...raw.shop, upgrades: { ...base.shop.upgrades, ...raw.shop?.upgrades } },
    pets: { ...base.pets, ...raw.pets, collection: { ...base.pets.collection, ...raw.pets?.collection } },
    progression: normalizeProgression(raw.progression),
    meta: { ...base.meta, ...raw.meta },
    collection: { ...base.collection, ...raw.collection },
    activeTeam: Array.isArray(raw.activeTeam) ? [...new Set(raw.activeTeam.map(Number))].slice(0, 20) : base.activeTeam,
  };
  state.activeTeam = state.activeTeam.filter((id) => state.collection[String(id)]).slice(0, activeTeamLimit(state));
  if (state.activeTeam.length === 0) state.activeTeam = [Number(Object.keys(state.collection)[0] ?? 105)];
  state.version = base.version;
  return state;
}

