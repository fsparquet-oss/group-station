import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// Barra di navigazione in basso (solo telefono) con incavo che scivola sotto la voce attiva
// e pallino che "salta" fuori dalla barra. voci = [{ k, label, icon }], attiva = indice (-1 = nessuna)
const H = 64, BOLLA = 50;

// incavo: spalle morbide + arco attorno al pallino (centro del pallino sul bordo della barra)
function forma(w, cx) {
  return `M0,0 L${cx - 50},0 Q${cx - 37},0 ${cx - 33},8 A34,34 0 0 0 ${cx + 33},8 Q${cx + 37},0 ${cx + 50},0 L${w},0 L${w},${H} L0,${H} Z`;
}

export default function BottomNav({ voci, attiva, onSelect, colori }) {
  const box = useRef(null), path = useRef(null), bolla = useRef(null), icona = useRef(null);
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 390);
  const cur = useRef(null), target = useRef(0), raf = useRef(0);
  const passo = w / voci.length;
  const i = Math.max(0, attiva);

  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const disegna = () => {
    const cx = cur.current;
    path.current?.setAttribute("d", forma(w, cx));
    if (bolla.current) bolla.current.style.transform = `translateX(${cx - BOLLA / 2}px)`;
  };

  useEffect(() => {
    target.current = passo * i + passo / 2;
    if (cur.current === null) { cur.current = target.current; disegna(); return; }
    const anima = () => {
      cur.current += (target.current - cur.current) * 0.2;
      if (Math.abs(target.current - cur.current) < 0.4) cur.current = target.current;
      disegna();
      if (cur.current !== target.current) raf.current = requestAnimationFrame(anima);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(anima);
    icona.current?.animate?.([{ transform: "translateY(14px) scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.34,1.56,.64,1)" });
    return () => cancelAnimationFrame(raf.current);
      }, [i, w, passo]);

  return (
    <nav ref={box} style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, height: `calc(${H}px + env(safe-area-inset-bottom))`, filter: colori.ombra ? `drop-shadow(${colori.ombra})` : undefined }}>
      <svg width={w} height={H} style={{ position: "absolute", left: 0, top: 0, display: "block" }}><path ref={path} d={forma(w, passo * i + passo / 2)} fill={colori.barra} /></svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: H - 1, bottom: 0, background: colori.barra }} />
      <div ref={bolla} style={{ position: "absolute", left: 0, top: -BOLLA / 2 + 2, width: BOLLA, height: BOLLA, borderRadius: "50%", background: colori.pallino, color: colori.iconaAttiva, display: "flex", alignItems: "center", justifyContent: "center", transform: `translateX(${passo * i + passo / 2 - BOLLA / 2}px)`, pointerEvents: "none" }}>
        <span ref={icona} key={i} style={{ display: "flex" }}>{voci[i]?.icon}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: H, display: "flex" }}>
        {voci.map((v, j) => (
          <button key={v.k} aria-label={v.label} onClick={() => onSelect(j)} style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 5, paddingBottom: 9, color: j === i ? colori.etichettaAttiva : colori.icona, WebkitTapHighlightColor: "transparent" }}>
            <span style={{ display: "flex", position: "relative", opacity: j === i ? 0 : 1, transition: "opacity .2s" }}>{v.icon}{v.badge > 0 && <span style={{ position: "absolute", top: -5, right: -9, minWidth: 16, height: 16, borderRadius: 8, padding: "0 4px", background: colori.badge || "#e0533d", color: "#fff", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{v.badge > 99 ? "99+" : v.badge}</span>}</span>
            <span style={{ fontSize: 10.5, fontWeight: j === i ? 650 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{v.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
