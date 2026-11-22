# Repository Notes

- 봇은 CoredLab 컨테이너(Node 20)에서 돌고 자동 배포가 없다. 수정한 파일은 `.env`의 `SFTP_*`로 직접 올리고(원격 루트 `/` = `/home/container`), 올리기 전에 서버 파일을 `git show HEAD:<path>`와 비교한다. 코드는 재시작해야 반영된다. 재시작·상태·콘솔 로그는 `node scripts/coredlab.js restart|status|logs`(CoredLab Client API, `.env`의 `COREDLAB_API_KEY`·`COREDLAB_SERVER_ID`, 주소 `https://host.coredlabgame.cloud`)로 직접 하고, 재시작 뒤 `logs`로 "봇이 준비되었습니다"와 오류 여부를 확인한다.
- 치유미는 서버 전용이다. 명령어를 등록할 때는 `toGuildOnlyCommandJSON(command.data)`(`src/utils/guildOnly.js`)로 바꿔 보내 `contexts: [0]`·`integration_types: [0]`을 유지하고, 앱의 사용자 설치(User Install)는 다시 켜지 않는다.
- 슬래시 명령어를 추가·변경하면 Discord에 등록해야 한다. 서버의 일부 명령어 파일이 저장소와 다를 수 있으니, `npm run deploy`로 전체를 덮어쓰기보다 바뀐 명령어만 등록·삭제하는 쪽을 먼저 검토한다.
- `data/*.json` 스키마는 fdt-homepage(fehe.dev) 관리 화면이 SFTP로 함께 읽고 쓴다. 키 이름이나 구조를 바꾸지 말고, 새 키는 추가만 한다.
- 비밀 값과 `.env` 내용은 문서·로그·커밋에 남기지 않는다. 한글 파일은 UTF-8로 유지한다.
- **봇 동작을 바꾸면 매번 fehe.dev의 치유미 문서도 함께 최신화한다.** 저장소: `E:/Cording/React/fdt-homepage`의 `src/DiscordBot/Chiyumi/pages/`
  - `HomePage` — 명령어 목록·기능 소개
  - `TermsPage` — 이용약관(기능 조항, 외부 서비스, 이용 제한)
  - `PrivacyPage` — 수집 항목·이용 목적·제3자 제공(외부 API로 보내는 데이터)
  - `ErrorsPage` — 사용자에게 보이는 오류 코드(코드 추가·변경·폐기 시)
  - 고친 문서의 "최종 수정일"을 바꾸고, 사이트에서 `npm run lint`·`npm run build`를 통과시킨 뒤 사이트 저장소도 커밋·푸시한다. 바꿀 곳이 없으면 확인했다는 사실을 보고한다.
- 작업이 끝나면 봇 `README.md`를 실제 동작에 맞추고, 커밋 후 현재 브랜치의 GitHub upstream으로 push한다.
