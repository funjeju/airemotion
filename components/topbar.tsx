import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/brand";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/** 상단바: 로고 + 언어 셀렉터 + 테마 토글. */
export function Topbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span
            className="inline-block h-5 w-5 rounded-md bg-accent"
            aria-hidden
          />
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            {BRAND}
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
