/**
 * BundleCourse repository — B0068 ADR 0013.
 *
 * bundle × course M:N join. bundle 상세 페이지 / 결제 시 unpack 에 사용.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  BundleCourseSchema,
  type BundleCourse,
} from "@/src/programs/fan-to-pro/domain/entities/bundle-course";

const TABLE = "bundle_courses";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** 특정 bundle 의 course join row 목록. order_idx ASC. */
export async function fetchBundleCoursesByBundle(
  bundleId: string,
): Promise<BundleCourse[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("bundle_id", bundleId)
    .order("order_idx", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => BundleCourseSchema.parse(row));
}

/** 특정 course 가 포함된 bundle 목록 (course 상세 페이지에서 "이 강의가 포함된 번들" 노출용). */
export async function fetchBundleCoursesByCourse(
  courseId: string,
): Promise<BundleCourse[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("course_id", courseId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => BundleCourseSchema.parse(row));
}

export type InsertBundleCourseInput = {
  bundle_id: string;
  course_id: string;
  order_idx?: number;
};

export async function insertBundleCourse(
  input: InsertBundleCourseInput,
): Promise<BundleCourse> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      bundle_id: input.bundle_id,
      course_id: input.course_id,
      order_idx: input.order_idx ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return BundleCourseSchema.parse(data);
}

/** bundle 에서 course 제거. */
export async function deleteBundleCourse(
  bundleId: string,
  courseId: string,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("bundle_id", bundleId)
    .eq("course_id", courseId);
  if (error) throw new Error(error.message);
}
