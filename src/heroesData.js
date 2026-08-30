const BASE_STATS = {
  common: { hp: 90, attack: 18, defense: 12, critRate: 3, critDamage: 135, hpRecovery: 3, attackSpeed: 92 },
  rare: { hp: 125, attack: 28, defense: 22, critRate: 5, critDamage: 150, hpRecovery: 5, attackSpeed: 98 },
  epic: { hp: 170, attack: 44, defense: 36, critRate: 8, critDamage: 175, hpRecovery: 8, attackSpeed: 105 },
  legendary: { hp: 220, attack: 72, defense: 58, critRate: 12, critDamage: 200, hpRecovery: 12, attackSpeed: 112 },
};

const BASIC_ATTACKS = {
  dps: { label: "Focused Assault", description: "Deals direct damage to the current target.", coefficient: 1.08 },
  tank: { label: "Shielded Blow", description: "Deals damage while maintaining a defensive stance.", coefficient: 0.92 },
  healer: { label: "Restorative Bolt", description: "Deals light damage without delaying emergency healing.", coefficient: 0.82 },
  support: { label: "Tactical Pulse", description: "Deals light damage while preparing the next team effect.", coefficient: 0.88 },
  controller: { label: "Disrupting Shot", description: "Deals damage while pressuring the target's defenses.", coefficient: 0.96 },
};

const PASSIVES = {
  dps: { stat: "attack", target: "self", label: "Predatory Rhythm" },
  tank: { stat: "defense", target: "self", label: "Unbroken Line" },
  healer: { stat: "hpRecovery", target: "team", label: "Shared Renewal" },
  support: { stat: "attackSpeed", target: "team", label: "Battle Tempo" },
  controller: { stat: "critRate", target: "team", label: "Exposed Opening" },
};

function createBasicAttack(id, name, element, role, override) {
  if (override) return override;
  const template = BASIC_ATTACKS[role];
  return {
    name: `${name}'s ${template.label}`,
    description: `${template.description} ${element.toUpperCase()} affinity.`,
    coefficient: Number((template.coefficient + (id % 4) * 0.02).toFixed(2)),
    target: "enemy",
  };
}

function createPassive(id, title, role, override) {
  if (override) return override;
  const template = PASSIVES[role];
  const multiplier = Number((1.04 + (id % 4) * 0.01).toFixed(2));
  return {
    name: `${title} — ${template.label}`,
    description: `At 5★, multiplies ${template.target === "team" ? "the formation's" : "this hero's"} ${template.stat} by ${multiplier.toFixed(2)}.`,
    unlockedAtStars: 5,
    effects: [{ stat: template.stat, multiplier, target: template.target }],
  };
}

function createHero(id, name, title, element, rarity, role, appearance, ability, overrides = {}) {
  const variance = id % 7;
  const base = BASE_STATS[rarity];
  const special = {
    name: ability.name,
    description: ability.description,
    cooldown: ability.cooldown ?? (rarity === "legendary" ? 20 : rarity === "epic" ? 16 : rarity === "rare" ? 13 : 10),
    effects: ability.effects ?? [],
  };
  return {
    id,
    name,
    title,
    element,
    rarity,
    role,
    appearance,
    stats: {
      hp: base.hp + variance * 4,
      attack: base.attack + variance * 2,
      defense: base.defense + variance,
      critRate: base.critRate + (variance % 3),
      critDamage: base.critDamage + (variance % 4) * 5,
      hpRecovery: base.hpRecovery + (variance % 3),
      attackSpeed: base.attackSpeed + variance,
      ...overrides.stats,
    },
    basicAttack: createBasicAttack(id, name, element, role, overrides.basicAttack),
    special,
    ability: special,
    passive: createPassive(id, title, role, overrides.passive),
  };
}

