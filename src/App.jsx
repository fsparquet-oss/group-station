import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { C, Logo, Btn, Card, Field, Vuoto, settimanaScorsa, oggi, vetro, blur } from "./ui";
import { Azienda, Accessi, scadenzeVicine } from "./views";
import { Dashboard, PaginaOggi, PaginaObiettivi, PaginaOrg, PaginaScadenze } from "./dashboard";
import { PaginaVita } from "./vita";
import { PaginaBigliettini } from "./bigliettini";
import { PaginaMagazzino } from "./magazzino";
import BottomNav from "./bottomnav";
export { salva, elimina } from "./db";

const TABELLE = ["gs_aziende", "gs_kpi", "gs_kpi_valori", "gs_persone", "gs_obiettivi", "gs_scadenze", "gs_attrezzature", "gs_procedure", "gs_documenti", "gs_onboarding", "gs_accessi", "gs_controlli", "gs_controlli_valori", "gs_vita_persone", "gs_vita_abitudini", "gs_vita_valori", "gs_vita_obiettivi", "gs_vita_fisse", "gs_vita_piani", "gs_vita_letture", "gs_vita_passi", "gs_bigliettini"];
const ORDINE = { gs_aziende: "ordine", gs_kpi: "ordine", gs_persone: "ordine", gs_onboarding: "ordine", gs_controlli: "ordine", gs_vita_abitudini: "ordine", gs_vita_obiettivi: "ordine", gs_vita_fisse: "ordine" };

function useDati(attivo) {
  const [d, setD] = useState(null);
  const carica = useCallback(async () => {
    // prima ricalcola i numeri che arrivano da Squadra (se la funzione non c'è ancora, va avanti lo stesso)
    try { await supabase.rpc("gs_aggiorna_automatici"); } catch {}
    const res = await Promise.all(TABELLE.map((t) => {
      let q = supabase.from(t).select("*");
      q = ORDINE[t] ? q.order(ORDINE[t]).order("id") : q.order("id");
      if (t === "gs_vita_valori") q = supabase.from(t).select("*").gte("giorno", new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10)).order("id");
      if (t === "gs_bigliettini") q = supabase.from(t).select("*").gte("giorno", new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)).order("giorno").order("id");
      if (t === "gs_vita_persone") q = supabase.from(t).select("*");
      if (t === "gs_controlli_valori") q = supabase.from(t).select("*").gte("giorno", new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10));
      if (t === "gs_kpi_valori") q = supabase.from(t).select("*").gte("settimana", new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10)).order("settimana");
      return q;
    }));
    const out = {};
    TABELLE.forEach((t, i) => { out[t.replace("gs_", "")] = res[i].data || []; });
    // le abitudini dell'ultimo anno possono superare le 1000 righe che Supabase manda in una volta
    for (let da = 1000; out.vita_valori.length === da; da += 1000) {
      const { data: altro } = await supabase.from("gs_vita_valori").select("*").gte("giorno", new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10)).order("id").range(da, da + 999);
      if (!altro?.length) break; out.vita_valori = out.vita_valori.concat(altro);
    }
    out.errore = res.find((r) => r.error)?.error?.message || "";
    setD(out);
  }, []);
  useEffect(() => { if (attivo) carica(); }, [attivo, carica]);
  return [d, carica];
}

