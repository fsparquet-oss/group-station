import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";
import { C, Btn, oggi } from "./ui";

// Rituale (22 nov. 2026, esempio "Habit Tracker: Streak Heatmap" scelto da Fabio):
// mappa a quadretti dei giorni, serie, check-in totali, andamento — e il passo scomodo di ogni giorno.

const g2s = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
const sposta = (s, n) => { const x = new Date(s + "T12:00:00"); x.setDate(x.getDate() + n); return g2s(x); };
const fmtBreve = (s) => new Date(s + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
const SCALA = ["rgba(255,255,255,.07)", "#4d1417", "#8c0b0f", "#c9343c", "#f08a90"];
const colore = (v) => v == null ? "transparent" : v <= 0 ? SCALA[0] : v < 0.34 ? SCALA[1] : v < 0.67 ? SCALA[2] : v < 1 ? SCALA[3] : SCALA[4];

// ---------- Passi scomodi: ogni giorno una cosa che ti avvicina a un obiettivo ----------
const PASSI = [
  { a: "Debiti", t: "Scrivi su un foglio tutti i debiti: a chi, quanto, che rata, che scadenza. Senza scuse." },
  { a: "Debiti", t: "Chiama un creditore e concorda un piano per chiudere prima." },
  { a: "Debiti", t: "Paga oggi qualcosa in più sul debito più piccolo, anche solo 50 €." },
  { a: "Lavoro", t: "Chiama o scrivi a un imprenditore che guadagna 10 volte te e chiedigli 20 minuti per un caffè." },
  { a: "Lavoro", t: "Chiama un milionario che conosci (o un amico di un amico) e chiedigli: cosa faresti al mio posto?" },
  { a: "Lavoro", t: "Chiama un cliente che deve ancora pagare e chiedi una data precisa." },
  { a: "Lavoro", t: "Alza il prezzo nel prossimo preventivo e non chiedere scusa." },
  { a: "Lavoro", t: "Chiama un architetto o un'impresa che non conosci e presentati." },
  { a: "Lavoro", t: "Chiedi a un cliente contento una recensione e il nome di un amico che deve rifare casa." },
  { a: "Lavoro", t: "Dì di no a un lavoro o a un impegno che non ti avvicina ai tuoi obiettivi." },
  { a: "Lavoro", t: "Delega oggi una cosa che fai sempre tu, e non controllarla ogni 5 minuti." },
  { a: "America", t: "Fai 20 minuti d'inglese parlando ad alta voce, anche se ti senti ridicolo." },
  { a: "America", t: "Scrivi a un avvocato del visto E-2 e chiedi una prima consulenza." },
  { a: "America", t: "Scrivi su Instagram a un posatore italiano che lavora negli USA e fagli 3 domande." },
  { a: "America", t: "Presentati in inglese in un messaggio vocale di 1 minuto e riascoltalo." },
  { a: "Vlog", t: "Pubblica un episodio del vlog anche se non è perfetto." },
  { a: "Vlog", t: "Registra 1 minuto in cui parli in camera di un errore che hai fatto nel lavoro." },
  { a: "Vita con Dio", t: "Parla di Dio a una persona oggi, con semplicità." },
  { a: "Vita con Dio", t: "Digiuna un pasto e prega per una decisione importante." },
  { a: "Vita con Dio", t: "Chiedi perdono a qualcuno con cui hai un conto in sospeso." },
  { a: "Famiglia", t: "Chiedi a tua moglie: cosa posso migliorare? Ascolta senza difenderti." },
  { a: "Famiglia", t: "Chiama tuo papà e digli grazie per quello che ti ha insegnato." },
  { a: "Studio", t: "Chiama una scuola serale o un istituto e chiedi come recuperare gli anni per il diploma." },
  { a: "Soldi", t: "Versa in una busta oggi, anche se ti sembra poco." },
  { a: "Soldi", t: "Guarda le spese dell'ultimo mese e taglia un abbonamento o una spesa inutile." },
  { a: "Corpo", t: "Vai in palestra anche se sei stanco: 30 minuti bastano." },
];
const giornoAnno = (s) => Math.floor((new Date(s + "T12:00:00") - new Date(s.slice(0, 4) + "-01-01T12:00:00")) / 86400000);

function obiettivoPer(area, obiettivi) {
  const aperti = obiettivi.filter((o) => !(o.valore_obiettivo && Number(o.valore_attuale || 0) >= Number(o.valore_obiettivo)));
  if (area === "Debiti") return aperti.find((o) => /debit/i.test(o.titolo));
  if (area === "Lavoro") return aperti.find((o) => o.area === "Casa") || aperti.find((o) => o.tipo === "soldi");
  return aperti.find((o) => o.area === area);
}

export function PassoScomodo({ ctx }) {
  const { d, giorno } = ctx;
  const passo = (d.vita_passi || []).find((p) => p.giorno === giorno);
  const [k, setK] = useState(0);
  const [scrivo, setScrivo] = useState(false);
  const [testo, setTesto] = useState("");
  const proposta = PASSI[(giornoAnno(giorno) * 7 + k) % PASSI.length];
  const ob = passo ? d.vita_obiettivi.find((o) => o.id === passo.obiettivo_id) : obiettivoPer(proposta.a, d.vita_obiettivi);
  const fatti = (d.vita_passi || []).filter((p) => p.fatto).length;
  let serie = 0; { let g = (d.vita_passi || []).find((p) => p.giorno === oggi())?.fatto ? oggi() : sposta(oggi(), -1); while ((d.vita_passi || []).find((p) => p.giorno === g && p.fatto)) { serie++; g = sposta(g, -1); } }

  async function scegli(t, area) {
    const o = obiettivoPer(area, d.vita_obiettivi);
    const { error } = await supabase.from("gs_vita_passi").insert({ giorno, testo: t, area, obiettivo_id: o?.id ?? null });
    if (error) return alert("Non salvato: " + error.message);
    setScrivo(false); setTesto(""); ctx.ricarica();
  }
  const segna = async () => { const { error } = await supabase.from("gs_vita_passi").update({ fatto: !passo.fatto }).eq("id", passo.id); if (error) return alert(error.message); ctx.ricarica(); };
  const cambia = async () => { await supabase.from("gs_vita_passi").delete().eq("id", passo.id); ctx.ricarica(); };
  const bianco = { border: "none", borderRadius: 999, background: "#fff", color: C.red, fontSize: 14, fontWeight: 650, padding: "10px 18px" };
  const vetroR = { border: "1px solid rgba(255,255,255,.35)", borderRadius: 999, background: "transparent", color: "#fff", fontSize: 13.5, fontWeight: 600, padding: "9px 16px" };

  return (
    <div style={{ background: passo?.fatto ? C.dark : C.red, color: "#fff", borderRadius: 24, padding: 20, marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255,255,255,.75)" }}>Il passo scomodo di {giorno === oggi() ? "oggi" : "questo giorno"}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", whiteSpace: "nowrap" }}>🔥 {serie} di fila · {fatti} fatti</div>
      </div>
      {passo ? <>
        <div style={{ fontSize: ctx.mobile ? 20 : 23, fontWeight: 500, lineHeight: 1.3, marginTop: 12, textDecoration: passo.fatto ? "line-through" : "none", textDecorationColor: "rgba(255,255,255,.4)" }}>{passo.testo}</div>
        {ob && <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 8 }}>Ti avvicina a: {ob.titolo}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={segna} style={passo.fatto ? vetroR : bianco}>{passo.fatto ? "Fatto ✓ (togli)" : "✓ L'ho fatto"}</button>
          {!passo.fatto && <button onClick={cambia} style={vetroR}>Cambia</button>}
        </div>
      </> : scrivo ? <>
        <textarea autoFocus value={testo} onChange={(e) => setTesto(e.target.value)} rows={2} placeholder="Es. Chiamare Marco e chiedergli come ha comprato il primo capannone" style={{ width: "100%", marginTop: 12, border: "none", borderRadius: 14, padding: 12, fontSize: 15, color: C.text, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => testo.trim() && scegli(testo.trim(), null)} style={bianco}>Lo faccio oggi</button>
          <button onClick={() => setScrivo(false)} style={vetroR}>Annulla</button>
        </div>
      </> : <>
        <div style={{ fontSize: ctx.mobile ? 20 : 23, fontWeight: 500, lineHeight: 1.3, marginTop: 12 }}>{proposta.t}</div>
        {ob && <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 8 }}>Ti avvicina a: {ob.titolo}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={() => scegli(proposta.t, proposta.a)} style={bianco}>Lo faccio oggi</button>
          <button onClick={() => setK(k + 1)} style={vetroR}>Un altro</button>
          <button onClick={() => setScrivo(true)} style={vetroR}>Lo scrivo io</button>
        </div>
      </>}
    </div>
  );
}

