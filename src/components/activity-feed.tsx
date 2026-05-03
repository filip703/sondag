"use client";

import { describeActivity, type ActivityVerb } from "@/lib/activity-labels";

interface Item {
  id: string;
  actor_name: string;
  verb: string;
  object_type: string | null;
  object_name: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just nu";
  if (diff < 3600) return `${Math.floor(diff / 60)} min sedan`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h sedan`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} dagar sedan`;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function actorColor(name: string): string {
  const map: Record<string, string> = {
    Filip: "text-rust",
    Tine: "text-petrol",
    Bill: "text-camel",
    Todd: "text-olive",
  };
  return map[name] ?? "text-espresso";
}

export function ActivityFeed({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-soft italic">
        Ingen aktivitet än. Lägg till något i skafferiet eller generera en veckomeny.
      </p>
    );
  }

  // Gruppera per dag
  const groups = items.reduce<Record<string, Item[]>>((acc, it) => {
    const day = new Date(it.created_at).toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    (acc[day] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl">
      {Object.entries(groups).map(([day, list]) => (
        <div key={day} className="mb-10">
          <div className="divider mb-4">
            <p className="eyebrow">{day}</p>
          </div>
          <ul>
            {list.map((it) => (
              <li
                key={it.id}
                className="py-3 border-b border-espresso/10 flex items-baseline gap-3"
              >
                <span className={`font-medium ${actorColor(it.actor_name)}`}>
                  {it.actor_name}
                </span>
                <span className="text-sm text-ink-soft flex-1">
                  {describeActivity(it.verb as ActivityVerb, it.object_name)}
                </span>
                <span className="text-xs text-ink-soft/70 tabular-nums">
                  {timeAgo(it.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
