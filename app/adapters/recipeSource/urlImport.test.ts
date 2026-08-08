import { describe, expect, it } from "vitest";
import { fetchRecipeFromUrl, recipeIdForUrl, UrlImportError } from "~/adapters/recipeSource/urlImport";

// example.com's address — a public IP literal, so `dns.promises.lookup`
// resolves it without an actual DNS query (Node returns IP literals
// immediately), keeping these tests network-free despite exercising the
// real SSRF guard.
const PUBLIC_HOST = "93.184.216.34";

const RECIPE_HTML = `
<html><body>
  <h1>Suppe med søde kartofler</h1>
  <h2>Ingredienser</h2>
  <ul>
    <li>4 søde kartofler</li>
    <li>1 l grøntsagsbouillon</li>
  </ul>
</body></html>
`;

function fakeFetch(response: {
  ok: boolean;
  status?: number;
  text: string;
  url?: string;
  headers?: Record<string, string>;
}): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0]) =>
    ({
      ok: response.ok,
      status: response.status ?? 200,
      url: response.url ?? input.toString(),
      headers: new Headers(response.headers ?? {}),
      text: async () => response.text,
    }) as Response) as typeof fetch;
}

describe("fetchRecipeFromUrl", () => {
  it("rejects a non-http(s) URL before any fetch", async () => {
    await expect(fetchRecipeFromUrl("ftp://example.com/recipe")).rejects.toThrow(UrlImportError);
  });

  it("rejects an unparseable URL", async () => {
    await expect(fetchRecipeFromUrl("not a url")).rejects.toThrow(UrlImportError);
  });

  it("rejects localhost", async () => {
    await expect(fetchRecipeFromUrl("http://localhost/recipe")).rejects.toThrow(UrlImportError);
  });

  it("rejects a private IPv4 literal", async () => {
    await expect(fetchRecipeFromUrl("http://192.168.1.1/recipe")).rejects.toThrow(UrlImportError);
  });

  it("rejects a loopback IPv4 literal", async () => {
    await expect(fetchRecipeFromUrl("http://127.0.0.1/recipe")).rejects.toThrow(UrlImportError);
  });

  it("parses a recipe from a fetched public page", async () => {
    const recipe = await fetchRecipeFromUrl(
      `http://${PUBLIC_HOST}/opskrift`,
      fakeFetch({ ok: true, text: RECIPE_HTML }),
    );
    expect(recipe.title).toBe("Suppe med søde kartofler");
    expect(recipe.ingredients).toEqual(["4 søde kartofler", "1 l grøntsagsbouillon"]);
    expect(recipe.id).toBe(recipeIdForUrl(`http://${PUBLIC_HOST}/opskrift`));
  });

  it("keys the recipe by the final (redirected-to) URL, not the pasted one", async () => {
    const recipe = await fetchRecipeFromUrl(
      `http://${PUBLIC_HOST}/short-link`,
      fakeFetch({ ok: true, text: RECIPE_HTML, url: `http://${PUBLIC_HOST}/opskrift/rigtig-side` }),
    );
    expect(recipe.url).toBe(`http://${PUBLIC_HOST}/opskrift/rigtig-side`);
    expect(recipe.id).toBe(`http://${PUBLIC_HOST}/opskrift/rigtig-side`);
  });

  it("rejects when the page has no recipe markup", async () => {
    await expect(
      fetchRecipeFromUrl(`http://${PUBLIC_HOST}/blog-post`, fakeFetch({ ok: true, text: "<html><body>Hello</body></html>" })),
    ).rejects.toThrow(UrlImportError);
  });

  it("rejects when the page has a title but no ingredients", async () => {
    await expect(
      fetchRecipeFromUrl(
        `http://${PUBLIC_HOST}/blog-post`,
        fakeFetch({ ok: true, text: "<html><body><h1>Just a title</h1></body></html>" }),
      ),
    ).rejects.toThrow(UrlImportError);
  });

  it("rejects a failed fetch", async () => {
    await expect(
      fetchRecipeFromUrl(`http://${PUBLIC_HOST}/missing`, fakeFetch({ ok: false, status: 404, text: "" })),
    ).rejects.toThrow(UrlImportError);
  });

  it("rejects a response over the size cap, by content-length", async () => {
    await expect(
      fetchRecipeFromUrl(
        `http://${PUBLIC_HOST}/huge`,
        fakeFetch({ ok: true, text: RECIPE_HTML, headers: { "content-length": "999999999" } }),
      ),
    ).rejects.toThrow(UrlImportError);
  });
});
