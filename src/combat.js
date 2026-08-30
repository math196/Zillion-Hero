import { activateEffects, effectMultiplier, tickEffects } from "./buffs.js";
import { grantEquipment, rollEquipment } from "./equipment.js";
import { BOSSES, ENEMY_ARCHETYPES, areaForFloor, bossForFloor, enemiesInFloor } from "./gameData.js";
import { calculateHeroStats, calculateTeamDps, grantTeamXp } from "./heroes.js";
import { HERO_BY_ID } from "./heroesData.js";

const ATB_PER_SECOND = 25;
const RECOVERY_SECONDS = 8;

function hordeEnemyHp(floor, enemyNumber, archetype) {
  const floorScale = Math.pow(1.19, Math.max(0, floor - 1));
  const waveScale = 1 + enemyNumber * 0.012;
  return Math.floor(70 * floorScale * waveScale * archetype.hpMultiplier);
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
      attackSpeed: 84 + Math.min(30, floor),
      atb: 0,
      turns: 0,
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
    attackSpeed: 88 + floor * 0.7,
    atb: 0,
    turns: 0,
    abilities: archetype.abilities,
    defense: Math.floor(floor * 1.2),
  };
  return state.combat.enemy;
}

export function syncPartyState(state) {
  if (!state.combat.party || typeof state.combat.party !== "object") state.combat.party = {};
  const active = new Set(state.activeTeam.map(String));
  for (const heroId of Object.keys(state.combat.party)) {
    if (!active.has(String(heroId))) delete state.combat.party[heroId];
  }

  state.activeTeam.forEach((heroId, index) => {
    const hero = HERO_BY_ID.get(Number(heroId));
    const stats = calculateHeroStats(state, heroId, state.combat.activeEffects);
    if (!hero || !stats) return;
    const current = state.combat.party[String(heroId)];
    if (!current) {
      state.combat.party[String(heroId)] = {
        hp: stats.hp,
        maxHp: stats.hp,
        atb: Math.min(75, index * 14),
        guard: 0,
        status: "charging",
        lastAction: "—",
        damageDone: 0,
        healingDone: 0,
      };
      return;
    }
    if (Math.abs(current.maxHp - stats.hp) > 0.01) {
      const ratio = current.maxHp > 0 ? current.hp / current.maxHp : 1;
      current.maxHp = stats.hp;
      current.hp = Math.max(0, Math.min(current.maxHp, current.maxHp * ratio));
    }
    current.status = current.hp <= 0 ? "ko" : current.guard > 0 ? "guarding" : current.atb >= 100 ? "ready" : "charging";
  });
  return state.combat.party;
}

export function partySnapshot(state) {
  syncPartyState(state);
  return state.activeTeam.map((heroId) => {
    const hero = HERO_BY_ID.get(Number(heroId));
    const stats = calculateHeroStats(state, heroId, state.combat.activeEffects);
    return { heroId: Number(heroId), hero, stats, battle: state.combat.party[String(heroId)] };
  }).filter((member) => member.hero && member.stats && member.battle);
}

export function teamSurvivalStats(state) {
  const members = partySnapshot(state);
  return {
    hp: members.reduce((total, member) => total + member.battle.hp, 0),
    maxHp: Math.max(1, members.reduce((total, member) => total + member.battle.maxHp, 0)),
    defense: members.reduce((total, member) => total + member.stats.defense, 0),
    hpRecovery: members.reduce((total, member) => total + member.stats.hpRecovery, 0),
    healers: members.filter((member) => member.hero.role === "healer" && member.battle.hp > 0).length,
    alive: members.filter((member) => member.battle.hp > 0).length,
  };
}

export function ensureTeamHealth(state) {
  const profile = teamSurvivalStats(state);
  state.combat.teamHp = profile.hp;
  state.combat.teamMaxHp = profile.maxHp;
  return profile;
}

function aliveMembers(state) {
  return partySnapshot(state).filter((member) => member.battle.hp > 0);
}

function restoreMember(state, member, amount, healer, events) {
  const missing = Math.max(0, member.battle.maxHp - member.battle.hp);
  const restored = Math.min(missing, Math.max(0, amount));
  member.battle.hp += restored;
  member.battle.healingDone += restored;
  state.combat.lastHealAmount = restored;
  state.combat.lastHealer = healer;
  state.combat.healingDone += restored;
  if (restored > 0) events.push({ type: "heal", healer, target: member.hero.name, amount: restored });
  return restored;
}

function reviveMember(member, healer, events) {
  member.battle.hp = member.battle.maxHp * 0.25;
  member.battle.atb = 0;
  member.battle.status = "charging";
  events.push({ type: "revive", healer, target: member.hero.name, amount: member.battle.hp });
}

