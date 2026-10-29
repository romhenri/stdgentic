"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { KeySettingsDialog } from "@/components/key-settings-dialog";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { activeItem, NAV_GROUPS, SHORTCUT_ITEMS } from "@/lib/nav";
import { onCharged } from "@/lib/openrouter/client";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

/** The shortcut hint for an href, if it has one: "⌘1" to "⌘9". */
function shortcutFor(href: string): string | null {
  const index = SHORTCUT_ITEMS.findIndex((item) => item.href === href);
  return index === -1 ? null : `⌘${index + 1}`;
}

function Sidebar({ onPalette }: { onPalette: () => void }) {
  const pathname = usePathname();
  const active = activeItem(pathname);
  const hydrated = useAppStore((s) => s.hydrated);
  const apiKey = useAppStore((s) => s.apiKey);
  const openSettings = useAppStore((s) => s.openSettings);

  return (
    <aside className="bg-sidebar flex w-60 shrink-0 flex-col border-r">
      {/* Room for the macOS traffic lights, which sit over this bar. */}
      <div
        data-tauri-drag-region
        className="flex h-10 shrink-0 items-center pl-[78px] text-[13px] font-semibold"
      >
        <Link href="/" className="hover:text-primary">
          <span className="text-primary">~/</span>stdgentic
        </Link>
      </div>

      <button
        type="button"
        onClick={onPalette}
        className="text-muted-foreground hover:text-foreground mx-3 mb-2 flex h-7 items-center border px-2 text-left text-xs"
      >
        <span className="text-primary mr-1.5">:</span>
        <span className="flex-1">jump to...</span>
        <span className="opacity-60">⌘K</span>
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto pb-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mt-3 first:mt-1">
            <div className="text-muted-foreground/70 px-3 pb-1 text-[11px] tracking-widest uppercase">
              {group.title}
            </div>
            {group.items.map((item) => {
              const isActive = active?.href === item.href;
              const shortcut = shortcutFor(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-6 items-center gap-1.5 px-3 text-[13px]",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="text-primary w-2">
                    {isActive ? ">" : ""}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {shortcut && (
                    <span className="text-[11px] opacity-50">{shortcut}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={openSettings}
        className="text-muted-foreground hover:text-foreground flex h-8 shrink-0 items-center gap-1.5 border-t px-3 text-left text-xs"
      >
        <span
          className={cn(
            !hydrated
              ? "opacity-0"
              : apiKey
                ? "text-emerald-400"
                : "text-red-500",
          )}
        >
          ●
        </span>
        <span className="flex-1">settings</span>
        <span className="opacity-50">⌘,</span>
      </button>
    </aside>
  );
}

function TopBar() {
  const item = activeItem(usePathname());

  return (
    <header
      data-tauri-drag-region
      className="flex h-10 shrink-0 items-center gap-3 border-b px-4 text-[13px]"
    >
      <span className="pointer-events-none truncate">
        <span className="text-muted-foreground">stdgentic /</span>{" "}
        {item?.label ?? "home"}
      </span>
      {item && (
        <span className="text-muted-foreground pointer-events-none hidden truncate text-xs lg:inline">
          {"# "}
          {item.summary}
        </span>
      )}
    </header>
  );
}

function StatusBar() {
  const item = activeItem(usePathname());
  const hydrated = useAppStore((s) => s.hydrated);
  const apiKey = useAppStore((s) => s.apiKey);
  const openSettings = useAppStore((s) => s.openSettings);
  const sessionCost = useAppStore((s) => s.sessionCost);

  return (
    <footer className="bg-sidebar flex h-6 shrink-0 items-stretch border-t text-[11px]">
      <button
        type="button"
        onClick={openSettings}
        className={cn(
          "px-2.5 font-semibold tracking-wider uppercase",
          !hydrated
            ? "text-muted-foreground"
            : apiKey
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-background",
        )}
      >
        {!hydrated ? "…" : apiKey ? "key ok" : "no key"}
      </button>
      <span className="flex items-center border-r px-2.5">
        {item?.label ?? "home"}
      </span>
      <span
        className="flex items-center border-r px-2.5"
        title="Charged by OpenRouter since the app opened"
      >
        {/* Fixed 6 decimals: most calls cost fractions of a cent, and a
            constant width keeps the bar from jumping as the total grows. */}
        ${sessionCost.toFixed(6)}
        <span className="text-muted-foreground ml-1">session</span>
      </span>
      <span className="text-muted-foreground ml-auto flex items-center gap-3 px-2.5">
        <span>⌘K palette</span>
        <span>⌘1-9 tools</span>
        <span>⌘↵ run</span>
        <span>⌘, settings</span>
      </span>
    </footer>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const openSettings = useAppStore((s) => s.openSettings);

  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder="jump to a tool or run an action..." />
        <CommandList>
          <CommandEmpty>No match.</CommandEmpty>
          {NAV_GROUPS.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${group.title} ${item.label}`}
                  keywords={[item.summary]}
                  onSelect={() => run(() => router.push(item.href))}
                >
                  <span className="flex-1">{item.label}</span>
                  <span className="text-muted-foreground hidden truncate text-xs sm:inline">
                    {item.summary}
                  </span>
                  {shortcutFor(item.href) && (
                    <CommandShortcut>{shortcutFor(item.href)}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandGroup heading="actions">
            <CommandItem
              value="settings api key"
              onSelect={() => run(openSettings)}
            >
              <span className="flex-1">settings: openrouter key</span>
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

/**
 * The whole window: sidebar, title bar, the page, and a status bar, laid out
 * like a terminal multiplexer. Also owns the app-wide shortcuts.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrate = useAppStore((s) => s.hydrate);
  const openSettings = useAppStore((s) => s.openSettings);
  const addSessionCost = useAppStore((s) => s.addSessionCost);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // localStorage only exists in the browser, and these pages are prerendered.
  useEffect(() => hydrate(), [hydrate]);

  useEffect(() => {
    onCharged(addSessionCost);
    return () => onCharged(null);
  }, [addSessionCost]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.key === ",") {
        event.preventDefault();
        openSettings();
      } else if (/^[1-9]$/.test(event.key)) {
        const item = SHORTCUT_ITEMS[Number(event.key) - 1];
        if (!item) return;
        event.preventDefault();
        router.push(item.href);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, openSettings]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onPalette={() => setPaletteOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
        <StatusBar />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <KeySettingsDialog />
    </div>
  );
}
