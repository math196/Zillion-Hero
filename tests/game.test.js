import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { multiplyEffects } from "../src/buffs.js";
import { ensureEnemy, manualHeal, partySnapshot, syncPartyState, tickCombat } from "../src/combat.js";
import { startDungeon } from "../src/dungeons.js";
import { HEROES } from "../src/heroesData.js";
import { activeTeamLimit, calculateHeroStats, createHeroInstance, summonHero, toggleTeamHero } from "../src/heroes.js";
import { enemiesInFloor } from "../src/gameData.js";
import { currentCombatSpeed, isCombatSpeedUnlocked, scaledCombatElapsed, setCombatSpeed } from "../src/gameSpeed.js";
import { gameTerm, localizeEntity, localizeHero } from "../src/gameText.js";
import { collectOre, expandMineStorage, storageExpansionCost, tickMining } from "../src/mining.js";
import { createInitialState } from "../src/state.js";
import { translate } from "../src/i18n.js";
import { isSystemUnlocked, syncProgression } from "../src/progression.js";

test("a new campaign starts modestly with only the core systems", () => {
  const state = createInitialState();
  assert.equal(state.language, "en");
  assert.equal(state.settings.playerName, "Commander");
  assert.deepEqual(state.activeTeam, [105, 201]);
  assert.equal(state.resources.gold, 40);
  assert.equal(state.resources.crystals, 0);
  assert.equal(activeTeamLimit(state), 2);
  assert.equal(isSystemUnlocked(state, "combat"), true);
  assert.equal(isSystemUnlocked(state, "profile"), true);
  assert.equal(isSystemUnlocked(state, "heroes"), false);
  assert.equal(isSystemUnlocked(state, "summon"), false);
});

test("Portuguese and English presentation never share the other language's hero copy", () => {
  const finn = HEROES.find((hero) => hero.id === 105);
  const portuguese = localizeHero(finn, "pt");
  const english = localizeHero(finn, "en");

  assert.equal(gameTerm("role", "healer", "pt"), "Curador");
  assert.equal(gameTerm("rarity", "legendary", "pt"), "Lendário");
  assert.match(portuguese.basicAttack.name, /de Finn/);
  assert.doesNotMatch(`${portuguese.title} ${portuguese.appearance} ${portuguese.basicAttack.description} ${portuguese.special.description}`, /Deals|Attack|Special|distinctive|equipment/i);
  assert.match(english.appearance, /distinctive fire dps/i);
  assert.doesNotMatch(english.appearance, /visual|energia|equipamento/i);
  assert.equal(localizeEntity({ id: "ancient-crypt", name: "Ancient Crypt" }, "dungeon", "pt").name, "Cripta Antiga");

  for (const hero of HEROES) {
    const pt = localizeHero(hero, "pt");
    const en = localizeHero(hero, "en");
    assert.doesNotMatch(`${pt.title} ${pt.appearance} ${pt.basicAttack.name} ${pt.basicAttack.description} ${pt.special.name} ${pt.special.description} ${pt.passive.name} ${pt.passive.description}`, /Deals|Attack|Special|Passive|distinctive|equipment|allies|enemy/i, `English leaked into Portuguese copy for ${hero.name}`);
    assert.doesNotMatch(`${en.appearance} ${en.basicAttack.description} ${en.special.description} ${en.passive.description}`, /visual inconfundível|energia de|equipamento próprio|ao alcançar|causa dano/i, `Portuguese leaked into English copy for ${hero.name}`);
  }
});

test("every static interface translation used by the main screen exists in both languages", () => {
  const mainSource = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const keys = [
    ...mainSource.matchAll(/\bt\("([^"]+)"/g),
    ...htmlSource.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g),
  ].map((match) => match[1]);
  for (const key of new Set(keys)) {
    assert.notEqual(translate("pt", key), key, `missing Portuguese translation for ${key}`);
    assert.notEqual(translate("en", key), key, `missing English translation for ${key}`);
  }
});

test("every resource-spending control visibly renders its dynamic cost", () => {
  const mainSource = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  const paidActions = [
    "start-dungeon",
    "expand-storage",
    "summon-hero",
    "buy-upgrade",
    "reroll-shop",
    "buy-equipment",
    "craft-equipment",
    "summon-equipment",
    "summon-pet",
  ];

  for (const action of paidActions) {
    const marker = `data-action="${action}"`;
    const index = mainSource.indexOf(marker);
    assert.notEqual(index, -1, `missing paid action ${action}`);
    const snippet = mainSource.slice(Math.max(0, index - 140), index + 260);
    assert.match(snippet, /purchase-action/, `${action} must use the paid-action presentation`);
    assert.match(snippet, /Control\.content/, `${action} must render its cost`);
  }
});

test("storage expansion exposes its current cost and increases it with capacity", () => {
  const state = createInitialState();
  assert.equal(storageExpansionCost(state), 150);
  state.resources.gold = 149;
  assert.deepEqual(expandMineStorage(state), { ok: false, cost: 150 });
  state.resources.gold = 150;
  assert.deepEqual(expandMineStorage(state), { ok: true, cost: 150 });
  assert.equal(state.mining.storageCap, 750);
  assert.equal(storageExpansionCost(state), 225);
});

