/**
 * SHIM (ADR 0005 §4 Step 1) — 정전 본체는 infrastructure/auth/admin-role.ts.
 * 기존 호출처 import 경로 유지를 위해 1줄 re-export.
 * Strangler Fig: 자연스러운 수정 시점에 호출처 import 를 신규 경로로 이전.
 */
export * from "@/src/programs/fan-to-pro/infrastructure/auth/admin-role";
