/**
 * fetchBundlesForShowcase — /bundles 및 우산 랜딩 미리보기용 bundle grid.
 *
 * B0083 Phase 1 Slice 2b. Iris.
 *
 * shape: `Bundle[]` (presentation/showcase/types.ts).
 *
 * 필터:
 *   - status='open' 만 (isBundlePubliclyPurchasable).
 *
 * 가격 매핑 (BundleCard 요구):
 *   - priceKrw          : bundles.price_krw (할인 후 최종)
 *   - originalPriceKrw  : SUM(bundle_courses.course.price_krw)
 *   - discountKrw       : originalPriceKrw - priceKrw (양쪽 null 이면 null)
 *   - courseCount       : bundle_courses row 수
 *
 * 다중 bundle 최적화:
 *   - N+1 회피: 모든 bundle 의 bundle_courses + courses.price_krw 를
 *     한 query 로 join. 100개 미만 규모에서 충분.
 *
 * 실패 정책: Supabase 미연결 시 empty.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type { Bundle as BundleWire } from "@/src/programs/growth-career/presentation/components/showcase/types";

export type FetchBundlesForShowcaseInput = {
  programSlug: string | null;
  detailHrefFn: (bundleSlug: string) => string;
  maxItems?: number;
};

export async function fetchBundlesForShowcase(
  input: FetchBundlesForShowcaseInput,
): Promise<BundleWire[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  let programId: string | null = null;
  if (input.programSlug) {
    const { data: program } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", input.programSlug)
      .maybeSingle();
    programId = (program as { id: string } | null)?.id ?? null;
    if (!programId) return [];
  }

  let query = supabase
    .from("bundles")
    .select("id, slug, title_ko, description, price_krw")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (programId) query = query.eq("program_id", programId);

  const { data: bundleRows } = await query;
  const bundles = (bundleRows ?? []) as Array<{
    id: string;
    slug: string;
    title_ko: string;
    description: string | null;
    price_krw: number | null;
  }>;
  const limited =
    typeof input.maxItems === "number"
      ? bundles.slice(0, input.maxItems)
      : bundles;
  if (limited.length === 0) return [];

  // bundle_courses join courses.price_krw. 한 번의 IN 쿼리.
  const bundleIds = limited.map((b) => b.id);
  const { data: bcRows } = await supabase
    .from("bundle_courses")
    .select("bundle_id, courses!inner(price_krw)")
    .in("bundle_id", bundleIds);

  const originalByBundle = new Map<string, number>();
  const countByBundle = new Map<string, number>();
  for (const row of bcRows ?? []) {
    const r = row as {
      bundle_id: string;
      courses: { price_krw: number | null } | { price_krw: number | null }[];
    };
    const priceRow = Array.isArray(r.courses) ? r.courses[0] : r.courses;
    const price = priceRow?.price_krw ?? 0;
    originalByBundle.set(
      r.bundle_id,
      (originalByBundle.get(r.bundle_id) ?? 0) + price,
    );
    countByBundle.set(
      r.bundle_id,
      (countByBundle.get(r.bundle_id) ?? 0) + 1,
    );
  }

  return limited.map((b) => {
    const originalPriceKrw = originalByBundle.get(b.id) ?? null;
    const priceKrw = b.price_krw;
    const discountKrw =
      originalPriceKrw !== null && priceKrw !== null
        ? Math.max(0, originalPriceKrw - priceKrw)
        : null;
    return {
      slug: b.slug,
      name: b.title_ko,
      description: b.description,
      priceKrw,
      originalPriceKrw,
      discountKrw,
      courseCount: countByBundle.get(b.id) ?? 0,
      detailHref: input.detailHrefFn(b.slug),
    };
  });
}
