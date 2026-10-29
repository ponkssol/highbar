import { createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";
import bs58 from "bs58";
import type { FastifyInstance } from "fastify";

/** Sign-In With Solana: nonce (5 min, in-memory) + ed25519 verify + HMAC session token (24h). */
const SECRET = process.env.AUTH_SECRET || randomBytes(32).toString("hex");
const NONCE_TTL = 5 * 60_000;
const SESSION_TTL = 24 * 3600_000;
const nonces = new Map<string, { nonce: string; exp: number }>();

const b64u = (b: Buffer) => b.toString("base64url");
const sign = (payload: string) => b64u(createHmac("sha256", SECRET).update(payload).digest());

export function issueToken(address: string) {
  const exp = Date.now() + SESSION_TTL;
  const payload = b64u(Buffer.from(JSON.stringify({ sub: address, exp })));
  return { token: `${payload}.${sign(payload)}`, exp };
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const want = Buffer.from(sign(payload)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof sub === "string" && exp > Date.now() ? sub : null;
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
    const nonce = randomBytes(16).toString("hex");
    nonces.set(address, { nonce, exp: Date.now() + NONCE_TTL });
    for (const [k, v] of nonces) if (v.exp < Date.now()) nonces.delete(k);
    return { nonce, expiresAt: Date.now() + NONCE_TTL };
  });

  app.post("/auth/verify", async (req, reply) => {
    const { address, message, signature } = (req.body ?? {}) as { address?: string; message?: string; signature?: string };
    if (!address || !message || !signature) return reply.code(400).send({ error: "missing fields" });
    const n = nonces.get(address);
    if (!n || n.exp < Date.now()) return reply.code(401).send({ error: "nonce expired" });
    if (!message.includes(`\nNonce: ${n.nonce}\n`) || !message.includes(`\n${address}\n`)) return reply.code(401).send({ error: "nonce/address mismatch" });
    let ok = false;
    try { ok = verifyEd25519(address, message, signature); } catch { ok = false; }
    if (!ok) return reply.code(401).send({ error: "bad signature" });
    nonces.delete(address);
    return { address, ...issueToken(address) };
  });

  app.get("/auth/me", async (req, reply) => {
    const h = req.headers.authorization ?? "";
    const sub = verifyToken(h.startsWith("Bearer ") ? h.slice(7) : undefined);
    return sub ? { address: sub } : reply.code(401).send({ error: "unauthorized" });
  });
}