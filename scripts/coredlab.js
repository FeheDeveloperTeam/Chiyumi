// CoredLab(Pterodactyl 호환 Client API)로 봇 서버 상태를 보거나 전원을 제어한다.
//   node scripts/coredlab.js status            현재 상태·가동 시간
//   node scripts/coredlab.js restart           재시작 후 running이 될 때까지 기다림
//   node scripts/coredlab.js start | stop | kill
//   node scripts/coredlab.js logs [초]       최근 콘솔 로그(+그 뒤 N초, 기본 5초)
// .env의 COREDLAB_API_KEY, COREDLAB_SERVER_ID를 쓰고, COREDLAB_BASE_URL이 없으면 https://host.coredlabgame.cloud
// (panel.coredlabgame.cloud는 SFTP 주소이고 이 API 키를 받지 않는다.)
require("dotenv").config({ path: require("node:path").join(__dirname, "..", ".env") });

const BASE = process.env.COREDLAB_BASE_URL || "https://host.coredlabgame.cloud";
const KEY = process.env.COREDLAB_API_KEY;
const SERVER = process.env.COREDLAB_SERVER_ID;
if (!KEY || !SERVER) {
  console.error("COREDLAB_API_KEY 또는 COREDLAB_SERVER_ID가 .env에 없습니다.");
  process.exit(1);
}

async function api(path, init = {}) {
  const res = await fetch(`${BASE}/api/client/servers/${SERVER}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json", "Content-Type": "application/json", ...init.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function status() {
  const { attributes: a } = await api("/resources");
  const up = Math.round((a.resources?.uptime ?? 0) / 1000);
  return { state: a.current_state, uptimeSec: up, uptime: `${Math.floor(up / 3600)}시간 ${Math.floor((up % 3600) / 60)}분 ${up % 60}초`, memoryMB: Math.round((a.resources?.memory_bytes ?? 0) / 1048576) };
}

async function waitFor(state, timeoutMs = 120_000) {
  const until = Date.now() + timeoutMs;
  let last;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 3000));
    last = await status().catch(() => last);
    if (last?.state === state) return last;
  }
  throw new Error(`${timeoutMs / 1000}초 안에 ${state} 상태가 되지 않았습니다 (마지막: ${last?.state})`);
}

// 콘솔 로그: 패널 웹소켓에 붙어 최근 로그(send logs)와 이후 몇 초간 나오는 줄을 출력한다.
async function logs(seconds = 5) {
  const { data } = await api("/websocket");
  const ws = new WebSocket(data.socket, { headers: { Origin: BASE } });
  const lines = [];
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.close(); resolve(); }, seconds * 1000);
    ws.onopen = () => ws.send(JSON.stringify({ event: "auth", args: [data.token] }));
    ws.onerror = (e) => { clearTimeout(timer); reject(new Error(`웹소켓 오류: ${e.message ?? e.type}`)); };
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.event === "auth success") ws.send(JSON.stringify({ event: "send logs", args: [null] }));
      if (msg.event === "console output") lines.push(...msg.args);
      if (msg.event === "jwt error") { clearTimeout(timer); reject(new Error(msg.args?.join(" "))); }
    };
  });
  // ANSI 색 코드는 빼고 출력한다.
  // npm 진행 표시(스피너 문자 + 커서 이동 코드)도 함께 지운다.
  console.log(lines.join("\n").replace(/[|/\\-]?\x1b\[[0-9;]*[A-Za-z]/g, ""));
}

(async () => {
  const cmd = process.argv[2] ?? "status";
  if (cmd === "status") {
    console.log(await status());
    return;
  }
  if (cmd === "logs") {
    await logs(Number(process.argv[3]) || 5);
    return;
  }
  if (!["restart", "start", "stop", "kill"].includes(cmd)) throw new Error(`모르는 명령: ${cmd}`);
  const before = await status();
  console.log("전:", before);
  await api("/power", { method: "POST", body: JSON.stringify({ signal: cmd }) });
  console.log(`${cmd} 신호를 보냈습니다.`);
  if (cmd === "restart" || cmd === "start") {
    // 신호 직후에는 아직 예전 프로세스가 running으로 보이므로, 가동 시간이 줄어든(새로 뜬) 뒤에 성공으로 본다.
    const until = Date.now() + 180_000;
    for (;;) {
      if (Date.now() > until) throw new Error("180초 안에 다시 켜지지 않았습니다");
      await new Promise((r) => setTimeout(r, 3000));
      const now = await status().catch(() => null);
      if (now) process.stdout.write(`  ${now.state} ${now.uptime}\n`);
      if (now?.state === "running" && now.uptimeSec < (before.state === "running" ? before.uptimeSec : Infinity)) {
        console.log("후:", now);
        break;
      }
    }
  } else console.log("후:", await waitFor("offline"));
})().catch((err) => {
  console.error("실패:", err.message);
  process.exit(1);
});
