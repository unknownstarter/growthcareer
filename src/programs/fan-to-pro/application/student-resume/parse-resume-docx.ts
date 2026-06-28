/**
 * Student Resume — docx parser (B0064).
 *
 * 학생이 채워 제출한 우리 양식 (`docs/share/Fan-to-Pro-이력서-양식.docx`) 의
 * docx 파일을 mammoth 로 raw text 변환 → 섹션/필드 추출 → DB 친화 구조로 정규화.
 *
 * 본 파일은 **순수 함수** 만 — Supabase / 권한 / I/O 없음. server action 에서 호출.
 *
 * 양식 패턴 (generate-resume-template-docx.mjs 와 정합):
 *   ┌─ "인적사항 / Personal Information"  ← sectionHeader
 *   │   ▪ 성명 (한글)                       ← field label
 *   │   <학생 입력>                          ← 같은 줄 또는 다음 줄
 *   │   ▪ 성명 (영문)
 *   │   ...
 *   ├─ "학력 / Education"
 *   │   [1] 기간 / 기관 / 직무 / 내용을 자유롭게 작성  ← entry marker + placeholder
 *   │   <학생 입력 3 줄>
 *   │   [2] ...
 *   ├─ "경력 / Work Experience"
 *   ├─ "자격증 / Certifications"
 *   ├─ "수상 / Awards"
 *   ├─ "어학 / Languages"
 *   ├─ "프로젝트 / Projects"
 *   ├─ "기타활동 / Activities"          ← B0063 추가 (양식에 없을 수도 있음 — best effort)
 *   ├─ "활용능력 / Skills"              ← B0063 추가 (양식에 없을 수도 있음)
 *   ├─ "희망 진로 / Career Target"
 *   └─ "자기 PR / Self Pitch"
 *
 * 학생이 표 안에서 채우거나 별도 양식을 가져와도 best-effort 추출 — 실패 항목은
 * `warnings[]` 에 메시지로 alert (운영자 preview 화면에 노출).
 */
import "server-only";

import mammoth from "mammoth";
import {
  TARGET_ROLE_CATEGORIES,
  TARGET_ROLE_LABELS,
  type TargetRoleCategory,
} from "@/src/programs/fan-to-pro/domain/entities/student-career-target";
import type { ResumeItemType } from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";
import type { StudentGender } from "@/src/programs/fan-to-pro/domain/entities/student-profile";

// ----- 결과 타입 ---------------------------------------------------------

export interface ParsedResumeProfile {
  name_ko: string | null;
  name_en: string | null;
  phone: string | null;
  birth_date: string | null; // YYYY-MM-DD
  gender: StudentGender | null;
  visa_type: string | null;
  months_in_korea: number | null;
  website_url: string | null;
  // address / email 은 applicants 가 truth — docx 에서 추출해도 update X.
}

export interface ParsedResumeCareerTarget {
  target_role_category: TargetRoleCategory | null;
  /** mapping 실패 시 사용자가 적은 원본 텍스트. */
  target_role_text: string | null;
  target_companies: string[];
  /** YYYY-MM-DD or null. */
  desired_start_date: string | null;
  self_pitch: string | null;
}

export interface ParsedResumeItem {
  type: ResumeItemType;
  title: string;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  credential_url: string | null;
}

export interface ParsedResume {
  profile: ParsedResumeProfile;
  career_target: ParsedResumeCareerTarget;
  resume_items: ParsedResumeItem[];
  warnings: string[];
}

export type ParseResumeResult =
  | { status: "ok"; parsed: ParsedResume }
  | { status: "error"; error: string };

// ----- 섹션 매핑 ---------------------------------------------------------

type SectionKey =
  | "personal"
  | "education"
  | "experience"
  | "certification"
  | "award"
  | "language"
  | "project"
  | "activity"
  | "skill"
  | "career_target"
  | "self_pitch";

