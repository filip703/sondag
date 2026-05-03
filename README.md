# Söndag

*Veckomeny, skafferi, inköpslista och bar för familjen.*

By Filip Hector · Stockholm, 2026

**Live:** [sondag.vercel.app](https://sondag.vercel.app) · **PIN:** `1337`

För användarmanual se **[MANUAL.md](MANUAL.md)**. För historik se **[CHANGELOG.md](CHANGELOG.md)**.

## Vad det är

En matkompis för Familjen Hectorsen — sex personer, två generationer, en hund. Söndag genererar veckans middagar med AI baserat på medlemmarnas preferenser och vad som finns hemma, bygger en inköpslista, sorterar den efter Maxi ICA Häggviks butiksflöde, och flyttar bockade varor automatiskt till skafferi/kyl/frys efter handlingen.

Plus drinkar — adult tiki möter modern boutique. Plus fest-läge med fyra kurser. Plus streckkods-scan från kylen. Plus AI som lär sig av betyg.

## Stack

- **Next.js 15** (App Router, Server Actions, Turbopack)
- **Supabase** — auth, Postgres, RLS (samma projekt som Site Survey, schema `sondag`, views i `public.sondag_*`)
- **Anthropic Claude** (`claude-sonnet-4-6`) för menygenerering, AI-bartender, recept-import, fest-design, cook-from-pantry
- **@zxing/browser** för EAN-streckkods-scanning
- **Open Food Facts API** för produkt-uppslag
- **Tailwind v4** + Fraunces/Manrope (Filip Hector Brand Standard)
- **Vercel** för deploy + auto-CI

## Funktioner

| Område | Beskrivning |
|---|---|
| **Vecka** | AI-genererad veckomeny för fyra. Per-cell takeaway, frånvaro, quick-add. Ratings 1-5★. Vecka-bläddring. Fest-knapp. Recept-import via URL. |
| **Handla** | Inköpslista i Häggvik-butiksordning. Stora kryssrutor. Hus-ikon för "finns hemma". "Klar — flytta hem"-knapp. Kopiera/sync till ICA. |
| **Skafferi** | Tabs för Skafferi/Kyl/Frys. Auto-klassad lagring. Streckkods-scan via kameran. "Vad kan jag laga?"-AI-knapp. |
| **Skåp** | 51 bar-essentials + grundproviant. Refill-toggle. Exportera till veckohandling eller clipboard. |
| **Baren** | 7 favorit-drinkar pre-seedade. AI-bartender i Filips smakprofil (rom/tequila, citrus, orgeat — INTE bubbel). |
| **Familjen** | Per-medlem-profiler: allergier, älskar, dislikes, safe foods, kost-typ. |
| **Aktivitet** | Vem-gjorde-vad-historik. Senaste 200 händelser, grupperat per dag. |
| **Fest** | Pre-drink + förrätt + huvudrätt + dessert. Per-kurs regenerera. |

## Datamodell

Alla tabeller i `sondag`-schemat med vyer i `public.sondag_*` (PostgREST kräver dem).

```
households
├─ household_members          (länk till auth.users — kvar för framtid)
├─ family_members             (Filip, Tine, Bill, Todd — utan auth)
├─ household_profile          (matstil, takeaway/vecka, weekly_recurring)
├─ bar_profile                (drink-stil)
├─ pantry_items               (vad finns hemma — storage: skafferi|kyl|frys)
├─ always_have_items          (legacy, dolt i UI)
├─ standard_pantry_items      (skåp/bar — needs_refill)
├─ ica_connections            (token, default-butik)
├─ ica_articles               (cache)
├─ recipes                    (rating, rejected, ai_generated, source_url)
│   └─ recipe_ingredients
├─ drinks                     (signature, ai_generated)
│   └─ drink_ingredients
├─ meal_plans                 (en per vecka)
│   └─ meal_plan_entries      (date × slot, takeaway, absent_member_names)
├─ shopping_lists
│   └─ shopping_list_items    (have_at_home, checked, remember_have_at_home)
├─ takeaway_log
├─ fest_events                (pre-drink + 3 kurser → recipes/drinks)
└─ activity_log               (vem-gjorde-vad)
```

## Auth

PIN-baserat single-tenant-läge. PIN i `SONDAG_PIN` env var, hushålls-id i `SONDAG_HOUSEHOLD_ID`. Två cookies:

- `sondag_pin_ok=1` (HttpOnly, 30 dagar) — set efter `/api/pin` med rätt PIN
- `sondag_actor` (JSON med id+name) — set efter `/valj` när medlem valts

Middleware redirectar till `/pin` om PIN saknas, till `/valj` om actor saknas.

## Lokal dev

```bash
npm install
cp .env.local.example .env.local
# Fyll i ANTHROPIC_API_KEY
npm run dev   # → http://localhost:3000
```

## Deploy

Push till `main` → Vercel auto-bygger. Env vars satta i Vercel-projektet `sondag` under `filip-hectors-projects`.

## Arkitektur

```
src/
  app/
    (app)/                      autentiserade vyer
      vecka/                    veckomeny
      handla/                   butiksoptimerad inköpslista
      skafferi/                 hemma-tabs (skafferi/kyl/frys)
      skap/                     standardproviant + bar
      bar/                      drinkar + AI-bartender
      familj/                   per-medlem-profiler
      aktivitet/                händelse-feed
      installningar/            ICA + preferenser
      fest/[id]/                fest-detalj
      inkop/                    legacy inköpslista (mestadels ersatt av /handla)
    api/
      pin/                      POST → set PIN-cookie
      actor/                    POST → set actor-cookie
      menu/generate/            POST → AI-vecka + bygg shopping list
      menu/quick-add/           POST → AI-recept för en specifik cell
      menu/cook-with-pantry/    POST → AI-förslag av enbart hemmafinns
      menu/fest/                POST → AI-fest med 4 kurser, regenerera per kurs
      drinks/suggest/           POST → AI-bartender
      recipes/import/           POST → klistra URL → Claude extraherar recept
      barcode/                  POST → EAN → Open Food Facts → pantry_items
      ica/auth/                 POST → ICA-login (väntar på riktig sync)
      ica/sync/                 POST → push lista (väntar på riktig sync)
    pin/                        PIN-input
    valj/                       actor-picker
    auth/callback/              magic-link callback (legacy)
  components/                   UI
  lib/
    supabase/                   SSR-klienter
    ai/menu.ts                  Claude-prompt + Zod-validering
    ica/                        Handla API-client (väntar på riktig endpoints)
    activity.ts                 logActivity()
    activity-labels.ts          client-safe verb-labels
    auth-pin.ts                 PIN/actor cookies + HOUSEHOLD_ID
    storage-classify.ts         skafferi/kyl/frys-mappning
    store-layout.ts             Maxi Häggvik-gångordning
    seeds/hector-family.ts      preset
    utils.ts                    helpers (cn, normalizeName, weekstart, etc.)
  middleware.ts                 PIN+actor-gate
```

## Brand

Färgpalett, typografi och designprinciper följer **Filip Hector Brand Standard v1.0** (cream/espresso/rust, Fraunces/Manrope, lugn över brus). Se `src/app/globals.css` och `Filip Hector Brand Standard.md`.

## TODO efter v0.13

- ICA-sync på riktigt mot OAuth + apimgw-pub.ica.se enligt `mar-schmidt/ica-cli`
- Push-notiser söndag morgon (planera-veckan-reminder)
- Veckorapport: budget, kostnadsuppdelning, takeaway-balans
- AI-bilder per recept
- Säsongsanpassning i AI-prompten
- Trippkalender (markera bortvecka → ingen menyplanering)
- Per-medlems-betyg på recept (snitt → riktning)
