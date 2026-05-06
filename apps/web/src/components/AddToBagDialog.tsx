import { Link } from "react-router";
import { toast } from "sonner";
import type { WatchStatus } from "@watchbag/shared";

import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { useSession } from "../lib/auth-client";
import { trpc } from "../lib/trpc";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
}

const STATUS_OPTIONS: { value: WatchStatus; label: string }[] = [
  { value: "current", label: "Currently Watching" },
  { value: "watched", label: "Watched" },
  { value: "on_hold", label: "On Hold" },
];

export function AddToBagDialog({ open, onClose, title, tmdbId, mediaType }: Props) {
  const session = useSession();
  const utils = trpc.useUtils();
  const myBags = trpc.watchbag.listMine.useQuery(undefined, {
    enabled: open && !!session.data?.user,
  });

  const addMutation = trpc.show.addToBag.useMutation({
    onSuccess() {
      toast.success(`Added “${title}”`);
      utils.watchbag.listMine.invalidate();
      onClose();
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  function handleAdd(watchbagId: string, status: WatchStatus) {
    addMutation.mutate({ watchbagId, tmdbId, mediaType, status });
  }

  // Not signed in → prompt to sign in.
  if (!session.data?.user) {
    return (
      <Dialog open={open} onClose={onClose} title="Sign in to add">
        <p className="text-sm text-ink-200">
          Sign in to start building your watchbags.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Link
            to="/login"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-full bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-500"
          >
            Sign in
          </Link>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add to a watchbag">
      <p className="mb-5 text-sm text-ink-200">
        <span className="font-medium text-ink-50">{title}</span> · pick a bag and status.
      </p>

      {myBags.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-700/50" />
          ))}
        </div>
      )}

      {!myBags.isLoading && myBags.data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-ink-600/60 bg-ink-800/40 py-8 text-center">
          <p className="text-sm text-ink-200">You don't have any watchbags yet.</p>
          <Link
            to="/mywatchbags"
            onClick={onClose}
            className="mt-4 inline-flex items-center rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Create your first bag
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {myBags.data?.map((bag) => (
          <div
            key={bag.id}
            className="flex items-center gap-3 rounded-xl border border-ink-600/50 bg-ink-800/60 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="line-clamp-1 text-sm font-medium text-ink-50">{bag.title}</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
                {bag.isPublic ? "Public" : "Private"}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleAdd(bag.id, opt.value)}
                  disabled={addMutation.isPending}
                  className="rounded-full border border-ink-600/60 px-2.5 py-1 text-[11px] text-ink-100 transition hover:border-brand-500/60 hover:bg-brand-600/10 hover:text-ink-50 disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
