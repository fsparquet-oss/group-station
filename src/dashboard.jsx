import React, { useState } from "react";
import { supabase } from "./supabase";
import { salva } from "./db";
import { C, Btn, Card, Chip, Dot, Vuoto, Label, Anello, Linee, vetro, num, euro, data, oggi, giorniA } from "./ui";
import { tutteScadenze, coloreScad, OrgPerAzienda, ModificaScadenza, ModificaObiettivo } from "./views";
import { OggiGruppo, statoControlli } from "./oggi";
import { PercorsoObiettivi } from "./infografica";

const attiveDi = (ctx) => ctx.d.aziende.filter((a) => a.stato !== "in pausa" && (ctx.admin || ctx.d.accessi.some((x) => x.azienda_id === a.id && x.email.toLowerCase() === ctx.email)));
const pctObiettivo = (o) => o.valore_attuale != null && o.valore_obiettivo ? Math.min(100, (Number(o.valore_attuale) / Number(o.valore_obiettivo)) * 100) : 0;
const giornoMeno = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const Puntini = () => <span style={{ fontSize: 17, letterSpacing: 1, color: "inherit", lineHeight: 1 }}>•••</span>;
const Campanella = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
const Freccia = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>;
const titoloRiga = (t, azione) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "26px 2px 12px" }}><div style={{ fontSize: 18, fontWeight: 600 }}>{t}</div>{azione}</div>;

