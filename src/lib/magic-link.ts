import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.MAGIC_LINK_SECRET!;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function sign(phone: string, expiresAt: number): string {
  return createHmac("sha256", SECRET)
    .update(`${phone}:${expiresAt}`)
    .digest("hex");
}

export function generateMagicToken(phone: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TTL_MS;
  return { token: sign(phone, expiresAt), expiresAt };
}

export function verifyMagicToken(phone: string, token: string, expiresAt: number): void {
  if (Date.now() > expiresAt) throw new Error("MAGIC_LINK_EXPIRED");
  const expected = sign(phone, expiresAt);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(token, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("MAGIC_LINK_INVALID");
}
