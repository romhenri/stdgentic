import { PROMPTED_SERVICES } from "./prompted";

export interface NavItem {
  href: string;
  /** Lowercase, like a command name: this is what the sidebar prints. */
  label: string;
  summary: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Every tool in the app, in sidebar order. The sidebar, the command palette,
 * the Cmd+1..9 shortcuts and the home page all read this one list, so a new
 * tool only needs an entry here.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "compare",
    items: [
      {
        href: "/compare",
        label: "models",
        summary: "One prompt across 1 to 6 models, streaming side by side.",
      },
      {
        href: "/experiment",
        label: "prompts",
        summary: "1 to 5 variants of one prompt on the same model.",
      },
      {
        href: "/temperature",
        label: "temperature",
        summary: "One prompt at several temperatures, to see the drift.",
      },
    ],
  },
  {
    title: "write",
    items: [
      {
        href: "/generate",
        label: "generate",
        summary: "Describe the job, get a structured, production-ready prompt.",
      },
      {
        href: "/backtranslate",
        label: "backtranslate",
        summary: "Round-trip text through another language, model by model.",
      },
    ],
  },
  {
    title: "evaluate",
    items: [
      {
        href: "/judge",
        label: "loop",
        summary: "A challenger rewrites until a judge model accepts it.",
      },
      {
        href: "/ats",
        label: "resume",
        summary: "2 to 6 models score the same resume out of 100.",
      },
    ],
  },
  {
    title: "agents",
    items: [
      {
        href: "/agents/debate",
        label: "debate",
        summary:
          "Models argue a motion, then a judge scores them and picks a winner.",
      },
      {
        href: "/agents/brainstorm",
        label: "brainstorm",
        summary: "Models build on each other's ideas, laid out as a board.",
      },
      {
        href: "/agents/interview",
        label: "interview",
        summary: "One model interviews another, question by question.",
      },
    ],
  },
  {
    title: "prompted",
    items: [
      {
        href: "/prompted",
        label: "all services",
        summary: "Services with the prompt already written.",
      },
      ...PROMPTED_SERVICES.map((service) => ({
        href: `/prompted/${service.slug}`,
        label: service.title.toLowerCase(),
        summary: service.description,
      })),
    ],
  },
  {
    title: "log",
    items: [
      {
        href: "/history",
        label: "history",
        summary: "Past runs, ready to reopen.",
      },
    ],
  },
  {
    title: "ref",
    items: [
      {
        href: "/types",
        label: "types",
        summary: "The output type each service declares.",
      },
      {
        href: "/verbosity",
        label: "verbosity",
        summary: "The exact instructions each answer style sends.",
      },
    ],
  },
];

/** The tools Cmd+1..9 jump to: the ones you run, not the reference pages. */
export const SHORTCUT_ITEMS: NavItem[] = NAV_GROUPS.filter((group) =>
  ["compare", "write", "evaluate", "agents", "log"].includes(group.title),
)
  .flatMap((group) => group.items)
  .slice(0, 9);

/** The nav entry a pathname belongs to, longest match first. */
export function activeItem(pathname: string): NavItem | undefined {
  return NAV_GROUPS.flatMap((group) => group.items)
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
