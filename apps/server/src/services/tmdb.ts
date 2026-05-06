import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "../env.js";
import { logger } from "../logger.js";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";

// ---------------------------------------------------------------------------
// Response schemas — only fields we use, so TMDB can add things without
// breaking us.
// ---------------------------------------------------------------------------

const MultiSearchItem = z.object({
  id: z.number(),
  media_type: z.enum(["movie", "tv", "person"]),
  title: z.string().optional(), // movies
  name: z.string().optional(), // tv / people
  overview: z.string().optional(),
  poster_path: z.string().nullable().optional(),
  release_date: z.string().optional(), // movies
  first_air_date: z.string().optional(), // tv
});
const MultiSearchResponse = z.object({
  page: z.number(),
  results: z.array(MultiSearchItem),
  total_pages: z.number(),
  total_results: z.number(),
});

const MovieDetail = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
});

const TvDetail = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Normalized shape we hand back to callers, independent of movie vs tv.
// ---------------------------------------------------------------------------

export interface NormalizedTitle {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
}

function normalize(item: z.infer<typeof MultiSearchItem>): NormalizedTitle | null {
  if (item.media_type === "person") return null;
  return {
    tmdbId: item.id,
    mediaType: item.media_type,
    title: item.title ?? item.name ?? "Untitled",
    overview: item.overview ?? null,
    posterPath: item.poster_path ?? null,
    releaseDate: item.release_date ?? item.first_air_date ?? null,
  };
}

// ---------------------------------------------------------------------------
// Tiny LRU cache so repeated searches / lookups in a session don't hit TMDB
// every time.
// ---------------------------------------------------------------------------

class LRU<K, V> {
  private map = new Map<K, V>();
  constructor(private limit = 200) {}
  get(k: K): V | undefined {
    const v = this.map.get(k);
    if (v !== undefined) {
      this.map.delete(k);
      this.map.set(k, v);
    }
    return v;
  }
  set(k: K, v: V) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }
}

const cache = new LRU<string, unknown>(500);

async function tmdb<T>(path: string, schema: z.ZodType<T>, cacheKey?: string): Promise<T> {
  if (!env.TMDB_API_KEY) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "TMDB_API_KEY is not configured on the server.",
    });
  }

  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached as T;
  }

  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${env.TMDB_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    logger.warn({ status: res.status, path }, "TMDB request failed");
    throw new TRPCError({
      code: res.status === 401 ? "UNAUTHORIZED" : "INTERNAL_SERVER_ERROR",
      message: `TMDB request failed (${res.status})`,
    });
  }

  const json = (await res.json()) as unknown;
  const parsed = schema.parse(json);
  if (cacheKey) cache.set(cacheKey, parsed);
  return parsed;
}

// ---------------------------------------------------------------------------
// Public TMDB client API
// ---------------------------------------------------------------------------

export async function searchMulti(query: string, page = 1): Promise<NormalizedTitle[]> {
  const params = new URLSearchParams({
    query,
    page: String(page),
    include_adult: "false",
  });
  const data = await tmdb(
    `/search/multi?${params.toString()}`,
    MultiSearchResponse,
    `multi:${query}:${page}`,
  );
  return data.results.map(normalize).filter((x): x is NormalizedTitle => x !== null);
}

export async function getTitle(
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<NormalizedTitle> {
  const key = `${mediaType}:${tmdbId}`;
  if (mediaType === "movie") {
    const m = await tmdb(`/movie/${tmdbId}`, MovieDetail, key);
    return {
      tmdbId: m.id,
      mediaType: "movie",
      title: m.title,
      overview: m.overview ?? null,
      posterPath: m.poster_path ?? null,
      releaseDate: m.release_date ?? null,
    };
  }
  const t = await tmdb(`/tv/${tmdbId}`, TvDetail, key);
  return {
    tmdbId: t.id,
    mediaType: "tv",
    title: t.name,
    overview: t.overview ?? null,
    posterPath: t.poster_path ?? null,
    releaseDate: t.first_air_date ?? null,
  };
}

export function posterUrl(posterPath: string | null, size: "w342" | "w500" | "original" = "w342") {
  if (!posterPath) return null;
  return `${TMDB_IMG_BASE}/${size}${posterPath}`;
}

// ---------------------------------------------------------------------------
// Discovery lists — used by the homepage rails. These are paginated TMDB list
// endpoints; we normalize to the same shape we use everywhere else.
// ---------------------------------------------------------------------------

const DiscoveryMovieItem = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
});
const DiscoveryTvItem = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
});
const DiscoveryTrendingItem = z.object({
  id: z.number(),
  media_type: z.enum(["movie", "tv"]),
  title: z.string().optional(),
  name: z.string().optional(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
});
const DiscoveryMovieList = z.object({ results: z.array(DiscoveryMovieItem) });
const DiscoveryTvList = z.object({ results: z.array(DiscoveryTvItem) });
const DiscoveryTrendingList = z.object({ results: z.array(DiscoveryTrendingItem) });

export async function getTrending(
  window: "day" | "week" = "day",
): Promise<NormalizedTitle[]> {
  const data = await tmdb(
    `/trending/all/${window}?language=en-US`,
    DiscoveryTrendingList,
    `trending:${window}`,
  );
  return data.results.map((item) => ({
    tmdbId: item.id,
    mediaType: item.media_type,
    title: item.title ?? item.name ?? "Untitled",
    overview: item.overview ?? null,
    posterPath: item.poster_path ?? null,
    releaseDate: item.release_date ?? item.first_air_date ?? null,
  }));
}

export async function getPopularMovies(): Promise<NormalizedTitle[]> {
  const data = await tmdb(`/movie/popular?language=en-US&page=1`, DiscoveryMovieList, "popular:movie");
  return data.results.map((item) => ({
    tmdbId: item.id,
    mediaType: "movie",
    title: item.title,
    overview: item.overview ?? null,
    posterPath: item.poster_path ?? null,
    releaseDate: item.release_date ?? null,
  }));
}

export async function getPopularTv(): Promise<NormalizedTitle[]> {
  const data = await tmdb(`/tv/popular?language=en-US&page=1`, DiscoveryTvList, "popular:tv");
  return data.results.map((item) => ({
    tmdbId: item.id,
    mediaType: "tv",
    title: item.name,
    overview: item.overview ?? null,
    posterPath: item.poster_path ?? null,
    releaseDate: item.first_air_date ?? null,
  }));
}
