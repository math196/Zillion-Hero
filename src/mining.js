const MINING_INTERVAL = 3;
const BASE_YIELD = 5;

export function orePerCycle(state) {
  return BASE_YIELD * Math.pow(1.25, state.shop.upgrades.pickaxe ?? 0);
}

export function tickMining(state, elapsedSeconds) {
  state.mining.progress += elapsedSeconds;
  const cycles = Math.floor(state.mining.progress / MINING_INTERVAL);
  if (cycles <= 0) return 0;
  state.mining.progress %= MINING_INTERVAL;
  const availableSpace = Math.max(0, state.mining.storageCap - state.mining.storage);
  const mined = Math.min(availableSpace, Math.floor(cycles * orePerCycle(state)));
  state.mining.storage += mined;
  state.mining.totalMined += mined;
  return mined;
}

export function manualMine(state) {
  const availableSpace = Math.max(0, state.mining.storageCap - state.mining.storage);
  const mined = Math.min(availableSpace, Math.ceil(orePerCycle(state)));
  state.mining.storage += mined;
  state.mining.totalMined += mined;
  return mined;
}

export function collectOre(state) {
  const amount = state.mining.storage;
  state.resources.ore += amount;
  state.mining.storage = 0;
  return amount;
}

export function storageExpansionCost(state) {
  return Math.floor(state.mining.storageCap * 0.3);
}

export function expandMineStorage(state) {
  const cost = storageExpansionCost(state);
  if (state.resources.gold < cost) return { ok: false, cost };
  state.resources.gold -= cost;
  state.mining.storageCap += 250;
  return { ok: true, cost };
}
