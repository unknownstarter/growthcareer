import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";

type NavItem = { label: string; href: string };

const WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";

/**
 * SiteFooter — 라이트 공통 푸터.
 * 1기 다크 footer.tsx 의 구조·i18n 콘텐츠(footer 네임스페이스)를 그대로 미러링하되
 * 라이트 테마로 변환. GC 우산 + 2기 모집 페이지에서 재사용.
 *
 * 네비게이터는 i18n navItems 를 쓰지 않고 nav prop 으로 주입 = GC 사이트 구조 반영.
 * 서버 컴포넌트 (next-intl useTranslations 는 server tree 에서 동작).
 */
export function SiteFooter({ nav }: { nav: NavItem[] }) {
  const t = useTranslations("footer");
  const policyItems = t.raw("policyItems") as NavItem[];

  const year = new Date().getFullYear();

  return (
    <footer className="break-keep border-hairline border-t bg-white px-6 py-16 text-ink-muted sm:px-10">
      <div className={WRAP}>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <p
              className="mb-3 font-black text-ink text-2xl"
              style={{ letterSpacing: "-0.04em", textWrap: "balance" }}
            >
              {t("brandHeadline")}
            </p>
            <p
              className="mb-3 text-ink-faint text-[13px] uppercase"
              style={{ letterSpacing: "0.25em" }}
            >
              {t("brandEyebrow")}
            </p>
            <p className="mb-6 max-w-md text-ink-muted text-sm leading-relaxed">
              {t("brandTagline")}
            </p>
            <p
              className="text-ink-faint text-[13px] uppercase"
              style={{ letterSpacing: "0.2em" }}
            >
              {t("poweredBy")}
            </p>
          </div>

          {/* Nav (prop 주입 = GC 사이트 구조) */}
          <div>
            <p
              className="mb-4 font-black text-ink-faint text-[13px] uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              {t("navLabel")}
            </p>
            <ul className="grid grid-cols-1 gap-2 text-sm">
              {nav.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-ink-muted transition-colors duration-150 hover:text-brand-pink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <p
              className="mb-4 font-black text-ink-faint text-[13px] uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              {t("policyLabel")}
            </p>
            <ul className="grid grid-cols-1 gap-2 text-sm">
              {policyItems.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith("/") ? (
                    <Link
                      href={l.href}
                      className="text-ink-muted transition-colors duration-150 hover:text-brand-pink"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      className="text-ink-muted transition-colors duration-150 hover:text-brand-pink"
                    >
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Partnership */}
        <div className="mt-16 border-hairline border-t pt-10">
          <p
            className="mb-5 font-black text-ink-faint text-[13px] uppercase"
            style={{ letterSpacing: "0.35em" }}
          >
            {t("partnerLabel")}
          </p>
          <div className="flex flex-wrap items-center gap-8">
            <a
              href="https://deepishop.com/?currency=KRW"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("partnerAriaLabel")}
              className="inline-flex items-center transition-opacity duration-150 hover:opacity-70"
            >
              <Image
                src="/images/partners/deepi.png"
                alt="DEEPI"
                width={120}
                height={14}
                className="h-auto w-auto"
              />
            </a>
          </div>
        </div>

        {/* Business info */}
        <div className="mt-12 border-hairline border-t pt-8 text-ink-faint text-sm leading-relaxed">
          <dl
            className="grid gap-x-8 gap-y-3"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            }}
          >
            <BusinessField
              label={t("business.company.label")}
              value={t("business.company.value")}
            />
            <BusinessField
              label={t("business.ceo.label")}
              value={t("business.ceo.value")}
            />
            <BusinessField
              label={t("business.bizNo.label")}
              value={t("business.bizNo.value")}
            />
            <BusinessField
              label={t("business.ecommerceNo.label")}
              value={t("business.ecommerceNo.value")}
            />
          </dl>

          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-[auto_1fr]">
            <dt
              className="font-black text-ink-faint uppercase whitespace-nowrap"
              style={{ letterSpacing: "0.2em" }}
            >
              {t("business.address.label")}
            </dt>
            <dd className="max-w-prose text-ink-muted">
              {t("business.address.value")}
            </dd>

            <dt
              className="font-black text-ink-faint uppercase whitespace-nowrap"
              style={{ letterSpacing: "0.2em" }}
            >
              {t("business.email.label")}
            </dt>
            <dd>
              <a
                href={`mailto:${t("business.email.value")}`}
                className="text-ink-muted transition-colors duration-150 hover:text-brand-pink"
              >
                {t("business.email.value")}
              </a>
            </dd>
          </dl>

          <p className="mt-8">{t("copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}

function BusinessField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        className="font-black text-ink-faint uppercase whitespace-nowrap"
        style={{ letterSpacing: "0.2em" }}
      >
        {label}
      </dt>
      <dd className="mt-1 text-ink-muted">{value}</dd>
    </div>
  );
}
