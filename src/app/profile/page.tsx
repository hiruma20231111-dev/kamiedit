"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getGeminiKey, setGeminiKey } from "@/lib/profile";
import { GEMINI_MODEL } from "@/lib/gemini";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, EyeOff, KeyRound, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const user = useStore((s) => s.user);
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setKey(getGeminiKey());
    setLoaded(true);
  }, []);

  function save() {
    setGeminiKey(key.trim());
    toast.success("保存しました（このブラウザにのみ保存されます）");
  }

  function test() {
    startTransition(async () => {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
            key.trim(),
          )}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "pingに対しpongと一語で返答" }] }],
            }),
          },
        );
        if (res.ok) toast.success("接続OK！APIキーは有効です");
        else if (res.status === 400) toast.error("APIキーが無効です");
        else toast.error(`接続失敗 (${res.status})`);
      } catch {
        toast.error("接続テストに失敗しました");
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        トップへ戻る
      </Link>

      <h1 className="mb-1 text-2xl font-bold">プロフィール</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {user ? user.email : "未ログイン"}
      </p>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          <h2 className="font-semibold">Gemini API キー</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          AIアシスト（原稿自動生成）に使用します。キーは
          <strong>このブラウザ（localStorage）にのみ保存</strong>
          され、サーバーには送信されません。
        </p>

        <Label htmlFor="key">API キー</Label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Input
              id="key"
              type={show ? "text" : "password"}
              value={loaded ? key : ""}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza..."
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={show ? "隠す" : "表示"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={save}>保存</Button>
          <Button variant="outline" onClick={test} disabled={pending || !key.trim()}>
            {pending ? "確認中..." : "接続テスト"}
          </Button>
        </div>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Google AI Studio で APIキーを取得
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Card>
    </div>
  );
}
