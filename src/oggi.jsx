import React, { useLayoutEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { salva, elimina } from "./db";
import { C, Btn, Card, Field, Modal, Chip, Dot, Vuoto, Label, num, data, oggi, giorniA } from "./ui";

// ─────────────────────────────────────────── GIORNO
const spostaGiorno = (g, n) => { const d = new Date(g + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const nomeGiorno = (g) => {
  const diff = giorniA(g);
  const testo = new Date(g + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  return diff === 0 ? "Oggi" : diff === -1 ? "Ieri" : diff === 1 ? "Domani" : testo;
};

export function SceltaGiorno({ ctx }) {
  const { giorno, setGiorno } = ctx;
  const bt = { border: "none", width: 40, height: 40, borderRadius: "50%", background: C.soft, fontSize: 18, color: C.text };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: C.card, borderRadius: 999, padding: 6 }}>
      <button style={bt} onClick={() => setGiorno(spostaGiorno(giorno, -1))}>‹</button>
      <div style={{ textAlign: "center", minWidth: 110 }}>
        <Label>{new Date(giorno + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long" })}</Label>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{nomeGiorno(giorno) === "Oggi" ? "Oggi · " + new Date(giorno + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : nomeGiorno(giorno)}</div>
      </div>
      <button style={bt} onClick={() => setGiorno(spostaGiorno(giorno, 1))}>›</button>
    </div>
  );
}

// Stato dei controlli di un'azienda in un giorno
export function statoControlli(d, aziendaId, giorno) {
  const lista = d.controlli.filter((c) => c.azienda_id === aziendaId && c.attivo !== false);
  const val = (c) => d.controlli_valori.find((v) => v.controllo_id === c.id && v.giorno === giorno);
  const fatti = lista.filter((c) => c.tipo === "check" ? val(c)?.fatto : val(c)?.valore != null).length;
  return { lista, val, fatti, totale: lista.length };
}

// Numero inserito: verde se raggiunge l'obiettivo, rosso se no
const coloreNumero = (c, v) => v == null ? C.grey : c.obiettivo == null ? C.text : (c.direzione === "giu" ? Number(v) <= Number(c.obiettivo) : Number(v) >= Number(c.obiettivo)) ? C.green : C.red;

// ─────────────────────────────────────────── CONTROLLI DEL GIORNO DI UN'AZIENDA
export function ControlliAzienda({ ctx, azienda, scrive, titolo, onApri }) {
  const { d, giorno } = ctx;
  const { lista, val, fatti, totale } = statoControlli(d, azienda.id, giorno);
  const [modifica, setModifica] = useState(null); // id del numero in modifica
  const [testo, setTesto] = useState("");
  const [gestisci, setGestisci] = useState(false);
  const numeri = lista.filter((c) => c.tipo === "numero"), check = lista.filter((c) => c.tipo === "check");

  async function scrivi(c, campi) {
    const esiste = val(c);
    const riga = { controllo_id: c.id, giorno, inserito_da: ctx.email, ...campi };
    const { error } = esiste
      ? await supabase.from("gs_controlli_valori").update(campi).eq("id", esiste.id)
      : await supabase.from("gs_controlli_valori").insert(riga);
    if (error) return alert("Non salvato: " + error.message);
    await ctx.ricarica();
  }
  const salvaNumero = async (c) => {
    const t = testo.replace(/\./g, "").replace(",", ".").trim();
    setModifica(null);
    if (t === "" && val(c)) { await elimina("gs_controlli_valori", val(c).id); await ctx.ricarica(); return; }
    if (t === "" || isNaN(Number(t))) return;
    await scrivi(c, { valore: Number(t) });
  };

  return (
    <Card style={{ padding: 18 }}>
      {titolo !== false && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          {titolo}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: totale && fatti === totale ? C.green : C.slate }}>{fatti}/{totale}</span>
        </div>
      )}
      {totale === 0 && <Vuoto>Nessun controllo per questa azienda.</Vuoto>}
      {numeri.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
          {numeri.map((c) => {
            const v = val(c)?.valore;
            const inModifica = modifica === c.id;
            return (
              <div key={c.id} onClick={() => { if (scrive && !c.auto && !inModifica) { setModifica(c.id); setTesto(v == null ? "" : String(v).replace(".", ",")); } }}
                style={{ background: C.soft, borderRadius: 16, padding: "12px 14px", cursor: scrive && !c.auto ? "pointer" : "default", outline: inModifica ? `2px solid ${C.text}` : "none" }}>
                <div style={{ fontSize: 13, color: C.slate, lineHeight: 1.3 }}>{c.nome}</div>
                {inModifica ? (
                  <input autoFocus inputMode="decimal" value={testo} onChange={(e) => setTesto(e.target.value)} onBlur={() => salvaNumero(c)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setModifica(null); }}
                    placeholder={c.unita === "€" ? "€" : c.unita} style={{ width: "100%", border: "none", background: "transparent", fontSize: 21, fontWeight: 600, padding: 0, marginTop: 4, outline: "none" }} />
                ) : (
                  <div style={{ fontSize: v == null ? 14.5 : 21, fontWeight: 600, marginTop: v == null ? 8 : 4, color: coloreNumero(c, v) }}>{v == null ? (scrive ? "+ inserisci" : "—") : num(v, c.unita)}</div>
                )}
                {c.obiettivo != null && <div style={{ fontSize: 11.5, color: C.grey, marginTop: 2 }}>obiettivo {num(c.obiettivo, c.unita)}</div>}
                {c.auto && <div style={{ fontSize: 11, color: C.grey, marginTop: 2 }}>automatico da Squadra</div>}
              </div>
            );
          })}
        </div>
      )}
      {check.length > 0 && (
        <div style={{ display: "grid", gap: 6, marginTop: numeri.length ? 10 : 0 }}>
          {check.map((c) => {
            const fatto = !!val(c)?.fatto;
            return (
              <div key={c.id} onClick={() => scrive && scrivi(c, { fatto: !fatto })} style={{ display: "flex", alignItems: "center", gap: 12, background: C.soft, borderRadius: 14, padding: "11px 13px", cursor: scrive ? "pointer" : "default" }}>
                <span style={{ width: 19, height: 19, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: fatto ? "none" : `1.5px solid ${C.line}`, background: fatto ? C.text : "#fff", color: "#fff" }}>{fatto ? "✓" : ""}</span>
                <span style={{ fontSize: 14.5, color: fatto ? C.grey : C.text, textDecoration: fatto ? "line-through" : "none" }}>{c.nome}</span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 10 }}>
        {onApri ? <Btn variant="link" small onClick={onApri}>Apri {azienda.nome} ›</Btn> : <span />}
        {ctx.admin && <Btn variant="link" small onClick={() => setGestisci(true)} style={{ color: C.slate }}>Modifica controlli</Btn>}
      </div>
      {gestisci && <GestisciControlli ctx={ctx} azienda={azienda} onClose={() => setGestisci(false)} />}
    </Card>
  );
}

// ─────────────────────────────────────────── AGGIUNGI / CAMBIA I CONTROLLI
function GestisciControlli({ ctx, azienda, onClose }) {
  const lista = ctx.d.controlli.filter((c) => c.azienda_id === azienda.id);
  const [nuovo, setNuovo] = useState({ tipo: "numero", nome: "", unita: "n", obiettivo: "", direzione: "su" });
  const [mod, setMod] = useState({});
  const campo = (c, k) => (k in (mod[c.id] || {}) ? mod[c.id][k] : c[k] ?? "");
  const setCampo = (c, k, v) => setMod((m) => ({ ...m, [c.id]: { ...(m[c.id] || {}), [k]: v } }));
  const n = (v) => v === "" || v == null ? null : Number(String(v).replace(",", "."));
  async function salvaTutto() {
    for (const [id, campi] of Object.entries(mod)) {
      const c = lista.find((x) => String(x.id) === id);
      await salva("gs_controlli", { id: Number(id), ...campi, ...("obiettivo" in campi ? { obiettivo: n(campi.obiettivo) } : {}) });
      if (!c) continue;
    }
    if (nuovo.nome.trim()) await salva("gs_controlli", { azienda_id: azienda.id, tipo: nuovo.tipo, nome: nuovo.nome.trim(), unita: nuovo.tipo === "numero" ? nuovo.unita : null, obiettivo: nuovo.tipo === "numero" ? n(nuovo.obiettivo) : null, direzione: nuovo.direzione, ordine: (nuovo.tipo === "check" ? 10 : 1) + lista.length });
    await ctx.ricarica(); onClose();
  }
  const togli = async (c) => { if (!confirm(`Togliere "${c.nome}"? Si cancellano anche i valori già inseriti.`)) return; await elimina("gs_controlli", c.id); await ctx.ricarica(); };
  const unita = [{ value: "n", label: "numero" }, { value: "€", label: "€" }, { value: "mq", label: "mq" }, { value: "h", label: "ore" }, { value: "%", label: "%" }];
  return (
    <Modal title={`Controlli di ogni giorno · ${azienda.nome}`} onClose={onClose} wide>
      <div style={{ fontSize: 13.5, color: C.slate, marginBottom: 14 }}>I <b>numeri</b> si scrivono ogni giorno (verdi se raggiungono l'obiettivo). Le <b>spunte</b> sono controlli da fare ogni giorno.</div>
      <div style={{ display: "grid", gap: 8 }}>
        {lista.map((c) => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : c.tipo === "numero" ? "2fr 1fr 1fr auto" : "1fr auto", gap: 8, alignItems: "end", background: C.bg, borderRadius: 14, padding: 10 }}>
            <Field label={c.tipo === "numero" ? "Numero" : "Spunta"} value={campo(c, "nome")} onChange={(v) => setCampo(c, "nome", v)} />
            {c.tipo === "numero" && <Field label="Unità" value={campo(c, "unita")} onChange={(v) => setCampo(c, "unita", v)} options={unita} />}
            {c.tipo === "numero" && <Field label="Obiettivo al giorno" type="number" value={campo(c, "obiettivo")} onChange={(v) => setCampo(c, "obiettivo", v)} />}
            <Btn variant="link" small onClick={() => togli(c)} style={{ paddingBottom: 12 }}>Togli</Btn>
          </div>
        ))}
      </div>
      <Label style={{ margin: "18px 0 8px" }}>Aggiungi</Label>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : nuovo.tipo === "numero" ? "1fr 2fr 1fr 1fr" : "1fr 3fr", gap: 8, alignItems: "end" }}>
        <Field label="Tipo" value={nuovo.tipo} onChange={(v) => setNuovo((x) => ({ ...x, tipo: v }))} options={[{ value: "numero", label: "Numero" }, { value: "check", label: "Spunta" }]} />
        <Field label="Nome" value={nuovo.nome} onChange={(v) => setNuovo((x) => ({ ...x, nome: v }))} placeholder={nuovo.tipo === "numero" ? "Es. Incassato oggi" : "Es. Controllato il calendario di domani"} />
        {nuovo.tipo === "numero" && <Field label="Unità" value={nuovo.unita} onChange={(v) => setNuovo((x) => ({ ...x, unita: v }))} options={unita} />}
        {nuovo.tipo === "numero" && <Field label="Obiettivo al giorno" type="number" value={nuovo.obiettivo} onChange={(v) => setNuovo((x) => ({ ...x, obiettivo: v }))} />}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}><Btn variant="soft" onClick={onClose}>Annulla</Btn><Btn onClick={salvaTutto}>Salva</Btn></div>
    </Modal>
  );
}

