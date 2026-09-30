# assignment-mini-notion

미니 노션 — 하이파이 목업을 Next.js + Supabase로 구현한 개인 업무 관리 MVP.

## 기능
- 이메일 매직링크 로그인 · 로그인 유지 · 로그아웃
- `/page` 명령어로 새 글 만들기, 최근 수정순 목록
- 글 제목/내용 자동 저장(1초), 삭제 확인
- 마이 페이지: 별명 변경, 프로필 이미지 변경

## 실행
1. Supabase SQL Editor에서 `supabase/schema.sql` 실행
2. `.env.local.example`을 `.env.local`로 복사하고 값 입력
3. `npm install && npm run dev` → http://localhost:3000

## 기술
Next.js 16 · React 19 · TypeScript · Supabase (Auth, Postgres + RLS)
