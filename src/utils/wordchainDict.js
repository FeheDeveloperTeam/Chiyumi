const API_BASE = "https://opendict.korean.go.kr/api/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

const cache = new Map();

function getApiKey() {
  return process.env.WORDCHAIN_DICT_API_KEY || null;
}

async function isRealWord(word) {
  const apiKey = getApiKey();
  if (!apiKey) return true;

  const cached = cache.get(word);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const url = `${API_BASE}?key=${apiKey}&q=${encodeURIComponent(word)}&req_type=json&method=exact`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return false;

    const data = await response.json();
    const total = Number(data?.channel?.total ?? 0);
    const result = total > 0;

    cache.set(word, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function findWordsStartingWith(char, excludeSet) {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const url = `${API_BASE}?key=${apiKey}&q=${encodeURIComponent(char)}&req_type=json&method=start&num=100`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return [];

    const data = await response.json();
    const words = (data?.channel?.item ?? []).map((item) => item.word);
    const valid = words.filter(
      (word) => /^[가-힣]{2,6}$/.test(word) && word[0] === char && !excludeSet.has(word),
    );

    return [...new Set(valid)];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isRealWord, findWordsStartingWith };
