import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Film, Plus, Tv } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { AddToBagDialog } from "../components/AddToBagDialog";
import { Button } from "../components/Button";
import { trpc } from "../lib/trpc";
import { useDocumentMeta } from "../lib/useDocumentMeta";

const TMDB_IMG = "https://image.tmdb.org/t/p";

export function TitleDetailPage() {
  const navigate = useNavigate();
  const { mediaType, tmdbId } = useParams<{ mediaType: string; tmdbId: string }>();
  const [addOpen, setAddOpen] = useState(false);

  const validType = mediaType === "movie" || mediaType === "tv" ? mediaType : null;
  const numericId = tmdbId ? Number.parseInt(tmdbId, 10) : null;
  const enabled = !!validType && !!numericId && !Number.isNaN(numericId);

  const title = trpc.show.getByTmdb.useQuery(
    { mediaType: validType ?? "movie", tmdbId: numericId ?? 0 },
    { enabled },
  );

  useDocumentMeta({
    title: title.data?.title,
    description: title.data?.overview ?? undefined,
    image: title.data?.posterPath ? `${TMDB_IMG}/w500${title.data.posterPath}` : null,
  });

  if (!enabled) {
    return <NotFound />;
  }

  if (title.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="h-6 w-32 animate-pulse rounded bg-ink-800/60" />
        <div className="mt-8 grid gap-8 md:grid-cols-[260px_1fr]">
          <div className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-ink-800/70" />
          <div className="space-y-4">
            <div className="h-12 w-3/4 animate-pulse rounded-lg bg-ink-800/70" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-ink-800/60" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-ink-800/50" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (title.error || !title.data) {
    return <NotFound />;
  }

  const data = title.data;
  const year = data.releaseDate?.slice(0, 4);
  const posterLarge = data.posterPath ? `${TMDB_IMG}/w500${data.posterPath}` : null;
  const backdrop = data.posterPath ? `${TMDB_IMG}/original${data.posterPath}` : null;

  return (
    <div className="relative">
      {/* Atmospheric backdrop — blown-up poster with heavy dim + blur */}
      {backdrop && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] overflow-hidden"
        >
          <img
            src={backdrop}
            alt=""
            className="h-full w-full scale-110 object-cover object-center opacity-25 blur-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-900/40 via-ink-900/80 to-ink-900" />
        </div>
      )}

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-sm text-ink-200 transition hover:text-ink-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="grid gap-8 md:grid-cols-[280px_1fr]"
        >
          <div className="overflow-hidden rounded-2xl border border-ink-600/40 bg-ink-800 shadow-2xl">
            {posterLarge ? (
              <img src={posterLarge} alt={data.title} className="w-full" />
            ) : (
              <div className="grid aspect-[2/3] place-items-center p-6 text-center text-sm text-ink-300">
                {data.title}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink-200">
              {validType === "tv" ? (
                <>
                  <Tv className="h-3.5 w-3.5" /> Series
                </>
              ) : (
                <>
                  <Film className="h-3.5 w-3.5" /> Movie
                </>
              )}
              {year && (
                <>
                  <span className="opacity-40">·</span>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{year}</span>
                </>
              )}
            </div>

            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
              {data.title}
            </h1>

            {data.overview && (
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-200">
                {data.overview}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add to a watchbag
              </Button>
              <Link
                to={`/search?q=${encodeURIComponent(data.title)}`}
                className="inline-flex h-11 items-center rounded-full border border-ink-600/60 bg-ink-800/70 px-5 text-sm text-ink-100 hover:border-brand-500/60 hover:text-ink-50"
              >
                Find similar titles
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {validType && numericId && (
        <AddToBagDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          title={data.title}
          tmdbId={numericId}
          mediaType={validType}
        />
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-3xl text-ink-50">Title not found</h1>
      <p className="mt-2 text-sm text-ink-200">
        Check the URL or go back to search.
      </p>
      <Link
        to="/search"
        className="mt-6 inline-flex items-center rounded-full border border-ink-600/60 bg-ink-800/70 px-4 py-2 text-sm text-ink-100 hover:border-brand-500/60 hover:text-ink-50"
      >
        Back to Search
      </Link>
    </div>
  );
}