export const COMMON_HEROES = [
  createHero(101, "Bram", "Frontier Guard", "earth", "common", "tank", "Guarda de capa verde com escudo de madeira marcado por batalhas.", { name: "Shield Tap", description: "Deals 120% ATK and gains +15% DEF for 6s.", effects: [{ stat: "defense", multiplier: 1.15, duration: 6 }] }),
  createHero(102, "Cora", "Field Medic", "light", "common", "healer", "Médica viajante com bolsa de frascos âmbar e uniforme claro.", { name: "Quick Mend", description: "Heals the lowest-HP ally for 140% HP Recovery." }),
  createHero(103, "Dax", "Iron Miner", "earth", "common", "support", "Mineiro compacto coberto de pó metálico, com picareta curta.", { name: "Ore Sense", description: "Grants +12% ore gain for 10s.", effects: [{ stat: "oreGain", multiplier: 1.12, duration: 10 }] }),
  createHero(104, "Eryn", "Wind Scout", "wind", "common", "controller", "Batedora de capuz azul com fitas que apontam a direção do vento.", { name: "Tailwind", description: "Grants allies +12% ATK SPD for 8s.", effects: [{ stat: "attackSpeed", multiplier: 1.12, duration: 8 }] }),
  createHero(105, "Finn", "Street Duelist", "fire", "common", "dps", "Duelista ruivo com sabre gasto e sorriso confiante.", { name: "Second Cut", description: "Deals two strikes at 85% ATK each." }),
  createHero(106, "Gala", "Marsh Witch", "water", "common", "controller", "Bruxa do pântano com manto de junco e olhos verde-musgo.", { name: "Bog Hex", description: "Deals 130% ATK and applies -12% DEF for 6s.", effects: [{ stat: "defense", multiplier: 0.88, duration: 6, target: "enemy" }] }),
  createHero(107, "Holt", "Gate Keeper", "earth", "common", "tank", "Sentinela alto em armadura simples de ferro escurecido.", { name: "Stand Firm", description: "Grants allies +10% DEF for 8s.", effects: [{ stat: "defense", multiplier: 1.1, duration: 8 }] }),
  createHero(108, "Iris", "Spark Adept", "light", "common", "dps", "Aprendiz com luvas condutoras e cabelo eletrizado.", { name: "Static Bolt", description: "Deals 150% ATK and gains +10% CRIT Rate for 5s.", effects: [{ stat: "critRate", multiplier: 1.1, duration: 5 }] }),
  createHero(109, "Juno", "Rift Runner", "dark", "common", "dps", "Mensageira de roupa negra com fendas violetas nos braços.", { name: "Slipstream", description: "Deals 145% ATK and gains +15% ATK SPD for 5s.", effects: [{ stat: "attackSpeed", multiplier: 1.15, duration: 5 }] }),
  createHero(110, "Kipp", "Clockwork Hand", "metal", "common", "support", "Mecânico jovem com braço protético de latão e monóculo.", { name: "Tune Up", description: "Grants +15% equipment power for 8s.", effects: [{ stat: "equipmentPower", multiplier: 1.15, duration: 8 }] }),
  createHero(111, "Mara", "Ash Hunter", "fire", "common", "dps", "Caçadora de capa cinza, arco curto e máscara contra cinzas.", { name: "Marked Prey", description: "Deals 180% ATK to enemies below 40% HP." }),
  createHero(112, "Nell", "Tide Scribe", "water", "common", "healer", "Escriba com pergaminhos azuis e tinta que flutua no ar.", { name: "Water Sigil", description: "Grants allies +14% HP Recovery for 8s.", effects: [{ stat: "hpRecovery", multiplier: 1.14, duration: 8 }] }),
  createHero(113, "Orin", "Stone Singer", "earth", "common", "tank", "Bardo robusto com placas de pedra gravadas no peito.", { name: "Resonance", description: "Deals damage equal to 120% DEF." }),
  createHero(114, "Pax", "Lantern Bearer", "light", "common", "support", "Peregrino com lanterna dourada e bastão de caminhada.", { name: "Beacon", description: "Grants allies +12% CRIT Rate for 7s.", effects: [{ stat: "critRate", multiplier: 1.12, duration: 7 }] }),
  createHero(115, "Quill", "Night Courier", "dark", "common", "dps", "Corredor mascarado com casaco longo e cartas seladas.", { name: "Shadow Parcel", description: "Deals 155% ATK and gains one haste stack." }),
  createHero(116, "Rhea", "Meadow Keeper", "earth", "common", "healer", "Guardiã de tranças floridas com cajado de aveleira.", { name: "Green Pulse", description: "Heals all allies for 70% HP Recovery." }),
  createHero(117, "Sol", "Candle Knight", "fire", "common", "tank", "Cavaleiro pequeno cuja armadura emite luz de vela.", { name: "Waxen Wall", description: "Grants +18% DEF and taunts for 6s.", effects: [{ stat: "defense", multiplier: 1.18, duration: 6 }] }),
  createHero(118, "Tess", "Rain Drummer", "water", "common", "support", "Músico nômade com tambor coberto por gotas luminosas.", { name: "Monsoon Beat", description: "Grants allies +10% ATK and HP Recovery for 8s.", effects: [{ stat: "attack", multiplier: 1.1, duration: 8 }, { stat: "hpRecovery", multiplier: 1.1, duration: 8 }] }),
  createHero(119, "Uma", "Dust Seer", "wind", "common", "controller", "Vidente com véu bege e pequenos sinos de prata.", { name: "Blinding Dust", description: "Applies -12% enemy ATK for 7s.", effects: [{ stat: "attack", multiplier: 0.88, duration: 7, target: "enemy" }] }),
  createHero(120, "Vik", "Chain Porter", "metal", "common", "tank", "Carregador largo com correntes enroladas nos ombros.", { name: "Anchor Down", description: "Deals 120% ATK and resists control effects." }),
  createHero(121, "Willow", "Feral Piper", "wind", "common", "support", "Flautista descalça seguida por pássaros do campo.", { name: "Flock Call", description: "Grants allies +11% ATK SPD for 9s.", effects: [{ stat: "attackSpeed", multiplier: 1.11, duration: 9 }] }),
  createHero(122, "Xan", "Coal Boxer", "fire", "common", "dps", "Lutador de luvas negras com faíscas entre os dedos.", { name: "Furnace Jab", description: "Deals 165% ATK and burns for 3s." }),
  createHero(123, "Yves", "Quiet Herbalist", "water", "common", "healer", "Herbalista sereno com avental cheio de folhas secas.", { name: "Restorative Tea", description: "Heals an ally and grants +10% DEF.", effects: [{ stat: "defense", multiplier: 1.1, duration: 8 }] }),
  createHero(124, "Zara", "Copper Spear", "metal", "common", "dps", "Lanceira com tranças curtas e armadura de cobre polido.", { name: "Piercing Line", description: "Deals 175% ATK and ignores 10% DEF." }),
  createHero(125, "Alden", "Old Watch", "light", "common", "tank", "Veterano de barba branca com torre-escudo riscado.", { name: "Watchman's Oath", description: "Grants allies +9% DEF and healing received.", effects: [{ stat: "defense", multiplier: 1.09, duration: 10 }, { stat: "hpRecovery", multiplier: 1.09, duration: 10 }] }),
  createHero(126, "Blythe", "Mist Knife", "water", "common", "dps", "Assassina pálida com duas lâminas curvas e névoa fria.", { name: "Vapor Cut", description: "Deals 160% ATK with +20% CRIT Rate.", effects: [{ stat: "critRate", multiplier: 1.2, duration: 4 }] }),
  createHero(127, "Clem", "Moss Giant", "earth", "common", "tank", "Gigante gentil coberto de musgo, cogumelos e correias.", { name: "Heavy Step", description: "Deals 140% ATK and slows the enemy." }),
  createHero(128, "Demi", "Sun Weaver", "light", "common", "support", "Tecelã em amarelo com fios luminosos entre as mãos.", { name: "Bright Thread", description: "Grants the highest-ATK ally +15% ATK.", effects: [{ stat: "attack", multiplier: 1.15, duration: 8 }] }),
  createHero(129, "Enzo", "Grim Fisher", "dark", "common", "controller", "Pescador sombrio com anzol de osso e capa encharcada.", { name: "Abyss Hook", description: "Deals 135% ATK and applies -10% ATK SPD." }),
  createHero(130, "Flint", "Ridge Ranger", "fire", "common", "dps", "Patrulheiro de chapéu largo com besta de madeira queimada.", { name: "Scorching Bolt", description: "Deals 185% ATK to one enemy." }),
];

