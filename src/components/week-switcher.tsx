"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

export function WeekSwitcher({
  currentIso,
  prevIso,
  nextIso,
  isCurrentWeek,
}: {
  currentIso: string;
  prevIso: string;
  nextIso: string;
  isCurrentWeek: boolean;
}) {
  return (
    <div className="flex items-center gap-1 border border-espresso/15 rounded-sm">
      <Link
        href={`/vecka?vecka=${prevIso}`}
        className="p-2 hover:bg-cream-accent transition border-r border-espresso/15"
        title="Föregående vecka"
      >
        <ChevronLeft size={16} />
      </Link>
      {!isCurrentWeek && (
        <Link
          href="/vecka"
          className="p-2 hover:bg-cream-accent transition border-r border-espresso/15 text-rust"
          title="Hoppa till denna vecka"
        >
          <CalendarDays size={16} />
        </Link>
      )}
      <Link
        href={`/vecka?vecka=${nextIso}`}
        className="p-2 hover:bg-cream-accent transition"
        title="Nästa vecka"
      >
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
