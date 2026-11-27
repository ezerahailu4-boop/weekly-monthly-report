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
    expect(c.light.bg).toBe("bg-[#F0EDE0]");
    expect(c.light.text).toBe("text-[#52645A]");
    expect(c.dark.bg).toBe("bg-[#3A3E41]");
    expect(c.dark.text).toBe("text-[#B5B2AA]");
  });

  it("returns consistent values for overdue", () => {
    const c = statusColorsFor("overdue");
    expect(c.light.bg).toBe("bg-[#FBE8E8]");
    expect(c.light.text).toBe("text-[#DC5550]");
    expect(c.dark.bg).toBe("bg-[#4A1B1B]");
    expect(c.dark.text).toBe("text-[#E47777]");
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
    expect(c.light.text).toBe("text-[#8A5A1B]");
    expect(c.light.bg).toBe("bg-[#FBF0DF]");
    expect(c.dark.text).toBe("text-[#D6B56D]");
    expect(c.dark.bg).toBe("bg-[#3A2E14]");
  });

  it("returns consistent values for employee", () => {
    const c = roleColorsFor("employee");
    expect(c.light.text).toBe("text-[#263B30]");
    expect(c.light.bg).toBe("bg-[#D9CBA9/30]");
    expect(c.dark.text).toBe("text-[#F4F0E7]");
    expect(c.dark.bg).toBe("bg-[#34383A/50]");
  });
});