export const RARE_HEROES = [
  createHero(201, "Lina", "Tidecaller", "water", "rare", "healer", "Maga de cabelos azuis com manto de ondas e orbe aquático.", { name: "Rising Current", description: "Deals 220% ATK and grants +25% HP Recovery for 8s.", effects: [{ stat: "hpRecovery", multiplier: 1.25, duration: 8 }] }, { stats: { attack: 23 } }),
  createHero(202, "Rook", "Last Bastion", "earth", "rare", "tank", "Guardião em armadura basáltica com escudo retangular enorme.", { name: "Fortress Line", description: "Grants allies +18% DEF for 10s.", effects: [{ stat: "defense", multiplier: 1.18, duration: 10 }] }),
  createHero(203, "Nysa", "Frost Reader", "water", "rare", "controller", "Oráculo de olhos brancos cercada por páginas congeladas.", { name: "Cold Forecast", description: "Deals 210% ATK and applies -18% ATK SPD.", effects: [{ stat: "attackSpeed", multiplier: 0.82, duration: 8, target: "enemy" }] }),
  createHero(204, "Tarin", "Ember Monk", "fire", "rare", "dps", "Monge de cabeça raspada com faixas incandescentes nos braços.", { name: "Cinder Palm", description: "Deals 240% ATK and 25% more against bosses." }),
  createHero(205, "Vale", "Gale Archer", "wind", "rare", "dps", "Arqueira de capa verde com arco recurvo translúcido.", { name: "Crosswind Volley", description: "Fires three arrows at 85% ATK each." }),
  createHero(206, "Wren", "Grave Scholar", "dark", "rare", "support", "Estudioso magro com livro acorrentado e vela violeta.", { name: "Memento Mori", description: "Grants +2% ATK per cleared floor this run, capped at 30%." }),
  createHero(207, "Yara", "Sun Priest", "light", "rare", "healer", "Sacerdotisa dourada com halo geométrico sobre a cabeça.", { name: "Dawn Chorus", description: "Grants allies +16% ATK and HP Recovery.", effects: [{ stat: "attack", multiplier: 1.16, duration: 8 }, { stat: "hpRecovery", multiplier: 1.16, duration: 8 }] }),
  createHero(208, "Zed", "Copper Alchemist", "metal", "rare", "controller", "Alquimista de avental vermelho com frascos presos ao cinto.", { name: "Volatile Flask", description: "Deals 260% ATK and applies a random debuff." }),
  createHero(209, "Asha", "Thorn Captain", "earth", "rare", "tank", "Capitã de cabelos verdes com armadura espinhosa viva.", { name: "Briar Order", description: "Grants allies +20% DEF and reflects boss damage.", effects: [{ stat: "defense", multiplier: 1.2, duration: 8 }] }),
  createHero(210, "Bex", "Storm Tinkerer", "wind", "rare", "support", "Inventora sorridente com mochila de bobinas elétricas.", { name: "Overcharge", description: "Grants +25% equipment power for 12s.", effects: [{ stat: "equipmentPower", multiplier: 1.25, duration: 12 }] }),
  createHero(211, "Cass", "Mirror Fencer", "light", "rare", "dps", "Espadachim de branco com lâmina reflexiva e máscara lisa.", { name: "Reflected Edge", description: "Deals 230% ATK and copies one enemy buff." }),
  createHero(212, "Dorian", "Blackwood Druid", "dark", "rare", "healer", "Druida de galhos negros com corvo empoleirado no ombro.", { name: "Night Sap", description: "Drains 210% ATK and heals the weakest ally." }),
  createHero(213, "Esme", "Comet Rider", "fire", "rare", "dps", "Cavaleira de armadura leve com rastro de faíscas nos pés.", { name: "Meteor Rush", description: "Deals 280% ATK and gains +20% ATK SPD.", effects: [{ stat: "attackSpeed", multiplier: 1.2, duration: 6 }] }),
  createHero(214, "Faris", "Dune Binder", "earth", "rare", "controller", "Mago do deserto com correntes de areia flutuantes.", { name: "Sand Lock", description: "Deals 190% ATK and stuns for 2s." }),
  createHero(215, "Greta", "Boiler Saint", "metal", "rare", "tank", "Engenheira em exoesqueleto de bronze que solta vapor.", { name: "Pressure Guard", description: "Grants +25% DEF, then releases stored damage.", effects: [{ stat: "defense", multiplier: 1.25, duration: 7 }] }),
  createHero(216, "Hiro", "Reed Blade", "water", "rare", "dps", "Samurai de roupas simples com katana flexível como junco.", { name: "Flowing Draw", description: "Deals 250% ATK and ignores 15% DEF." }),
  createHero(217, "Ilia", "Choir of One", "light", "rare", "support", "Cantora com vários ecos luminosos repetindo seus gestos.", { name: "Harmonic Rise", description: "Grants three chained +8% ATK buffs.", effects: [{ stat: "attack", multiplier: 1.08, duration: 10 }, { stat: "attack", multiplier: 1.08, duration: 10 }, { stat: "attack", multiplier: 1.08, duration: 10 }] }),
  createHero(218, "Jarek", "Wolf Standard", "wind", "rare", "tank", "Porta-estandarte de pele cinza acompanhado por lobos de vento.", { name: "Pack Formation", description: "Grants team +15% DEF and ATK SPD.", effects: [{ stat: "defense", multiplier: 1.15, duration: 8 }, { stat: "attackSpeed", multiplier: 1.15, duration: 8 }] }),
  createHero(219, "Kei", "Venom Cartographer", "dark", "rare", "controller", "Cartógrafa com mapas venenosos tatuados nos braços.", { name: "Dead Route", description: "Applies -20% DEF and -10% healing.", effects: [{ stat: "defense", multiplier: 0.8, duration: 8, target: "enemy" }, { stat: "hpRecovery", multiplier: 0.9, duration: 8, target: "enemy" }] }),
  createHero(220, "Ludo", "Festival Cannon", "fire", "rare", "dps", "Artilheiro colorido com canhão portátil coberto de fitas.", { name: "Grand Finale", description: "Deals 300% ATK AoE with high CRIT DMG." }),
];

