/**
 * Temporary probe: reports how madogdrikke.rema1000.dk's recipe listings are
 * structured, from an environment whose network the site actually answers.
 *
 * madogdrikke.rema1000.dk returns `403 This site is not available in your
 * region` to the development sandbox and to both Supabase regions, so the
 * listing markup (and therefore its pagination) has never been checked
 * against ground truth. This runs the fetches in CI and commits the captures
 * so the crawler can be written against the real pages instead of guesses.
 *
 * Delete this script and its workflow once the crawler is verified.
 */
import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://madogdrikke.rema1000.dk";
const OUT_DIR = "scrape-captures";

const TARGETS = [
  ["robots", "/robots.txt"],
  ["sitemap", "/sitemap.xml"],
  ["opskrifter", "/opskrifter"],
  ["alle", "/opskrifter/alle"],
  ["aftensmad", "/opskrifter/aftensmad"],
  ["aftensmad-page2-query", "/opskrifter/aftensmad?page=2"],
  ["temaer", "/opskrifter/temaer"],
  ["detail-lasagne", "/opskrifter/lasagne"],
];

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
  "Accept-Language": "da-DK,da;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

/** Counts and samples the distinct /opskrifter/ links a page exposes. */
function recipeLinks(html) {
  const found = new Set();
  for (const match of html.matchAll(/href="([^"]*\/opskrifter\/[^"#?]*)"/g)) {
    found.add(match[1].replace(/\/$/, ""));
  }
  return [...found];
}

/** Words and parameter names that would reveal how more pages are loaded. */
const PAGINATION_MARKERS = [
  "vis mere",
  "indlæs",
  "load more",
  "hasNextPage",
  "hasMore",
  "totalCount",
  "totalPages",
  "pageSize",
  "pageIndex",
  "currentPage",
  "?page=",
  "&page=",
  "skip=",
  "take=",
  "offset=",
  "limit=",
  "rel=\"next\"",
  "infinite",
];

function markerHits(html) {
  const lower = html.toLowerCase();
  return PAGINATION_MARKERS.filter((m) => lower.includes(m.toLowerCase()));
}

/** API endpoints the page references, which may list recipes directly. */
function apiCandidates(html) {
  const hits = new Set();
  for (const match of html.matchAll(/["'](https?:\/\/[^"']*\/(?:api|graphql)\/[^"']*)["']/g)) hits.add(match[1]);
  for (const match of html.matchAll(/["'](\/(?:api|graphql)\/[^"']*)["']/g)) hits.add(match[1]);
  return [...hits].slice(0, 40);
}

function jsonLdTypes(html) {
  const types = new Set();
  for (const match of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    for (const t of match[1].matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.add(t[1]);
  }
  return [...types];
}

function stateBlobs(html) {
  return {
    nextData: html.includes("__NEXT_DATA__"),
    nextFlight: html.includes("self.__next_f"),
    nuxt: html.includes("__NUXT__"),
    remix: html.includes("__remixContext"),
    sveltekit: html.includes("__sveltekit"),
    apolloState: html.includes("__APOLLO_STATE__"),
    ingredientKey: /"(recipe)?ingredien(t|s|ser|ts)?"\s*:/i.test(html),
  };
}

const report = [];

await mkdir(OUT_DIR, { recursive: true });

for (const [name, path] of TARGETS) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    const body = await res.text();
    await writeFile(`${OUT_DIR}/${name}.html`, body);

    const links = recipeLinks(body);
    report.push({
      name,
      url,
      status: res.status,
      contentType: res.headers.get("content-type"),
      length: body.length,
      title: body.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim().slice(0, 120),
      recipeLinkCount: links.length,
      recipeLinkSample: links.slice(0, 15),
      paginationMarkers: markerHits(body),
      apiCandidates: apiCandidates(body),
      jsonLdTypes: jsonLdTypes(body),
      state: stateBlobs(body),
    });
  } catch (error) {
    report.push({ name, url, error: String(error) });
  }
  await new Promise((r) => setTimeout(r, 400));
}

await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
