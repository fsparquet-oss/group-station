import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";
import { salva, elimina } from "./db";
import { OggiGruppo, ControlliAzienda, SceltaGiorno, ObiettiviNumerici, AlberoOrg } from "./oggi";
import { OrgPillole, PercorsoObiettivi } from "./infografica";
import { C, Btn, Card, Field, Modal, Chip, Dot, Vuoto, griglia, Label, Tile, Segment, Fab, euro, num, data, oggi, giorniA, settimanaScorsa, spostaSettimana, nomeSettimana, esitoKpi, coloreEsito, etichetta } from "./ui";

const COEFF_COSTO = 1.95; // costo azienda stimato = netto × 1,95 (da verificare col consulente del lavoro)
const CHECKLIST = [
  "Contratto firmato e copia consegnata", "Comunicazione di assunzione (consulente del lavoro)", "Visita medica di idoneità",
  "Corso sicurezza (generale + specifico)", "DPI consegnati (scarpe, ginocchiere, guanti, mascherine)", "Accesso a Squadra / Group Station",
  "Presentazione alla squadra e al caposquadra", "Affiancamento prima settimana", "Attrezzi e furgone assegnati", "Valutazione di fine prova",
];
const TIPI_SCADENZA = [["durc", "DURC"], ["assicurazione", "Assicurazione"], ["visita", "Visita medica"], ["corso", "Corso sicurezza"], ["dominio", "Dominio"], ["marchio", "Marchio"], ["f24", "F24 / tasse"], ["revisione", "Revisione furgone"], ["contratto", "Contratto"], ["altro", "Altro"]];
const STATI_OB = ["da fare", "in corso", "fatto"];

const titolo = (t, sotto, azioni) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
    <div><div style={{ fontSize: 28, fontWeight: 750, letterSpacing: -0.8 }}>{t}</div>{sotto && <div style={{ fontSize: 13.5, color: C.grey, marginTop: 3 }}>{sotto}</div>}</div>
    {azioni && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{azioni}</div>}
  </div>
);
export const sezione = (t, azione) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "26px 0 10px", gap: 10 }}>
    <Label>{t}</Label>{azione}
  </div>
);

// Tutte le scadenze: quelle inserite + quelle automatiche (fine prova, contratti, attrezzature)
export const scadenzeVicine = (d) => tutteScadenze(d).filter((s) => s.giorni <= (s.avviso_giorni ?? 30)).length;

export function tutteScadenze(d, aziendaId) {
  const per = (x) => aziendaId == null || x.azienda_id === aziendaId;
  const nomeP = (id) => d.persone.find((p) => p.id === id);
  const out = d.scadenze.filter(per).map((s) => ({ ...s, origine: "manuale" }));
  for (const p of d.persone.filter(per)) {
    if (p.fine_prova) out.push({ chiave: "prova" + p.id, azienda_id: p.azienda_id, persona_id: p.id, titolo: `Fine prova · ${p.nome || p.ruolo}`, tipo: "contratto", data: p.fine_prova, avviso_giorni: 15, origine: "auto" });
    if (p.scadenza_contratto) out.push({ chiave: "contr" + p.id, azienda_id: p.azienda_id, persona_id: p.id, titolo: `Scadenza contratto · ${p.nome || p.ruolo}`, tipo: "contratto", data: p.scadenza_contratto, avviso_giorni: 30, origine: "auto" });
  }
  for (const a of d.attrezzature.filter(per)) if (a.scadenza) out.push({ chiave: "att" + a.id, azienda_id: a.azienda_id, titolo: `${a.tipo === "furgone" ? "Revisione/assicurazione" : "Scadenza"} · ${a.nome}${a.codice ? " " + a.codice : ""}`, tipo: "revisione", data: a.scadenza, avviso_giorni: 30, origine: "auto", persona_id: a.persona_id });
  return out.filter((s) => s.data && !s.fatto).map((s) => ({ ...s, giorni: giorniA(s.data), persona: nomeP(s.persona_id) })).sort((a, b) => a.data.localeCompare(b.data));
}
export const coloreScad = (s) => s.giorni < 0 ? C.red : s.giorni <= (s.avviso_giorni ?? 30) ? C.amber : C.grey;
export const testoGiorni = (g) => g < 0 ? `scaduta da ${-g} gg` : g === 0 ? "oggi" : `tra ${g} gg`;

// ─────────────────────────────────────────── HOME DEL GRUPPO
const sfondoPunti = { backgroundColor: C.text, backgroundImage: "radial-gradient(rgba(255,255,255,.09) 1px, transparent 1.2px)", backgroundSize: "9px 9px" };
const valoreKpi = (d, k, sett) => d.kpi_valori.find((v) => v.kpi_id === k.id && v.settimana === sett)?.valore;
const sommaKpi = (d, filtro, sett) => { const vals = d.kpi.filter(filtro).map((k) => valoreKpi(d, k, sett)).filter((v) => v != null); return vals.length ? vals.reduce((s, v) => s + Number(v), 0) : null; };

function SceltaSettimana({ ctx }) {
  const { sett, setSett } = ctx;
  const bt = { border: "none", width: 40, height: 40, borderRadius: "50%", background: C.soft, fontSize: 18, color: C.text };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: C.card, borderRadius: 999, padding: 6 }}>
      <button style={bt} onClick={() => setSett(spostaSettimana(sett, -1))}>‹</button>
      <div style={{ textAlign: "center", minWidth: 96 }}><Label>Settimana</Label><div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{nomeSettimana(sett)}</div></div>
      <button style={bt} onClick={() => setSett(spostaSettimana(sett, 1))}>›</button>
    </div>
  );
}

