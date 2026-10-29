import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";
import bs58 from "bs58";
import type { FastifyInstance } from "fastify";
import { store } from "./store.js";

/** Sign-In With Solana: nonce (5 min, Postgres auth_nonces, single use) + ed25519 verify + HMAC session token (24h, recorded in auth_sessions). */
let SECRET = process.env.AUTH_SECRET || "";
const NONCE_TTL = 5 * 60_000;
const SESSION_TTL = 24 * 3600_000;

/** Without AUTH_SECRET, keep one generated secret in settings so sessions survive restarts. */
export async function initAuth() {
  if (SECRET) return;
  const s = await store.getSetting<string>("auth_secret");
  if (s) SECRET = s; else { SECRET = randomBytes(32).toString("hex"); await store.setSetting("auth_secret", SECRET); }
}

const b64u = (b: Buffer) => b.toString("base64url");
const sign = (payload: string) => b64u(createHmac("sha256", SECRET).update(payload).digest());
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function issueToken(address: string) {
  const exp = Date.now() + SESSION_TTL;
  const payload = b64u(Buffer.from(JSON.stringify({ sub: address, exp })));
  const token = `${payload}.${sign(payload)}`;
  await store.addSession(hashToken(token), address, exp);
  return { token, exp };
}

export async function verifyToken(token: string | undefined): Promise<string | null> {
  if (!token || !SECRET) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const want = Buffer.from(sign(payload)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof sub !== "string" || !(exp > Date.now())) return null;
    return (await store.sessionValid(hashToken(token))) ? sub : null;
  } catch { return null; }
}

function verifyEd25519(address: string, message: string, signatureB58: string) {
  const pub = Buffer.from(bs58.decode(address));
  const sig = Buffer.from(bs58.decode(signatureB58));
  if (pub.length !== 32 || sig.length !== 64) return false;
  const key = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: b64u(pub) }, format: "jwk" });
  return verify(null, Buffer.from(message, "utf8"), key, sig);
}

export function registerAuth(app: FastifyInstance) {
  app.get("/auth/nonce", async (req, reply) => {
    const address = String((req.query as { address?: string }).address ?? "");
    try { if (bs58.decode(address).length !== 32) throw 0; } catch { return reply.code(400).send({ error: "invalid address" }); }
    const nonce = randomBytes(16).toString("hex"), expiresAt = Date.now() + NONCE_TTL;
    await store.setNonce(address, nonce, expiresAt);
    return { nonce, expiresAt };
  });

  app.post("/auth/verify", async (req, reply) => {
    const { address, message, signature } = (req.body ?? {}) as { address?: string; message?: string; signature?: string };
    if (!address || !message || !signature) return reply.code(400).send({ error: "missing fields" });
    const n = await store.getNonce(address);
    if (!n || n.exp < Date.now()) return reply.code(401).send({ error: "nonce expired" });
    if (!message.includes(`\nNonce: ${n.nonce}\n`) || !message.includes(`\n${address}\n`)) return reply.code(401).send({ error: "nonce/address mismatch" });
    let ok = false;
    try { ok = verifyEd25519(address, message, signature); } catch { ok = false; }
    if (!ok) return reply.code(401).send({ error: "bad signature" });
    if (!(await store.takeNonce(address, n.nonce))) return reply.code(401).send({ error: "nonce expired" });
    return { address, ...(await issueToken(address)) };
  });

  app.get("/auth/me", async (req, reply) => {
    const h = req.headers.authorization ?? "";
    const sub = await verifyToken(h.startsWith("Bearer ") ? h.slice(7) : undefined);
    return sub ? { address: sub } : reply.code(401).send({ error: "unauthorized" });
  });
}