test("systems unlock gradually and milestone rewards are only granted once", () => {
  const state = createInitialState();
  state.player.highestFloor = 3;
  const unlocked = syncProgression(state).map((system) => system.id);
  assert.deepEqual(unlocked, ["heroes", "summon"]);
  assert.equal(state.resources.crystals, 10);
  assert.equal(activeTeamLimit(state), 2);
  syncProgression(state);
  assert.equal(state.resources.crystals, 10);

  state.player.highestFloor = 4;
  assert.deepEqual(syncProgression(state).map((system) => system.id), ["mining"]);
  assert.equal(activeTeamLimit(state), 3);

  state.player.bossesDefeated = 1;
  assert.deepEqual(syncProgression(state).map((system) => system.id), ["dungeons"]);
  assert.equal(state.resources.crystals, 15);

  state.dungeons.records["ancient-crypt"] = 1;
  assert.deepEqual(syncProgression(state).map((system) => system.id), ["pets"]);
  assert.equal(state.resources.crystals, 45);
});

test("catalog has 200 unique heroes with the requested rarity split", () => {
  assert.equal(HEROES.length, 200);
  assert.equal(new Set(HEROES.map((hero) => hero.id)).size, 200);
  assert.equal(new Set(HEROES.map((hero) => hero.name)).size, 200);
  assert.equal(new Set(HEROES.map((hero) => hero.basicAttack.name)).size, 200);
  assert.equal(new Set(HEROES.map((hero) => hero.special.name)).size, 200);
  assert.equal(new Set(HEROES.map((hero) => hero.passive.name)).size, 200);
  assert.deepEqual(
    Object.fromEntries(["common", "rare", "epic", "legendary"].map((rarity) => [rarity, HEROES.filter((hero) => hero.rarity === rarity).length])),
    { common: 100, rare: 60, epic: 30, legendary: 10 },
  );
  for (const hero of HEROES) {
    assert.ok(hero.title && hero.element && hero.role && hero.appearance);
    assert.ok(hero.stats.hp > 0 && hero.stats.attack > 0);
    assert.ok(hero.basicAttack.name && hero.basicAttack.description && hero.basicAttack.coefficient > 0);
    assert.ok(hero.special.name && hero.special.description && hero.special.cooldown > 0);
    assert.ok(hero.passive.name && hero.passive.description && hero.passive.effects.length > 0);
    assert.equal(hero.passive.unlockedAtStars, 5);
  }
});