function TileKpi({ k, v, small }) {
  const es = esitoKpi(k, v);
  return (
    <div style={{ background: C.soft, borderRadius: 16, padding: small ? "11px 13px" : "13px 15px", minWidth: 0 }}>
      <div style={{ fontSize: 13, color: C.slate, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.nome}</div>
      <div style={{ fontSize: small ? 19 : 22, fontWeight: 600, marginTop: 4, color: es === "vuoto" ? C.grey : es === "rosso" ? C.red : es === "verde" ? C.green : C.text }}>{v == null ? "—" : num(v, k.unita)}</div>
    </div>
  );
}

export function Home({ ctx }) {
  const { d, vai, admin, sett } = ctx;
  const [nuova, setNuova] = useState(false);
  const [vistaHome, setVistaHome] = useState("oggi");
  const visibili = d.aziende.filter((a) => admin || d.accessi.some((x) => x.azienda_id === a.id && x.email.toLowerCase() === ctx.email));
  const attive = visibili.filter((a) => a.stato !== "in pausa");
  const pausa = visibili.filter((a) => a.stato === "in pausa");
  const ids = new Set(attive.map((a) => a.id));
  const fatturato = sommaKpi(d, (k) => ids.has(k.azienda_id) && /^fatturato/i.test(k.nome), sett);
  const ore = sommaKpi(d, (k) => ids.has(k.azienda_id) && /^ore di fabio/i.test(k.nome), sett);
  const scaduti = d.obiettivi.filter((o) => ids.has(o.azienda_id) && o.stato !== "fatto" && o.scadenza && giorniA(o.scadenza) < 0).length;
  const scad = tutteScadenze(d).filter((s) => ids.has(s.azienda_id) && s.giorni <= (s.avviso_giorni ?? 30));
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div><div style={{ fontSize: 34, fontWeight: 650, letterSpacing: -1 }}>Il gruppo</div><div style={{ fontSize: 15, color: C.grey, marginTop: 2 }}>{attive.length} aziende attive{pausa.length ? ` · ${pausa.length} in pausa` : ""}</div></div>
        {admin && <Btn variant="red" onClick={() => setNuova(true)} style={{ padding: "13px 20px", fontSize: 15 }}>+ Azienda</Btn>}
      </div>
      <Segment items={[["oggi", "Oggi"], ["organigramma", "Organigramma"], ["obiettivi", "Obiettivi"], ["settimana", "Settimana"]]} value={vistaHome} onChange={setVistaHome} style={{ display: "inline-flex", marginBottom: 16 }} />
      {vistaHome === "oggi" && <OggiGruppo ctx={ctx} aziende={attive} />}
      {vistaHome === "organigramma" && <OrgPerAzienda ctx={ctx} aziende={attive} />}
      {vistaHome === "obiettivi" && <>
        <div style={{ fontSize: 13.5, color: C.grey, marginBottom: 12 }}>Tocca il numero sottolineato per aggiornarlo.</div>
        {attive.filter((a) => d.obiettivi.some((o) => o.azienda_id === a.id && o.valore_obiettivo != null)).map((a) => (
          <div key={a.id} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "0 0 10px 4px" }}><Dot color={a.colore} size={11} /><b style={{ fontSize: 19, fontWeight: 600 }}>{a.nome}</b></div>
            <PercorsoObiettivi ctx={ctx} lista={d.obiettivi.filter((o) => o.azienda_id === a.id && o.valore_obiettivo != null)} scrive={ctx.puoScrivere(a.id)} />
          </div>
        ))}
      </>}
      {vistaHome === "settimana" && <>
      <SceltaSettimana ctx={ctx} />

      <div style={{ ...sfondoPunti, borderRadius: 24, padding: "20px 22px", color: "#fff", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Dot color={C.red} size={9} /><Label n={1} color="rgba(255,255,255,.7)">Fatturato settimana</Label></div>
        <div style={{ fontSize: 52, fontWeight: 200, letterSpacing: -1.5, marginTop: 10 }}>{fatturato == null ? "—" : euro(fatturato)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
        <Tile n={2} label="Ore di Fabio" value={ore == null ? "—" : `${num(ore)} h`} />
        <Tile n={3} label="Obiettivi scaduti" value={scaduti} color={scaduti ? C.red : C.text} />
        <Tile n={4} label="Scadenze vicine" value={scad.length} color={scad.length ? C.red : C.text} />
      </div>

      <div style={{ ...griglia(340), marginTop: 16 }}>
        {attive.map((a, i) => {
          const kpi = d.kpi.filter((k) => k.azienda_id === a.id);
          const es = kpi.map((k) => esitoKpi(k, valoreKpi(d, k, sett)));
          const rossi = es.filter((x) => x === "rosso").length, vuoti = es.filter((x) => x === "vuoto").length;
          const vuote = d.persone.filter((p) => p.azienda_id === a.id && !p.nome).length;
          const sc = scad.filter((s) => s.azienda_id === a.id).length;
          const ob = d.obiettivi.filter((o) => o.azienda_id === a.id && o.stato !== "fatto").length;
          const stato = rossi ? C.red : kpi.length && !vuoti ? C.green : C.line;
          return (
            <Card key={a.id} onClick={() => vai({ tipo: "azienda", id: a.id, tab: "oggi" })} style={{ cursor: "pointer", padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: C.grey, fontWeight: 600 }}>{String(i + 1).padStart(2, "0")}</span><Dot color={a.colore} size={10} />
                <b style={{ fontSize: 19, fontWeight: 600, flex: 1 }}>{a.nome}</b><Dot color={stato} size={13} />
              </div>
              {kpi.length > 0 ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{kpi.slice(0, 4).map((k) => <TileKpi key={k.id} k={k} v={valoreKpi(d, k, sett)} small />)}</div>
                : <div style={{ fontSize: 13, color: C.grey }}>{a.descrizione}</div>}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {vuoti > 0 && <Chip color={C.amber} bg="#fbf0dc">{vuoti} da compilare</Chip>}
                {vuote > 0 && <Chip>{vuote} ruoli da coprire</Chip>}
                {sc > 0 && <Chip color={C.red} bg="#f8e3e3">{sc} scadenze vicine</Chip>}
                {ob > 0 && <Chip>{ob} obiettivi aperti</Chip>}
              </div>
            </Card>
          );
        })}
      </div>

      </>}
      {pausa.length > 0 && <>
        {sezione("In pausa")}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {pausa.map((a) => <Chip key={a.id} onClick={() => vai({ tipo: "azienda", id: a.id, tab: "oggi" })} bg={C.card} style={{ padding: "7px 13px", fontSize: 13 }}>{a.nome}{a.pausa_fino ? ` · fino al ${data(a.pausa_fino)}` : ""}</Chip>)}
        </div>
      </>}
      {nuova && <ModificaAzienda ctx={ctx} azienda={{ nome: "", descrizione: "", colore: "#4f7cac", stato: "attiva", ordine: d.aziende.length + 1 }} onClose={() => setNuova(false)} />}
    </>
  );
}

// Organigramma diviso per azienda: scegli l'azienda e vedi il suo diagramma a pillole
export function OrgPerAzienda({ ctx, aziende }) {
  const { d } = ctx;
  const prima = aziende.find((a) => !/direzione/i.test(a.nome)) || aziende[0];
  const [scelta, setScelta] = useState(prima ? prima.id : "gruppo");
  const [aperta, setAperta] = useState(null);
  const az = aziende.find((a) => a.id === scelta);
  const pers = az ? d.persone.filter((p) => p.azienda_id === az.id) : [];
  const vuote = pers.filter((p) => !p.nome).length;
  return (
    <>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
        {aziende.map((a) => <button key={a.id} onClick={() => setScelta(a.id)} style={{ border: "none", borderRadius: 999, padding: "9px 15px", fontSize: 14, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8, background: scelta === a.id ? C.text : C.card, color: scelta === a.id ? "#fff" : C.text }}><Dot color={a.colore} size={9} />{a.nome}</button>)}
        <button onClick={() => setScelta("gruppo")} style={{ border: "none", borderRadius: 999, padding: "9px 15px", fontSize: 14, whiteSpace: "nowrap", background: scelta === "gruppo" ? C.text : C.card, color: scelta === "gruppo" ? "#fff" : C.slate }}>Tutto il gruppo</button>
      </div>
      {scelta === "gruppo" || !az ? <OrgGruppo ctx={ctx} aziende={aziende} /> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
          <Tile n={1} label="Ruoli" value={pers.length} />
          <Tile n={2} label="Coperti" value={pers.length - vuote} />
          <Tile n={3} label="Da coprire" value={vuote} bg={vuote ? C.red : C.card} />
        </div>
        <OrgPillole pers={pers} colore={az.colore === "#111619" ? C.slate : az.colore} onApri={setAperta} />
        {aperta && <SchedaPersona ctx={ctx} azienda={az} scrive={ctx.puoScrivere(az.id)} p={aperta} onClose={() => setAperta(null)} />}
      </>}
    </>
  );
}

// Un unico diagramma con tutto il gruppo: in alto soci e CEO, sotto una colonna per ogni azienda con il suo albero
function OrgGruppo({ ctx, aziende }) {
  const { d } = ctx;
  const [aperta, setAperta] = useState(null);
  const L = C.line;
  const dir = aziende.find((a) => /direzione/i.test(a.nome));
  const persDir = dir ? d.persone.filter((p) => p.azienda_id === dir.id) : [];
  const capo = persDir.find((p) => /ceo/i.test(p.ruolo)) || persDir.find((p) => !p.responsabile_id);
  const cima = [];
  for (let x = capo; x; x = persDir.find((p) => p.id === x.responsabile_id)) cima.unshift(x);
  const colonne = [
    ...(dir ? [{ a: dir, titolo: "Staff di direzione", pers: persDir.filter((p) => !cima.includes(p)) }] : []),
    ...aziende.filter((x) => x !== dir).map((a) => ({ a, titolo: a.nome, pers: d.persone.filter((p) => p.azienda_id === a.id) })),
  ];
  const tutte = d.persone.filter((p) => aziende.some((a) => a.id === p.azienda_id));
  const vuote = tutte.filter((p) => !p.nome).length;
  const Box = ({ p, grande }) => (
    <div onClick={() => setAperta(p)} style={{ display: "flex", alignItems: "center", gap: 8, background: p.nome ? C.card : "#fdf6f6", border: p.nome ? `1px solid ${L}` : `1.5px dashed ${C.red}`, borderRadius: 12, padding: grande ? "10px 14px" : "7px 9px", cursor: "pointer", minWidth: 0, width: grande ? 210 : "100%" }}>
      <div style={{ width: grande ? 30 : 24, height: grande ? 30 : 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11, background: p.nome ? C.slate : "#fff", color: p.nome ? "#fff" : C.red, border: p.nome ? "none" : `1.5px dashed ${C.red}` }}>{p.nome ? p.nome[0].toUpperCase() : "+"}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: grande ? 14 : 12.5, fontWeight: 650, lineHeight: 1.2, color: p.nome ? C.text : C.red }}>{p.nome || "Da coprire"}</div>
        <div style={{ fontSize: grande ? 12 : 11, color: C.slate, lineHeight: 1.25, marginTop: 1 }}>{p.ruolo}</div>
      </div>
    </div>
  );
  const Ramo = ({ p, pers }) => {
    const sotto = pers.filter((x) => x.responsabile_id === p.id);
    return (
      <div>
        <Box p={p} />
        {sotto.length > 0 && (
          <div style={{ marginLeft: 11, paddingLeft: 12, borderLeft: `2px solid ${L}`, display: "grid", gap: 6, paddingTop: 6 }}>
            {sotto.map((f) => <div key={f.id} style={{ position: "relative" }}><div style={{ position: "absolute", left: -12, top: 18, width: 12, height: 2, background: L }} /><Ramo p={f} pers={pers} /></div>)}
          </div>
        )}
      </div>
    );
  };
  const Colonna = ({ c }) => {
    const ids = new Set(c.pers.map((p) => p.id));
    const radici = c.pers.filter((p) => !p.responsabile_id || !ids.has(p.responsabile_id));
    const vu = c.pers.filter((p) => !p.nome).length;
    return (
      <div style={{ width: 194, flexShrink: 0 }}>
        <div onClick={() => ctx.vai({ tipo: "azienda", id: c.a.id, tab: "organigramma" })} style={{ background: C.text, color: "#fff", borderRadius: 14, padding: "10px 12px", cursor: "pointer", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: c.a.colore }} /><b style={{ fontSize: 14.5 }}>{c.titolo}</b></div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 3 }}>{c.pers.length} ruoli · {vu} da coprire</div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>{radici.map((p) => <Ramo key={p.id} p={p} pers={c.pers} />)}</div>
      </div>
    );
  };
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
        <Tile label="Ruoli nel gruppo" value={tutte.length} />
        <Tile label="Coperti" value={tutte.length - vuote} />
        <Tile label="Da coprire" value={vuote} bg={vuote ? C.red : C.card} />
      </div>
      <div style={{ fontSize: 13, color: C.grey, marginBottom: 8 }}>Tocca un'azienda per aprirla, una persona per la sua scheda. Rosso tratteggiato = ruolo da coprire.{ctx.mobile ? " Scorri di lato per vedere tutte le aziende." : ""}</div>
      <div style={{ background: C.card, borderRadius: 22, padding: 14, overflowX: "auto" }}>
        <div style={{ width: "max-content", minWidth: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {cima.map((p, i) => <React.Fragment key={p.id}>{i > 0 && <div style={{ width: 2, height: 14, background: L }} />}<Box p={p} grande /></React.Fragment>)}
            <div style={{ width: 2, height: 16, background: L }} />
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            {colonne.map((c, i) => (
              <div key={c.a.id} style={{ position: "relative", paddingTop: 16 }}>
                <div style={{ position: "absolute", top: 0, height: 2, background: L, left: i === 0 ? "50%" : -6, right: i === colonne.length - 1 ? "50%" : -6 }} />
                <div style={{ position: "absolute", top: 0, left: "50%", width: 2, height: 16, background: L }} />
                <Colonna c={c} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {aperta && <SchedaPersona ctx={ctx} azienda={d.aziende.find((a) => a.id === aperta.azienda_id)} scrive={ctx.puoScrivere(aperta.azienda_id)} p={aperta} onClose={() => setAperta(null)} />}
    </>
  );
}

// ─────────────────────────────────────────── AZIENDA
const TABS = [["oggi", "Oggi"], ["obiettivi", "Obiettivi"], ["organigramma", "Organigramma"], ["persone", "Persone"], ["scadenze", "Scadenze"], ["kpi", "Numeri settimana"], ["procedure", "Procedure"], ["documenti", "Documenti"]];

export function Azienda({ ctx, azienda, tab, setTab }) {
  const scrive = ctx.puoScrivere(azienda.id);
  const [modAz, setModAz] = useState(false);
  const p = { ctx, azienda, scrive };
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: -12, marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: C.grey, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: azienda.colore }} />{azienda.descrizione}{azienda.stato === "in pausa" ? ` · in pausa${azienda.pausa_fino ? " fino al " + data(azienda.pausa_fino) : ""}` : ""}</div>
        {ctx.admin && <Btn variant="ghost" small onClick={() => setModAz(true)}>Impostazioni</Btn>}
      </div>
      <Segment items={TABS} value={tab === "panoramica" ? "oggi" : tab} onChange={setTab} style={{ marginBottom: 18 }} />
      {(tab === "oggi" || tab === "panoramica") && <><SceltaGiorno ctx={ctx} /><div style={{ height: 12 }} /><ControlliAzienda ctx={ctx} azienda={azienda} scrive={scrive} titolo={false} /></>}
      {tab === "kpi" && <Kpi {...p} />}
      {tab === "organigramma" && <Organigramma {...p} />}
      {tab === "persone" && <Persone {...p} />}
      {tab === "scadenze" && <Scadenze {...p} />}
      {tab === "obiettivi" && <Obiettivi {...p} />}
      {tab === "procedure" && <Procedure {...p} />}
      {tab === "documenti" && <Documenti {...p} />}
      {modAz && <ModificaAzienda ctx={ctx} azienda={azienda} onClose={() => setModAz(false)} />}
    </>
  );
}

