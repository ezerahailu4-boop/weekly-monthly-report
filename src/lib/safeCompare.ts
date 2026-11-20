import crypto from "crypto";

/**
 * Constant-time string comparison to prevent timing attacks.
 * Safely handles strings of different lengths without throwing RangeError.
 */
export function safeTimingCompare(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  if (!a || !b) {
    return false;
  }

  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    // Perform dummy timingSafeEqual on bufA to maintain constant-time behavior
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

