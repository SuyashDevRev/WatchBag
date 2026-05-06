import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Globe, Lock, Search as SearchIcon, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { trpc } from "../lib/trpc";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";
type Status = "current" | "watched" | "on_hold";
const COLUMN_ORDER: Status[] = ["current", "watched", "on_hold"];
const COLUMN_LABEL: Record<Status, string> = {
  current: "Currently Watching",
  watched: "Watched",
  on_hold: "On Hold",
};

// Prefix used on drag IDs so the handler can tell search tiles from board
// tiles without any other state.
const SEARCH_PREFIX = "search:";

interface ShowInBag {
  showId: string;
  status: Status;
  position: number;
  title: string;
  posterPath: string | null;
  tmdbId: number;
  mediaType: string;
}

interface SearchItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function WatchbagBoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const bag = trpc.watchbag.get.useQuery({ id: id ?? "" }, { enabled: !!id });
  const [activeDrag, setActiveDrag] = useState<
    | { kind: "board"; item: ShowInBag }
    | { kind: "search"; item: SearchItem }
    | null
  >(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Search state — persists for the lifetime of this page.
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 300);
  const trimmed = debounced.trim();
  const searchResults = trpc.show.search.useQuery(
    { query: trimmed },
    { enabled: trimmed.length > 0, staleTime: 5 * 60_000 },
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Optimistic move within/between board columns.
  const moveMutation = trpc.show.moveStatus.useMutation({
    async onMutate(variables) {
      if (!id) return;
      await utils.watchbag.get.cancel({ id });
      const previous = utils.watchbag.get.getData({ id });
      if (!previous) return { previous };
      const nextShows = reorderShows(previous.shows, {
        showId: variables.showId,
        status: variables.status,
        position: variables.position,
      });
      utils.watchbag.get.setData({ id }, { ...previous, shows: nextShows });
      return { previous };
    },
    onError(err, _vars, ctx) {
      toast.error(err.message);
      if (ctx?.previous && id) utils.watchbag.get.setData({ id }, ctx.previous);
    },
  });

  // Add-from-search with optimistic insert. We build a temporary row keyed on
  // the TMDB id so the tile appears in the target column the moment the drop
  // lands. When the server returns the real persisted row, we splice it in to
  // replace the temp (no refetch flash).
  const addMutation = trpc.show.addToBag.useMutation({
    async onMutate(variables) {
      if (!id) return;
      await utils.watchbag.get.cancel({ id });
      const previous = utils.watchbag.get.getData({ id });
      if (!previous) return { previous, tempShowId: null as string | null };

      const tempShowId = `temp-${variables.tmdbId}-${variables.mediaType}-${Date.now()}`;

      // Find the search tile's metadata so we can render the optimistic row
      // without waiting for the server to hand back title/poster.
      const meta = searchResults.data?.find(
        (r) => r.tmdbId === variables.tmdbId && r.mediaType === variables.mediaType,
      );

      // End-of-column position for the new tile.
      const destCount = previous.shows.filter((s) => s.status === variables.status).length;

      const nowIso = new Date().toISOString();
      const optimisticRow = {
        watchbagId: variables.watchbagId,
        showId: tempShowId,
        status: variables.status,
        position: destCount,
        addedAt: nowIso,
        show: {
          id: tempShowId,
          tmdbId: variables.tmdbId,
          mediaType: variables.mediaType,
          title: meta?.title ?? "Adding…",
          overview: null,
          posterPath: meta?.posterPath ?? null,
          releaseDate: meta?.releaseDate ?? null,
          createdAt: nowIso,
        },
      } as unknown as (typeof previous.shows)[number];

      utils.watchbag.get.setData(
        { id },
        { ...previous, shows: [...previous.shows, optimisticRow] },
      );
      return { previous, tempShowId };
    },
    onSuccess(data, variables, ctx) {
      if (!id || !data || !ctx?.tempShowId) return;
      // Replace the temp row with the real server row in-place, keeping the
      // rest of the cache untouched. No refetch, no flash.
      const snapshot = utils.watchbag.get.getData({ id });
      if (!snapshot) return;
      const realRow = {
        watchbagId: variables.watchbagId,
        showId: data.show.id,
        status: variables.status,
        position: data.link?.position ?? 0,
        addedAt: data.link?.addedAt ?? new Date().toISOString(),
        show: data.show,
      } as unknown as (typeof snapshot.shows)[number];

      utils.watchbag.get.setData(
        { id },
        {
          ...snapshot,
          shows: snapshot.shows.map((s) => (s.showId === ctx.tempShowId ? realRow : s)),
        },
      );
    },
    onError(err, _vars, ctx) {
      toast.error(err.message);
      if (ctx?.previous && id) utils.watchbag.get.setData({ id }, ctx.previous);
    },
  });

  const removeMutation = trpc.show.removeFromBag.useMutation({
    async onMutate(variables) {
      if (!id) return;
      await utils.watchbag.get.cancel({ id });
      const previous = utils.watchbag.get.getData({ id });
      if (!previous) return { previous };
      utils.watchbag.get.setData(
        { id },
        { ...previous, shows: previous.shows.filter((s) => s.showId !== variables.showId) },
      );
      return { previous };
    },
    onError(err, _vars, ctx) {
      toast.error(err.message);
      if (ctx?.previous && id) utils.watchbag.get.setData({ id }, ctx.previous);
    },
  });

  const setPublicMutation = trpc.watchbag.setPublic.useMutation({
    onSuccess() {
      if (id) utils.watchbag.get.invalidate({ id });
    },
  });

  const deleteMutation = trpc.watchbag.delete.useMutation({
    onSuccess() {
      utils.watchbag.listMine.invalidate();
      toast.success("Watchbag deleted");
      navigate("/mywatchbags");
    },
  });

  const columns = useMemo(() => {
    const map: Record<Status, ShowInBag[]> = { current: [], watched: [], on_hold: [] };
    if (!bag.data) return map;
    for (const row of bag.data.shows) {
      map[row.status as Status].push({
        showId: row.showId,
        status: row.status as Status,
        position: row.position,
        title: row.show.title,
        posterPath: row.show.posterPath,
        tmdbId: row.show.tmdbId,
        mediaType: row.show.mediaType,
      });
    }
    for (const s of COLUMN_ORDER) map[s].sort((a, b) => a.position - b.position);
    return map;
  }, [bag.data]);

  if (!id) return null;
  if (bag.isLoading) return <BoardSkeleton />;
  if (bag.error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-ink-50">
          {bag.error.data?.code === "FORBIDDEN"
            ? "This isn't your watchbag"
            : "Watchbag not found"}
        </h1>
        <Link
          to="/mywatchbags"
          className="mt-6 inline-flex items-center rounded-full border border-ink-600/60 bg-ink-800/70 px-4 py-2 text-sm text-ink-100 hover:border-brand-500/60 hover:text-ink-50"
        >
          Back to my bags
        </Link>
      </div>
    );
  }
  if (!bag.data) return null;

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith(SEARCH_PREFIX)) {
      const payload = e.active.data.current as { search: SearchItem } | undefined;
      if (payload?.search) setActiveDrag({ kind: "search", item: payload.search });
      return;
    }
    const found = findItem(columns, id);
    if (found) setActiveDrag({ kind: "board", item: found });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveDrag(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Resolve destination column. `over.id` can be a status string (column
    // container), a board tile's show UUID, or a search tile id (we ignore
    // drops *onto* search tiles — search is a source only).
    if (overIdStr.startsWith(SEARCH_PREFIX)) return;
    const overColumn = asStatus(overIdStr) ?? findItem(columns, overIdStr)?.status;
    if (!overColumn) return;

    // --- Search → column: add ---
    if (activeIdStr.startsWith(SEARCH_PREFIX)) {
      const payload = active.data.current as { search: SearchItem } | undefined;
      if (!payload?.search) return;
      addMutation.mutate({
        watchbagId: id!,
        tmdbId: payload.search.tmdbId,
        mediaType: payload.search.mediaType,
        status: overColumn,
      });
      return;
    }

    // --- Board → board: move ---
    const source = findItem(columns, activeIdStr);
    if (!source) return;

    const destList = columns[overColumn];
    let toIndex: number;
    if (asStatus(overIdStr)) {
      toIndex = destList.length;
    } else {
      toIndex = destList.findIndex((s) => s.showId === overIdStr);
      if (toIndex === -1) toIndex = destList.length;
    }

    if (source.status === overColumn) {
      const currentIndex = destList.findIndex((s) => s.showId === source.showId);
      if (currentIndex === toIndex) return;
    }

    moveMutation.mutate({
      watchbagId: id!,
      showId: source.showId,
      status: overColumn,
      position: toIndex,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-10 flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <Link
            to="/mywatchbags"
            className="text-xs uppercase tracking-[0.18em] text-ink-300 hover:text-ink-100"
          >
            ← My watchbags
          </Link>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
            {bag.data.title}
          </h1>
          {bag.data.description && (
            <p className="mt-2 max-w-2xl text-ink-200">{bag.data.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setPublicMutation.mutate({ id: id!, isPublic: !bag.data!.isPublic })}
            disabled={setPublicMutation.isPending}
          >
            {bag.data.isPublic ? (
              <>
                <Globe className="h-4 w-4" /> Public
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Private
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {COLUMN_ORDER.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              items={columns[status]}
              onRemove={(showId) => removeMutation.mutate({ watchbagId: id!, showId })}
            />
          ))}
        </div>

        {/* Search section — acts as a drag source only. */}
        <SearchPanel
          query={query}
          onQuery={setQuery}
          trimmed={trimmed}
          loading={searchResults.isLoading}
          results={searchResults.data}
        />

        <DragOverlay dropAnimation={null}>
          {activeDrag?.kind === "board" && <ShowTile item={activeDrag.item} overlay />}
          {activeDrag?.kind === "search" && <SearchTileVisual item={activeDrag.item} overlay />}
        </DragOverlay>
      </DndContext>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this watchbag?">
        <p className="text-sm text-ink-200">
          This will permanently delete the bag and remove every show in it. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => deleteMutation.mutate({ id: id! })}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board column + tiles
// ---------------------------------------------------------------------------

function BoardColumn({
  status,
  items,
  onRemove,
}: {
  status: Status;
  items: ShowInBag[];
  onRemove: (showId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border bg-ink-800/40 p-3 transition ${
        isOver ? "border-brand-500/60 bg-ink-800/60" : "border-ink-600/40"
      }`}
    >
      <header className="mb-3 flex items-end justify-between px-1">
        <h2 className="font-display text-lg font-semibold text-ink-50">{COLUMN_LABEL[status]}</h2>
        <span className="text-xs uppercase tracking-[0.18em] text-ink-300">{items.length}</span>
      </header>

      <SortableContext items={items.map((i) => i.showId)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[120px] flex-col gap-2">
          {items.map((item) => (
            <SortableTile key={item.showId} item={item} onRemove={() => onRemove(item.showId)} />
          ))}
          {items.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-ink-600/50 py-10 text-center text-xs text-ink-300">
              Drop titles here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTile({
  item,
  onRemove,
}: {
  item: ShowInBag;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.showId,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group ${isDragging ? "opacity-30" : ""}`}
    >
      <div className="relative flex items-center gap-3 rounded-xl border border-ink-600/40 bg-ink-800 p-2 transition hover:border-brand-500/40">
        <div
          {...attributes}
          {...listeners}
          className="grid h-16 w-12 shrink-0 cursor-grab place-items-center overflow-hidden rounded-md bg-ink-700 active:cursor-grabbing"
        >
          {item.posterPath ? (
            <img
              src={`${TMDB_IMG}${item.posterPath}`}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <span className="p-1 text-center text-[9px] text-ink-300">{item.title.slice(0, 20)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1" {...attributes} {...listeners}>
          <div className="line-clamp-1 cursor-grab text-sm font-medium text-ink-50 active:cursor-grabbing">
            {item.title}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-ink-300">
            {item.mediaType === "tv" ? "Series" : "Movie"}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="invisible grid h-7 w-7 place-items-center rounded-full text-ink-300 transition hover:bg-ink-700 hover:text-ink-50 group-hover:visible"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ShowTile({ item, overlay = false }: { item: ShowInBag; overlay?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-ink-800 p-2 ${
        overlay ? "border-brand-500/60 shadow-2xl ring-2 ring-brand-500/30" : "border-ink-600/40"
      }`}
    >
      <div className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-ink-700">
        {item.posterPath ? (
          <img
            src={`${TMDB_IMG}${item.posterPath}`}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="p-1 text-center text-[9px] text-ink-300">{item.title.slice(0, 20)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-sm font-medium text-ink-50">{item.title}</div>
        <div className="text-[10px] uppercase tracking-wider text-ink-300">
          {item.mediaType === "tv" ? "Series" : "Movie"}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search panel (bottom of the board). Draggable results reuse the same
// visual shape as board tiles, so the drop looks continuous.
// ---------------------------------------------------------------------------

function SearchPanel({
  query,
  onQuery,
  trimmed,
  loading,
  results,
}: {
  query: string;
  onQuery: (v: string) => void;
  trimmed: string;
  loading: boolean;
  results: SearchItem[] | undefined;
}) {
  return (
    <section className="mt-12">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-50 sm:text-2xl">
            Search items to add
          </h2>
          <p className="mt-1 text-sm text-ink-300">
            Drag a result into a column to add it to this watchbag.
          </p>
        </div>
      </header>

      <div className="relative mb-5">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-200" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          type="search"
          placeholder="Search TMDB for movies and shows…"
          aria-label="Search items"
          className="w-full rounded-full border border-ink-600/60 bg-ink-800/70 py-3 pl-11 pr-5 text-sm text-ink-50 placeholder:text-ink-300 outline-none transition focus:border-brand-500/60 focus:bg-ink-800 focus:ring-2 focus:ring-brand-600/30"
        />
      </div>

      {trimmed.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600/60 bg-ink-800/30 py-12 text-center text-sm text-ink-300">
          Start typing to search.
        </div>
      )}

      {loading && trimmed.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-ink-700/40" />
          ))}
        </div>
      )}

      {!loading && results?.length === 0 && trimmed.length > 0 && (
        <div className="rounded-2xl border border-dashed border-ink-600/60 bg-ink-800/30 py-12 text-center text-sm text-ink-300">
          No matches for "{trimmed}".
        </div>
      )}

      {results && results.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => (
            <SearchTile key={`${item.mediaType}:${item.tmdbId}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function SearchTile({ item }: { item: SearchItem }) {
  const dragId = `${SEARCH_PREFIX}${item.mediaType}:${item.tmdbId}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { search: item },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group flex cursor-grab items-center gap-3 rounded-xl border border-ink-600/40 bg-ink-800 p-2 transition hover:border-brand-500/40 active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-ink-700">
        {item.posterPath ? (
          <img
            src={`${TMDB_IMG}${item.posterPath}`}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="p-1 text-center text-[9px] text-ink-300">{item.title.slice(0, 20)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-sm font-medium text-ink-50">{item.title}</div>
        <div className="text-[10px] uppercase tracking-wider text-ink-300">
          {item.mediaType === "tv" ? "Series" : "Movie"}
          {item.releaseDate && <span className="ml-1 opacity-70">· {item.releaseDate.slice(0, 4)}</span>}
        </div>
      </div>
    </div>
  );
}

function SearchTileVisual({ item, overlay = false }: { item: SearchItem; overlay?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-ink-800 p-2 ${
        overlay ? "border-brand-500/60 shadow-2xl ring-2 ring-brand-500/30" : "border-ink-600/40"
      }`}
    >
      <div className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-ink-700">
        {item.posterPath ? (
          <img
            src={`${TMDB_IMG}${item.posterPath}`}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="p-1 text-center text-[9px] text-ink-300">{item.title.slice(0, 20)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-sm font-medium text-ink-50">{item.title}</div>
        <div className="text-[10px] uppercase tracking-wider text-ink-300">
          {item.mediaType === "tv" ? "Series" : "Movie"}
        </div>
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 h-16 w-1/3 animate-pulse rounded-lg bg-ink-800/70" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-96 animate-pulse rounded-2xl bg-ink-800/50" />
        ))}
      </div>
    </div>
  );
}

function asStatus(value: string): Status | null {
  return value === "current" || value === "watched" || value === "on_hold" ? value : null;
}

function findItem(columns: Record<Status, ShowInBag[]>, showId: string): ShowInBag | null {
  for (const status of COLUMN_ORDER) {
    const hit = columns[status].find((i) => i.showId === showId);
    if (hit) return hit;
  }
  return null;
}

function reorderShows<T extends { showId: string; status: string; position: number }>(
  shows: T[],
  move: { showId: string; status: Status; position: number },
): T[] {
  const grouped: Record<Status, T[]> = { current: [], watched: [], on_hold: [] };
  let moving: T | null = null;
  for (const s of shows) {
    if (s.showId === move.showId) {
      moving = s;
      continue;
    }
    grouped[s.status as Status].push(s);
  }
  if (!moving) return shows;
  for (const k of COLUMN_ORDER) grouped[k].sort((a, b) => a.position - b.position);

  const dest = grouped[move.status];
  const insertAt = Math.max(0, Math.min(move.position, dest.length));
  const updatedMoving = { ...moving, status: move.status, position: insertAt } as T;
  dest.splice(insertAt, 0, updatedMoving);

  const out: T[] = [];
  for (const k of COLUMN_ORDER) {
    grouped[k].forEach((item, idx) => {
      out.push({ ...item, position: idx } as T);
    });
  }
  return out;
}