test("a 5-star team passive changes the intended stat multiplicatively", () => {
  const state = createInitialState();
  state.collection["201"].stars = 4;
  const before = calculateHeroStats(state, 105).hpRecovery;
  state.collection["201"].stars = 5;
  const after = calculateHeroStats(state, 105).hpRecovery;
  const multiplier = HEROES.find((hero) => hero.id === 201).passive.effects[0].multiplier;
  assert.ok(Math.abs(after / before - multiplier) < 0.000001);
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

test("the first floor is quick and shows the automatic battle", () => {
  const state = createInitialState();
  let elapsed = 0;
  let heroActions = 0;

  while (state.combat.floor === 1 && elapsed < 180) {
    const events = tickCombat(state, 0.5, () => 0.5);
    heroActions += events.filter((event) => event.type === "heroAction").length;
    elapsed += 0.5;
  }

  assert.equal(state.combat.floor, 2);
  assert.ok(elapsed >= 15 && elapsed <= 45, `first floor took ${elapsed}s`);
  assert.ok(heroActions > 0, "heroes must visibly act before the floor is cleared");
});

test("the first ten floors form a roughly five-minute tutorial before scaling", () => {
  const state = createInitialState();
  let elapsed = 0;
  let enemyActions = 0;
  let heals = 0;
  let bossSkills = 0;

  while (state.combat.floor <= 10 && elapsed < 600) {
    const events = tickCombat(state, 0.25, () => 0.5);
    enemyActions += events.filter((event) => event.type === "enemyAction").length;
    heals += events.filter((event) => event.type === "heal").length;
    bossSkills += events.filter((event) => event.type === "bossSkill").length;
    elapsed += 0.25;
  }

  assert.equal(state.combat.floor, 11);
  assert.ok(elapsed >= 240 && elapsed <= 360, `tutorial took ${elapsed}s`);
  assert.ok(enemyActions > 0, "enemies must act during the tutorial");
  assert.ok(heals > 0, "the healer must visibly contribute during the tutorial");
  assert.ok(bossSkills > 0, "the tutorial boss must use its special ability");
  assert.equal(state.player.bossesDefeated, 1);
  assert.equal(enemiesInFloor(10), 20);
  assert.ok(enemiesInFloor(11) > enemiesInFloor(10));
});

test("combat speed unlocks through progress and never accelerates offline time", () => {
  const state = createInitialState();
  assert.equal(currentCombatSpeed(state), 1);
  assert.equal(isCombatSpeedUnlocked(state, 2), false);
  assert.equal(setCombatSpeed(state, 2).reason, "locked");

  state.player.bossesDefeated = 1;
  assert.equal(isCombatSpeedUnlocked(state, 2), true);
  assert.equal(setCombatSpeed(state, 2).ok, true);
  assert.equal(scaledCombatElapsed(state, 0.5), 1);
  assert.equal(scaledCombatElapsed(state, 30, { offline: true }), 30);

  assert.equal(isCombatSpeedUnlocked(state, 3), false);
  state.player.bossesDefeated = 2;
  assert.equal(isCombatSpeedUnlocked(state, 3), true);
  assert.equal(setCombatSpeed(state, 3).ok, true);
  assert.equal(scaledCombatElapsed(state, 0.5), 1.5);
});

test("floor 10 transitions from horde to boss and then to floor 11", () => {
  const state = createInitialState();
  state.combat.floor = 10;
  state.combat.phase = "horde";
  state.combat.enemiesTotal = 1;
  state.combat.enemiesRemaining = 1;
  state.combat.enemy = { id: "test", name: "Test", type: "normal", hp: 1, maxHp: 1, defense: 0, attack: 0, attackSpeed: 0, atb: 0, turns: 0, abilities: [] };
  syncPartyState(state);
  Object.values(state.combat.party).forEach((member) => { member.atb = 100; });
  tickCombat(state, 0.01, () => 0.5);
  assert.equal(state.combat.phase, "boss");
  ensureEnemy(state, () => 0.5);
  assert.equal(state.combat.enemy.type, "boss");
  state.combat.enemy.hp = 1;
  Object.values(state.combat.party).forEach((member) => { member.atb = 100; });
  tickCombat(state, 0.01, () => 0.5);
  assert.equal(state.combat.floor, 11);
  assert.equal(state.combat.phase, "horde");
});

test("ATB battle tracks individual HP and enemy attacks a party member", () => {
  const state = createInitialState();
  const party = partySnapshot(state);
  assert.equal(party.length, 2);
  assert.ok(party.every((member) => member.battle.hp === member.battle.maxHp));
  state.combat.enemy = { id: "training", name: "Training Golem", type: "normal", hp: 999999, maxHp: 999999, defense: 0, attack: 40, attackSpeed: 100, atb: 100, turns: 0, abilities: [] };
  const hpBefore = party.reduce((total, member) => total + member.battle.hp, 0);
  const events = tickCombat(state, 0.01, () => 0.5);
  const hpAfter = partySnapshot(state).reduce((total, member) => total + member.battle.hp, 0);
  assert.ok(hpAfter < hpBefore);
  assert.ok(events.some((event) => event.type === "enemyAction"));
});

test("a healer spends an ATB turn restoring the most wounded ally", () => {
  const state = createInitialState();
  syncPartyState(state);
  const finn = state.combat.party["105"];
  const lina = state.combat.party["201"];
  finn.hp = finn.maxHp * 0.25;
  lina.atb = 100;
  state.collection["201"].cooldownRemaining = 0;
  state.combat.enemy = { id: "training", name: "Training Golem", type: "normal", hp: 999999, maxHp: 999999, defense: 0, attack: 0, attackSpeed: 0, atb: 0, turns: 0, abilities: [] };
  const hpBefore = finn.hp;
  const events = tickCombat(state, 0.01, () => 0.5);
  assert.ok(finn.hp > hpBefore);
  assert.ok(events.some((event) => event.type === "heal" && event.healer === "Lina" && event.target === "Finn"));
});

test("ATB alternates between a hero's named basic attack and special", () => {
  const state = createInitialState();
  const finn = HEROES.find((hero) => hero.id === 105);
  syncPartyState(state);
  state.combat.enemy = { id: "training", name: "Training Golem", type: "normal", hp: 999999, maxHp: 999999, defense: 0, attack: 0, attackSpeed: 0, atb: 0, turns: 0, abilities: [] };
  state.combat.party["105"].atb = 100;
  state.collection["105"].cooldownRemaining = 20;
  let events = tickCombat(state, 0.01, () => 0.5);
  assert.ok(events.some((event) => event.type === "heroAction" && event.action === finn.basicAttack.name && event.kind === "basic"));

  state.combat.party["105"].atb = 100;
  state.collection["105"].cooldownRemaining = 0;
  events = tickCombat(state, 0.01, () => 0.5);
  assert.ok(events.some((event) => event.type === "heroAction" && event.action === finn.special.name && event.kind === "special"));
});

test("first aid heals the living party and starts a cooldown", () => {
  const state = createInitialState();
  syncPartyState(state);
  state.combat.party["105"].hp *= 0.5;
  const result = manualHeal(state);
  assert.equal(result.ok, true);
  assert.ok(result.amount > 0);
  assert.equal(state.combat.manualHealCooldown, 30);
  assert.equal(manualHeal(state).reason, "cooldown");
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
