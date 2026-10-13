# assignment-mini-notion

미니 노션 — 하이파이 목업을 Next.js + Supabase로 구현한 개인 업무 관리 MVP.

## 기능
- 구글 로그인 · 로그인 유지 · 로그아웃
- `/page` 명령어로 새 글 만들기, 최근 수정순 목록
- 사이드바 글 검색 (제목·본문, Esc로 초기화)
- 글 제목/내용 자동 저장(1초), 삭제 확인 — Supabase `page` 테이블, 본인 글만 (RLS)
- 본문 글자 수 표시 (공백 포함 · 공백 제외)
- 글 상단 커버 이미지
- 마이 페이지: 별명 변경, 프로필 이미지 변경

## 실행
1. Supabase SQL Editor에서 `supabase/schema.sql` 실행, Authentication에서 Google 로그인 켜기
2. `.env.example`을 참고해 `.env.local`에 값 입력
3. `npm install && npm run dev` → http://localhost:3000

## 테스트
`npm test` (Vitest + Testing Library)

## 문서
- `02-prd.md` 요구사항 · `DESIGN.md` 디자인 가이드 · `specs/` 기능 명세

## 기술
Next.js 16 · React 19 · TypeScript · Supabase (Auth, Postgres + RLS, Storage) · Vitest