function ModificaAzienda({ ctx, azienda, onClose }) {
  const [f, setF] = useState(azienda);
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const ok = async () => {
    if (!f.nome) return alert("Scrivi il nome dell'azienda");
    const r = await salva("gs_aziende", { id: f.id, nome: f.nome, descrizione: f.descrizione, colore: f.colore, stato: f.stato, pausa_fino: f.pausa_fino || null, ordine: f.ordine ?? 0 });
    await ctx.ricarica(); onClose();
    if (!f.id) ctx.vai({ tipo: "azienda", id: r.id, tab: "organigramma" });
  };
  return (
    <Modal title={f.id ? "Impostazioni azienda" : "Nuova azienda"} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Nome" value={f.nome} onChange={s("nome")} />
        <Field label="Descrizione" value={f.descrizione} onChange={s("descrizione")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Stato" value={f.stato} onChange={s("stato")} options={[{ value: "attiva", label: "Attiva" }, { value: "in pausa", label: "In pausa" }]} />
          <Field label="In pausa fino al" type="date" value={f.pausa_fino} onChange={s("pausa_fino")} />
          <Field label="Colore" type="color" value={f.colore} onChange={s("colore")} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Btn variant="soft" onClick={onClose}>Annulla</Btn><Btn onClick={ok}>Salva</Btn></div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────── PANORAMICA AZIENDA
function Panoramica({ ctx, azienda, setTab }) {
  const { d, sett } = ctx;
  const kpi = d.kpi.filter((k) => k.azienda_id === azienda.id);
  const pers = d.persone.filter((p) => p.azienda_id === azienda.id);
  const ob = d.obiettivi.filter((o) => o.azienda_id === azienda.id && o.stato !== "fatto");
  const scad = tutteScadenze(d, azienda.id).slice(0, 5);
  const costo = pers.filter((p) => p.nome).reduce((s, p) => s + (Number(p.costo_mensile) || 0), 0);
  const riga = (chiave, colore, testo, destra, coloreDx) => (
    <div key={chiave} style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px 0", borderTop: `1px solid ${C.soft}`, fontSize: 14.5 }}>
      <Dot color={colore} /><span style={{ flex: 1 }}>{testo}</span>{destra && <span style={{ fontSize: 12.5, color: coloreDx || C.grey }}>{destra}</span>}
    </div>);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <SceltaSettimana ctx={ctx} />
        <Btn onClick={() => setTab("kpi")}>Compila i numeri</Btn>
      </div>
      {kpi.length === 0 ? <Card><Vuoto>Nessun KPI. Aggiungili dalla scheda KPI.</Vuoto></Card> :
        <div style={griglia(200)}>{kpi.map((k) => <Card key={k.id} style={{ padding: 6 }}><TileKpi k={k} v={valoreKpi(d, k, sett)} /></Card>)}</div>}
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 12 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><Label>Obiettivi aperti</Label><Btn variant="link" small onClick={() => setTab("obiettivi")}>Tutti</Btn></div>
          {ob.length === 0 ? <Vuoto>Nessuno</Vuoto> : ob.slice(0, 6).map((o) => riga(o.id, o.stato === "in corso" ? C.amber : C.line, o.titolo, o.scadenza && data(o.scadenza), o.scadenza && giorniA(o.scadenza) < 0 ? C.red : C.grey))}
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><Label>Prossime scadenze</Label><Btn variant="link" small onClick={() => setTab("scadenze")}>Tutte</Btn></div>
          {scad.length === 0 ? <Vuoto>Nessuna</Vuoto> : scad.map((s) => riga(s.id || s.chiave, coloreScad(s), s.titolo, testoGiorni(s.giorni), coloreScad(s)))}
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 12 }}>
        <Tile label="Persone" value={pers.filter((p) => p.nome).length} onClick={() => setTab("persone")} />
        <Tile label="Da coprire" value={pers.filter((p) => !p.nome).length} bg={pers.some((p) => !p.nome) ? C.red : C.card} onClick={() => setTab("organigramma")} />
        <Tile label="Costo / mese" value={euro(costo)} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────── KPI
function Kpi({ ctx, azienda, scrive }) {
  const { d } = ctx;
  const { sett, setSett } = ctx;
  const kpi = d.kpi.filter((k) => k.azienda_id === azienda.id);
  const [valori, setValori] = useState({});
  const [note, setNote] = useState({});
  const [salvo, setSalvo] = useState(false);
  const [modK, setModK] = useState(null);
  const val = (k) => k.id in valori ? valori[k.id] : d.kpi_valori.find((x) => x.kpi_id === k.id && x.settimana === sett)?.valore ?? "";
  const nota = (k) => k.id in note ? note[k.id] : d.kpi_valori.find((x) => x.kpi_id === k.id && x.settimana === sett)?.nota ?? "";
  const cambiaSett = (n) => { setSett((s) => spostaSettimana(s, n)); setValori({}); setNote({}); };
  const settimane = Array.from({ length: 8 }, (_, i) => spostaSettimana(sett, -7 + i));
  async function salvaTutto() {
    setSalvo(true);
    try {
      for (const k of kpi) {
        if (!(k.id in valori) && !(k.id in note)) continue;
        const esiste = d.kpi_valori.find((x) => x.kpi_id === k.id && x.settimana === sett);
        const v = String(val(k)).replace(",", ".").trim();
        if (v === "" && esiste) { await elimina("gs_kpi_valori", esiste.id); continue; }
        if (v === "") continue;
        await salva("gs_kpi_valori", { id: esiste?.id, kpi_id: k.id, settimana: sett, valore: Number(v), nota: nota(k) || null, inserito_da: ctx.email });
      }
      setValori({}); setNote({}); await ctx.ricarica();
    } catch (e) {}
    setSalvo(false);
  }
  const modificato = Object.keys(valori).length + Object.keys(note).length > 0;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Btn small variant="ghost" onClick={() => cambiaSett(-1)}>‹</Btn>
        <b style={{ fontSize: 15, minWidth: 150, textAlign: "center" }}>{nomeSettimana(sett)}</b>
        <Btn small variant="ghost" onClick={() => cambiaSett(1)}>›</Btn>
        <div style={{ flex: 1 }} />
        {ctx.admin && <Btn small variant="ghost" onClick={() => setModK({ azienda_id: azienda.id, unita: "n", direzione: "su" })}>＋ KPI</Btn>}
        {scrive && <Btn small onClick={salvaTutto} disabled={!modificato || salvo} style={ctx.mobile && modificato ? { position: "fixed", bottom: "calc(92px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", zIndex: 30, padding: "13px 26px", fontSize: 15, boxShadow: "0 8px 24px rgba(0,0,0,.2)" } : undefined}>{salvo ? "Salvo…" : "Salva i numeri"}</Btn>}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {kpi.length === 0 && <Vuoto>Nessun KPI per questa azienda.</Vuoto>}
        {kpi.map((k, i) => {
          const es = esitoKpi(k, val(k));
          const resp = d.persone.find((p) => p.id === k.persona_id);
          return (
            <div key={k.id} style={{ padding: "14px 18px", borderTop: i ? `1px solid ${C.soft}` : "none", display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "1.4fr 150px 1fr 200px", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Dot color={coloreEsito[es]} /><b style={{ fontSize: 14 }}>{k.nome}</b>
                  {ctx.admin && <button onClick={() => setModK(k)} style={{ border: "none", background: "none", color: C.grey, fontSize: 12 }}>modifica</button>}</div>
                <div style={{ fontSize: 12, color: C.grey, marginTop: 2 }}>{resp ? (resp.nome ? `${resp.nome} · ${resp.ruolo}` : resp.ruolo) : k.responsabile || "—"} · {k.obiettivo != null ? `obiettivo ${k.direzione === "giu" ? "≤" : "≥"} ${num(k.obiettivo, k.unita)}` : "senza obiettivo"}</div>
              </div>
              <Field value={val(k)} onChange={(v) => setValori((x) => ({ ...x, [k.id]: v }))} type="number" placeholder={{ "€": "€", n: "numero", h: "ore", mq: "mq", "%": "%" }[k.unita] || k.unita} />
              <Field value={nota(k)} onChange={(v) => setNote((x) => ({ ...x, [k.id]: v }))} placeholder={es === "rosso" ? "Cosa è successo? Cosa fai?" : "Nota (facoltativa)"} />
              <Mini k={k} settimane={settimane} valori={d.kpi_valori} />
            </div>
          );
        })}
      </Card>
      {!scrive && <div style={{ fontSize: 12.5, color: C.grey, marginTop: 10 }}>Hai accesso in sola lettura a questa azienda.</div>}
      {modK && <ModificaKpi ctx={ctx} k={modK} azienda={azienda} onClose={() => setModK(null)} />}
    </>
  );
}

// Andamento delle ultime 8 settimane
function Mini({ k, settimane, valori }) {
  const v = settimane.map((s) => valori.find((x) => x.kpi_id === k.id && x.settimana === s)?.valore);
  const nums = v.filter((x) => x != null).map(Number);
  const max = Math.max(...nums, Number(k.obiettivo) || 0, 1);
  return (
    <div title="Ultime 8 settimane" style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 34, maxWidth: 200, width: "100%" }}>
      {v.map((x, i) => <div key={i} style={{ flex: 1, height: x == null ? 3 : Math.max(3, (Number(x) / max) * 34), borderRadius: 3, background: x == null ? C.soft : coloreEsito[esitoKpi(k, x)], opacity: i === v.length - 1 ? 1 : 0.55 }} />)}
    </div>
  );
}

function ModificaKpi({ ctx, k, azienda, onClose }) {
  const [f, setF] = useState(k);
  const s = (c) => (v) => setF((x) => ({ ...x, [c]: v }));
  const pers = ctx.d.persone.filter((p) => p.azienda_id === azienda.id);
  const ok = async () => {
    if (!f.nome) return alert("Scrivi il nome del KPI");
    const p = pers.find((x) => String(x.id) === String(f.persona_id));
    await salva("gs_kpi", { id: f.id, azienda_id: azienda.id, nome: f.nome, unita: f.unita, obiettivo: f.obiettivo === "" || f.obiettivo == null ? null : Number(String(f.obiettivo).replace(",", ".")), direzione: f.direzione, persona_id: p ? p.id : null, responsabile: p ? p.ruolo : f.responsabile || null, ordine: f.ordine ?? ctx.d.kpi.length });
    await ctx.ricarica(); onClose();
  };
  const del = async () => { if (!confirm("Eliminare il KPI e tutti i suoi valori?")) return; await elimina("gs_kpi", f.id); await ctx.ricarica(); onClose(); };
  return (
    <Modal title={f.id ? "Modifica KPI" : "Nuovo KPI"} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Nome" value={f.nome} onChange={s("nome")} placeholder="Es. Fatturato della settimana" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Unità" value={f.unita} onChange={s("unita")} options={[{ value: "n", label: "numero" }, { value: "€", label: "€" }, { value: "mq", label: "mq" }, { value: "h", label: "ore" }, { value: "%", label: "%" }]} />
          <Field label="Obiettivo" type="number" value={f.obiettivo} onChange={s("obiettivo")} />
          <Field label="Va bene se è" value={f.direzione} onChange={s("direzione")} options={[{ value: "su", label: "più alto" }, { value: "giu", label: "più basso" }]} />
        </div>
        <Field label="Chi lo compila" value={f.persona_id ?? ""} onChange={s("persona_id")} options={[{ value: "", label: "—" }, ...pers.map((p) => ({ value: p.id, label: p.nome ? `${p.nome} · ${p.ruolo}` : p.ruolo }))]} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>{f.id ? <Btn variant="link" onClick={del}>Elimina</Btn> : <span />}<div style={{ display: "flex", gap: 8 }}><Btn variant="soft" onClick={onClose}>Annulla</Btn><Btn onClick={ok}>Salva</Btn></div></div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────── ORGANIGRAMMA
function Organigramma({ ctx, azienda, scrive }) {
  const { d } = ctx;
  const [vista, setVista] = useState("org");
  const [zoom, setZoom] = useState(ctx.mobile ? 0.75 : "adatta");
  const [aperta, setAperta] = useState(null);
  const pers = d.persone.filter((p) => p.azienda_id === azienda.id);
  const ids = new Set(pers.map((p) => p.id));
  const figli = (id) => pers.filter((p) => id === null ? !p.responsabile_id || !ids.has(p.responsabile_id) : p.responsabile_id === id);
  const vuote = pers.filter((p) => !p.nome), coperti = pers.length - vuote.length;
  const costo = pers.filter((p) => p.nome).reduce((s, p) => s + (Number(p.costo_mensile) || 0), 0);
  const costoVuote = vuote.reduce((s, p) => s + (Number(p.costo_mensile) || 0), 0);
  const kpiDi = (p) => d.kpi.filter((k) => k.persona_id === p.id);
  const Scheda = ({ p }) => (
    <div onClick={() => setAperta(p)} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: C.card, borderRadius: 20, padding: "16px 18px", cursor: "pointer", border: p.nome ? "none" : `1.5px dashed ${C.line}` }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 16, background: p.nome ? C.slate : C.soft, color: p.nome ? "#fff" : C.grey }}>{p.nome ? p.nome[0].toUpperCase() : "+"}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 16.5, fontWeight: 600 }}>{p.ruolo}</div>
        <div style={{ fontSize: 14, color: p.nome ? C.slate : C.amber, marginTop: 2 }}>{p.nome || "Da coprire"}</div>
        {p.compiti && <div style={{ fontSize: 13.5, color: C.grey, marginTop: 5, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.compiti}</div>}
        {kpiDi(p).length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{kpiDi(p).map((k) => <Chip key={k.id} style={{ fontWeight: 500 }}>{k.nome}</Chip>)}</div>}
      </div>
    </div>
  );
  const Ramo = ({ p, liv }) => (
    <div style={{ marginLeft: liv ? (ctx.mobile ? 12 : 26) : 0, paddingLeft: liv ? (ctx.mobile ? 10 : 16) : 0, borderLeft: liv ? `2px solid ${C.line}` : "none", display: "grid", gap: 10 }}>
      <Scheda p={p} />
      {figli(p.id).map((f) => <Ramo key={f.id} p={f} liv={liv + 1} />)}
    </div>
  );
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <Tile label="Ruoli" value={pers.length} />
        <Tile label="Coperti" value={coperti} />
        <Tile label="Da coprire" value={vuote.length} bg={vuote.length ? C.red : C.card} onClick={() => setVista("vuote")} />
      </div>
      <div style={{ height: 6, background: C.line, borderRadius: 9, margin: "14px 0 10px", overflow: "hidden" }}><div style={{ width: (pers.length ? (coperti / pers.length) * 100 : 0) + "%", height: "100%", background: C.red, borderRadius: 9 }} /></div>
      <div style={{ fontSize: 14, color: C.slate, marginBottom: 14 }}>Costo del personale in organigramma: <b style={{ color: C.text }}>{euro(costo)}/mese</b>{costoVuote ? ` · ruoli da coprire: ${euro(costoVuote)}/mese` : ""}</div>
      <Segment items={[["org", "Organigramma"], ["lista", "Elenco"], ["vuote", `Da coprire (${vuote.length})`]]} value={vista} onChange={setVista} accent={C.red} style={{ display: "inline-flex", marginBottom: 14 }} />
      {vista === "vuote" ? (
        <div style={{ display: "grid", gap: 10 }}>{vuote.length === 0 ? <Card><Vuoto>Tutti i ruoli sono coperti.</Vuoto></Card> : vuote.map((p) => (
          <div key={p.id}><Scheda p={p} />{(p.costo_mensile || p.ricavo_atteso) && <div style={{ fontSize: 12.5, color: C.grey, margin: "6px 4px 0" }}>{p.costo_mensile ? `Costo stimato ${euro(p.costo_mensile)}/mese` : ""}{p.ricavo_atteso ? ` · deve portare ${euro(p.ricavo_atteso)}/mese` : ""}</div>}</div>))}</div>
      ) : vista === "lista" ? (
        <div style={{ display: "grid", gap: 10 }}>{pers.length === 0 ? <Card><Vuoto>Organigramma vuoto.</Vuoto></Card> : figli(null).map((p) => <Ramo key={p.id} p={p} liv={0} />)}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginBottom: 8 }}>
            {[["adatta", "Tutto"], [0.75, "75%"], [1, "100%"]].map(([z, l]) => <Btn key={z} small variant={zoom === z ? "dark" : "ghost"} onClick={() => setZoom(z)}>{l}</Btn>)}
          </div>
          <OrgPillole pers={pers} colore={azienda.colore === "#111619" ? C.slate : azienda.colore} onApri={setAperta} zoom={zoom} />
        </>
      )}
      {scrive && <Fab onClick={() => setAperta({ azienda_id: azienda.id, ruolo: "", responsabile_id: null })}>+ Ruolo</Fab>}
      {aperta && <SchedaPersona ctx={ctx} azienda={azienda} scrive={scrive} p={aperta} onClose={() => setAperta(null)} />}
    </>
  );
}

