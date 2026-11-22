import React, { useLayoutEffect, useRef, useState } from "react";
import { salva } from "./db";
import { C, Vuoto, num, data, giorniA } from "./ui";

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
  const bordo = vuota ? C.red : radice ? colore : colore;
  return (
    <div onClick={() => onApri(p)} style={{ width: 138, paddingTop: 30, cursor: "pointer", flexShrink: 0 }}>
      <div style={{ position: "relative", border: `1.6px ${vuota ? "dashed" : "solid"} ${bordo}`, borderRadius: 70, background: vuota ? "#fdf7f7" : "#fff", padding: "40px 12px 22px", textAlign: "center", minHeight: 182, boxShadow: "0 10px 24px rgba(17,22,25,.05)" }}>
        <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(145deg,#ffffff,#e9e9e7)", boxShadow: "0 6px 16px rgba(17,22,25,.16), inset 0 1px 0 #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {vuota ? <span style={{ fontSize: 22, color: C.red, fontWeight: 300 }}>+</span> : (
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="8.5" r="4.2" fill={radice ? colore : C.slate} /><path d="M3.8 21c.6-4.3 4-6.8 8.2-6.8s7.6 2.5 8.2 6.8" fill={radice ? colore : C.slate} /></svg>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: vuota ? C.red : colore, lineHeight: 1.2 }}>{p.nome || "Da coprire"}</div>
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
    <div ref={box} style={{ overflow: "auto", background: C.card, borderRadius: 26, padding: "26px 20px", WebkitOverflowScrolling: "touch" }}>
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

export function PercorsoObiettivi({ ctx, lista, scrive, onApri, colore = C.red }) {
  const [modifica, setModifica] = useState(null);
  const [testo, setTesto] = useState("");
  const mobile = ctx.mobile;
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
    <div style={{ background: C.card, borderRadius: 26, padding: mobile ? "22px 14px" : "30px 34px" }}>
      <div style={{ display: "flex", justifyContent: "center" }}><div style={{ fontSize: 11, letterSpacing: 3, color: C.grey, fontWeight: 600, borderLeft: `2px solid ${C.line}`, borderRight: `2px solid ${C.line}`, padding: "2px 14px" }}>START</div></div>
      <div style={{ marginTop: 10 }}>
        {lista.map((o, i) => {
          const destra = i % 2 === 0;
          const [c1, c2] = NASTRO[i % NASTRO.length];
          const pct = o.valore_attuale != null && o.valore_obiettivo ? Math.min(100, (Number(o.valore_attuale) / Number(o.valore_obiettivo)) * 100) : 0;
          const fatto = pct >= 100, giorni = o.scadenza ? giorniA(o.scadenza) : null;
          const nastro = (
            <div style={{ width: mobile ? "42%" : "40%", flexShrink: 0, minHeight: mobile ? 118 : 136, background: `linear-gradient(${destra ? 100 : 260}deg, ${c1}, ${c2})`, borderRadius: destra ? "0 90px 90px 0" : "90px 0 0 90px", display: "flex", alignItems: "center", justifyContent: destra ? "flex-end" : "flex-start", padding: mobile ? (destra ? "0 22px 0 10px" : "0 10px 0 22px") : (destra ? "0 34px 0 18px" : "0 18px 0 34px"), color: "#fff", boxShadow: `0 14px 26px ${destra ? "rgba(0,0,0,.08)" : "rgba(0,0,0,.14)"}`, position: "relative", zIndex: lista.length - i }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: mobile ? 46 : 60, fontWeight: 200, lineHeight: 0.95, letterSpacing: -1 }}>{String(i + 1).padStart(2, "0")}</div>
                <div style={{ fontSize: mobile ? 17 : 21, fontWeight: 300, marginTop: 2 }}>{Math.round(pct)}%</div>
              </div>
            </div>
          );
          const testoLato = (
            <div style={{ flex: 1, padding: destra ? "0 0 0 14px" : "0 14px 0 0", textAlign: destra ? "left" : "right", minWidth: 0, position: "relative", zIndex: 50 }}>
              <div onClick={() => scrive && onApri && onApri(o)} style={{ fontSize: mobile ? 15 : 17, fontWeight: 500, color: i % NASTRO.length === 3 || i % NASTRO.length === 0 ? C.red : C.text, lineHeight: 1.25, cursor: scrive ? "pointer" : "default" }}>{o.titolo}</div>
              <div style={{ marginTop: 6 }}>
                {modifica === o.id ? (
                  <input autoFocus inputMode="decimal" value={testo} onChange={(e) => setTesto(e.target.value)} onBlur={() => salvaAttuale(o)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setModifica(null); }}
                    style={{ width: 130, border: "none", borderRadius: 8, background: C.soft, fontSize: 18, padding: "2px 8px", outline: `2px solid ${C.text}`, textAlign: destra ? "left" : "right" }} />
                ) : (
                  <span onClick={() => { if (scrive) { setModifica(o.id); setTesto(o.valore_attuale == null ? "" : String(o.valore_attuale).replace(".", ",")); } }}
                    style={{ fontSize: mobile ? 18 : 22, fontWeight: 300, color: fatto ? C.green : C.text, cursor: scrive ? "pointer" : "default", borderBottom: scrive ? `1.5px dashed ${C.line}` : "none" }}>{fmt(o.valore_attuale, o.unita)}</span>
                )}
                <span style={{ fontSize: 13.5, color: C.grey }}> / {fmt(o.valore_obiettivo, o.unita)}{o.unita && o.unita !== "€" ? " " + o.unita : ""}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#a9a8a5", marginTop: 4 }}>{o.scadenza ? `entro ${data(o.scadenza)}${!fatto && giorni >= 0 ? ` · ${giorni} giorni` : ""}` : ""}{!fatto && giorni < 0 ? " · scaduto" : ""}</div>
            </div>
          );
          return (
            <div key={o.id} style={{ display: "flex", alignItems: "center", marginTop: i ? -16 : 0 }}>
              {destra ? <><div style={{ width: mobile ? "0%" : "18%", flexShrink: 0 }} />{nastro}{testoLato}</> : <>{testoLato}{nastro}<div style={{ width: mobile ? "0%" : "18%", flexShrink: 0 }} /></>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}><div style={{ fontSize: 11, letterSpacing: 3, color: C.grey, fontWeight: 600, borderLeft: `2px solid ${C.line}`, borderRight: `2px solid ${C.line}`, padding: "2px 14px" }}>STOP</div></div>
    </div>
  );
}