function Login() {
  const [email, setEmail] = useState("");
  const [inviato, setInviato] = useState(false);
  const [lavoro, setLavoro] = useState(false);
  const google = async () => { setLavoro(true); await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } }); };
  const link = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) return alert("Scrivi un'email valida");
    setLavoro(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin, shouldCreateUser: true } });
    setLavoro(false);
    if (error) return alert(error.message);
    setInviato(true);
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Card style={{ width: "100%", maxWidth: 380, padding: 32, textAlign: "center" }}>
        <Logo size={56} />
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, marginTop: 12 }}>GROUP STATION</div>
        <div style={{ fontSize: 13.5, color: C.grey, margin: "6px 0 24px" }}>Tutte le aziende del gruppo in un posto solo</div>
        <Btn onClick={google} disabled={lavoro} style={{ width: "100%", padding: "13px 18px" }}>Accedi con Google</Btn>
        <div style={{ fontSize: 12, color: C.grey, margin: "18px 0 10px" }}>oppure ricevi un link via email</div>
        {inviato ? <div style={{ fontSize: 13.5, color: C.green }}>Ti abbiamo mandato un link a <b>{email}</b>: aprilo da questo dispositivo.</div> : <>
          <Field value={email} onChange={setEmail} placeholder="nome@azienda.it" type="email" />
          <Btn variant="soft" onClick={link} disabled={lavoro} style={{ width: "100%", marginTop: 10 }}>Mandami il link</Btn>
        </>}
      </Card>
    </div>
  );
}