export function SchedaPersona({ ctx, azienda, scrive, p, onClose }) {
  const { d } = ctx;
  const [modifica, setModifica] = useState(!p.nome || !p.id);
  const [f, setF] = useState(p);
  const [lavoro, setLavoro] = useState(false);
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const pers = d.persone.filter((x) => x.azienda_id === azienda.id && x.id !== p.id);
  const check = d.onboarding.filter((o) => o.persona_id === p.id);
  const att = d.attrezzature.filter((a) => a.persona_id === p.id);
  const n = (v) => v === "" || v == null ? null : Number(String(v).replace(",", "."));
  const costoStimato = n(f.netto_mensile) ? Math.round(n(f.netto_mensile) * COEFF_COSTO) : null;
  async function ok() {
    if (!f.ruolo) return alert("Scrivi il ruolo");
    setLavoro(true);
    try {
      const riga = { id: f.id, azienda_id: azienda.id, nome: f.nome?.trim() || null, ruolo: f.ruolo, responsabile_id: f.responsabile_id ? Number(f.responsabile_id) : null,
        email: f.email?.trim().toLowerCase() || null, telefono: f.telefono || null, compiti: f.compiti || null, tipo_contratto: f.tipo_contratto || null,
        data_assunzione: f.data_assunzione || null, fine_prova: f.fine_prova || null, scadenza_contratto: f.scadenza_contratto || null,
        netto_mensile: n(f.netto_mensile), costo_mensile: costoStimato ?? n(f.costo_mensile), ricavo_atteso: n(f.ricavo_atteso), ordine: f.ordine ?? d.persone.length };
      const salvata = await salva("gs_persone", riga);
      // Prima volta che la casella ha un nome: parte la checklist di inserimento
      if (salvata.nome && !p.nome && !check.length) {
        const { error } = await supabase.from("gs_onboarding").insert(CHECKLIST.map((voce, i) => ({ persona_id: salvata.id, voce, ordine: i })));
        if (error) alert("Checklist non creata: " + error.message);
      }
      // Con l'email riceve l'accesso alla sua azienda (solo l'amministratore può darlo)
      if (salvata.email && ctx.admin && !d.accessi.some((a) => a.email.toLowerCase() === salvata.email && (a.azienda_id === azienda.id || !a.azienda_id))) {
        const { error } = await supabase.from("gs_accessi").insert({ email: salvata.email, azienda_id: azienda.id, ruolo: "responsabile" });
        if (error) alert("Accesso non creato: " + error.message);
      }
      await ctx.ricarica(); onClose();
    } catch (e) {}
    setLavoro(false);
  }
  async function svuota() {
    if (!confirm("La persona lascia questo ruolo? La casella resta nell'organigramma come \"da coprire\".")) return;
    await salva("gs_persone", { id: p.id, nome: null, email: null, telefono: null, tipo_contratto: null, data_assunzione: null, fine_prova: null, scadenza_contratto: null, netto_mensile: null });
    await supabase.from("gs_onboarding").delete().eq("persona_id", p.id);
    await ctx.ricarica(); onClose();
  }
  async function cancella() {
    if (pers.some((x) => x.responsabile_id === p.id)) return alert("Questo ruolo ha persone sotto: spostale prima a un altro responsabile.");
    if (!confirm("Eliminare il ruolo dall'organigramma?")) return;
    await elimina("gs_persone", p.id); await ctx.ricarica(); onClose();
  }
  const spunta = async (o) => { if (!scrive) return; await salva("gs_onboarding", { id: o.id, fatto: !o.fatto }); await ctx.ricarica(); };
  const tel = (p.telefono || "").replace(/[^\d+]/g, "");
  const wa = tel.replace(/^\+/, "").replace(/^(3\d{8,9})$/, "39$1");
  const box = (label, value) => <div style={{ background: C.soft, borderRadius: 16, padding: "12px 14px" }}><Label>{label}</Label><div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{value}</div></div>;

  if (!modifica) return (
    <Modal title={p.nome} onClose={onClose}>
      <div style={{ fontSize: 14.5, color: C.slate, marginTop: -8 }}>{p.ruolo}{p.tipo_contratto ? ` · ${p.tipo_contratto[0].toUpperCase() + p.tipo_contratto.slice(1)}` : ""}</div>
      {(tel || p.email) && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {tel && <a href={`tel:${tel}`}><Btn variant="slate">Chiama</Btn></a>}
        {tel && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><Btn variant="slate">WhatsApp</Btn></a>}
        {p.email && <a href={`mailto:${p.email}`}><Btn variant="soft">Email</Btn></a>}
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
        {box("Inizio", data(p.data_assunzione))}
        {box("Fine prova", data(p.fine_prova))}
        {box("Costo / mese", euro(p.costo_mensile))}
        {p.scadenza_contratto ? box("Scadenza contratto", data(p.scadenza_contratto)) : p.ricavo_atteso ? box("Deve portare / mese", euro(p.ricavo_atteso)) : null}
      </div>
      {p.compiti && <div style={{ fontSize: 14, color: C.slate, lineHeight: 1.5, marginTop: 14, whiteSpace: "pre-wrap" }}>{p.compiti}</div>}
      {check.length > 0 && <>
        <Label style={{ margin: "20px 0 8px" }}>Inserimento · {check.filter((o) => o.fatto).length}/{check.length}</Label>
        <div style={{ display: "grid", gap: 6 }}>{check.map((o) => (
          <div key={o.id} onClick={() => spunta(o)} style={{ display: "flex", alignItems: "center", gap: 12, background: C.soft, borderRadius: 14, padding: "11px 13px", cursor: scrive ? "pointer" : "default" }}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, border: `1.5px solid ${o.fatto ? C.slate : C.line}`, background: "#fff", color: C.text }}>{o.fatto ? "✓" : ""}</span>
            <span style={{ fontSize: 14.5, color: o.fatto ? C.grey : C.text, textDecoration: o.fatto ? "line-through" : "none" }}>{o.voce}</span>
          </div>))}</div>
      </>}
      {att.length > 0 && <><Label style={{ margin: "20px 0 8px" }}>Attrezzature</Label><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{att.map((a) => <Chip key={a.id}>{a.nome}{a.codice ? ` · ${a.codice}` : ""}</Chip>)}</div></>}
      {scrive && <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        <Btn variant="link" onClick={svuota}>Lascia il ruolo</Btn>
        <Btn onClick={() => setModifica(true)}>Modifica</Btn>
      </div>}
    </Modal>
  );

  return (
    <Modal title={p.id ? (p.nome || p.ruolo) : "Nuovo ruolo"} onClose={onClose} wide>
      <fieldset disabled={!scrive} style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Field label="Ruolo" value={f.ruolo} onChange={s("ruolo")} />
          <Field label="Risponde a" value={f.responsabile_id ?? ""} onChange={s("responsabile_id")} options={[{ value: "", label: "— nessuno (in cima)" }, ...pers.map((x) => ({ value: x.id, label: x.nome ? `${x.ruolo} · ${x.nome}` : x.ruolo }))]} />
          <Field label="Nome e cognome" value={f.nome} onChange={s("nome")} placeholder="Vuoto = da coprire" />
          <Field label="Email (riceve l'accesso)" type="email" value={f.email} onChange={s("email")} />
          <Field label="Telefono" value={f.telefono} onChange={s("telefono")} />
          <Field label="Tipo di rapporto" value={f.tipo_contratto ?? ""} onChange={s("tipo_contratto")} options={[{ value: "", label: "—" }, ...[...new Set(["Dipendente", "Apprendistato", "Tempo determinato", "Partita IVA / collaboratore", "Subappalto", "Esterno", "Socio", ...(f.tipo_contratto ? [f.tipo_contratto] : [])])].map((x) => ({ value: x, label: x }))]} />
        </div>
        <Field label="Mansioni" area={3} value={f.compiti} onChange={s("compiti")} />
        <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
          <Field label="Data di inizio" type="date" value={f.data_assunzione} onChange={s("data_assunzione")} />
          <Field label="Fine periodo di prova" type="date" value={f.fine_prova} onChange={s("fine_prova")} />
          <Field label="Scadenza contratto" type="date" value={f.scadenza_contratto} onChange={s("scadenza_contratto")} />
          <Field label="Netto mensile €" type="number" value={f.netto_mensile} onChange={s("netto_mensile")} hint={costoStimato ? `Costo azienda stimato ${euro(costoStimato)}` : "Costo stimato = netto × 1,95"} />
          {!costoStimato && <Field label="Costo azienda €/mese" type="number" value={f.costo_mensile} onChange={s("costo_mensile")} />}
          <Field label="Fatturato che deve portare €/mese" type="number" value={f.ricavo_atteso} onChange={s("ricavo_atteso")} />
        </div>
      </fieldset>
      {scrive && <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14 }}>{p.id && <Btn variant="link" onClick={cancella}>Elimina ruolo</Btn>}</div>
        <div style={{ display: "flex", gap: 8 }}><Btn variant="soft" onClick={() => p.nome ? setModifica(false) : onClose()}>Annulla</Btn><Btn onClick={ok} disabled={lavoro}>{lavoro ? "Salvo…" : "Salva"}</Btn></div>
      </div>}
    </Modal>
  );
}

