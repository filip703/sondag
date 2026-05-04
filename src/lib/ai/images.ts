// Recept-bilder. Stödjer flera providers via env IMAGE_PROVIDER:
//   "off"          → ingen bildgenerering (default — undviker rate-limits/kostnad)
//   "pollinations" → gratis men rate-limited av deras CDN (429 vid burst)
//   "replicate"    → Replicate Flux Schnell, ~$0.003/bild (kräver REPLICATE_API_TOKEN)
//   "openai"       → OpenAI gpt-image-1, ~$0.04-0.19/bild (kräver OPENAI_API_KEY)
//
// Pollinations som vi använde först rate-limitade aggressivt → bytte till "off" som default.
// När Filip ger oss en Replicate- eller OpenAI-token, sätt IMAGE_PROVIDER=replicate i env.

const PROVIDER = (process.env.IMAGE_PROVIDER ?? "pollinations").toLowerCase();
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
}

export interface GeneratedImage {
  url: string | null;
  prompt: string;
  seed: number;
}

function pollinationsUrl(prompt: string, opts: ImageOptions): string {
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const params = new URLSearchParams({
    width: String(opts.width ?? 800),
    height: String(opts.height ?? 600),
    model: "flux",
    seed: String(seed),
    nologo: "true",
  });
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;
}

/** Returnerar URL eller null beroende på vald provider. */
export function recipeImage(r: RecipeImageInput, opts: ImageOptions = {}): GeneratedImage {
  const prompt = buildImagePrompt(r);
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  if (PROVIDER === "pollinations") return { url: pollinationsUrl(prompt, { ...opts, seed }), prompt, seed };
  // Replicate/OpenAI kräver server-side API-call → implementeras vid behov
  return { url: null, prompt, seed };
}

export function drinkImage(d: DrinkImageInput, opts: ImageOptions = {}): GeneratedImage {
  const prompt = buildDrinkPrompt(d);
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  if (PROVIDER === "pollinations") {
    return { url: pollinationsUrl(prompt, { width: 600, height: 800, ...opts, seed }), prompt, seed };
  }
  return { url: null, prompt, seed };
}

/**
 * Pre-warm: trigga Pollinations att generera bilden NU så att den
 * är cachad på deras CDN när browsern senare hämtar den.
 *
 * Returnerar true om bilden är klar, false om det failade
 * (då vill vi sätta image_url=null så vi slipper visa broken-image).
 */
export async function prewarmImageUrl(url: string | null, timeoutMs = 25000): Promise<boolean> {
  if (!url) return false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "Sondag/0.1 server-prewarm" },
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return false;
    // Konsumera body så connection släpps korrekt
    await res.arrayBuffer();
    return true;
  } catch {
    return false;
  }
}
