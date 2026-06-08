import { LoginButton } from "@/components/auth-buttons";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const connected = hasSupabaseEnv();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
      <Card className="w-full p-8 text-center">
        <h1 className="text-2xl font-bold">ログイン</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          編集機能を使うには Google アカウントでログインしてください。
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            ログインに失敗しました。もう一度お試しください。
          </p>
        )}

        {!connected && (
          <p className="mt-4 rounded-md border border-amber-400/60 bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Supabase が未接続のため、現在ログインできません。
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <LoginButton next={next ?? "/"} className="w-full" />
        </div>
      </Card>
    </div>
  );
}
