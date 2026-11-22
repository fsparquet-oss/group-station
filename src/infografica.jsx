import React, { useLayoutEffect, useRef, useState } from "react";
import { salva } from "./db";
import { C, Vuoto, Anello, num, data, giorniA } from "./ui";

// ─────────────────────────────────────────── ORGANIGRAMMA A PILLOLE (stile infografica)
const LINEA = "#b9b8b5";
const Punto = () => <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.slate, display: "block", flexShrink: 0 }} />;
const Giu = ({ h = 18, punto }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div style={{ width: 1.5, height: h, background: LINEA }} />
    {punto && <div style={{ marginTop: -4 }}><Punto /></div>}
  </div>
);

function Pillola({ p, colore, onApri, radice }) {
  const vuota = !p.nome;
  colore = C.text;
  const bordo = vuota ? "#bdbdba" : radice ? C.text : "#cfcfcc";
  return (
    <div onClick={() => onApri(p)} style={{ width: 138, paddingTop: 30, cursor: "pointer", flexShrink: 0 }}>
      <div style={{ position: "relative", border: `1.6px ${vuota ? "dashed" : "solid"} ${bordo}`, borderRadius: 70, background: vuota ? "rgba(255,255,255,.5)" : "#fff", padding: "40px 12px 22px", textAlign: "center", minHeight: 182, boxShadow: "0 10px 24px rgba(17,22,25,.05)" }}>
        <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(145deg,#ffffff,#e9e9e7)", boxShadow: "0 6px 16px rgba(17,22,25,.16), inset 0 1px 0 #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {vuota ? <span style={{ fontSize: 22, color: C.grey, fontWeight: 300 }}>+</span> : (
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="8.5" r="4.2" fill={radice ? colore : C.slate} /><path d="M3.8 21c.6-4.3 4-6.8 8.2-6.8s7.6 2.5 8.2 6.8" fill={radice ? colore : C.slate} /></svg>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: vuota ? C.grey : colore, lineHeight: 1.2 }}>{p.nome || "Da coprire"}</div>
        <div style={{ fontSize: 12.5, color: C.slate, marginTop: 6, lineHeight: 1.35 }}>{p.ruolo}</div>
        {p.compiti && <div style={{ fontSize: 10.5, color: "#a9a8a5", marginTop: 7, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.compiti.split("\n")[0]}</div>}
      </div>
    </div>
  );
}

