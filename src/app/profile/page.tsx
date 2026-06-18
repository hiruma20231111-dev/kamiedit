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
import { ArrowLeft, Eye, EyeOff, KeyRound, ExternalLink, Inbox, FileSpreadsheet, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const user = useStore((s) => s.user);
  const signedIn = useStore((s) => s.signedIn);
  const orderSheetId = useStore((s) => s.db.orderSheetId);
  const ensureOrderSheet = useStore((s) => s.ensureOrderSheet);
  const setOrderSheet = useStore((s) => s.setOrderSheet);
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualId, setManualId] = useState("");
  const [savingId, setSavingId] = useState(false);

  async function applyManualId() {
    const id = manualId.trim();
    if (!id) return;
    setSavingId(true);
    try {
      const ok = await setOrderSheet(id);
      if (ok) {
        toast.success("受注シートIDを設定しました");
        setManualId("");
      } else {
        toast.error("設定に失敗しました");
      }
    } finally {
      setSavingId(false);
    }
  }

  useEffect(() => {
    setKey(getGeminiKey());
    setLoaded(true);
  }, []);

  async function createOrderSheet() {
    setCreating(true);
    try {
      const id = await ensureOrderSheet();
      if (id) toast.success("受注シートを作成しました");
      else toast.error("受注シートの作成に失敗しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "受注シートの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }

  async function copySheetId() {
    if (!orderSheetId) return;
    try {
      await navigator.clipboard.writeText(orderSheetId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("コピーに失敗しました");
    }
  }

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

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          <h2 className="font-semibold">受注インボックス設定</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          営業からの受注を受け取るシートです。<strong>最初に1回だけ</strong>作成し、
          表示されるシートIDを受注フォーム作成スクリプトに貼り付ければ設定完了。
          以降は受注が自動でアプリに届きます（受注の確認・取込は
          <Link href="/orders" className="text-primary hover:underline">受注インボックス</Link>
          から）。
        </p>

        {!signedIn ? (
          <p className="text-sm text-muted-foreground">
            設定には右上から Google ログインしてください。
          </p>
        ) : !orderSheetId ? (
          <Button onClick={() => void createOrderSheet()} disabled={creating}>
            <FileSpreadsheet className="h-4 w-4" />
            {creating ? "作成中…" : "受注シートを作成"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="mb-1 text-sm font-medium">
                シートID（受注フォーム作成スクリプトの APP_SHEET_ID に貼り付け）
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
                  {orderSheetId}
                </code>
                <Button variant="outline" size="sm" onClick={() => void copySheetId()}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "コピー済" : "コピー"}
                </Button>
              </div>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${orderSheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              受注シートを開く
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {signedIn && (
          <div className="mt-4 border-t pt-4">
            <p className="mb-1 text-sm font-medium">シートIDを手動で設定</p>
            <p className="mb-2 text-xs text-muted-foreground">
              別アカウントでログインした等でIDがずれた場合に、
              <strong>元の受注シートIDを貼り直す</strong>ためのものです。
              （IDは作成時に自動で変わったりはしません）
            </p>
            <div className="flex gap-2">
              <Input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="スプレッドシートID"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => void applyManualId()}
                disabled={savingId || !manualId.trim()}
              >
                {savingId ? "設定中…" : "設定"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
