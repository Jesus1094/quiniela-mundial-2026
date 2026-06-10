"use client";

import { useEffect, useState } from "react";

type Parts = { dias: number; horas: number; minutos: number; segundos: number };

function diff(targetMs: number): Parts | null {
  const ms = targetMs - Date.now();
  if (ms <= 0) return null;
  const totalSeg = Math.floor(ms / 1000);
  return {
    dias: Math.floor(totalSeg / 86400),
    horas: Math.floor((totalSeg % 86400) / 3600),
    minutos: Math.floor((totalSeg % 3600) / 60),
    segundos: totalSeg % 60,
  };
}

function Celda({ valor, label }: { valor: number; label: string }) {
  const txt = String(valor).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-[64px] rounded-xl bg-navy px-3 py-4 sm:min-w-[96px] sm:px-5 sm:py-6">
        <span
          key={txt}
          className="countdown-num block text-center font-serif text-4xl font-semibold tabular-nums text-crema sm:text-6xl"
        >
          {txt}
        </span>
      </div>
      <span className="mt-2 text-xs font-medium uppercase tracking-widest text-navy/70 sm:text-sm">
        {label}
      </span>
    </div>
  );
}

export default function Countdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso).getTime();
  const [parts, setParts] = useState<Parts | null>(() => diff(target));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setParts(diff(target));
    const id = setInterval(() => setParts(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  // Evita parpadeo de hidratación: renderiza valores neutros hasta montar.
  if (!mounted) {
    return (
      <div className="flex items-start justify-center gap-3 sm:gap-5" aria-hidden>
        <Celda valor={0} label="Días" />
        <Celda valor={0} label="Horas" />
        <Celda valor={0} label="Min" />
        <Celda valor={0} label="Seg" />
      </div>
    );
  }

  if (!parts) {
    return (
      <p className="text-center font-serif text-3xl font-semibold text-rojo">
        ¡El torneo ha comenzado! Las predicciones están cerradas.
      </p>
    );
  }

  return (
    <div className="flex items-start justify-center gap-3 sm:gap-5">
      <Celda valor={parts.dias} label="Días" />
      <Celda valor={parts.horas} label="Horas" />
      <Celda valor={parts.minutos} label="Min" />
      <Celda valor={parts.segundos} label="Seg" />
    </div>
  );
}