export const EPIC_HEROES = [
  createHero(301, "Cyra", "Void Dancer", "dark", "epic", "dps", "Dançarina em seda negra com círculos vazios orbitando o corpo.", { name: "Eventide Step", description: "Deals 340% ATK and gains +45% CRIT Rate.", effects: [{ stat: "critRate", multiplier: 1.45, duration: 6 }] }),
  createHero(302, "Draven", "Thunder Regent", "wind", "epic", "support", "Regente de manto púrpura empunhando um cetro de tempestade.", { name: "Royal Tempest", description: "Deals 350% ATK and grants +28% ATK SPD.", effects: [{ stat: "attackSpeed", multiplier: 1.28, duration: 10 }] }),
  createHero(303, "Elowen", "Verdant Oracle", "earth", "epic", "healer", "Oráculo coroada por folhas luminosas e galhos dourados.", { name: "Ancient Bloom", description: "Heals all allies and grants two chained +15% ATK buffs.", effects: [{ stat: "attack", multiplier: 1.15, duration: 10 }, { stat: "attack", multiplier: 1.15, duration: 10 }] }),
  createHero(304, "Faye", "Prism Lancer", "light", "epic", "dps", "Lanceira em armadura facetada que refrata todas as cores.", { name: "Spectrum Break", description: "Deals 380% ATK and applies -30% DEF.", effects: [{ stat: "defense", multiplier: 0.7, duration: 10, target: "enemy" }] }),
  createHero(305, "Garr", "Molten Warden", "fire", "epic", "tank", "Guardião de obsidiana rachada com magma visível por dentro.", { name: "Caldera Oath", description: "Grants allies +35% DEF and deals damage based on HP.", effects: [{ stat: "defense", multiplier: 1.35, duration: 9 }] }),
  createHero(306, "Hana", "Moon Current", "water", "epic", "healer", "Espadachim de quimono prateado cercada por água em forma de lua.", { name: "Silver Tide", description: "Deals four 105% ATK hits and grants +30% HP Recovery.", effects: [{ stat: "hpRecovery", multiplier: 1.3, duration: 10 }] }),
  createHero(307, "Isolde", "Silent Bell", "dark", "epic", "controller", "Monja de véu preto carregando um sino rachado sem badalo.", { name: "Final Chime", description: "Deals 440% ATK and silences boss skills for 4s." }),
  createHero(308, "Jett", "Arc Engineer", "metal", "epic", "support", "Engenheiro de casaco branco com rifle de trilho compacto.", { name: "Rail Burst", description: "Deals 400% ATK and grants +40% equipment power.", effects: [{ stat: "equipmentPower", multiplier: 1.4, duration: 12 }] }),
  createHero(309, "Kora", "Skybreaker", "wind", "epic", "dps", "Guerreira alada com martelo celeste e tranças cor de prata.", { name: "Falling Horizon", description: "Deals 420% ATK AoE and stuns for 3s." }),
  createHero(310, "Noctis", "Dream Warden", "dark", "epic", "controller", "Sentinela de armadura azul-noturna com uma chave onírica.", { name: "Unwaking Gate", description: "Deals 360% ATK and extends every enemy debuff by 5s." }),
];

