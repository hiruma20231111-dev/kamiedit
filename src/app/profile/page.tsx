"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getGeminiKey, setGeminiKey } from "@/lib/profile";
import { GEMINI_MODEL } from "@/lib/gemini";
import { useStore } from "@/lib/store";
import { MEDIA, ORDER_MEDIA, type MediaId } from "@/lib/config/media";
import { emptySalesConfig, type PlanMaster, type CostEntry } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, EyeOff, KeyRound, ExternalLink, Inbox, FileSpreadsheet, Copy, Check, BarChart3, Coins, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export default function ProfilePage() {
  const user = useStore((s) => s.user);
  const signedIn = useStore((s) => s.signedIn);
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

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          <h2 className="font-semibold">受注インボックス設定</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          媒体ごとに、営業からの受注を受け取るシートを<strong>最初に1回だけ</strong>作成します。
          表示されるシートIDを各媒体の受注フォーム作成スクリプトに貼り付ければ設定完了。
          受注の確認・取込は
          <Link href="/orders" className="text-primary hover:underline">受注インボックス</Link>
          から。
        </p>

        {!signedIn ? (
          <p className="text-sm text-muted-foreground">
            設定には右上から Google ログインしてください。
          </p>
        ) : (
          <div className="space-y-4">
            {ORDER_MEDIA.map((m) => (
              <OrderSheetSetup key={m.id} mediaId={m.id} />
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="font-semibold">売上ダッシュボード設定</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          <Link href="/dashboard" className="text-primary hover:underline">売上ダッシュボード</Link>
          の<strong>原価・粗利・企画別目標</strong>に使う設定です。
          号ごとの売上目標はダッシュボード側で版ごとに入力できます。
        </p>
        {!signedIn ? (
          <p className="text-sm text-muted-foreground">
            設定には右上から Google ログインしてください。
          </p>
        ) : (
          <SalesSettings />
        )}
      </Card>
    </div>
  );
}

/** ページ単価（原価）と企画マスタの設定 */
function SalesSettings() {
  const config = useStore((s) => s.db.salesConfig) ?? emptySalesConfig();
  const setSalesConfig = useStore((s) => s.setSalesConfig);

  // ページ単価はローカル草稿を持ち、保存ボタンでまとめて反映（既存値で初期化）
  const [unitDraft, setUnitDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const m of ORDER_MEDIA) {
      const v = config.pageUnitPrice?.[m.id];
      init[m.id] = v != null ? String(v) : "";
    }
    return init;
  });
  const [savingUnit, setSavingUnit] = useState(false);

  // 目標ページ単価（売上目標の自動算出用）の草稿
  const [targetDraft, setTargetDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const m of ORDER_MEDIA) {
      const v = config.targetPageUnitPrice?.[m.id];
      init[m.id] = v != null ? String(v) : "";
    }
    return init;
  });
  const [savingTarget, setSavingTarget] = useState(false);

  async function saveUnitPrices() {
    const next: Partial<Record<MediaId, number>> = {};
    for (const m of ORDER_MEDIA) {
      const n = Number((unitDraft[m.id] ?? "").replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n) && n > 0) next[m.id] = n;
    }
    setSavingUnit(true);
    try {
      const ok = await setSalesConfig({ pageUnitPrice: next });
      if (ok) toast.success("ページ単価を保存しました");
      else toast.error("保存に失敗しました");
    } finally {
      setSavingUnit(false);
    }
  }

  async function saveTargetPrices() {
    const next: Partial<Record<MediaId, number>> = {};
    for (const m of ORDER_MEDIA) {
      const n = Number((targetDraft[m.id] ?? "").replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n) && n > 0) next[m.id] = n;
    }
    setSavingTarget(true);
    try {
      const ok = await setSalesConfig({ targetPageUnitPrice: next });
      if (ok) toast.success("目標ページ単価を保存しました");
      else toast.error("保存に失敗しました");
    } finally {
      setSavingTarget(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ページ単価（原価） */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Coins className="h-4 w-4" />
          ページ単価（原価）
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          1ページあたりの発行原価。<strong>原価 = ページ単価 × 台割ページ数</strong>、
          <strong>粗利 = 売上実績 − 原価</strong> で各号に自動反映されます。
        </p>
        <div className="space-y-2">
          {ORDER_MEDIA.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-sm">{m.name}</span>
              <div className="relative flex-1">
                <Input
                  value={unitDraft[m.id] ?? ""}
                  onChange={(e) =>
                    setUnitDraft((d) => ({ ...d, [m.id]: e.target.value }))
                  }
                  placeholder="例: 80000"
                  inputMode="numeric"
                  className="pr-16"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  円/ページ
                </span>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-3" onClick={() => void saveUnitPrices()} disabled={savingUnit}>
          {savingUnit ? "保存中…" : "ページ単価を保存"}
        </Button>
      </div>

      {/* 目標ページ単価（売上目標の自動算出） */}
      <div className="border-t pt-5">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Coins className="h-4 w-4" />
          目標ページ単価（売上目標）
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          1ページあたりの売上目標。<strong>売上目標 = 目標ページ単価 × 台割ページ数</strong>
          で各号に自動反映されます（ダッシュボードで号ごとに手入力した目標があれば、そちらが優先されます）。
        </p>
        <div className="space-y-2">
          {ORDER_MEDIA.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-sm">{m.name}</span>
              <div className="relative flex-1">
                <Input
                  value={targetDraft[m.id] ?? ""}
                  onChange={(e) =>
                    setTargetDraft((d) => ({ ...d, [m.id]: e.target.value }))
                  }
                  placeholder="例: 120000"
                  inputMode="numeric"
                  className="pr-16"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  円/ページ
                </span>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-3" onClick={() => void saveTargetPrices()} disabled={savingTarget}>
          {savingTarget ? "保存中…" : "目標ページ単価を保存"}
        </Button>
      </div>

      {/* 発行原価表（エリア版×ページ数） */}
      <div className="border-t pt-5">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Coins className="h-4 w-4" />
          発行原価表（エリア版×ページ数・税込概算）
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          ページ数によって原価は段階的に変わります。エリア版ごとに発行原価を入力すると、
          <strong>発行原価・粗利・原価回収率</strong>と<strong>1ページ按分額（＝発行原価÷ページ数）</strong>が各号に反映されます。
          空欄の組み合わせは上の「ページ単価×ページ数」で概算します。
        </p>
        <div className="space-y-5">
          {ORDER_MEDIA.map((m) => (
            <CostTableEditor key={m.id} mediaId={m.id} />
          ))}
        </div>
      </div>

      {/* 企画／特集マスタ */}
      <div className="border-t pt-5">
        <div className="mb-2 text-sm font-semibold">企画／特集マスタ</div>
        <p className="mb-3 text-xs text-muted-foreground">
          企画別の目標売上を登録すると、ダッシュボードの企画別に達成率が出ます（目標は任意）。
        </p>
        <div className="space-y-4">
          {ORDER_MEDIA.map((m) => (
            <PlanMasterEditor key={m.id} mediaId={m.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 発行原価表の標準ページ数（列） */
const COST_TIERS = [16, 24, 32, 40, 48];

/** 1媒体ぶんの発行原価表（エリア版×ページ数）の編集 */
function CostTableEditor({ mediaId }: { mediaId: MediaId }) {
  const media = MEDIA[mediaId];
  const areas = media.areas ?? [];
  const allEntries = useStore((s) => s.db.salesConfig?.costEntries ?? []);
  const setSalesConfig = useStore((s) => s.setSalesConfig);
  const cellKey = (areaId: string, tier: number) => `${areaId}__${tier}`;
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const a of areas) {
      for (const t of COST_TIERS) {
        const v = allEntries.find(
          (c) => c.mediaId === mediaId && c.areaId === a.id && c.pageCount === t,
        )?.cost;
        init[cellKey(a.id, t)] = v != null ? String(v) : "";
      }
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    const mine: CostEntry[] = [];
    for (const a of areas) {
      for (const t of COST_TIERS) {
        const n = Number((draft[cellKey(a.id, t)] ?? "").replace(/[^\d.-]/g, ""));
        if (Number.isFinite(n) && n > 0) {
          mine.push({ mediaId, areaId: a.id, pageCount: t, cost: n });
        }
      }
    }
    const others = allEntries.filter((c) => c.mediaId !== mediaId);
    setSaving(true);
    try {
      const ok = await setSalesConfig({ costEntries: [...others, ...mine] });
      if (ok) toast.success(`${media.name}の発行原価を保存しました`);
      else toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (areas.length === 0) return null;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-sm font-semibold">{media.name}</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1 text-left font-medium text-muted-foreground">
                エリア版
              </th>
              {COST_TIERS.map((t) => (
                <th
                  key={t}
                  className="p-1 text-right font-medium text-muted-foreground"
                >
                  {t}P
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap p-1 pr-2 align-middle">
                  {a.name}
                </td>
                {COST_TIERS.map((t) => (
                  <td key={t} className="p-0.5">
                    <Input
                      value={draft[cellKey(a.id, t)] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [cellKey(a.id, t)]: e.target.value,
                        }))
                      }
                      placeholder="—"
                      inputMode="numeric"
                      className="h-7 w-24 text-right text-xs"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-2" size="sm" onClick={() => void save()} disabled={saving}>
        {saving ? "保存中…" : `${media.name}の原価を保存`}
      </Button>
    </div>
  );
}

/** 1媒体ぶんの企画マスタ編集（追加・目標編集・削除） */
function PlanMasterEditor({ mediaId }: { mediaId: MediaId }) {
  const plans = useStore((s) => s.db.salesConfig?.plans ?? []);
  const setSalesConfig = useStore((s) => s.setSalesConfig);
  const mine = plans.filter((p) => p.mediaId === mediaId);

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  async function add() {
    const nm = name.trim();
    if (!nm) return;
    if (mine.some((p) => p.name === nm)) {
      toast.error("同じ企画名が既にあります");
      return;
    }
    const t = Number(target.replace(/[^\d.-]/g, ""));
    const plan: PlanMaster = {
      id: uid(),
      mediaId,
      name: nm,
      targetAmount: Number.isFinite(t) && t > 0 ? t : null,
    };
    const ok = await setSalesConfig({ plans: [...plans, plan] });
    if (ok) {
      setName("");
      setTarget("");
    } else {
      toast.error("追加に失敗しました");
    }
  }

  async function updateTarget(id: string, value: string) {
    const t = Number(value.replace(/[^\d.-]/g, ""));
    const amount = Number.isFinite(t) && t > 0 ? t : null;
    await setSalesConfig({
      plans: plans.map((p) => (p.id === id ? { ...p, targetAmount: amount } : p)),
    });
  }

  async function remove(id: string) {
    await setSalesConfig({ plans: plans.filter((p) => p.id !== id) });
  }

  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-sm font-semibold">{MEDIA[mediaId].name}</p>
      {mine.length > 0 ? (
        <div className="mb-2 space-y-1.5">
          {mine.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="flex-1 truncate text-sm">{p.name}</span>
              <div className="relative w-32">
                <Input
                  defaultValue={p.targetAmount != null ? String(p.targetAmount) : ""}
                  onBlur={(e) => void updateTarget(p.id, e.target.value)}
                  placeholder="目標(任意)"
                  inputMode="numeric"
                  className="h-8 pr-7 text-sm"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  円
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => void remove(p.id)}
                aria-label="削除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-2 text-xs text-muted-foreground">企画が未登録です。</p>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder="企画名（例: スクール特集）"
          className="h-8 flex-1 text-sm"
        />
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder="目標(任意)"
          inputMode="numeric"
          className="h-8 w-28 text-sm"
        />
        <Button size="sm" className="h-8" onClick={() => void add()} disabled={!name.trim()}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </div>
    </div>
  );
}

/** 媒体1つぶんの受注シート設定（作成・IDコピー・手動設定） */
function OrderSheetSetup({ mediaId }: { mediaId: MediaId }) {
  const sheetId = useStore((s) => s.db.orderSheets?.[mediaId]);
  const ensureOrderSheet = useStore((s) => s.ensureOrderSheet);
  const setOrderSheet = useStore((s) => s.setOrderSheet);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualId, setManualId] = useState("");
  const [savingId, setSavingId] = useState(false);

  async function create() {
    setCreating(true);
    try {
      const id = await ensureOrderSheet(mediaId);
      if (id) toast.success(`${MEDIA[mediaId].name}の受注シートを作成しました`);
      else toast.error("受注シートの作成に失敗しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "受注シートの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }

  async function copyId() {
    if (!sheetId) return;
    try {
      await navigator.clipboard.writeText(sheetId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("コピーに失敗しました");
    }
  }

  async function applyManualId() {
    const id = manualId.trim();
    if (!id) return;
    setSavingId(true);
    try {
      const ok = await setOrderSheet(mediaId, id);
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

  return (
    <div className="rounded-lg border p-4">
      <p className="mb-2 font-semibold">{MEDIA[mediaId].name}</p>

      {!sheetId ? (
        <Button onClick={() => void create()} disabled={creating}>
          <FileSpreadsheet className="h-4 w-4" />
          {creating ? "作成中…" : "受注シートを作成"}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            シートID（受注フォーム作成スクリプトの APP_SHEET_ID に貼り付け）
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
              {sheetId}
            </code>
            <Button variant="outline" size="sm" onClick={() => void copyId()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "コピー済" : "コピー"}
            </Button>
          </div>
          <a
            href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            受注シートを開く
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      <div className="mt-3 border-t pt-3">
        <p className="mb-1 text-xs text-muted-foreground">
          別アカウントでログインした等でIDがずれた場合、元のシートIDを貼り直せます。
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
    </div>
  );
}
