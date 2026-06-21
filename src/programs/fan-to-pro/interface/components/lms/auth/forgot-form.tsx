"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import {
  Alert,
  AlertDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/alert";
import { forgotPasswordAction } from "@/src/programs/fan-to-pro/interface/server-actions/lms-auth-actions";

export function ForgotForm() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("locale", locale);
    startTransition(async () => {
      const result = await forgotPasswordAction(formData);
      if (result.status === "ok") {
        setDone(true);
      } else {
        setError(result.message);
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일함을
            확인해주세요.
          </AlertDescription>
        </Alert>
        <Link
          href={`/${locale}/auth/login` as Route}
          className="block text-center text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
        >
          로그인 페이지로 돌아가기
        </Link>
      </div>
    );
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
          placeholder="가입한 이메일을 입력해주세요"
          disabled={pending}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "발송 중..." : "비밀번호 재설정 링크 받기"}
      </Button>

      <div className="text-center text-sm">
        <Link
          href={`/${locale}/auth/login` as Route}
          className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </form>
  );
}