/**
 * 섹션 헤더 매칭 정규식. KO + EN 양쪽 키워드로 인식 → 학생이 한쪽만 남겨도 OK.
 *
 * 모든 regex 는 `^` anchor + 키워드 자체 (양식 헤더는 항상 줄 시작 직후).
 * 그렇지 않으면 "컴퓨터활용능력 1급" (자격증 entry 내용) 안의 "활용능력" 이
 * skill 섹션 헤더로 오인됨 → 다음 항목 분류 오류.
 *
 * 한글에는 word boundary 가 없어 영문은 (?:\b|$|\s|/) 로 후행 가드.
 */
const SECTION_PATTERNS: Array<{ key: SectionKey; re: RegExp }> = [
  {
    key: "personal",
    re: /^\s*(?:인적\s*사항|기본\s*정보|personal\s+information|personal\s+info)(?:\s|$|\/)/i,
  },
  { key: "education", re: /^\s*(?:학력|education)(?:\s|$|\/)/i },
  {
    key: "experience",
    re: /^\s*(?:경력\s*사항|경력|work\s+experience|experience)(?:\s|$|\/)/i,
  },
  {
    key: "certification",
    re: /^\s*(?:자격증|자격|certifications?)(?:\s|$|\/)/i,
  },
  {
    key: "award",
    re: /^\s*(?:수상\s*경력|수상|awards?|honors?)(?:\s|$|\/)/i,
  },
  { key: "language", re: /^\s*(?:어학|언어|languages?)(?:\s|$|\/)/i },
  { key: "project", re: /^\s*(?:프로젝트|projects?)(?:\s|$|\/)/i },
  {
    key: "activity",
    re: /^\s*(?:기타\s*활동|대외\s*활동|동아리|봉사|activit(?:y|ies))(?:\s|$|\/)/i,
  },
  {
    key: "skill",
    re: /^\s*(?:활용\s*능력|보유\s*기술|skills?|tools?)(?:\s|$|\/)/i,
  },
  {
    key: "career_target",
    // "희망 직무" 는 section 헤더가 아니라 careerTarget 내부 field 라서 제외.
    re: /^\s*(?:희망\s*진로|career\s+target|career\s+goal|희망\s*조건|희망\s*직군)(?:\s|$|\/)/i,
  },
  {
    key: "self_pitch",
    re: /^\s*(?:자기\s*pr|자기\s*소개|자기소개서|self[\s-]?pitch|self[\s-]?intro)(?:\s|$|\/)/i,
  },
];

// ----- 라벨 → field key ----------------------------------------------------

type ProfileFieldKey =
  | "name_ko"
  | "name_en"
  | "birth_date"
  | "gender"
  | "phone"
  | "visa_type"
  | "months_in_korea"
  | "website_url";

