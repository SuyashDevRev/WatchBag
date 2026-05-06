import { Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { WatchStatus } from "@watchbag/shared";

import { Dialog } from "./Dialog";
import { trpc } from "../lib/trpc";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

interface Props {
  open: boolean;
  onClose: () => void;
  watchbagId: string;
}

const STATUS_PILLS: { value: WatchStatus; label: string }[] = [
  { value: "current", label: "Watching" },
  { value: "watched", label: "Watched" },
  { value: "on_hold", label: "On Hold" },
];

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function AddToBoardDialog({ open, onClose, watchbagId }: Props) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 300);
  const trimmed = debounced.trim();
  const utils = trpc.useUtils();

  const results = trpc.show.search.useQuery(
    { query: trimmed },
    { enabled: open && trimmed.length > 0 },
  );

  const addMutation = trpc.show.addToBag.useMutation({
    onSuccess(_data, variables) {
      utils.watchbag.get.invalidate({ id: variables.watchbagId });
      toast.success("Added");
      // Close right after a successful add — user's back on the board.
      onClose();
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function handleAdd(tmdbId: number, mediaType: "movie" | "tv", status: WatchStatus) {
    addMutation.mutate({ watchbagId, tmdbId, mediaType, status });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add to this watchbag">
      <div className="relative mb-5">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-200" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search movies and shows…"
          className="w-full rounded-full border border-ink-600/60 bg-ink-800/70 py-2.5 pl-10 pr-4 text-sm text-ink-50 placeholder:text-ink-300 outline-none transition focus:border-brand-500/60 focus:bg-ink-800 focus:ring-2 focus:ring-brand-600/30"
        />
      </div>

      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {trimmed.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-300">
            Type a title to search TMDB.
          </p>
        )}

        {results.isLoading && trimmed.length > 0 && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-ink-700/40" />
            ))}
          </div>
        )}

        {results.data?.length === 0 && trimmed.length > 0 && !results.isLoading && (
          <p className="py-10 text-center text-sm text-ink-300">
            No matches for "{trimmed}".
          </p>
        )}

        {results.data?.map((item) => (
          <div
            key={`${item.mediaType}:${item.tmdbId}`}
            className="flex flex-col gap-2 rounded-xl border border-ink-600/50 bg-ink-800/60 p-2.5 sm:flex-row sm:items-center sm:gap-3"
          >
            <div className="flex items-center gap-3 sm:flex-1 sm:min-w-0">
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-ink-700">
                {item.posterPath ? (
                  <img
                    src={`${TMDB_IMG}${item.posterPath}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center p-1 text-center text-[9px] text-ink-300">
                    {item.title.slice(0, 18)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-medium text-ink-50">{item.title}</div>
                <div className="text-[10px] uppercase tracking-wider text-ink-300">
                  {item.mediaType === "tv" ? "Series" : "Movie"}
                  {item.releaseDate && (
                    <span className="ml-1 opacity-70">· {item.releaseDate.slice(0, 4)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:justify-end">
              {STATUS_PILLS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleAdd(item.tmdbId, item.mediaType, opt.value)}
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
