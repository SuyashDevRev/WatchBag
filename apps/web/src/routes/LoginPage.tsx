import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { GoogleButton } from "../components/GoogleButton";
import { Input } from "../components/Input";
import { authClient, useSession } from "../lib/auth-client";

const LoginSchema = z.object({
  email: z.string().email("That doesn't look like an email"),
  password: z.string().min(1, "Required"),
});
type LoginValues = z.infer<typeof LoginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") ?? "/";
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  useEffect(() => {
    if (session.data?.user) navigate(redirect, { replace: true });
  }, [session.data, navigate, redirect]);

  // Surface OAuth errors that Better Auth bounces us back with (e.g. ?error=state_mismatch).
  useEffect(() => {
    const errorCode = params.get("error");
    if (!errorCode) return;
    const message =
      errorCode === "state_mismatch"
        ? "Your sign-in link expired. Please try again."
        : `Sign-in failed (${errorCode}).`;
    toast.error(message);
  }, [params]);

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Couldn't sign in");
      return;
    }
    navigate(redirect, { replace: true });
  }

  function handleGoogle() {
    // Better Auth resolves relative callbackURLs against the server's baseURL
    // (localhost:3000), which doesn't serve our app. Anchor to the current
    // web origin so the final redirect lands on the frontend.
    const target = redirect.startsWith("http")
      ? redirect
      : `${window.location.origin}${redirect}`;
    authClient.signIn.social({ provider: "google", callbackURL: target });
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Pick up where you left off."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="text-brand-400 hover:text-brand-300">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Your password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />

        <Button type="submit" size="full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>

        <Divider />

        <GoogleButton onClick={handleGoogle} disabled={submitting} />
      </form>
    </AuthLayout>
  );
}

function Divider() {
  return (
    <div className="relative py-1 text-center">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink-600/60" />
      <span className="relative inline-block bg-ink-900 px-3 text-[11px] uppercase tracking-[0.22em] text-ink-300">
        or
      </span>
    </div>
  );
}
