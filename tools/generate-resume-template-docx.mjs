#!/usr/bin/env node
/**
 * 잡코리아 패턴 이력서 빈 양식 .docx 생성.
 *
 * 학생들에게 카톡/이메일로 공유. 받아서 워드에서 직접 채워 작성 가능.
 * 출력: docs/share/Fan-to-Pro-이력서-양식.docx
 */
import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation,
  TabStopType,
  TabStopPosition,
} from "docx";

const GRAY = "F0F2F5";
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "D0D5DC" };
const ALL_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
};

function h2(text) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: GRAY },
    children: [
      new TextRun({
        text: `  ${text}  `,
        bold: true,
        size: 22,
        color: "1A1D23",
      }),
    ],
  });
}

function blank(label) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20 }),
      new TextRun({
        text: "________________________________________",
        color: "8B94A3",
        size: 20,
      }),
    ],
  });
}

function row(cells, widthsPct) {
  return new TableRow({
    children: cells.map((c, i) =>
      new TableCell({
        width: { size: widthsPct[i], type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        borders: ALL_BORDERS,
        children: Array.isArray(c) ? c : [c],
      }),
    ),
  });
}

function cellTitle(text) {
  return new Paragraph({
    children: [
      new TextRun({ text, bold: true, size: 18, color: "4F5763" }),
    ],
  });
}
function cellBlank() {
  return new Paragraph({
    children: [
      new TextRun({ text: "                              ", color: "FFFFFF" }),
    ],
  });
}

// 표 — 학력/경력/자격증/수상/어학/프로젝트 공통 (5 빈 row)
function repeatTable(headers, widthsPct, rows = 4) {
  const rowsArr = [
    new TableRow({
      tableHeader: true,
      children: headers.map((h, i) =>
        new TableCell({
          width: { size: widthsPct[i], type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: GRAY },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          borders: ALL_BORDERS,
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 18 })],
            }),
          ],
        }),
      ),
    }),
  ];
  for (let i = 0; i < rows; i++) {
    rowsArr.push(
      new TableRow({
        children: headers.map((_, j) =>
          new TableCell({
            width: { size: widthsPct[j], type: WidthType.PERCENTAGE },
            margins: { top: 140, bottom: 140, left: 120, right: 120 },
            borders: ALL_BORDERS,
            children: [cellBlank()],
          }),
        ),
      }),
    );
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rowsArr,
  });
}

const doc = new Document({
  creator: "Fan to Pro / Growth Career",
  title: "이력서 양식",
  styles: {
    default: {
      document: { run: { font: "Pretendard", size: 20 } },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        // 상단 제목
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "이 력 서",
              bold: true,
              size: 48,
              color: "1A1D23",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 280 },
          children: [
            new TextRun({
              text: "Resume",
              size: 22,
              color: "8B94A3",
            }),
          ],
        }),

        // 인적사항 표 (사진 + 정보)
        h2("인적사항 / Personal Information"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  rowSpan: 4,
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                  borders: ALL_BORDERS,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "\n\n\n사 진\n3 x 4 cm\n\n\n",
                          color: "8B94A3",
                          size: 18,
                        }),
                      ],
                    }),
                  ],
                }),
                ...["성명 (한글)", "성명 (영문)"].map(
                  (l, i) =>
                    new TableCell({
                      width: { size: 37.5, type: WidthType.PERCENTAGE },
                      margins: { top: 100, bottom: 100, left: 120, right: 120 },
                      borders: ALL_BORDERS,
                      children: [cellTitle(l), cellBlank()],
                    }),
                ),
              ],
            }),
            row(
              [
                [cellTitle("생년월일"), cellBlank()],
                [cellTitle("성별"), cellBlank()],
              ],
              [37.5, 37.5],
            ),
            row(
              [
                [cellTitle("국적"), cellBlank()],
                [cellTitle("비자 종류"), cellBlank()],
              ],
              [37.5, 37.5],
            ),
            row(
              [
                [cellTitle("연락처"), cellBlank()],
                [cellTitle("이메일"), cellBlank()],
              ],
              [37.5, 37.5],
            ),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  columnSpan: 3,
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  borders: ALL_BORDERS,
                  children: [cellTitle("주소"), cellBlank()],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  columnSpan: 3,
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  borders: ALL_BORDERS,
                  children: [cellTitle("한국 거주 기간 (개월)"), cellBlank()],
                }),
              ],
            }),
          ],
        }),

        // 학력
        h2("학력 / Education"),
        repeatTable(
          ["입학 / 졸업", "학교명", "전공 / 학과", "학위 / 졸업 여부"],
          [22, 30, 28, 20],
        ),

        // 경력
        h2("경력 / Work Experience"),
        repeatTable(
          ["기간", "회사명", "직무 / 직책", "주요 업무"],
          [18, 22, 22, 38],
        ),

        // 자격증
        h2("자격증 / Certifications"),
        repeatTable(
          ["취득일", "자격증명", "발급 기관", "비고"],
          [20, 30, 30, 20],
        ),

        // 수상
        h2("수상 / Awards"),
        repeatTable(
          ["수상일", "수상명", "주최 기관", "내용"],
          [18, 28, 24, 30],
        ),

        // 어학
        h2("어학 / Languages"),
        repeatTable(
          ["언어", "시험명", "점수 / 등급", "취득일"],
          [22, 28, 28, 22],
        ),

        // 프로젝트
        h2("프로젝트 / Projects"),
        repeatTable(
          ["기간", "프로젝트명", "역할 / 팀", "내용 및 성과"],
          [18, 24, 22, 36],
        ),

        // 희망 진로
        h2("희망 진로 / Career Target"),
        blank("희망 직무"),
        blank("희망 회사 (복수 가능)"),
        blank("희망 시작 시기"),

        // 자기 PR
        h2("자기 PR / Self Pitch"),
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
        ...Array.from(
          { length: 8 },
          () =>
            new Paragraph({
              spacing: { before: 60, after: 60 },
              children: [
                new TextRun({
                  text: "________________________________________________________________________________________",
                  color: "D0D5DC",
                }),
              ],
            }),
        ),

        // 마무리
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 360, after: 60 },
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
