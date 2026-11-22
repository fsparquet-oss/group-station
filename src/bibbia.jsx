import React, { useState } from "react";
import { supabase } from "./supabase";
import { C, Btn, Card, Field, Modal, Label, Anello, oggi, data } from "./ui";

// Bibbia in un anno, dall'inizio alla fine (Genesi → Apocalisse): 1189 capitoli divisi in 365 giorni.
const LIBRI = [
  ["Genesi", 50], ["Esodo", 40], ["Levitico", 27], ["Numeri", 36], ["Deuteronomio", 34], ["Giosuè", 24], ["Giudici", 21], ["Rut", 4],
  ["1 Samuele", 31], ["2 Samuele", 24], ["1 Re", 22], ["2 Re", 25], ["1 Cronache", 29], ["2 Cronache", 36], ["Esdra", 10], ["Neemia", 13],
  ["Ester", 10], ["Giobbe", 42], ["Salmi", 150], ["Proverbi", 31], ["Ecclesiaste", 12], ["Cantico dei Cantici", 8], ["Isaia", 66],
  ["Geremia", 52], ["Lamentazioni", 5], ["Ezechiele", 48], ["Daniele", 12], ["Osea", 14], ["Gioele", 3], ["Amos", 9], ["Abdia", 1],
  ["Giona", 4], ["Michea", 7], ["Naum", 3], ["Abacuc", 3], ["Sofonia", 3], ["Aggeo", 2], ["Zaccaria", 14], ["Malachia", 4],
  ["Matteo", 28], ["Marco", 16], ["Luca", 24], ["Giovanni", 21], ["Atti", 28], ["Romani", 16], ["1 Corinzi", 16], ["2 Corinzi", 13],
  ["Galati", 6], ["Efesini", 6], ["Filippesi", 4], ["Colossesi", 4], ["1 Tessalonicesi", 5], ["2 Tessalonicesi", 3], ["1 Timoteo", 6],
  ["2 Timoteo", 4], ["Tito", 3], ["Filemone", 1], ["Ebrei", 13], ["Giacomo", 5], ["1 Pietro", 5], ["2 Pietro", 3], ["1 Giovanni", 5],
  ["2 Giovanni", 1], ["3 Giovanni", 1], ["Giuda", 1], ["Apocalisse", 22],
];
const CAPITOLI = LIBRI.flatMap(([l, n], i) => Array.from({ length: n }, (_, k) => ({ libro: l, cap: k + 1, nt: i >= 39 })));
export const GIORNI = 365;

// Testo della lettura di un giorno, es. "Genesi 1–4" oppure "Genesi 50 · Esodo 1–3"
export function lettura(g) {
  const da = Math.floor(((g - 1) * CAPITOLI.length) / GIORNI), a = Math.floor((g * CAPITOLI.length) / GIORNI);
  const gruppi = [];
  CAPITOLI.slice(da, a).forEach((c) => { const u = gruppi[gruppi.length - 1]; if (u && u.libro === c.libro) u.fine = c.cap; else gruppi.push({ libro: c.libro, inizio: c.cap, fine: c.cap }); });
  return gruppi.map((x) => (LIBRI.find((l) => l[0] === x.libro)[1] === 1 ? x.libro : `${x.libro} ${x.inizio}${x.fine !== x.inizio ? "–" + x.fine : ""}`)).join(" · ");
}
const testamento = (g) => (CAPITOLI[Math.floor(((g - 1) * CAPITOLI.length) / GIORNI)].nt ? "Nuovo Testamento" : "Antico Testamento");
const giorniTra = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
const piuGiorni = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

