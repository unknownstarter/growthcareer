/**
 * LMS 라이트 디자인 시스템 프리뷰 (임시, draft 검토용).
 *
 * 노아 스타일 방향 (2026-07-29) 을 한 화면에서 확인: 흰 배경 + near-black
 * 텍스트 + 핑크 (주) + 남보라 indigo (보조). AI-slop 회피, 관습적 스타일.
 *
 * 이 라우트는 파운데이션 승인 후 제거하거나 admin 게이트 뒤로 옮김.
 * 자체 light wrapper (data-theme=light) 로 LMS 토큰 적용.
 */
import type { Metadata } from "next";
import {
  Button,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/table";
import {
  PageTitle,
  H2,
  H3,
  Body,
  Muted,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/typography";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <H2>{title}</H2>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
        {children}
      </div>
    </section>
  );
}

export default function DesignSystemPreviewPage() {
  return (
    <div
      data-theme="light"
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="mx-auto max-w-[880px] px-6 py-14 space-y-14 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
        {/* Header */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>핑크 = 주 액션</Badge>
            <Badge variant="indigo">남보라 = 보조 accent</Badge>
          </div>
          <PageTitle>LMS 라이트 디자인 시스템</PageTitle>
          <Body>
            흰 배경에 near-black 텍스트, 핑크 주 액션, 남보라 보조 accent.
            AI 제네릭 스타일을 피하고 익숙하고 관습적인 컴포넌트로 구성했습니다.
          </Body>
          <Muted>Pretendard / 대비는 WCAG AA 기준 이상으로 조정</Muted>
        </header>

        {/* Colors */}
        <Section title="색상 팔레트">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch name="핑크 주 액션" hex="#db2777" fg="#fff" />
            <Swatch name="핑크 hover" hex="#be185d" fg="#fff" />
            <Swatch name="남보라 accent" hex="#4f46e5" fg="#fff" />
            <Swatch name="남보라 hover" hex="#4338ca" fg="#fff" />
            <Swatch name="핑크 soft" hex="#fce7f3" fg="#9d174d" />
            <Swatch name="남보라 soft" hex="#e0e7ff" fg="#3730a3" />
            <Swatch name="본문 텍스트" hex="#1a1a1a" fg="#fff" />
            <Swatch name="보조 텍스트" hex="#52525b" fg="#fff" />
          </div>
        </Section>

        {/* Typography */}
        <Section title="타이포그래피">
          <div className="space-y-3">
            <PageTitle>페이지 제목 28px Bold</PageTitle>
            <H2>섹션 제목 22px Bold</H2>
            <H3>서브섹션 18px Semibold</H3>
            <Body>
              본문 텍스트 15px. 실제 화면에서 학생과 운영자가 읽는 기본 크기.
              한글은 word-break keep-all 로 음절 중간 끊김을 방지합니다.
            </Body>
            <Muted>보조 설명 13px. 남발하지 않고 정말 부차적인 정보에만.</Muted>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="버튼">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button>주 액션 (핑크)</Button>
              <Button variant="accent">보조 accent (남보라)</Button>
              <Button variant="secondary">보조</Button>
              <Button variant="outline">아웃라인</Button>
              <Button variant="ghost">고스트</Button>
              <Button variant="destructive">삭제</Button>
              <Button variant="link">링크</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">큰 버튼</Button>
              <Button>기본</Button>
              <Button size="sm">작은 버튼</Button>
              <Button disabled>비활성</Button>
            </div>
          </div>
        </Section>

        {/* Form */}
        <Section title="폼 입력">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ds-name">이름</Label>
              <Input id="ds-name" placeholder="홍길동" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-cohort">기수 선택</Label>
              <Select>
                <SelectTrigger id="ds-cohort">
                  <SelectValue placeholder="기수를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Fan to Pro 1기</SelectItem>
                  <SelectItem value="2">Fan to Pro 2기</SelectItem>
                  <SelectItem value="3">Fan to Pro 3기</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ds-memo">메모</Label>
              <Textarea
                id="ds-memo"
                placeholder="상담 내용이나 특이사항을 적어주세요."
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline">취소</Button>
            <Button>저장</Button>
          </div>
        </Section>

        {/* Badges */}
        <Section title="뱃지 (상태 라벨)">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>기본</Badge>
            <Badge variant="pink">핑크</Badge>
            <Badge variant="indigo">남보라</Badge>
            <Badge variant="secondary">보조</Badge>
            <Badge variant="outline">아웃라인</Badge>
            <Badge variant="success">수료 완료</Badge>
            <Badge variant="warning">대기</Badge>
            <Badge variant="destructive">미납</Badge>
          </div>
        </Section>

        {/* Card */}
        <Section title="카드">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>수강생 현황</CardTitle>
                <CardDescription>Fan to Pro 1기 · 총 24명</CardDescription>
              </CardHeader>
              <CardContent>
                <Body>출석률 92%, 과제 제출 88%.</Body>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm">상세 보기</Button>
                <Button size="sm" variant="outline">
                  내보내기
                </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>수료증 발급</CardTitle>
                <CardDescription>발급 대기 6명</CardDescription>
              </CardHeader>
              <CardContent>
                <Body>수료 기준을 충족한 학생에게 일괄 발급할 수 있습니다.</Body>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="accent">
                  일괄 발급
                </Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        {/* Table */}
        <Section title="테이블">
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>기수</TableHead>
                  <TableHead>출석</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">김민준</TableCell>
                  <TableCell>1기</TableCell>
                  <TableCell>8/8</TableCell>
                  <TableCell>
                    <Badge variant="success">수료</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">이서연</TableCell>
                  <TableCell>1기</TableCell>
                  <TableCell>7/8</TableCell>
                  <TableCell>
                    <Badge variant="pink">진행 중</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">박지호</TableCell>
                  <TableCell>2기</TableCell>
                  <TableCell>3/8</TableCell>
                  <TableCell>
                    <Badge variant="warning">대기</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Swatch({
  name,
  hex,
  fg,
}: {
  name: string;
  hex: string;
  fg: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
      <div
        className="flex h-16 items-end p-2 text-xs font-semibold"
        style={{ backgroundColor: hex, color: fg }}
      >
        {hex}
      </div>
      <div className="px-2 py-1.5 text-[0.8125rem] text-[var(--foreground)]">
        {name}
      </div>
    </div>
  );
}
