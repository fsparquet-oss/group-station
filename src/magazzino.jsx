import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { C, Card, Chip, Dot, Vuoto, Segment, Field, Btn, euro, data, giorniA } from "./ui";

// ─────────────────────────────────────────── MAGAZZINO (24 nov. 2026)
// I prodotti e i movimenti arrivano da Squadra (magazzino_stock / movimenti_magazzino) per ogni azienda
// collegata a Squadra, tramite la funzione gs_magazzino(). Qui si guarda e si prepara il riordino;
// carichi e scarichi si fanno in Squadra › Magazzino.

const statoProdotto = (p) => {
  const q = Number(p.quantita) || 0, min = Number(p.scorta_minima) || 0;
  if (q <= 0 && (min > 0 || Number(p.uscite_90) > 0)) return "esaurito";
  if (min > 0 && q < min) return "basso";
  if (q <= 0) return "vuoto";
  return "ok";
};
const STATI = {
  esaurito: { l: "Esaurito", c: C.red, bg: "rgba(140,11,15,.10)" },
  basso: { l: "Sotto scorta", c: C.amber, bg: "rgba(154,106,18,.12)" },
  vuoto: { l: "A zero", c: C.grey, bg: "rgba(0,0,0,.05)" },
  ok: { l: "Disponibile", c: C.green, bg: "rgba(47,125,79,.10)" },
};
const n1 = (x) => Number(x || 0).toLocaleString("it-IT", { maximumFractionDigits: 1 });
// quanto ordinare: torna al doppio della scorta minima, o copre il consumo dell'ultimo mese
const daOrdinare = (p) => {
  const q = Number(p.quantita) || 0, min = Number(p.scorta_minima) || 0, mese = Number(p.uscite_30) || 0;
  return Math.max(0, Math.ceil(Math.max(min * 2, mese, min) - q));
};
const iniziali = (s) => String(s || "?").replace(/[^A-Za-zÀ-ú0-9 ]/g, " ").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// Mezzaluna a tacche (come "Performance" nell'esempio)
function Tacche({ pct, colore, size = 54 }) {
  const n = 15, r = size / 2 - 3, cx = size / 2, cy = size / 2 + 2, pieni = Math.round((Math.max(0, Math.min(100, pct)) / 100) * n);
  return (
    <svg width={size} height={size / 2 + 6} viewBox={`0 0 ${size} ${size / 2 + 6}`} aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const a = Math.PI - (i / (n - 1)) * Math.PI, c = Math.cos(a), s = Math.sin(a);
        return <line key={i} x1={cx + c * (r - 7)} y1={cy - s * (r - 7)} x2={cx + c * r} y2={cy - s * r} stroke={i < pieni ? colore : "rgba(0,0,0,.12)"} strokeWidth="2.6" strokeLinecap="round" />;
      })}
    </svg>
  );
}

function Icona({ p }) {
  const att = p.categoria === "attrezzo";
  return (
    <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: att ? C.dark : "rgba(254,127,45,.16)", color: att ? "#fff" : "#b4521a", fontSize: 13.5, fontWeight: 700, letterSpacing: 0.3 }}>
      {att
        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" /></svg>
        : iniziali(p.nome)}
    </div>
  );
}

