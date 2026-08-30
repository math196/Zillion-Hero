export const COMBAT_SPEEDS = [1, 2, 3];

export function isCombatSpeedUnlocked(state, speed) {
  if (speed === 1) return true;
  if (speed === 2) return state.player.highestFloor >= 6 || state.player.bossesDefeated >= 1;
  if (speed === 3) return state.player.bossesDefeated >= 1 || state.player.highestFloor >= 11;
  return false;
}

export function combatSpeedRequirementKey(speed) {
  if (speed === 2) return "combat.speed2Requirement";
  if (speed === 3) return "combat.speed3Requirement";
  return null;
}

export function currentCombatSpeed(state) {
  const selected = COMBAT_SPEEDS.includes(Number(state.combat.speed)) ? Number(state.combat.speed) : 1;
  return isCombatSpeedUnlocked(state, selected) ? selected : 1;
}

export function setCombatSpeed(state, speed) {
  const value = Number(speed);
  if (!COMBAT_SPEEDS.includes(value)) return { ok: false, reason: "invalid", speed: currentCombatSpeed(state) };
  if (!isCombatSpeedUnlocked(state, value)) return { ok: false, reason: "locked", speed: currentCombatSpeed(state) };
  state.combat.speed = value;
  return { ok: true, speed: value };
}

export function scaledCombatElapsed(state, elapsedSeconds, { offline = false } = {}) {
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  return offline ? elapsed : elapsed * currentCombatSpeed(state);
}

