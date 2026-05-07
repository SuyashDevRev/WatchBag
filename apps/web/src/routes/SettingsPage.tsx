import { motion } from "framer-motion";
import { Camera, LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "../components/Button";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { Input } from "../components/Input";
import { ThemeToggle } from "../components/ThemeToggle";
import { authClient, useSession } from "../lib/auth-client";
import { uploadToCloudinary } from "../lib/cloudinary";
import { trpc } from "../lib/trpc";

export function SettingsPage() {
  const navigate = useNavigate();
  const session = useSession();
  const user = session.data?.user;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const signUpload = trpc.upload.signImageUpload.useMutation();

  if (!user) return null;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }

    setUploading(true);
    try {
      const signed = await signUpload.mutateAsync({ kind: "avatar" });
      const url = await uploadToCloudinary(file, signed);
      const { error } = await authClient.updateUser({ image: url });
      if (error) throw new Error(error.message ?? "Couldn't save avatar");
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveProfile() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name can't be empty");
      return;
    }
    if (trimmed === user?.name) return;
    setSaving(true);
    const { error } = await authClient.updateUser({ name: trimmed });
    setSaving(false);
    if (error) {
      toast.error(error.message ?? "Couldn't save");
      return;
    }
    toast.success("Profile updated");
  }

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    navigate("/");
  }

  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-12"
      >
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
          Settings
        </h1>
        <p className="mt-2 text-ink-200">Manage your profile and appearance.</p>
      </motion.header>

      {/* Profile */}
      <Section title="Profile" description="Your name and photo as they appear to others.">
        <div className="flex items-start gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-600 text-2xl font-semibold text-white ring-2 ring-ink-600/60 transition hover:ring-brand-500/60 disabled:opacity-60"
            aria-label="Change avatar"
          >
            {user.image ? (
              <img src={user.image} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
            <div className="absolute inset-0 grid place-items-center bg-ink-900/70 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="min-w-0 flex-1">
            <div className="grid gap-3">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
              />
              <Input
                label="Email"
                value={user.email}
                readOnly
                className="cursor-not-allowed opacity-70"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleSaveProfile}
                disabled={saving || uploading || name.trim() === (user.name ?? "")}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {uploading && (
                <span className="inline-flex items-center text-xs text-ink-300">
                  Uploading avatar…
                </span>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Security */}
      <Section
        title="Security"
        description="Change your password. Other devices will be signed out when you save."
      >
        <ChangePasswordForm />
      </Section>

      {/* Appearance */}
      <Section title="Appearance" description="Pick a theme. Defaults follow your system.">
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-xs text-ink-300">Click to cycle through light, system, and dark.</span>
        </div>
      </Section>

      {/* Session */}
      <Section title="Session" description="Manage your current session.">
        <Button variant="secondary" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 rounded-2xl border border-ink-600/40 bg-ink-800/40 p-6">
      <header className="mb-5">
        <h2 className="font-display text-xl font-semibold text-ink-50">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-300">{description}</p>}
      </header>
      {children}
    </section>
  );
}