// ─────────────────────────────────────────── PAGINA "OGGI" DEL GRUPPO
export function OggiGruppo({ ctx, aziende }) {
  const { d, giorno, vai } = ctx;
  const stati = aziende.map((a) => ({ a, ...statoControlli(d, a.id, giorno) })).filter((x) => x.totale > 0);
  const fatti = stati.reduce((s, x) => s + x.fatti, 0), totale = stati.reduce((s, x) => s + x.totale, 0);
  const pct = totale ? Math.round((fatti / totale) * 100) : 0;
  const sfondo = { backgroundColor: C.text, backgroundImage: "radial-gradient(rgba(255,255,255,.09) 1px, transparent 1.2px)", backgroundSize: "9px 9px" };
  return (
    <>
      <SceltaGiorno ctx={ctx} />
      <div style={{ ...sfondo, borderRadius: 24, padding: "20px 22px", color: "#fff", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Dot color={C.red} size={9} /><Label color="rgba(255,255,255,.7)">Controlli fatti {giorniA(giorno) === 0 ? "oggi" : "il " + data(giorno)}</Label></div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}><span style={{ fontSize: 52, fontWeight: 200, letterSpacing: -1.5 }}>{fatti}/{totale}</span><span style={{ fontSize: 16, color: "rgba(255,255,255,.6)" }}>{pct}%</span></div>
        <div style={{ height: 4, background: "rgba(255,255,255,.15)", borderRadius: 9, marginTop: 12, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: "#fff", borderRadius: 9 }} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 12, alignItems: "start" }}>
        {stati.map(({ a }, i) => (
          <ControlliAzienda key={a.id} ctx={ctx} azienda={a} scrive={ctx.puoScrivere(a.id)} onApri={() => vai({ tipo: "azienda", id: a.id, tab: "oggi" })}
            titolo={<><span style={{ fontSize: 12, color: C.grey, fontWeight: 600 }}>{String(i + 1).padStart(2, "0")}</span><Dot color={a.colore} size={10} /><b style={{ fontSize: 18, fontWeight: 600 }}>{a.nome}</b></>} />
        ))}
      </div>
      {stati.length === 0 && <Card style={{ marginTop: 12 }}><Vuoto>Nessun controllo impostato.</Vuoto></Card>}
    </>
  );
}

