import { describe, expect, it } from "vitest";
import { activeItem, SHORTCUT_ITEMS } from "./nav";

describe("activeItem", () => {
  it("matches with and without the trailing slash static export adds", () => {
    expect(activeItem("/compare")?.href).toBe("/compare");
    expect(activeItem("/compare/")?.href).toBe("/compare");
  });

  it("prefers a prompted service over the hub that prefixes it", () => {
    expect(activeItem("/prompted/fun-fact/")?.href).toBe("/prompted/fun-fact");
    expect(activeItem("/prompted/")?.href).toBe("/prompted");
  });

  it("returns nothing for the home page", () => {
    expect(activeItem("/")).toBeUndefined();
  });
});

describe("SHORTCUT_ITEMS", () => {
  it("fits Cmd+1..9 and skips reference pages", () => {
    expect(SHORTCUT_ITEMS).toHaveLength(9);
    expect(SHORTCUT_ITEMS.map((item) => item.href)).not.toContain("/types");
  });
});
