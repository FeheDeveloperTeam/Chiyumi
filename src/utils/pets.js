const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "pets.json");
const TIMEZONE = "Asia/Seoul";
const DEFAULT_STAT = 80;
const DECAY_PER_DAY = 5;

const STAGES = [
  { minDays: 3650, name: "전설의 고양이", emoji: "🐉" },
  { minDays: 1825, name: "노묘", emoji: "🐈⬛" },
  { minDays: 365, name: "성묘", emoji: "🐈" },
  { minDays: 180, name: "청년 고양이", emoji: "🐱" },
  { minDays: 30, name: "어린 고양이", emoji: "🐱" },
  { minDays: 7, name: "아깽이", emoji: "🐾" },
  { minDays: 0, name: "새끼 고양이", emoji: "🐾" },
];

const LAST_KEY = { feed: "lastFed", wash: "lastWashed", play: "lastPlayed" };

const ACTIONS = {
  feed: {
    label: "밥 주기",
    statKey: "hunger",
    successChance: 0.8,
    successTexts: ["냠냠 맛있게 먹었다", "그릇을 싹싹 비웠다", "꾹꾹이를 하며 먹었다"],
    failTexts: ["사료 그릇을 엎어버렸다", "냄새만 맡고 도망갔다", "츄르만 먹고 밥은 거부했다"],
  },
  wash: {
    label: "씻겨주기",
    statKey: "cleanliness",
    successChance: 0.75,
    successTexts: ["얌전히 목욕을 마쳤다", "거품 목욕을 즐겼다", "뽀송뽀송해졌다"],
    failTexts: ["물을 보고 도망갔다", "할퀴고 도망갔다", "거품 목욕 중 탈출했다"],
  },
  play: {
    label: "놀아주기",
    statKey: "affection",
    successChance: 0.8,
    successTexts: ["신나게 뛰어놀았다", "장난감을 가지고 놀았다", "꼬리를 흔들며 좋아했다"],
    failTexts: ["장난감을 무시하고 잠들어버렸다", "삐져서 숨어버렸다", "놀다가 싫증나서 도망갔다"],
  },
};

const MOOD_STATS = [
  { key: "hunger", label: "배가 고파 보인다" },
  { key: "cleanliness", label: "꾀죄죄해 보인다" },
  { key: "affection", label: "외로워 보인다" },
];

function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
}

function daysBetween(fromDateString, toDateString) {
  const from = new Date(`${fromDateString}T00:00:00+09:00`);
  const to = new Date(`${toDateString}T00:00:00+09:00`);
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function loadAll() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveAll(pets) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(pets, null, 2));
}

function applyDecay(pet) {
  const today = getKstDateString();
  const lastDecayedAt = pet.lastDecayedAt ?? pet.adoptedAt;
  const daysPassed = daysBetween(lastDecayedAt, today);

  if (daysPassed > 0) {
    pet.hunger = Math.max(0, pet.hunger - daysPassed * DECAY_PER_DAY);
    pet.cleanliness = Math.max(0, pet.cleanliness - daysPassed * DECAY_PER_DAY);
    pet.affection = Math.max(0, pet.affection - daysPassed * DECAY_PER_DAY);
    pet.lastDecayedAt = today;
  }

  return pet;
}

function ensurePet(pets, userId) {
  let pet = pets[userId];

  if (!pet) {
    pet = {
      name: null,
      adoptedAt: getKstDateString(),
      hunger: DEFAULT_STAT,
      cleanliness: DEFAULT_STAT,
      affection: DEFAULT_STAT,
      lastFed: null,
      lastWashed: null,
      lastPlayed: null,
      lastDecayedAt: getKstDateString(),
    };
    pets[userId] = pet;
  }

  applyDecay(pet);
  return pet;
}

function getOrCreatePet(userId) {
  const pets = loadAll();
  const pet = ensurePet(pets, userId);
  saveAll(pets);
  return pet;
}

function setPetName(userId, name) {
  const pets = loadAll();
  const pet = ensurePet(pets, userId);
  pet.name = name;
  saveAll(pets);
  return pet;
}

function getAgeDays(pet) {
  const adopted = new Date(`${pet.adoptedAt}T00:00:00+09:00`);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - adopted.getTime()) / (24 * 60 * 60 * 1000)));
}

function getStage(ageDays) {
  return STAGES.find((stage) => ageDays >= stage.minDays);
}

function getMoodText(pet) {
  const worst = MOOD_STATS.reduce((min, cur) => (pet[cur.key] < pet[min.key] ? cur : min));

  if (pet[worst.key] < 30) return worst.label;

  const average = (pet.hunger + pet.cleanliness + pet.affection) / 3;

  if (average >= 80) return "행복해 보인다";
  if (average >= 50) return "평온해 보인다";
  return "기운이 없어 보인다";
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function performAction(userId, action) {
  const pets = loadAll();
  const pet = ensurePet(pets, userId);

  const today = getKstDateString();
  const lastKey = LAST_KEY[action];

  if (pet[lastKey] === today) {
    saveAll(pets);
    return { alreadyDone: true, pet };
  }

  pet[lastKey] = today;

  const config = ACTIONS[action];
  const succeeded = Math.random() < config.successChance;

  if (succeeded) {
    pet[config.statKey] = Math.min(100, pet[config.statKey] + randomBetween(10, 20));
    saveAll(pets);
    return { success: true, message: pickRandom(config.successTexts), pet };
  }

  pet[config.statKey] = Math.max(0, pet[config.statKey] - randomBetween(0, 10));
  saveAll(pets);
  return { success: false, message: pickRandom(config.failTexts), pet };
}

module.exports = {
  ACTIONS,
  getOrCreatePet,
  setPetName,
  getAgeDays,
  getStage,
  getMoodText,
  performAction,
};
