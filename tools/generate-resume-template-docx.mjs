#!/usr/bin/env node
/**
 * 잡코리아 패턴 이력서 빈 양식 .docx 생성 (paragraph 기반, 표 없음).
 *
 * 이전 v1 (표 기반) = 워드에서 셀 텍스트 줄바꿈 깨짐 (한 글자씩 세로).
 * v2: 표 제거 + paragraph + 빈 줄. 학생이 워드에서 직접 타이핑 쉬움.
 *
 * 출력: docs/share/Fan-to-Pro-이력서-양식.docx
 */
import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageOrientation,
  ShadingType,
  BorderStyle,
} from "docx";

const BLUE_PINK = "FF5B6E"; // brand-pink

function title() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "이 력 서", bold: true, size: 56, color: "1A1D23" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({ text: "Resume", size: 24, color: "8B94A3" }),
      ],
    }),
  ];
}

// 섹션 헤더 (회색 박스 — paragraph 의 shading 으로)
function sectionHeader(ko, en) {
  return new Paragraph({
    spacing: { before: 360, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: "F0F2F5" },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BLUE_PINK },
      left: { style: BorderStyle.SINGLE, size: 24, color: BLUE_PINK },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    children: [
      new TextRun({ text: `  ${ko}  `, bold: true, size: 26, color: "1A1D23" }),
      new TextRun({ text: ` / ${en}`, size: 18, color: "8B94A3" }),
    ],
  });
}

// 라벨 + 빈 줄 한 set
function field(label) {
  return [
    new Paragraph({
      spacing: { before: 100, after: 40 },
      children: [
        new TextRun({ text: `▪ ${label}`, bold: true, size: 22, color: "1A1D23" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "                                                                                                                                ",
          color: "FFFFFF",
        }),
      ],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "D0D5DC" },
      },
    }),
  ];
}

// 항목 (예: 학력 / 경력 — 라벨 + 4 빈 줄 한 set)
function entry(n) {
  return [
    new Paragraph({
      spacing: { before: 240, after: 60 },
      children: [
        new TextRun({ text: `[${n}] `, bold: true, size: 20, color: BLUE_PINK }),
        new TextRun({ text: "기간 / 기관 / 직무 / 내용을 자유롭게 작성", size: 18, color: "8B94A3", italics: true }),
      ],
    }),
    ...Array.from({ length: 3 }, () =>
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: "                                                                                                                                ",
            color: "FFFFFF",
          }),
        ],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "D0D5DC" },
        },
      }),
    ),
  ];
}

function entries(count) {
  const arr = [];
  for (let i = 1; i <= count; i++) arr.push(...entry(i));
  return arr;
}

// 자기 PR (긴 줄 8개)
function selfPitchLines() {
  const arr = [
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({
          text: "본인의 강점, 경험, 목표를 자유롭게 작성해주세요. (300자 이내 권장)",
          size: 18,
          color: "8B94A3",
          italics: true,
        }),
      ],
    }),
  ];
  for (let i = 0; i < 8; i++) {
    arr.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: "                                                                                                                                ",
            color: "FFFFFF",
          }),
        ],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "D0D5DC" },
        },
      }),
    );
  }
  return arr;
}

const doc = new Document({
  creator: "Fan to Pro / Growth Career",
  title: "이력서 양식",
  styles: { default: { document: { run: { font: "Pretendard", size: 22 } } } },
  sections: [
    {
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
        },
      },
      children: [
        ...title(),

        // 0. 사진 안내 (별 줄)
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          border: {
            top: { style: BorderStyle.DASHED, size: 4, color: "D0D5DC" },
            bottom: { style: BorderStyle.DASHED, size: 4, color: "D0D5DC" },
            left: { style: BorderStyle.DASHED, size: 4, color: "D0D5DC" },
            right: { style: BorderStyle.DASHED, size: 4, color: "D0D5DC" },
          },
          children: [
            new TextRun({
              text: " 사진 첨부 영역 (3 x 4 cm)  ",
              size: 20,
              color: "8B94A3",
            }),
          ],
        }),

        sectionHeader("인적사항", "Personal Information"),
        ...field("성명 (한글)"),
        ...field("성명 (영문)"),
        ...field("생년월일 (YYYY-MM-DD)"),
        ...field("성별"),
        ...field("국적"),
        ...field("비자 종류"),
        ...field("연락처 (휴대폰)"),
        ...field("이메일"),
        ...field("주소"),
        ...field("한국 거주 기간 (개월)"),

        sectionHeader("학력", "Education"),
        ...entries(3),

        sectionHeader("경력", "Work Experience"),
        ...entries(4),

        sectionHeader("자격증", "Certifications"),
        ...entries(3),

        sectionHeader("수상", "Awards"),
        ...entries(2),

        sectionHeader("어학", "Languages"),
        ...entries(3),

        sectionHeader("프로젝트", "Projects"),
        ...entries(3),

        sectionHeader("희망 진로", "Career Target"),
        ...field("희망 직무"),
        ...field("희망 회사 (복수 가능)"),
        ...field("희망 시작 시기"),

        sectionHeader("자기 PR", "Self Pitch"),
        ...selfPitchLines(),

        // footer
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 40 },
          children: [
            new TextRun({
              text: "Fan to Pro 1기  /  Growth Career",
              size: 18,
              color: "8B94A3",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "growthcareer.xyz",
              size: 16,
              color: "8B94A3",
            }),
          ],
        }),
      ],
    },
  ],
});

const outDir = path.resolve("docs/share");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "Fan-to-Pro-이력서-양식.docx");
const buf = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buf);
console.log(`✓ Generated: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
