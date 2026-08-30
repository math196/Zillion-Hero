export const GAME_VERSION = 4;

export const ELEMENTS = ["fire", "water", "earth", "wind", "light", "dark", "metal", "nature"];

export const AREAS = [
  { id: "spirit-forest", name: "Spirit Forest", minFloor: 1, enemies: ["Wild Echo", "Moss Hound", "Thorn Wisp"] },
  { id: "dark-marsh", name: "Dark Marsh", minFloor: 11, enemies: ["Bog Shade", "Drowned Husk", "Night Leech"] },
  { id: "ember-peak", name: "Ember Peak", minFloor: 21, enemies: ["Ash Sentinel", "Cinder Wolf", "Magma Husk"] },
  { id: "star-ruins", name: "Star Ruins", minFloor: 31, enemies: ["Lost Automaton", "Prism Ghost", "Rift Keeper"] },
  { id: "hollow-sky", name: "Hollow Sky", minFloor: 41, enemies: ["Cloud Maw", "Storm Revenant", "Broken Seraph"] },
];

export const ENEMY_ARCHETYPES = [
  { id: "raider", name: "Horde Raider", type: "normal", element: "fire", hpMultiplier: 1, attackMultiplier: 1, abilities: [] },
  { id: "bulwark", name: "Horde Bulwark", type: "elite", element: "earth", hpMultiplier: 1.55, attackMultiplier: 0.85, abilities: [{ name: "Brace", effect: "Reduces the next skill hit by 20%." }] },
  { id: "hexer", name: "Horde Hexer", type: "elite", element: "dark", hpMultiplier: 1.15, attackMultiplier: 1.2, abilities: [{ name: "Wither", effect: "Applies -12% ATK for 6s." }] },
  { id: "mender", name: "Horde Mender", type: "elite", element: "light", hpMultiplier: 1.2, attackMultiplier: 0.7, abilities: [{ name: "Mend", effect: "Recovers 8% max HP once." }] },
];

export const BOSSES = [
  {
    id: "gorgon",
    name: "Gorgon",
    type: "boss",
    element: "dark",
    quote: "One look is all your courage deserves.",
    hp: 50000,
    attack: 1000,
    abilities: [
      { name: "Petrify", effect: "Stuns a random hero for 3s." },
      { name: "Summon Minions", effect: "Adds five enemies to the encounter." },
      { name: "Defense Break", effect: "Applies -30% team DEF for 8s." },
    ],
  },
  {
    id: "rootbound-king",
    name: "The Rootbound King",
    type: "boss",
    element: "earth",
    quote: "Every road ends beneath my roots.",
    hp: 82000,
    attack: 1450,
    abilities: [
      { name: "Bark Armor", effect: "Reduces the first skill hit by 35%." },
      { name: "Root Prison", effect: "Reduces team ATK SPD by 25% for 8s." },
    ],
  },
  {
    id: "mire-queen",
    name: "Mire Queen Vhal",
    type: "boss",
    element: "water",
    quote: "The marsh remembers every trespass.",
    hp: 135000,
    attack: 2100,
    abilities: [
      { name: "Toxic Tide", effect: "Applies -35% HP Recovery for 10s." },
      { name: "Royal Cleanse", effect: "Removes all debuffs from the boss." },
    ],
  },
  {
    id: "caldera-tyrant",
    name: "Caldera Tyrant",
    type: "boss",
    element: "fire",
    quote: "Your steel will be part of the mountain.",
    hp: 240000,
    attack: 3200,
    abilities: [
      { name: "Molten Core", effect: "Gains +40% ATK below half HP." },
      { name: "Ash Purge", effect: "Removes two buffs from the team." },
    ],
  },
  {
    id: "empty-constellation",
    name: "The Empty Constellation",
    type: "boss",
    element: "light",
    quote: "I watched your victory vanish before you arrived.",
    hp: 420000,
    attack: 4800,
    abilities: [
      { name: "Starfall", effect: "Delays every active skill by 4s." },
      { name: "Null Light", effect: "Cleanses buffs and debuffs from everyone." },
    ],
  },
];

