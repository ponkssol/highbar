"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { JtxSeg } from "@/components/JtxSeg";

export interface GuideItem { href: string; title: string; description: string; date: string; category: string }

const CATS = ["All", "Launching", "Trading", "Compare", "Safety"] as const;
const POS = ["10% 30%", "90% 40%", "50% 20%", "75% 60%", "30% 50%", "60% 30%"];
const img = (i: number) => (i % 3 === 1 ? "/brand/welcome-hero.webp" : "/brand/arena-bg-c.webp");

/** Search and category filter run in the browser over the published list. Presentation only. */
export function GuidesView({ items }: { items: GuideItem[] }) {
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");
  const rows = useMemo(() => items.filter((g) => (cat === "All" || g.category === cat) && g.title.toLowerCase().includes(q.trim().toLowerCase())), [items, cat, q]);
  const feat = items[0];
  return (
    <>
      <div className="phead">
        <div>
          <div className="bul">Library</div>
          <h1 className="h1">Guides to launching <span>and trading on highbar.</span></h1>
          <p className="muted" style={{ margin: "10px 0 0" }}>Shorter pages for the questions people bring to a Solana launchpad.</p>
        </div>
        <div className="inp sm" style={{ width: "min(340px,100%)" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guides" aria-label="Search guides" />
          <span className="dim mono" style={{ fontSize: 12 }}>⌘K</span>
        </div>
      </div>
      <JtxSeg line value={cat} onChange={setCat} label="Guide category" options={CATS.map((c) => ({ id: c, label: c }))} />
      <div className="sec msec">
        {feat && (
          <Link className="feat-g brk" href={feat.href}>
            <span className="c1" /><span className="c2" />
            <div className="fgt">
              <span className="tier Higher">Featured</span>
              <span className="mono dim" style={{ fontSize: 12 }}>{feat.date} · {feat.category}</span>
              <h2>{feat.title}</h2>
              <p className="muted">{feat.description}</p>
              <span className="mono dim" style={{ fontSize: 12 }}>Read guide →</span>
            </div>
            <div className="fgi"><img src="/brand/arena-bg-c.webp" alt="" style={{ objectPosition: "60% 40%" }} /></div>
          </Link>
        )}
        <div className="glist">
          {rows.length ? rows.map((g, i) => (
            <Link key={g.href} className="gc" href={g.href}>
              <div className="gt"><img src={img(i)} alt="" loading="lazy" style={{ objectPosition: POS[i % POS.length] }} /><span className="tier">{g.category}</span></div>
              <div className="gb"><span className="mono dim" style={{ fontSize: 12 }}>{g.date}</span><h4>{g.title}</h4><span className="mono dim" style={{ fontSize: 12 }}>Read guide →</span></div>
            </Link>
          )) : <p className="dim" style={{ padding: "28px 0", gridColumn: "1/-1" }}>No guides match that search.</p>}
        </div>
      </div>
    </>
  );
}
