import React, { useEffect } from "react";

// Grafica 22 nov. 2026 (esempio scelto da Fabio): bianco e nero, schede di vetro, barra laterale. Rosso solo per gli avvisi.
export const C = {
  bg: "#e7e7e5", card: "#ffffff", glass: "rgba(255,255,255,.62)", text: "#151515", slate: "#3b3b3b", red: "#8c0b0f",
  grey: "#8f8f8d", line: "#dcdcd9", soft: "#f0f0ee", green: "#2f7d4f", amber: "#9a6a12", dark: "#1d1d1d",
};
export const vetro = { background: C.glass, backdropFilter: "blur(18px) saturate(1.2)", WebkitBackdropFilter: "blur(18px) saturate(1.2)", border: "1px solid rgba(255,255,255,.7)" };

// Anello di avanzamento (es. 3/5)
export function Anello({ pct = 0, size = 34, spessore = 3, colore = "#fff", fondo = "rgba(255,255,255,.25)", testo }) {
  const r = (size - spessore) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={fondo} strokeWidth={spessore} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colore} strokeWidth={spessore} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} strokeLinecap="round" /></svg>
      {testo != null && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size > 60 ? 15 : 8.5, fontWeight: 600, color: colore }}>{testo}</div>}
    </div>
  );
}

// Grafico a linee morbide (andamento della settimana)
export function Linee({ serie, etichette, evidenzia, altezza = 120 }) {
  const W = 300, H = altezza, n = etichette.length;
  const x = (i) => 10 + (i * (W - 20)) / Math.max(1, n - 1);
  const y = (v) => H - 8 - (Math.max(0, Math.min(100, v || 0)) / 100) * (H - 22);
  const curva = (vals) => vals.map((v, i) => { if (i === 0) return `M${x(0)},${y(v)}`; const x0 = x(i - 1), x1 = x(i), m = (x0 + x1) / 2; return `C${m},${y(vals[i - 1])} ${m},${y(v)} ${x1},${y(v)}`; }).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: altezza, overflow: "visible" }}>
        {serie.map((s, k) => <path key={k} d={curva(s.valori)} fill="none" stroke={s.colore} strokeWidth={k === 0 ? 2.2 : 1.6} strokeLinecap="round" />)}
        {evidenzia != null && <><line x1={x(evidenzia)} x2={x(evidenzia)} y1={y(serie[0].valori[evidenzia])} y2={H} stroke={C.text} strokeWidth="1" strokeDasharray="2 3" /><circle cx={x(evidenzia)} cy={y(serie[0].valori[evidenzia])} r="3.5" fill={C.text} /></>}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 2px 0" }}>
        {etichette.map((e, i) => <span key={i} style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, background: i === evidenzia ? C.text : "transparent", color: i === evidenzia ? "#fff" : C.slate }}>{e}</span>)}
      </div>
    </div>
  );
}

export const euro = (n) => n == null || n === "" || isNaN(n) ? "—" : "€ " + Math.round(Number(n)).toLocaleString("it-IT", { useGrouping: "always" });
export const num = (n, unita) => {
  if (n == null || n === "" || isNaN(n)) return "—";
  if (unita === "€") return euro(n);
  return Number(n).toLocaleString("it-IT", { maximumFractionDigits: 1, useGrouping: "always" }) + (unita && unita !== "n" ? " " + unita : "");
};
export const data = (d) => d ? new Date(d + (String(d).length === 10 ? "T12:00:00" : "")).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const oggi = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const giorniA = (d) => Math.round((new Date(d + "T12:00:00") - new Date(oggi() + "T12:00:00")) / 86400000);

// Lunedì della settimana di una data
export function lunedi(d = new Date()) {
  const x = new Date(d); x.setHours(12, 0, 0, 0);
  const g = (x.getDay() + 6) % 7; x.setDate(x.getDate() - g);
  return x.toISOString().slice(0, 10);
}
// Settimana appena finita (quella che si compila il lunedì)
export const settimanaScorsa = () => { const d = new Date(); d.setDate(d.getDate() - 7); return lunedi(d); };
export const spostaSettimana = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + 7 * n); return d.toISOString().slice(0, 10); };
export const nomeSettimana = (s) => { const a = new Date(s + "T12:00:00"), b = new Date(a); b.setDate(b.getDate() + 6);
  const m = (x) => x.toLocaleDateString("it-IT", { month: "short" });
  return m(a) === m(b) ? `${a.getDate()}–${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`; };

// Colore di un KPI rispetto all'obiettivo
export function esitoKpi(k, v) {
  if (v == null || v === "") return "vuoto";
  if (k.obiettivo == null) return "neutro";
  const ok = k.direzione === "giu" ? Number(v) <= Number(k.obiettivo) : Number(v) >= Number(k.obiettivo);
  return ok ? "verde" : "rosso";
}
export const coloreEsito = { verde: C.green, rosso: C.red, neutro: C.slate, vuoto: C.grey };

