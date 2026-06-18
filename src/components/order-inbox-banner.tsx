"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { orderKey } from "@/lib/orders";
import { Inbox, ArrowRight } from "lucide-react";

/**
 * トップページの「受注インボックス」横長CTAバナー。
 * 使用頻度が高いので大きく・ホバー演出付きで目立たせる。
 * サインイン済みかつ受注シート設定済みなら未取込件数を表示する。
 */
export function OrderInboxBanner() {
  const signedIn = useStore((s) => s.signedIn);
  const orderSheetId = useStore((s) => s.db.orderSheetId);
  const orderTakes = useStore((s) => s.db.orderTakes ?? []);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (!signedIn || !orderSheetId) {
      setPending(null);
      return;
    }
    void (async () => {
      const rows = await fetchOrders();
      if (!active || !rows) return;
      let n = 0;
      for (const o of rows) {
        for (const areaId of o.areaIds) {
          const taken =
            o.taken ||
            orderTakes.some((t) => t.key === orderKey(o) && t.areaId === areaId);
          if (!taken) n++;
        }
      }
      setPending(n);
    })();
    return () => {
      active = false;
    };
  }, [signedIn, orderSheetId, fetchOrders, orderTakes]);

  return (
    <Link
      href="/orders"
      className="group relative mb-10 block overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-primary via-violet-600 to-indigo-600 p-6 text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 sm:p-7"
    >
      {/* 装飾の光のにじみ */}
      <div className="pointer-events-none absolute -top-10 -right-8 h-48 w-48 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
      <div className="pointer-events-none absolute bottom-0 right-28 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      {/* ホバーで横切るシャイン */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

      <div className="relative flex items-center gap-4 sm:gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 sm:h-16 sm:w-16">
          <Inbox className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              受注インボックス
            </h2>
            {pending != null && pending > 0 && (
              <span className="animate-pulse rounded-full bg-white/25 px-2.5 py-0.5 text-sm font-semibold backdrop-blur">
                未取込 {pending}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/85 sm:text-base">
            営業から届いた受注を、担当の版ごとに確認して割付へ取り込みます。
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-white/90">
          <span className="hidden sm:inline">開く</span>
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
        </div>
      </div>
    </Link>
  );
}
