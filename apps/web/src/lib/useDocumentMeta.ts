import { useEffect } from "react";

interface Meta {
  title?: string;
  description?: string;
  // Open Graph / Twitter image URL.
  image?: string | null;
}

const DEFAULT_TITLE = "WatchBag — Build your watchlist";
const DEFAULT_DESCRIPTION =
  "Curate and share watchlists of movies, TV, and anime. Track what you're watching, what you've seen, and what's next.";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function useDocumentMeta({ title, description, image }: Meta) {
  useEffect(() => {
    const fullTitle = title ? `${title} · WatchBag` : DEFAULT_TITLE;
    document.title = fullTitle;

    const desc = description ?? DEFAULT_DESCRIPTION;
    upsertMeta("name", "description", desc);

    // Open Graph
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:type", "website");
    if (image) upsertMeta("property", "og:image", image);

    // Twitter
    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    if (image) upsertMeta("name", "twitter:image", image);
  }, [title, description, image]);
}
