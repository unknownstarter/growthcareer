"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import {
  Alert,
  AlertDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/alert";
import { loginAction } from "@/src/programs/fan-to-pro/interface/server-actions/lms-auth-actions";

const errorMessages: Record<string, string> = {
  no_profile: "사용자 프로필이 없습니다. 운영자에게 문의해주세요.",
  no_membership: "기수에 등록되어 있지 않습니다. 운영자에게 문의해주세요.",
  cohort_missing: "기수 정보를 찾을 수 없습니다. 운영자에게 문의해주세요.",
  server_unavailable: "잠시 후 다시 시도해주세요.",
  auth_callback: "인증 링크가 만료되었습니다. 새로 발송된 링크를 사용해주세요.",
};

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(() => {
    const e = sp.get("error");
    return e ? (errorMessages[e] ?? "로그인할 수 없습니다.") : null;
  });

  function onSubmit(formData: FormData) {
    setError(null);
    const next = sp.get("next");
    if (next) formData.set("next", next);
    formData.set("locale", locale);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result.status === "ok") {
        router.replace(result.redirectTo as Route);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[var(--foreground)]">
          이메일
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[var(--foreground)]">
          비밀번호
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="비밀번호 8자 이상"
          disabled={pending}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "로그인 중..." : "로그인"}
      </Button>

      <div className="text-center text-sm">
        <Link
          href={`/${locale}/auth/forgot-password` as Route}
          className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </div>
    </form>
  );
}
