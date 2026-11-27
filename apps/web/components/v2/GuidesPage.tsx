"use client";
import { useMemo, useState } from "react";
import { Href } from "./ui";

export type GuideCard = { slug: string; title: string; date: string; blurb: string; bucket: "Safety" | "Launching" | "Trading"; href?: string };

const CATS = ["All", "Safety", "Launching", "Trading"] as const;

export function V2Guides({ guides }: { guides: GuideCard[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const rows = useMemo(() => guides.filter((g) => (cat === "All" || g.bucket === cat) && g.title.toLowerCase().includes(q.toLowerCase())), [guides, q, cat]);
  const featured = guides[0];
  return (
    <div className="frame">
      <div className="phead">
        <div><div className="bul">Guides</div><h1 className="h1">Read the curve <span>before you trade.</span></h1></div>
        <label className="fld" style={{ minWidth: 240 }}><span>Search</span><input value={q} placeholder="Search guides" aria-label="Search guides" onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      <div className="ttabs">{CATS.map((c) => <button type="button" key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>)}</div>
      {featured && (
        <div className="sec">
          <Href canonical={featured.href || `/guides/${featured.slug}`} className="feat-g">
            <div className="fgt">
              <span className="tier">{featured.bucket}</span>
              <h2>{featured.title}</h2>
              <p className="muted">{featured.blurb}</p>
              <span className="mono dim">Read guide →</span>
            </div>
            <div className="fgi"><img src="/v2/welcome-hero.webp" alt="" /></div>
          </Href>
        </div>
      )}
      <div className="sec">
        <div className="glist">
          {rows.length === 0 && <p className="dim">No guides match that search.</p>}
          {rows.map((g, i) => (
            <Href key={g.slug} canonical={g.href || `/guides/${g.slug}`} className="gc">
              <div className="gt">
                <img src={i % 3 === 1 ? "/v2/welcome-hero.webp" : "/v2/arena-bg-c.webp"} alt="" />
                <span className="tier">{g.bucket}</span>
              </div>
              <div className="gb">
                <span className="mono dim" style={{ fontSize: 12 }}>{g.date}</span>
                <h4>{g.title}</h4>
                <span className="mono dim" style={{ fontSize: 12 }}>Read guide →</span>
              </div>
            </Href>
          ))}
        </div>
      </div>
    </div>
  );
}
