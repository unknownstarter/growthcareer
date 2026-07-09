import { redirect } from "@/src/i18n/navigation";

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Use the locale-aware redirect so `/` -> `/fan-to-pro` and `/ko` -> `/ko/fan-to-pro`.
  redirect({ href: "/fan-to-pro", locale });
}
