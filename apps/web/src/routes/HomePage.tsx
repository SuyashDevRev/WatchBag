import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { PosterCard } from "../components/PosterCard";
import { Rail } from "../components/Rail";
import { trpc } from "../lib/trpc";
import { useDocumentMeta } from "../lib/useDocumentMeta";

// Lazy-load the 3D hero so three.js + drei ship in their own chunk. The
// landing fallback reuses the hero's ambient red glows so there's never a
// blank moment while the chunk is fetched.
const CinemaHero = lazy(() =>
  import("../components/three/CinemaHero").then((m) => ({ default: m.CinemaHero })),
);

function HeroFallback() {
  return (
    <section className="relative h-[70vh] overflow-hidden sm:h-[75vh]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[60vmin] w-[60vmin] -translate-x-1/2 rounded-full bg-brand-800/40 blur-[120px]" />
        <div className="absolute left-1/3 top-1/3 h-[40vmin] w-[40vmin] rounded-full bg-brand-600/20 blur-[100px]" />
      </div>
    </section>
  );
}

export function HomePage() {
  useDocumentMeta({
    title: undefined, // Use default "WatchBag — Build your watchlist"
    description:
      "Build watchbags of what you're watching, what you've seen, and what's next. Share them. Discover what everyone's obsessed with.",
  });
  const trending = trpc.show.trending.useQuery();
  const popularMovies = trpc.show.popularMovies.useQuery();
  const popularTv = trpc.show.popularTv.useQuery();
  const publicBags = trpc.watchbag.explore.useQuery();

  return (
    <>
      <Suspense fallback={<HeroFallback />}>
        <CinemaHero />
      </Suspense>

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