export default function App() {
  const [sessione, setSessione] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessione(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessione(s));
    return () => data.subscription.unsubscribe();
  }, []);
  const [d, ricarica] = useDati(!!sessione);
  const [vista, setVista] = useState(() => { try { return JSON.parse(localStorage.getItem("gs_vista")) || { tipo: "home" }; } catch { return { tipo: "home" }; } });
  const vai = (v) => { setVista(v); try { localStorage.setItem("gs_vista", JSON.stringify(v)); } catch {} window.scrollTo(0, 0); };
  const mobile = useMobile();
  const [menu, setMenu] = useState(false);
  const [sett, setSett] = useState(settimanaScorsa());
  const [giorno, setGiorno] = useState(oggi());

  const email = sessione?.user?.email?.toLowerCase() || "";
  const mieiAccessi = useMemo(() => (d?.accessi || []).filter((a) => a.email.toLowerCase() === email), [d, email]);
  const admin = mieiAccessi.some((a) => a.ruolo === "admin" && !a.azienda_id);
  const puoScrivere = useCallback((aziendaId) => admin || mieiAccessi.some((a) => a.azienda_id === aziendaId && a.ruolo === "responsabile"), [admin, mieiAccessi]);

  if (sessione === undefined) return null;
  if (!sessione) return <Login />;
  if (!d) return <div style={{ padding: 40, color: C.grey, textAlign: "center" }}>Carico…</div>;

  const esci = () => supabase.auth.signOut();
  if (!admin && !mieiAccessi.length) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Card style={{ maxWidth: 420, textAlign: "center", padding: 32 }}>
        <Logo size={40} />
        <div style={{ fontSize: 18, fontWeight: 700, margin: "10px 0 6px" }}>Non hai ancora accesso</div>
        <div style={{ fontSize: 13.5, color: C.slate, lineHeight: 1.5 }}>Sei entrato come <b>{email}</b>. Chiedi a Fabio di inserirti nell'organigramma con questa email.</div>
        <Btn variant="ghost" onClick={esci} style={{ marginTop: 18 }}>Esci</Btn>
      </Card>
    </div>
  );

  const aziende = d.aziende;
  const visibili = aziende.filter((a) => admin || mieiAccessi.some((x) => x.azienda_id === a.id));
  const azienda = vista.tipo === "azienda" ? aziende.find((a) => a.id === vista.id) : null;
  const ctx = { d, ricarica, admin, puoScrivere, email, vai, mobile, sett, setSett, giorno, setGiorno, vista };
  const nome = (sessione.user.user_metadata?.full_name || sessione.user.user_metadata?.name || email.split("@")[0]).split(" ")[0];
  const nomeBello = nome.charAt(0).toUpperCase() + nome.slice(1);
  const scadVicine = scadenzeVicine(d);
  const haVita = (d.vita_persone || []).some((x) => x.email.toLowerCase() === email);
  const icone = {
    home: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
    oggi: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    obiettivi: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
    organigramma: <><rect x="9" y="3" width="6" height="5" rx="1.5" /><rect x="3" y="16" width="6" height="5" rx="1.5" /><rect x="15" y="16" width="6" height="5" rx="1.5" /><path d="M12 8v4M6 16v-4h12v4" /></>,
    bigliettini: <><path d="M5 4h14v11l-5 5H5z" /><path d="M14 20v-5h5M8 9h8M8 12.5h5" /></>,
    magazzino: <><path d="M3 9l9-5 9 5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z" /><path d="M7 20.5V13h10v7.5M7 16.5h10" /></>,
    scadenze: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    vita: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
    accessi: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c1.7.6 2.8 2.4 3 5.5" /></>,
  };
  const Icona = ({ k, size = 17 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icone[k]}</svg>;
  const voci = [["home", "Dashboard"], ["bigliettini", "Bigliettini del giorno"], ["oggi", "Controlli di oggi"], ["obiettivi", "Obiettivi"], ["organigramma", "Organigramma"], ["magazzino", "Magazzino"], ["scadenze", "Scadenze"]];
  const vocePill = (attiva, onClick, contenuto, k) => (
    <button key={k} onClick={() => { onClick(); setMenu(false); }} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", border: "none", borderRadius: 12, padding: "9px 12px", fontSize: 13.5, fontWeight: attiva ? 600 : 450, textAlign: "left", background: attiva ? C.text : "transparent", color: attiva ? "#fff" : C.text }}>{contenuto}</button>
  );
  const titoloSez = (t) => <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, color: C.grey, textTransform: "uppercase", margin: "22px 12px 8px" }}>{t}</div>;
  const barra = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <button onClick={() => vai({ tipo: "home" })} style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "none", padding: "4px 12px 22px" }}>
        <Logo size={30} /><span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, color: C.text }}>Group Station</span>
      </button>
      {voci.map(([k, l]) => vocePill(vista.tipo === k || (k === "home" && vista.tipo === "home"), () => vai({ tipo: k }), <><Icona k={k} />{l}</>, k))}
      {titoloSez("Aziende")}
      {visibili.map((a) => vocePill(azienda?.id === a.id, () => vai({ tipo: "azienda", id: a.id, tab: "oggi" }), <><span style={{ width: 9, height: 9, borderRadius: "50%", background: a.stato === "in pausa" ? C.line : a.colore, marginLeft: 4, marginRight: 4 }} /><span style={{ color: azienda?.id === a.id ? "#fff" : a.stato === "in pausa" ? C.grey : C.text }}>{a.nome}</span></>, "a" + a.id))}
      {haVita && <>{titoloSez("Personale")}{vocePill(vista.tipo === "vita", () => vai({ tipo: "vita" }), <><Icona k="vita" />La mia vita</>, "vita")}</>}
      {admin && <>{titoloSez("Gestione")}{vocePill(vista.tipo === "accessi", () => vai({ tipo: "accessi" }), <><Icona k="accessi" />Accessi</>, "acc")}</>}
      <div style={{ flex: 1, minHeight: 20 }} />
      <button onClick={esci} style={{ display: "flex", alignItems: "center", gap: 11, border: "none", background: "none", padding: "9px 12px", fontSize: 13.5, color: C.slate }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></svg>Esci
      </button>
    </div>
  );
  const navVoci = [["home", "Dashboard"], ["bigliettini", "Bigliettini"], ["oggi", "Oggi"], ["organigramma", "Organigramma"]];
  const navAttiva = navVoci.findIndex(([k]) => vista.tipo === k);
  const bottomNav = mobile && (
    <BottomNav
      voci={[...navVoci.map(([k, l]) => ({ k, label: l, icon: <Icona k={k} size={21} /> })), { k: "altro", label: "Altro", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg> }]}
      attiva={navAttiva < 0 || menu ? navVoci.length : navAttiva}
      onSelect={(j) => (j < navVoci.length ? (setMenu(false), vai({ tipo: navVoci[j][0] })) : setMenu(true))}
      colori={{ barra: "rgba(250,247,243,.94)", pallino: C.text, iconaAttiva: "#fff", icona: C.grey, etichettaAttiva: C.text, ombra: "0 -6px 20px rgba(80,55,30,.08)" }}
    />
  );
  const tondo = { width: 42, height: 42, borderRadius: "50%", border: "none", background: C.card, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: C.text, flexShrink: 0 };

  return (
    <div style={{ minHeight: "100vh", padding: mobile ? 0 : 24 }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", gap: 22, ...(mobile ? {} : { ...vetro, borderRadius: 34, padding: 22, minHeight: "calc(100vh - 48px)" }) }}>
        {!mobile && <aside style={{ width: 228, flexShrink: 0, background: C.card, borderRadius: 26, padding: "22px 12px", position: "sticky", top: 46, alignSelf: "flex-start", height: "calc(100vh - 92px)", overflowY: "auto" }}>{barra}</aside>}
        {mobile && menu && <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", zIndex: 60 }}><div onClick={(e) => e.stopPropagation()} style={{ width: 270, height: "100%", background: "rgba(250,247,243,.88)", ...blur(28), borderRadius: "0 28px 28px 0", padding: "22px 12px", overflowY: "auto" }}>{barra}</div></div>}
        <main style={{ flex: 1, minWidth: 0, padding: mobile ? "14px 14px calc(120px + env(safe-area-inset-bottom))" : "6px 4px 60px" }}>
          <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={{ fontSize: mobile ? 22 : 28, fontWeight: 650, letterSpacing: -0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{azienda ? azienda.nome : vista.tipo === "vita" ? "La mia vita" : vista.tipo === "bigliettini" ? "Bigliettini del giorno" : vista.tipo === "magazzino" ? "Magazzino" : `Ciao ${nomeBello}!`}</div>
            <div style={{ flex: 1 }} />
            {admin && !mobile && <button onClick={() => vai({ tipo: "obiettivi", nuovo: Date.now() })} style={{ border: "none", borderRadius: 999, background: C.text, color: "#fff", fontSize: 13.5, fontWeight: 500, padding: "11px 18px", display: "flex", alignItems: "center", gap: 7 }}>+ Nuovo obiettivo</button>}
            <button title="Scadenze vicine" onClick={() => vai({ tipo: "scadenze" })} style={tondo}><Icona k="scadenze" size={18} />{scadVicine > 0 && <span style={{ position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: "50%", background: C.red, border: "2px solid #fff" }} />}</button>
            <div title={email} style={{ ...tondo, background: C.text, color: "#fff", fontWeight: 600, fontSize: 15 }}>{nomeBello[0]}</div>
          </header>
          {d.errore && <Card style={{ color: C.red, marginBottom: 14 }}>Errore nel caricamento: {d.errore}</Card>}
          {vista.tipo === "accessi" && admin ? <Accessi ctx={ctx} />
            : azienda ? <Azienda ctx={ctx} azienda={azienda} tab={vista.tab || "oggi"} setTab={(t) => vai({ ...vista, tab: t })} />
            : vista.tipo === "azienda" ? <Vuoto>Azienda non trovata.</Vuoto>
            : vista.tipo === "oggi" ? <PaginaOggi ctx={ctx} />
            : vista.tipo === "obiettivi" ? <PaginaObiettivi ctx={ctx} />
            : vista.tipo === "organigramma" ? <PaginaOrg ctx={ctx} />
            : vista.tipo === "scadenze" ? <PaginaScadenze ctx={ctx} />
            : vista.tipo === "bigliettini" ? <PaginaBigliettini ctx={ctx} />
            : vista.tipo === "magazzino" ? <PaginaMagazzino ctx={ctx} />
            : vista.tipo === "vita" && haVita ? <PaginaVita ctx={ctx} />
            : <Dashboard ctx={ctx} />}
        </main>
      </div>
      {bottomNav}
    </div>
  );
}

function useMobile() {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth < 860);
  useEffect(() => { const f = () => setM(window.innerWidth < 860); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return m;
}
