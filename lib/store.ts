"use client";

// Supabase-backed store (PRD §7.3). State lives in memory for instant UI;
// every mutation is applied optimistically and then written to Supabase.
// Pages only use the exported API, so they didn't need to change.
import type { Session } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export type User = {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  createdAt: number;
};

export type Page = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

type State = { ready: boolean; user: User | null; pages: Page[] };

const SERVER_STATE: State = { ready: false, user: null, pages: [] };

let state: State = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

const ms = (iso: string) => new Date(iso).getTime();
const iso = (ts: number) => new Date(ts).toISOString();
const report = ({ error }: { error: unknown }) => error && console.error("[supabase]", error);

type PageRow = { id: string; title: string; content: string; created_at: string; updated_at: string };
const toPage = (r: PageRow): Page => ({
  id: r.id,
  title: r.title,
  content: r.content,
  createdAt: ms(r.created_at),
  updatedAt: ms(r.updated_at),
});

function seedPages(now: number) {
  const min = 60_000;
  const day = 86_400_000;
  return [
    {
      title: "회의 메모",
      content:
        "9월 넷째 주 주간 회의\n\n- 구글 로그인 연결 완료, 배포 환경 확인\n- 자동 저장 간격은 1초로 유지\n- 다음 주: 마이 페이지 별명 변경부터 시작\n\n질문: 휴지통 기능이 정말 필요 없는지 2주 써 보고 결정",
      ago: 5 * min,
    },
    { title: "할 일 목록", content: "- PRD 검토\n- 디자인 목업 확인\n- Next.js 프로젝트 만들기", ago: 3 * 60 * min },
    { title: "아이디어", content: "/todo 명령어, 글 검색, 다크 모드", ago: day },
    { title: "읽을거리", content: "", ago: 4 * day },
  ].map(({ ago, ...p }) => ({ ...p, created_at: iso(now - ago), updated_at: iso(now - ago) }));
}

// Load (or on first login, create) the profile and the user's pages.
async function hydrate(session: Session | null) {
  if (!session) return set({ ready: true, user: null, pages: [] });
  const db = supabase();
  const authUser = session.user;

  let { data: profile } = await db.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
  if (!profile) {
    // F-01: first login creates the account plus the sample pages from the mockups.
    const meta = authUser.user_metadata ?? {};
    const res = await db
      .from("profiles")
      .insert({
        id: authUser.id,
        email: authUser.email ?? "",
        nickname: String(meta.full_name || meta.name || authUser.email?.split("@")[0] || "사용자").slice(0, 20),
        avatar_url: meta.avatar_url ?? null,
      })
      .select()
      .single();
    report(res);
    profile = res.data;
    report(await db.from("pages").insert(seedPages(Date.now())));
  }

  const { data: rows, error } = await db.from("pages").select("*").order("updated_at", { ascending: false });
  report({ error });

  set({
    ready: true,
    user: profile && {
      id: profile.id,
      email: profile.email,
      nickname: profile.nickname,
      avatarUrl: profile.avatar_url,
      createdAt: ms(profile.created_at),
    },
    pages: (rows ?? []).map(toPage),
  });
}

function start() {
  if (started) return;
  started = true;
  // Fires INITIAL_SESSION on load, then SIGNED_IN / SIGNED_OUT. Only refetch when
  // the signed-in user actually changes (token refreshes shouldn't clobber edits).
  supabase().auth.onAuthStateChange((_event, session) => {
    const nextId = session?.user.id ?? null;
    if (state.ready && nextId === (state.user?.id ?? null)) return;
    // Defer: calling Supabase inside this callback can deadlock the auth lock.
    setTimeout(() => void hydrate(session), 0);
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

// F-01: email magic link. The link in the mail signs in and lands on /pages.
export async function signIn(email: string) {
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/pages` },
  });
  return error?.message ?? null;
}

// F-04
export function signOut() {
  set({ user: null, pages: [] });
  void supabase().auth.signOut();
}

// F-05 / F-06
export function updateUser(patch: Partial<Pick<User, "nickname" | "avatarUrl">>) {
  const user = state.user;
  if (!user) return;
  set({ user: { ...user, ...patch } });
  const row: Record<string, unknown> = {};
  if (patch.nickname !== undefined) row.nickname = patch.nickname;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  void supabase().from("profiles").update(row).eq("id", user.id).then(report);
}

// F-07: id is generated client-side so the caller can navigate immediately.
export function createPage(): Page {
  const now = Date.now();
  const page: Page = { id: crypto.randomUUID(), title: "", content: "", createdAt: now, updatedAt: now };
  set({ pages: [page, ...state.pages] });
  void supabase()
    .from("pages")
    .insert({ id: page.id, title: "", content: "", created_at: iso(now), updated_at: iso(now) })
    .then(report);
  return page;
}

// F-10
export function updatePage(id: string, patch: Partial<Pick<Page, "title" | "content">>) {
  const now = Date.now();
  set({ pages: state.pages.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now } : p)) });
  void supabase().from("pages").update({ ...patch, updated_at: iso(now) }).eq("id", id).then(report);
}

// F-11
export function deletePage(id: string) {
  set({ pages: state.pages.filter((p) => p.id !== id) });
  void supabase().from("pages").delete().eq("id", id).then(report);
}

// F-08: most recently edited first.
export function sortPages(pages: Page[]) {
  return [...pages].sort((a, b) => b.updatedAt - a.updatedAt);
}

export const displayTitle = (p: Page) => p.title.trim() || "제목 없음";

const pad = (n: number) => String(n).padStart(2, "0");

/** List timestamp: 방금 · HH:MM (today) · 어제 · MM.DD */
export function shortTime(ts: number, now = Date.now()) {
  const d = new Date(ts);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (now - ts < 60_000) return "방금";
  if (ts >= today.getTime()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (ts >= today.getTime() - 86_400_000) return "어제";
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** Header timestamp: 오늘 14:32 · 09.24 14:32 */
export function savedTime(ts: number) {
  const d = new Date(ts);
  const isToday = new Date().toDateString() === d.toDateString();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return isToday ? `오늘 ${hm}` : `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${hm}`;
}

export function fullDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
