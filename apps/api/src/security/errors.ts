import type { FastifyError, FastifyInstance } from "fastify";

const isProd = () => process.env.NODE_ENV === "production" || process.env.NETWORK === "mainnet" || process.env.NETWORK === "mainnet-beta";

/** Client-facing message for an error: 4xx keep a short message; 5xx get a generic one in production (details only in the server log). */
export function publicError(e: Partial<FastifyError> & { message?: string }, prod = isProd()): { status: number; body: { error: string } } {
  const status = typeof e.statusCode === "number" && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 500;
  if (status >= 500) return { status, body: { error: prod ? "internal error" : (e.message ?? "internal error").slice(0, 300) } };
  const msg = e.code === "FST_ERR_CTP_BODY_TOO_LARGE" ? "request body too large" : e.validation ? "invalid request" : (e.message ?? "bad request");
  return { status, body: { error: clean(msg) } };
}
/** One line, no stack frames / file paths, max 300 chars. */
export const clean = (m: string) => m.split("\n")[0].replace(/\(?(?:file:\/\/)?(?:[A-Za-z]:)?[\\/][^\s)]*\.(?:ts|js)(?::\d+)*\)?/g, "").trim().slice(0, 300);

/** Consistent JSON errors: { error } with no stack traces; 404s as JSON. */
export function registerErrors(app: FastifyInstance) {
  app.setErrorHandler((err, req, reply) => {
    const { status, body } = publicError(err as FastifyError);
    if (status >= 500) req.log.error({ err }, "request failed"); else req.log.info({ status, msg: body.error }, "request rejected");
    reply.code(status).send(body);
  });
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: "not found" }));
}
