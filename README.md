# Chiyumi Discord Bot

Node.js와 discord.js로 만든 디스코드 봇 기본 구조입니다.

## 시작하기

1. 패키지 설치

```bash
npm install
```

2. `.env` 파일에 값을 채웁니다.

```env
DISCORD_TOKEN=봇_토큰
DISCORD_CLIENT_ID=애플리케이션_CLIENT_ID
DISCORD_GUILD_ID=테스트_서버_ID
```

3. 슬래시 명령어 등록

```bash
npm run deploy
```

4. 봇 실행

```bash
npm start
```

개발 중 자동 재시작은 아래 명령어를 사용할 수 있습니다.

```bash
npm run dev
```

## 구조

```text
src/
  commands/          슬래시 명령어 파일
  events/            디스코드 이벤트 핸들러
  utils/             공용 유틸
  deploy-commands.js 명령어 등록 스크립트
  index.js           봇 진입점
```

## 명령어

### `/인증`

관리자가 현재 채널에 인증 버튼을 생성합니다.

```text
/인증 역할:@인증역할 메시지:아래 버튼을 눌러 인증하세요.
```

- `역할`: 사용자가 인증 버튼을 눌렀을 때 지급할 역할입니다.
- `메시지`: 인증 버튼 위에 표시할 문구입니다. 생략할 수 있습니다.

봇에는 `역할 관리` 권한이 필요하고, 봇의 역할이 지급하려는 역할보다 위에 있어야 합니다.
