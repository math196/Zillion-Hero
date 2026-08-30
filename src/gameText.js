const TERMS = {
  en: {
    role: { dps: "DPS", tank: "Tank", healer: "Healer", support: "Support", controller: "Controller" },
    rarity: { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" },
    element: { fire: "Fire", water: "Water", earth: "Earth", wind: "Wind", light: "Light", dark: "Dark", metal: "Metal", nature: "Nature" },
    currency: { gold: "Gold", crystals: "Crystals", ore: "Ore", tokens: "Tokens", essence: "Essence" },
    phase: { horde: "Horde", boss: "Boss" },
    type: { normal: "Normal", elite: "Elite", boss: "Boss" },
    stat: { attack: "ATK", defense: "DEF", critRate: "CRIT Rate", critDamage: "CRIT DMG", hpRecovery: "HP Recovery", attackSpeed: "ATK SPD", oreGain: "Ore Gain", equipmentPower: "Equipment Power" },
  },
  pt: {
    role: { dps: "Dano", tank: "Tanque", healer: "Curador", support: "Suporte", controller: "Controlador" },
    rarity: { common: "Comum", rare: "Raro", epic: "Épico", legendary: "Lendário" },
    element: { fire: "Fogo", water: "Água", earth: "Terra", wind: "Vento", light: "Luz", dark: "Trevas", metal: "Metal", nature: "Natureza" },
    currency: { gold: "Ouro", crystals: "Cristais", ore: "Minério", tokens: "Fichas", essence: "Essência" },
    phase: { horde: "Horda", boss: "Chefe" },
    type: { normal: "Normal", elite: "Elite", boss: "Chefe" },
    stat: { attack: "ATQ", defense: "DEF", critRate: "Taxa Crítica", critDamage: "Dano Crítico", hpRecovery: "Recuperação de HP", attackSpeed: "Velocidade de Ataque", oreGain: "Ganho de Minério", equipmentPower: "Poder de Equipamento" },
  },
};

const PT_DATA = {
  area: {
    "spirit-forest": { name: "Floresta dos Espíritos" },
    "dark-marsh": { name: "Pântano Sombrio" },
    "ember-peak": { name: "Pico das Brasas" },
    "star-ruins": { name: "Ruínas Estelares" },
    "hollow-sky": { name: "Céu Vazio" },
  },
  boss: {
    gorgon: { name: "Górgona", quote: "Um olhar é tudo o que sua coragem merece.", abilities: { Petrify: "Petrificar", "Summon Minions": "Invocar Servos", "Defense Break": "Quebra de Defesa" } },
    "rootbound-king": { name: "Rei Enraizado", quote: "Todos os caminhos terminam sob minhas raízes.", abilities: { "Bark Armor": "Armadura de Casca", "Root Prison": "Prisão de Raízes" } },
    "mire-queen": { name: "Rainha do Lodo Vhal", quote: "O pântano se lembra de cada invasor.", abilities: { "Toxic Tide": "Maré Tóxica", "Royal Cleanse": "Purificação Real" } },
    "caldera-tyrant": { name: "Tirano da Caldeira", quote: "Seu aço passará a fazer parte da montanha.", abilities: { "Molten Core": "Núcleo Fundido", "Ash Purge": "Expurgo de Cinzas" } },
    "empty-constellation": { name: "Constelação Vazia", quote: "Eu vi sua vitória desaparecer antes de você chegar.", abilities: { Starfall: "Queda Estelar", "Null Light": "Luz Nula" } },
  },
  equipment: {
    "flaming-sword": { name: "Espada Flamejante", passive: "+20% de ATQ de Fogo" },
    "ice-dagger": { name: "Adaga de Gelo", passive: "+15% de Taxa Crítica" },
    "thunder-hammer": { name: "Martelo do Trovão", passive: "+18% de Velocidade de Ataque" },
    "moon-katana": { name: "Katana Lunar", passive: "+30% de Dano Crítico" },
    "sun-spear": { name: "Lança Solar", passive: "+20% de Dano contra Chefes" },
    "stone-aegis": { name: "Égide de Pedra", passive: "+22% de DEF" },
    "verdant-codex": { name: "Códice Verdejante", passive: "+20% de Recuperação de HP" },
    "gear-heart": { name: "Coração de Engrenagem", passive: "+25% de Poder de Equipamento" },
  },
  upgrade: {
    training: { name: "Treinamento da Equipe", description: "+12% de ATQ da equipe por nível." },
    fortune: { name: "Fortuna de Campo", description: "+10% de ouro recebido por nível." },
    pickaxe: { name: "Picareta Profunda", description: "+25% de produção de minério por nível." },
    focus: { name: "Foco de Comando", description: "+15% de dano do ataque coordenado por nível." },
  },
  dungeon: {
    "ancient-crypt": { name: "Cripta Antiga" },
    "glass-archive": { name: "Arquivo de Vidro" },
    "ashen-gate": { name: "Portão das Cinzas" },
  },
  pet: {
    mochi: { activeName: "Explosão Curativa", activeEffect: "Cura todos os heróis em 20% do HP máximo", passive: "+10% de XP recebido" },
    cinder: { activeName: "Chuva de Fogo", activeEffect: "Causa globalmente 300% do ATQ da equipe", passive: "+8% de ATQ de Fogo" },
    pebble: { activeName: "Cobertura de Pedra", activeEffect: "Concede +20% de DEF à equipe por 10s", passive: "+5% de DEF" },
    lumen: { activeName: "Segundo Amanhecer", activeEffect: "Reinicia a recarga de todos os heróis", passive: "+12% de Velocidade de Ataque" },
    nix: { activeName: "Pata Congelante", activeEffect: "Atrasa a habilidade do chefe em 8s", passive: "+8% de dano contra chefes" },
  },
};

const PT_KNOWN_NAMES = {
  "Wild Echo": "Eco Selvagem",
  "Moss Hound": "Cão de Musgo",
  "Thorn Wisp": "Fagulha de Espinhos",
  "Bog Shade": "Sombra do Brejo",
  "Drowned Husk": "Carcaça Afogada",
  "Night Leech": "Sanguessuga Noturna",
  "Ash Sentinel": "Sentinela de Cinzas",
  "Cinder Wolf": "Lobo de Brasas",
  "Magma Husk": "Carcaça de Magma",
  "Lost Automaton": "Autômato Perdido",
  "Prism Ghost": "Fantasma Prismático",
  "Rift Keeper": "Guardião da Fenda",
  "Cloud Maw": "Mandíbula das Nuvens",
  "Storm Revenant": "Revenante da Tempestade",
  "Broken Seraph": "Serafim Partido",
  Raider: "Saqueador",
  Bulwark: "Bastião",
  Hexer: "Feiticeiro",
  Mender: "Curandeiro",
  Attack: "Ataque",
  "Coordinated Strike": "Ataque Coordenado",
  Commander: "Comandante",
};

const CANONICAL_NAMES = {
  "Spirit Forest": PT_DATA.area["spirit-forest"].name,
  "Dark Marsh": PT_DATA.area["dark-marsh"].name,
  "Ember Peak": PT_DATA.area["ember-peak"].name,
  "Star Ruins": PT_DATA.area["star-ruins"].name,
  "Hollow Sky": PT_DATA.area["hollow-sky"].name,
  Gorgon: PT_DATA.boss.gorgon.name,
  "The Rootbound King": PT_DATA.boss["rootbound-king"].name,
  "Mire Queen Vhal": PT_DATA.boss["mire-queen"].name,
  "Caldera Tyrant": PT_DATA.boss["caldera-tyrant"].name,
  "The Empty Constellation": PT_DATA.boss["empty-constellation"].name,
  "Ancient Crypt": PT_DATA.dungeon["ancient-crypt"].name,
  "Glass Archive": PT_DATA.dungeon["glass-archive"].name,
  "Ashen Gate": PT_DATA.dungeon["ashen-gate"].name,
  ...PT_KNOWN_NAMES,
};

const PT_ABILITY_NAMES = Object.assign({}, ...Object.values(PT_DATA.boss).map((boss) => boss.abilities ?? {}));

const HERO_PT = {
  roleTitle: { dps: "Combatente", tank: "Guardião", healer: "Curador", support: "Arauto", controller: "Dominador" },
  elementTitle: { fire: "das Chamas", water: "das Marés", earth: "da Terra", wind: "dos Ventos", light: "da Luz", dark: "das Sombras", metal: "do Metal", nature: "da Natureza" },
  basicName: { dps: "Ataque Preciso", tank: "Golpe Defensivo", healer: "Raio Restaurador", support: "Pulso Tático", controller: "Golpe Desestabilizador" },
  specialName: { fire: "Ruptura Flamejante", water: "Maré Infinita", earth: "Impacto Sísmico", wind: "Tempestade Ascendente", light: "Julgamento Radiante", dark: "Eclipse Sombrio", metal: "Sobrecarga Metálica", nature: "Despertar Verdejante" },
  passiveName: { dps: "Ritmo Predador", tank: "Linha Inquebrável", healer: "Renovação Compartilhada", support: "Ritmo de Batalha", controller: "Abertura Exposta" },
};

export function gameTerm(category, value, language = "en") {
  return TERMS[language]?.[category]?.[value] ?? TERMS.en[category]?.[value] ?? String(value);
}

export function localizeEntity(entity, category, language = "en") {
  if (!entity || language !== "pt") return entity;
  const localized = PT_DATA[category]?.[entity.id];
  if (!localized) return entity;
  if (category === "pet") {
    return { ...entity, activeAbility: { ...entity.activeAbility, name: localized.activeName, effect: localized.activeEffect }, passive: localized.passive };
  }
  if (category === "boss") {
    return { ...entity, ...localized, abilities: entity.abilities.map((ability) => ({ ...ability, name: localized.abilities?.[ability.name] ?? ability.name })) };
  }
  return { ...entity, ...localized };
}

function effectSentence(effect) {
  const amount = Math.round(Math.abs(effect.multiplier - 1) * 100);
  const direction = effect.multiplier >= 1 ? "Aumenta" : "Reduz";
  const target = effect.target === "enemy" ? "do inimigo" : effect.target === "self" ? "do próprio herói" : "da equipe";
  const duration = effect.duration ? ` por ${effect.duration}s` : "";
  return `${direction} ${gameTerm("stat", effect.stat, "pt")} ${target} em ${amount}%${duration}.`;
}

export function localizeHero(hero, language = "en") {
  if (!hero) return hero;
  if (language !== "pt") {
    const role = gameTerm("role", hero.role, "en").toLowerCase();
    const element = gameTerm("element", hero.element, "en").toLowerCase();
    return {
      ...hero,
      appearance: `${hero.name} is a distinctive ${element} ${role} whose equipment reflects the title “${hero.title}”.`,
    };
  }

  const coefficient = { common: 150, rare: 210, epic: 300, legendary: 400 }[hero.rarity];
  const effectText = hero.special.effects.map(effectSentence).join(" ");
  const specialLead = hero.role === "healer"
    ? "Restaura o aliado mais ferido e pode revivê-lo com 25% do HP máximo."
    : `Causa ${coefficient}% do ATQ ao alvo atual.`;
  const passiveText = hero.passive.effects.map(effectSentence).join(" ");
  const portugueseAppearance = hero.appearance.startsWith(hero.title)
    ? `${hero.name} possui visual inconfundível, energia de ${gameTerm("element", hero.element, "pt")} e equipamento próprio de um ${gameTerm("role", hero.role, "pt").toLowerCase()}.`
    : hero.appearance;
  const basicDescription = {
    dps: "Causa dano direto ao alvo atual.",
    tank: "Ataca o alvo sem abandonar a postura defensiva.",
    healer: "Causa dano leve sem atrasar uma cura de emergência.",
    support: "Causa dano leve enquanto prepara o próximo bônus da equipe.",
    controller: "Causa dano enquanto pressiona as defesas do alvo.",
  }[hero.role];

  return {
    ...hero,
    title: `${HERO_PT.roleTitle[hero.role]} ${HERO_PT.elementTitle[hero.element]}`,
    appearance: portugueseAppearance,
    basicAttack: {
      ...hero.basicAttack,
      name: `${HERO_PT.basicName[hero.role]} de ${hero.name}`,
      description: `${basicDescription} Afinidade de ${gameTerm("element", hero.element, "pt")}.`,
    },
    special: {
      ...hero.special,
      name: `${HERO_PT.specialName[hero.element]} de ${hero.name}`,
      description: `${specialLead}${effectText ? ` ${effectText}` : ""}`,
    },
    passive: {
      ...hero.passive,
      name: `${HERO_PT.passiveName[hero.role]} de ${hero.name}`,
      description: `Ao alcançar 5★, ${passiveText ? passiveText.charAt(0).toLowerCase() + passiveText.slice(1) : "concede um bônus permanente ao herói."}`,
    },
  };
}

export function localizeHeroAction(hero, action, language = "en") {
  if (language !== "pt") return action === "Ataque Coordenado" ? "Coordinated Strike" : action;
  if (!hero) return PT_KNOWN_NAMES[action] ?? action;
  const localized = localizeHero(hero, language);
  if (action === hero.basicAttack.name) return localized.basicAttack.name;
  if (action === hero.special.name) return localized.special.name;
  return action === "GUARD" ? "GUARDA" : action;
}

export function localizeKnownAbility(value, language = "en") {
  if (language !== "pt") return value;
  return PT_ABILITY_NAMES[value] ?? PT_KNOWN_NAMES[value] ?? value;
}

export function localizeKnownName(value, language = "en") {
  if (!value) return value;
  if (language !== "pt") return value === "Comandante" ? "Commander" : value;
  if (CANONICAL_NAMES[value]) return CANONICAL_NAMES[value];
  if (value.endsWith(" Warden")) return `Guardião de ${localizeKnownName(value.slice(0, -7), language)}`;
  for (const [english, portuguese] of Object.entries(CANONICAL_NAMES).sort((a, b) => b[0].length - a[0].length)) {
    if (value.startsWith(`${english} `)) return `${portuguese} ${localizeKnownName(value.slice(english.length + 1), language)}`;
  }
  return value;
}

