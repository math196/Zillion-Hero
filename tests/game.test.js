import assert from "node:assert/strict";
import test from "node:test";

import { multiplyEffects } from "../src/buffs.js";
import { ensureEnemy, tickCombat } from "../src/combat.js";
import { startDungeon } from "../src/dungeons.js";
import { HEROES } from "../src/heroesData.js";
import { createHeroInstance, summonHero, toggleTeamHero } from "../src/heroes.js";
import { enemiesInFloor } from "../src/gameData.js";
import { collectOre, tickMining } from "../src/mining.js";
import { createInitialState } from "../src/state.js";

test("catalog has 200 unique heroes with the requested rarity split", () => {
  assert.equal(HEROES.length, 200);
  assert.equal(new Set(HEROES.map((hero) => hero.id)).size, 200);
  assert.equal(new Set(HEROES.map((hero) => hero.name)).size, 200);
  assert.deepEqual(
    Object.fromEntries(["common", "rare", "epic", "legendary"].map((rarity) => [rarity, HEROES.filter((hero) => hero.rarity === rarity).length])),
    { common: 100, rare: 60, epic: 30, legendary: 10 },
  );
  for (const hero of HEROES) {
    assert.ok(hero.title && hero.element && hero.role && hero.appearance);
    assert.ok(hero.stats.hp > 0 && hero.stats.attack > 0);
    assert.ok(hero.ability.name && hero.ability.description && hero.ability.cooldown > 0);
  }
});

test("percentage buffs accumulate multiplicatively", () => {
  assert.equal(multiplyEffects(5, [1.5]), 7.5);
  assert.equal(multiplyEffects(5, [1.5, 1.5]), 11.25);
});

test("legendary pity guarantees summon 100", () => {
  const state = createInitialState();
  state.resources.crystals = 100;
  state.summon.pity = 99;
  const result = summonHero(state, () => 0.5);
  assert.equal(result.ok, true);
  assert.equal(result.rarity, "legendary");
  assert.equal(state.summon.pity, 0);
});

test("formation accepts any owned hero but never exceeds 20", () => {
  const state = createInitialState();
  const ids = HEROES.slice(0, 21).map((hero) => hero.id);
  state.collection = Object.fromEntries(ids.map((id) => [id, createHeroInstance(id, () => 0.5)]));
  state.activeTeam = ids.slice(0, 20);
  const result = toggleTeamHero(state, ids[20]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "teamFull");
  assert.equal(state.activeTeam.length, 20);
});

test("every normal floor contains 20 to 50 enemies", () => {
  for (let floor = 1; floor <= 500; floor += 1) {
    assert.ok(enemiesInFloor(floor) >= 20);
    assert.ok(enemiesInFloor(floor) <= 50);
  }
});

test("floor 10 transitions from horde to boss and then to floor 11", () => {
  const state = createInitialState();
  state.combat.floor = 10;
  state.combat.phase = "horde";
  state.combat.enemiesTotal = 1;
  state.combat.enemiesRemaining = 1;
  state.combat.enemy = { id: "test", name: "Test", type: "normal", hp: 1, maxHp: 1, defense: 0, abilities: [] };
  state.combat.attackTimer = 2;
  tickCombat(state, 2, () => 0.5);
  assert.equal(state.combat.phase, "boss");
  ensureEnemy(state, () => 0.5);
  assert.equal(state.combat.enemy.type, "boss");
  state.combat.enemy.hp = 1;
  state.combat.attackTimer = 2;
  tickCombat(state, 2, () => 0.5);
  assert.equal(state.combat.floor, 11);
  assert.equal(state.combat.phase, "horde");
});

test("dungeon and mining loops produce offline rewards", () => {
  const state = createInitialState();
  state.resources.gold = 1000;
  const started = startDungeon(state, "ancient-crypt");
  assert.equal(started.ok, true);
  const mined = tickMining(state, 30);
  assert.ok(mined > 0);
  assert.equal(collectOre(state), mined);
  assert.equal(state.resources.ore, mined);
});

