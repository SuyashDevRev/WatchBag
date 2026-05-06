export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-600/60 bg-ink-900/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-ink-200 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <div className="font-display text-ink-50">WatchBag</div>
          <div className="text-xs text-ink-300">Your watchlists, organized and shareable.</div>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-300">
          <a className="hover:text-ink-50" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
            Powered by TMDB
          </a>
          <span className="opacity-50">·</span>
          <span>© {new Date().getFullYear()} WatchBag</span>
        </div>
      </div>
    </footer>
  );
}
