import React, { useMemo, useState } from "react";
import { C, Btn, Card, Field, Modal, Vuoto, Segment, oggi } from "./ui";
import { salva, elimina } from "./db";

// Bigliettini del giorno: promemoria "task to do" per il personale, a forma di post-it.
// Fabio (o un responsabile) li scrive per una persona e un giorno; chi li riceve li vede e li spunta.
export const COLORI_BIGLIETTO = {
  giallo: { fondo: "#fff1a8", bordo: "#f0d96a", testo: "#4a3f00" },
  rosa: { fondo: "#ffd6e0", bordo: "#f4b2c3", testo: "#5a1f2e" },
  azzurro: { fondo: "#d4ecff", bordo: "#a9d2f5", testo: "#173a57" },
  verde: { fondo: "#d8f5d0", bordo: "#aee0a2", testo: "#1f4a1a" },
  arancio: { fondo: "#ffe0c7", bordo: "#fbbf8f", testo: "#5a2c06" },
};
const sposta = (g, n) => { const d = new Date(g + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const nomeGiorno = (g) => {
  const diff = Math.round((new Date(g + "T12:00:00") - new Date(oggi() + "T12:00:00")) / 86400000);
  const base = new Date(g + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return diff === 0 ? "Oggi · " + base : diff === 1 ? "Domani · " + base : diff === -1 ? "Ieri · " + base : base;
};
const waNumero = (t) => (t || "").replace(/[^\d+]/g, "").replace(/^\+/, "").replace(/^(3\d{8,9})$/, "39$1");
// rotazione leggera e sempre uguale per ogni bigliettino
const giro = (id) => ((id * 37) % 7) - 3;

function Bigliettino({ b, persona, puoModificare, onSpunta, onApri, mostraNome }) {
  const col = COLORI_BIGLIETTO[b.colore] || COLORI_BIGLIETTO.giallo;
  return (
    <div onClick={onApri} style={{
      position: "relative", background: col.fondo, color: col.testo, borderRadius: 4, padding: "26px 16px 14px", minHeight: 150,
      boxShadow: "0 1px 1px rgba(0,0,0,.06), 0 10px 22px rgba(80,55,30,.16)", transform: `rotate(${giro(b.id) * 0.6}deg)`,
      display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", opacity: b.fatto ? 0.62 : 1, transition: "transform .2s",
      backgroundImage: `linear-gradient(135deg, transparent 0 calc(100% - 22px), ${col.bordo} calc(100% - 22px))`,
    }}>
      {/* nastro adesivo */}
      <span style={{ position: "absolute", top: -9, left: "50%", transform: `translateX(-50%) rotate(${-giro(b.id)}deg)`, width: 74, height: 20, background: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.8)", boxShadow: "0 1px 2px rgba(0,0,0,.06)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: .8, textTransform: "uppercase", opacity: .75 }}>
        <span>{mostraNome ? persona?.nome || persona?.ruolo || "—" : "Task to do"}</span>
        {b.urgente && <span style={{ background: C.red, color: "#fff", borderRadius: 999, padding: "2px 8px", letterSpacing: .4 }}>Urgente</span>}
      </div>
      <div style={{ fontSize: 17, lineHeight: 1.35, fontWeight: 500, whiteSpace: "pre-line", fontFamily: "'Segoe Print','Bradley Hand','Comic Sans MS',cursive", textDecoration: b.fatto ? "line-through" : "none", flex: 1 }}>{b.testo}</div>
      {b.risposta && <div style={{ fontSize: 12.5, background: "rgba(255,255,255,.5)", borderRadius: 10, padding: "6px 9px" }}>↩ {b.risposta}</div>}
      <button onClick={(e) => { e.stopPropagation(); onSpunta(); }} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, border: "none", background: "rgba(255,255,255,.55)", color: col.testo, borderRadius: 999, padding: "6px 12px 6px 6px", fontSize: 12.5, fontWeight: 600 }}>
        <span style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${col.testo}`, background: b.fatto ? col.testo : "transparent", color: col.fondo, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{b.fatto ? "✓" : ""}</span>
        {b.fatto ? "Fatto" : "Segna fatto"}
      </button>
    </div>
  );
}

export function PaginaBigliettini({ ctx }) {
  const { d, ricarica, admin, puoScrivere, email, mobile } = ctx;
  const [giorno, setGiorno] = useState(oggi());
  const [filtro, setFiltro] = useState(admin ? "tutti" : "miei");
  const [form, setForm] = useState(null);
  const [aperto, setAperto] = useState(null);
  const [risposta, setRisposta] = useState("");

  const persone = (d.persone || []).filter((p) => p.nome);
  const aziende = d.aziende || [];
  const persona = (id) => (d.persone || []).find((p) => p.id === id);
  const io = (d.persone || []).filter((p) => (p.email || "").toLowerCase().trim() === email).map((p) => p.id);
  const puoCreare = admin || aziende.some((a) => puoScrivere(a.id));

  const delGiorno = (d.bigliettini || []).filter((b) => b.giorno === giorno && (filtro === "tutti" || io.includes(b.persona_id)));
  // raggruppati per persona
  const gruppi = useMemo(() => {
    const m = new Map();
    delGiorno.sort((a, b) => Number(a.fatto) - Number(b.fatto) || Number(b.urgente) - Number(a.urgente) || a.id - b.id).forEach((b) => {
      if (!m.has(b.persona_id)) m.set(b.persona_id, []);
      m.get(b.persona_id).push(b);
    });
    return [...m.entries()];
  }, [d.bigliettini, giorno, filtro]); // eslint-disable-line
  const totale = delGiorno.length, fatti = delGiorno.filter((b) => b.fatto).length;

  const nuovo = (persona_id) => setForm({ persone: persona_id ? [persona_id] : [], giorno, righe: "", colore: "giallo", urgente: false });
  const salvaForm = async () => {
    const righe = form.righe.split("\n").map((r) => r.trim()).filter(Boolean);
    if (!form.persone.length) return alert("Scegli a chi mandarlo");
    if (!righe.length) return alert("Scrivi almeno una cosa da fare");
    // ogni riga diventa un bigliettino, per ogni persona scelta
    for (const pid of form.persone) {
      const p = persona(pid);
      for (const testo of righe) await salva("gs_bigliettini", { azienda_id: p.azienda_id, persona_id: pid, giorno: form.giorno, testo, colore: form.colore, urgente: form.urgente });
    }
    setForm(null); setGiorno(form.giorno); await ricarica();
  };
  const spunta = async (b) => { await salva("gs_bigliettini", { id: b.id, fatto: !b.fatto, fatto_il: !b.fatto ? new Date().toISOString() : null }); await ricarica(); };
  const rispondi = async () => { await salva("gs_bigliettini", { id: aperto.id, risposta: risposta.trim() || null }); setAperto(null); await ricarica(); };
  const sposta1 = async (b) => { await salva("gs_bigliettini", { id: b.id, giorno: sposta(b.giorno, 1), fatto: false, fatto_il: null }); setAperto(null); await ricarica(); };
  const togli = async (b) => { if (!window.confirm("Eliminare questo bigliettino?")) return; await elimina("gs_bigliettini", b.id); setAperto(null); await ricarica(); };
  const copiaDaIeri = async () => {
    const ieri = (d.bigliettini || []).filter((b) => b.giorno === sposta(giorno, -1) && !b.fatto);
    if (!ieri.length) return alert("Ieri non è rimasto niente da fare 🎉");
    if (!window.confirm(`Riportare a ${giorno === oggi() ? "oggi" : "questo giorno"} i ${ieri.length} bigliettini non fatti di ieri?`)) return;
    for (const b of ieri) await salva("gs_bigliettini", { id: b.id, giorno, fatto: false });
    await ricarica();
  };
  const messaggioWA = (pid, lista) => {
    const p = persona(pid);
    const righe = lista.filter((b) => !b.fatto).map((b) => `▢ ${b.urgente ? "‼️ " : ""}${b.testo}`).join("\n");
    return `https://wa.me/${waNumero(p?.telefono)}?text=${encodeURIComponent(`📝 Ciao ${(p?.nome || "").split(" ")[0]}, i tuoi bigliettini per ${nomeGiorno(giorno).toLowerCase()}:\n\n${righe}\n\nSegnali come fatti su Group Station 👉 ${window.location.origin}`)}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: 14 }}>
        <Btn variant="soft" small onClick={() => setGiorno(sposta(giorno, -1))}>‹</Btn>
        <div style={{ fontSize: 16, fontWeight: 650, textTransform: "capitalize", minWidth: 0, flex: mobile ? 1 : "none" }}>{nomeGiorno(giorno)}</div>
        <Btn variant="soft" small onClick={() => setGiorno(sposta(giorno, 1))}>›</Btn>
        {giorno !== oggi() && <Btn variant="link" small onClick={() => setGiorno(oggi())}>Torna a oggi</Btn>}
        <div style={{ flex: 1 }} />
        {totale > 0 && <span style={{ fontSize: 13, color: C.slate, fontWeight: 600 }}>{fatti}/{totale} fatti</span>}
        {(admin || io.length > 0) && admin && <Segment items={[["tutti", "Tutti"], ["miei", "I miei"]]} value={filtro} onChange={setFiltro} style={{ padding: 3 }} />}
      </Card>

      {puoCreare && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn onClick={() => nuovo()}>+ Bigliettino</Btn>
        <Btn variant="ghost" onClick={copiaDaIeri}>↻ Riporta i non fatti di ieri</Btn>
      </div>}

      {gruppi.length === 0 ? <Card><Vuoto>{puoCreare ? "Nessun bigliettino per questo giorno. Scrivi le cose da fare: una riga = un bigliettino." : "Per questo giorno non hai bigliettini 🎉"}</Vuoto></Card> :
        gruppi.map(([pid, lista]) => {
          const p = persona(pid); const az = aziende.find((a) => a.id === p?.azienda_id);
          const nonFatti = lista.filter((b) => !b.fatto).length;
          return (
            <div key={pid}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: C.text, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 650 }}>{(p?.nome || "?")[0]}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 650 }}>{p?.nome || "—"}</div>
                  <div style={{ fontSize: 12, color: C.grey }}>{p?.ruolo}{az ? " · " + az.nome : ""} · {nonFatti ? `${nonFatti} da fare` : "tutto fatto ✓"}</div>
                </div>
                <div style={{ flex: 1 }} />
                {puoCreare && <Btn variant="ghost" small onClick={() => nuovo(pid)}>+</Btn>}
                {puoCreare && p?.telefono && nonFatti > 0 && <a href={messaggioWA(pid, lista)} target="_blank" rel="noreferrer"><Btn variant="slate" small>Manda su WhatsApp</Btn></a>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${mobile ? 150 : 200}px, 1fr))`, gap: mobile ? 16 : 22, padding: "6px 4px 10px" }}>
                {lista.map((b) => <Bigliettino key={b.id} b={b} persona={p} puoModificare={puoScrivere(b.azienda_id)} onSpunta={() => spunta(b)} onApri={() => { setAperto(b); setRisposta(b.risposta || ""); }} />)}
              </div>
            </div>
          );
        })}

      {form && <Modal title="Nuovi bigliettini" onClose={() => setForm(null)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.slate, display: "block", marginBottom: 6 }}>Per chi</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto" }}>
              {aziende.filter((a) => puoScrivere(a.id) && persone.some((p) => p.azienda_id === a.id)).map((a) => (
                <div key={a.id}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: C.grey, textTransform: "uppercase", marginBottom: 5 }}>{a.nome}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {persone.filter((p) => p.azienda_id === a.id).map((p) => { const on = form.persone.includes(p.id); return (
                      <button key={p.id} onClick={() => setForm((f) => ({ ...f, persone: on ? f.persone.filter((x) => x !== p.id) : [...f.persone, p.id] }))}
                        style={{ border: "none", borderRadius: 999, padding: "7px 13px", fontSize: 13, fontWeight: 600, background: on ? C.text : C.soft, color: on ? "#fff" : C.text }}>{p.nome}</button>); })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Field label="Giorno" type="date" value={form.giorno} onChange={(v) => setForm((f) => ({ ...f, giorno: v }))} />
          <Field label="Cose da fare" area={5} value={form.righe} onChange={(v) => setForm((f) => ({ ...f, righe: v }))} placeholder={"Chiamare il cliente di via Roma per l'acconto\nPortare la levigatrice in magazzino\nOrdinare 10 colle"} hint="Una riga = un bigliettino" />
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.slate, display: "block", marginBottom: 6 }}>Colore</span>
            <div style={{ display: "flex", gap: 10 }}>
              {Object.entries(COLORI_BIGLIETTO).map(([k, c]) => <button key={k} title={k} onClick={() => setForm((f) => ({ ...f, colore: k }))} style={{ width: 34, height: 34, borderRadius: 6, border: form.colore === k ? `3px solid ${C.text}` : `1px solid ${c.bordo}`, background: c.fondo, transform: `rotate(${(k.length % 5) - 2}deg)` }} />)}
            </div>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={form.urgente} onChange={(e) => setForm((f) => ({ ...f, urgente: e.target.checked }))} /> Urgente</label>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn variant="ghost" onClick={() => setForm(null)}>Annulla</Btn><Btn onClick={salvaForm}>Attacca {form.righe.split("\n").filter((r) => r.trim()).length * Math.max(1, form.persone.length) || ""} bigliettini</Btn></div>
        </div>
      </Modal>}

      {aperto && <Modal title={persona(aperto.persona_id)?.nome || "Bigliettino"} onClose={() => setAperto(null)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: (COLORI_BIGLIETTO[aperto.colore] || COLORI_BIGLIETTO.giallo).fondo, borderRadius: 6, padding: 16, fontSize: 17, fontFamily: "'Segoe Print','Bradley Hand','Comic Sans MS',cursive", whiteSpace: "pre-line" }}>{aperto.testo}</div>
          <Field label="Risposta / nota" area={2} value={risposta} onChange={setRisposta} placeholder="Es. fatto, manca la fattura · lo faccio domani" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" small onClick={() => sposta1(aperto)}>Sposta a domani</Btn>
              {puoScrivere(aperto.azienda_id) && <Btn variant="ghost" small onClick={() => togli(aperto)}>Elimina</Btn>}
            </div>
            <Btn onClick={rispondi}>Salva</Btn>
          </div>
        </div>
      </Modal>}
    </div>
  );
}
