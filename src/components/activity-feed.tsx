"use client";

import Link from "next/link";
import { describeActivity, type ActivityVerb } from "@/lib/activity-labels";

interface Item {
  id: string;
  actor_name: string;
  verb: string;
  object_type: string | null;
  object_id: string | null;
  object_name: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

function activityLink(it: Item): string | null {
  const meal_date = it.payload?.date;
  if (typeof meal_date === "string") return `/vecka?vecka=${meal_date}`;
  if (it.object_type === "shopping_item") return "/handla";
  if (it.object_type === "pantry_item") return "/skafferi";
  if (it.object_type === "always_have_item") return "/skafferi";
  if (it.object_type === "recipe") return `/vecka`;
  if (it.object_type === "fest" && it.object_id) return `/fest/${it.object_id}`;
  if (it.object_type === "drink" || it.object_type === "drink_image") return "/bar";
  if (it.object_type === "meal_plan") return "/vecka";
  if (it.object_type === "trip") return "/vecka";
  if (it.object_type === "standard_item" || it.object_type === "shopping_export") return "/skap";
  if (it.object_type === "voice_command") return "/handla";
  return null;
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
            {list.map((it) => {
              const href = activityLink(it);
              const content = (
                <>
                  <span className={`font-medium ${actorColor(it.actor_name)}`}>
                    {it.actor_name}
                  </span>
                  <span className="text-sm text-ink-soft flex-1">
                    {describeActivity(it.verb as ActivityVerb, it.object_name)}
                  </span>
                  <span className="text-xs text-ink-soft/70 tabular-nums shrink-0">
                    {timeAgo(it.created_at)}
                  </span>
                </>
              );
              return (
                <li key={it.id} className="border-b border-espresso/10">
                  {href ? (
                    <Link
                      href={href}
                      className="py-3 flex items-baseline gap-3 hover:bg-cream-accent/40 -mx-2 px-2 transition rounded-sm"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="py-3 flex items-baseline gap-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
