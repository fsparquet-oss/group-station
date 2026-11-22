import React, { useState } from "react";
import { supabase } from "./supabase";
import { salva, elimina } from "./db";
import { C, Btn, Card, Field, Modal, Dot, Vuoto, Label, Anello, vetro, euro, num, data, giorniA } from "./ui";
import { SceltaGiorno } from "./oggi";

// La mia vita: abitudini di ogni giorno, buste di risparmio e obiettivi personali. Visibile solo a Fabio.
const AREE = ["Vita con Dio", "Famiglia", "Crescita", "Corpo", "Vlog", "Viaggi", "Casa", "Auto", "Soldi", "Altro"];
const fmtV = (v, u) => v == null ? "—" : u === "€" ? euro(v) : `${Number(v).toLocaleString("it-IT", { maximumFractionDigits: 1, useGrouping: "always" })}${u ? " " + u : ""}`;
const pct = (o) => o.valore_obiettivo ? Math.min(100, (Number(o.valore_attuale || 0) / Number(o.valore_obiettivo)) * 100) : 0;

export function PaginaVita({ ctx }) {
  const { d, giorno } = ctx;
  const abitudini = d.vita_abitudini.filter((a) => a.attivo !== false);
  const val = (a) => d.vita_valori.find((v) => v.abitudine_id === a.id && v.giorno === giorno);
  const fatta = (a) => a.tipo === "check" ? !!val(a)?.fatto : val(a)?.valore != null;
  const fatte = abitudini.filter(fatta).length;
  const buste = d.vita_obiettivi.filter((o) => o.tipo === "soldi");
  const altri = d.vita_obiettivi.filter((o) => o.tipo === "vita");
  const messo = buste.reduce((s, o) => s + Number(o.valore_attuale || 0), 0);
  const traguardo = buste.reduce((s, o) => s + Number(o.valore_obiettivo || 0), 0);
  const [modAb, setModAb] = useState(false);
  const [modOb, setModOb] = useState(null);
  const [versa, setVersa] = useState(null);
  const [numEdit, setNumEdit] = useState(null);
  const [testo, setTesto] = useState("");

  // serie degli ultimi 7 giorni per la striscia
  const giorni = Array.from({ length: 7 }, (_, i) => { const x = new Date(giorno + "T12:00:00"); x.setDate(x.getDate() - 6 + i); return x.toISOString().slice(0, 10); });
  const percGiorno = (g) => abitudini.length ? abitudini.filter((a) => { const v = d.vita_valori.find((x) => x.abitudine_id === a.id && x.giorno === g); return a.tipo === "check" ? v?.fatto : v?.valore != null; }).length / abitudini.length * 100 : 0;

  async function scrivi(a, campi) {
    const v = val(a);
    const { error } = v ? await supabase.from("gs_vita_valori").update(campi).eq("id", v.id) : await supabase.from("gs_vita_valori").insert({ abitudine_id: a.id, giorno, ...campi });
    if (error) return alert("Non salvato: " + error.message);
    ctx.ricarica();
  }
  const salvaNumero = async (a) => {
    const t = testo.replace(",", ".").trim(); setNumEdit(null);
    if (t === "") { if (val(a)) { await elimina("gs_vita_valori", val(a).id); ctx.ricarica(); } return; }
    if (!isNaN(Number(t))) scrivi(a, { valore: Number(t) });
  };
  const perArea = [...new Set(abitudini.map((a) => a.area))];

  return (
    <>
      <div style={{ fontSize: 13.5, color: C.grey, marginTop: -12, marginBottom: 16 }}>Solo tu vedi questa pagina.</div>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "1.1fr 1fr", gap: 16 }}>
        <div style={{ background: C.dark, color: "#fff", borderRadius: 24, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 16, fontWeight: 500 }}>La mia giornata</div><span style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{giorniA(giorno) === 0 ? "oggi" : data(giorno)}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: ctx.mobile ? 34 : 40, fontWeight: 500, letterSpacing: -1 }}>{fatte}/{abitudini.length}</span><span style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)", lineHeight: 1.2 }}>abitudini<br />fatte</span></div>
            <div style={{ width: 1, height: 34, background: "rgba(255,255,255,.2)" }} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: ctx.mobile ? 24 : 30, fontWeight: 500, letterSpacing: -1, whiteSpace: "nowrap" }}>{euro(messo)}</span><span style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)", lineHeight: 1.2 }}>messi da parte<br />{traguardo ? `su ${euro(traguardo)}` : ""}</span></div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 18, alignItems: "flex-end", height: 46 }}>
            {giorni.map((g) => { const p = percGiorno(g); return (
              <div key={g} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: 30, background: "rgba(255,255,255,.1)", borderRadius: 6, display: "flex", alignItems: "flex-end", overflow: "hidden" }}><div style={{ width: "100%", height: `${p}%`, background: "#fff", borderRadius: 6 }} /></div>
                <span style={{ fontSize: 10, color: g === giorno ? "#fff" : "rgba(255,255,255,.5)" }}>{new Date(g + "T12:00:00").toLocaleDateString("it-IT", { weekday: "narrow" }).toUpperCase()}</span>
              </div>); })}
          </div>
        </div>
        <div style={{ ...vetro, borderRadius: 24, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }}>
          <SceltaGiorno ctx={ctx} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => setModAb(true)}>Modifica abitudini</Btn>
            <Btn variant="ghost" onClick={() => setModOb({ tipo: "soldi", area: "Casa", unita: "€", valore_attuale: 0 })}>+ Busta</Btn>
            <Btn variant="ghost" onClick={() => setModOb({ tipo: "vita", area: "Crescita", unita: "", valore_attuale: 0 })}>+ Obiettivo</Btn>
          </div>
        </div>
      </div>

      {/* Abitudini del giorno, divise per area */}
      <div style={{ fontSize: 18, fontWeight: 600, margin: "26px 2px 12px" }}>Abitudini di {giorniA(giorno) === 0 ? "oggi" : data(giorno)}</div>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "repeat(3, 1fr)", gap: 12, alignItems: "start" }}>
        {perArea.map((area) => (
          <Card key={area} style={{ padding: 16 }}>
            <Label style={{ marginBottom: 10 }}>{area}</Label>
            {abitudini.filter((a) => a.area === area).map((a) => {
              const v = val(a);
              if (a.tipo === "numero") return (
                <div key={a.id} onClick={() => { if (numEdit !== a.id) { setNumEdit(a.id); setTesto(v?.valore == null ? "" : String(v.valore)); } }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer" }}>
                  <span style={{ flex: 1, fontSize: 14, color: v?.valore != null ? C.text : C.grey }}>{a.nome}</span>
                  {numEdit === a.id ? <input autoFocus inputMode="decimal" value={testo} onChange={(e) => setTesto(e.target.value)} onBlur={() => salvaNumero(a)} onKeyDown={(e) => e.key === "Enter" && e.target.blur()} style={{ width: 70, border: "none", borderRadius: 8, background: C.soft, padding: "4px 8px", fontSize: 14, outline: `2px solid ${C.text}` }} />
                    : <span style={{ fontSize: 14, fontWeight: 600, color: v?.valore == null ? C.grey : a.obiettivo != null && Number(v.valore) >= Number(a.obiettivo) ? C.text : C.slate }}>{v?.valore == null ? "+ scrivi" : `${num(v.valore)}${a.obiettivo ? ` / ${num(a.obiettivo)}` : ""} ${a.unita || ""}`}</span>}
                </div>
              );
              const ok = !!v?.fatto;
              return (
                <div key={a.id} onClick={() => scrivi(a, { fatto: !ok })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer" }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: ok ? "none" : `1.5px solid ${C.line}`, background: ok ? C.text : "#fff", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{ok ? "✓" : ""}</span>
                  <span style={{ fontSize: 14, color: ok ? C.text : C.grey }}>{a.nome}</span>
                </div>
              );
            })}
          </Card>
        ))}
        {perArea.length === 0 && <Card><Vuoto>Nessuna abitudine. Premi "Modifica abitudini".</Vuoto></Card>}
      </div>

      {/* Buste di risparmio */}
      <div style={{ fontSize: 18, fontWeight: 600, margin: "26px 2px 12px" }}>Buste di risparmio</div>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
        {buste.map((o) => <SchedaObiettivo key={o.id} o={o} onApri={() => setModOb(o)} onVersa={() => setVersa(o)} />)}
      </div>

      {altri.length > 0 && <>
        <div style={{ fontSize: 18, fontWeight: 600, margin: "26px 2px 12px" }}>Obiettivi di vita</div>
        <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
          {altri.map((o) => <SchedaObiettivo key={o.id} o={o} onApri={() => setModOb(o)} onVersa={() => setVersa(o)} />)}
        </div>
      </>}

      {modAb && <GestisciAbitudini ctx={ctx} onClose={() => setModAb(false)} />}
      {modOb && <ModificaObVita ctx={ctx} o={modOb} onClose={() => setModOb(null)} />}
      {versa && <Versa ctx={ctx} o={versa} onClose={() => setVersa(null)} />}
    </>
  );
}

