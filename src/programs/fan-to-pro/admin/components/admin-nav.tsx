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
type Role = "admin" | "viewer";

const ITEMS = [
  {
    key: "applicants" as const,
    href: "/admin/applicants" as const,
    label: "신청자",
    roles: ["admin", "viewer"] as Role[],
  },
  {
    key: "instructors" as const,
    href: "/admin/instructors" as const,
    label: "강사",
    roles: ["admin"] as Role[],
  },
  {
    key: "finance" as const,
    href: "/admin/finance" as const,
    label: "재무",
    roles: ["admin"] as Role[],
  },
];

const SHARED_NAV_STYLE = { letterSpacing: "0.18em" };
const BASE_TAB_CLASS =
  "inline-flex items-center border px-3 py-1.5 text-[11px] font-black uppercase whitespace-nowrap transition-colors";

export function AdminNav({
  current,
  role = "admin",
}: {
  current: AdminNavKey;
  role?: Role;
}) {
  const visible = ITEMS.filter((item) => item.roles.includes(role));
  return (
    <nav
      aria-label="운영자 페이지 이동"
      className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-3 py-2 sm:px-4">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {visible.map((item) => {
            const active = item.key === current;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  BASE_TAB_CLASS,
                  active
                    ? "border-brand-pink bg-brand-pink/15 text-brand-pink"
                    : "border-border bg-bg text-fg/80 hover:text-fg hover:border-fg-subtle",
                )}
                style={SHARED_NAV_STYLE}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-1 pl-1">
          {/* 공개 사이트로 이동. next-intl middleware 가 locale 분기 처리. */}
          <a
            href="/"
            className={cn(
              BASE_TAB_CLASS,
              "border-border bg-bg text-fg/80 hover:text-fg hover:border-fg-subtle",
            )}
            style={SHARED_NAV_STYLE}
            title="공개 사이트로 이동"
          >
            홈
          </a>
          <a
            href="/admin/logout"
            className={cn(
              BASE_TAB_CLASS,
              "border-border bg-bg text-fg/80 hover:text-brand-pink hover:border-brand-pink",
            )}
            style={SHARED_NAV_STYLE}
            title="자격을 폐기하고 로그아웃"
          >
            로그아웃
          </a>
        </div>
      </div>
    </nav>
  );
}