// ---------- Mappa a quadretti + numeri ----------
export function Rituale({ ctx, abitudini }) {
  const { d } = ctx;
  const [serieSel, setSerieSel] = useState("tutte");
  const [indietro, setIndietro] = useState(0);
  const settimane = ctx.mobile ? 18 : 26;

  // valore 0..1 di un giorno per la serie scelta
  const valoreGiorno = useMemo(() => {
    const perGiorno = {};
    d.vita_valori.forEach((v) => { (perGiorno[v.giorno] = perGiorno[v.giorno] || []).push(v); });
    const riuscita = (a, v) => !v ? 0 : a.tipo === "check" ? (v.fatto ? 1 : 0) : v.valore == null ? 0 : a.obiettivo ? Math.min(1, Number(v.valore) / Number(a.obiettivo)) : 1;
    return (g) => {
      if (serieSel === "passo") { const p = (d.vita_passi || []).find((x) => x.giorno === g); return p?.fatto ? 1 : 0; }
      const vs = perGiorno[g] || [];
      if (serieSel === "tutte") return abitudini.length ? abitudini.reduce((s, a) => s + riuscita(a, vs.find((v) => v.abitudine_id === a.id)), 0) / abitudini.length : 0;
      const a = abitudini.find((x) => String(x.id) === serieSel);
      return a ? riuscita(a, vs.find((v) => v.abitudine_id === a.id)) : 0;
    };
  }, [d, abitudini, serieSel]);
  const soglia = serieSel === "tutte" ? 0.7 : 1;
  const ok = (g) => valoreGiorno(g) >= soglia;

  // griglia: colonne = settimane (lun→dom), finisce con la settimana di oggi
  const oggiS = oggi();
  const lun = (() => { const x = new Date(oggiS + "T12:00:00"); const dow = (x.getDay() + 6) % 7; return sposta(oggiS, -dow - indietro * settimane * 7); })();
  const primo = sposta(lun, -(settimane - 1) * 7);
  const colonne = Array.from({ length: settimane }, (_, c) => Array.from({ length: 7 }, (_, r) => sposta(primo, c * 7 + r)));
  const ultimo = sposta(lun, 6) > oggiS ? oggiS : sposta(lun, 6);

  // numeri
  const inizioDati = [...d.vita_valori.map((v) => v.giorno), ...(d.vita_passi || []).map((p) => p.giorno)].sort()[0] || oggiS;
  let serie = 0; { let g = ok(oggiS) ? oggiS : sposta(oggiS, -1); while (g >= inizioDati && ok(g)) { serie++; g = sposta(g, -1); } }
  let record = 0, cur = 0; for (let g = inizioDati; g <= oggiS; g = sposta(g, 1)) { if (ok(g)) { cur++; record = Math.max(record, cur); } else cur = 0; }
  const checkin = serieSel === "passo" ? (d.vita_passi || []).filter((p) => p.fatto).length
    : d.vita_valori.filter((v) => (serieSel === "tutte" || String(v.abitudine_id) === serieSel) && abitudini.some((a) => a.id === v.abitudine_id) && (v.fatto || v.valore != null)).length;
  const ult30 = Array.from({ length: 30 }, (_, i) => sposta(oggiS, -i)).filter((g) => g >= inizioDati);
  const media = ult30.length ? Math.round((ult30.reduce((s, g) => s + valoreGiorno(g), 0) / ult30.length) * 100) : 0;
  const giorniOk = ult30.filter(ok).length;

  const scelte = [["tutte", "Tutte"], ["passo", "Passo scomodo"], ...abitudini.map((a) => [String(a.id), a.nome])];
  const tile = { background: "#151515", borderRadius: 22, padding: 16, display: "flex", flexDirection: "column", minHeight: ctx.mobile ? 120 : 132 };
  const numero = { fontSize: ctx.mobile ? 40 : 46, fontWeight: 700, color: "#f2646c", letterSpacing: -1.5, lineHeight: 1, marginTop: "auto" };
  const sotto = { fontSize: 11.5, color: "rgba(255,255,255,.5)", marginTop: 10 };

  return (
    <div style={{ background: "#0b0b0b", color: "#fff", borderRadius: 28, padding: ctx.mobile ? 14 : 20, marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "2px 4px 12px" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Il mio rituale</div>
        <select value={serieSel} onChange={(e) => setSerieSel(e.target.value)} style={{ background: "#1d1d1d", color: "#fff", border: "none", borderRadius: 999, padding: "7px 12px", fontSize: 13, maxWidth: "60%" }}>
          {scelte.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div style={{ background: "linear-gradient(180deg, #3a0d10 0%, #1a0607 100%)", borderRadius: 22, padding: ctx.mobile ? 12 : 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gap: 3, fontSize: 9.5, color: "rgba(255,255,255,.6)", fontWeight: 600 }}>
            {["L", "M", "M", "G", "V", "S", "D"].map((x, i) => <div key={i} style={{ display: "flex", alignItems: "center" }}>{x}</div>)}
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${settimane}, 1fr)`, gap: 3 }}>
            {colonne.map((col, c) => (
              <div key={c} style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gap: 3 }}>
                {col.map((g) => <div key={g} title={`${fmtBreve(g)} · ${Math.round(valoreGiorno(g) * 100)}%`} style={{ aspectRatio: "1", borderRadius: 4, background: g > oggiS ? "transparent" : colore(valoreGiorno(g)), outline: g === oggiS ? "1.5px solid #fff" : "none", outlineOffset: 1 }} />)}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <button onClick={() => setIndietro(indietro + 1)} disabled={indietro >= 1} style={{ border: "none", width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.35)", color: "#fff", fontSize: 16, opacity: indietro >= 1 ? 0.3 : 1 }}>‹</button>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.85)" }}>{fmtBreve(primo)} — {fmtBreve(ultimo)}</span>
          <button onClick={() => setIndietro(Math.max(0, indietro - 1))} disabled={indietro === 0} style={{ border: "none", width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.35)", color: "#fff", fontSize: 16, opacity: indietro === 0 ? 0.3 : 1 }}>›</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginTop: 10 }}>
        <div style={tile}><div style={{ fontSize: 13, fontWeight: 600 }}>🔥 Serie</div><div style={numero}>{serie}</div><div style={sotto}>Record: {record} {record === 1 ? "giorno" : "giorni"}</div></div>
        <div style={tile}><div style={{ fontSize: 13, fontWeight: 600 }}>✓ Check-in totali</div><div style={numero}>{checkin}</div><div style={sotto}>Dal {new Date(inizioDati + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</div></div>
        <div style={tile}><div style={{ fontSize: 13, fontWeight: 600 }}>📅 Giorni riusciti</div><div style={numero}>{giorniOk}<span style={{ fontSize: 16, color: "rgba(255,255,255,.5)" }}>/{ult30.length}</span></div><div style={sotto}>Ultimi 30 giorni{serieSel === "tutte" ? " · almeno 70%" : ""}</div></div>
        <div style={tile}><div style={{ fontSize: 13, fontWeight: 600 }}>🏆 Media</div><div style={numero}>{media}%</div><div style={{ height: 5, background: "rgba(255,255,255,.12)", borderRadius: 5, marginTop: 10, overflow: "hidden" }}><div style={{ width: media + "%", height: "100%", background: "#f2646c" }} /></div></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 10, fontSize: 10.5, color: "rgba(255,255,255,.5)" }}>
        meno {SCALA.map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: 3, background: c }} />)} più
      </div>
    </div>
  );
}
