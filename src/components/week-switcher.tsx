"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

export function WeekSwitcher({
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
    <div className="flex items-center gap-2">
      {!isCurrentWeek && (
        <Link
          href="/vecka"
          className="btn btn-ghost text-xs whitespace-nowrap"
          title="Hoppa till denna vecka"
        >
          <CalendarDays size={12} />
          Idag
        </Link>
      )}
      <div className="flex items-center border border-espresso/15 rounded-sm">
        <Link
          href={`/vecka?vecka=${prevIso}`}
          className="icon-btn border-r border-espresso/15"
          aria-label="Föregående vecka"
        >
          <ChevronLeft size={18} />
        </Link>
        <Link
          href={`/vecka?vecka=${nextIso}`}
          className="icon-btn"
          aria-label="Nästa vecka"
        >
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  );
}
