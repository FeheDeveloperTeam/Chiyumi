const RESET = "\x1b[0m";

// prefix → ANSI color. 지진지도 must come before 지진 (longer match first)
const PREFIX_COLORS = [
  ["지진지도", "\x1b[95m"],  // Bright Magenta
  ["Supabase", "\x1b[34m"],  // Blue
  ["Sheets",   "\x1b[32m"],  // Green
  ["레이더",   "\x1b[33m"],  // Yellow
  ["날씨",     "\x1b[36m"],  // Cyan
  ["지진",     "\x1b[35m"],  // Magenta
  ["태풍",     "\x1b[91m"],  // Bright Red
  ["WARN",     "\x1b[93m"],  // Bright Yellow
  ["상호작용", "\x1b[31m"],  // Red
];

function colorizePrefix(str) {
  return str.replace(/\[([^\]]+)\]/g, (match, label) => {
    for (const [key, color] of PREFIX_COLORS) {
      if (label.includes(key)) return `${color}[${label}]${RESET}`;
    }
    return match;
  });
}

function patchArgs(args) {
  if (typeof args[0] === "string") {
    return [colorizePrefix(args[0]), ...args.slice(1)];
  }
  return args;
}

const _log   = console.log.bind(console);
const _error = console.error.bind(console);
const _warn  = console.warn.bind(console);

console.log   = (...args) => _log(...patchArgs(args));
console.error = (...args) => _error(...patchArgs(args));
console.warn  = (...args) => _warn(...patchArgs(args));