// ─────────────────────────────────────────── PERSONE (rubrica, costi, attrezzature)
function Persone({ ctx, azienda, scrive }) {
  const { d } = ctx;
  const [aperta, setAperta] = useState(null);
  const [att, setAtt] = useState(null);
  const pers = d.persone.filter((p) => p.azienda_id === azienda.id && p.nome);
  const attr = d.attrezzature.filter((a) => a.azienda_id === azienda.id);
  const costo = pers.reduce((s, p) => s + (Number(p.costo_mensile) || 0), 0);
  const ricavo = pers.reduce((s, p) => s + (Number(p.ricavo_atteso) || 0), 0);
  return (
    <>
      <div style={griglia(180)}>
        <Card><div style={etichetta}>Persone</div><div style={{ fontSize: 24, fontWeight: 750 }}>{pers.length}</div></Card>
        <Card><div style={etichetta}>Costo personale / mese</div><div style={{ fontSize: 24, fontWeight: 750 }}>{euro(costo)}</div></Card>
        <Card><div style={etichetta}>Fatturato atteso / mese</div><div style={{ fontSize: 24, fontWeight: 750 }}>{euro(ricavo)}</div></Card>
      </div>
      {sezione("Rubrica")}
      <Card style={{ padding: "4px 18px" }}>
        {pers.length === 0 ? <Vuoto>Nessuna persona ancora: inseriscile dall'Organigramma.</Vuoto> : pers.map((p, i) => {
          const ch = d.onboarding.filter((o) => o.persona_id === p.id);
          return (
            <div key={p.id} onClick={() => setAperta(p)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${C.soft}` : "none", cursor: "pointer", flexWrap: "wrap" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.soft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.slate }}>{p.nome[0]?.toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontWeight: 650, fontSize: 14 }}>{p.nome}</div><div style={{ fontSize: 12, color: C.grey }}>{p.ruolo}{p.tipo_contratto ? ` · ${p.tipo_contratto}` : ""}</div></div>
              {p.telefono && <a href={`tel:${p.telefono}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 13, color: C.slate }}>{p.telefono}</a>}
              {ch.length > 0 && <Chip color={ch.every((o) => o.fatto) ? C.green : C.amber}>inserimento {ch.filter((o) => o.fatto).length}/{ch.length}</Chip>}
              {p.costo_mensile && <span style={{ fontSize: 13, color: C.slate, minWidth: 80, textAlign: "right" }}>{euro(p.costo_mensile)}</span>}
            </div>);
        })}
      </Card>
      {sezione("Attrezzature e furgoni", scrive && <Btn small onClick={() => setAtt({ azienda_id: azienda.id, tipo: "furgone" })}>＋ Aggiungi</Btn>)}
      <Card style={{ padding: "4px 18px" }}>
        {attr.length === 0 ? <Vuoto>Registra furgoni (targa, a chi è assegnato, revisione) e macchinari.</Vuoto> : attr.map((a, i) => {
          const p = d.persone.find((x) => x.id === a.persona_id);
          return (
            <div key={a.id} onClick={() => scrive && setAtt(a)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${C.soft}` : "none", cursor: scrive ? "pointer" : "default", flexWrap: "wrap" }}>
              <span style={{ fontSize: 18 }}>{a.tipo === "furgone" ? "🚐" : a.tipo === "macchinario" ? "⚙️" : "🧰"}</span>
              <div style={{ flex: 1, minWidth: 150 }}><div style={{ fontWeight: 650, fontSize: 14 }}>{a.nome}{a.codice ? ` · ${a.codice}` : ""}</div><div style={{ fontSize: 12, color: C.grey }}>{p ? p.nome || p.ruolo : "non assegnato"}{a.data_consegna ? ` · dal ${data(a.data_consegna)}` : ""}</div></div>
              {a.scadenza && <Chip color={giorniA(a.scadenza) < 30 ? C.red : C.slate}>scade {data(a.scadenza)}</Chip>}
            </div>);
        })}
      </Card>
      {aperta && <SchedaPersona ctx={ctx} azienda={azienda} scrive={scrive} p={aperta} onClose={() => setAperta(null)} />}
      {att && <ModificaAttrezzo ctx={ctx} azienda={azienda} a={att} onClose={() => setAtt(null)} />}
    </>
  );
}

function ModificaAttrezzo({ ctx, azienda, a, onClose }) {
  const [f, setF] = useState(a);
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const pers = ctx.d.persone.filter((p) => p.azienda_id === azienda.id && p.nome);
  const ok = async () => {
    if (!f.nome) return alert("Scrivi il nome");
    await salva("gs_attrezzature", { id: f.id, azienda_id: azienda.id, nome: f.nome, tipo: f.tipo, codice: f.codice || null, persona_id: f.persona_id ? Number(f.persona_id) : null, data_consegna: f.data_consegna || null, scadenza: f.scadenza || null, note: f.note || null });
    await ctx.ricarica(); onClose();
  };
  const del = async () => { if (!confirm("Eliminare?")) return; await elimina("gs_attrezzature", f.id); await ctx.ricarica(); onClose(); };
  return (
    <Modal title={f.id ? f.nome : "Nuova attrezzatura"} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Tipo" value={f.tipo} onChange={s("tipo")} options={[{ value: "furgone", label: "Furgone" }, { value: "macchinario", label: "Macchinario" }, { value: "attrezzo", label: "Attrezzo" }]} />
          <Field label={f.tipo === "furgone" ? "Targa" : "Codice / matricola"} value={f.codice} onChange={s("codice")} />
        </div>
        <Field label="Nome" value={f.nome} onChange={s("nome")} placeholder={f.tipo === "furgone" ? "Es. Fiat Ducato bianco" : "Es. Levigatrice Lägler"} />
        <Field label="Assegnato a" value={f.persona_id ?? ""} onChange={s("persona_id")} options={[{ value: "", label: "— in magazzino" }, ...pers.map((p) => ({ value: p.id, label: `${p.nome} · ${p.ruolo}` }))]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Consegnato il" type="date" value={f.data_consegna} onChange={s("data_consegna")} />
          <Field label={f.tipo === "furgone" ? "Prossima revisione / assicurazione" : "Prossima manutenzione"} type="date" value={f.scadenza} onChange={s("scadenza")} />
        </div>
        <Field label="Note" area={2} value={f.note} onChange={s("note")} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>{f.id ? <Btn variant="link" onClick={del}>Elimina</Btn> : <span />}<div style={{ display: "flex", gap: 8 }}><Btn variant="soft" onClick={onClose}>Annulla</Btn><Btn onClick={ok}>Salva</Btn></div></div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────── SCADENZE
function Scadenze({ ctx, azienda, scrive }) {
  const { d } = ctx;
  const [mod, setMod] = useState(null);
  const lista = tutteScadenze(d, azienda.id);
  const fatte = d.scadenze.filter((s) => s.azienda_id === azienda.id && s.fatto).slice(-5).reverse();
  const fatto = async (s) => { await salva("gs_scadenze", { id: s.id, fatto: true }); await ctx.ricarica(); };
  const nomeTipo = (t) => (TIPI_SCADENZA.find((x) => x[0] === t) || [, "Altro"])[1];
  return (
    <>
      <div style={{ fontSize: 13.5, color: C.grey, marginBottom: 14 }}>Fine prova, contratti e revisioni dei furgoni arrivano da soli dalle persone e dalle attrezzature. Tocca il cerchio quando una scadenza è rinnovata.</div>
      <div style={{ display: "grid", gap: 10 }}>
        {lista.length === 0 && <Card><Vuoto>Nessuna scadenza. Inserisci DURC, assicurazioni, visite, corsi, domini, marchi, F24.</Vuoto></Card>}
        {lista.map((s) => {
          const col = coloreScad(s), manuale = s.origine === "manuale";
          return (
            <div key={s.id || s.chiave} style={{ display: "flex", alignItems: "center", gap: 14, background: C.card, borderRadius: 20, padding: "16px 18px", borderLeft: `4px solid ${col === C.grey ? C.card : col}` }}>
              <button onClick={() => scrive && manuale && fatto(s)} title={manuale ? "Segna come fatta" : "Automatica"} style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "none", border: `1.5px ${manuale ? "solid" : "dashed"} ${C.grey}`, color: C.grey, fontSize: 12 }}>{manuale ? "" : "·"}</button>
              <div onClick={() => scrive && manuale && setMod(s)} style={{ flex: 1, minWidth: 0, cursor: scrive && manuale ? "pointer" : "default" }}>
                <div style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.3 }}>{s.titolo}</div>
                <div style={{ fontSize: 13.5, color: C.grey, marginTop: 3 }}>{data(s.data)} · {manuale ? nomeTipo(s.tipo) : s.tipo === "revisione" ? "attrezzatura" : "persona"}{s.persona && manuale ? ` · ${s.persona.nome || s.persona.ruolo}` : ""}</div>
              </div>
              <Chip color={col === C.grey ? C.slate : col} bg={col === C.red ? "#f8e3e3" : col === C.amber ? "#fbf0dc" : C.soft} style={{ fontSize: 12.5, padding: "5px 11px" }}>{s.giorni < 0 ? `Scaduta da ${-s.giorni} gg` : s.giorni === 0 ? "Oggi" : `Tra ${s.giorni} gg`}</Chip>
            </div>
          );
        })}
      </div>
      {fatte.length > 0 && <>{sezione("Fatte di recente")}<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{fatte.map((s) => <Chip key={s.id} bg={C.card} onClick={scrive ? () => setMod(s) : undefined} color={C.grey}>✓ {s.titolo} · {data(s.data)}</Chip>)}</div></>}
      {scrive && <Fab onClick={() => setMod({ azienda_id: azienda.id, tipo: "durc", avviso_giorni: 30 })}>+ Scadenza</Fab>}
      {mod && <ModificaScadenza ctx={ctx} azienda={azienda} s={mod} onClose={() => setMod(null)} />}
    </>
  );
}

export function ModificaScadenza({ ctx, azienda, s, onClose }) {
  const [f, setF] = useState(s);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const pers = ctx.d.persone.filter((p) => p.azienda_id === azienda.id && p.nome);
  const ok = async (rinnova) => {
    if (!f.titolo || !f.data) return alert("Scrivi titolo e data");
    await salva("gs_scadenze", { id: f.id, azienda_id: azienda.id, titolo: f.titolo, tipo: f.tipo, data: f.data, avviso_giorni: Number(f.avviso_giorni) || 30, persona_id: f.persona_id ? Number(f.persona_id) : null, note: f.note || null, fatto: !!f.fatto });
    if (rinnova) { const n = new Date(f.data + "T12:00:00"); n.setFullYear(n.getFullYear() + 1);
      await salva("gs_scadenze", { azienda_id: azienda.id, titolo: f.titolo, tipo: f.tipo, data: n.toISOString().slice(0, 10), avviso_giorni: Number(f.avviso_giorni) || 30, persona_id: f.persona_id ? Number(f.persona_id) : null, note: f.note || null }); }
    await ctx.ricarica(); onClose();
  };
  const del = async () => { if (!confirm("Eliminare la scadenza?")) return; await elimina("gs_scadenze", f.id); await ctx.ricarica(); onClose(); };
  return (
    <Modal title={f.id ? "Scadenza" : "Nuova scadenza"} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Cosa scade" value={f.titolo} onChange={set("titolo")} placeholder="Es. DURC Parquetti Group" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Tipo" value={f.tipo} onChange={set("tipo")} options={TIPI_SCADENZA.map(([v, l]) => ({ value: v, label: l }))} />
          <Field label="Data" type="date" value={f.data} onChange={set("data")} />
          <Field label="Avvisami giorni prima" type="number" value={f.avviso_giorni} onChange={set("avviso_giorni")} />
        </div>
        <Field label="Riguarda (facoltativo)" value={f.persona_id ?? ""} onChange={set("persona_id")} options={[{ value: "", label: "— l'azienda" }, ...pers.map((p) => ({ value: p.id, label: p.nome }))]} />
        <Field label="Note" area={2} value={f.note} onChange={set("note")} />
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={!!f.fatto} onChange={(e) => set("fatto")(e.target.checked)} style={{ accentColor: C.red }} />Già fatta / rinnovata</label>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>{f.id ? <Btn variant="link" onClick={del}>Elimina</Btn> : <span />}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Btn variant="soft" onClick={onClose}>Annulla</Btn>{f.fatto && <Btn variant="ghost" onClick={() => ok(true)}>Salva e crea quella dell'anno prossimo</Btn>}<Btn onClick={() => ok(false)}>Salva</Btn></div></div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────── OBIETTIVI
function Obiettivi({ ctx, azienda, scrive }) {
  const { d } = ctx;
  const [mod, setMod] = useState(null);
  const [mostraFatti, setMostraFatti] = useState(false);
  const ob = d.obiettivi.filter((o) => o.azienda_id === azienda.id).sort((a, b) => (a.scadenza || "9999").localeCompare(b.scadenza || "9999"));
  const giro = async (o) => { if (!scrive) return; const st = STATI_OB[(STATI_OB.indexOf(o.stato) + 1) % 3]; await salva("gs_obiettivi", { id: o.id, stato: st }); await ctx.ricarica(); };
  const col = { "da fare": C.grey, "in corso": C.amber, fatto: C.green };
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: C.grey }}>Con un numero diventano barre da riempire; senza numero sono cose da fare.</span>
        <div style={{ display: "flex", gap: 8 }}><Btn small variant="ghost" onClick={() => setMostraFatti((x) => !x)}>{mostraFatti ? "Nascondi fatti" : `Mostra fatti (${ob.filter((o) => o.stato === "fatto" && o.valore_obiettivo == null).length})`}</Btn>{scrive && <Btn small onClick={() => setMod({ azienda_id: azienda.id, stato: "da fare" })}>＋ Obiettivo</Btn>}</div>
      </div>
      {ob.some((o) => o.valore_obiettivo != null) && <>
        <Label style={{ marginBottom: 10 }}>Obiettivi a numero · tocca il numero per aggiornarlo</Label>
        <PercorsoObiettivi ctx={ctx} lista={ob.filter((o) => o.valore_obiettivo != null)} scrive={scrive} onApri={setMod} />
        <Label style={{ margin: "22px 0 10px" }}>Da fare</Label>
      </>}
      <Card style={{ padding: "4px 18px" }}>
        {ob.filter((o) => o.valore_obiettivo == null && (mostraFatti || o.stato !== "fatto")).map((o, i) => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${C.soft}` : "none", flexWrap: "wrap" }}>
            <Chip color={col[o.stato]} onClick={scrive ? () => giro(o) : undefined} style={{ minWidth: 70, justifyContent: "center" }}>{o.stato}</Chip>
            <div onClick={() => scrive && setMod(o)} style={{ flex: 1, minWidth: 180, cursor: scrive ? "pointer" : "default" }}>
              <div style={{ fontWeight: 600, fontSize: 14, textDecoration: o.stato === "fatto" ? "line-through" : "none", color: o.stato === "fatto" ? C.grey : C.text }}>{o.titolo}</div>
              {(o.descrizione || o.responsabile) && <div style={{ fontSize: 12, color: C.grey }}>{[o.responsabile, o.descrizione].filter(Boolean).join(" · ")}</div>}
            </div>
            {o.scadenza && <span style={{ fontSize: 12.5, color: o.stato !== "fatto" && giorniA(o.scadenza) < 0 ? C.red : C.grey }}>{data(o.scadenza)}</span>}
          </div>))}
        {ob.filter((o) => o.valore_obiettivo == null).length === 0 && <Vuoto>Nessun obiettivo senza numero.</Vuoto>}
      </Card>
      {mod && <ModificaObiettivo ctx={ctx} azienda={azienda} o={mod} onClose={() => setMod(null)} />}
    </>
  );
}

