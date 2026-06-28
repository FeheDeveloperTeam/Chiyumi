const API_BASE = "https://opendict.korean.go.kr/api/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2;

const cache = new Map();

function getApiKey() {
  return process.env.WORDCHAIN_DICT_API_KEY || null;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithRetry(url) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const data = await fetchJson(url);
    if (data) return data;
  }
  return null;
}

async function isRealWord(word) {
  const { WORD_LIST } = require("./wordchainWords");
  if (WORD_LIST.includes(word)) return true;

  const apiKey = getApiKey();
  if (!apiKey) return true;

  const cached = cache.get(word);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const url = `${API_BASE}?key=${apiKey}&q=${encodeURIComponent(word)}&req_type=json&method=exact`;
  const data = await fetchJsonWithRetry(url);
  if (!data) return false;

  const total = Number(data?.channel?.total ?? 0);
  const result = total > 0;

  cache.set(word, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

async function findWordsStartingWith(char, excludeSet) {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const url = `${API_BASE}?key=${apiKey}&q=${encodeURIComponent(char)}&req_type=json&method=start&num=100`;
  const data = await fetchJsonWithRetry(url);
  if (!data) return [];

  const words = (data?.channel?.item ?? []).map((item) => item.word);
  const valid = words.filter(
    (word) => /^[가-힣]{2,6}$/.test(word) && word[0] === char && !excludeSet.has(word),
  );

  return [...new Set(valid)];
}

module.exports = { isRealWord, findWordsStartingWith };