// ─────────────────────────────────────────── OBIETTIVI A NUMERO
export function ObiettiviNumerici({ ctx, lista, scrive, onApri, mostraAzienda }) {
  const [modifica, setModifica] = useState(null);
  const [testo, setTesto] = useState("");
  const salvaAttuale = async (o) => {
    const t = testo.replace(/\./g, "").replace(",", ".").trim();
    setModifica(null);
    if (t !== "" && isNaN(Number(t))) return;
    const v = t === "" ? null : Number(t);
    if (v === (o.valore_attuale == null ? null : Number(o.valore_attuale))) return;
    await salva("gs_obiettivi", { id: o.id, valore_attuale: v, stato: v != null && Number(v) >= Number(o.valore_obiettivo) ? "fatto" : v ? "in corso" : o.stato });
    await ctx.ricarica();
  };
  const fmt = (v, u) => v == null ? "—" : u === "€" ? num(v, "€") : Number(v).toLocaleString("it-IT", { maximumFractionDigits: 1, useGrouping: "always" });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
      {lista.map((o) => {
        const pct = o.valore_attuale != null && o.valore_obiettivo ? Math.min(100, (Number(o.valore_attuale) / Number(o.valore_obiettivo)) * 100) : 0;
        const fatto = pct >= 100;
        const az = mostraAzienda && ctx.d.aziende.find((a) => a.id === o.azienda_id);
        const giorni = o.scadenza ? giorniA(o.scadenza) : null;
        return (
          <Card key={o.id} style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
              <div onClick={() => scrive && onApri && onApri(o)} style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, cursor: scrive ? "pointer" : "default" }}>{o.titolo}</div>
              {az && <Chip><Dot color={az.colore} size={7} />{az.nome}</Chip>}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
              {modifica === o.id ? (
                <input autoFocus inputMode="decimal" value={testo} onChange={(e) => setTesto(e.target.value)} onBlur={() => salvaAttuale(o)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setModifica(null); }}
                  style={{ width: 140, border: "none", borderRadius: 10, background: C.soft, fontSize: 26, fontWeight: 650, padding: "2px 8px", outline: `2px solid ${C.text}` }} />
              ) : (
                <span onClick={() => { if (scrive) { setModifica(o.id); setTesto(o.valore_attuale == null ? "" : String(o.valore_attuale).replace(".", ",")); } }} title={scrive ? "Tocca per aggiornare" : undefined}
                  style={{ fontSize: 28, fontWeight: 650, letterSpacing: -0.8, cursor: scrive ? "pointer" : "default", color: fatto ? C.green : C.text, borderBottom: scrive ? `2px dashed ${C.line}` : "none" }}>{fmt(o.valore_attuale, o.unita)}</span>
              )}
              <span style={{ fontSize: 15, color: C.grey }}>/ {fmt(o.valore_obiettivo, o.unita)}{o.unita && o.unita !== "€" ? " " + o.unita : ""}</span>
            </div>
            <div style={{ height: 7, background: C.soft, borderRadius: 9, marginTop: 12, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: fatto ? C.green : C.red, borderRadius: 9 }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.grey, marginTop: 7 }}>
              <span>{Math.round(pct)}%</span>
              {o.scadenza && <span style={{ color: !fatto && giorni < 0 ? C.red : C.grey }}>entro {data(o.scadenza)}{!fatto && giorni >= 0 ? ` · ${giorni} gg` : ""}</span>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────── ORGANIGRAMMA AD ALBERO
const LINEA = C.line;
export function AlberoOrg({ pers, onApri, zoom = "adatta" }) {
  const box = useRef(null), albero = useRef(null);
  const [adatta, setAdatta] = useState(1);
  useLayoutEffect(() => {
    const misura = () => { if (!box.current || !albero.current) return; const w = albero.current.scrollWidth, spazio = box.current.clientWidth - 40; setAdatta(Math.max(0.35, Math.min(1, spazio / w))); };
    misura(); window.addEventListener("resize", misura); return () => window.removeEventListener("resize", misura);
  }, [pers.length]);
  const scala = zoom === "adatta" ? adatta : zoom;
  // la cima dell'organigramma resta al centro dello schermo anche quando bisogna scorrere
  useLayoutEffect(() => { const b = box.current; if (b) b.scrollLeft = (b.scrollWidth - b.clientWidth) / 2; }, [scala, pers.length]);
  const ids = new Set(pers.map((p) => p.id));
  const figli = (id) => pers.filter((p) => id === null ? !p.responsabile_id || !ids.has(p.responsabile_id) : p.responsabile_id === id);
  const Casella = ({ p }) => p.azienda ? (
    <div onClick={() => onApri(p)} style={{ width: 160, background: C.text, color: "#fff", borderRadius: 16, padding: "12px 12px", cursor: "pointer", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: p.colore }} /><b style={{ fontSize: 14.5 }}>{p.nome}</b></div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 4 }}>{p.ruolo}</div>
    </div>
  ) : (
    <div onClick={() => onApri(p)} style={{ width: 160, background: p.nome ? C.card : "#fdf6f6", border: p.nome ? `1px solid ${C.line}` : `1.5px dashed ${C.red}`, borderRadius: 14, padding: "8px 10px", cursor: "pointer", textAlign: "left", display: "flex", gap: 8, alignItems: "center", boxShadow: p.nome ? "0 2px 8px rgba(0,0,0,.04)" : "none" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 12, background: p.nome ? C.slate : "#fff", color: p.nome ? "#fff" : C.red, border: p.nome ? "none" : `1.5px dashed ${C.red}` }}>{p.nome ? p.nome[0].toUpperCase() : "+"}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 650, lineHeight: 1.2, color: p.nome ? C.text : C.red }}>{p.nome || "Da coprire"}</div>
        <div style={{ fontSize: 11, color: C.slate, marginTop: 2, lineHeight: 1.25 }}>{p.ruolo}</div>
      </div>
    </div>
  );
  const V = (h = 16) => <div style={{ width: 2, height: h, background: LINEA, flexShrink: 0 }} />;
  // Le persone senza nessuno sotto stanno in colonna, così il diagramma resta stretto e si vede tutto
  const Colonna = ({ lista }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", position: "relative", paddingLeft: 14 }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 20, width: 2, background: LINEA }} />
      {lista.map((f, i) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", marginTop: i ? 8 : 0, position: "relative" }}>
          <div style={{ position: "absolute", left: -14, width: 14, height: 2, background: LINEA }} />
          <Casella p={f} />
        </div>
      ))}
    </div>
  );
  const Nodo = ({ p }) => {
    const sotto = figli(p.id);
    const foglie = sotto.filter((f) => figli(f.id).length === 0), rami = sotto.filter((f) => figli(f.id).length > 0);
    const gruppi = [...rami.map((f) => ({ k: f.id, nodo: f })), ...(foglie.length === 1 ? [{ k: "f" + foglie[0].id, nodo: foglie[0] }] : foglie.length ? [{ k: "col" + p.id, colonna: foglie }] : [])];
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Casella p={p} />
        {gruppi.length > 0 && <>
          {V()}
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {gruppi.map((g, i) => (
              <div key={g.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", padding: "0 6px" }}>
                {gruppi.length > 1 && <div style={{ position: "absolute", top: 0, height: 2, background: LINEA, left: i === 0 ? "50%" : 0, right: i === gruppi.length - 1 ? "50%" : 0 }} />}
                {V()}
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
    <div ref={box} style={{ overflow: "auto", background: C.card, borderRadius: 22, padding: 20, WebkitOverflowScrolling: "touch" }}>
      <div style={{ zoom: scala, margin: "0 auto", width: "max-content" }}>
      <div ref={albero} style={{ display: "flex", gap: 30, width: "max-content" }}>
        {radici.length === 0 ? <Vuoto>Organigramma vuoto.</Vuoto> : radici.map((p) => <Nodo key={p.id} p={p} />)}
      </div>
      </div>
    </div>
  );
}
