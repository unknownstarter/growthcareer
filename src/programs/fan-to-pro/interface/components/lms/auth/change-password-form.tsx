"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import {
  Alert,
  AlertDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/alert";
import { changePasswordAction } from "@/src/programs/fan-to-pro/interface/server-actions/lms-auth-actions";

/**
 * 첫 로그인 강제 PW 변경 폼 (ADR 0008 §4).
 *
 * reset-form 과 다른 점: old PW 확인 X (이미 로그인 상태). 성공 시 user_profiles.
 * must_change_password=false + role 따라 dashboard redirect.
 */
export function ChangePasswordForm({
  redirectTo,
}: {
  redirectTo: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (result.status === "ok") {
        router.replace(redirectTo as Route);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Alert>
        <AlertDescription>
          첫 로그인입니다. 안전한 비밀번호로 변경해주세요.
        </AlertDescription>
      </Alert>

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
          minLength={10}
          placeholder="10자 이상"
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
          minLength={10}
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
        {pending ? "변경 중..." : "비밀번호 설정 완료"}
      </Button>
    </form>
  );
}
