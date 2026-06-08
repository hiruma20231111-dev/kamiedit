"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginButton, UserMenu } from "@/components/auth-buttons";
import { Badge } from "@/components/ui/badge";

export function SiteHeader() {
  const configured = useStore((s) => s.configured);
  const signedIn = useStore((s) => s.signedIn);
  const saving = useStore((s) => s.saving);
  const loading = useStore((s) => s.loading);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight"
        >
          <span className="text-lg">📐 kamiedit</span>
        </Link>

        <div className="flex items-center gap-2">
          {!configured && (
            <Badge
              variant="outline"
              className="hidden sm:inline-flex border-amber-400 text-amber-600"
            >
              Google未接続
            </Badge>
          )}
          {configured && signedIn && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {saving ? "保存中…" : loading ? "読込中…" : "Drive同期"}
            </Badge>
          )}
          <ThemeToggle />
          {signedIn ? <UserMenu /> : <LoginButton />}
        </div>
      </div>
    </header>
  );
}