export const LEGENDARY_HEROES = [
  createHero(501, "Saito", "Dark Samurai", "dark", "legendary", "dps", "Samurai sombrio com olhos brilhantes e katana coberta por luar violeta.", {
    name: "Moonlight Annihilation",
    description: "Grants allies: +30% ATK SPD, +40% CRIT Rate, +50% CRIT DMG. Deals 400% ATK AoE and applies -40% Armor (15s debuff). CD: 20s",
    cooldown: 20,
    effects: [
      { stat: "attackSpeed", multiplier: 1.3, duration: 15 },
      { stat: "critRate", multiplier: 1.4, duration: 15 },
      { stat: "critDamage", multiplier: 1.5, duration: 15 },
      { stat: "defense", multiplier: 0.6, duration: 15, target: "enemy" },
    ],
  }, { stats: { hp: 200, attack: 121, defense: 118, critRate: 5, critDamage: 200, hpRecovery: 12, attackSpeed: 114 } }),
  createHero(502, "Aria", "Star Empress", "light", "legendary", "support", "Imperatriz de cabelos brancos com uma coroa de pequenas estrelas vivas.", { name: "Celestial Dominion", description: "Deals 520% ATK AoE and grants allies +45% ATK and a radiant barrier.", cooldown: 22, effects: [{ stat: "attack", multiplier: 1.45, duration: 12 }] }),
  createHero(503, "Kael", "Eternal Flame", "fire", "legendary", "dps", "Espadachim de armadura rubra, cabelos em brasa e uma lâmina flamejante.", { name: "Solar Rend", description: "Deals 560% ATK AoE, ignites the enemy, and grants +35% CRIT DMG.", cooldown: 18, effects: [{ stat: "critDamage", multiplier: 1.35, duration: 10 }] }),
  createHero(504, "Mira", "Infinite Tide", "water", "legendary", "healer", "Rainha oceânica de manto translúcido com uma coroa de coral azul.", { name: "Ocean Without End", description: "Deals five 120% hits, heals all allies, and resets one cooldown.", cooldown: 24, effects: [{ stat: "hpRecovery", multiplier: 1.5, duration: 12 }] }),
  createHero(505, "Garron", "World Eater", "earth", "legendary", "tank", "Colosso em armadura de pedra continental com veios de ouro.", { name: "Continental Maw", description: "Deals 600% DEF, grants +60% DEF, and cleanses one enemy buff.", cooldown: 25, effects: [{ stat: "defense", multiplier: 1.6, duration: 12 }] }),
];

