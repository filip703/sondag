# Söndag — iPhone Shortcut för röst-add

Sätt upp ett Siri-kommando: säg "Hey Siri, lägg till på Söndag" → tala in vad du vill → hamnar på inköpslistan eller i skafferiet.

## Förbered nyckeln

Vi skyddar endpoint:en med en delad nyckel. Lägg in i Vercel:

```bash
cd ~/Code/sondag
export PATH="/Users/filiphector/.npm-global/bin:$PATH"
echo 'din-hemliga-sträng-välj-själv' | vercel env add SONDAG_VOICE_KEY production
vercel --prod --yes
```

Och i lokal `.env.local`:

```
SONDAG_VOICE_KEY=din-hemliga-sträng-välj-själv
```

## Bygg Shortcut på iPhone

1. Öppna **Genvägar**-appen på iPhonen
2. Tryck **+** för ny genväg
3. Lägg till följande steg i ordning:

### Steg 1 — Diktera text

- Sök: "Diktera text"
- Sätt språk: **Svenska**
- Sätt slut: "På paus"

### Steg 2 — Hämta innehåll från URL

- Sök: "Hämta innehåll från URL"
- URL: `https://sondag.vercel.app/api/quick/voice`
- Tryck "Visa fler"
- Metod: **POST**
- Begäranbody: **JSON**
- Lägg till tre nycklar:
  - `text` — välj "Dikterad text" från föregående steg
  - `key` — skriv din hemliga sträng
  - `actor` — skriv ditt namn (Filip)

### Steg 3 — Hämta värde för ordbok

- Sök: "Hämta ordboksvärde"
- Hämta värde för: `speak`
- Ur: föregående steg (Innehållet av URL)

### Steg 4 — Tala

- Sök: "Tala text"
- Text: värdet från föregående steg
- Språk: Svenska

### Spara

- Tryck namnet uppe → byt till **"Lägg till på Söndag"** (eller vad du vill säga)
- Tryck **Klart**

Nu fungerar: **"Hey Siri, lägg till på Söndag"** → "Två liter mjölk, en gurka, och en paket smör" → Siri svarar "Lagt till på listan".

## Vad kan jag säga?

- **Lägg till X på listan** → läggs på veckohandlingen
- **Vi har X hemma** / **Lägg X i kylen** → läggs in i skafferi/kyl/frys (auto-klassad)
- **Vi tar pizza ikväll** → markerar takeaway för dagens middag
- Flera saker i en mening: "Lägg till mjölk, ägg och bröd" → alla tre adderas

## Felsökning

- **"Fel nyckel"** — kolla att SONDAG_VOICE_KEY i Vercel matchar nyckeln i din Shortcut
- **"Jag förstod inte"** — Claude kunde inte parsa frasen, prova mer naturligt språk
- **Inget händer** — kolla att Genvägar har internet-tillåtelse (Inställningar → Genvägar)

## Säkerhet

Endpoint:en kräver delad nyckel. Vem som helst med nyckeln kan adde:a på din lista. Behandla nyckeln som ett lösenord. Om någon får tag i den, byt:

```bash
vercel env rm SONDAG_VOICE_KEY production --yes
echo 'ny-hemlig-sträng' | vercel env add SONDAG_VOICE_KEY production
vercel --prod --yes
```

Och uppdatera nyckeln i din Shortcut.
