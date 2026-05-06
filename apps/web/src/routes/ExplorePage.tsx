import { motion } from "framer-motion";
import { Link } from "react-router";

import { trpc } from "../lib/trpc";
import { useDocumentMeta } from "../lib/useDocumentMeta";

export function ExplorePage() {
  useDocumentMeta({
    title: "Explore",
    description: "Browse public watchbags curated by the WatchBag community.",
  });
  const bags = trpc.watchbag.explore.useQuery();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-10"
      >
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
          Explore
        </h1>
        <p className="mt-2 text-ink-200">Public watchbags from the community.</p>
      </motion.header>

      {bags.isLoading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[16/10] animate-pulse rounded-2xl bg-ink-800/70"
            />
          ))}
        </div>
      )}

      {!bags.isLoading && bags.data?.length === 0 && (
        <div className="rounded-2xl border border-ink-600/40 bg-ink-800/40 py-20 text-center">
          <div className="text-lg text-ink-100">No public watchbags yet.</div>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-300">
            Be the first — create one and flip it public to share.
          </p>
          <Link
            to="/signup"
            className="mt-5 inline-flex items-center rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Get started
          </Link>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {bags.data?.map((bag) => (
          <Link
            key={bag.id}
            to={`/watchbag/${bag.id}`}
            className="group overflow-hidden rounded-2xl border border-ink-600/40 bg-ink-800 transition hover:-translate-y-0.5 hover:border-brand-500/50"
          >
            <div className="relative aspect-[16/10] bg-gradient-to-br from-brand-900 via-ink-800 to-ink-900">
              {bag.coverImageUrl && (
                <img
                  src={bag.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              )}
            </div>
            <div className="p-4">
              <div className="line-clamp-2 font-medium text-ink-50">{bag.title}</div>
              {bag.description && (
                <div className="mt-1 line-clamp-2 text-xs text-ink-300">{bag.description}</div>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-300">
                <AuthorAvatar name={bag.author.name} image={bag.author.image} />
                <span>{bag.author.name ?? "Anonymous"}</span>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}

function AuthorAvatar({ name, image }: { name: string | null; image: string | null }) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  if (image) {
    return <img src={image} alt="" className="h-5 w-5 rounded-full object-cover" />;
  }
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
      {initial}
    </span>
  );
}
