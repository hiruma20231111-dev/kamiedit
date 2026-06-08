import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginButton, UserMenu } from "@/components/auth-buttons";
import { Badge } from "@/components/ui/badge";

export async function SiteHeader() {
  const { user, isEditor, notConnected } = await getSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="text-lg">📐 kamiedit</span>
        </Link>

        <div className="flex items-center gap-2">
          {notConnected && (
            <Badge variant="outline" className="hidden sm:inline-flex text-amber-600 border-amber-400">
              Supabase未接続
            </Badge>
          )}
          {!notConnected && user && isEditor && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              編集者
            </Badge>
          )}
          {!notConnected && user && !isEditor && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              権限なし
            </Badge>
          )}
          <ThemeToggle />
          {user ? (
            <UserMenu email={user.email ?? "アカウント"} />
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  );
}
