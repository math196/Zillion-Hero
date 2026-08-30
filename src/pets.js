import { PETS } from "./gameData.js";

export const PET_SUMMON_COST = 30;

function petRarity(random, pity) {
  if (pity >= 49) return "legendary";
  const roll = random();
  if (roll < 0.03) return "legendary";
  if (roll < 0.18) return "epic";
  if (roll < 0.5) return "rare";
  return "common";
}

export function summonPet(state, random = Math.random) {
  if (state.resources.crystals < PET_SUMMON_COST) return { ok: false, reason: "crystals" };
  state.resources.crystals -= PET_SUMMON_COST;
  const rarity = petRarity(random, state.pets.pity);
  const pool = PETS.filter((pet) => pet.rarity === rarity);
  const fallback = PETS.filter((pet) => pet.rarity === "common");
  const choices = pool.length ? pool : fallback;
  const pet = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  const existing = state.pets.collection[pet.id];
  let starUp = false;
  if (!existing) {
    state.pets.collection[pet.id] = { petId: pet.id, stars: 1, copies: 0, level: 1 };
    if (!state.pets.active) state.pets.active = pet.id;
  } else {
    existing.copies += 1;
    const needed = existing.stars + 1;
    if (existing.stars < 5 && existing.copies >= needed) {
      existing.copies -= needed;
      existing.stars += 1;
      starUp = true;
    }
  }
  state.pets.totalSummons += 1;
  state.pets.pity = rarity === "legendary" ? 0 : state.pets.pity + 1;
  return { ok: true, pet, rarity, isNew: !existing, starUp };
}

export function selectPet(state, petId) {
  if (!state.pets.collection[petId]) return false;
  state.pets.active = petId;
  return true;
}

