import { motion } from "framer-motion";
import { Globe, Lock } from "lucide-react";
import { Link, useParams } from "react-router";

import { trpc } from "../lib/trpc";
import { useDocumentMeta } from "../lib/useDocumentMeta";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

type Status = "current" | "watched" | "on_hold";
const statusLabel: Record<Status, string> = {
  current: "Currently Watching",
  watched: "Watched",
  on_hold: "On Hold",
};
const statusOrder: Status[] = ["current", "watched", "on_hold"];

export function WatchbagDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bag = trpc.watchbag.get.useQuery({ id: id ?? "" }, { enabled: !!id });

  useDocumentMeta({
    title: bag.data?.title,
    description: bag.data?.description ?? "A public watchbag on WatchBag.",
    image: bag.data?.coverImageUrl ?? null,
  });

  if (!id) return null;

  if (bag.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="h-12 w-1/2 animate-pulse rounded-lg bg-ink-800/70" />
        <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-ink-800/60" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-ink-800/70" />
          ))}
        </div>
      </div>
    );
  }

  if (bag.error) {
    const code = bag.error.data?.code;
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-ink-50">
          {code === "FORBIDDEN"
            ? "This watchbag is private"
            : code === "NOT_FOUND"
              ? "Watchbag not found"
              : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-ink-200">
          {code === "FORBIDDEN"
            ? "The owner hasn't made this bag public."
            : "The link may be wrong or the bag was deleted."}
        </p>
        <Link
          to="/explore"
          className="mt-6 inline-flex items-center rounded-full border border-ink-600/60 bg-ink-800/70 px-4 py-2 text-sm text-ink-100 hover:border-brand-500/60 hover:text-ink-50"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  if (!bag.data) return null;

  // Group shows by status.
  const grouped: Record<Status, typeof bag.data.shows> = {
    current: [],
    watched: [],
    on_hold: [],
  };
  for (const s of bag.data.shows) grouped[s.status as Status].push(s);

  return (
    <div className="relative">
      {/* Cover banner */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-gradient-to-br from-brand-900 via-ink-800 to-ink-900 sm:aspect-[16/5]">
        {bag.data.coverImageUrl && (
          <img
            src={bag.data.coverImageUrl}
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
      </div>

      <div className="mx-auto -mt-20 max-w-5xl px-4 pb-20 sm:-mt-28 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-600/60 bg-ink-800/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-ink-200 backdrop-blur">
            {bag.data.isPublic ? (
              <>
                <Globe className="h-3 w-3" /> Public
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" /> Private
              </>
            )}
          </div>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
            {bag.data.title}
          </h1>
          {bag.data.description && (
            <p className="mt-3 max-w-2xl text-base text-ink-200">{bag.data.description}</p>
          )}
          <div className="mt-4 flex items-center gap-2 text-sm text-ink-300">
            <AuthorAvatar name={bag.data.author.name} image={bag.data.author.image} />
            <span>Curated by {bag.data.author.name ?? "Anonymous"}</span>
          </div>
        </motion.header>

        <div className="mt-14 space-y-14">
          {statusOrder.map((status) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            return (
              <section key={status}>
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50 sm:text-2xl">
                    {statusLabel[status]}
                  </h2>
                  <span className="text-xs uppercase tracking-[0.18em] text-ink-300">
                    {items.length} {items.length === 1 ? "title" : "titles"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {items.map((item) => (
                    <ShowTile key={item.showId} show={item.show} />
                  ))}
                </div>
              </section>
            );
          })}

          {bag.data.shows.length === 0 && (
            <div className="rounded-2xl border border-ink-600/40 bg-ink-800/40 py-20 text-center text-ink-200">
              This watchbag is empty.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShowTile({
  show,
}: {
  show: {
    title: string;
    posterPath: string | null;
    mediaType: string;
    releaseDate: string | null;
  };
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-ink-600/40 bg-ink-800">
      <div className="aspect-[2/3] w-full bg-ink-700">
        {show.posterPath ? (
          <img
            src={`${TMDB_IMG}${show.posterPath}`}
            alt={show.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-ink-700 to-ink-800 p-3 text-center text-xs text-ink-300">
            {show.title}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="line-clamp-1 text-sm font-medium text-ink-50">{show.title}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-300">
          {show.mediaType === "tv" ? "Series" : "Movie"}
          {show.releaseDate && <span className="ml-1 opacity-70">· {show.releaseDate.slice(0, 4)}</span>}
        </div>
      </div>
    </div>
  );
}

function AuthorAvatar({ name, image }: { name: string | null; image: string | null }) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  if (image) return <img src={image} alt="" className="h-6 w-6 rounded-full object-cover" />;
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
      {initial}
    </span>
  );
}
