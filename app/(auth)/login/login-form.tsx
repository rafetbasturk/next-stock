"use client";

import { useActionState } from "react";

import { loginAction, type LoginActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

const INITIAL_STATE: LoginActionState = {
  error: null,
};

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={action} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="username">Kullanıcı Adı</FieldLabel>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="admin"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Şifre</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        {state.error ? (
          <p className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
