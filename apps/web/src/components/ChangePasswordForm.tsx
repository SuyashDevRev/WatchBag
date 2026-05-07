import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "../lib/auth-client";
import { Button } from "./Button";
import { Input } from "./Input";

// Client-side only — the server-side rules (bcrypt hashing, timing-safe
// compare, session rotation) live in Better Auth.
const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different",
  });

type Values = z.input<typeof ChangePasswordSchema>;

export function ChangePasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    // `revokeOtherSessions: true` signs out every other device after the change
    // so a stolen session can't survive a password rotation.
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    setSubmitting(false);

    if (error) {
      const message = error.message ?? "Couldn't change password";
      // Better Auth surfaces "invalid password" on the current-password field.
      if (/invalid/i.test(message) || /incorrect/i.test(message)) {
        form.setError("currentPassword", { message: "That's not your current password" });
        return;
      }
      toast.error(message);
      return;
    }
    toast.success("Password changed. Other devices have been signed out.");
    form.reset();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        placeholder="Your existing password"
        error={form.formState.errors.currentPassword?.message}
        {...form.register("currentPassword")}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        placeholder="Minimum 8 characters"
        error={form.formState.errors.newPassword?.message}
        {...form.register("newPassword")}
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter your new password"
        error={form.formState.errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
