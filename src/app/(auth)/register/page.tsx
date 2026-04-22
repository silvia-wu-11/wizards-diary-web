"use client";

import { register } from "@/app/actions/auth";
import { PasswordInput } from "@/app/components/auth/PasswordInput";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useDiaryStore } from "@/app/store";
import { registerSchema } from "@/lib/auth/validators";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError("");
    setConfirmPasswordError("");
    setFormError("");

    const parsed = registerSchema.safeParse({
      username,
      password,
      confirmPassword,
      name: name || undefined,
    });

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      setUsernameError(flattened.fieldErrors.username?.[0] ?? "");
      setConfirmPasswordError(
        flattened.fieldErrors.confirmPassword?.[0] ??
          flattened.formErrors?.[0] ??
          "",
      );
      if (flattened.fieldErrors.password?.[0])
        setFormError(flattened.fieldErrors.password[0]);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("username", username);
      formData.set("password", password);
      formData.set("confirmPassword", confirmPassword);
      if (name) formData.set("name", name);

      const result = await register(formData);

      if (!result.success) {
        const normalizedError = result.error.toLowerCase();
        if (normalizedError.includes("username"))
          setUsernameError(result.error);
        else if (normalizedError.includes("password"))
          setConfirmPasswordError(result.error);
        else setFormError(result.error);
        return;
      }
      // 注册成功后自动登录并跳转到首页
      const signInResult = await signIn("credentials", {
        username: parsed.data.username,
        password: parsed.data.password,
        redirect: false,
      });
      if (!signInResult) {
        setFormError("Your account is ready. Sign in to continue.");
        return;
      }
      if (signInResult?.error) {
        setFormError("Your account is ready. Sign in to continue.");
        return;
      }
      if (signInResult?.ok) {
        useDiaryStore.setState({ isLoaded: false });
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setFormError("The binding ritual failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="font-display text-2xl tracking-widest text-faded-gold">
          Create Account
        </h1>
        <p className="mt-2 text-sm text-parchment-white/80">
          Join the diary and bind your first sigil.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 [&_label[data-slot=label]]:text-[rgb(201,184,150)]"
        data-onboarding-target="step1-login">
        {formError && (
          <div
            role="alert"
            className="rounded-md border border-vintage-burgundy/50 bg-vintage-burgundy/20 px-3 py-2 text-sm text-red-200">
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
            aria-invalid={!!usernameError}
          />
          {usernameError && (
            <p className="text-sm text-red-300">{usernameError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
            error={confirmPasswordError}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nickname (Optional)</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-parchment-white/10 border-rusty-copper text-parchment-white placeholder:text-parchment-white/50"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-vintage-burgundy hover:bg-vintage-burgundy/90 text-parchment-white">
          {isLoading ? "Binding Account..." : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm text-parchment-white/70">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-faded-gold underline hover:no-underline">
          Sign in instead
        </Link>
      </p>
    </div>
  );
}
