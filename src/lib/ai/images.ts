// Recept-bilder via Pollinations.ai (gratis Flux-modell)
// URL:n är deterministisk — samma prompt+seed ger samma bild som cachas på deras CDN.
// Om kvaliteten ej räcker, byt till Replicate eller OpenAI gpt-image-1 senare.

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

const STYLE_SUFFIX =
  "premium food photography, natural daylight, on a worn wooden table, " +
  "shallow depth of field, editorial styling, warm earthy tones, " +
  "Stockholm boutique restaurant aesthetic, no text, no watermark, no logo, no people";

export interface RecipeImageInput {
  title: string;
  description?: string | null;
  cuisine?: string | null;
  tags?: string[] | null;
}

export function buildImagePrompt(r: RecipeImageInput): string {
  const parts: string[] = [r.title];
  if (r.description) parts.push(r.description);
  if (r.cuisine) parts.push(`${r.cuisine} cuisine`);
  if (r.tags && r.tags.length) parts.push(r.tags.join(", "));
  parts.push(STYLE_SUFFIX);
  return parts.join(". ");
}

export interface DrinkImageInput {
  name: string;
  description?: string | null;
  base_spirit?: string | null;
  glass_type?: string | null;
  garnish?: string | null;
}

export function buildDrinkPrompt(d: DrinkImageInput): string {
  const parts: string[] = [
    `Cocktail "${d.name}"`,
    d.description ?? "",
    d.glass_type ? `served in a ${d.glass_type}` : "",
    d.garnish ? `garnished with ${d.garnish}` : "",
    "moody bar lighting, dim warm light, marble countertop, brass bar tools nearby, premium cocktail bar aesthetic, no text, no watermark, no people",
  ].filter(Boolean);
  return parts.join(". ");
}

export interface ImageOptions {
  width?: number;
  height?: number;
  seed?: number;
  enhance?: boolean;
}

/** Returnerar Pollinations-URL:n. Bilden genereras lazy när URL:n hämtas av browser. */
export function pollinationsUrl(prompt: string, opts: ImageOptions = {}): { url: string; seed: number } {
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const params = new URLSearchParams({
    width: String(opts.width ?? 800),
    height: String(opts.height ?? 600),
    model: "flux",
    seed: String(seed),
    nologo: "true",
    enhance: opts.enhance === false ? "false" : "true",
  });
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;
  return { url, seed };
}

export function recipeImage(r: RecipeImageInput, opts?: ImageOptions): { url: string; prompt: string; seed: number } {
  const prompt = buildImagePrompt(r);
  const { url, seed } = pollinationsUrl(prompt, opts);
  return { url, prompt, seed };
}

export function drinkImage(d: DrinkImageInput, opts?: ImageOptions): { url: string; prompt: string; seed: number } {
  const prompt = buildDrinkPrompt(d);
  const { url, seed } = pollinationsUrl(prompt, { width: 600, height: 800, ...opts });
  return { url, prompt, seed };
}
