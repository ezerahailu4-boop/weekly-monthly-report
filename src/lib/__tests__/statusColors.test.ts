import { describe, it, expect } from "vitest";
import { statusColorsFor, roleColorsFor } from "../statusColors";
import type { StatusVariant, RoleVariant } from "../statusColors";

describe("statusColorsFor", () => {
  const variants: StatusVariant[] = ["draft", "submitted", "reviewed", "overdue", "warning"];

  it("returns light and dark color defs for every variant", () => {
    for (const v of variants) {
      const colors = statusColorsFor(v);
      expect(colors.light).toHaveProperty("bg");
      expect(colors.light).toHaveProperty("border");
      expect(colors.light).toHaveProperty("text");
      expect(colors.light).toHaveProperty("dot");
      expect(colors.dark).toHaveProperty("bg");
      expect(colors.dark).toHaveProperty("border");
      expect(colors.dark).toHaveProperty("text");
      expect(colors.dark).toHaveProperty("dot");
    }
  });

  it("returns consistent values for draft", () => {
    const c = statusColorsFor("draft");
    expect(c.light.bg).toBe("bg-muted");
    expect(c.light.text).toBe("text-muted-foreground");
    expect(c.dark.bg).toBe("bg-muted");
    expect(c.dark.text).toBe("text-muted-foreground");
  });

  it("returns consistent values for overdue", () => {
    const c = statusColorsFor("overdue");
    expect(c.light.bg).toBe("bg-accent/10");
    expect(c.light.text).toBe("text-accent-strong");
    expect(c.dark.bg).toBe("bg-accent/10");
    expect(c.dark.text).toBe("text-accent-strong");
  });
});

describe("roleColorsFor", () => {
  const roles: RoleVariant[] = ["employee", "admin", "super_admin"];

  it("returns light and dark color defs for every role", () => {
    for (const r of roles) {
      const colors = roleColorsFor(r);
      expect(colors.light).toHaveProperty("text");
      expect(colors.light).toHaveProperty("bg");
      expect(colors.dark).toHaveProperty("text");
      expect(colors.dark).toHaveProperty("bg");
    }
  });

  it("returns consistent values for super_admin", () => {
    const c = roleColorsFor("super_admin");
    expect(c.light.text).toBe("text-accent-strong");
    expect(c.light.bg).toBe("bg-accent/10");
    expect(c.dark.text).toBe("text-accent-strong");
    expect(c.dark.bg).toBe("bg-accent/10");
  });

  it("returns consistent values for employee", () => {
    const c = roleColorsFor("employee");
    expect(c.light.text).toBe("text-foreground");
    expect(c.light.bg).toBe("bg-secondary");
    expect(c.dark.text).toBe("text-foreground");
    expect(c.dark.bg).toBe("bg-secondary");
  });
});