export function ModificaObiettivo({ ctx, azienda, o, onClose }) {
  const [f, setF] = useState(o);
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const n = (v) => v === "" || v == null ? null : Number(String(v).replace(/\./g, "").replace(",", "."));
  const ok = async () => { if (!f.titolo) return alert("Scrivi l'obiettivo"); if (!azienda && !f.azienda_id) return alert("Scegli l'azienda"); await salva("gs_obiettivi", { id: f.id, azienda_id: azienda ? azienda.id : Number(f.azienda_id), titolo: f.titolo, descrizione: f.descrizione || null, scadenza: f.scadenza || null, stato: f.stato, responsabile: f.responsabile || null, valore_obiettivo: n(f.valore_obiettivo), valore_attuale: n(f.valore_attuale), unita: f.unita || null }); await ctx.ricarica(); onClose(); };
  const del = async () => { if (!confirm("Eliminare l'obiettivo?")) return; await elimina("gs_obiettivi", f.id); await ctx.ricarica(); onClose(); };
  return (
    <Modal title={f.id ? "Obiettivo" : "Nuovo obiettivo"} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        {!azienda && <Field label="Azienda" value={f.azienda_id ?? ""} onChange={s("azienda_id")} options={[{ value: "", label: "— scegli" }, ...ctx.d.aziende.filter((a) => a.stato !== "in pausa").map((a) => ({ value: a.id, label: a.nome }))]} />}
        <Field label="Obiettivo" value={f.titolo} onChange={s("titolo")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Dove sei ora" type="number" value={f.valore_attuale} onChange={s("valore_attuale")} />
          <Field label="Obiettivo (numero)" type="number" value={f.valore_obiettivo} onChange={s("valore_obiettivo")} hint="Vuoto = cosa da fare" />
          <Field label="Unità" value={f.unita} onChange={s("unita")} placeholder="€, mq, clienti…" />
        </div>
        <Field label="Dettagli" area={3} value={f.descrizione} onChange={s("descrizione")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Entro il" type="date" value={f.scadenza} onChange={s("scadenza")} />
          <Field label="Stato" value={f.stato} onChange={s("stato")} options={STATI_OB.map((x) => ({ value: x, label: x }))} />
          <Field label="Responsabile" value={f.responsabile} onChange={s("responsabile")} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>{f.id ? <Btn variant="link" onClick={del}>Elimina</Btn> : <span />}<div style={{ display: "flex", gap: 8 }}><Btn variant="soft" onClick={onClose}>Annulla</Btn><Btn onClick={ok}>Salva</Btn></div></div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────── PROCEDURE
function Procedure({ ctx, azienda, scrive }) {
  const { d } = ctx;
  const [aperta, setAperta] = useState(null);
  const [modifica, setModifica] = useState(false);
  const [cerca, setCerca] = useState("");
  const lista = d.procedure.filter((p) => p.azienda_id === azienda.id && (!cerca || (p.titolo + " " + p.contenuto).toLowerCase().includes(cerca.toLowerCase())));
  const cat = [...new Set(lista.map((p) => p.categoria || "Altro"))];
  if (aperta) return <SchedaProcedura ctx={ctx} azienda={azienda} scrive={scrive} p={aperta} inModifica={modifica} onClose={() => { setAperta(null); setModifica(false); }} />;
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Field value={cerca} onChange={setCerca} placeholder="Cerca una procedura…" style={{ flex: 1, minWidth: 200 }} />
        {scrive && <Btn onClick={() => { setAperta({ azienda_id: azienda.id, categoria: "", titolo: "", contenuto: "" }); setModifica(true); }}>＋ Procedura</Btn>}
      </div>
      {lista.length === 0 && <Card><Vuoto>Nessuna procedura. Schema consigliato: Chi – Quando – Cosa serve – Passaggi – Controlli – Errori da evitare.</Vuoto></Card>}
      {cat.map((c) => <div key={c}>
        {sezione(c)}
        <div style={griglia(260)}>{lista.filter((p) => (p.categoria || "Altro") === c).map((p) => (
          <Card key={p.id} onClick={() => setAperta(p)} style={{ cursor: "pointer" }}>
            <b style={{ fontSize: 14.5 }}>{p.titolo}</b>
            <div style={{ fontSize: 12.5, color: C.slate, marginTop: 6, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.contenuto}</div>
            <div style={{ fontSize: 11.5, color: C.grey, marginTop: 8 }}>aggiornata {data(p.aggiornato_il?.slice(0, 10))}</div>
          </Card>))}</div>
      </div>)}
    </>
  );
}

function SchedaProcedura({ ctx, azienda, scrive, p, inModifica, onClose }) {
  const [mod, setMod] = useState(inModifica);
  const [f, setF] = useState(p);
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const ok = async () => { if (!f.titolo) return alert("Scrivi il titolo"); const r = await salva("gs_procedure", { id: f.id, azienda_id: azienda.id, titolo: f.titolo, categoria: f.categoria || null, contenuto: f.contenuto || "", autore: ctx.email, aggiornato_il: new Date().toISOString() }); setF(r); setMod(false); await ctx.ricarica(); };
  const del = async () => { if (!confirm("Eliminare la procedura?")) return; await elimina("gs_procedure", f.id); await ctx.ricarica(); onClose(); };
  return (
    <>
      <Btn variant="link" onClick={onClose} style={{ marginBottom: 12 }}>‹ Tutte le procedure</Btn>
      <Card style={{ padding: ctx.mobile ? 18 : 28 }}>
        {mod ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "2fr 1fr", gap: 10 }}>
              <Field label="Titolo" value={f.titolo} onChange={s("titolo")} />
              <Field label="Categoria" value={f.categoria} onChange={s("categoria")} placeholder="Es. Cantiere, Vendita, Gestione" />
            </div>
            <Field label="Procedura" area={18} value={f.contenuto} onChange={s("contenuto")} placeholder={"CHI: …\nQUANDO: …\nCOSA SERVE: …\n\nPASSAGGI\n1. …\n2. …\n\nCONTROLLI\n- …\n\nERRORI DA EVITARE\n- …"} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>{f.id ? <Btn variant="link" onClick={del}>Elimina</Btn> : <span />}<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" onClick={() => f.id ? setMod(false) : onClose()}>Annulla</Btn><Btn onClick={ok}>Salva</Btn></div></div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div><div style={{ fontSize: 12, color: C.grey, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{f.categoria}</div><div style={{ fontSize: 24, fontWeight: 750, letterSpacing: -0.5 }}>{f.titolo}</div></div>
              {scrive && <Btn small variant="ghost" onClick={() => setMod(true)}>Modifica</Btn>}
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.65, marginTop: 16 }}>{f.contenuto}</div>
            <div style={{ fontSize: 12, color: C.grey, marginTop: 18 }}>Aggiornata {data(f.aggiornato_il?.slice(0, 10))}{f.autore ? ` da ${f.autore}` : ""}</div>
          </>
        )}
      </Card>
    </>
  );
}

