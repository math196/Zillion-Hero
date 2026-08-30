import { DUNGEONS, bossForFloor, enemiesInFloor } from "./gameData.js";
import { calculateTeamDps, grantTeamXp } from "./heroes.js";

function dungeonTemplate(id) {
  return DUNGEONS.find((dungeon) => dungeon.id === id) ?? null;
}

function createDungeonEnemy(run) {
  const template = dungeonTemplate(run.id);
  const bossFloor = run.floor % 10 === 0 && run.phase === "boss";
  const boss = bossFloor ? bossForFloor(run.floor) : null;
  const hp = bossFloor
    ? Math.floor(template.requiredDps * 42 * Math.pow(1.18, run.floor - 1))
    : Math.floor(template.requiredDps * 1.8 * Math.pow(1.12, run.floor - 1) * (1 + (run.enemiesTotal - run.enemiesRemaining) * 0.008));
  run.enemy = {
    name: boss?.name ?? `${template.name} Warden`,
    type: bossFloor ? "boss" : "normal",
    hp,
    maxHp: hp,
    abilities: boss?.abilities ?? [],
  };
  return run.enemy;
}

export function startDungeon(state, dungeonId) {
  const template = dungeonTemplate(dungeonId);
  if (!template) return { ok: false, reason: "dungeon" };
  if (state.player.highestFloor < template.minFloor) return { ok: false, reason: "locked" };
  if (calculateTeamDps(state) < template.requiredDps) return { ok: false, reason: "power" };
  if (state.resources.gold < template.goldCost) return { ok: false, reason: "gold", cost: template.goldCost };
  state.resources.gold -= template.goldCost;
  const previous = state.dungeons.records[dungeonId] ?? 0;
  const floor = Math.min(template.maxFloor, previous + 1);
  state.dungeons.active = {
    id: dungeonId,
    floor,
    phase: "horde",
    enemiesTotal: enemiesInFloor(floor),
    enemiesRemaining: enemiesInFloor(floor),
    enemy: null,
    progressDamage: 0,
  };
  state.dungeons.runs += 1;
  return { ok: true, template, floor };
}

function completeDungeonFloor(state, run, events) {
  const template = dungeonTemplate(run.id);
  const crystals = template.crystalBase + Math.floor(run.floor / 10) * template.crystalBase;
  const gold = Math.floor(template.goldCost * 0.7 + run.floor * 12);
  const tokens = run.floor % 10 === 0 ? Math.max(1, Math.floor(run.floor / 10)) : 0;
  state.resources.crystals += crystals;
  state.resources.gold += gold;
  state.resources.tokens += tokens;
  grantTeamXp(state, 20 * run.floor);
  state.dungeons.records[run.id] = Math.max(state.dungeons.records[run.id] ?? 0, run.floor);
  state.dungeons.lastResult = { id: run.id, floor: run.floor, crystals, gold, tokens };
  state.dungeons.active = null;
  events.push({ type: "dungeonComplete", name: template.name, floor: run.floor, crystals, gold, tokens });
}

export function tickDungeon(state, elapsedSeconds) {
  const run = state.dungeons.active;
  if (!run || elapsedSeconds <= 0) return [];
  const events = [];
  let damage = calculateTeamDps(state) * elapsedSeconds * 0.75;
  let guard = 0;

  while (damage > 0 && guard < 1000 && state.dungeons.active) {
    const enemy = run.enemy?.hp > 0 ? run.enemy : createDungeonEnemy(run);
    if (damage < enemy.hp) {
      enemy.hp -= damage;
      damage = 0;
      break;
    }
    damage -= enemy.hp;
    run.enemy = null;
    if (enemy.type === "boss") {
      completeDungeonFloor(state, run, events);
      break;
    }
    run.enemiesRemaining -= 1;
    if (run.enemiesRemaining <= 0) {
      if (run.floor % 10 === 0) {
        run.phase = "boss";
        createDungeonEnemy(run);
        events.push({ type: "dungeonBoss", name: run.enemy.name, floor: run.floor });
      } else {
        completeDungeonFloor(state, run, events);
        break;
      }
    }
    guard += 1;
  }
  return events;
}

export function abandonDungeon(state) {
  if (!state.dungeons.active) return false;
  state.dungeons.active = null;
  return true;
}

