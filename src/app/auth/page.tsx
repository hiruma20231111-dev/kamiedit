"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function AuthCallback() {
  const router = useRouter();
  const completeLogin = useStore((s) => s.completeLogin);
  const [message, setMessage] = useState("サインイン処理中…");

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const p = new URLSearchParams(hash);
    const accessToken = p.get("access_token");
    const expiresIn = p.get("expires_in");
    const state = p.get("state");
    const error = p.get("error");

    // 隠しiframe（無UI更新）の場合は親へ結果を渡して終了
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: "kamiedit-auth",
          access_token: accessToken,
          expires_in: expiresIn,
          error,
        },
        window.location.origin,
      );
      return;
    }

    // 全ページ遷移ログインの確定
    (async () => {
      if (accessToken) {
        await completeLogin(accessToken, Number(expiresIn) || 3600);
        const back =
          state && state !== "silent" ? decodeURIComponent(state) : "/";
        router.replace(back || "/");
      } else {
        setMessage("サインインに失敗しました。トップへ戻ります…");
        setTimeout(() => router.replace("/?login=failed"), 1500);
      }
    })();
  }, [completeLogin, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
