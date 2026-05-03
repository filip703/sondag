import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-dvh px-6 md:px-12">
      <header className="mx-auto max-w-6xl pt-10 pb-20 flex items-center justify-between">
        <span className="font-display text-2xl">Söndag</span>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/login" className="hover:text-rust">Logga in</Link>
          <Link href="/login" className="btn btn-primary">Kom igång</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl pb-32">
        <p className="eyebrow mb-6">No. 01 — En matkompis för familjen</p>
        <h1 className="text-5xl md:text-7xl max-w-3xl">
          Veckans mat,<br />
          <em className="text-rust">planerad på söndag.</em>
        </h1>
        <p className="mt-8 max-w-xl text-base md:text-lg leading-relaxed text-ink-soft">
          AI-genererad veckomeny för fyra. Skafferi som minns vad du har hemma.
          Inköpslista som synkar direkt till handscannern på ICA Maxi Sollentuna.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link href="/login" className="btn btn-primary">Bygg din första vecka</Link>
          <Link href="#hur" className="btn btn-ghost">Så funkar det</Link>
        </div>
      </section>

      <section id="hur" className="mx-auto max-w-6xl pb-32 grid md:grid-cols-3 gap-px bg-espresso/15">
        {[
          { n: "01", t: "Berätta vad ni gillar", d: "Allergier, dislikes, hur många middagar i veckan, antal takeaway-kvällar." },
          { n: "02", t: "Söndag genererar veckan", d: "AI bygger en balanserad meny som tar hänsyn till vad som redan finns hemma." },
          { n: "03", t: "Listan landar i handscannern", d: "Inköpslistan synkar till ditt ICA-konto och dyker upp när du scannar i butiken." },
        ].map((s) => (
          <div key={s.n} className="bg-cream-light p-8">
            <p className="eyebrow text-rust">{s.n}</p>
            <h4 className="mt-4 text-xl">{s.t}</h4>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.d}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto max-w-6xl py-12 border-t border-espresso/15 flex justify-between text-xs text-ink-soft">
        <span>Söndag — by Filip Hector</span>
        <span>Stockholm, 2026</span>
      </footer>
    </main>
  );
}