export const EQUIPMENT = [
  { id: "flaming-sword", name: "Flaming Sword", slot: "weapon", rarity: "epic", element: "fire", attack: 18, cost: 160, passive: "+20% Fire ATK" },
  { id: "ice-dagger", name: "Ice Dagger", slot: "weapon", rarity: "rare", element: "water", attack: 10, cost: 90, passive: "+15% CRIT Rate" },
  { id: "thunder-hammer", name: "Thunder Hammer", slot: "weapon", rarity: "epic", element: "wind", attack: 22, cost: 210, passive: "+18% ATK SPD" },
  { id: "moon-katana", name: "Moon Katana", slot: "weapon", rarity: "legendary", element: "dark", attack: 34, cost: 520, passive: "+30% CRIT DMG" },
  { id: "sun-spear", name: "Sun Spear", slot: "weapon", rarity: "epic", element: "light", attack: 25, cost: 280, passive: "+20% Boss DMG" },
  { id: "stone-aegis", name: "Stone Aegis", slot: "armor", rarity: "rare", element: "earth", attack: 8, cost: 130, passive: "+22% DEF" },
  { id: "verdant-codex", name: "Verdant Codex", slot: "relic", rarity: "epic", element: "nature", attack: 16, cost: 240, passive: "+20% HP Recovery" },
  { id: "gear-heart", name: "Gear Heart", slot: "relic", rarity: "legendary", element: "metal", attack: 30, cost: 600, passive: "+25% Equipment Power" },
];

export const SHOP_UPGRADES = [
  { id: "training", name: "Squad Training", description: "+12% team ATK per level.", currency: "gold", baseCost: 80, growth: 1.72, maxLevel: 25 },
  { id: "fortune", name: "Field Fortune", description: "+10% gold rewards per level.", currency: "gold", baseCost: 110, growth: 1.82, maxLevel: 20 },
  { id: "pickaxe", name: "Deep Pickaxe", description: "+25% ore production per level.", currency: "ore", baseCost: 60, growth: 1.68, maxLevel: 20 },
  { id: "focus", name: "Command Focus", description: "+15% manual strike damage per level.", currency: "gold", baseCost: 140, growth: 1.9, maxLevel: 15 },
];

export const DUNGEONS = [
  { id: "ancient-crypt", name: "Ancient Crypt", minFloor: 1, goldCost: 50, requiredDps: 20, maxFloor: 30, crystalBase: 2 },
  { id: "glass-archive", name: "Glass Archive", minFloor: 10, goldCost: 180, requiredDps: 150, maxFloor: 50, crystalBase: 5 },
  { id: "ashen-gate", name: "Ashen Gate", minFloor: 25, goldCost: 650, requiredDps: 800, maxFloor: 100, crystalBase: 12 },
];

export const PETS = [
  { id: "mochi", name: "Mochi", rarity: "epic", activeAbility: { name: "Healing Burst", effect: "Heals all heroes for 20% max HP", cooldown: 60 }, passive: "+10% XP gained" },
  { id: "cinder", name: "Cinder", rarity: "rare", activeAbility: { name: "Fire Rain", effect: "Deals 300% team ATK globally", cooldown: 45 }, passive: "+8% Fire ATK" },
  { id: "pebble", name: "Pebble", rarity: "common", activeAbility: { name: "Stone Cover", effect: "Grants +20% team DEF for 10s", cooldown: 50 }, passive: "+5% DEF" },
  { id: "lumen", name: "Lumen", rarity: "legendary", activeAbility: { name: "Second Dawn", effect: "Resets all hero cooldowns", cooldown: 90 }, passive: "+12% ATK SPD" },
  { id: "nix", name: "Nix", rarity: "rare", activeAbility: { name: "Frost Paw", effect: "Delays the boss skill by 8s", cooldown: 55 }, passive: "+8% boss damage" },
];

export function enemiesInFloor(floor) {
  return 20 + ((floor * 17 + 11) % 31);
}

export function areaForFloor(floor) {
  return AREAS[Math.floor(Math.max(0, floor - 1) / 10) % AREAS.length];
}

export function bossForFloor(floor) {
  return BOSSES[Math.max(0, Math.floor(floor / 10) - 1) % BOSSES.length];
}