export function PaginaMagazzino({ ctx }) {
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState("");
  const [azId, setAzId] = useState(null);
  const [filtro, setFiltro] = useState("tutti");
  const [cerca, setCerca] = useState("");
  const [copiato, setCopiato] = useState("");
  const carica = async () => {
    const { data: r, error } = await supabase.rpc("gs_magazzino");
    if (error) { setErrore(error.message); setDati([]); return; }
    setDati(r || []); setErrore("");
  };
  useEffect(() => { carica(); }, []);

  const mag = useMemo(() => (dati || []).find((x) => x.azienda_id === azId) || (dati || [])[0], [dati, azId]);
  const prodotti = mag?.prodotti || [];
  const conStato = prodotti.map((p) => ({ ...p, stato: statoProdotto(p), valore: (Number(p.quantita) || 0) * (Number(p.prezzo) || 0) }));
  const riordino = conStato.filter((p) => ["esaurito", "basso"].includes(p.stato) && daOrdinare(p) > 0);
  const valore = conStato.reduce((s, p) => s + p.valore, 0);
  const consumo30 = conStato.reduce((s, p) => s + (Number(p.uscite_30) || 0) * (Number(p.prezzo) || 0), 0);
  const piuUsato = [...conStato].sort((a, b) => (Number(b.uscite_30) || 0) - (Number(a.uscite_30) || 0))[0];

  const q = cerca.trim().toLowerCase();
  const visibili = conStato
    .filter((p) => filtro === "tutti" || (filtro === "riordino" ? ["esaurito", "basso"].includes(p.stato) : p.categoria === filtro))
    .filter((p) => !q || `${p.nome} ${p.fornitore || ""}`.toLowerCase().includes(q))
    .sort((a, b) => ["esaurito", "basso", "ok", "vuoto"].indexOf(a.stato) - ["esaurito", "basso", "ok", "vuoto"].indexOf(b.stato) || a.nome.localeCompare(b.nome));

  // ordine raggruppato per fornitore, pronto da mandare
  const perFornitore = riordino.reduce((acc, p) => { const f = (p.fornitore || "Senza fornitore").trim(); (acc[f] = acc[f] || []).push(p); return acc; }, {});
  const testoOrdine = (f, lista) => `Buongiorno${f !== "Senza fornitore" ? " " + f : ""}, vorrei ordinare per ${mag?.azienda || "noi"}:\n` + lista.map((p) => `• ${p.nome} — ${daOrdinare(p)} ${p.unita}`).join("\n") + "\nGrazie!";
  const copia = async (f, lista) => { try { await navigator.clipboard.writeText(testoOrdine(f, lista)); setCopiato(f); setTimeout(() => setCopiato(""), 1800); } catch { alert(testoOrdine(f, lista)); } };

  if (!dati) return <Vuoto>Carico il magazzino…</Vuoto>;
  if (errore) return <Card style={{ color: C.red }}>Non riesco a leggere il magazzino: {errore}</Card>;
  if (!dati.length) return <Card><Vuoto>Nessuna azienda collegata a Squadra: collega l'azienda per vedere qui prodotti e scorte.</Vuoto></Card>;

  const m = ctx.mobile;
  const numeroScuro = (v, l, rosso) => (
    <div style={{ flex: 1, minWidth: m ? "45%" : 0, padding: "4px 0" }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{l}</div>
      <div style={{ fontSize: m ? 26 : 32, fontWeight: 300, letterSpacing: -1, marginTop: 4, color: rosso ? "#ff8a8d" : "#fff", whiteSpace: "nowrap" }}>{v}</div>
    </div>
  );

  return (
    <>
      {dati.length > 1 && <Segment items={dati.map((x) => [x.azienda_id, x.azienda])} value={mag.azienda_id} onChange={setAzId} style={{ marginBottom: 14, width: "fit-content" }} />}

      {/* Situazione del magazzino */}
      <div style={{ background: C.dark, color: "#fff", borderRadius: 24, padding: m ? 18 : "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Magazzino · {mag.azienda}</div>
          <a href="https://squadrapp.it" target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "rgba(255,255,255,.75)", textDecoration: "none", border: "1px solid rgba(255,255,255,.2)", borderRadius: 999, padding: "6px 12px" }}>Carichi in Squadra ↗</a>
        </div>
        <div style={{ display: "flex", gap: m ? 10 : 0, flexWrap: m ? "wrap" : "nowrap" }}>
          {numeroScuro(euro(valore), "Valore merce")}
          {!m && <div style={{ width: 1, background: "rgba(255,255,255,.14)", margin: "0 22px" }} />}
          {numeroScuro(conStato.filter((p) => Number(p.quantita) > 0).length + " / " + conStato.length, "Prodotti presenti")}
          {!m && <div style={{ width: 1, background: "rgba(255,255,255,.14)", margin: "0 22px" }} />}
          {numeroScuro(riordino.length, "Da riordinare", riordino.length > 0)}
          {!m && <div style={{ width: 1, background: "rgba(255,255,255,.14)", margin: "0 22px" }} />}
          {numeroScuro(euro(consumo30), "Consumato in 30 gg")}
        </div>
        {piuUsato && Number(piuUsato.uscite_30) > 0 && <div style={{ marginTop: 14, fontSize: 12.5, color: "rgba(255,255,255,.7)" }}>Più usato nell'ultimo mese: <b style={{ color: "#fff" }}>{piuUsato.nome}</b> · {n1(piuUsato.uscite_30)} {piuUsato.unita}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "minmax(0,1fr) 330px", gap: 16, marginTop: 16, alignItems: "start" }}>
        {/* Elenco prodotti */}
        <Card style={{ padding: m ? 12 : 16 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <Segment items={[["tutti", "Tutti"], ["riordino", `Da riordinare${riordino.length ? " · " + riordino.length : ""}`], ["materiale", "Materiali"], ["attrezzo", "Attrezzi"]]} value={filtro} onChange={setFiltro} />
            <Field value={cerca} onChange={setCerca} placeholder="Cerca prodotto o fornitore" style={{ flex: 1, minWidth: 180 }} />
          </div>
          {!visibili.length && <Vuoto>Nessun prodotto.</Vuoto>}
          {visibili.map((p, i) => {
            const st = STATI[p.stato], min = Number(p.scorta_minima) || 0, qn = Number(p.quantita) || 0;
            const pct = min > 0 ? (qn / (min * 2)) * 100 : qn > 0 ? 100 : 0;
            return (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: m ? "46px minmax(0,1fr) auto" : "46px minmax(0,1.6fr) 120px 90px 110px", gap: 14, alignItems: "center", padding: "12px 6px", borderTop: i ? "1px solid rgba(0,0,0,.06)" : "none" }}>
                <Icona p={p} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: C.grey, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.fornitore || (p.categoria === "attrezzo" ? "Attrezzo" : "Materiale")}{p.ultimo ? ` · ultimo movimento ${giorniA(p.ultimo) === 0 ? "oggi" : -giorniA(p.ultimo) + " gg fa"}` : ""}
                  </div>
                  {m && <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}><Chip color={st.c} bg={st.bg}><Dot color={st.c} size={6} />{st.l}</Chip>{Number(p.uscite_30) > 0 && <Chip>{n1(p.uscite_30)} {p.unita} in 30 gg</Chip>}</div>}
                </div>
                {!m && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Tacche pct={pct} colore={st.c} />
                    <div style={{ fontSize: 11, color: st.c, fontWeight: 600, lineHeight: 1.2 }}>{st.l}{min > 0 && <div style={{ color: C.grey, fontWeight: 400 }}>min {n1(min)}</div>}</div>
                  </div>
                )}
                {!m && <div style={{ fontSize: 12, color: C.slate }}><div style={{ color: C.grey, fontSize: 11 }}>Uso 30 gg</div>{Number(p.uscite_30) > 0 ? `${n1(p.uscite_30)} ${p.unita}` : "—"}</div>}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: m ? 18 : 20, fontWeight: 400, letterSpacing: -0.5 }}>{n1(qn)} <span style={{ fontSize: 12, color: C.grey }}>{p.unita}</span></div>
                  <div style={{ fontSize: 11.5, color: C.grey }}>{p.prezzo ? euro(p.valore) : "senza prezzo"}</div>
                </div>
              </div>
            );
          })}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Riordino per fornitore */}
          <Card style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Da riordinare</div>
              {riordino.length > 0 && <Chip color="#fff" bg={C.red}>{riordino.length}</Chip>}
            </div>
            {!riordino.length && <Vuoto>Tutto sopra la scorta minima 👌</Vuoto>}
            {Object.entries(perFornitore).map(([f, lista]) => (
              <div key={f} style={{ marginTop: 14, background: C.soft, borderRadius: 18, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{f}</div>
                {lista.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, padding: "4px 0" }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Dot color={STATI[p.stato].c} size={6} /> {p.nome}</span>
                    <b style={{ whiteSpace: "nowrap" }}>+{daOrdinare(p)} {p.unita}</b>
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: C.grey, marginTop: 4 }}>circa {euro(lista.reduce((s, p) => s + daOrdinare(p) * (Number(p.prezzo) || 0), 0))}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <Btn small variant="dark" onClick={() => copia(f, lista)}>{copiato === f ? "Copiato ✓" : "Copia ordine"}</Btn>
                  <Btn small variant="ghost" onClick={() => window.open("https://wa.me/?text=" + encodeURIComponent(testoOrdine(f, lista)), "_blank")}>WhatsApp</Btn>
                </div>
              </div>
            ))}
          </Card>

          {/* Ultimi movimenti */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Ultimi movimenti</div>
            {!(mag.movimenti || []).length && <Vuoto>Nessun movimento.</Vuoto>}
            {(mag.movimenti || []).slice(0, 12).map((x) => {
              const col = x.tipo === "carico" ? C.green : x.tipo === "uscita" ? C.orange : C.grey;
              return (
                <div key={x.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(0,0,0,.05)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: col + "22", color: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{x.tipo === "carico" ? "↓" : x.tipo === "uscita" ? "↑" : "≈"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.articolo}</div>
                    <div style={{ fontSize: 11.5, color: C.grey, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data(x.data)}{x.cantiere ? ` · ${x.cantiere}` : ""}{x.operaio ? ` · ${x.operaio}` : ""}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: col, whiteSpace: "nowrap" }}>{x.tipo === "carico" ? "+" : x.tipo === "uscita" ? "−" : ""}{n1(x.quantita)} {x.unita}</div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </>
  );
}