const EXPANSION_NAMES = {
  common: [
    "Aeron", "Brisa", "Caio", "Delia", "Eamon", "Freya", "Gino", "Helmi", "Inara", "Jonas",
    "Kelda", "Lucan", "Maia", "Nilo", "Oona", "Piero", "Rumi", "Sena", "Tavo", "Uri",
    "Vana", "Walt", "Xenia", "Yori", "Zola", "Ansel", "Bina", "Ciro", "Dara", "Emil",
    "Fara", "Galen", "Hesti", "Ivo", "Jana", "Kuno", "Lumi", "Milo", "Nara", "Olek",
    "Pia", "Ravi", "Suri", "Timo", "Ulla", "Vero", "Wynn", "Xara", "Yuna", "Zeno",
    "Arlo", "Bela", "Cian", "Dora", "Eira", "Fenn", "Gaia", "Hugo", "Iona", "Jori",
    "Kiri", "Leif", "Mina", "Nox", "Otto", "Pela", "Rian", "Sora", "Theo", "Una",
  ],
  rare: [
    "Adira", "Bastian", "Calista", "Darius", "Evania", "Faolan", "Giada", "Hadrian", "Ilyra", "Jasper",
    "Kassia", "Leona", "Magnus", "Nerissa", "Oswin", "Petra", "Quentin", "Riona", "Sabine", "Tristan",
    "Uriah", "Valeria", "Wystan", "Ximena", "Ysolde", "Zephyr", "Amaris", "Brennan", "Celine", "Daxton",
    "Elara", "Fintan", "Giselle", "Harken", "Iskra", "Jovian", "Kallum", "Lysandra", "Merek", "Novara",
  ],
  epic: [
    "Aurelia", "Boreas", "Cassian", "Delyth", "Evander", "Fiore", "Galatea", "Hyperion", "Ithaca", "Jericho",
    "Kestrel", "Leontes", "Melisande", "Nicanor", "Ophelia", "Perseus", "Quintessa", "Ragnar", "Sylvara", "Tiberius",
  ],
  legendary: ["Astraeus", "Bellatrix", "Calyx", "Daeva", "Erebus"],
};

