import { activateEffects, effectMultiplier, tickEffects } from "./buffs.js";
import { grantEquipment, rollEquipment } from "./equipment.js";
import { BOSSES, ENEMY_ARCHETYPES, areaForFloor, bossForFloor, enemiesInFloor } from "./gameData.js";
import { calculateHeroStats, calculateTeamDps, grantTeamXp } from "./heroes.js";
import { HERO_BY_ID } from "./heroesData.js";

const ATTACK_INTERVAL = 2;

function hordeEnemyHp(floor, enemyNumber, archetype) {
  const floorScale = Math.pow(1.19, Math.max(0, floor - 1));
  const waveScale = 1 + enemyNumber * 0.012;
  return Math.floor(42 * floorScale * waveScale * archetype.hpMultiplier);
}

function bossEnemyHp(floor, boss) {
  const cycle = Math.max(0, Math.floor(floor / 10) - 1);
  return Math.floor(boss.hp * Math.pow(1.48, cycle));
}

export function ensureEnemy(state, random = Math.random) {
  if (state.combat.enemy?.hp > 0) return state.combat.enemy;
  const floor = state.combat.floor;
  if (state.combat.phase === "boss") {
    const boss = bossForFloor(floor);
    const maxHp = bossEnemyHp(floor, boss);
    state.combat.enemy = {
      id: boss.id,
      name: boss.name,
      type: "boss",
      element: boss.element,
      hp: maxHp,
      maxHp,
      attack: Math.floor(boss.attack * Math.pow(1.35, Math.max(0, floor / 10 - 1))),
      abilities: boss.abilities,
      quote: boss.quote,
      defense: floor * 3,
    };
    return state.combat.enemy;
  }

  const archetype = ENEMY_ARCHETYPES[Math.min(ENEMY_ARCHETYPES.length - 1, Math.floor(random() * ENEMY_ARCHETYPES.length))];
  const number = state.combat.enemiesTotal - state.combat.enemiesRemaining + 1;
  const area = areaForFloor(floor);
  const localName = area.enemies[(number + floor) % area.enemies.length];
  const maxHp = hordeEnemyHp(floor, number, archetype);
  state.combat.enemy = {
    id: `${archetype.id}-${floor}-${number}`,
    name: archetype.type === "normal" ? localName : `${localName} ${archetype.name.replace("Horde ", "")}`,
    type: archetype.type,
    element: archetype.element,
    hp: maxHp,
    maxHp,
    attack: Math.floor((8 + floor * 3) * archetype.attackMultiplier),
    abilities: archetype.abilities,
    defense: Math.floor(floor * 1.2),
  };
  return state.combat.enemy;
}

function grantPlayerXp(state, amount) {
  state.player.xp += amount;
  let levels = 0;
  while (state.player.xp >= state.player.xpToNext) {
    state.player.xp -= state.player.xpToNext;
    state.player.level += 1;
    state.player.xpToNext = Math.floor(100 + state.player.level * 35 + Math.pow(state.player.level, 1.3) * 10);
    levels += 1;
  }
  return levels;
}

function floorReward(state, clearedFloor, random) {
  const fortune = state.shop.upgrades.fortune ?? 0;
  const gold = Math.floor((55 + clearedFloor * 18) * Math.pow(1.1, fortune));
  const ore = 4 + clearedFloor * 2;
  let crystals = clearedFloor % 5 === 0 ? 2 : 0;
  if (clearedFloor % 10 === 0) crystals += 5;
  state.resources.gold += gold;
  state.resources.ore += ore;
  state.resources.crystals += crystals;

  let loot = null;
  if (clearedFloor % 10 === 0 || random() < 0.04) {
    loot = grantEquipment(state, rollEquipment(random).id);
  }
  return { gold, ore, crystals, loot };
}

function completeFloor(state, events, random) {
  const clearedFloor = state.combat.floor;
  const reward = floorReward(state, clearedFloor, random);
  state.combat.lastFloorReward = reward;
  state.combat.floor += 1;
  state.player.highestFloor = Math.max(state.player.highestFloor, state.combat.floor);
  state.combat.phase = "horde";
  state.combat.enemiesTotal = enemiesInFloor(state.combat.floor);
  state.combat.enemiesRemaining = state.combat.enemiesTotal;
  state.combat.enemy = null;
  events.push({ type: "floor", floor: clearedFloor, reward });
}

function defeatEnemy(state, events, random) {
  const enemy = state.combat.enemy;
  const baseGold = Math.floor((4 + state.combat.floor * 1.8) * Math.pow(1.1, state.shop.upgrades.fortune ?? 0));
  state.resources.gold += baseGold;
  state.player.enemiesDefeated += 1;

  if (enemy.type === "boss") {
    state.player.bossesDefeated += 1;
    events.push({ type: "bossDefeated", name: enemy.name, floor: state.combat.floor });
    completeFloor(state, events, random);
    return;
  }

  state.combat.enemiesRemaining -= 1;
  state.combat.enemy = null;
  if (state.combat.enemiesRemaining <= 0) {
    if (state.combat.floor % 10 === 0) {
      state.combat.phase = "boss";
      const boss = ensureEnemy(state, random);
      events.push({ type: "bossEntered", name: boss.name, quote: boss.quote, floor: state.combat.floor });
    } else {
      completeFloor(state, events, random);
    }
  }
}

