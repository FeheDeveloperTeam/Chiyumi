// 치유미는 서버 안에서만 쓴다. 슬래시 명령어를 디스코드에 등록할 때 이 함수로 바꿔서 보낸다.
//  - contexts [0]          : 서버에서만 보이고 실행된다(DM·그룹 DM에서는 목록에 안 나온다).
//  - integration_types [0] : 서버에 봇을 설치한 경우에만 쓴다(개인 계정 설치로 봇이 없는 서버·DM에서 쓰는 것을 막는다).
//  - dm_permission은 contexts로 대체된 옛 값이라 빼고 보낸다.
// 실행 중에도 interactionCreate가 서버 밖(또는 봇이 없는 서버)에서 온 요청을 한 번 더 막는다(GUILD-001).
const GUILD_CONTEXT = 0; // InteractionContextType.Guild
const GUILD_INSTALL = 0; // ApplicationIntegrationType.GuildInstall

function toGuildOnlyCommandJSON(data) {
  const json = typeof data?.toJSON === "function" ? data.toJSON() : { ...data };
  delete json.dm_permission;
  return { ...json, contexts: [GUILD_CONTEXT], integration_types: [GUILD_INSTALL] };
}

module.exports = { toGuildOnlyCommandJSON, GUILD_CONTEXT, GUILD_INSTALL };
