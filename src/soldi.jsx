import React, { useState } from "react";
import { salva, elimina } from "./db";
import { C, Btn, Card, Field, Modal, Vuoto, Label, Anello, vetro, euro, data, giorniA, oggi } from "./ui";

// ─────────────────────────────────────────── CALCOLI
const AL_MESE = { settimana: 52 / 12, mese: 1, bimestre: 1 / 2, trimestre: 1 / 3, semestre: 1 / 6, anno: 1 / 12 };
const NOME_FREQ = { settimana: "a settimana", mese: "al mese", bimestre: "ogni 2 mesi", trimestre: "ogni 3 mesi", semestre: "ogni 6 mesi", anno: "all'anno" };
export const mensile = (f) => Number(f.importo || 0) * (AL_MESE[f.frequenza] || 1);
const mesiA = (data) => Math.max(0, (new Date(data + "T12:00:00") - new Date()) / (30.44 * 86400000));

// Per ogni busta: quanto manca e quanto mettere al mese
function pianoBuste(buste) {
  return buste.filter((o) => o.valore_obiettivo).map((o) => {
    const manca = Math.max(0, Number(o.valore_obiettivo) - Number(o.valore_attuale || 0));
    const mesi = o.scadenza ? mesiA(o.scadenza) : null;
    const alMese = manca > 0 && mesi != null ? manca / Math.max(1, mesi) : 0;
    return { o, manca, mesi, alMese, scaduta: o.scadenza && giorniA(o.scadenza) < 0 && manca > 0 };
  });
}