const EXPANSION_TITLES = {
  common: [
    "Cloud Cartographer", "Bramble Cook", "River Warden", "Copper Tailor", "Beacon Sweeper", "Cinder Shepherd", "Hollow Miller", "Rain Collector", "Quiet Falcon", "Lantern Mason",
    "Pebble Oracle", "Tide Carpenter", "Meadow Runner", "Ash Scribe", "Reed Sentinel", "Dust Gardener", "Moon Baker", "Ridge Herald", "Moss Trapper", "Glass Ferryman",
    "Dawn Forager", "Iron Bellman", "Mist Weaver", "Ember Courier", "Stone Piper", "Willow Smith", "Frost Chandler", "Wild Archivist", "Sunken Scout", "Starling Guard",
    "Coal Apothecary", "Gale Farmer", "Pond Duelist", "Amber Drummer", "Night Potter", "Flint Keeper", "Dew Ranger", "Thorn Sailor", "Vale Whisperer", "Rune Cobbler",
    "Birch Watcher", "Storm Brewer", "Marsh Cantor", "Slate Hunter", "Glow Fisher", "Crag Messenger", "Snow Binder", "Lake Tinker", "Breeze Monk", "Grove Miner",
    "Soot Dancer", "Pearl Porter", "Hill Reader", "Twilight Weaver", "Acorn Knight", "Fog Painter", "Clay Archer", "Sun Dialer", "Cave Singer", "Field Alchemist",
    "Rope Magician", "Pine Fencer", "Shell Keeper", "Raven Medic", "Brook Captain", "Wheat Seer", "Quartz Boxer", "Pollen Scout", "Echo Herbalist", "Crescent Guard",
  ],
  rare: [
    "Aurora Marshal", "Basalt Prophet", "Coral Magistrate", "Dusk Corsair", "Emerald Astrologer", "Furnace Pilgrim", "Golden Saboteur", "Harbor Exorcist", "Ivory Tempest", "Jade Cavalier",
    "Kite Enchantress", "Lotus Arbiter", "Meteor Keeper", "Nebula Physician", "Obsidian Falconer", "Prism Corsair", "Quarry Saint", "Ruby Cartographer", "Sapphire Judge", "Thunder Botanist",
    "Umbral Surveyor", "Verdant Musketeer", "Winter Conductor", "Xenon Duelist", "Yew Necromancer", "Zephyr Architect", "Astral Locksmith", "Brass Diviner", "Crimson Navigator", "Diamond Vagrant",
    "Eclipse Gardener", "Flare Custodian", "Granite Medium", "Horizon Binder", "Ink Paladin", "Jubilee Ranger", "Kelpie Warden", "Lunar Artificer", "Monsoon Herald", "Nova Shepherd",
  ],
  epic: [
    "Auric Sovereign", "Boreal Destroyer", "Chronicle Blade", "Dragonwake Oracle", "Evernight Admiral", "Floral Cataclysm", "Gravity Saint", "Helios Executioner", "Ironwood Monarch", "Judgment Comet",
    "Kraken Tamer", "Labyrinth Prince", "Mirror Seraph", "Null Cathedral", "Oathbound Eclipse", "Phoenix Matriarch", "Quasar Reaper", "Runic Leviathan", "Solar Huntress", "Titan of Bells",
  ],
  legendary: ["Crown of First Light", "Queen of Falling Stars", "The Living Grail", "Mother of Nightmares", "Lord Beneath the Sun"],
};