export function OrgPillole({ pers, colore, onApri, zoom = "adatta" }) {
  const box = useRef(null), albero = useRef(null);
  const [adatta, setAdatta] = useState(1);
  useLayoutEffect(() => {
    const misura = () => { if (!box.current || !albero.current) return; setAdatta(Math.max(0.45, Math.min(1, (box.current.clientWidth - 40) / albero.current.scrollWidth))); };
    misura(); window.addEventListener("resize", misura); return () => window.removeEventListener("resize", misura);
  }, [pers.length]);
  const scala = zoom === "adatta" ? adatta : zoom;
  useLayoutEffect(() => { const b = box.current; if (b) b.scrollLeft = (b.scrollWidth - b.clientWidth) / 2; }, [scala, pers.length]);

  const ids = new Set(pers.map((p) => p.id));
  const figli = (id) => pers.filter((p) => id === null ? !p.responsabile_id || !ids.has(p.responsabile_id) : p.responsabile_id === id);
  // chi non ha nessuno sotto sta in colonna, così il diagramma non diventa troppo largo
  const Colonna = ({ lista }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {lista.map((f, i) => <React.Fragment key={f.id}>{i > 0 && <Giu h={10} />}<Pillola p={f} colore={colore} onApri={onApri} /></React.Fragment>)}
    </div>
  );
  const Nodo = ({ p, radice }) => {
    const sotto = figli(p.id);
    const foglie = sotto.filter((f) => figli(f.id).length === 0), rami = sotto.filter((f) => figli(f.id).length > 0);
    const gruppi = [...rami.map((f) => ({ k: f.id, nodo: f })), ...(foglie.length === 1 ? [{ k: "f" + foglie[0].id, nodo: foglie[0] }] : foglie.length ? [{ k: "c" + p.id, colonna: foglie }] : [])];
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Pillola p={p} colore={colore} onApri={onApri} radice={radice} />
        {gruppi.length > 0 && <>
          <Giu h={22} />
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {gruppi.map((g, i) => (
              <div key={g.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", padding: "0 10px" }}>
                {gruppi.length > 1 && <div style={{ position: "absolute", top: 0, height: 1.5, background: LINEA, left: i === 0 ? "50%" : 0, right: i === gruppi.length - 1 ? "50%" : 0 }} />}
                <Giu h={20} punto />
                {g.colonna ? <Colonna lista={g.colonna} /> : <Nodo p={g.nodo} />}
              </div>
            ))}
          </div>
        </>}
      </div>
    );
  };
  const radici = figli(null);
  return (
    <div ref={box} style={{ overflow: "auto", background: "rgba(255,255,255,.55)", borderRadius: 26, padding: "26px 20px", WebkitOverflowScrolling: "touch" }}>
      <div style={{ zoom: scala, margin: "0 auto", width: "max-content" }}>
        <div ref={albero} style={{ display: "flex", gap: 40, width: "max-content" }}>
          {radici.length === 0 ? <Vuoto>Organigramma vuoto.</Vuoto> : radici.map((p) => <Nodo key={p.id} p={p} radice />)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── PERCORSO OBIETTIVI (nastro a zig-zag)
const NASTRO = [["#e8b9a9", "#d79a86"], ["#6d6670", "#4e4952"], ["#3a3740", "#26242a"], ["#c75a45", "#8c0b0f"]];

export function PercorsoObiettivi({ ctx, lista, scrive, onApri }) {
  const [modifica, setModifica] = useState(null);
  const [testo, setTesto] = useState("");
  const fmt = (v, u) => v == null ? "—" : u === "€" ? num(v, "€") : Number(v).toLocaleString("it-IT", { maximumFractionDigits: 1, useGrouping: "always" });
  const salvaAttuale = async (o) => {
    const t = testo.replace(/\./g, "").replace(",", ".").trim();
    setModifica(null);
    if (t !== "" && isNaN(Number(t))) return;
    const v = t === "" ? null : Number(t);
    if (v === (o.valore_attuale == null ? null : Number(o.valore_attuale))) return;
    await salva("gs_obiettivi", { id: o.id, valore_attuale: v, stato: v != null && Number(v) >= Number(o.valore_obiettivo) ? "fatto" : v ? "in corso" : o.stato });
    await ctx.ricarica();
  };
  if (!lista.length) return <Vuoto>Nessun obiettivo a numero.</Vuoto>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
      {lista.map((o, i) => {
        const pct = o.valore_attuale != null && o.valore_obiettivo ? Math.min(100, (Number(o.valore_attuale) / Number(o.valore_obiettivo)) * 100) : 0;
        const fatto = pct >= 100, giorni = o.scadenza ? giorniA(o.scadenza) : null;
        const scuro = !fatto;
        const fg = scuro ? "#fff" : C.text, sub = scuro ? "rgba(255,255,255,.6)" : C.grey;
        return (
          <div key={o.id} style={{ background: scuro ? C.dark : C.card, color: fg, borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", minHeight: 150 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div onClick={() => scrive && onApri && onApri(o)} style={{ fontSize: 15.5, fontWeight: 500, lineHeight: 1.3, cursor: scrive && onApri ? "pointer" : "default" }}>{o.titolo}</div>
              <Anello pct={pct} size={44} spessore={3} colore={scuro ? "#fff" : C.text} fondo={scuro ? "rgba(255,255,255,.18)" : C.line} testo={`${Math.round(pct)}%`} />
            </div>
            <div style={{ fontSize: 12.5, color: sub, marginTop: 6, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: fg, opacity: 0.8 }} />{fatto ? "Raggiunto" : pct > 0 ? "In corso" : "Da iniziare"}</div>
            <div style={{ marginTop: "auto", paddingTop: 14 }}>
              {modifica === o.id ? (
                <input autoFocus inputMode="decimal" value={testo} onChange={(e) => setTesto(e.target.value)} onBlur={() => salvaAttuale(o)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setModifica(null); }}
                  style={{ width: 150, border: "none", borderRadius: 10, background: scuro ? "rgba(255,255,255,.12)" : C.soft, color: fg, fontSize: 24, padding: "2px 8px", outline: `2px solid ${fg}` }} />
              ) : (
                <span onClick={() => { if (scrive) { setModifica(o.id); setTesto(o.valore_attuale == null ? "" : String(o.valore_attuale).replace(".", ",")); } }}
                  style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.6, cursor: scrive ? "pointer" : "default", borderBottom: scrive ? `1.5px dashed ${scuro ? "rgba(255,255,255,.35)" : C.line}` : "none" }}>{fmt(o.valore_attuale, o.unita)}</span>
              )}
              <span style={{ fontSize: 13.5, color: sub }}> / {fmt(o.valore_obiettivo, o.unita)}{o.unita && o.unita !== "€" ? " " + o.unita : ""}</span>
              <div style={{ height: 4, background: scuro ? "rgba(255,255,255,.15)" : C.soft, borderRadius: 4, marginTop: 10, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: fg, borderRadius: 4 }} /></div>
              <div style={{ fontSize: 11.5, color: sub, marginTop: 7 }}><span style={{ color: fg }}>Scadenza:</span> {o.scadenza ? `${data(o.scadenza)}${!fatto && giorni >= 0 ? ` · tra ${giorni} giorni` : ""}${!fatto && giorni < 0 ? " · scaduto" : ""}` : "—"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
