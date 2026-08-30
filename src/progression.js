export const SYSTEM_UNLOCKS = [
  { id: "combat", requirementKey: "unlock.combat.requirement", unlocked: () => true },
  { id: "profile", requirementKey: "unlock.profile.requirement", unlocked: () => true },
  { id: "heroes", requirementKey: "unlock.heroes.requirement", unlocked: (state) => state.player.highestFloor >= 2 },
  { id: "summon", requirementKey: "unlock.summon.requirement", reward: { crystals: 10 }, unlocked: (state) => state.player.highestFloor >= 3 },
  { id: "mining", requirementKey: "unlock.mining.requirement", unlocked: (state) => state.player.highestFloor >= 4 },
  { id: "shop", requirementKey: "unlock.shop.requirement", unlocked: (state) => state.player.highestFloor >= 7 },
  { id: "dungeons", requirementKey: "unlock.dungeons.requirement", reward: { crystals: 5 }, unlocked: (state) => state.player.bossesDefeated >= 1 || state.player.highestFloor >= 11 },
  { id: "pets", requirementKey: "unlock.pets.requirement", reward: { crystals: 30 }, unlocked: (state) => Object.values(state.dungeons.records ?? {}).some((floor) => Number(floor) >= 1) },
  { id: "legacy", requirementKey: "unlock.legacy.requirement", unlocked: (state) => state.player.highestFloor >= 50 },
];

const SYSTEM_BY_ID = new Map(SYSTEM_UNLOCKS.map((system) => [system.id, system]));

export function createProgressionState() {
  return {
    unlocked: ["combat", "profile"],
    rewardsClaimed: ["combat", "profile"],
    tutorial: {
      step: 0,
      hidden: false,
      completed: false,
      notice: null,
    },
  };
}

export function normalizeProgression(raw) {
  const base = createProgressionState();
  if (!raw || typeof raw !== "object") return base;
  return {
    unlocked: [...new Set(["combat", "profile", ...(Array.isArray(raw.unlocked) ? raw.unlocked : [])])],
    rewardsClaimed: [...new Set(["combat", "profile", ...(Array.isArray(raw.rewardsClaimed) ? raw.rewardsClaimed : [])])],
    tutorial: {
      ...base.tutorial,
      ...(raw.tutorial && typeof raw.tutorial === "object" ? raw.tutorial : {}),
      step: Math.max(0, Math.min(4, Number(raw.tutorial?.step ?? 0))),
    },
  };
}

export function systemUnlock(id) {
  return SYSTEM_BY_ID.get(id) ?? null;
}

export function isSystemUnlocked(state, id) {
  const system = systemUnlock(id);
  return Boolean(system?.unlocked(state));
}

function grantReward(state, reward = {}) {
  for (const [resource, amount] of Object.entries(reward)) {
    if (resource in state.resources) state.resources[resource] += amount;
  }
}

export function syncProgression(state) {
  state.progression = normalizeProgression(state.progression);
  const newlyUnlocked = [];

  for (const system of SYSTEM_UNLOCKS) {
    if (!system.unlocked(state) || state.progression.unlocked.includes(system.id)) continue;
    state.progression.unlocked.push(system.id);
    if (!state.progression.rewardsClaimed.includes(system.id)) {
      grantReward(state, system.reward);
      state.progression.rewardsClaimed.push(system.id);
    }
    newlyUnlocked.push(system);
  }

  if (newlyUnlocked.length > 0) {
    state.progression.tutorial.notice = newlyUnlocked.at(-1).id;
    state.progression.tutorial.hidden = false;
  }
  return newlyUnlocked;
}

export function nextLockedSystem(state) {
  return SYSTEM_UNLOCKS.find((system) => !["combat", "profile"].includes(system.id) && !isSystemUnlocked(state, system.id)) ?? null;
}

export function advanceTutorial(state) {
  const tutorial = state.progression.tutorial;
  tutorial.notice = null;
  tutorial.step = Math.min(4, tutorial.step + 1);
  if (tutorial.step >= 4) tutorial.completed = true;
}

export function hideTutorial(state) {
  state.progression.tutorial.hidden = true;
}

export function skipTutorial(state) {
  state.progression.tutorial.step = 4;
  state.progression.tutorial.completed = true;
  state.progression.tutorial.notice = null;
  state.progression.tutorial.hidden = true;
}

export function reopenTutorial(state) {
  state.progression.tutorial.hidden = false;
}

export function clearUnlockNotice(state) {
  state.progression.tutorial.notice = null;
}
