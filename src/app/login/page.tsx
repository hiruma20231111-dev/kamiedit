"use client";

import { LoginButton } from "@/components/auth-buttons";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const configured = useStore((s) => s.configured);
  const error = useStore((s) => s.error);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
      <Card className="w-full p-8 text-center">
        <h1 className="text-2xl font-bold">ログイン</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          編集・保存には Google アカウントでログインしてください。
          データはご自身の Google ドライブに保存されます。
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {!configured && (
          <p className="mt-4 rounded-md border border-amber-400/60 bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Google クライアントID が未設定のため、現在ログインできません。
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <LoginButton className="w-full" />
        </div>
      </Card>
    </div>
  );
}
