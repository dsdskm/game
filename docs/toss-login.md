# 앱인토스 로그인

`apps/web`은 토스 앱 안에서 SDK의 `appLogin()`으로 일회성 인가 코드를 받습니다. `apps/server`는 mTLS로 토큰을 교환하고 사용자 식별키만 조회하여 24시간 유효한 HttpOnly 세션 쿠키를 발급합니다. 토큰과 사용자 정보는 브라우저에 반환하지 않습니다. 로그인 후 생성한 게임은 해당 계정의 세션에서만 접근할 수 있습니다. 일반 브라우저에서는 토스 앱 인증을 완료할 수 없으며 기존 게스트 게임은 그대로 사용할 수 있습니다.

1. 앱인토스 콘솔에서 토스 로그인 약관 및 앱 설정을 완료합니다. 미니앱 배포에는 콘솔에 등록된 앱 이름으로 공식 SDK의 앱 설정도 필요합니다.
2. 발급된 mTLS 인증서/개인키를 접근이 제한된 경로에 보관합니다. `cert/`의 파일과 압축 파일은 Git에서 제외되며 빌드나 배포에도 자동으로 포함되지 않습니다.
3. `apps/server/.env.example`을 참고해 `apps/server/.env` 또는 `apps/server/.env.local`에 `TOSS_MTLS_CERT_PATH`, `TOSS_MTLS_KEY_PATH`, `WEB_ORIGIN`을 설정합니다. `pnpm`으로 실행할 때 상대경로의 기준은 서버 작업 디렉터리인 `apps/server`이므로 개발 환경의 `../../cert/`가 루트 인증서 폴더를 가리킵니다. 배포 시에는 인증서를 안전하게 마운트하고 배포된 서버 작업 디렉터리에서 해당 상대경로가 존재하도록 구성하세요. 배포 구조가 다르면 상대경로를 맞춰 변경해야 하며, HTTPS 웹 주소와 Secret Manager를 사용하세요.
4. `pnpm dev`로 서버(3000), 웹(3001), 관리자(3002)를 실행하고 토스 샌드박스 앱 안에서 로그인을 시험합니다. 로컬 서버가 토스 API에 연결 가능한 네트워크에 있어야 합니다.

API: `POST /api/auth/toss`는 `{ authorizationCode, referrer }`를 받고 성공 시 세션 쿠키를 설정합니다. `GET /api/auth/session`은 `{ authenticated }`만 반환하며 `DELETE /api/auth/session`은 로컬 로그아웃을 수행합니다. 로그인·로그아웃 요청은 `WEB_ORIGIN`과 일치하는 Origin만 허용합니다. 현재 세션은 서버 메모리에 저장되며 서버 재시작 시 사라집니다. 운영 배포에서는 공유 세션 저장소와 토스 연결 해제 콜백 처리가 추가로 필요합니다.

공식 문서: https://developers-apps-in-toss.toss.im/documentation/common/authentication/toss-login