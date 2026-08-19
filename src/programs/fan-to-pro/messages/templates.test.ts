import { describe, it, expect } from "vitest";
import { getSmsBody, getEmailBody } from "./templates";
import { resolveTuitionForApplicant } from "../domain/pricing";

describe("templates tuition parameterization (ADR 0019)", () => {
  describe("1기 불변 — tuition 미지정 시 880,000 유지", () => {
    it("paymentGuide sms ko 에 880,000원 유지 (비자 있음)", () => {
      const body = getSmsBody("paymentGuide", "ko", "홍길동", { hasVisa: true });
      expect(body).toContain("880,000원");
      expect(body).not.toContain("990,000");
      expect(body).not.toContain("550,000");
      expect(body).not.toContain("{tuition}");
    });

    it("paymentGuide email ko 에 880,000원 + 구 원가 문구 제거", () => {
      const body = getEmailBody("paymentGuide", "ko", "홍길동", { hasVisa: true });
      expect(body).toContain("- 수강료: 880,000원");
      expect(body).not.toContain("1,100,000");
      expect(body).not.toContain("20% 할인");
      expect(body).not.toContain("{tuition}");
    });

    it("paymentGuide email en 에 KRW 880,000 + 구 원가 문구 제거", () => {
      const body = getEmailBody("paymentGuide", "en", "John", { hasVisa: true });
      expect(body).toContain("- Tuition: KRW 880,000");
      expect(body).not.toContain("1,100,000");
      expect(body).not.toContain("20% off");
    });

    it("reminderD1 sms ko 880,000 유지", () => {
      const body = getSmsBody("reminderD1", "ko", "홍길동");
      expect(body).toContain("880,000원");
    });

    it("paymentGuide noVisa email 도 tuition 치환됨", () => {
      const body = getEmailBody("paymentGuide", "ko", "홍길동", { hasVisa: false });
      expect(body).toContain("- 수강료: 880,000원");
      expect(body).not.toContain("{tuition}");
    });
  });

  describe("2기 — 계산된 tuition 주입", () => {
    it("올인원 → paymentGuide sms 990,000원", () => {
      const t = resolveTuitionForApplicant("all_in_one", ["a-r", "sound"], "ko").tuition;
      const body = getSmsBody("paymentGuide", "ko", "홍길동", {
        hasVisa: true,
        tuition: t,
      });
      expect(body).toContain("990,000원");
      expect(body).not.toContain("880,000");
    });

    it("단과 A&R → paymentGuide email 550,000원", () => {
      const t = resolveTuitionForApplicant("single", ["a-r"], "ko").tuition;
      const body = getEmailBody("paymentGuide", "ko", "홍길동", {
        hasVisa: true,
        tuition: t,
      });
      expect(body).toContain("- 수강료: 550,000원");
      expect(body).not.toContain("880,000");
    });

    it("단과 음향 en → reminderD3 email KRW 550,000", () => {
      const t = resolveTuitionForApplicant("single", ["sound"], "en").tuition;
      const body = getEmailBody("reminderD3", "en", "John", { tuition: t });
      expect(body).toContain("- Tuition: KRW 550,000");
    });

    it("모든 payment/reminder 종류에서 tuition 치환 확인 (누락 placeholder 없음)", () => {
      const t = "990,000원";
      for (const kind of ["paymentGuide", "reminderT1", "reminderD3", "reminderD1"] as const) {
        const sms = getSmsBody(kind, "ko", "홍길동", { tuition: t });
        const email = getEmailBody(kind, "ko", "홍길동", { tuition: t });
        expect(sms).not.toContain("{tuition}");
        expect(email).not.toContain("{tuition}");
        expect(sms).toContain("990,000원");
        expect(email).toContain("990,000원");
      }
    });
  });
});
