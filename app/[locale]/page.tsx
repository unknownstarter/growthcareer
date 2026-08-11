import { redirect } from "@/src/i18n/navigation";

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Use the locale-aware redirect so `/` -> `/fan-to-pro/2` and `/ko` -> `/ko/fan-to-pro/2`.
  // 방문자는 현재 열린 기수(2기 모집) 페이지에 바로 착지. 기수 리스트는 GNB 로 진입.
  redirect({ href: "/fan-to-pro/2", locale });
}