const EXPANSION_ELEMENTS = ["fire", "water", "earth", "wind", "light", "dark", "metal", "nature"];
const EXPANSION_ROLES = ["dps", "tank", "healer", "support", "controller"];
const TECHNIQUES = ["Ascension", "Cascade", "Edict", "Refrain", "Convergence", "Rupture", "Sanctuary", "Reversal", "Overture", "Dominion"];

function buildExpansionHero(rarity, index) {
  const offsets = { common: 1001, rare: 2001, epic: 3001, legendary: 5001 };
  const id = offsets[rarity] + index;
  const name = EXPANSION_NAMES[rarity][index];
  const title = EXPANSION_TITLES[rarity][index];
  const element = EXPANSION_ELEMENTS[(index + id) % EXPANSION_ELEMENTS.length];
  const role = EXPANSION_ROLES[(index * 3 + id) % EXPANSION_ROLES.length];
  const technique = TECHNIQUES[index % TECHNIQUES.length];
  const power = { common: 10, rare: 18, epic: 32, legendary: 50 }[rarity] + (index % 9);
  const duration = 6 + (index % 7);
  const appearance = `${title} de silhueta inconfundível, adornos de ${element} e o selo pessoal de ${name} gravado no equipamento.`;
  let ability;

  if (role === "dps") {
    ability = {
      name: `${title} ${technique}`,
      description: `Deals ${180 + power * 4}% ATK and gains +${power}% CRIT DMG for ${duration}s.`,
      effects: [{ stat: "critDamage", multiplier: 1 + power / 100, duration }],
    };
  } else if (role === "tank") {
    ability = {
      name: `${title} ${technique}`,
      description: `Deals ${120 + power * 2}% DEF and grants allies +${power}% DEF for ${duration}s.`,
      effects: [{ stat: "defense", multiplier: 1 + power / 100, duration }],
    };
  } else if (role === "healer") {
    ability = {
      name: `${title} ${technique}`,
      description: `Heals all allies and grants +${power}% HP Recovery for ${duration}s.`,
      effects: [{ stat: "hpRecovery", multiplier: 1 + power / 100, duration }],
    };
  } else if (role === "support") {
    ability = {
      name: `${title} ${technique}`,
      description: `Grants allies +${power}% ATK and +${Math.max(8, power - 6)}% ATK SPD for ${duration}s.`,
      effects: [
        { stat: "attack", multiplier: 1 + power / 100, duration },
        { stat: "attackSpeed", multiplier: 1 + Math.max(8, power - 6) / 100, duration },
      ],
    };
  } else {
    ability = {
      name: `${title} ${technique}`,
      description: `Deals ${150 + power * 3}% ATK and applies -${power}% DEF for ${duration}s.`,
      effects: [{ stat: "defense", multiplier: 1 - power / 100, duration, target: "enemy" }],
    };
  }

  return createHero(id, name, title, element, rarity, role, appearance, ability);
}

export const EXPANSION_COMMON_HEROES = EXPANSION_NAMES.common.map((_, index) => buildExpansionHero("common", index));
export const EXPANSION_RARE_HEROES = EXPANSION_NAMES.rare.map((_, index) => buildExpansionHero("rare", index));
export const EXPANSION_EPIC_HEROES = EXPANSION_NAMES.epic.map((_, index) => buildExpansionHero("epic", index));
export const EXPANSION_LEGENDARY_HEROES = EXPANSION_NAMES.legendary.map((_, index) => buildExpansionHero("legendary", index));

export const HEROES = [
  ...COMMON_HEROES,
  ...EXPANSION_COMMON_HEROES,
  ...RARE_HEROES,
  ...EXPANSION_RARE_HEROES,
  ...EPIC_HEROES,
  ...EXPANSION_EPIC_HEROES,
  ...LEGENDARY_HEROES,
  ...EXPANSION_LEGENDARY_HEROES,
];
export const HERO_BY_ID = new Map(HEROES.map((hero) => [hero.id, hero]));
export const HERO_ROLES = ["dps", "tank", "healer", "support", "controller"];
export const RARITY_ORDER = ["common", "rare", "epic", "legendary"];
export const SUMMON_RATES = { common: 0.6, rare: 0.3, epic: 0.08, legendary: 0.02 };