function castHeroSkills(state, elapsedSeconds, events) {
  let skillDamage = 0;
  for (const heroId of state.activeTeam) {
    const hero = HERO_BY_ID.get(Number(heroId));
    const instance = state.collection[String(heroId)];
    if (!hero || !instance) continue;
    instance.cooldownRemaining = Number(instance.cooldownRemaining ?? 0) - elapsedSeconds;
    let casts = 0;
    while (instance.cooldownRemaining <= 0 && casts < 3) {
      const stats = calculateHeroStats(state, heroId, state.combat.activeEffects);
      const coefficient = hero.rarity === "legendary" ? 5 : hero.rarity === "epic" ? 3.8 : hero.rarity === "rare" ? 2.5 : 1.7;
      skillDamage += stats.attack * coefficient;
      activateEffects(state.combat.activeEffects, heroId, hero.ability.effects);
      instance.cooldownRemaining += hero.ability.cooldown;
      casts += 1;
      if (elapsedSeconds < 5) events.push({ type: "skill", hero: hero.name, ability: hero.ability.name });
    }
    if (casts >= 3 && instance.cooldownRemaining <= 0) instance.cooldownRemaining = hero.ability.cooldown;
  }
  return skillDamage;
}

function triggerBossAbility(state, events, random) {
  const enemy = state.combat.enemy;
  if (enemy?.type !== "boss" || !enemy.abilities?.length) return;
  const ability = enemy.abilities[Math.floor(random() * enemy.abilities.length)];
  if (/cleanse|removes all debuffs/i.test(ability.effect)) {
    state.combat.activeEffects = state.combat.activeEffects.filter((effect) => effect.target !== "enemy");
  } else if (/removes two buffs/i.test(ability.effect)) {
    let removed = 0;
    state.combat.activeEffects = state.combat.activeEffects.filter((effect) => {
      if (effect.target === "team" && removed < 2) {
        removed += 1;
        return false;
      }
      return true;
    });
  } else if (/DEF/i.test(ability.effect)) {
    activateEffects(state.combat.activeEffects, enemy.id, [{ stat: "defense", multiplier: 0.7, duration: 8, target: "team" }]);
  } else if (/ATK SPD/i.test(ability.effect)) {
    activateEffects(state.combat.activeEffects, enemy.id, [{ stat: "attackSpeed", multiplier: 0.75, duration: 8, target: "team" }]);
  } else if (/HP Recovery/i.test(ability.effect)) {
    activateEffects(state.combat.activeEffects, enemy.id, [{ stat: "hpRecovery", multiplier: 0.65, duration: 10, target: "team" }]);
  }
  events.push({ type: "bossSkill", boss: enemy.name, ability: ability.name });
}

export function tickCombat(state, elapsedSeconds, random = Math.random) {
  const events = [];
  if (state.combat.paused || elapsedSeconds <= 0) return events;
  ensureEnemy(state, random);
  state.combat.activeEffects = tickEffects(state.combat.activeEffects, elapsedSeconds);
  const skillDamage = castHeroSkills(state, elapsedSeconds, events);

  state.combat.attackTimer += elapsedSeconds;
  state.combat.skillTimer += elapsedSeconds;
  if (state.combat.enemy?.type === "boss" && state.combat.skillTimer >= 10) {
    state.combat.skillTimer %= 10;
    triggerBossAbility(state, events, random);
  }

  const attacks = Math.floor(state.combat.attackTimer / ATTACK_INTERVAL);
  if (attacks <= 0 && skillDamage <= 0) return events;
  state.combat.attackTimer %= ATTACK_INTERVAL;
  const dps = calculateTeamDps(state, state.combat.activeEffects);
  let damagePool = dps * ATTACK_INTERVAL * attacks + skillDamage;
  let kills = 0;
  let guard = 0;

  while (damagePool > 0 && guard < 2500) {
    const enemy = ensureEnemy(state, random);
    const enemyDefenseMultiplier = effectMultiplier(state.combat.activeEffects, "defense", "enemy");
    const effectiveDefense = Math.max(0, enemy.defense * enemyDefenseMultiplier);
    const damageAfterDefense = damagePool * (100 / (100 + effectiveDefense));
    if (damageAfterDefense < enemy.hp) {
      enemy.hp -= damageAfterDefense;
      damagePool = 0;
      break;
    }
    damagePool -= enemy.hp * ((100 + effectiveDefense) / 100);
    defeatEnemy(state, events, random);
    kills += 1;
    guard += 1;
  }

  if (kills > 0) {
    const xpPerHero = 15 * kills;
    const playerXp = 25 * kills;
    const heroLevelUps = grantTeamXp(state, xpPerHero);
    const playerLevels = grantPlayerXp(state, playerXp);
    events.unshift({ type: "kills", count: kills, heroXp: xpPerHero, playerXp, heroLevelUps: heroLevelUps.length, playerLevels });
  }
  state.player.totalPlaySeconds += elapsedSeconds;
  return events;
}

export function manualStrike(state, random = Math.random) {
  const events = [];
  ensureEnemy(state, random);
  const focus = state.shop.upgrades.focus ?? 0;
  const damage = calculateTeamDps(state, state.combat.activeEffects) * (0.25 + focus * 0.15);
  state.combat.enemy.hp -= damage;
  if (state.combat.enemy.hp <= 0) {
    defeatEnemy(state, events, random);
    grantTeamXp(state, 15);
    grantPlayerXp(state, 25);
  }
  return { damage, events };
}

export function resetRunCombat(state) {
  state.combat.floor = 1;
  state.combat.phase = "horde";
  state.combat.enemiesTotal = enemiesInFloor(1);
  state.combat.enemiesRemaining = state.combat.enemiesTotal;
  state.combat.enemy = null;
  state.combat.activeEffects = [];
  state.combat.attackTimer = 0;
  state.combat.skillTimer = 0;
}

export function getCurrentBoss(state) {
  return state.combat.phase === "boss" ? BOSSES.find((boss) => boss.id === state.combat.enemy?.id) : null;
}