// Logo Group Station: pallino rosso al centro, cerchio con tre pallini intorno (da qui si gestisce tutto)
export function Logo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16.5" r="9.5" fill="none" stroke="#c9c8c6" strokeWidth="1.6" />
      <circle cx="16" cy="16.5" r="3.6" fill={C.red} />
      <circle cx="16" cy="7" r="3" fill={C.text} /><circle cx="7.8" cy="21.25" r="3" fill={C.text} /><circle cx="24.2" cy="21.25" r="3" fill={C.red} />
    </svg>
  );
}

// Etichetta piccola maiuscola ("01 · FATTURATO SETTIMANA")
export const Label = ({ n, children, color = C.grey, style }) => (
  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.6, textTransform: "uppercase", color, lineHeight: 1.35, ...style }}>{n != null ? `${String(n).padStart(2, "0")} · ` : ""}{children}</div>
);

// Riquadro con etichetta e numero grande
export function Tile({ label, n, value, color, bg = C.card, onClick, style, small }) {
  return (
    <div onClick={onClick} style={{ background: bg, borderRadius: 20, padding: small ? "12px 14px" : "16px 18px", cursor: onClick ? "pointer" : "default", minWidth: 0, ...style }}>
      <Label n={n} color={bg === C.red || bg === C.text ? "rgba(255,255,255,.75)" : C.grey}>{label}</Label>
      <div style={{ fontSize: small ? 22 : 38, fontWeight: 250, letterSpacing: -1, marginTop: small ? 4 : 6, color: color || (bg === C.red || bg === C.text ? "#fff" : C.text), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

// Selettore a pillole dentro un contenitore bianco
export function Segment({ items, value, onChange, accent = C.text, style }) {
  return (
    <div style={{ display: "flex", gap: 4, ...vetro, borderRadius: 999, padding: 5, overflowX: "auto", maxWidth: "100%", ...style }}>
      {items.map(([k, l]) => <button key={k} onClick={() => onChange(k)} style={{ border: "none", borderRadius: 999, padding: "9px 16px", fontSize: 14.5, fontWeight: value === k ? 600 : 500, whiteSpace: "nowrap", background: value === k ? accent : "transparent", color: value === k ? "#fff" : C.text }}>{l}</button>)}
    </div>
  );
}

// Pulsante rosso fisso in basso (es. "+ Ruolo", "+ Scadenza")
export const Fab = ({ children, onClick }) => (
  <button onClick={onClick} style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 30, border: "none", borderRadius: 999, background: C.text, color: "#fff", fontSize: 15, fontWeight: 600, padding: "14px 24px", boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>{children}</button>
);

export function Btn({ children, variant = "dark", small, style, ...p }) {
  const v = {
    dark: { background: C.text, color: "#fff", border: "none" },
    red: { background: C.red, color: "#fff", border: "none" },
    ghost: { background: C.card, color: C.text, border: "none" },
    soft: { background: C.soft, color: C.text, border: "none" },
    slate: { background: C.slate, color: "#fff", border: "none" },
    link: { background: "none", color: C.red, border: "none", padding: 0 },
  }[variant];
  return <button {...p} style={{ borderRadius: 999, padding: small ? "6px 13px" : "10px 18px", fontSize: small ? 12.5 : 14, fontWeight: 600, whiteSpace: "nowrap", ...v, ...style }}>{children}</button>;
}

export function Card({ children, style, ...p }) {
  return <div {...p} style={{ background: C.card, borderRadius: 24, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,.03)", ...style }}>{children}</div>;
}

export const etichetta = { fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 5, display: "block" };
const campo = { width: "100%", padding: "11px 13px", borderRadius: 14, border: "none", background: C.soft, color: C.text, outline: "none" };

export function Field({ label, value, onChange, type = "text", placeholder, area, options, style, hint }) {
  return (
    <label style={{ display: "block", ...style }}>
      {label && <span style={etichetta}>{label}</span>}
      {options ? (
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={campo}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : area ? (
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={area === true ? 4 : area} style={{ ...campo, resize: "vertical", lineHeight: 1.5 }} />
      ) : (
        <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={campo} inputMode={type === "number" ? "decimal" : undefined} />
      )}
      {hint && <span style={{ fontSize: 11.5, color: C.grey, marginTop: 4, display: "block" }}>{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const f = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [onClose]);
  return (
    <div onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(17,22,25,.35)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 14px", overflowY: "auto" }}>
      <div style={{ background: C.card, borderRadius: 22, width: "100%", maxWidth: wide ? 760 : 520, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: C.soft, width: 32, height: 32, borderRadius: "50%", fontSize: 15 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Chip({ children, color = C.slate, bg, style, onClick }) {
  return <span onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color, background: bg || C.soft, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap", cursor: onClick ? "pointer" : "default", ...style }}>{children}</span>;
}

export const Dot = ({ color, size = 8 }) => <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;

export function Vuoto({ children }) {
  return <div style={{ fontSize: 13.5, color: C.grey, padding: "18px 0", textAlign: "center" }}>{children}</div>;
}

export const griglia = (min = 260) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 14 });
