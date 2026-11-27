"use client";
import { useState, type ReactNode } from "react";
import { fmtDateTimeUS } from "@/lib/date";
import { fmtSol, shortAddr } from "@/lib/format";
import { fetchObTokens, fetchPlatformOpenBook, num, providerLabel, type ObTokenRow, type ObWindow, type PlatformOpenBook } from "@/lib/openbook";
import { Href, SolNum, Tier, TokenCell, Tw } from "./ui";

const WINS: { id: ObWindow; label: string }[] = [
  { id: "all", label: "All time" }, { id: "30d", label: "30d" }, { id: "7d", label: "7d" }, { id: "24h", label: "24h" },
];

export function V2OpenBook({ initial, initialTokens }: { initial: PlatformOpenBook | null; initialTokens: ObTokenRow[] }) {
  const [win, setWin] = useState<ObWindow>("all");
  const [ob, setOb] = useState(initial);
  const [rows, setRows] = useState(initialTokens);
  const [status, setStatus] = useState<"all" | "bonding" | "migrated">("all");
  const [err, setErr] = useState("");

  const load = async (w: ObWindow, st: typeof status) => {
    setErr("");
    try {
      const [next, tokens] = await Promise.all([
        fetchPlatformOpenBook(w),
        fetchObTokens({ status: st, limit: 50 }),
      ]);
      setOb(next);
      setRows(tokens.rows ?? []);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const t = ob?.totals;
  const flow = ob?.feeFlow;
  const meta = ob?.meta;
  const shown = rows.filter((r) => status === "all" || (status === "migrated" ? r.status === "migrated" : r.status !== "migrated"));

  return (
    <div className="frame">
      <div className="phead">
        <div>
          <div className="bul">Open Book</div>
          <h1 className="h1">Every fee, <span>reconciled against chain.</span></h1>
          <p className="muted" style={{ marginTop: 10 }}>
            {meta?.indexedSlot ? <>Indexed to slot {meta.indexedSlot}</> : "Index status unavailable"}
            {meta?.indexedAt ? <> · synced {fmtDateTimeUS(meta.indexedAt)}</> : ""}
          </p>
        </div>
        <div className="tabs seg">
          {WINS.map((w) => <button type="button" key={w.id} className={win === w.id ? "on" : ""} onClick={() => { setWin(w.id); void load(w.id, status); }}>{w.label}</button>)}
        </div>
      </div>
      <div className="ttabs">
        <a href="#ob-overview">Overview</a><a href="#ob-treasury">Treasury</a><a href="#ob-flow">Fee flow</a><a href="#ob-tokens">All tokens</a><a href="#ob-method">Methodology</a>
      </div>
      {err && <p className="note">{err}</p>}
      <section className="obg" id="ob-overview">
        <Card k="Tokens launched" v={num(t?.tokensLaunched)?.toLocaleString("en-US") ?? "—"} />
        <Card k="Total volume" v={<SolNum v={num(t?.volumeSol)} digits={2} />} />
        <Card k="Total fees paid" v={<SolNum v={num(t?.feesPaidSol)} digits={4} />} />
        <Card k="DBC fees" v={<SolNum v={num(t?.dbcFeesSol)} digits={4} />} />
        <Card k="Creators earned" v={<SolNum v={num(t?.creatorsEarnedSol)} digits={4} />} />
        <Card k="Tips paid by traders" v={<SolNum v={num(t?.tipsSol)} digits={4} />} />
      </section>
      <section className="sec" id="ob-treasury">
        <div className="bul">Treasury <b>wallets</b></div>
        <div className="wgrid">
          {(ob?.treasuryWallets ?? []).length === 0 && <div className="wc"><b>No treasury snapshot yet.</b></div>}
          {(ob?.treasuryWallets ?? []).map((w) => (
            <div className="wc" key={w.address ?? w.ownerLabel}>
              <div className="wh"><b>{w.ownerLabel || w.roles?.[0] || "Wallet"}</b><span className="mono">{w.address ? shortAddr(w.address, 4) : "—"}</span></div>
              <div className="wv"><SolNum v={num(w.balanceSol)} digits={4} />{w.provenance && <em>{w.provenance}</em>}</div>
              <div className="wr"><span>Wrapped SOL</span><b>{num(w.wsolSol) == null ? "—" : fmtSol(num(w.wsolSol) as number, 4)}</b></div>
              <div className="wr"><span>24h change</span><b>{num(w.netChange24hSol) == null ? "—" : fmtSol(num(w.netChange24hSol) as number, 4)}</b></div>
            </div>
          ))}
        </div>
      </section>
      <section className="sec" id="ob-flow">
        <div className="bul">Fee <b>flow</b></div>
        <div className="flowlg">
          <span><i className="y" />On-platform (DBC)</span>
          <span><i className="p" />Off-platform (block engines)</span>
          <span><i className="g" />Network</span>
        </div>
        {!flow ? <p className="dim">Fee flow is not available for this window yet.</p> : (
          <div className="flow">
            <Col title="Paid by" nodes={[["Traders", num(flow.tradersSol), "n"]]} />
            <Col title="Fee type" nodes={[
              ["DBC fees", num(flow.feeTypes?.dbcSol), "y"],
              ["Tips to providers", num(flow.feeTypes?.tipsSol), "p"],
              ["Network base and priority", num(flow.feeTypes?.networkSol), "g"],
            ]} />
            <Col title="Recipient" nodes={[
              ["Meteora protocol", num(flow.recipients?.meteoraSol), "y"],
              ["Creators", num(flow.recipients?.creatorsSol), "y"],
              ["Platform", num(flow.recipients?.platformSol), "y"],
              ...(flow.recipients?.tips ?? []).map((tip) => [providerLabel(tip.provider), num(tip.sol), "p"] as [string, number | null, string]),
              ["Validators", num(flow.recipients?.validatorsSol), "g"],
              ["Burned base fee", num(flow.recipients?.burnedBaseFeeSol), "g"],
            ]} />
            <Col title="Platform use" nodes={[
              ["Buyback and burn", num(ob?.platformUse?.buybackSol), "y"],
              ["Operations", num(ob?.platformUse?.opsSol), "y"],
              ["Treasury", num(ob?.platformUse?.treasurySol), "y"],
            ]} />
          </div>
        )}
        <div className="callout" style={{ marginTop: 16 }}><b>Buyback and burn: </b>{ob?.buyback?.status === "live" ? "Live." : "Soon. The share is tracked, and burns start when $HIGHER launches."}</div>
      </section>
      <section className="sec" id="ob-tokens">
        <div className="head">
          <h2 className="h2" style={{ fontSize: 28 }}>All tokens</h2>
          <div className="tabs seg">
            {(["all", "bonding", "migrated"] as const).map((id) => (
              <button type="button" key={id} className={status === id ? "on" : ""} onClick={() => { setStatus(id); void load(win, id); }}>{id === "all" ? "All" : id === "bonding" ? "Bonding" : "Migrated"}</button>
            ))}
          </div>
        </div>
        <Tw id="ob-tokens">
          <table>
            <thead><tr><th>Token</th><th className="w3">Tier</th><th className="r w3">Volume</th><th className="r w3 h-md">Fees</th><th className="r w3 h-sm">Creator</th><th className="w3 h-sm">Status</th><th className="w2 r" /></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={7} className="dim empty-row">No tokens in this view.</td></tr>}
              {shown.map((r) => (
                <tr key={r.mint}>
                  <td><TokenCell name={r.name || "Token"} symbol={r.symbol || "?"} href={r.mint ? `/token/${r.mint}` : undefined} /></td>
                  <td>{r.tier ? <Tier tier={r.tier} /> : "—"}</td>
                  <td className="r num"><SolNum v={num(r.volumeSol)} digits={3} /></td>
                  <td className="r num h-md"><SolNum v={num(r.dbcFeesSol)} digits={4} /></td>
                  <td className="r num h-sm"><SolNum v={num(r.creatorEarnedSol)} digits={4} /></td>
                  <td className="h-sm">{r.status || "—"}</td>
                  <td className="r">{r.mint && <Href className="rb" canonical={`/token/${r.mint}`}>Open</Href>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tw>
      </section>
      <section className="sec meth" id="ob-method">
        <div className="bul">Methodology</div>
        <p>Figures come from the same Open Book API the current site uses. A missing value stays blank. Nothing on this page is a sample number.</p>
        <p>DBC fees are the curve trading fee. Tips are what traders paid block engines. Network is base fee plus priority fee. Platform use is the protocol&apos;s split of its share for closed periods when the API has it.</p>
      </section>
    </div>
  );
}

function Card({ k, v }: { k: string; v: ReactNode }) {
  return <div><div className="lbl">{k}</div><div className="v">{v}</div></div>;
}
function Col({ title, nodes }: { title: string; nodes: [string, number | null, string][] }) {
  return (
    <div className="fc">
      <div className="lbl">{title}</div>
      {nodes.map(([name, v]) => (
        <div className={`fn ${nodes.find((n) => n[0] === name)?.[2] ?? "g"}`} key={name}>
          <span>{name}</span>
          <b>{v == null ? "—" : v.toFixed(4)}</b>
        </div>
      ))}
    </div>
  );
}
