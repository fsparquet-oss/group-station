import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { C, Logo, Btn, Card, Field, Vuoto, settimanaScorsa, oggi } from "./ui";
import { Home, Azienda, Accessi } from "./views";
export { salva, elimina } from "./db";

const TABELLE = ["gs_aziende", "gs_kpi", "gs_kpi_valori", "gs_persone", "gs_obiettivi", "gs_scadenze", "gs_attrezzature", "gs_procedure", "gs_documenti", "gs_onboarding", "gs_accessi", "gs_controlli", "gs_controlli_valori"];
const ORDINE = { gs_aziende: "ordine", gs_kpi: "ordine", gs_persone: "ordine", gs_onboarding: "ordine", gs_controlli: "ordine" };

function useDati(attivo) {
  const [d, setD] = useState(null);
  const carica = useCallback(async () => {
    const res = await Promise.all(TABELLE.map((t) => {
      let q = supabase.from(t).select("*");
      q = ORDINE[t] ? q.order(ORDINE[t]).order("id") : q.order("id");
      if (t === "gs_controlli_valori") q = supabase.from(t).select("*").gte("giorno", new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10));
      if (t === "gs_kpi_valori") q = supabase.from(t).select("*").gte("settimana", new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10)).order("settimana");
      return q;
    }));
    const out = {};
    TABELLE.forEach((t, i) => { out[t.replace("gs_", "")] = res[i].data || []; });
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
  const ctx = { d, ricarica, admin, puoScrivere, email, vai, mobile, sett, setSett, giorno, setGiorno };
  const pill = { border: "none", borderRadius: 999, background: C.card, color: C.text, fontSize: 14, fontWeight: 500, padding: "9px 16px", whiteSpace: "nowrap" };

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: mobile ? "14px 14px 110px" : "22px 32px 120px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={() => vai({ tipo: "home" })} style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "none", padding: 0 }}>
          <Logo size={mobile ? 28 : 32} />
          <span style={{ fontSize: mobile ? 14 : 17, fontWeight: 700, letterSpacing: mobile ? 1.8 : 2.6, color: C.text, whiteSpace: "nowrap" }}>GROUP STATION</span>
        </button>
        <div style={{ flex: 1 }} />
        {admin && <button onClick={() => vai({ tipo: "accessi" })} style={{ ...pill, background: vista.tipo === "accessi" ? C.text : C.card, color: vista.tipo === "accessi" ? "#fff" : C.text }}>Accessi</button>}
        <button onClick={esci} title={email} style={pill}>Esci</button>
      </header>
      <nav style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 22, scrollbarWidth: "none" }}>
        {visibili.map((a) => {
          const sel = azienda?.id === a.id, pausa = a.stato === "in pausa";
          return (
            <button key={a.id} onClick={() => vai({ tipo: "azienda", id: a.id, tab: "oggi" })} style={{ ...pill, display: "flex", alignItems: "center", gap: 9, background: sel ? C.text : C.card, color: sel ? "#fff" : pausa ? C.grey : C.text }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: pausa ? C.line : a.colore, flexShrink: 0 }} />{a.nome}
            </button>
          );
        })}
      </nav>
      {d.errore && <Card style={{ color: C.red, marginBottom: 14 }}>Errore nel caricamento: {d.errore}</Card>}
      {vista.tipo === "accessi" && admin ? <Accessi ctx={ctx} />
        : azienda ? <Azienda ctx={ctx} azienda={azienda} tab={vista.tab || "oggi"} setTab={(t) => vai({ ...vista, tab: t })} />
        : vista.tipo === "azienda" ? <Vuoto>Azienda non trovata.</Vuoto>
        : <Home ctx={ctx} />}
    </div>
  );
}

function useMobile() {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth < 860);
  useEffect(() => { const f = () => setM(window.innerWidth < 860); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return m;
}
