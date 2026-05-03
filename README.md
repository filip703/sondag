# Söndag

Veckomeny, skafferi och inköpslista för familjen — synkat till ICA-handscannern.

By Filip Hector · Stockholm, 2026

## Vad det är

En matkompis för dig och Tine. Söndag genererar veckans middagar med AI baserat på era preferenser och vad som finns hemma, bygger en inköpslista, filtrerar bort det ni redan har, och synkar listan direkt till ditt Mitt ICA-konto så den dyker upp i handscannern på Maxi ICA Stormarknad Häggvik.

## Stack

- Next.js 15 (App Router, Server Actions, Turbopack)
- Supabase — auth, Postgres, RLS (samma projekt som Site Survey, schema `sondag`)
- Anthropic Claude (`claude-sonnet-4-6`) för menygenerering
- ICA Handla privata API (`handla.api.ica.se`)
- Tailwind v4 + Fraunces/Manrope (Filip Hector Brand Standard)
- Vercel för deploy

## Kom igång — local dev

```bash
cd sondag
cp .env.local.example .env.local
# Lägg in ANTHROPIC_API_KEY och SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

Schemat är redan applicerat i Supabase-projektet `swagnjpgddfakncovglo` (Site Survey, schema `sondag`).

## Deploy till Vercel

```bash
npx vercel link
npx vercel env add ANTHROPIC_API_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel --prod
```

`NEXT_PUBLIC_SUPABASE_URL` och `NEXT_PUBLIC_SUPABASE_ANON_KEY` finns redan i `.env.local.example` — sätt dem som env vars i Vercel också.

## Arkitektur

```
src/
  app/
    (app)/                    autentiserade vyer
      vecka/                  veckomenyn
      skafferi/               vad finns hemma
      inkop/                  inköpslistan
      installningar/          preferences + ICA
    api/
      menu/generate/          POST → kör Claude + bygger inköpslista
      ica/auth/               POST → loggar in mot ICA, sparar token
      ica/sync/               POST → pushar listan till ICA-handscannern
    auth/callback/            magic-link callback
    actions/                  server actions (mutations)
    login/                    magic-link inloggning
    page.tsx                  landing
  components/                 UI
  lib/
    supabase/                 SSR-klienter (schema: sondag)
    ai/menu.ts                Claude-prompt + Zod-validering
    ica/                      Handla API-client
    utils.ts                  helpers
```

## Datamodell — kärnan

- `households` — Filip + Tine + barn = 1 rad
- `household_members` — vem som har access (RLS-pivoten)
- `diet_preferences` — allergier, dislikes, kost-typ per medlem
- `pantry_items` — vad som finns hemma just nu
- `always_have_items` — vad ni alltid har (filtreras alltid bort)
- `recipes` + `recipe_ingredients` — sparade och AI-genererade recept
- `meal_plans` + `meal_plan_entries` — veckomeny, en cell per dag×slot
- `shopping_lists` + `shopping_list_items` — listan som genereras och synkas
- `takeaway_log` — historik för balans-förslag
- `ica_connections` — Mitt ICA-token per hushåll
- `ica_articles` — delad cache av artikeldata

Allt skyddat av RLS via `sondag.is_household_member(uuid)`.

## Hur det funkar — en typisk vecka

1. **Söndagskväll.** Filip öppnar `/vecka` och markerar fredag som takeaway (sushi).
2. **Klickar "Generera vecka med AI".** Claude får hushållets preferenser, skafferiet, alltid-hemma-listan och takeaway-dagen. Returnerar 6 middagsrecept (fredag är takeaway). Recepten sparas, ingredienser slås ihop, dubletter dedupliceras.
3. **Inköpslistan byggs automatiskt.** Items som matchar `always_have_items` eller finns i skafferiet markeras `have_at_home: true` och döljs från listan.
4. **Filip granskar `/inkop`.** Markerar några items som "vi har redan hemma" (📌 om det är permanent → hamnar i `always_have_items`).
5. **Klickar "Synka till handscannern".** Listan pushas till ICA via `handla.api.ica.se`. När Filip scannar in på ICA Maxi Sollentuna dyker den upp.

## ICA-integrationen — vad du behöver veta

### Vilket API
ICA har inget officiellt publikt API, men har en stabil intern API (`handla.api.ica.se`) som deras egen Handla-app använder. Söndag använder samma endpoints. Detta är "tolererat men inte officiellt".

### Inloggningsflödet
1. Filip skriver in Mitt ICA-användarnamn + lösenord i `/installningar`.
2. Söndag skickar `Basic auth` mot `api.ica.se/login/v2`.
3. ICA svarar med en `AuthenticationTicket`-header — det är vår sessionstoken.
4. Token sparas i `ica_connections` (TODO: kryptera via Supabase Vault i prod).
5. Token är giltig i ungefär 90 dagar.

### Sync-flödet
1. Söndag bygger en `IcaShoppingList` med `OfflineId` = vårt list-UUID.
2. POST till `/api/user/offlineshoppinglists/{OfflineId}` med `AuthenticationTicket`-header.
3. Listan dyker upp i ICA Handla-appen och i handscannern (samma backend).

### Risker
- ICA kan ändra sitt privata API utan förvarning. Strukturen i `src/lib/ica/` är isolerad så det är en fil att fixa.
- Vid permanent breaking change finns fallback: exportera till QR/sharelink i ICA Handla-formatet.

## TODO efter MVP

- [ ] Supabase Vault för ICA-credentials istället för plaintext
- [ ] Streckkods-scan när du kommer hem (uppdatera `pantry_items` automatiskt)
- [ ] Dela recept med Tine via realtime
- [ ] PWA + iOS-installation
- [ ] Receptlista + favoriter
- [ ] Veckans budget och takeaway-balans
- [ ] Generera barnvänliga frukost- och lunchförslag

## Brand

Färgpalett, typografi och designprinciper följer **Filip Hector Brand Standard v1.0** (cream/espresso/rust, Fraunces/Manrope, lugn över brus). Se `src/app/globals.css`.
