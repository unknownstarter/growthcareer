"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import { Alert, AlertDescription } from "@/src/programs/fan-to-pro/interface/components/lms/ui/alert";
import { resetPasswordAction } from "@/src/programs/fan-to-pro/interface/server-actions/lms-auth-actions";

export function ResetForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      if (result.status === "ok") {
        setDone(true);
        setTimeout(() => router.replace("/lms/login" as Route), 2000);
      } else {
        setError(result.message);
      }
    });
  }

  if (done) {
    return (
      <Alert>
        <AlertDescription>
          비밀번호를 변경했습니다. 잠시 후 로그인 페이지로 이동합니다.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-[var(--foreground)]">
          새 비밀번호
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="8자 이상"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-[var(--foreground)]">
          비밀번호 확인
        </Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="다시 입력해주세요"
          disabled={pending}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "변경 중..." : "비밀번호 변경"}
      </Button>

      <div className="text-center text-sm">
        <Link
          href="/lms/login"
          className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </form>
  );
}
