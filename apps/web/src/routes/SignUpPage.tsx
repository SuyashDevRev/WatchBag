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

const SignUpSchema = z.object({
  name: z.string().trim().min(1, "Your name").max(80),
  email: z.string().email("That doesn't look like an email"),
  password: z.string().min(8, "At least 8 characters"),
});
type SignUpValues = z.infer<typeof SignUpSchema>;

export function SignUpPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") ?? "/";
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onBlur",
  });

  useEffect(() => {
    if (session.data?.user) navigate(redirect, { replace: true });
  }, [session.data, navigate, redirect]);

  async function onSubmit(values: SignUpValues) {
    setSubmitting(true);
    const { error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Couldn't create account");
      return;
    }
    toast.success("Welcome to WatchBag");
    navigate(redirect, { replace: true });
  }

  function handleGoogle() {
    const target = redirect.startsWith("http")
      ? redirect
      : `${window.location.origin}${redirect}`;
    authClient.signIn.social({ provider: "google", callbackURL: target });
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building your first watchbag in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Name"
          placeholder="What should we call you?"
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register("name")}
        />
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
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />

        <Button type="submit" size="full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
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
