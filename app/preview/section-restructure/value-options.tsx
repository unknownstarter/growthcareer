import type { ReactNode } from "react";
import { PickButton } from "./pick-button";

// 시안용 데이터 — domain 의 실제 카피를 참고해 축약. 도메인 파일은 수정하지 않음.
const VALUE_ITEMS = [
  {
    id: "portfolio",
    keyword: "포트폴리오",
    body: "현장에서 검증된 결과물. 면접관이 신뢰하는 형식으로 정리.",
    tint: "indigo",
  },
  {
    id: "network",
    keyword: "네트워크",
    body: "현직 멘토 3인 + 동기. 카카오톡 오픈채팅 평생 유효.",
    tint: "violet",
  },
  {
    id: "career",
    keyword: "커리어",
    body: "Dropdown 명의 수료증 + 우수 수강생 대상 유니온 픽처스 공연 참여 확인서.",
    tint: "pink",
  },
] as const;

const VALUE_ITEMS_4 = [
  ...VALUE_ITEMS,
  {
    id: "coaching",
    keyword: "1:1 코칭",
    body: "이력서 · 포트폴리오 · 면접 1:1 피드백.",
    tint: "fuchsia",
  },
] as const;

const TINT_BG: Record<string, string> = {
  indigo: "bg-brand-indigo",
  violet: "bg-brand-violet",
  purple: "bg-brand-purple",
  pink: "bg-brand-pink",
  fuchsia: "bg-brand-fuchsia",
};

function OptionWrap({
  badge,
  title,
  pros,
  cons,
  option,
  label,
  children,
}: {
  badge: string;
  title: string;
  pros: string;
  cons: string;
  option: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col border border-border bg-surface">
      <div className="border-border border-b px-6 py-5">
        <p
          className="mb-2 text-brand-pink text-[10px] font-black uppercase"
          style={{ letterSpacing: "0.3em" }}
        >
          {badge}
        </p>
        <h3
          className="font-black text-fg text-xl sm:text-2xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          {title}
        </h3>
      </div>

      <div className="flex-1 bg-bg p-6 sm:p-8">{children}</div>

      <div className="grid grid-cols-1 gap-2 border-border border-t px-6 py-5 text-sm sm:grid-cols-2">
        <p className="text-fg-muted">
          <span className="mr-2 font-black text-brand-pink">+</span>
          {pros}
        </p>
        <p className="text-fg-muted">
          <span className="mr-2 font-black text-fg-subtle">−</span>
          {cons}
        </p>
      </div>

      <div className="px-6 pb-6">
        <PickButton section="Value" option={option} label={label} />
      </div>
    </div>
  );
}

export function ValueOptions() {
  return (
    <section className="px-6 py-20 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <p
          className="mb-3 text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.4em" }}
        >
          02 · Value
        </p>
        <h2
          className="mb-12 font-black text-display-md text-fg"
          style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
        >
          4주 후 손에 잡히는 변화
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 옵션 A — 3장 솔리드 블록 */}
          <OptionWrap
            badge="옵션 A"
            title="3장 솔리드 블록"
            pros="강한 시각 임팩트. 모바일에서 세로 스택."
            cons="결과물 카테고리가 정확히 3개여야 균형."
            option="A"
            label="3장 솔리드 블록"
          >
            <div className="grid grid-cols-1 gap-3">
              {VALUE_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`${TINT_BG[item.tint]} p-5 text-fg`}
                >
                  <p
                    className="mb-2 font-black text-2xl"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {item.keyword}
                  </p>
                  <p className="text-fg/85 text-sm leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </OptionWrap>

          {/* 옵션 B — 1열 스토리 */}
          <OptionWrap
            badge="옵션 B"
            title="1열 스토리"
            pros="스토리 흐름. 각 결과물 깊이 있게."
            cons="세로로 길어짐. 임팩트 분산 가능."
            option="B"
            label="1열 스토리"
          >
            <div className="flex flex-col gap-3">
              {VALUE_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="border-border border-l-4 bg-bg p-4"
                  style={{
                    borderLeftColor: `var(--color-brand-${item.tint})`,
                  }}
                >
                  <p
                    className="mb-1 font-black text-fg text-lg"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {item.keyword}
                  </p>
                  <p className="text-fg-muted text-xs leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </OptionWrap>

          {/* 옵션 C — 2x2 그리드 */}
          <OptionWrap
            badge="옵션 C"
            title="2x2 그리드"
            pros="결과물 4개 모두 노출. 정보 밀도 균형."
            cons="모바일에서 카드가 작아짐. 4번째 항목 필요."
            option="C"
            label="2x2 그리드"
          >
            <div className="grid grid-cols-2 gap-2">
              {VALUE_ITEMS_4.map((item) => (
                <div
                  key={item.id}
                  className={`${TINT_BG[item.tint]} p-3 text-fg`}
                >
                  <p
                    className="mb-1 font-black text-base"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {item.keyword}
                  </p>
                  <p className="text-fg/80 text-[11px] leading-snug">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </OptionWrap>
        </div>
      </div>
    </section>
  );
}
