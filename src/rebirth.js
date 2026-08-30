import { resetRunCombat } from "./combat.js";

export function essenceReward(state) {
  if (state.player.highestFloor < 50) return 0;
  return Math.max(1, Math.floor(state.player.highestFloor / 10) + Math.floor(state.player.bossesDefeated / 5));
}

export function performRebirth(state) {
  const reward = essenceReward(state);
  if (reward <= 0) return { ok: false, reason: "floor" };
  state.resources.essence += reward;
  state.resources.gold = 100;
  state.resources.ore = 0;
  state.player.rebirths += 1;
  state.player.highestFloor = 1;
  state.shop.upgrades.training = 0;
  state.shop.upgrades.fortune = 0;
  state.shop.upgrades.focus = 0;
  for (const instance of Object.values(state.collection)) {
    instance.level = 1;
    instance.xp = 0;
    instance.xpToNext = 50;
  }
  resetRunCombat(state);
  return { ok: true, reward };
}

