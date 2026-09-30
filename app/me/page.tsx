"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import RequireAuth from "@/components/RequireAuth";
import { Button, Input, Window } from "@/components/ds";
import { fullDate, signOut, updateUser, useStore } from "@/lib/store";

const MAX_NICK = 20;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 1d · 마이 페이지 (F-04 로그아웃, F-05 별명, F-06 프로필 이미지)
export default function MyPage() {
  return (
    <RequireAuth>
      <MyPageInner />
    </RequireAuth>
  );
}

function MyPageInner() {
  const { user, pages } = useStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState(user!.nickname);
  const [imageError, setImageError] = useState("");
  const [saved, setSaved] = useState(false);

  const trimmed = nickname.trim();
  const nickValid = trimmed.length >= 1 && trimmed.length <= MAX_NICK;
  const nickChanged = trimmed !== user!.nickname;

  const saveNickname = () => {
    if (!nickValid || !nickChanged) return;
    updateUser({ nickname: trimmed });
    setNickname(trimmed);
    setSaved(true);
  };

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setImageError("JPG · PNG · WEBP 파일만 올릴 수 있습니다.");
    if (file.size > MAX_IMAGE_BYTES) return setImageError("2MB 이하 이미지만 올릴 수 있습니다.");
    setImageError("");
    const reader = new FileReader();
    reader.onload = () => updateUser({ avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="me">
      <header className="me-bar">
        <Button variant="chip" href="/pages">
          ← 업무 페이지
        </Button>
        <Button
          variant="chip"
          onClick={() => {
            signOut();
            router.replace("/login");
          }}
        >
          로그아웃
        </Button>
      </header>

      <main className="me-main">
        <div className="me-copy">
          <div className="leader">
            <span>계정</span>
            <span className="leader-line" />
            <span>{user!.email}</span>
          </div>
          <h1 className="me-h1">
            마이
            <br />
            페이지
          </h1>
          <div className="me-stats">
            <div className="me-stat">
              <b>가입일</b>
              <span>{fullDate(user!.createdAt)}</span>
            </div>
            <div className="me-stat">
              <b>내 글</b>
              <span>{pages.length}개</span>
            </div>
          </div>
        </div>

        <Window title="프로필.app" padding={28}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
              <div style={{ position: "relative" }}>
                <Avatar src={user!.avatarUrl} size={120} />
                {!user!.avatarUrl && (
                  <span
                    style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 600,
                    }}
                  >
                    <span style={{ background: "var(--white)", padding: "2px 4px" }}>프로필 이미지</span>
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Button variant="window" onClick={() => fileRef.current?.click()}>
                  이미지 변경
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept={IMAGE_TYPES.join(",")}
                  hidden
                  onChange={(e) => {
                    onPickImage(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {imageError ? <span className="me-err">{imageError}</span> : <span className="hint">JPG · PNG · WEBP, 최대 2MB</span>}
              </div>
            </div>

            <div style={{ borderTop: "1px dashed var(--ink-900)" }} />

            <form
              style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
              onSubmit={(e) => {
                e.preventDefault();
                saveNickname();
              }}
            >
              <Input
                label="별명"
                value={nickname}
                maxLength={MAX_NICK}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setSaved(false);
                }}
              />
              <Button type="submit" variant="solid" style={{ height: 30 }} disabled={!nickValid || !nickChanged}>
                저장
              </Button>
            </form>
            <div className="hint num" style={{ display: "flex", justifyContent: "space-between", marginTop: -16 }}>
              {trimmed.length === 0 ? (
                <span className="me-err">빈 값은 저장할 수 없습니다.</span>
              ) : saved ? (
                <span>저장되었습니다.</span>
              ) : (
                <span>1~20자, 빈 값은 저장할 수 없습니다.</span>
              )}
              <span>
                {nickname.length} / {MAX_NICK}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>이메일</span>
              <span style={{ fontSize: 15, color: "var(--fg-2)" }}>{user!.email} · 이메일 로그인</span>
            </div>
          </div>
        </Window>
      </main>
    </div>
  );
}
