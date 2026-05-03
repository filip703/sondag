# Changelog

Alla större iterationer av Söndag-appen i kronologisk ordning.

## v0.13 — Hamburger-meny + audit + manual

- Top-nav-flikarna ersatta med hamburger-meny → drawer från höger med ikoner och beskrivningar
- Audit av hela kodbasen: två småfix (normalisering i quick-add, activity-verb i finish-shopping)
- `MANUAL.md` skriven för Tine + andra familjemedlemmar
- README + CHANGELOG uppdaterade

## v0.12 — Bug-fix scan-add

- Fixed: scan kunde ge "lyckat svar" men varan dök inte upp någonstans
  - Två "Scanna"-knappar (`pantry` + `always_have`); den senare lade in i tabell vi gömt från UI
- Reduceras till en knapp; auto-storage; tydlig error från Supabase om insert failar
- "Scanna nästa" startar nu om scannern utan reload

## v0.11 — Förenklad hemma-modell

- "Alltid hemma"-konceptet borta från UI
- Ett enda koncept: vad finns hemma just nu (pantry_items)
- "Klar — flytta N hem"-knapp på `/handla` flyttar bulk till skafferi/kyl/frys + arkiverar listan + skapar ny

## v0.10 — Handla-actions + skafferi-tabs

- Per-item på `/handla`: Hus-ikon (finns hemma → flyttar) + Trash-ikon (ta bort)
- `/skafferi` har tre tabs: Skafferi · Kyl · Frys
- `pantry_items.storage`-kolumn med auto-klassificering baserat på kategori

## v0.9 — Betyg + AI-feedback-loop

- 1-5 stjärnor på recept i recept-dialogen
- 1-2★ = auto-rejected, AI:n planerar aldrig in igen
- "Ta bort"-knapp: bara-här eller förkasta-för-alltid
- AI får senaste 4 veckor med betyg + lista över förkastade titlar

## v0.8 — Skåp + Fest + Scanner + Cook-from-pantry

- `/skap`: 51 bar-essentials pre-seedade — komplett premium home bar
- `/fest/[id]`: planera fest med pre-drink + förrätt + huvudrätt + dessert + per-kurs regenerera
- Streckkods-scanner med kameran (zxing-js + Open Food Facts lookup)
- "Vad kan jag laga?"-knapp på `/skafferi`: AI föreslår av enbart hemmafinns
- Multi-user PIN-flow bekräftat — alla 4 medlemmar via `/pin → /valj`

## v0.7 — Klickbart recept-kort

- Tap en rätt i veckogriden → recept-modal
- Visar portioner, total tid, svårighet, tags, ingredienser per kategori, numrerade steg
- Mobil: bottom-sheet, desktop: centerad modal
- Visar AI-badge om genererat, källänk om importerat

## v0.6 — Frånvaro + AI-fix + inköpsoptimering

- `maxDuration = 60` på alla AI-rutter (Vercel default 10s timeoutade)
- Per-måltid "vem är borta"-toggle med 4-up-grid
- Avatarer i cellen visar genomstrukna när någon är borta
- AI ignorerar deras preferenser den specifika måltiden
- AI optimerar inköp: återanvänd ingredienser över veckan (taco+burgare → maxa högrev)
- 20 standard-skåp-items pre-seedade

## v0.5 — PIN-byte + välj användare + activity-historik

- PIN bytt från 1234 → 1337
- `/valj`-flow: efter PIN väljer man familjemedlem
- ACTOR_COOKIE drivs av actor-picker
- `activity_log`-tabell + `/aktivitet`-vy med 200 senaste händelser, grupperade per dag
- Header visar aktiv användare med snabb-byt-knapp
- `logActivity()` wired in alla server actions och menu-generate

## v0.4 — Vecka-bläddring + AI-quick-add + drinkar + mat-historik + recept-import

- Vecka-bläddring: prev/next/denna-vecka + ISO 8601 vecka-nummer
- Quick-add: skriv "gryta" på en cell → AI bygger recept + lägger på inköpslistan
- `/bar`-vy med 7 av Filips favorit-drinkar pre-seedade
- AI-bartender på `/bar`: föreslår nya drinkar i Filips smakprofil
- Veckomeny-AI får mat-historik (4 veckor) → undviker upprepning
- Recept-import-API: URL från koket.se/ica.se/etc → Claude extraherar
- Familjedata uppdaterad till Hectorsen + havremjölk + OFYR-vibes

## v0.3 — Handla-läge + PWA

- `/handla`: butiksoptimerad lista sorterad efter Maxi Häggvik-flödet
- Stora touch-targets, progressbar, kategori-räknare, sticky header
- Kopiera-till-ICA-Handla-knapp
- PWA: manifest, dynamiska ikoner i 32/192/512/180px, apple-meta
- Theme color, viewport-fit:cover för iPhone notch
- Importera-recept-knapp på `/vecka` för URL-import

## v0.2 — PIN-mode + pre-seedat hushåll + family_members

- PIN-baserad gate (single-tenant), `pin_cookie` + `actor_cookie`
- Familj-medlemmar i separat tabell utan auth-konton (Bill och Todd är profiler)
- Filip + Tine + Bill + Todd seedade med per-medlem-data
- 28 always-have-items + hushållsprofil pre-fyllda
- AI-prompten uppdaterad med per-medlem briefing + Todd-safe components
- `/familj`-vy med fold-out-kort per medlem
- Build-fix: Next 15.5, stable React 19, error/not-found-pages
- Standardbutik: Maxi ICA Stormarknad Häggvik

## v0.1 — Initial MVP

- Next.js 15 + Supabase + Anthropic Claude API
- Schema i `sondag` Postgres-schema med views i `public.sondag_*` för PostgREST
- Vecka, Skafferi, Inköpslista, Inställningar
- Magic-link auth (sedermera ersatt av PIN)
- Brand standard: Cream/Espresso/Rust + Fraunces/Manrope
- Live på Vercel: [sondag.vercel.app](https://sondag.vercel.app)
