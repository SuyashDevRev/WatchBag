import { motion } from "framer-motion";
import { Plus, Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useSearchParams } from "react-router";

import { AddToBagDialog } from "../components/AddToBagDialog";
import { trpc } from "../lib/trpc";
import { useDocumentMeta } from "../lib/useDocumentMeta";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function SearchPage() {
  useDocumentMeta({
    title: "Search",
    description: "Find movies and TV shows on TMDB and add them to your watchbags.",
  });
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const debounced = useDebounced(query, 300);
  const trimmed = debounced.trim();

  // Keep the URL in sync with the debounced query so refresh / share works.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (trimmed !== current) {
      const next = new URLSearchParams(params);
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      setParams(next, { replace: true });
    }
  }, [trimmed, params, setParams]);

  const results = trpc.show.search.useQuery(
    { query: trimmed },
    { enabled: trimmed.length > 0 },
  );

  const [addTarget, setAddTarget] = useState<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
  } | null>(null);

  const showEmpty = useMemo(
    () => trimmed.length > 0 && !results.isLoading && results.data?.length === 0,
    [trimmed, results.isLoading, results.data],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-8"
      >
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
          Search
        </h1>
        <p className="mt-2 text-ink-200">
          Find movies and shows on TMDB, add them to your watchbags.
        </p>
      </motion.header>

      <div className="relative mb-10">
        <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-200" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search for Inception, Breaking Bad, Dune…"
          aria-label="Search"
          className="w-full rounded-full border border-ink-600/60 bg-ink-800/70 py-4 pl-12 pr-5 text-base text-ink-50 placeholder:text-ink-300 outline-none backdrop-blur transition focus:border-brand-500/60 focus:bg-ink-800 focus:ring-2 focus:ring-brand-600/30"
        />
      </div>

      {trimmed.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600/60 bg-ink-800/30 py-20 text-center text-ink-300">
          Type anything to search the TMDB catalog.
        </div>
      )}

      {results.isLoading && trimmed.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-ink-800/70" />
          ))}
        </div>
      )}

      {showEmpty && (
        <div className="rounded-2xl border border-dashed border-ink-600/60 bg-ink-800/30 py-20 text-center text-ink-300">
          No results for <span className="text-ink-100">"{trimmed}"</span>.
        </div>
      )}

      {results.data && results.data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.data.map((item) => (
            <ResultCard
              key={`${item.mediaType}:${item.tmdbId}`}
              item={item}
              onAdd={() =>
                setAddTarget({
                  tmdbId: item.tmdbId,
                  mediaType: item.mediaType,
                  title: item.title,
                })
              }
            />
          ))}
        </div>
      )}

      {addTarget && (
        <AddToBagDialog
          open
          onClose={() => setAddTarget(null)}
          title={addTarget.title}
          tmdbId={addTarget.tmdbId}
          mediaType={addTarget.mediaType}
        />
      )}
    </div>
  );
}

interface ResultItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
}

function ResultCard({ item, onAdd }: { item: ResultItem; onAdd: () => void }) {
  const handleAdd = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAdd();
  };

  return (
    <Link
      to={`/title/${item.mediaType}/${item.tmdbId}`}
      className="group relative block overflow-hidden rounded-xl border border-ink-600/40 bg-ink-800 transition hover:border-brand-500/50"
    >
      <div className="aspect-[2/3] w-full">
        {item.posterPath ? (
          <img
            src={`${TMDB_IMG}${item.posterPath}`}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-ink-700 to-ink-800 p-3 text-center text-xs text-ink-300">
            {item.title}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="line-clamp-1 text-sm font-medium text-ink-50">{item.title}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-300">
          {item.mediaType === "tv" ? "Series" : "Movie"}
          {item.releaseDate && <span className="ml-1 opacity-70">· {item.releaseDate.slice(0, 4)}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        aria-label={`Add ${item.title} to a watchbag`}
        className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white shadow-lg ring-1 ring-ink-900/40 transition hover:scale-105 hover:bg-brand-500"
      >
        <Plus className="h-4 w-4" />
      </button>
    </Link>
  );
}
