"use client";

import Link from "next/link";
import { KeyForm, maskKey } from "@/components/key-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_GUTTER } from "@/lib/layout";
import { NAV_GROUPS } from "@/lib/nav";
import { useAppStore } from "@/store/app-store";

export default function Home() {
  const hydrated = useAppStore((s) => s.hydrated);
  const apiKey = useAppStore((s) => s.apiKey);
  const openSettings = useAppStore((s) => s.openSettings);

  return (
    <main className={`mx-auto w-full max-w-4xl py-10 ${PAGE_GUTTER}`}>
      <p className="text-[13px]">
        <span className="text-primary">$</span> stdgentic --help
      </p>
      <h1 className="mt-4 text-2xl font-semibold">stdgentic</h1>
      <p className="text-muted-foreground mt-1 max-w-2xl text-[13px]">
        A prompt lab for your own OpenRouter key. No server and no accounts:
        every call goes straight from this app to openrouter.ai.
      </p>

      <div className="mt-8 space-y-6">
        {NAV_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-muted-foreground/70 text-[11px] tracking-widest uppercase">
              {group.title}
            </h2>
            <ul className="mt-1.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:bg-accent group grid grid-cols-[16ch_1fr] gap-4 px-2 py-1 text-[13px]"
                  >
                    <span className="group-hover:text-primary">
                      {item.label}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {item.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-10 border p-5">
        {!hydrated ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : apiKey ? (
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <span className="text-emerald-400">●</span>
            <span>key</span>
            <span className="text-muted-foreground">{maskKey(apiKey)}</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={openSettings}
            >
              manage
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-[13px]">
              <span className="text-red-500">●</span> no openrouter key
            </h2>
            <p className="text-muted-foreground mt-1.5 mb-4 text-[13px]">
              Your key is kept in this app&apos;s local storage and is sent to
              openrouter.ai and nowhere else. Every model call is billed to
              your own OpenRouter account.
            </p>
            <KeyForm />
          </>
        )}
      </section>

      <p className="text-muted-foreground mt-8 text-[13px]">
        <span className="text-primary">$</span>{" "}
        <span className="cursor-blink">▊</span>
      </p>
    </main>
  );
}