const PROFILE_LABELS: Array<{ key: ProfileFieldKey; re: RegExp }> = [
  { key: "name_ko", re: /(?:성명\s*\(?\s*한글|이름\s*\(?\s*한글|name\s*\(?\s*korean)/i },
  { key: "name_en", re: /(?:성명\s*\(?\s*영문|이름\s*\(?\s*영문|name\s*\(?\s*english)/i },
  {
    key: "birth_date",
    re: /(?:생년월일|생일|date\s+of\s+birth|birth\s*date|birthday)/i,
  },
  { key: "gender", re: /(?:성별|gender|sex)/i },
  {
    key: "phone",
    re: /(?:연락처|휴대폰|전화|phone|mobile|contact)/i,
  },
  {
    key: "visa_type",
    re: /(?:비자|체류\s*자격|visa(?:\s+type)?)/i,
  },
  {
    key: "months_in_korea",
    re: /(?:한국\s*거주|months?\s+in\s+korea|residence\s+in\s+korea)/i,
  },
  {
    key: "website_url",
    re: /(?:홈페이지|웹사이트|sns|포트폴리오\s*링크|website|portfolio\s+link|link)/i,
  },
];

type CareerTargetFieldKey =
  | "target_role_category"
  | "target_companies"
  | "desired_start_date";

const CAREER_TARGET_LABELS: Array<{ key: CareerTargetFieldKey; re: RegExp }> = [
  {
    key: "target_role_category",
    re: /(?:희망\s*직무|희망\s*직군|desired\s+role|target\s+role|role)/i,
  },
  {
    key: "target_companies",
    re: /(?:희망\s*회사|희망\s*기업|target\s+compan(?:y|ies)|desired\s+compan(?:y|ies))/i,
  },
  {
    key: "desired_start_date",
    re: /(?:희망\s*시작|희망\s*입사|start\s+date|desired\s+start)/i,
  },
];

// ----- 헬퍼 ---------------------------------------------------------------

/** placeholder/가이드 텍스트인지 판정. true 면 빈 값으로 취급. */
function isPlaceholderText(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  // 양식의 entry 안내문: "기간 / 기관 / 직무 / 내용을 자유롭게 작성"
  if (/자유롭게\s*작성/.test(t)) return true;
  // "본인의 강점..."  selfPitchLines 안내문
  if (/본인의\s+강점.+작성/.test(t)) return true;
  // 양식 footer
  if (/Fan to Pro.*\/.*Growth Career/i.test(t)) return true;
  if (/^growthcareer\.xyz\/?$/i.test(t)) return true;
  // 외부 양식의 빈 줄 표시 (잡코리아 등)
  if (/^[_\-=\s.·•]+$/.test(t)) return true;
  // 양식의 "사진 첨부 영역" 표시
  if (/사진\s*첨부\s*영역/.test(t)) return true;
  // marker / 빈 부호 1글자 — 단 의미 있는 1글자 한글 (남/여 등) 은 보존.
  if (t.length === 1 && /[^가-힣A-Za-z0-9]/.test(t)) return true;
  return false;
}

/** 라벨 앞 마커 (▪ ● ○ ■ □ • · -) 제거. */
function stripLabelMarker(s: string): string {
  return s.replace(/^[\s▪●○■□•·\-*]+/, "").trim();
}

/** entry marker `[1]` `[10]` 등 + 뒤따라오는 안내 텍스트 분리. */
function parseEntryHeader(line: string): { isEntry: boolean; hint: string } {
  const m = /^\s*\[\d+\]\s*(.*)$/.exec(line);
  if (!m) return { isEntry: false, hint: "" };
  return { isEntry: true, hint: m[1] ?? "" };
}

/** 1줄에 "라벨: 값" 형태인지 판정. ":" 이후가 값. */
function splitLabelInline(line: string): { label: string; value: string } | null {
  const m = /^(.{1,60}?)\s*[:：]\s*(.+)$/.exec(line);
  if (!m) return null;
  return { label: m[1].trim(), value: m[2].trim() };
}

// ----- 정규화 helpers -----------------------------------------------------

/** 다양한 생년월일 입력 → YYYY-MM-DD. 실패 시 null. */
function normalizeBirthDate(raw: string): string | null {
  const cleaned = raw.replace(/[^\d./\- 년월일]/g, " ").trim();
  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  let m = /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/.exec(cleaned);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  // "1990년 1월 5일"
  m = /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(cleaned);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

function toIsoDate(y: number, mo: number, d: number): string | null {
  if (y < 1900 || y > 2100) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;
  return `${y.toString().padStart(4, "0")}-${mo
    .toString()
    .padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

/** "남자" / "여자" / "Male" / "Female" 등 → enum. */
function normalizeGender(raw: string): StudentGender | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (/(^|\s)(남|남자|남성|male|m)(\s|$)/.test(` ${t} `)) return "male";
  if (/(^|\s)(여|여자|여성|female|f)(\s|$)/.test(` ${t} `)) return "female";
  if (/(prefer\s*not|미공개|비공개)/.test(t)) return "prefer_not_to_say";
  if (/(other|기타)/.test(t)) return "other";
  return null;
}

/** "12" / "12개월" / "1년 6개월" / "2 years" → months int. */
function normalizeMonths(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  let total = 0;
  const yMatch = /(\d+)\s*(?:년|y(?:ear)?s?)/i.exec(t);
  const mMatch = /(\d+)\s*(?:개월|months?|mo)/i.exec(t);
  if (yMatch) total += Number(yMatch[1]) * 12;
  if (mMatch) total += Number(mMatch[1]);
  if (total > 0) return clamp(total, 0, 1200);
  // 그냥 숫자만 → 개월로 간주.
  const plain = /(\d+)/.exec(t);
  if (plain) return clamp(Number(plain[1]), 0, 1200);
  return null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** 휴대폰 자연어 → 숫자/하이픈/플러스만 남김. 30자 cap. */
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+\- ]/g, "").trim();
  if (cleaned.length < 4) return null;
  return cleaned.slice(0, 30);
}

/** URL 추출 (http/https 만). 첫 매치만. */
function extractHttpUrl(raw: string): string | null {
  const m = /https?:\/\/\S+/i.exec(raw);
  if (!m) return null;
  const url = m[0].replace(/[.,;)\]}>"']+$/, ""); // trailing 문장부호 제거.
  return url.slice(0, 2048);
}

/** 비자 코드 normalize — "F-2" "F2" "F 2" → "F-2". */
function normalizeVisa(raw: string): string | null {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return null;
  // "F2" → "F-2".
  const m = /^([A-Z])[-]?(\d{1,2})$/.exec(t);
  if (m) return `${m[1]}-${m[2]}`.slice(0, 30);
  return t.slice(0, 30);
}

/** 희망 회사 string → string[]. "회사A, 회사B / 회사C" 등. */
function splitCompanies(raw: string): string[] {
  return raw
    .split(/[,/、\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isPlaceholderText(s))
    .slice(0, 20);
}

/** 자유 텍스트 직무 → enum 매칭 best-effort. */
function matchRoleCategory(raw: string): TargetRoleCategory | null {
  const t = raw.trim().toLowerCase();
  if (!t || isPlaceholderText(t)) return null;
  // 라벨 (한글) 직접 매칭 — TARGET_ROLE_LABELS.
  for (const cat of TARGET_ROLE_CATEGORIES) {
    const label = TARGET_ROLE_LABELS[cat].toLowerCase();
    if (t.includes(label)) return cat;
  }
  // 영문/약어 매칭.
  if (/concert|pd|기획/.test(t)) return "concert_pd";
  if (/\ba(?:&|\s+and\s+|n)r\b|아티스트.*개발/.test(t)) return "a_n_r";
  if (/manage|매니지/.test(t)) return "mgmt";
  if (/market|마케/.test(t)) return "marketing";
  if (/video|영상|편집/.test(t)) return "video";
  if (/sound|음향|engineer/.test(t)) return "sound";
  if (/visual|디렉터|director/.test(t)) return "visual_director";
  if (/stage|스테이지|무대/.test(t)) return "stage_manager";
  if (/music\s+business|음악\s+사업|bizdev/.test(t)) return "music_business";
  return null;
}

// ----- 메인 ---------------------------------------------------------------

/**
 * docx Buffer → 정규화된 ParsedResume.
 *
 * mammoth 가 binary 손상 / 잘못된 zip 등 던지면 status: "error" 로 wrap.
 */
export async function parseStudentResumeDocx(
  buffer: Buffer,
): Promise<ParseResumeResult> {
  let text: string;
  try {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value ?? "";
  } catch (err) {
    return {
      status: "error",
      error:
        err instanceof Error ? `parseFailed: ${err.message}` : "parseFailed",
    };
  }

  if (!text.trim()) {
    return {
      status: "ok",
      parsed: emptyParsed(["docx 안에서 텍스트를 찾지 못했어요."]),
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, " ").trimEnd())
    .filter((_, i, arr) => {
      // 연속된 빈 줄 1개로 축약.
      if (arr[i].trim()) return true;
      return i === 0 || arr[i - 1].trim() !== "";
    });

  const sections = sliceSections(lines);
  const warnings: string[] = [];

  const profile = parsePersonalSection(sections.personal ?? [], warnings);
  const career_target = parseCareerTargetSection(
    sections.career_target ?? [],
    sections.self_pitch ?? [],
    warnings,
  );

  const resume_items: ParsedResumeItem[] = [];
  for (const [type, key] of RESUME_TYPE_TO_SECTION) {
    const lines = sections[key];
    if (!lines || lines.length === 0) continue;
    const entries = parseEntrySection(type, lines, warnings);
    resume_items.push(...entries);
  }

  return {
    status: "ok",
    parsed: { profile, career_target, resume_items, warnings },
  };
}

const RESUME_TYPE_TO_SECTION: Array<[ResumeItemType, SectionKey]> = [
  ["education", "education"],
  ["experience", "experience"],
  ["certification", "certification"],
  ["award", "award"],
  ["language", "language"],
  ["project", "project"],
  ["activity", "activity"],
  ["skill", "skill"],
];

// ----- 섹션 절단 -----------------------------------------------------------

function detectSection(line: string): SectionKey | null {
  // 헤더는 보통 10~40 자 — entry 안내문이나 학생 입력과 구분 위해 길이 가드.
  const t = line.trim();
  if (t.length === 0 || t.length > 60) return null;
  for (const { key, re } of SECTION_PATTERNS) {
    if (re.test(t)) return key;
  }
  return null;
}

function sliceSections(lines: string[]): Partial<Record<SectionKey, string[]>> {
  const out: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current && buffer.length > 0) {
      // 같은 섹션이 또 나오면 추가 (append) — 학생이 양식을 중복 복사한 경우.
      const prev = out[current] ?? [];
      out[current] = [...prev, ...buffer];
    }
    buffer = [];
  };

  for (const line of lines) {
    const found = detectSection(line);
    if (found) {
      flush();
      current = found;
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return out;
}

// ----- 인적사항 파싱 -------------------------------------------------------

function parsePersonalSection(
  lines: string[],
  warnings: string[],
): ParsedResumeProfile {
  const profile: ParsedResumeProfile = {
    name_ko: null,
    name_en: null,
    phone: null,
    birth_date: null,
    gender: null,
    visa_type: null,
    months_in_korea: null,
    website_url: null,
  };

  // 라벨 + 값 collect — 같은 줄 inline 또는 다음 줄.
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const stripped = stripLabelMarker(raw);

    // inline "라벨: 값"
    const inline = splitLabelInline(stripped);
    if (inline) {
      const key = matchProfileLabel(inline.label);
      if (key && !isPlaceholderText(inline.value)) {
        assignProfileField(profile, key, inline.value, warnings);
        continue;
      }
    }

    // 라벨만 + 다음 비-placeholder 줄이 값.
    const key = matchProfileLabel(stripped);
    if (key) {
      const value = pickNextValue(lines, i);
      if (value) assignProfileField(profile, key, value, warnings);
    }
  }

  return profile;
}

function matchProfileLabel(s: string): ProfileFieldKey | null {
  for (const { key, re } of PROFILE_LABELS) {
    if (re.test(s)) return key;
  }
  return null;
}

function pickNextValue(lines: string[], from: number): string | null {
  for (let j = from + 1; j < lines.length && j < from + 4; j++) {
    const t = lines[j].trim();
    if (!t) continue;
    // 다음 라벨이면 stop.
    if (matchProfileLabel(stripLabelMarker(t))) return null;
    if (isPlaceholderText(t)) continue;
    return stripLabelMarker(t);
  }
  return null;
}

function assignProfileField(
  profile: ParsedResumeProfile,
  key: ProfileFieldKey,
  raw: string,
  warnings: string[],
) {
  switch (key) {
    case "name_ko":
      profile.name_ko = clipText(raw, 100);
      break;
    case "name_en":
      profile.name_en = clipText(raw, 100);
      break;
    case "phone": {
      const v = normalizePhone(raw);
      if (v) profile.phone = v;
      else warnings.push(`연락처 형식을 인식하지 못했어요: "${raw}"`);
      break;
    }
    case "birth_date": {
      const v = normalizeBirthDate(raw);
      if (v) profile.birth_date = v;
      else warnings.push(`생년월일 형식을 인식하지 못했어요: "${raw}"`);
      break;
    }
    case "gender": {
      const v = normalizeGender(raw);
      if (v) profile.gender = v;
      else warnings.push(`성별을 인식하지 못했어요: "${raw}"`);
      break;
    }
    case "visa_type": {
      const v = normalizeVisa(raw);
      if (v) profile.visa_type = v;
      break;
    }
    case "months_in_korea": {
      const v = normalizeMonths(raw);
      if (v !== null) profile.months_in_korea = v;
      else warnings.push(`한국 거주 기간을 인식하지 못했어요: "${raw}"`);
      break;
    }
    case "website_url": {
      const v = extractHttpUrl(raw);
      if (v) profile.website_url = v;
      else warnings.push(`URL 형식 (http/https) 만 저장돼요: "${raw}"`);
      break;
    }
  }
}

function clipText(s: string, max: number): string | null {
  const t = s.trim();
  if (!t) return null;
  return t.slice(0, max);
}

// ----- 희망 진로 + 자기 PR --------------------------------------------------

function parseCareerTargetSection(
  ctLines: string[],
  pitchLines: string[],
  warnings: string[],
): ParsedResumeCareerTarget {
  const out: ParsedResumeCareerTarget = {
    target_role_category: null,
    target_role_text: null,
    target_companies: [],
    desired_start_date: null,
    self_pitch: null,
  };

  for (let i = 0; i < ctLines.length; i++) {
    const raw = ctLines[i];
    if (!raw.trim()) continue;
    const stripped = stripLabelMarker(raw);

    const inline = splitLabelInline(stripped);
    if (inline) {
      const key = matchCareerTargetLabel(inline.label);
      if (key && !isPlaceholderText(inline.value)) {
        assignCareerTargetField(out, key, inline.value, warnings);
        continue;
      }
    }

    const key = matchCareerTargetLabel(stripped);
    if (key) {
      const value = pickNextCareerValue(ctLines, i);
      if (value) assignCareerTargetField(out, key, value, warnings);
    }
  }

  // 자기 PR — 라벨 다음 줄 ~ 끝. 또는 별도 섹션.
  const pitch = collectSelfPitch(pitchLines);
  if (pitch) {
    // 300자 cap (zod 와 일치).
    out.self_pitch = pitch.length > 300 ? pitch.slice(0, 300) : pitch;
    if (pitch.length > 300) {
      warnings.push("자기 PR 이 300자를 넘어 잘렸어요.");
    }
  }

  return out;
}

function matchCareerTargetLabel(s: string): CareerTargetFieldKey | null {
  for (const { key, re } of CAREER_TARGET_LABELS) {
    if (re.test(s)) return key;
  }
  return null;
}

function pickNextCareerValue(lines: string[], from: number): string | null {
  for (let j = from + 1; j < lines.length && j < from + 4; j++) {
    const t = lines[j].trim();
    if (!t) continue;
    if (matchCareerTargetLabel(stripLabelMarker(t))) return null;
    if (isPlaceholderText(t)) continue;
    return stripLabelMarker(t);
  }
  return null;
}

function assignCareerTargetField(
  target: ParsedResumeCareerTarget,
  key: CareerTargetFieldKey,
  raw: string,
  warnings: string[],
) {
  switch (key) {
    case "target_role_category": {
      const cat = matchRoleCategory(raw);
      if (cat) target.target_role_category = cat;
      else
        warnings.push(
          `희망 직무를 카테고리로 매칭하지 못했어요 (원본 보존): "${raw}"`,
        );
      target.target_role_text = clipText(raw, 200);
      break;
    }
    case "target_companies": {
      const list = splitCompanies(raw);
      if (list.length === 0) {
        warnings.push(`희망 회사를 인식하지 못했어요: "${raw}"`);
      } else {
        target.target_companies = list;
      }
      break;
    }
    case "desired_start_date": {
      const v = normalizeBirthDate(raw); // 같은 정규식 — YYYY-MM-DD.
      if (v) target.desired_start_date = v;
      else
        warnings.push(
          `희망 시작 시기를 날짜로 인식하지 못했어요: "${raw}"`,
        );
      break;
    }
  }
}

function collectSelfPitch(lines: string[]): string | null {
  const parts: string[] = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    if (isPlaceholderText(t)) continue;
    parts.push(t);
  }
  if (parts.length === 0) return null;
  return parts.join(" ").trim();
}

// ----- entry 섹션 (학력 / 경력 등) -----------------------------------------

function parseEntrySection(
  type: ResumeItemType,
  lines: string[],
  warnings: string[],
): ParsedResumeItem[] {
  // 1) entry marker `[N]` 로 split.
  const groups: string[][] = [];
  let bucket: string[] = [];
  let started = false;

  for (const raw of lines) {
    const { isEntry } = parseEntryHeader(raw);
    if (isEntry) {
      if (started) groups.push(bucket);
      bucket = [];
      started = true;
      continue;
    }
    if (!started) {
      // marker 없이 학생이 자유 양식으로 채운 경우. 첫 비-placeholder 줄부터 한 group 으로.
      const t = raw.trim();
      if (t && !isPlaceholderText(t)) {
        bucket.push(t);
        started = true;
      }
      continue;
    }
    bucket.push(raw);
  }
  if (started && bucket.length > 0) groups.push(bucket);

  const out: ParsedResumeItem[] = [];
  for (const group of groups) {
    const item = buildItemFromGroup(type, group, warnings);
    if (item) out.push(item);
  }
  return out;
}

/**
 * group 안의 줄들로 ParsedResumeItem 하나 생성.
 *
 * 휴리스틱:
 *   1) 모든 줄을 placeholder 필터 후 list.
 *   2) "라벨: 값" 형태가 있으면 라벨 → 의미 매핑.
 *   3) 그 외 / fallback:
 *      - 첫 줄 = title.
 *      - 날짜 패턴 (YYYY-MM-DD ~ YYYY-MM-DD 또는 YYYY.MM ~) 있으면 분리.
 *      - 다음 줄 = organization.
 *      - 나머지 = description.
 */
function buildItemFromGroup(
  type: ResumeItemType,
  group: string[],
  warnings: string[],
): ParsedResumeItem | null {
  const clean = group
    .map((l) => l.replace(/^\[\d+\]\s*/, "").trim())
    .filter((l) => l && !isPlaceholderText(l));

  if (clean.length === 0) return null;

  const item: ParsedResumeItem = {
    type,
    title: "",
    organization: null,
    start_date: null,
    end_date: null,
    description: null,
    credential_url: null,
  };

  // pass 1: "라벨: 값" 추출.
  const remaining: string[] = [];
  for (const line of clean) {
    const inline = splitLabelInline(line);
    if (inline) {
      const labelLow = inline.label.toLowerCase();
      const value = inline.value.trim();
      if (/(?:기관|학교|회사|소속|발급|주최|단체|organization|company|school|issuer)/i.test(labelLow)) {
        item.organization = clipText(value, 200);
        continue;
      }
      if (/(?:기간|date|duration|period)/i.test(labelLow)) {
        const [s, e] = splitDateRange(value);
        if (s) item.start_date = s;
        if (e) item.end_date = e;
        continue;
      }
      if (/(?:시작|start)/i.test(labelLow)) {
        item.start_date = normalizeBirthDate(value);
        continue;
      }
      if (/(?:종료|end)/i.test(labelLow)) {
        item.end_date = normalizeBirthDate(value);
        continue;
      }
      if (/(?:url|link|링크|증빙|credential)/i.test(labelLow)) {
        const u = extractHttpUrl(value) ?? extractHttpUrl(line);
        if (u) item.credential_url = u;
        continue;
      }
      if (/(?:제목|이름|title|name|학위|전공|직무|position|역할)/i.test(labelLow)) {
        if (!item.title) item.title = clipText(value, 200) ?? "";
        continue;
      }
      if (/(?:설명|내용|description|note|content)/i.test(labelLow)) {
        item.description = clipText(value, 1000);
        continue;
      }
      // 매칭 못한 라벨: → 원본 보존.
      remaining.push(line);
      continue;
    }
    remaining.push(line);
  }

  // pass 2: free-form fallback.
  for (let i = 0; i < remaining.length; i++) {
    const line = remaining[i];

    // URL → credential_url.
    const url = extractHttpUrl(line);
    if (url && !item.credential_url) {
      item.credential_url = url;
      // line 의 URL 만 남기지 않고 그대로 description 후보로도 쓸 수 있게 진행.
    }

    // 날짜 range → start/end.
    if (!item.start_date) {
      const [s, e] = splitDateRange(line);
      if (s) {
        item.start_date = s;
        if (e) item.end_date = e;
        // 날짜만 있는 줄이면 skip.
        const dateOnly = line
          .replace(/[\d\s.\-\/~년월일–—to\-]/gi, "")
          .trim();
        if (dateOnly.length < 3) continue;
      }
    }

    // education / certification / award / language 는 organization (학교/발급기관/주최/시험기관)
    // 이 first-class 정보. 첫 의미 있는 줄을 organization 으로 우선 매핑.
    // entity 주석 (student-resume-item.ts): education school=organization, 학위/전공=title.
    // experience / project / activity / skill 은 title (직무/역할/도구) 이 first-class.
    const orgFirst =
      type === "education" ||
      type === "certification" ||
      type === "award" ||
      type === "language";

    if (orgFirst) {
      if (!item.organization) {
        item.organization = clipText(line, 200);
        continue;
      }
      if (!item.title) {
        item.title = clipText(line, 200) ?? "";
        continue;
      }
    } else {
      if (!item.title) {
        item.title = clipText(line, 200) ?? "";
        continue;
      }
      if (!item.organization && i <= 2) {
        item.organization = clipText(line, 200);
        continue;
      }
    }
    // 나머지 → description 누적.
    item.description = item.description
      ? `${item.description}\n${line}`
      : line;
  }

  if (item.description) {
    item.description = item.description.slice(0, 1000);
  }

  // title 끝까지 못 정했으면 fallback.
  if (!item.title) {
    item.title = clean[0]?.slice(0, 200) ?? "";
  }
  if (!item.title) {
    warnings.push(`${type} 항목 1건의 제목을 인식하지 못했어요.`);
    return null;
  }

  return item;
}

/** "2020-01 ~ 2023-12" / "2020.01 - 2023.12" / "2020.1~2022.5" 등 → [start, end]. */
function splitDateRange(raw: string): [string | null, string | null] {
  // 구분자: ~ 〜 ─ ‐ ‒ – — - "to" "부터" "까지"
  const norm = raw
    .replace(/[~〰‐-―~–—]+/g, "~")
    .replace(/\bto\b/gi, "~");
  const parts = norm
    .split("~")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return [null, null];
  const start = parseFlexibleDate(parts[0]);
  if (parts.length === 1) return [start, null];
  // "현재" / "재직 중" / "present" → null end.
  if (/(현재|present|now|재직|진행)/i.test(parts[1])) return [start, null];
  return [start, parseFlexibleDate(parts[1])];
}

function parseFlexibleDate(raw: string): string | null {
  if (!raw) return null;
  // 풀 YYYY-MM-DD.
  const full = normalizeBirthDate(raw);
  if (full) return full;
  // YYYY-MM 만 → 01 일 패딩.
  const ym = /(\d{4})[.\-\/](\d{1,2})/.exec(raw);
  if (ym) return toIsoDate(Number(ym[1]), Number(ym[2]), 1);
  // YYYY 만 → 01-01.
  const y = /\b(\d{4})\b/.exec(raw);
  if (y) return toIsoDate(Number(y[1]), 1, 1);
  return null;
}

// ----- 빈 결과 ----------------------------------------------------------

function emptyParsed(warnings: string[] = []): ParsedResume {
  return {
    profile: {
      name_ko: null,
      name_en: null,
      phone: null,
      birth_date: null,
      gender: null,
      visa_type: null,
      months_in_korea: null,
      website_url: null,
    },
    career_target: {
      target_role_category: null,
      target_role_text: null,
      target_companies: [],
      desired_start_date: null,
      self_pitch: null,
    },
    resume_items: [],
    warnings,
  };
}
