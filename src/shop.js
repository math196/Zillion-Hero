import { grantEquipment, rollEquipment } from "./equipment.js";
import { EQUIPMENT, SHOP_UPGRADES } from "./gameData.js";

export function upgradeCost(state, upgradeId) {
  const template = SHOP_UPGRADES.find((upgrade) => upgrade.id === upgradeId);
  if (!template) return Infinity;
  const level = state.shop.upgrades[upgradeId] ?? 0;
  return Math.floor(template.baseCost * Math.pow(template.growth, level));
}

export function buyUpgrade(state, upgradeId) {
  const template = SHOP_UPGRADES.find((upgrade) => upgrade.id === upgradeId);
  if (!template) return { ok: false, reason: "upgrade" };
  const level = state.shop.upgrades[upgradeId] ?? 0;
  if (level >= template.maxLevel) return { ok: false, reason: "max" };
  const cost = upgradeCost(state, upgradeId);
  if (state.resources[template.currency] < cost) return { ok: false, reason: template.currency, cost };
  state.resources[template.currency] -= cost;
  state.shop.upgrades[upgradeId] = level + 1;
  return { ok: true, level: level + 1, cost };
}

export function rerollShop(state, random = Math.random) {
  const cost = 100;
  if (state.resources.gold < cost) return { ok: false, reason: "gold", cost };
  state.resources.gold -= cost;
  const ids = [...EQUIPMENT].sort(() => random() - 0.5).slice(0, 3).map((item) => item.id);
  state.shop.rotation = ids;
  state.shop.rotationCount += 1;
  return { ok: true, cost };
}

export function buyShopEquipment(state, equipmentId) {
  const template = EQUIPMENT.find((item) => item.id === equipmentId);
  if (!template) return { ok: false, reason: "item" };
  if (state.resources.gold < template.cost) return { ok: false, reason: "gold", cost: template.cost };
  state.resources.gold -= template.cost;
  return grantEquipment(state, equipmentId);
}

export function craftEquipment(state, random = Math.random) {
  const cost = 120;
  if (state.resources.ore < cost) return { ok: false, reason: "ore", cost };
  state.resources.ore -= cost;
  return grantEquipment(state, rollEquipment(random).id);
}