// ─────────────────────────────────────────── DOCUMENTI
function Documenti({ ctx, azienda, scrive }) {
  const { d } = ctx;
  const [carico, setCarico] = useState("");
  const docs = d.documenti.filter((x) => x.azienda_id === azienda.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  async function carica(files) {
    for (const f of files) {
      setCarico(f.name);
      const percorso = `${azienda.id}/${Date.now()}_${f.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from("gs-documenti").upload(percorso, f, { contentType: f.type || undefined });
      if (error) { alert(`${f.name}: ${error.message}`); continue; }
      await salva("gs_documenti", { azienda_id: azienda.id, nome: f.name, percorso, tipo: f.type || null, dimensione: f.size, caricato_da: ctx.email });
    }
    setCarico(""); await ctx.ricarica();
  }
  const apri = async (x) => { const { data: s, error } = await supabase.storage.from("gs-documenti").createSignedUrl(x.percorso, 600); if (error) return alert(error.message); window.open(s.signedUrl, "_blank"); };
  const del = async (x) => { if (!confirm(`Eliminare ${x.nome}?`)) return; await supabase.storage.from("gs-documenti").remove([x.percorso]); await elimina("gs_documenti", x.id); await ctx.ricarica(); };
  const peso = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  return (
    <>
      {scrive && (
        <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); carica([...e.dataTransfer.files]); }} style={{ display: "block", border: `1.5px dashed ${C.line}`, borderRadius: 18, padding: 26, textAlign: "center", cursor: "pointer", background: C.card, marginBottom: 14, fontSize: 14, color: C.slate }}>
          {carico ? `Carico ${carico}…` : <>📂 <b>Carica documenti</b> · trascinali qui o tocca per sceglierli</>}
          <input type="file" multiple style={{ display: "none" }} onChange={(e) => { carica([...e.target.files]); e.target.value = ""; }} />
        </label>
      )}
      <Card style={{ padding: "4px 18px" }}>
        {docs.length === 0 ? <Vuoto>Nessun documento: visure, DURC, polizze, contratti, marchi…</Vuoto> : docs.map((x, i) => (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${C.soft}` : "none" }}>
            <span style={{ fontSize: 18 }}>{/pdf/.test(x.tipo || "") ? "📄" : /image/.test(x.tipo || "") ? "🖼️" : "📎"}</span>
            <div onClick={() => apri(x)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}><div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nome}</div><div style={{ fontSize: 12, color: C.grey }}>{data(x.created_at.slice(0, 10))}{x.dimensione ? ` · ${peso(x.dimensione)}` : ""}{x.caricato_da ? ` · ${x.caricato_da}` : ""}</div></div>
            {scrive && <button onClick={() => del(x)} style={{ border: "none", background: "none", color: C.grey }}>🗑</button>}
          </div>))}
      </Card>
    </>
  );
}