function restParty(state, percent = 1) {
  for (const member of partySnapshot(state)) {
    member.battle.hp = Math.min(member.battle.maxHp, member.battle.hp + member.battle.maxHp * percent);
    if (member.battle.hp > 0) member.battle.status = "charging";
  }
  ensureTeamHealth(state);
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

function grantKillXp(state, kills, events) {
  if (kills <= 0) return;
  const xpPerHero = 3 * kills;
  const playerXp = 5 * kills;
  const heroLevelUps = grantTeamXp(state, xpPerHero);
  const playerLevels = grantPlayerXp(state, playerXp);
  events.unshift({ type: "kills", count: kills, heroXp: xpPerHero, playerXp, heroLevelUps: heroLevelUps.length, playerLevels });
}

function floorReward(state, clearedFloor, random) {
  const fortune = state.shop.upgrades.fortune ?? 0;
  const gold = Math.floor((20 + clearedFloor * 8) * Math.pow(1.08, fortune));
  const ore = clearedFloor >= 2 ? 2 + clearedFloor : 0;
  let crystals = clearedFloor % 5 === 0 ? 2 : 0;
  if (clearedFloor % 10 === 0) crystals += 5;
  state.resources.gold += gold;
  state.resources.ore += ore;
  state.resources.crystals += crystals;
  let loot = null;
  if (clearedFloor % 10 === 0 || random() < 0.04) loot = grantEquipment(state, rollEquipment(random).id);
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
  restParty(state, 0.25);
  events.push({ type: "floor", floor: clearedFloor, reward });
}

function defeatEnemy(state, events, random) {
  const enemy = state.combat.enemy;
  const baseGold = Math.floor((1 + state.combat.floor * 0.55) * Math.pow(1.08, state.shop.upgrades.fortune ?? 0));
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

function damageEnemy(state, rawDamage, events, random, actor, action, critical = false, kind = "basic") {
  const enemy = ensureEnemy(state, random);
  const enemyDefenseMultiplier = effectMultiplier(state.combat.activeEffects, "defense", "enemy");
  const effectiveDefense = Math.max(0, enemy.defense * enemyDefenseMultiplier);
  const damage = Math.max(1, rawDamage * (100 / (100 + effectiveDefense)));
  enemy.hp -= damage;
  events.push({ type: "heroAction", actor, action, target: enemy.name, amount: damage, critical, kind });
  if (enemy.hp > 0) return false;
  defeatEnemy(state, events, random);
  return true;
}

function useHeroTurn(state, member, events, random) {
  const { hero, stats, battle } = member;
  const instance = state.collection[String(member.heroId)];
  battle.atb = Math.max(0, battle.atb - 100);
  const party = partySnapshot(state);
  const defeatedAlly = party.find((ally) => ally.battle.hp <= 0);
  const wounded = party.filter((ally) => ally.battle.hp > 0).sort((a, b) => a.battle.hp / a.battle.maxHp - b.battle.hp / b.battle.maxHp)[0];

  if (hero.role === "healer" && instance.cooldownRemaining <= 0 && defeatedAlly) {
    reviveMember(defeatedAlly, hero.name, events);
    instance.cooldownRemaining = hero.special.cooldown;
    battle.lastAction = `${hero.special.name} → ${defeatedAlly.hero.name}`;
    return 0;
  }
  if (hero.role === "healer" && wounded && wounded.battle.hp / wounded.battle.maxHp < 0.72) {
    const healPercent = hero.rarity === "legendary" ? 0.45 : hero.rarity === "epic" ? 0.34 : hero.rarity === "rare" ? 0.27 : 0.2;
    restoreMember(state, wounded, wounded.battle.maxHp * healPercent + stats.hpRecovery * 3, hero.name, events);
    instance.cooldownRemaining = Math.max(4, hero.special.cooldown * 0.65);
    battle.lastAction = `${hero.special.name} → ${wounded.hero.name}`;
    return 0;
  }
  const lowestRatio = wounded ? wounded.battle.hp / wounded.battle.maxHp : 1;
  if (hero.role === "tank" && battle.guard <= 0 && (state.combat.enemy?.type === "boss" || lowestRatio < 0.65)) {
    battle.guard = 8;
    battle.lastAction = "GUARD";
    events.push({ type: "guard", actor: hero.name });
    return 0;
  }

  const useSkill = instance.cooldownRemaining <= 0 && hero.role !== "healer";
  if (useSkill) {
    activateEffects(state.combat.activeEffects, member.heroId, hero.special.effects);
    instance.cooldownRemaining = hero.special.cooldown;
  }
  const coefficient = useSkill ? hero.rarity === "legendary" ? 4 : hero.rarity === "epic" ? 3 : hero.rarity === "rare" ? 2.1 : 1.5 : hero.basicAttack.coefficient;
  const critical = random() < stats.critRate / 100;
  const criticalMultiplier = critical ? Math.max(1, stats.critDamage / 100) : 1;
  const action = useSkill ? hero.special.name : hero.basicAttack.name;
  const rawDamage = stats.attack * coefficient * criticalMultiplier;
  const targetName = ensureEnemy(state, random).name;
  const killed = damageEnemy(state, rawDamage, events, random, hero.name, action, critical, useSkill ? "special" : "basic");
  battle.damageDone += rawDamage;
  battle.lastAction = `${action} → ${targetName}`;
  return killed ? 1 : 0;
}

function triggerBossAbility(state, events, random) {
  const enemy = state.combat.enemy;
  if (enemy?.type !== "boss" || !enemy.abilities?.length) return null;
  const ability = enemy.abilities[Math.floor(random() * enemy.abilities.length)];
  if (/cleanse|removes all debuffs/i.test(ability.effect)) {
    state.combat.activeEffects = state.combat.activeEffects.filter((effect) => effect.target !== "enemy");
  } else if (/removes two buffs/i.test(ability.effect)) {
    let removed = 0;
    state.combat.activeEffects = state.combat.activeEffects.filter((effect) => effect.target !== "team" || removed++ >= 2);
  } else if (/DEF/i.test(ability.effect)) {
    activateEffects(state.combat.activeEffects, enemy.id, [{ stat: "defense", multiplier: 0.7, duration: 8, target: "team" }]);
  } else if (/ATK SPD/i.test(ability.effect)) {
    activateEffects(state.combat.activeEffects, enemy.id, [{ stat: "attackSpeed", multiplier: 0.75, duration: 8, target: "team" }]);
  } else if (/HP Recovery/i.test(ability.effect)) {
    activateEffects(state.combat.activeEffects, enemy.id, [{ stat: "hpRecovery", multiplier: 0.65, duration: 10, target: "team" }]);
  }
  events.push({ type: "bossSkill", boss: enemy.name, ability: ability.name });
  return ability;
}

function chooseEnemyTarget(state, random) {
  const alive = aliveMembers(state);
  if (alive.length === 0) return null;
  const guardingTanks = alive.filter((member) => member.hero.role === "tank" && member.battle.guard > 0);
  if (guardingTanks.length > 0 && random() < 0.75) return guardingTanks[Math.floor(random() * guardingTanks.length)];
  const weighted = alive.flatMap((member) => member.hero.role === "tank" ? [member, member, member] : [member]);
  return weighted[Math.floor(random() * weighted.length)];
}

function defeatParty(state, events) {
  state.combat.recovering = RECOVERY_SECONDS;
  state.combat.manualStrikeCooldown = 0;
  if (state.combat.enemy) {
    state.combat.enemy.hp = state.combat.enemy.maxHp;
    state.combat.enemy.atb = 0;
  }
  events.push({ type: "teamDefeated", recovery: RECOVERY_SECONDS });
}

function useEnemyTurn(state, events, random) {
  const enemy = ensureEnemy(state, random);
  enemy.atb = Math.max(0, enemy.atb - 100);
  enemy.turns += 1;
  const target = chooseEnemyTarget(state, random);
  if (!target) return defeatParty(state, events);
  const ability = enemy.type === "boss" && enemy.turns % 3 === 0 ? triggerBossAbility(state, events, random) : null;
  const defenseMultiplier = effectMultiplier(state.combat.activeEffects, "defense", "team");
  const effectiveDefense = Math.max(0, target.stats.defense * defenseMultiplier);
  const bossMultiplier = enemy.type === "boss" ? 0.16 : 1;
  const guardMultiplier = target.battle.guard > 0 ? 0.55 : 1;
  const damage = Math.max(1, enemy.attack * bossMultiplier * (ability ? 1.35 : 1) * guardMultiplier * (100 / (100 + effectiveDefense)));
  target.battle.hp = Math.max(0, target.battle.hp - damage);
  target.battle.status = target.battle.hp <= 0 ? "ko" : target.battle.guard > 0 ? "guarding" : "charging";
  if (target.battle.hp <= 0) target.battle.lastAction = "KO";
  state.combat.lastTeamDamage = damage;
  state.combat.damageTaken += damage;
  events.push({ type: "enemyAction", actor: enemy.name, action: ability?.name ?? "Attack", target: target.hero.name, amount: damage, ko: target.battle.hp <= 0 });
  if (aliveMembers(state).length === 0) defeatParty(state, events);
}

function tickTimers(state, elapsedSeconds) {
  state.combat.manualHealCooldown = Math.max(0, state.combat.manualHealCooldown - elapsedSeconds);
  state.combat.manualStrikeCooldown = Math.max(0, state.combat.manualStrikeCooldown - elapsedSeconds);
  for (const member of partySnapshot(state)) {
    const instance = state.collection[String(member.heroId)];
    instance.cooldownRemaining = Math.max(0, Number(instance.cooldownRemaining ?? 0) - elapsedSeconds);
    member.battle.guard = Math.max(0, member.battle.guard - elapsedSeconds);
  }
}

function simulateOffline(state, elapsedSeconds, random) {
  const events = [];
  let damagePool = calculateTeamDps(state, state.combat.activeEffects) * elapsedSeconds;
  let kills = 0;
  let guard = 0;
  while (damagePool > 0 && guard < 2500) {
    const enemy = ensureEnemy(state, random);
    const effectiveDefense = Math.max(0, enemy.defense * effectMultiplier(state.combat.activeEffects, "defense", "enemy"));
    const required = enemy.hp * ((100 + effectiveDefense) / 100);
    if (damagePool < required) {
      enemy.hp -= damagePool * (100 / (100 + effectiveDefense));
      break;
    }
    damagePool -= required;
    defeatEnemy(state, events, random);
    kills += 1;
    guard += 1;
  }
  grantKillXp(state, kills, events);
  restParty(state, 1);
  state.player.totalPlaySeconds += elapsedSeconds;
  return events;
}

export function tickCombat(state, elapsedSeconds, random = Math.random) {
  const events = [];
  if (state.combat.paused || elapsedSeconds <= 0) return events;
  syncPartyState(state);
  if (elapsedSeconds > 5) return simulateOffline(state, elapsedSeconds, random);
  tickTimers(state, elapsedSeconds);
  if (state.combat.recovering > 0) {
    state.combat.recovering = Math.max(0, state.combat.recovering - elapsedSeconds);
    if (state.combat.recovering === 0) {
      restParty(state, 1);
      for (const member of partySnapshot(state)) member.battle.atb = 0;
      events.push({ type: "teamRecovered" });
    }
    state.player.totalPlaySeconds += elapsedSeconds;
    return events;
  }

  state.combat.activeEffects = tickEffects(state.combat.activeEffects, elapsedSeconds);
  const enemy = ensureEnemy(state, random);
  for (const member of partySnapshot(state)) {
    if (member.battle.hp <= 0) continue;
    member.battle.atb += elapsedSeconds * ATB_PER_SECOND * Math.max(0.25, member.stats.attackSpeed / 100);
  }
  enemy.atb += elapsedSeconds * ATB_PER_SECOND * Math.max(0.25, enemy.attackSpeed / 100);

  let kills = 0;
  const ready = partySnapshot(state).filter((member) => member.battle.hp > 0 && member.battle.atb >= 100).sort((a, b) => b.battle.atb - a.battle.atb);
  for (const member of ready) kills += useHeroTurn(state, member, events, random);
  const currentEnemy = ensureEnemy(state, random);
  if (currentEnemy.atb >= 100 && state.combat.recovering <= 0) useEnemyTurn(state, events, random);
  grantKillXp(state, kills, events);
  ensureTeamHealth(state);
  state.player.totalPlaySeconds += elapsedSeconds;
  return events;
}

export function manualStrike(state, random = Math.random) {
  const events = [];
  if (state.combat.recovering > 0) return { ok: false, reason: "recovering", damage: 0, events };
  if (state.combat.manualStrikeCooldown > 0) return { ok: false, reason: "cooldown", damage: 0, events };
  const focus = state.shop.upgrades.focus ?? 0;
  const damage = calculateTeamDps(state, state.combat.activeEffects) * (0.65 + focus * 0.15);
  const killed = damageEnemy(state, damage, events, random, "Comandante", "Ataque Coordenado", false, "command");
  state.combat.manualStrikeCooldown = 4;
  if (killed) grantKillXp(state, 1, events);
  return { ok: true, damage, events };
}

export function manualHeal(state) {
  const events = [];
  const members = aliveMembers(state);
  if (state.combat.recovering > 0) return { ok: false, reason: "recovering", amount: 0, events };
  if (state.combat.manualHealCooldown > 0) return { ok: false, reason: "cooldown", amount: 0, events };
  if (members.every((member) => member.battle.hp >= member.battle.maxHp)) return { ok: false, reason: "full", amount: 0, events };
  let total = 0;
  for (const member of members) total += restoreMember(state, member, member.battle.maxHp * 0.18, "Comandante", events);
  state.combat.manualHealCooldown = 30;
  ensureTeamHealth(state);
  return { ok: true, amount: total, events };
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
  state.combat.enemyAttackTimer = 0;
  state.combat.manualStrikeCooldown = 0;
  state.combat.manualHealCooldown = 0;
  state.combat.recovering = 0;
  state.combat.teamHp = null;
  state.combat.teamMaxHp = null;
  state.combat.party = {};
}

export function getCurrentBoss(state) {
  return state.combat.phase === "boss" ? BOSSES.find((boss) => boss.id === state.combat.enemy?.id) : null;
}

