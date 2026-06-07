import Link from "next/link";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";

/**
 * Admin 페이지 공용 미니 네비게이션.
 *
 * Server Component - 현재 페이지 강조는 props `current` 로 명시 (usePathname 회피).
 * /admin/applicants, /admin/instructors, /admin/finance 헤더 위에 sticky 한 줄로
 * 추가되며, 핑크 강조는 현재 페이지에만.
 */

type AdminNavKey = "applicants" | "instructors" | "finance";

const ITEMS = [
  { key: "applicants" as const, href: "/admin/applicants" as const, label: "신청자" },
  { key: "instructors" as const, href: "/admin/instructors" as const, label: "강사" },
  { key: "finance" as const, href: "/admin/finance" as const, label: "재무" },
];

export function AdminNav({ current }: { current: AdminNavKey }) {
  return (
    <nav
      aria-label="운영자 페이지 이동"
      className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-4 py-2">
        {ITEMS.map((item) => {
          const active = item.key === current;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center border px-3 py-1.5 text-[11px] font-black uppercase whitespace-nowrap transition-colors",
                active
                  ? "border-brand-pink bg-brand-pink/15 text-brand-pink"
                  : "border-border bg-bg text-fg/80 hover:text-fg hover:border-fg-subtle",
              )}
              style={{ letterSpacing: "0.18em" }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