// ─────────────────────────────────────────── ACCESSI (solo amministratore)
export function Accessi({ ctx }) {
  const { d } = ctx;
  const [f, setF] = useState({ email: "", azienda_id: "", ruolo: "responsabile" });
  const add = async () => {
    const email = f.email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) return alert("Email non valida");
    if (f.ruolo !== "admin" && !f.azienda_id) return alert("Scegli l'azienda");
    await salva("gs_accessi", { email, azienda_id: f.ruolo === "admin" ? null : Number(f.azienda_id), ruolo: f.ruolo });
    setF({ email: "", azienda_id: "", ruolo: "responsabile" }); await ctx.ricarica();
  };
  const del = async (a) => {
    if (a.email.toLowerCase() === ctx.email && a.ruolo === "admin") return alert("Non puoi togliere l'accesso a te stesso.");
    if (!confirm(`Togliere l'accesso a ${a.email}?`)) return;
    await elimina("gs_accessi", a.id); await ctx.ricarica();
  };
  const nomeR = { admin: "Amministratore (tutto)", responsabile: "Responsabile (vede e compila)", lettura: "Solo lettura" };
  return (
    <>
      {titolo("Accessi", "Chi entra in Group Station e cosa vede. Chi inserisci nell'organigramma con l'email entra da solo come responsabile della sua azienda.")}
      <Card style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "2fr 1.5fr 1.5fr auto", gap: 10, alignItems: "end" }}>
        <Field label="Email" type="email" value={f.email} onChange={(v) => setF((x) => ({ ...x, email: v }))} placeholder="nome@azienda.it" />
        <Field label="Ruolo" value={f.ruolo} onChange={(v) => setF((x) => ({ ...x, ruolo: v }))} options={Object.entries(nomeR).map(([value, label]) => ({ value, label }))} />
        <Field label="Azienda" value={f.azienda_id} onChange={(v) => setF((x) => ({ ...x, azienda_id: v }))} options={[{ value: "", label: f.ruolo === "admin" ? "tutte" : "— scegli" }, ...d.aziende.map((a) => ({ value: a.id, label: a.nome }))]} />
        <Btn onClick={add}>Aggiungi</Btn>
      </Card>
      <Card style={{ padding: "4px 18px", marginTop: 14 }}>
        {d.accessi.map((a, i) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${C.soft}` : "none", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{a.email}</div><div style={{ fontSize: 12, color: C.grey }}>{nomeR[a.ruolo] || a.ruolo}</div></div>
            <Chip>{a.azienda_id ? d.aziende.find((x) => x.id === a.azienda_id)?.nome : "Tutte le aziende"}</Chip>
            <button onClick={() => del(a)} style={{ border: "none", background: "none", color: C.grey }}>🗑</button>
          </div>))}
      </Card>
    </>
  );
}
