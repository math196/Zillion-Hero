export function multiplyEffects(baseValue, multipliers = []) {
  return multipliers.reduce((value, multiplier) => value * multiplier, baseValue);
}

export function effectMultiplier(effects, stat, target = "team") {
  return effects
    .filter((effect) => effect.stat === stat && (effect.target ?? "team") === target && effect.remaining > 0)
    .reduce((result, effect) => result * effect.multiplier, 1);
}

export function applyEffects(baseStats, effects = [], target = "team") {
  const finalStats = { ...baseStats };
  for (const stat of Object.keys(finalStats)) {
    finalStats[stat] = multiplyEffects(finalStats[stat], [effectMultiplier(effects, stat, target)]);
  }
  return finalStats;
}

export function activateEffects(activeEffects, sourceId, effects = []) {
  for (const effect of effects) {
    activeEffects.push({
      id: `${sourceId}-${effect.stat}-${Date.now()}-${activeEffects.length}`,
      sourceId,
      stat: effect.stat,
      multiplier: effect.multiplier,
      target: effect.target ?? "team",
      remaining: effect.duration,
    });
  }
  return activeEffects;
}

export function tickEffects(activeEffects, elapsedSeconds) {
  for (const effect of activeEffects) effect.remaining -= elapsedSeconds;
  return activeEffects.filter((effect) => effect.remaining > 0);
}

export function cleanseEffects(activeEffects, target, count = Infinity) {
  let removed = 0;
  return activeEffects.filter((effect) => {
    if (removed < count && effect.target === target) {
      removed += 1;
      return false;
    }
    return true;
  });
}

export function formatEffectPercent(multiplier) {
  return `${multiplier >= 1 ? "+" : "-"}${Math.abs((multiplier - 1) * 100).toFixed(0)}%`;
}

