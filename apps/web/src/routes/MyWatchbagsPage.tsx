import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Globe, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { CreateWatchbagInput } from "@watchbag/shared";

import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { Input } from "../components/Input";
import { trpc } from "../lib/trpc";

type FormValues = {
  title: string;
  description?: string;
  isPublic: boolean;
};

export function MyWatchbagsPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const bags = trpc.watchbag.listMine.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  const createMutation = trpc.watchbag.create.useMutation({
    onSuccess(row) {
      if (!row) return;
      toast.success("Watchbag created");
      utils.watchbag.listMine.invalidate();
      setCreateOpen(false);
      navigate(`/mywatchbags/${row.id}`);
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateWatchbagInput),
    defaultValues: { title: "", description: "", isPublic: false },
  });

  function handleCreate(values: FormValues) {
    createMutation.mutate({
      title: values.title,
      description: values.description || undefined,
      isPublic: values.isPublic,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-10 flex items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
            My watchbags
          </h1>
          <p className="mt-2 text-ink-200">Your personal watchlists.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New bag
        </Button>
      </motion.header>

      {bags.isLoading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-ink-800/70" />
          ))}
        </div>
      )}

      {!bags.isLoading && bags.data?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600/60 bg-ink-800/30 py-20 text-center">
          <div className="text-lg text-ink-100">No watchbags yet.</div>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-300">
            Make your first one — give it a name and start adding movies and shows.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-6">
            <Plus className="h-4 w-4" /> Create a watchbag
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {bags.data?.map((bag) => (
          <Link
            key={bag.id}
            to={`/mywatchbags/${bag.id}`}
            className="group overflow-hidden rounded-2xl border border-ink-600/40 bg-ink-800 transition hover:-translate-y-0.5 hover:border-brand-500/50"
          >
            <div className="relative aspect-[16/9] bg-gradient-to-br from-brand-900 via-ink-800 to-ink-900">
              {bag.coverImageUrl && (
                <img
                  src={bag.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              )}
              <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-ink-100 backdrop-blur">
                {bag.isPublic ? (
                  <>
                    <Globe className="h-3 w-3" /> Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" /> Private
                  </>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="line-clamp-1 font-medium text-ink-50">{bag.title}</div>
              {bag.description && (
                <div className="mt-1 line-clamp-2 text-xs text-ink-300">{bag.description}</div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          form.reset();
        }}
        title="New watchbag"
      >
        <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4" noValidate>
          <Input
            label="Title"
            placeholder="e.g. Sci-fi marathon"
            error={form.formState.errors.title?.message}
            {...form.register("title")}
          />
          <Input
            label="Description"
            placeholder="Optional — what's this bag about?"
            error={form.formState.errors.description?.message}
            {...form.register("description")}
          />
          <label className="flex items-center gap-3 rounded-xl border border-ink-600/60 bg-ink-800/50 px-4 py-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              {...form.register("isPublic")}
            />
            <span className="text-sm text-ink-100">
              Make public
              <span className="ml-1 text-xs text-ink-300">(visible in Explore)</span>
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
