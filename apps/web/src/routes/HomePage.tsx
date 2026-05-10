import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router";

import { Hero } from "../components/Hero";
import { LaunchOverlay } from "../components/LaunchOverlay";
import { PosterCard } from "../components/PosterCard";
import { Rail } from "../components/Rail";
import { trpc } from "../lib/trpc";
import { useDocumentMeta } from "../lib/useDocumentMeta";

// 3D pieces live in their own chunks — the main bundle stays unaffected.
// Both mount only after the LaunchOverlay's `ready` flag flips, so the
// reveal is a single coordinated moment, not a pop-in-per-piece.
const PosterFieldBackdrop = lazy(() =>
  import("../components/three/PosterFieldBackdrop").then((m) => ({
    default: m.PosterFieldBackdrop,
  })),
);
const OrbitingRing = lazy(() =>
  import("../components/three/OrbitingRing").then((m) => ({ default: m.OrbitingRing })),
);

export function HomePage() {
  useDocumentMeta({
    title: undefined,
    description:
      "Build watchbags of what you're watching, what you've seen, and what's next. Share them. Discover what everyone's obsessed with.",
  });
  const trending = trpc.show.trending.useQuery();
  const popularMovies = trpc.show.popularMovies.useQuery();
  const popularTv = trpc.show.popularTv.useQuery();
  const publicBags = trpc.watchbag.explore.useQuery();

  // Warm the 3D chunk while the overlay is up. Once the dynamic import
  // resolves, we flip `codeReady` — combined with the trending API data,
  // that signals LaunchOverlay it's safe to uncover the hero.
  const [codeReady, setCodeReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void import("../components/three/PosterFieldBackdrop").then(() => {
      if (!cancelled) setCodeReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const trendingDone = !trending.isLoading;
  const ready = codeReady && trendingDone;

  return (
    <>
      <LaunchOverlay ready={ready} />

      {/* Coordinate the hero reveal with the overlay fade — one motion,
          not a cascade. We wait until `ready` then fade the whole homepage
          in over the same 500ms as the overlay fades out. */}
      <motion.div
        animate={{ opacity: ready ? 1 : 0 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: ready ? 0.15 : 0 }}
      >
        <Hero
          backdrop={
            ready ? (
              <Suspense fallback={null}>
                <PosterFieldBackdrop />
              </Suspense>
            ) : null
          }
        />

        <div className="space-y-14 pb-12">
          <Rail title="Trending today" subtitle="What the world is watching right now">
            {trending.isLoading && <SkeletonPosters />}
            {trending.data?.map((t) => (
              <PosterCard
                key={`${t.mediaType}:${t.tmdbId}`}
                tmdbId={t.tmdbId}
                title={t.title}
                posterPath={t.posterPath}
                year={t.releaseDate}
                mediaType={t.mediaType}
              />
            ))}
          </Rail>

          <Rail title="Popular movies" subtitle="Audience favorites this week">
            {popularMovies.isLoading && <SkeletonPosters />}
            {popularMovies.data?.map((t) => (
              <PosterCard
                key={`movie:${t.tmdbId}`}
                tmdbId={t.tmdbId}
                title={t.title}
                posterPath={t.posterPath}
                year={t.releaseDate}
                mediaType="movie"
              />
            ))}
          </Rail>

          <Suspense fallback={null}>
            <OrbitingRing />
          </Suspense>

          <Rail title="Popular series" subtitle="Binge-worthy TV the internet can't stop watching">
            {popularTv.isLoading && <SkeletonPosters />}
            {popularTv.data?.map((t) => (
              <PosterCard
                key={`tv:${t.tmdbId}`}
                tmdbId={t.tmdbId}
                title={t.title}
                posterPath={t.posterPath}
                year={t.releaseDate}
                mediaType="tv"
              />
            ))}
          </Rail>

          <Rail title="Public watchbags" subtitle="Curated by the WatchBag community">
            {publicBags.isLoading && <SkeletonPosters />}
            {publicBags.data?.length === 0 && (
              <div className="mx-auto max-w-md px-6 py-8 text-center text-sm text-ink-200">
                No public watchbags yet. Be the first —
                <Link to="/signup" className="ml-1 text-brand-400 hover:text-brand-300">
                  create an account
                </Link>{" "}
                and share one.
              </div>
            )}
            {publicBags.data?.map((bag) => (
              <Link
                key={bag.id}
                to={`/watchbag/${bag.id}`}
                className="group flex w-60 shrink-0 flex-col overflow-hidden rounded-xl border border-ink-600/40 bg-ink-800 transition hover:border-brand-500/50"
              >
                <div className="aspect-[16/9] bg-gradient-to-br from-brand-900 via-ink-800 to-ink-900">
                  {bag.coverImageUrl && (
                    <img src={bag.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <div className="line-clamp-2 font-medium text-ink-50">{bag.title}</div>
                  <div className="mt-1 text-xs text-ink-300">by {bag.author.name ?? "Anonymous"}</div>
                </div>
              </Link>
            ))}
          </Rail>
        </div>
      </motion.div>
    </>
  );
}

function SkeletonPosters() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] w-40 shrink-0 animate-pulse rounded-xl bg-ink-800/70 sm:w-44 md:w-48"
        />
      ))}
    </>
  );
}
