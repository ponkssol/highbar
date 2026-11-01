import { test } from "node:test";
import assert from "node:assert/strict";
import { pushToast, safeTxHref, toastMs, type ToastItem } from "./toastq";

const t = (id: number, key = `k${id}`, kind: ToastItem["kind"] = "info"): ToastItem => ({ id, kind, text: key, key });
test("toasts: 1.5 s, errors 2 s; same message replaces, at most 3 stay (oldest leave first)", () => {
  assert.equal(toastMs("info"), 1500); assert.equal(toastMs("ok"), 1500); assert.equal(toastMs("err"), 2000);
  let l: ToastItem[] = [];
  l = pushToast(l, t(1)).list; l = pushToast(l, t(2)).list;
  const r = pushToast(l, t(3, "k1"));
  assert.deepEqual(r.list.map((x) => x.id), [2, 3]); assert.deepEqual(r.drop, [1]);
  let m = r.list; m = pushToast(m, t(4)).list;
  const o = pushToast(m, t(5));
  assert.deepEqual(o.list.map((x) => x.id), [3, 4, 5]); assert.deepEqual(o.drop, [2]);
});
test("toasts: View tx only for explorer links", () => {
  assert.equal(safeTxHref("https://solscan.io/tx/abc?cluster=devnet"), "https://solscan.io/tx/abc?cluster=devnet");
  assert.equal(safeTxHref("https://highbar.fun/t/x"), "https://highbar.fun/t/x");
  assert.equal(safeTxHref("javascript:alert(1)"), undefined); assert.equal(safeTxHref("https://solscan.io.evil.com/tx"), undefined); assert.equal(safeTxHref(undefined), undefined);
});