function SchedaObiettivo({ o, onApri, onVersa }) {
  const p = pct(o), fatto = p >= 100, giorni = o.scadenza ? giorniA(o.scadenza) : null;
  const scuro = !fatto, fg = scuro ? "#fff" : C.text, sub = scuro ? "rgba(255,255,255,.6)" : C.grey;
  const manca = o.valore_obiettivo ? Math.max(0, Number(o.valore_obiettivo) - Number(o.valore_attuale || 0)) : null;
  const mesi = giorni != null && giorni > 0 ? Math.max(1, Math.round(giorni / 30)) : null;
  return (
    <div style={{ background: scuro ? C.dark : C.card, color: fg, borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", minHeight: 170 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div onClick={onApri} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 11, color: sub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{o.area}</div>
          <div style={{ fontSize: 15.5, fontWeight: 500, lineHeight: 1.3 }}>{o.titolo}</div>
        </div>
        <Anello pct={p} size={44} spessore={3} colore={fg} fondo={scuro ? "rgba(255,255,255,.18)" : C.line} testo={o.valore_obiettivo ? `${Math.round(p)}%` : "?"} />
      </div>
      <div style={{ marginTop: "auto", paddingTop: 14 }}>
        <span style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.6 }}>{fmtV(o.valore_attuale || 0, o.unita)}</span>
        <span style={{ fontSize: 13, color: sub }}> / {o.valore_obiettivo ? fmtV(o.valore_obiettivo, o.unita) : <span onClick={onApri} style={{ textDecoration: "underline", cursor: "pointer" }}>imposta il traguardo</span>}</span>
        <div style={{ height: 4, background: scuro ? "rgba(255,255,255,.15)" : C.soft, borderRadius: 4, marginTop: 10, overflow: "hidden" }}><div style={{ width: p + "%", height: "100%", background: fg }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8 }}>
          <div style={{ fontSize: 11.5, color: sub, lineHeight: 1.4 }}>
            {o.scadenza ? `entro ${data(o.scadenza)}` : ""}
            {o.unita === "€" && manca != null && mesi && !fatto ? <><br />{euro(Math.ceil(manca / mesi))} al mese per arrivarci</> : null}
          </div>
          {!fatto && <button onClick={onVersa} style={{ border: "none", borderRadius: 999, background: scuro ? "#fff" : C.text, color: scuro ? C.text : "#fff", fontSize: 12.5, fontWeight: 600, padding: "7px 13px", whiteSpace: "nowrap" }}>{o.unita === "€" ? "+ Versa" : "+ Aggiungi"}</button>}
        </div>
      </div>
    </div>
  );
}

