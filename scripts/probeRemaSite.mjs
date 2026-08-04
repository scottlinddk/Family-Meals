/**
 * Temporary probe: works out how madogdrikke.rema1000.dk pages through a
 * recipe listing, from an environment whose network the site answers.
 *
 * Round 1 established: Nuxt site, `__NUXT_DATA__` holds the full recipe
 * records for the 20 cards a listing renders, `/opskrifter/aftensmad` reports
 * `numberOfItems = 350`, and the grid is wrapped in `<div current-page="1">`.
 * `?page=2` changed nothing, so round 2 finds the real pagination handle: it
 * greps the built JS for the listing's fetch call, and probes candidate URL
 * shapes, reporting which one moves the grid off page 1.
 *
 * Delete this script and its workflow once the crawler is verified.
 */
import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://madogdrikke.rema1000.dk";
const OUT_DIR = "scrape-captures";
const LISTING = "/opskrifter/aftensmad";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
  "Accept-Language": "da-DK,da;q=0.9",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, { headers: HEADERS });
  return { status: res.status, body: await res.text() };
}

/** What page of the grid a listing response actually rendered. */
function listingShape(body) {
  return {
    currentPage: body.match(/current-page="(\d+)"/)?.[1],
    numberOfItems: body.match(/itemprop="numberOfItems" content="(\d+)"/)?.[1],
    firstSlugs: [...body.matchAll(/href="\/opskrifter\/([a-z0-9-]+)"/g)]
      .map((m) => m[1])
      .filter((s, i, all) => all.indexOf(s) === i)
      .slice(0, 3),
  };
}

await mkdir(OUT_DIR, { recursive: true });
const report = { candidates: [], jsHits: [], apiProbes: [] };

// 1. Candidate URL shapes for "give me the next 20".
const CANDIDATES = [
  LISTING,
  `${LISTING}?page=2`,
  `${LISTING}?side=2`,
  `${LISTING}?p=2`,
  `${LISTING}?pageNumber=2`,
  `${LISTING}?currentPage=2`,
  `${LISTING}?current-page=2`,
  `${LISTING}?offset=20`,
  `${LISTING}?skip=20`,
  `${LISTING}?per_page=100`,
  `${LISTING}?page=2&sort=created_at`,
  `${LISTING}/2`,
  `${LISTING}/side/2`,
  `${LISTING}/page/2`,
];

for (const path of CANDIDATES) {
  try {
    const { status, body } = await get(`${BASE}${path}`);
    report.candidates.push({ path, status, ...listingShape(body) });
  } catch (error) {
    report.candidates.push({ path, error: String(error) });
  }
  await sleep(400);
}

// 2. The built JS: find the call that loads more cards.
const { body: listingHtml } = await get(`${BASE}${LISTING}`);
const chunks = [...new Set([...listingHtml.matchAll(/\/static\/[A-Za-z0-9_-]+\.js/g)].map((m) => m[0]))];
report.chunkCount = chunks.length;

const NEEDLES = [
  /recipe-tag-/,
  /useInfiniteQuery/,
  /per_page/,
  /last_page/,
  /current-page/,
  /getNextPageParam/,
  /https?:\/\/[a-z0-9.-]*rema1000\.dk\/[^"'`]*recipe[^"'`]*/i,
  /["'`][^"'`]*\/recipes?[^"'`]*["'`]/,
];

for (const chunk of chunks) {
  try {
    const { body } = await get(`${BASE}${chunk}`);
    const hits = [];
    for (const needle of NEEDLES) {
      const re = new RegExp(needle.source, "g" + (needle.flags.includes("i") ? "i" : ""));
      for (const match of body.matchAll(re)) {
        const start = Math.max(0, match.index - 260);
        hits.push({ needle: needle.source, excerpt: body.slice(start, match.index + 260) });
        if (hits.length > 12) break;
      }
      if (hits.length > 12) break;
    }
    if (hits.length > 0) {
      report.jsHits.push({ chunk, hits });
      await writeFile(`${OUT_DIR}/chunk-${chunk.split("/").pop()}`, body);
    }
  } catch (error) {
    report.jsHits.push({ chunk, error: String(error) });
  }
  await sleep(150);
}

await writeFile(`${OUT_DIR}/report2.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ candidates: report.candidates, chunkCount: report.chunkCount }, null, 2));
