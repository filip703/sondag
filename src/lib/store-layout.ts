// ICA Maxi Stormarknad Häggvik — typisk butikslayout (gångordning vid normal route)
// Justera om Filip vill ha annan ordning.
//
// Ingången → höger → frukt/grönt → bröd → mejeri → kött → fisk → frys → skafferi →
// → kaffe → dryck/snacks → husgeråd → kassan

export const AISLE_ORDER: Record<string, number> = {
  "frukt-grönt": 1,
  "bröd": 2,
  "mejeri": 3,
  "kött": 4,
  "chark": 5,
  "fisk": 6,
  "frys": 7,
  "färdigmat": 8,
  "skafferi": 9,
  "kryddor": 10,
  "konserver": 11,
  "kaffe": 12,
  "dryck": 13,
  "snacks": 14,
  "godis": 15,
  "asiatiskt": 16,
  "barn": 17,
  "hygien": 18,
  "hushåll": 19,
  "non-food": 20,
};

export const AISLE_LABEL: Record<string, string> = {
  "frukt-grönt": "Frukt & grönt",
  "bröd": "Bröd",
  "mejeri": "Mejeri",
  "kött": "Kött",
  "chark": "Chark",
  "fisk": "Fisk",
  "frys": "Frys",
  "färdigmat": "Färdigmat & sushi",
  "skafferi": "Skafferi",
  "kryddor": "Kryddor",
  "konserver": "Konserver",
  "kaffe": "Kaffe & te",
  "dryck": "Dryck",
  "snacks": "Snacks",
  "godis": "Godis",
  "asiatiskt": "Asiatiskt",
  "barn": "Barn",
  "hygien": "Hygien",
  "hushåll": "Hushåll",
  "non-food": "Övrigt",
};

export function aisleOrder(category: string | null): number {
  if (!category) return 99;
  return AISLE_ORDER[category.toLowerCase()] ?? 99;
}

export function aisleLabel(category: string | null): string {
  if (!category) return "Övrigt";
  return AISLE_LABEL[category.toLowerCase()] ?? category;
}
