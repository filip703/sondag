"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHouseholdAction } from "@/app/actions/household";

export function CreateHousehold({ userId }: { userId: string }) {
  const [name, setName] = useState("Familjen Hector");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await createHouseholdAction({ name, user_id: userId });
      router.push("/vecka");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-transparent border-b border-espresso/30 px-1 py-3 text-lg focus:outline-none focus:border-espresso"
        placeholder="Hushållets namn"
      />
      <button type="submit" disabled={isPending} className="btn btn-primary">
        {isPending ? "Skapar..." : "Skapa hushåll"}
      </button>
    </form>
  );
}
