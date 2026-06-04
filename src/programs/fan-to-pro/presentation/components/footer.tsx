import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { Container } from "../ui/container";

type NavItem = { label: string; href: string };

export function Footer() {
  const t = useTranslations("footer");
  const tKakao = useTranslations("kakao");
  const navItems = t.raw("navItems") as NavItem[];
  const policyItems = t.raw("policyItems") as NavItem[];

  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t bg-bg px-6 py-16 text-fg-muted sm:px-10">
      <Container>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <p
              className="mb-3 font-black text-fg text-2xl"
              style={{
                letterSpacing: "-0.04em",
                textWrap: "balance",
              }}
            >
              {t("brandHeadline")}
            </p>
            <p
              className="mb-3 text-fg-muted text-xs uppercase"
              style={{ letterSpacing: "0.25em" }}
            >
              {t("brandEyebrow")}
            </p>
            <p className="mb-6 max-w-md text-sm leading-relaxed">
              {t("brandTagline")}
            </p>
            <p
              className="text-fg-subtle text-xs uppercase"
              style={{ letterSpacing: "0.2em" }}
            >
              {t("poweredBy")}
            </p>
          </div>

          {/* Nav */}
          <div>
            <p
              className="mb-4 text-fg-subtle text-xs font-black uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              {t("navLabel")}
            </p>
            <ul className="grid grid-cols-1 gap-2 text-sm">
              {navItems.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="transition-colors hover:text-brand-pink"
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
              className="mb-4 text-fg-subtle text-xs font-black uppercase"
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
                      className="transition-colors hover:text-brand-pink"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      className="transition-colors hover:text-brand-pink"
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
        <div className="mt-16 border-border border-t pt-10">
          <p
            className="mb-5 text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
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
              className="inline-flex items-center bg-fg px-5 py-3 transition-opacity hover:opacity-85"
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
        <div className="mt-12 border-border border-t pt-8 text-fg-subtle text-xs leading-relaxed">
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
              className="font-black uppercase whitespace-nowrap"
              style={{ letterSpacing: "0.2em" }}
            >
              {t("business.address.label")}
            </dt>
            <dd className="max-w-prose">{t("business.address.value")}</dd>

            <dt
              className="font-black uppercase whitespace-nowrap"
              style={{ letterSpacing: "0.2em" }}
            >
              {t("business.email.label")}
            </dt>
            <dd>
              <a
                href={`mailto:${t("business.email.value")}`}
                className="transition-colors hover:text-brand-pink"
              >
                {t("business.email.value")}
              </a>
            </dd>
          </dl>

          <p className="mt-8">{t("copyright", { year })}</p>
        </div>

        {/* Keep KakaoChannel aria-label translation referenced for tooling. */}
        <span hidden>{tKakao("ariaLabel")}</span>
      </Container>
    </footer>
  );
}

function BusinessField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt
        className="font-black uppercase whitespace-nowrap"
        style={{ letterSpacing: "0.2em" }}
      >
        {label}
      </dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
