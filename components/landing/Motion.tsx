'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

const QUERY_REDUCED = '(prefers-reduced-motion: reduce)';

/** true si el usuario pidió reducir el movimiento (false en SSR). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(QUERY_REDUCED);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(QUERY_REDUCED).matches,
    () => false
  );
}

/** Dispara `true` una sola vez cuando el elemento entra en pantalla. */
export function useInViewOnce<T extends Element>(threshold = 0.01, rootMargin = '300px 0px 50px 0px') {
  const ref = useRef<T | null>(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisto(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return { ref, visto };
}

/** Reveal: fade + 12px hacia arriba, una sola vez. En móvil aparece de inmediato para evitar retrasos de carga. */
export function RevealOnScroll({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, visto } = useInViewOnce<HTMLDivElement>(0.01, '350px 0px 80px 0px');
  return (
    <div ref={ref} className={`${visto ? 'reveal-visible' : 'reveal-hidden'} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Count-up al entrar en pantalla (una vez). El HTML del servidor ya trae el valor final,
 * así no hay layout shift ni contenido vacío sin JavaScript.
 */
export function CountUp({
  valor,
  prefijo = '',
  duracionMs = 1400,
}: {
  valor: number;
  prefijo?: string;
  duracionMs?: number;
}) {
  const { ref, visto } = useInViewOnce<HTMLSpanElement>(0.1);
  const [actual, setActual] = useState(valor);
  const iniciado = useRef(false);

  useEffect(() => {
    if (!visto || iniciado.current) return;
    iniciado.current = true;
    if (window.matchMedia(QUERY_REDUCED).matches) return;

    let frame = 0;
    const inicio = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracionMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setActual(Math.round(valor * eased));
      if (p < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [visto, valor, duracionMs]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span className="sr-only">
        {prefijo}
        {valor}
      </span>
      <span aria-hidden="true">
        {prefijo}
        {actual}
      </span>
    </span>
  );
}
