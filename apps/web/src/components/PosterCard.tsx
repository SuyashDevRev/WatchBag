import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { Link } from "react-router";
import { AddToBagDialog } from "./AddToBagDialog";
import { cn } from "../lib/cn";

const TMDB_IMG = "https://image.tmdb.org/t/p";

interface Props {
  title: string;
  tmdbId: number;
  posterPath: string | null;
  year?: string | null;
  mediaType?: "movie" | "tv";
  href?: string;
  size?: "w185" | "w342" | "w500";
  className?: string;
  // Show the + button to add to a watchbag. Defaults to true when mediaType is set.
  allowAdd?: boolean;
}

export function PosterCard({
  title,
  tmdbId,
  posterPath,
  year,
  mediaType,
  href,
  size = "w342",
  className,
  allowAdd,
}: Props) {
  const src = posterPath ? `${TMDB_IMG}/${size}${posterPath}` : null;
  const yearText = year?.slice(0, 4);
  const [addOpen, setAddOpen] = useState(false);
  const canAdd = (allowAdd ?? true) && !!mediaType;

  // Default the click target to a title detail route when not explicitly set.
  const computedHref = href ?? (mediaType ? `/title/${mediaType}/${tmdbId}` : undefined);

  const handleAddClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAddOpen(true);
  };

  const card = (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "group relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl border border-ink-600/40 bg-ink-800 sm:w-44 md:w-48",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-800 p-4 text-center text-xs text-ink-300">
          {title}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/95 via-ink-900/20 to-transparent p-3 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="line-clamp-2 text-sm font-medium leading-tight">{title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-ink-200">
          {mediaType && <span>{mediaType === "tv" ? "Series" : "Movie"}</span>}
          {yearText && <span className="opacity-70">· {yearText}</span>}
        </div>
      </div>
      {canAdd && (
        <button
          type="button"
          onClick={handleAddClick}
          aria-label={`Add ${title} to a watchbag`}
          className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white shadow-lg ring-1 ring-ink-900/40 transition hover:scale-105 hover:bg-brand-500"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );

  return (
    <>
      {computedHref ? <Link to={computedHref}>{card}</Link> : card}
      {canAdd && mediaType && (
        <AddToBagDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          title={title}
          tmdbId={tmdbId}
          mediaType={mediaType}
        />
      )}
    </>
  );
}
