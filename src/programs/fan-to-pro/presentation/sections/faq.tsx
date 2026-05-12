import { FAQS } from "@/src/programs/fan-to-pro/domain/faq";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

export function FAQ() {
  return (
    <Section id="faq" tone="bg">
      <Container>
        <Eyebrow n="13">FAQ</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          자주 묻는
          <br />
          <span className="text-brand-pink">질문.</span>
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          답이 안 보이면 아래 신청 폼 하단 메모란에 직접 적어주세요. 개별 회신.
        </p>

        <ul className="divide-y divide-border border-border border-y">
          {FAQS.map((item, i) => (
            <li key={item.q}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start gap-6 py-6 sm:py-8">
                  <span
                    className="shrink-0 font-black text-brand-pink text-sm sm:text-base"
                    style={{ letterSpacing: "0.2em" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="flex-1 font-black text-fg text-xl sm:text-2xl"
                    style={{ letterSpacing: "-0.02em", lineHeight: 1.3 }}
                  >
                    {item.q}
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 shrink-0 text-fg-subtle text-2xl transition-transform group-open:rotate-45 sm:text-3xl"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-8 pl-12 pr-12 text-base leading-relaxed text-fg-muted sm:text-lg">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
