import { describe, expect, it } from "vitest";
import {
  MIN_PER_COURSE,
  resolveBatchOutcome,
  type CourseDef,
  type PaidApplicant,
} from "./batch-enroll";

/**
 * per-course 정원 모델 판정 (model A) characterization.
 *   과정별 독립. 올인원 부분개강 = 열린 과정만 enrolled + 안 열린 과정분 부분환불.
 *
 * Phase 2a 제네릭화:
 *   resolveBatchOutcome 이 courses(slug + minHeadcount) 를 파라미터로 받는다.
 *   아래 A_R_SOUND (a-r/sound, min 10) 는 제네릭화 전 하드코딩과 동일한 세팅 →
 *   기존 케이스가 100% 동일 결과 나오는지 회귀 증명 (2기 개강 판정 = 돈 걸린 로직).
 */

// 제네릭화 전 하드코딩과 동일: a-r / sound, 각 최소 10.
const A_R_SOUND: readonly CourseDef[] = [
  { slug: "a-r", minHeadcount: 10 },
  { slug: "sound", minHeadcount: 10 },
];

// 헬퍼: N명의 단과 신청자 (한 과정).
function singles(course: "a-r" | "sound", n: number, prefix: string): PaidApplicant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    selectedCourseSlugs: [course],
    selectionMode: "single",
  }));
}

function allInOne(id: string): PaidApplicant {
  return { id, selectedCourseSlugs: ["a-r", "sound"], selectionMode: "all_in_one" };
}

