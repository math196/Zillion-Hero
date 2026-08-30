import { EQUIPMENT } from "./gameData.js";

export function getEquipmentTemplate(id) {
  return EQUIPMENT.find((item) => item.id === id) ?? null;
}

export function grantEquipment(state, equipmentId) {
  const template = getEquipmentTemplate(equipmentId);
  if (!template) return { ok: false };
  const existing = state.equipment.inventory.find((item) => item.id === equipmentId);
  if (!existing) {
    state.equipment.inventory.push({ id: equipmentId, stars: 1, locked: false });
    return { ok: true, item: template, isNew: true, starUp: false };
  }
  if (existing.stars < 5) {
    existing.stars += 1;
    return { ok: true, item: template, isNew: false, starUp: true };
  }
  state.resources.tokens += template.rarity === "legendary" ? 5 : template.rarity === "epic" ? 3 : 1;
  return { ok: true, item: template, isNew: false, starUp: false, converted: true };
}

export function rollEquipment(random = Math.random) {
  return EQUIPMENT[Math.min(EQUIPMENT.length - 1, Math.floor(random() * EQUIPMENT.length))];
}

export function equipHero(state, heroId, equipmentId) {
  const instance = state.collection[String(heroId)];
  if (!instance) return { ok: false, reason: "hero" };
  if (!state.equipment.inventory.some((item) => item.id === equipmentId)) return { ok: false, reason: "equipment" };
  for (const other of Object.values(state.collection)) {
    if (other.equipmentId === equipmentId) other.equipmentId = null;
  }
  instance.equipmentId = equipmentId;
  return { ok: true };
}

export function summonEquipment(state, random = Math.random) {
  const cost = 100;
  if (state.resources.gold < cost) return { ok: false, reason: "gold" };
  state.resources.gold -= cost;
  return grantEquipment(state, rollEquipment(random).id);
}

