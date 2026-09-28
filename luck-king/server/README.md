# LuckKing API

PostgreSQL이 게임 설정, 사용자 포인트, 일일 충전 상태, 연승, 플레이 기록을 관리합니다.

## 로컬 실행

```bash
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

기본 API 주소는 `http://localhost:4000`입니다. 사용자 앱과 관리자 앱의 Vite 개발 서버는 `/api`를 이 주소로 프록시합니다.

## 사용자 API

- `GET /api/bootstrap`: 사용자, 활성 게임, 충전 설정, 랭킹
- `POST /api/games/:gameId/play`: `{ "choice": "..." }`
- `GET /api/rankings`

사용자는 접속 시 설정된 기준 시각 이후 첫 요청에서 일일 포인트를 한 번 충전받습니다. 게임 참가비 차감, 보상 지급, 연승 갱신, 기록 저장은 PostgreSQL 트랜잭션으로 처리됩니다.

## 관리자 API

모든 관리자 요청에는 `x-admin-key` 헤더가 필요합니다.

- `GET /api/admin/dashboard`
- `GET/PATCH /api/admin/games/:gameId`
- `PATCH /api/admin/settings`
- `GET /api/admin/players`
- `PATCH /api/admin/players/:userId/points`
- `GET /api/admin/plays`

운영 환경에서는 `DATABASE_URL`, `ADMIN_API_KEY`, `CORS_ORIGINS`, `DEFAULT_USER_ID`를 별도로 설정하세요. 실제 출시 전에는 `DEFAULT_USER_ID` 대신 Apps in Toss 인증 결과에서 사용자 ID를 주입해야 합니다.