describe("resolveBatchOutcome — per-course 정원 (characterization: a-r/sound min 10)", () => {
  it("(a) 둘 다 ≥10 → 전원 enrolled (full)", () => {
    const applicants = [
      ...singles("a-r", 10, "ar"),
      ...singles("sound", 10, "so"),
      allInOne("both"),
    ];
    const out = resolveBatchOutcome(applicants, A_R_SOUND);

    expect(out.counts).toEqual({ "a-r": 11, sound: 11 }); // allInOne 이 둘 다 카운트
    expect(out.runs).toEqual({ "a-r": true, sound: true });
    expect(out.cancelledIds).toEqual([]);
    expect(out.enrolledPartial).toEqual([]);
    expect(out.partialRefundDue).toEqual([]);
    expect(out.enrolledFullIds).toHaveLength(21);
    expect(out.enrolledFullIds).toContain("both");
  });

  it("(b) A&R만 ≥10: A&R 단과=enrolled, 음향 단과=cancelled, 올인원=enrolled+음향 부분환불", () => {
    const applicants = [
      ...singles("a-r", 10, "ar"),
      ...singles("sound", 3, "so"),
      allInOne("both"),
    ];
    const out = resolveBatchOutcome(applicants, A_R_SOUND);

    // 카운트: a-r = 10 단과 + 1 올인원 = 11, sound = 3 단과 + 1 올인원 = 4.
    expect(out.counts).toEqual({ "a-r": 11, sound: 4 });
    expect(out.runs).toEqual({ "a-r": true, sound: false });

    // A&R 단과 10명 → full.
    for (let i = 0; i < 10; i++) expect(out.enrolledFullIds).toContain(`ar${i}`);

    // 음향 단과 3명 → cancelled.
    expect(out.cancelledIds).toEqual(["so0", "so1", "so2"]);

    // 올인원 → enrolled partial (a-r 만 kept), sound 부분환불.
    expect(out.enrolledPartial).toEqual([{ id: "both", kept: ["a-r"] }]);
    expect(out.partialRefundDue).toEqual([
      { id: "both", droppedCourses: ["sound"] },
    ]);

    // enrolledFull 에는 올인원 미포함 (partial 이므로).
    expect(out.enrolledFullIds).not.toContain("both");
  });

  it("(c) 둘 다 <10 → 전원 cancelled", () => {
    // a-r = 5 단과 + 1 올인원 = 6, sound = 8 단과 + 1 올인원 = 9. 둘 다 <10.
    const applicants = [
      ...singles("a-r", 5, "ar"),
      ...singles("sound", 8, "so"),
      allInOne("both"),
    ];
    const out = resolveBatchOutcome(applicants, A_R_SOUND);

    expect(out.counts).toEqual({ "a-r": 6, sound: 9 });
    expect(out.runs).toEqual({ "a-r": false, sound: false });
    expect(out.enrolledFullIds).toEqual([]);
    expect(out.enrolledPartial).toEqual([]);
    expect(out.partialRefundDue).toEqual([]);
    // 5 + 8 + 1 = 14 전원 cancelled.
    expect(out.cancelledIds).toHaveLength(14);
    expect(out.cancelledIds).toContain("both");
  });

  it("(d) 경계값: 정확히 10 → 열림", () => {
    const out = resolveBatchOutcome(singles("a-r", 10, "ar"), A_R_SOUND);
    expect(out.runs["a-r"]).toBe(true);
    expect(out.enrolledFullIds).toHaveLength(10);
    expect(out.cancelledIds).toEqual([]);
  });

  it("(d') 경계값: 9 → 안 열림", () => {
    const out = resolveBatchOutcome(singles("a-r", 9, "ar"), A_R_SOUND);
    expect(out.runs["a-r"]).toBe(false);
    expect(out.cancelledIds).toHaveLength(9);
    expect(out.enrolledFullIds).toEqual([]);
  });

  it("MIN_PER_COURSE 상수는 10 (fallback 기본값)", () => {
    expect(MIN_PER_COURSE).toBe(10);
  });

  it("enrolledFull 이 정규화된 kept 를 담는다 (fix5: alias id + kept SoT)", () => {
    const applicants: PaidApplicant[] = [
      // 유효 a-r + 알 수 없는 slug + 중복 → kept 는 ['a-r'] 로 정규화돼야 함.
      { id: "x", selectedCourseSlugs: ["a-r", "bogus", "a-r"], selectionMode: "single" },
      ...singles("a-r", 9, "ar"),
    ];
    const out = resolveBatchOutcome(applicants, A_R_SOUND);
    // enrolledFullIds 는 enrolledFull.map(id) 와 정확히 일치 (alias 정합성).
    expect(out.enrolledFullIds).toEqual(out.enrolledFull.map((e) => e.id));
    const xFull = out.enrolledFull.find((e) => e.id === "x");
    // kept = 정규화 (알 수 없는 slug 제거 + 중복 제거).
    expect(xFull?.kept).toEqual(["a-r"]);
  });

  it("올인원 둘 다 열림 → full (부분환불 없음)", () => {
    const applicants = [
      ...singles("a-r", 10, "ar"),
      ...singles("sound", 10, "so"),
      allInOne("both"),
    ];
    const out = resolveBatchOutcome(applicants, A_R_SOUND);
    expect(out.enrolledFullIds).toContain("both");
    expect(out.partialRefundDue).toEqual([]);
  });

  it("legacy(과정 미지정) 신청자는 판정에서 제외 + 카운트 미반영", () => {
    const applicants: PaidApplicant[] = [
      { id: "legacy1", selectedCourseSlugs: null, selectionMode: null },
      { id: "legacy2", selectedCourseSlugs: [], selectionMode: null },
      ...singles("a-r", 10, "ar"),
    ];
    const out = resolveBatchOutcome(applicants, A_R_SOUND);
    expect(out.counts).toEqual({ "a-r": 10, sound: 0 });
    // legacy 는 어느 목록에도 없음.
    expect(out.cancelledIds).not.toContain("legacy1");
    expect(out.enrolledFullIds).not.toContain("legacy1");
    expect(out.perApplicant.find((p) => p.id === "legacy1")).toBeUndefined();
  });

  it("알 수 없는 slug 는 무시 (유효 과정 남으면 그 과정으로만 판정)", () => {
    const applicants: PaidApplicant[] = [
      { id: "x", selectedCourseSlugs: ["a-r", "bogus"], selectionMode: "single" },
      ...singles("a-r", 9, "ar"),
    ];
    const out = resolveBatchOutcome(applicants, A_R_SOUND);
    // x 의 유효 과정 = a-r 만 → a-r 카운트 10 → 열림.
    expect(out.counts["a-r"]).toBe(10);
    expect(out.runs["a-r"]).toBe(true);
    expect(out.enrolledFullIds).toContain("x");
    // 알 수 없는 slug 는 dropped 로도 안 잡힘 (부분환불 없음).
    expect(out.partialRefundDue).toEqual([]);
  });

  it("과정별 minHeadcount 오버라이드 가능 (courses 파라미터)", () => {
    const out = resolveBatchOutcome(singles("a-r", 5, "ar"), [
      { slug: "a-r", minHeadcount: 5 },
      { slug: "sound", minHeadcount: 10 },
    ]);
    expect(out.runs["a-r"]).toBe(true);
  });

  it("빈 입력 → 전부 빈 결과 (counts/runs 는 courses slug 키로 0/false)", () => {
    const out = resolveBatchOutcome([], A_R_SOUND);
    expect(out.counts).toEqual({ "a-r": 0, sound: 0 });
    expect(out.runs).toEqual({ "a-r": false, sound: false });
    expect(out.perApplicant).toEqual([]);
    expect(out.enrolledFullIds).toEqual([]);
    expect(out.cancelledIds).toEqual([]);
    expect(out.partialRefundDue).toEqual([]);
  });
});