// ─────────────────────────────────────────── A CHE PUNTO SEI
export function AnalisiSoldi({ ctx, buste }) {
  const fisse = ctx.d.vita_fisse.filter((f) => f.attivo !== false);
  const entrate = fisse.filter((f) => f.tipo === "entrata").reduce((s, f) => s + mensile(f), 0);
  const uscite = fisse.filter((f) => f.tipo === "uscita").reduce((s, f) => s + mensile(f), 0);
  const libero = entrate - uscite;
  const piano = pianoBuste(buste);
  const serve = piano.reduce((s, p) => s + p.alMese, 0);
  const messo = buste.reduce((s, o) => s + Number(o.valore_attuale || 0), 0);
  const traguardo = buste.reduce((s, o) => s + Number(o.valore_obiettivo || 0), 0);
  const senzaCifra = buste.filter((o) => !o.valore_obiettivo);
  const fondo = buste.find((o) => /emergenza/i.test(o.titolo));

  // Cosa conviene fare: frasi calcolate sui tuoi numeri
  const consigli = [];
  if (!entrate) consigli.push("Inserisci le tue entrate fisse (stipendio, prelievo dalla società…) in Spese fisse: così ti dico quanto ti resta ogni mese per le buste.");
  if (senzaCifra.length) consigli.push(`${senzaCifra.length === 1 ? "La busta" : "Le buste"} ${senzaCifra.map((o) => `"${o.titolo}"`).join(", ")} non ${senzaCifra.length === 1 ? "ha" : "hanno"} ancora un traguardo: senza cifra non posso dirti quanto mettere al mese.`);
  if (entrate && serve > libero) {
    const diff = serve - libero;
    const piuPesante = [...piano].sort((a, b) => b.alMese - a.alMese)[0];
    consigli.push(`Per rispettare tutte le date servono ${euro(serve)} al mese, ma ti restano ${euro(libero)}: mancano ${euro(diff)} al mese.`);
    if (piuPesante) consigli.push(`La busta che pesa di più è "${piuPesante.o.titolo}" (${euro(piuPesante.alMese)} al mese). Spostando la data più avanti, o mettendola dopo le altre, il piano torna in pari.`);
    if (uscite) consigli.push(`Prova a guardare le spese fisse: ogni 50 € al mese tolti sono 600 € all'anno in più nelle buste.`);
  } else if (entrate && serve <= libero) {
    consigli.push(`Sei in pari: per tutte le buste servono ${euro(serve)} al mese e te ne restano ${euro(libero)}. Ti avanzano ${euro(libero - serve)} al mese per un nuovo obiettivo o per il fondo di emergenza.`);
  }
  if (uscite && !fondo) consigli.push(`Un fondo di emergenza di solito copre 3–6 mesi di spese fisse: per te tra ${euro(uscite * 3)} e ${euro(uscite * 6)}. Puoi crearlo come busta e riempirlo prima di investire.`);
  piano.filter((p) => p.scaduta).forEach((p) => consigli.push(`"${p.o.titolo}" ha superato la data e mancano ancora ${euro(p.manca)}: scegli una data nuova.`));

  const riga = (l, v, forte) => <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0", borderTop: `1px solid ${C.soft}` }}><span style={{ color: C.slate }}>{l}</span><b style={{ fontWeight: forte ? 650 : 500, color: v < 0 ? C.red : C.text }}>{euro(v)}</b></div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "1fr 1.3fr", gap: 16 }}>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Il tuo mese</div>
        {riga("Entrate fisse", entrate)}
        {riga("Spese fisse", -uscite)}
        {riga("Ti resta", libero, true)}
        {riga("Servono per le buste", -serve)}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <Anello pct={traguardo ? (messo / traguardo) * 100 : 0} size={54} spessore={4} colore={C.text} fondo={C.line} testo={traguardo ? `${Math.round((messo / traguardo) * 100)}%` : "—"} />
          <div style={{ fontSize: 13, color: C.slate, lineHeight: 1.45 }}>Hai messo da parte <b style={{ color: C.text }}>{euro(messo)}</b>{traguardo ? <> su {euro(traguardo)} di traguardi</> : null}.</div>
        </div>
      </Card>
      <div style={{ background: C.dark, color: "#fff", borderRadius: 24, padding: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>A che punto sei e cosa fare</div>
        {consigli.length === 0 ? <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)" }}>Inserisci entrate, spese fisse e i traguardi delle buste per avere i consigli.</div> :
          consigli.slice(0, 5).map((t, i) => <div key={i} style={{ display: "flex", gap: 10, fontSize: 13.5, lineHeight: 1.5, padding: "6px 0", color: "rgba(255,255,255,.88)" }}><span style={{ color: "#fff", fontWeight: 600 }}>{String(i + 1).padStart(2, "0")}</span><span>{t}</span></div>)}
        {piano.length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10 }}>
            {piano.filter((p) => p.manca > 0).sort((a, b) => (a.o.scadenza || "9").localeCompare(b.o.scadenza || "9")).map((p) => (
              <div key={p.o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0", color: "rgba(255,255,255,.7)" }}><span>{p.o.titolo}</span><span style={{ color: "#fff" }}>{p.o.scadenza ? `${euro(p.alMese)} al mese` : `mancano ${euro(p.manca)}`}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── BACHECA DEL GIORNO
// Spunti generali su risparmio e investimenti, uno diverso ogni giorno. Non sono consigli personalizzati.
const SPUNTI = [
  ["Prima il fondo di emergenza", "Prima di investire, tieni da parte 3–6 mesi di spese fisse su un conto facile da usare. Ti evita di vendere investimenti o fare debiti quando arriva un imprevisto."],
  ["Prima i debiti più cari", "Se hai debiti, rimborsare prima quelli con l'interesse più alto (carte, prestiti al consumo) rende quasi sempre più di qualsiasi investimento."],
  ["Paga prima te stesso", "Appena arriva un'entrata, sposta subito la quota per le buste su un conto separato. Quello che resta è ciò che puoi spendere."],
  ["Conto deposito", "Strumento semplice per soldi che ti servono tra 6 mesi e 2–3 anni: tasso fisso noto in anticipo. Confronta i tassi netti e i vincoli prima di scegliere."],
  ["Titoli di Stato", "I BTP e gli altri titoli di Stato pagano interessi fissi o indicizzati. Il prezzo può scendere se li vendi prima della scadenza: adatti a soldi che puoi lasciare fermi fino alla fine."],
  ["ETF", "Un ETF è un fondo quotato che replica un indice (es. tutte le azioni del mondo). Costi bassi e diversificazione, ma il valore sale e scende: adatto a orizzonti lunghi, 5–10 anni o più."],
  ["Piano di accumulo (PAC)", "Investire una cifra fissa ogni mese riduce il rischio di entrare tutto nel momento sbagliato e crea l'abitudine. Funziona solo se lo mantieni anche quando i mercati scendono."],
  ["Interesse composto", "I guadagni che restano investiti producono altri guadagni. Il fattore più importante è il tempo: iniziare prima con poco spesso batte iniziare tardi con tanto."],
  ["Orizzonte = strumento", "Soldi per la macchina tra un anno e soldi per la pensione tra 25 anni non vanno messi nello stesso posto. Più è vicina la data, meno rischio puoi permetterti."],
  ["I costi contano", "Una commissione dell'1–2% all'anno sembra poco, ma in 20 anni può mangiarsi una grossa parte del guadagno. Chiedi sempre il costo totale annuo (TER e commissioni)."],
  ["Diversificare", "Non mettere tutto su una sola azione, un solo settore o un solo immobile. Dividere riduce il rischio che un singolo problema ti blocchi."],
  ["Diffida dei rendimenti sicuri e alti", "Nessun investimento serio promette guadagni alti e garantiti. Se qualcuno lo fa, soprattutto su crypto, forex o 'opportunità' via WhatsApp, è quasi sempre una truffa."],
  ["Previdenza complementare", "Un fondo pensione può avere vantaggi fiscali (deducibilità dei versamenti fino a un limite). Valuta i costi del fondo e parlane con il commercialista."],
  ["Comprare casa: l'anticipo", "Le banche di solito finanziano fino all'80% del valore: serve un anticipo di almeno il 20% più notaio, imposte, agenzia e ristrutturazione. Metti tutto nella busta casa."],
  ["Mutuo: la rata giusta", "Una regola prudente è tenere la rata del mutuo sotto circa un terzo delle entrate nette. Confronta TAEG, non solo il tasso, e fisso contro variabile."],
  ["Agevolazioni prima casa", "Sulla prima casa ci sono imposte ridotte e a volte garanzie pubbliche per i giovani (es. Fondo Garanzia Prima Casa). Le regole cambiano: verifica quelle in vigore con il notaio."],
  ["Separa azienda e famiglia", "Tieni distinti i conti della società e quelli personali. Decidi un prelievo fisso al mese dalla società: rende le tue buste prevedibili."],
  ["Le spese annuali", "Assicurazioni, bollo, manutenzioni: dividi ogni spesa annuale per 12 e metti quella cifra da parte ogni mese. Così non ti sorprendono."],
  ["La regola delle 48 ore", "Per un acquisto non previsto sopra una certa cifra (es. 200 €), aspetta 48 ore. Molte voglie passano da sole."],
  ["Abbonamenti", "Una volta al mese controlla gli addebiti: abbonamenti dimenticati e servizi doppi sono soldi che escono senza che te ne accorgi."],
  ["Aumenta con le entrate", "Quando le entrate salgono, aumenta subito la quota per le buste invece del tenore di vita. Anche metà dell'aumento fa una grande differenza."],
  ["Viaggi: prenota presto", "Voli e alloggi per Giappone o Azzorre costano di solito meno se prenotati mesi prima. Fissa la data e riempi la busta prima della prenotazione."],
  ["Investire in sé stessi", "Corsi, libri, il diploma: spesso è l'investimento con il ritorno più alto, perché aumenta quello che puoi guadagnare per tutta la vita."],
  ["Immobili da mettere a reddito", "Un immobile in affitto rende con continuità ma ha costi (manutenzione, tasse, periodi sfitti) ed è difficile da vendere in fretta. Calcola il rendimento al netto di tutto."],
  ["Oro e beni rifugio", "L'oro non paga interessi ma spesso tiene il valore nelle crisi. Di solito si usa come piccola parte, non come investimento principale."],
  ["Rischio e sonno", "Investi solo una cifra che non ti fa perdere il sonno se per un anno vale il 20–30% in meno. Se ti spaventa, è troppo per te."],
  ["Un consulente indipendente", "Un consulente finanziario indipendente si fa pagare da te, non dalle banche sui prodotti venduti: ha meno conflitti di interesse. Chiedi sempre come viene pagato."],
  ["Le tasse sui guadagni", "In Italia i guadagni finanziari sono tassati di solito al 26%, i titoli di Stato al 12,5%. Conta sempre il rendimento netto."],
  ["Obiettivi scritti", "Un obiettivo con cifra e data scritte (come le tue buste) ha molte più probabilità di essere raggiunto di un 'vorrei risparmiare'."],
  ["Revisione mensile", "Una volta al mese, 20 minuti: aggiorna le buste, controlla le spese fisse, sposta le date se serve. È lì che il piano diventa reale."],
];

export function BachecaSpunti() {
  const giorno = Math.floor(new Date(oggi() + "T12:00:00").getTime() / 86400000);
  const [scarto, setScarto] = useState(0);
  const i = ((giorno + scarto) % SPUNTI.length + SPUNTI.length) % SPUNTI.length;
  const [titolo, testo] = SPUNTI[i];
  const [t2, x2] = SPUNTI[(i + 1) % SPUNTI.length];
  return (
    <div style={{ ...vetro, borderRadius: 24, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Spunti di oggi</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setScarto((x) => x - 1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: C.card }}>‹</button>
          <button onClick={() => setScarto((x) => x + 1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: C.card }}>›</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        {[[titolo, testo, true], [t2, x2, false]].map(([t, x, scuro]) => (
          <div key={t} style={{ background: scuro ? C.dark : C.card, color: scuro ? "#fff" : C.text, borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.3 }}>{t}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 8, color: scuro ? "rgba(255,255,255,.78)" : C.slate }}>{x}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.grey, marginTop: 10 }}>Spunti generali per orientarti, non consigli personalizzati: prima di investire parlane con un consulente finanziario indipendente o con il commercialista.</div>
    </div>
  );
}

// ─────────────────────────────────────────── SPESE FISSE
export function SpeseFisse({ ctx }) {
  const fisse = ctx.d.vita_fisse;
  const [mod, setMod] = useState(null);
  const uscite = fisse.filter((f) => f.tipo === "uscita"), entrate = fisse.filter((f) => f.tipo === "entrata");
  const totU = uscite.filter((f) => f.attivo !== false).reduce((s, f) => s + mensile(f), 0);
  const totE = entrate.filter((f) => f.attivo !== false).reduce((s, f) => s + mensile(f), 0);
  const categorie = [...new Set(uscite.map((f) => f.categoria || "Altro"))];
  const Riga = ({ f }) => (
    <div onClick={() => setMod(f)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.soft}`, cursor: "pointer", opacity: f.attivo === false ? 0.45 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{f.nome}</div>
        <div style={{ fontSize: 11.5, color: C.grey }}>{euro(f.importo)} {NOME_FREQ[f.frequenza]}{f.giorno ? ` · il ${f.giorno}` : ""}</div>
      </div>
      <b style={{ fontSize: 14, fontWeight: 600 }}>{euro(mensile(f))}<span style={{ fontSize: 11, color: C.grey, fontWeight: 400 }}>/mese</span></b>
    </div>
  );
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: ctx.mobile ? "1fr" : "1.6fr 1fr", gap: 16, alignItems: "start" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 16, fontWeight: 600 }}>Spese fisse</div><div style={{ fontSize: 12.5, color: C.grey }}>{euro(totU)} al mese · {euro(totU * 12)} all'anno</div></div>
            <Btn small onClick={() => setMod({ tipo: "uscita", frequenza: "mese", categoria: "Casa" })}>+ Spesa</Btn>
          </div>
          {uscite.length === 0 && <Vuoto>Aggiungi affitto o mutuo, bollette, assicurazioni, telefono, abbonamenti, bollo, scuola…</Vuoto>}
          {categorie.map((c) => (
            <div key={c} style={{ marginTop: 12 }}>
              <Label>{c} · {euro(uscite.filter((f) => (f.categoria || "Altro") === c && f.attivo !== false).reduce((s, f) => s + mensile(f), 0))}/mese</Label>
              {uscite.filter((f) => (f.categoria || "Altro") === c).map((f) => <Riga key={f.id} f={f} />)}
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 16, fontWeight: 600 }}>Entrate fisse</div><div style={{ fontSize: 12.5, color: C.grey }}>{euro(totE)} al mese</div></div>
            <Btn small variant="ghost" onClick={() => setMod({ tipo: "entrata", frequenza: "mese", categoria: "Lavoro" })}>+ Entrata</Btn>
          </div>
          {entrate.length === 0 && <Vuoto>Es. prelievo mensile dalla società, stipendio, affitti incassati.</Vuoto>}
          {entrate.map((f) => <Riga key={f.id} f={f} />)}
        </Card>
      </div>
      {mod && <ModificaFissa ctx={ctx} f={mod} onClose={() => setMod(null)} />}
    </>
  );
}

const CATEGORIE = ["Casa", "Bollette", "Auto", "Assicurazioni", "Telefono e internet", "Abbonamenti", "Famiglia", "Chiesa e offerte", "Salute e sport", "Finanziamenti", "Tasse", "Altro"];

function ModificaFissa({ ctx, f: iniziale, onClose }) {
  const [f, setF] = useState(iniziale);
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const ok = async () => {
    const imp = Number(String(f.importo ?? "").replace(/\./g, "").replace(",", "."));
    if (!f.nome || isNaN(imp)) return alert("Scrivi nome e importo");
    await salva("gs_vita_fisse", { id: f.id, tipo: f.tipo, nome: f.nome, categoria: f.categoria || null, importo: imp, frequenza: f.frequenza, giorno: f.giorno ? Number(f.giorno) : null, attivo: f.attivo !== false, note: f.note || null, ordine: f.ordine ?? ctx.d.vita_fisse.length + 1 });
    await ctx.ricarica(); onClose();
  };
  const del = async () => { if (!confirm("Eliminare?")) return; await elimina("gs_vita_fisse", f.id); await ctx.ricarica(); onClose(); };
  return (
    <Modal title={f.id ? f.nome : f.tipo === "entrata" ? "Nuova entrata fissa" : "Nuova spesa fissa"} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Nome" value={f.nome} onChange={s("nome")} placeholder={f.tipo === "entrata" ? "Es. Prelievo dalla società" : "Es. Mutuo, luce, assicurazione auto"} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Importo €" type="number" value={f.importo} onChange={s("importo")} />
          <Field label="Ogni quanto" value={f.frequenza} onChange={s("frequenza")} options={Object.entries(NOME_FREQ).map(([v, l]) => ({ value: v, label: l }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {f.tipo === "uscita" ? <Field label="Categoria" value={f.categoria} onChange={s("categoria")} options={CATEGORIE.map((c) => ({ value: c, label: c }))} /> : <Field label="Categoria" value={f.categoria} onChange={s("categoria")} />}
          <Field label="Giorno del mese (facoltativo)" type="number" value={f.giorno} onChange={s("giorno")} />
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.attivo !== false} onChange={(e) => s("attivo")(e.target.checked)} style={{ accentColor: C.text }} />Attiva (togli la spunta per una spesa sospesa)</label>
        <Field label="Note" area={2} value={f.note} onChange={s("note")} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>{f.id ? <Btn variant="link" onClick={del}>Elimina</Btn> : <span />}<div style={{ display: "flex", gap: 8 }}><Btn variant="soft" onClick={onClose}>Annulla</Btn><Btn onClick={ok}>Salva</Btn></div></div>
      </div>
    </Modal>
  );
}