function Versa({ ctx, o, onClose }) {
  const [v, setV] = useState("");
  const ok = async () => {
    const n = Number(String(v).replace(/\./g, "").replace(",", "."));
    if (!n || isNaN(n)) return alert("Scrivi un importo");
    await salva("gs_vita_obiettivi", { id: o.id, valore_attuale: Number(o.valore_attuale || 0) + n });
    await ctx.ricarica(); onClose();
  };
  return (
    <Modal title={`${o.unita === "€" ? "Versa nella busta" : "Aggiungi"} · ${o.titolo}`} onClose={onClose}>
      <div style={{ fontSize: 13.5, color: C.slate, marginBottom: 10 }}>Ora: <b>{fmtV(o.valore_attuale || 0, o.unita)}</b>{o.valore_obiettivo ? ` su ${fmtV(o.valore_obiettivo, o.unita)}` : ""}. Per togliere scrivi un numero col meno (es. -100).</div>
      <Field label={o.unita === "€" ? "Quanto metti da parte (€)" : `Quanti (${o.unita || ""})`} type="number" value={v} onChange={setV} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}><Btn variant="soft" onClick={onClose}>Annulla</Btn><Btn onClick={ok}>Salva</Btn></div>
    </Modal>
  );
}

function ModificaObVita({ ctx, o, onClose }) {
  const [f, setF] = useState(o);
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const n = (v) => v === "" || v == null ? null : Number(String(v).replace(/\./g, "").replace(",", "."));
  const ok = async () => {
    if (!f.titolo) return alert("Scrivi il nome");
    await salva("gs_vita_obiettivi", { id: f.id, area: f.area, tipo: f.tipo, titolo: f.titolo, valore_attuale: n(f.valore_attuale) || 0, valore_obiettivo: n(f.valore_obiettivo), unita: f.unita || null, scadenza: f.scadenza || null, note: f.note || null, ordine: f.ordine ?? ctx.d.vita_obiettivi.length + 1 });
    await ctx.ricarica(); onClose();
  };
  const del = async () => { if (!confirm("Eliminare?")) return; await elimina("gs_vita_obiettivi", f.id); await ctx.ricarica(); onClose(); };
  return (
    <Modal title={f.id ? f.titolo : f.tipo === "soldi" ? "Nuova busta di risparmio" : "Nuovo obiettivo di vita"} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Nome" value={f.titolo} onChange={s("titolo")} placeholder={f.tipo === "soldi" ? "Es. Viaggio in Giappone" : "Es. Leggere 24 libri"} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Area" value={f.area} onChange={s("area")} options={AREE.map((a) => ({ value: a, label: a }))} />
          <Field label="Entro il" type="date" value={f.scadenza} onChange={s("scadenza")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Dove sei ora" type="number" value={f.valore_attuale} onChange={s("valore_attuale")} />
          <Field label="Traguardo" type="number" value={f.valore_obiettivo} onChange={s("valore_obiettivo")} />
          <Field label="Unità" value={f.unita} onChange={s("unita")} placeholder="€, libri, episodi…" />
        </div>
        <Field label="Note" area={2} value={f.note} onChange={s("note")} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>{f.id ? <Btn variant="link" onClick={del}>Elimina</Btn> : <span />}<div style={{ display: "flex", gap: 8 }}><Btn variant="soft" onClick={onClose}>Annulla</Btn><Btn onClick={ok}>Salva</Btn></div></div>
      </div>
    </Modal>
  );
}

function GestisciAbitudini({ ctx, onClose }) {
  const lista = ctx.d.vita_abitudini;
  const [nuova, setNuova] = useState({ area: "Vita con Dio", tipo: "check", nome: "", unita: "", obiettivo: "" });
  const togli = async (a) => { if (!confirm(`Togliere "${a.nome}"?`)) return; await elimina("gs_vita_abitudini", a.id); await ctx.ricarica(); };
  const aggiungi = async () => {
    if (!nuova.nome.trim()) return;
    await salva("gs_vita_abitudini", { area: nuova.area, tipo: nuova.tipo, nome: nuova.nome.trim(), unita: nuova.tipo === "numero" ? nuova.unita || null : null, obiettivo: nuova.tipo === "numero" && nuova.obiettivo !== "" ? Number(nuova.obiettivo) : null, ordine: lista.length + 1 });
    setNuova((x) => ({ ...x, nome: "", unita: "", obiettivo: "" })); await ctx.ricarica();
  };
  return (
    <Modal title="Le mie abitudini di ogni giorno" onClose={onClose} wide>
      <div style={{ display: "grid", gap: 6 }}>
        {lista.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.soft, borderRadius: 12, padding: "9px 12px" }}>
            <span style={{ fontSize: 11, color: C.grey, width: 90, flexShrink: 0 }}>{a.area}</span>
            <span style={{ flex: 1, fontSize: 14 }}>{a.nome}{a.tipo === "numero" ? ` (numero${a.obiettivo ? `, obiettivo ${a.obiettivo} ${a.unita || ""}` : ""})` : ""}</span>
            <Btn variant="link" small onClick={() => togli(a)}>Togli</Btn>
          </div>
        ))}
      </div>
      <Label style={{ margin: "18px 0 8px" }}>Aggiungi</Label>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : nuova.tipo === "numero" ? "1fr 1fr 2fr 1fr 1fr" : "1fr 1fr 3fr", gap: 8, alignItems: "end" }}>
        <Field label="Area" value={nuova.area} onChange={(v) => setNuova((x) => ({ ...x, area: v }))} options={AREE.map((a) => ({ value: a, label: a }))} />
        <Field label="Tipo" value={nuova.tipo} onChange={(v) => setNuova((x) => ({ ...x, tipo: v }))} options={[{ value: "check", label: "Spunta" }, { value: "numero", label: "Numero" }]} />
        <Field label="Cosa" value={nuova.nome} onChange={(v) => setNuova((x) => ({ ...x, nome: v }))} placeholder="Es. Parlato di Dio con qualcuno" />
        {nuova.tipo === "numero" && <Field label="Unità" value={nuova.unita} onChange={(v) => setNuova((x) => ({ ...x, unita: v }))} placeholder="min, pagine…" />}
        {nuova.tipo === "numero" && <Field label="Obiettivo" type="number" value={nuova.obiettivo} onChange={(v) => setNuova((x) => ({ ...x, obiettivo: v }))} />}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}><Btn variant="soft" onClick={onClose}>Chiudi</Btn><Btn onClick={aggiungi}>Aggiungi</Btn></div>
    </Modal>
  );
}