// ─────────────────────────────────────────── DASHBOARD
export function Dashboard({ ctx }) {
  const { d, vai } = ctx;
  const attive = attiveDi(ctx);
  const ids = new Set(attive.map((a) => a.id));
  const oggiStr = oggi();
  const stati = attive.map((a) => ({ a, ...statoControlli(d, a.id, oggiStr) }));
  const fatti = stati.reduce((s, x) => s + x.fatti, 0), totale = stati.reduce((s, x) => s + x.totale, 0);
  const pers = d.persone.filter((p) => ids.has(p.azienda_id)), vuote = pers.filter((p) => !p.nome).length;
  const scad = tutteScadenze(d).filter((s) => ids.has(s.azienda_id));
  const vicine = scad.filter((s) => s.giorni <= (s.avviso_giorni ?? 30));
  const obN = d.obiettivi.filter((o) => ids.has(o.azienda_id) && o.valore_obiettivo != null);
  const raggiunti = obN.filter((o) => pctObiettivo(o) >= 100).length;
  const [modScad, setModScad] = useState(null);

  // andamento ultimi 7 giorni
  const giorni = Array.from({ length: 7 }, (_, i) => giornoMeno(6 - i));
  const perc = (g, tipo) => {
    const lista = d.controlli.filter((c) => ids.has(c.azienda_id) && c.attivo !== false && c.tipo === tipo);
    if (!lista.length) return 0;
    const ok = lista.filter((c) => { const v = d.controlli_valori.find((x) => x.controllo_id === c.id && x.giorno === g); return tipo === "check" ? v?.fatto : v?.valore != null; }).length;
    return (ok / lista.length) * 100;
  };
  const serieSpunte = giorni.map((g) => perc(g, "check")), serieNumeri = giorni.map((g) => perc(g, "numero"));
  const etichette = giorni.map((g) => new Date(g + "T12:00:00").toLocaleDateString("it-IT", { weekday: "narrow" }).toUpperCase());
  const ieri = serieSpunte[5], oggiP = serieSpunte[6];

  // obiettivi per azienda
  const medie = attive.map((a) => { const l = obN.filter((o) => o.azienda_id === a.id); return { a, m: l.length ? l.reduce((s, o) => s + pctObiettivo(o), 0) / l.length : null }; }).filter((x) => x.m != null);
  const mediaTot = obN.length ? obN.reduce((s, o) => s + pctObiettivo(o), 0) / obN.length : 0;

  // da fare oggi: spunte di tutte le aziende, prima quelle da fare
  const spunte = d.controlli.filter((c) => ids.has(c.azienda_id) && c.attivo !== false && c.tipo === "check").map((c) => ({ c, fatto: !!d.controlli_valori.find((x) => x.controllo_id === c.id && x.giorno === oggiStr)?.fatto }));
  const daFare = [...spunte.filter((x) => !x.fatto), ...spunte.filter((x) => x.fatto)].slice(0, 5);
  const spunta = async ({ c, fatto }) => {
    if (!ctx.puoScrivere(c.azienda_id)) return;
    const v = d.controlli_valori.find((x) => x.controllo_id === c.id && x.giorno === oggiStr);
    const { error } = v ? await supabase.from("gs_controlli_valori").update({ fatto: !fatto }).eq("id", v.id) : await supabase.from("gs_controlli_valori").insert({ controllo_id: c.id, giorno: oggiStr, fatto: true, inserito_da: ctx.email });
    if (error) return alert(error.message);
    ctx.ricarica();
  };
  const spunteFatte = spunte.filter((x) => x.fatto).length;

  const tileChiara = (n, l, bg, col = C.text) => (
    <div style={{ background: bg, borderRadius: 16, padding: "12px 8px", textAlign: "center", flex: 1, minWidth: 0 }}>
      <div style={{ width: 20, height: 20, margin: "0 auto 6px", borderRadius: "50%", border: `1.5px solid ${col}`, opacity: 0.7 }} />
      <div style={{ fontSize: 22, fontWeight: 500, color: col }}>{n}</div>
      <div style={{ fontSize: 11, color: col, opacity: 0.75, marginTop: 1 }}>{l}</div>
    </div>
  );

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "1.15fr 1fr 0.95fr", gap: 16 }}>
        {/* Scheda nera: situazione del gruppo */}
        <div style={{ background: C.dark, color: "#fff", borderRadius: 24, padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 16, fontWeight: 500 }}>Situazione del gruppo</div><button onClick={() => vai({ tipo: "oggi" })} style={{ border: "none", background: "none", color: "#fff" }}><Puntini /></button></div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 44, fontWeight: 300, letterSpacing: -1 }}>{fatti}</span><span style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)", lineHeight: 1.2 }}>controlli fatti<br />oggi su {totale}</span></div>
            <div style={{ width: 1, height: 34, background: "rgba(255,255,255,.2)" }} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 44, fontWeight: 300, letterSpacing: -1 }}>{vuote}</span><span style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)", lineHeight: 1.2 }}>ruoli<br />da coprire</span></div>
          </div>
          <div style={{ width: 56, height: 4, background: "#f4efe4", borderRadius: 4, margin: "14px 0 16px" }} />
          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            {tileChiara(attive.length, "Aziende", "#bdbdbb")}
            {tileChiara(vicine.length, "Scadenze", "#f4efe4", vicine.length ? C.red : C.text)}
            {tileChiara(`${raggiunti}/${obN.length}`, "Obiettivi", "#f4efe4")}
          </div>
        </div>

        {/* Andamento settimana */}
        <div style={{ ...vetro, borderRadius: 24, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 16, fontWeight: 500 }}>Andamento settimana</div><span style={{ fontSize: 11.5, background: C.text, color: "#fff", borderRadius: 8, padding: "3px 7px" }}>{oggiP >= ieri ? "+" : ""}{Math.round(oggiP - ieri)}%</span></div>
          <div style={{ display: "flex", gap: 16, margin: "10px 0 6px", fontSize: 12.5, color: C.slate }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Dot color={C.text} />Spunte</span><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Dot color="#a9a9a7" />Numeri</span></div>
          <Linee serie={[{ valori: serieSpunte, colore: C.text }, { valori: serieNumeri, colore: "#a9a9a7" }]} etichette={etichette} evidenzia={6} altezza={110} />
        </div>

        {/* Obiettivi: ciambella */}
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 16, fontWeight: 500 }}>Obiettivi</div><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.8" strokeLinecap="round"><path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" /></svg></div>
          <div style={{ fontSize: 12.5, color: C.slate, marginTop: 4 }}><b style={{ color: C.text }}>{raggiunti}</b> raggiunti su {obN.length}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0", flex: 1 }}>
            <div style={{ flex: 1, display: "grid", gap: 9 }}>
              {medie.slice(0, 4).map(({ a, m }) => <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.slate }}><Dot color={C.text} size={6} /><span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.nome}</span><span style={{ color: C.grey }}>{Math.round(m)}%</span></div>)}
            </div>
            <div style={{ position: "relative" }}>
              <Anello pct={mediaTot} size={96} spessore={7} colore={C.text} fondo={C.soft} />
              <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: `1px dashed ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 17, fontWeight: 600 }}>{Math.round(mediaTot)}%</span><span style={{ fontSize: 9, color: C.grey }}>media</span></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => vai({ tipo: "organigramma" })} title="Organigramma" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: C.text, color: "#fff" }}>⌘</button>
            <button onClick={() => vai({ tipo: "obiettivi" })} style={{ flex: 1, border: `1.5px solid ${C.text}`, background: "none", borderRadius: 999, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>Apri obiettivi <Freccia /></button>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "0.85fr 2fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        {/* Da fare oggi */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Da fare oggi:</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Anello pct={spunte.length ? (spunteFatte / spunte.length) * 100 : 0} size={26} spessore={2.5} colore={C.text} fondo={C.line} testo={`${spunteFatte}/${spunte.length}`} /><button onClick={() => vai({ tipo: "oggi" })} style={{ border: "none", background: "none", color: C.text }}>✎</button></div>
          </div>
          {daFare.length === 0 && <Vuoto>Nessun controllo impostato.</Vuoto>}
          {daFare.map((x) => {
            const az = d.aziende.find((a) => a.id === x.c.azienda_id);
            return (
              <div key={x.c.id} onClick={() => spunta(x)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", cursor: "pointer" }}>
                <span style={{ width: 17, height: 17, borderRadius: 4, flexShrink: 0, marginTop: 1, border: x.fatto ? "none" : `1.5px solid ${C.line}`, background: x.fatto ? C.text : "#fff", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{x.fatto ? "✓" : ""}</span>
                <span style={{ fontSize: 13.5, color: x.fatto ? C.text : C.grey, lineHeight: 1.35 }}>{x.c.nome}<span style={{ fontSize: 11, color: C.grey }}> · {az?.nome}</span></span>
              </div>
            );
          })}
          <button onClick={() => vai({ tipo: "oggi" })} style={{ marginTop: 8, border: "none", background: "none", padding: 0, fontSize: 12.5, color: C.slate, display: "flex", alignItems: "center", gap: 4 }}>Tutti i controlli di oggi <Freccia /></button>
        </Card>

        {/* Scadenze in arrivo */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 2px 12px" }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Scadenze in arrivo ({vicine.length})</div>
            <button onClick={() => vai({ tipo: "scadenze" })} style={{ border: "none", background: "none", fontSize: 12.5, color: C.slate, display: "flex", alignItems: "center", gap: 3 }}>Tutte <Freccia /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12 }}>
            {scad.slice(0, ctx.mobile ? 3 : 2).map((s) => {
              const urgente = s.giorni <= (s.avviso_giorni ?? 30);
              const az = d.aziende.find((a) => a.id === s.azienda_id);
              return (
                <div key={s.id || s.chiave} onClick={() => vai({ tipo: "azienda", id: s.azienda_id, tab: "scadenze" })} style={{ background: C.card, borderRadius: 20, padding: 14, minHeight: 150, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: C.text }}><Campanella size={20} /><Puntini /></div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 14, lineHeight: 1.3, paddingRight: 30 }}>{s.titolo}</div>
                  <div style={{ fontSize: 11.5, color: C.grey, marginTop: "auto", paddingTop: 8 }}>{data(s.data)} · {az?.nome}</div>
                  <div style={{ position: "absolute", right: 0, bottom: 0, width: 42, height: 42, borderRadius: "16px 0 0 0", background: urgente ? C.text : C.soft, color: urgente ? "#fff" : C.slate, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600 }}>{s.giorni < 0 ? "!" : `${s.giorni}g`}</div>
                </div>
              );
            })}
            {ctx.admin && <button onClick={() => setModScad({ azienda_id: attive[0]?.id, tipo: "durc", avviso_giorni: 30 })} style={{ minHeight: 150, borderRadius: 20, border: `1.5px dashed ${C.grey}`, background: "transparent", fontSize: 14, color: C.text }}>+ Scadenza</button>}
          </div>
        </div>
      </div>

      {titoloRiga("Aziende")}
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
        {stati.map(({ a, fatti: f, totale: t }) => {
          const p = d.persone.filter((x) => x.azienda_id === a.id), vu = p.filter((x) => !x.nome).length;
          const ob = obN.filter((o) => o.azienda_id === a.id);
          return (
            <div key={a.id} onClick={() => vai({ tipo: "azienda", id: a.id, tab: "oggi" })} style={{ background: C.dark, color: "#fff", borderRadius: 22, padding: 18, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{a.nome}</div>
                <Anello pct={t ? (f / t) * 100 : 0} size={30} spessore={2.5} testo={`${f}/${t}`} />
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 6, display: "flex", alignItems: "center", gap: 7 }}><Dot color={a.colore} size={6} />{t && f === t ? "Controlli completati" : "Controlli in corso"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 12, lineHeight: 1.45 }}>
                <span style={{ color: "#fff" }}>Persone:</span> {p.length - vu} su {p.length} ruoli{ob.length ? <> · <span style={{ color: "#fff" }}>Obiettivi:</span> {Math.round(ob.reduce((s, o) => s + pctObiettivo(o), 0) / ob.length)}%</> : null}
              </div>
            </div>
          );
        })}
      </div>
      {modScad && <SceltaAziendaScadenza ctx={ctx} aziende={attive} s={modScad} onClose={() => setModScad(null)} />}
    </>
  );
}

function SceltaAziendaScadenza({ ctx, aziende, s, onClose }) {
  const [az, setAz] = useState(aziende.find((a) => a.id === s.azienda_id) || aziende[0]);
  return (
    <>
      <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 70, ...vetro, background: "rgba(255,255,255,.95)", borderRadius: 999, padding: 6, display: "flex", gap: 4, maxWidth: "94vw", overflowX: "auto" }}>
        {aziende.map((a) => <button key={a.id} onClick={() => setAz(a)} style={{ border: "none", borderRadius: 999, padding: "7px 12px", fontSize: 12.5, whiteSpace: "nowrap", background: az?.id === a.id ? C.text : "transparent", color: az?.id === a.id ? "#fff" : C.text }}>{a.nome}</button>)}
      </div>
      {az && <ModificaScadenza key={az.id} ctx={ctx} azienda={az} s={{ ...s, azienda_id: az.id }} onClose={onClose} />}
    </>
  );
}

// ─────────────────────────────────────────── PAGINE DEL GRUPPO
export function PaginaOggi({ ctx }) { return <OggiGruppo ctx={ctx} aziende={attiveDi(ctx)} />; }
export function PaginaOrg({ ctx }) { return <OrgPerAzienda ctx={ctx} aziende={attiveDi(ctx)} />; }

export function PaginaObiettivi({ ctx }) {
  const { d } = ctx;
  const attive = attiveDi(ctx);
  const [nuovo, setNuovo] = useState(!!ctx.vista?.nuovo);
  const [mod, setMod] = useState(null);
  React.useEffect(() => { if (ctx.vista?.nuovo) setNuovo(true); }, [ctx.vista?.nuovo]);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13.5, color: C.grey }}>Tocca il numero sottolineato per aggiornarlo, il titolo per modificare l'obiettivo.</div>
        {ctx.admin && ctx.mobile && <Btn onClick={() => setNuovo(true)}>+ Nuovo obiettivo</Btn>}
      </div>
      {attive.filter((a) => d.obiettivi.some((o) => o.azienda_id === a.id && o.valore_obiettivo != null)).map((a) => (
        <div key={a.id} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "0 0 10px 2px" }}><Dot color={a.colore} size={9} /><b style={{ fontSize: 17, fontWeight: 600 }}>{a.nome}</b></div>
          <PercorsoObiettivi ctx={ctx} lista={d.obiettivi.filter((o) => o.azienda_id === a.id && o.valore_obiettivo != null)} scrive={ctx.puoScrivere(a.id)} onApri={setMod} />
        </div>
      ))}
      {nuovo && <ModificaObiettivo ctx={ctx} azienda={null} o={{ stato: "da fare", unita: "" }} onClose={() => { setNuovo(false); ctx.vai({ tipo: "obiettivi" }); }} />}
      {mod && <ModificaObiettivo ctx={ctx} azienda={d.aziende.find((a) => a.id === mod.azienda_id)} o={mod} onClose={() => setMod(null)} />}
    </>
  );
}

export function PaginaScadenze({ ctx }) {
  const { d, vai } = ctx;
  const attive = attiveDi(ctx), ids = new Set(attive.map((a) => a.id));
  const lista = tutteScadenze(d).filter((s) => ids.has(s.azienda_id));
  const [nuova, setNuova] = useState(null);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13.5, color: C.grey }}>Tutte le scadenze del gruppo. Fine prova, contratti e revisioni arrivano da soli.</div>
        {ctx.admin && <Btn onClick={() => setNuova({ azienda_id: attive[0]?.id, tipo: "durc", avviso_giorni: 30 })}>+ Scadenza</Btn>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
        {lista.map((s) => {
          const urgente = s.giorni <= (s.avviso_giorni ?? 30), az = d.aziende.find((a) => a.id === s.azienda_id);
          return (
            <div key={s.id || s.chiave} onClick={() => vai({ tipo: "azienda", id: s.azienda_id, tab: "scadenze" })} style={{ background: C.card, borderRadius: 20, padding: 14, minHeight: 140, display: "flex", flexDirection: "column", cursor: "pointer", position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><Campanella size={19} /><span style={{ fontSize: 11, color: C.grey }}>{az?.nome}</span></div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12, lineHeight: 1.3, paddingRight: 28 }}>{s.titolo}</div>
              <div style={{ fontSize: 11.5, color: C.grey, marginTop: "auto", paddingTop: 8 }}>{data(s.data)}</div>
              <div style={{ position: "absolute", right: 0, bottom: 0, width: 46, height: 40, borderRadius: "16px 0 0 0", background: s.giorni < 0 ? C.red : urgente ? C.text : C.soft, color: urgente || s.giorni < 0 ? "#fff" : C.slate, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600 }}>{s.giorni < 0 ? `-${-s.giorni}g` : `${s.giorni}g`}</div>
            </div>
          );
        })}
      </div>
      {lista.length === 0 && <Card><Vuoto>Nessuna scadenza.</Vuoto></Card>}
      {nuova && <SceltaAziendaScadenza ctx={ctx} aziende={attive} s={nuova} onClose={() => setNuova(null)} />}
    </>
  );
}