/**
 * Phase 2a 제네릭 확장 증명 — 3번째 과정 추가 시 앱코드 0 수정으로 자동 반영.
 * courses insert 만으로 새 slug 가 counts/runs 에 나타나고 독립 판정됨.
 */
describe("resolveBatchOutcome — 제네릭 확장 (N 과정)", () => {
  const THREE: readonly CourseDef[] = [
    { slug: "a-r", minHeadcount: 10 },
    { slug: "sound", minHeadcount: 10 },
    { slug: "directing", minHeadcount: 5 },
  ];

  it("3번째 과정 slug 가 counts/runs 에 자동 등장 + 독립 판정", () => {
    const applicants: PaidApplicant[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `d${i}`,
        selectedCourseSlugs: ["directing"],
        selectionMode: "single",
      })),
      ...singles("a-r", 3, "ar"),
    ];
    const out = resolveBatchOutcome(applicants, THREE);

    expect(out.counts).toEqual({ "a-r": 3, sound: 0, directing: 5 });
    // directing 은 min 5 → 정확히 5 로 열림. a-r 은 3 < 10 → 안 열림.
    expect(out.runs).toEqual({ "a-r": false, sound: false, directing: true });
    for (let i = 0; i < 5; i++) expect(out.enrolledFullIds).toContain(`d${i}`);
    expect(out.cancelledIds).toEqual(["ar0", "ar1", "ar2"]);
  });

  it("올인원(3과정) 부분개강 → 열린 과정만 kept", () => {
    const applicants: PaidApplicant[] = [
      {
        id: "all3",
        selectedCourseSlugs: ["a-r", "sound", "directing"],
        selectionMode: "all_in_one",
      },
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `d${i}`,
        selectedCourseSlugs: ["directing"],
        selectionMode: "single",
      })),
      ...singles("a-r", 10, "ar"),
    ];
    const out = resolveBatchOutcome(applicants, THREE);

    // a-r=11(open), directing=6(open), sound=1(closed).
    expect(out.runs).toEqual({ "a-r": true, sound: false, directing: true });
    expect(out.enrolledPartial).toEqual([
      { id: "all3", kept: ["a-r", "directing"] },
    ]);
    expect(out.partialRefundDue).toEqual([
      { id: "all3", droppedCourses: ["sound"] },
    ]);
  });
});
