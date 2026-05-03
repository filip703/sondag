import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="eyebrow mb-3">404</p>
        <h1 className="text-4xl mb-4">
          Den här sidan finns <em className="text-rust">inte</em>.
        </h1>
        <p className="text-sm text-ink-soft mb-8">
          Antingen har länken bytt namn eller så råkade jag aldrig bygga den.
        </p>
        <Link href="/vecka" className="btn btn-primary">
          Tillbaka till veckomenyn
        </Link>
      </div>
    </main>
  );
}