export function PianoBibbia({ ctx }) {
  const piano = (ctx.d.vita_piani || []).find((p) => p.nome === "bibbia");
  const letti = new Set((ctx.d.vita_letture || []).filter((l) => l.piano === "bibbia").map((l) => l.giorno));
  const [inizio, setInizio] = useState(oggi());
  const [tutti, setTutti] = useState(false);
  const [imp, setImp] = useState(false);

  if (!piano) return (
    <Card style={{ marginTop: 14 }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Bibbia in un anno</div>
      <div style={{ fontSize: 14, color: C.slate, marginTop: 6, lineHeight: 1.5 }}>Da Genesi ad Apocalisse in 365 giorni: 3-4 capitoli al giorno, circa 15 minuti. Ogni giorno spunti la lettura e vedi se sei in pari.</div>
      <div style={{ display: "flex", gap: 10, alignItems: "end", marginTop: 16, flexWrap: "wrap" }}>
        <Field label="Comincio il" type="date" value={inizio} onChange={setInizio} />
        <Btn onClick={async () => { const { error } = await supabase.from("gs_vita_piani").insert({ nome: "bibbia", inizio }); if (error) return alert("Non salvato: " + error.message); ctx.ricarica(); }}>Inizia il piano</Btn>
      </div>
    </Card>
  );

  const fatti = letti.size;
  const prossimo = Array.from({ length: GIORNI }, (_, i) => i + 1).find((g) => !letti.has(g));
  const atteso = Math.max(0, Math.min(GIORNI, giorniTra(piano.inizio, oggi()) + 1));
  const diff = fatti - atteso;
  const stato = giorniTra(piano.inizio, oggi()) < 0 ? `Comincia il ${data(piano.inizio)}` : diff === 0 ? "Sei in pari" : diff > 0 ? `Sei avanti di ${diff} ${diff === 1 ? "giorno" : "giorni"}` : `Sei indietro di ${-diff} ${diff === -1 ? "giorno" : "giorni"}`;

  async function segna(g, si) {
    const { error } = si
      ? await supabase.from("gs_vita_letture").insert({ piano: "bibbia", giorno: g, letto_il: oggi() })
      : await supabase.from("gs_vita_letture").delete().eq("piano", "bibbia").eq("giorno", g);
    if (error) return alert("Non salvato: " + error.message);
    ctx.ricarica();
  }

  const lista = tutti ? Array.from({ length: GIORNI }, (_, i) => i + 1) : Array.from({ length: 10 }, (_, i) => (prossimo || GIORNI) - 2 + i).filter((g) => g >= 1 && g <= GIORNI);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "1.3fr 1fr", gap: 16, marginTop: 14 }}>
        <div style={{ background: C.dark, color: "#fff", borderRadius: 24, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{prossimo ? `Lettura di oggi · giorno ${prossimo}` : "Bibbia finita!"}</div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{prossimo ? testamento(prossimo) : ""}</span>
          </div>
          {prossimo ? <>
            <div style={{ fontSize: ctx.mobile ? 24 : 30, fontWeight: 500, letterSpacing: -0.6, marginTop: 14, lineHeight: 1.2 }}>{lettura(prossimo)}</div>
            <button onClick={() => segna(prossimo, true)} style={{ marginTop: 18, border: "none", borderRadius: 999, background: "#fff", color: C.text, fontSize: 14, fontWeight: 600, padding: "11px 20px" }}>✓ Letto</button>
          </> : <div style={{ fontSize: 15, marginTop: 14, color: "rgba(255,255,255,.8)" }}>Hai letto tutta la Bibbia, da Genesi ad Apocalisse. Gloria a Dio!</div>}
        </div>
        <Card style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Anello pct={(fatti / GIORNI) * 100} size={84} spessore={5} colore={C.text} fondo={C.line} testo={`${Math.round((fatti / GIORNI) * 100)}%`} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.5 }}>{fatti}<span style={{ fontSize: 14, color: C.grey }}> / {GIORNI} giorni</span></div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: diff < 0 ? C.red : C.text }}>{stato}</div>
            <div style={{ fontSize: 12, color: C.grey, marginTop: 4 }}>Iniziato il {data(piano.inizio)} · fine prevista {data(piuGiorni(piano.inizio, GIORNI - 1))}</div>
            <Btn variant="link" small style={{ marginTop: 6, color: C.slate }} onClick={() => setImp(true)}>Impostazioni</Btn>
          </div>
        </Card>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 2px 12px" }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{tutti ? "Tutto il piano" : "Le prossime letture"}</div>
        <Btn small variant="ghost" onClick={() => setTutti(!tutti)}>{tutti ? "Mostra meno" : "Tutti i 365 giorni"}</Btn>
      </div>
      <Card style={{ padding: "8px 16px" }}>
        {lista.map((g) => { const ok = letti.has(g), d = piuGiorni(piano.inizio, g - 1);
          return (
            <div key={g} onClick={() => segna(g, !ok)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.soft}`, cursor: "pointer" }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: ok ? "none" : `1.5px solid ${C.line}`, background: ok ? C.text : "#fff", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{ok ? "✓" : ""}</span>
              <span style={{ width: 52, fontSize: 12, color: C.grey, flexShrink: 0 }}>Giorno {g}</span>
              <span style={{ flex: 1, fontSize: 14, color: ok ? C.grey : C.text, fontWeight: g === prossimo ? 600 : 400 }}>{lettura(g)}</span>
              <span style={{ fontSize: 11.5, color: C.grey, whiteSpace: "nowrap" }}>{new Date(d + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
            </div>
          ); })}
      </Card>

      {imp && <Impostazioni ctx={ctx} piano={piano} onClose={() => setImp(false)} />}
    </>
  );
}

function Impostazioni({ ctx, piano, onClose }) {
  const [inizio, setInizio] = useState(piano.inizio);
  const salvaData = async () => { const { error } = await supabase.from("gs_vita_piani").update({ inizio }).eq("id", piano.id); if (error) return alert(error.message); await ctx.ricarica(); onClose(); };
  const ricomincia = async () => {
    if (!confirm("Cancellare tutte le letture segnate e ricominciare da oggi?")) return;
    await supabase.from("gs_vita_letture").delete().eq("piano", "bibbia");
    await supabase.from("gs_vita_piani").update({ inizio: oggi() }).eq("id", piano.id);
    await ctx.ricarica(); onClose();
  };
  return (
    <Modal title="Piano Bibbia in un anno" onClose={onClose}>
      <Label style={{ marginBottom: 8 }}>Data di inizio</Label>
      <Field type="date" value={inizio} onChange={setInizio} hint="Serve per calcolare se sei in pari. Le letture già segnate restano." />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <Btn variant="link" onClick={ricomincia}>Ricomincia da capo</Btn>
        <div style={{ display: "flex", gap: 8 }}><Btn variant="soft" onClick={onClose}>Annulla</Btn><Btn onClick={salvaData}>Salva</Btn></div>
      </div>
    </Modal>
  );
}
