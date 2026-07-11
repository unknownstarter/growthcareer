/**
 * Materials Overview — /admin/materials 통합 랜딩 (5 카테고리 요약).
 *
 * Slice 1: 5 카테고리를 병렬 fetch. 랜딩 페이지 (Luna 시각화) 가 이 단일 함수를
 * 호출하면 카드 5개 데이터가 한 번에 준비.
 *
 * 카테고리:
 *   1) 강의 자료          — lecture_materials (cohort × session)
 *   2) 이력서             — student_career_documents (doc_type=resume)
 *   3) 포트폴리오          — student_career_documents (doc_type=portfolio)
 *   4) 수료증 / 참여확인서 — certificates (kind=completion / performance)
 *   5) 공지 (첨부)         — announcements (첨부 컬럼 확정 대기, title body 만 현재)
 *
 * ADR 0005 §2 — queries/ = CQRS read.
 * CLAUDE.md §7.4 — 호출자 (page.tsx server component) 가 assertProgramAdmin 가드.
 *
 * 캐시: 라이브 운영 실시간 → 페이지 force-dynamic. 본 함수 자체는 pure fetch.
 *
 * 성능:
 *   - Promise.all 로 5 fetch 병렬. round-trip 은 서로 독립.
 *   - 각 fetch 실패 시 catch → 빈 요약 반환 (렌더 부분 실패 허용).
 *   - Fluid Compute (Node.js 24) 기준 p95 추정 400ms 내 (Supabase 서울 리전).
 */
import {
  fetchLectureMaterialsSummary,
  type LectureMaterialsSummary,
} from "./fetch-lecture-summary";
import {
  fetchResumesSummary,
  fetchPortfoliosSummary,
  type CareerDocumentsSummary,
} from "./fetch-career-documents-summary";
import {
  fetchCertificatesSummary,
  type CertificatesSummary,
} from "./fetch-certificates-summary";
import {
  fetchAnnouncementAttachmentsSummary,
  type AnnouncementsSummary,
} from "./fetch-announcements-summary";

export type MaterialsOverview = {
  lecture: LectureMaterialsSummary;
  resumes: CareerDocumentsSummary;
  portfolios: CareerDocumentsSummary;
  certificates: CertificatesSummary;
  announcements: AnnouncementsSummary;
};

/** 빈 fallback — 개별 카테고리 실패 시. */
const EMPTY_LECTURE: LectureMaterialsSummary = {
  total: 0,
  recent: [],
  breakdown: [],
};
const EMPTY_CAREER: CareerDocumentsSummary = {
  total: 0,
  recent: [],
  breakdown: [],
};
const EMPTY_CERTS: CertificatesSummary = {
  total: 0,
  byKind: { completion: 0, performance: 0 },
  recent: [],
  breakdown: [],
};
const EMPTY_ANNOUNCEMENTS: AnnouncementsSummary = {
  total: 0,
  publishedCount: 0,
  recent: [],
  breakdown: [],
};

export async function fetchMaterialsOverview(): Promise<MaterialsOverview> {
  const [
    lecture,
    resumes,
    portfolios,
    certificates,
    announcements,
  ] = await Promise.all([
    fetchLectureMaterialsSummary().catch(() => EMPTY_LECTURE),
    fetchResumesSummary().catch(() => EMPTY_CAREER),
    fetchPortfoliosSummary().catch(() => EMPTY_CAREER),
    fetchCertificatesSummary().catch(() => EMPTY_CERTS),
    fetchAnnouncementAttachmentsSummary().catch(() => EMPTY_ANNOUNCEMENTS),
  ]);

  return {
    lecture,
    resumes,
    portfolios,
    certificates,
    announcements,
  };
}
