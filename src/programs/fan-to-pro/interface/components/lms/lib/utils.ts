/**
 * shadcn/ui 표준 `cn()` 헬퍼.
 * Tailwind class 병합 (conflict 시 뒤쪽이 이김) + clsx 의 truthy 필터링.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
