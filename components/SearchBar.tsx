'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Search } from 'lucide-react';

interface Props {
  onSearch: (termino: string) => void;
  buscando?: boolean;
  placeholder?: string;
  size?: 'md' | 'lg';
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 300;

/**
 * Buscador por DNI o nombre. Dispara UNA consulta: a los 300 ms sin escribir
 * o al instante con Enter. Nunca repite el mismo término.
 */
export function SearchBar({
  onSearch,
  buscando = false,
  placeholder = 'Buscar por DNI o nombre del socio',
  size = 'md',
  autoFocus = false,
}: Props) {
  const [valor, setValor] = useState('');
  const ultimo = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function disparar(termino: string) {
    const t = termino.trim();
    if (t === ultimo.current) return;
    ultimo.current = t;
    onSearch(t);
  }

  useEffect(() => {
    timer.current = setTimeout(() => disparar(valor), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (timer.current) clearTimeout(timer.current);
      disparar(valor);
    }
  }

  const esGrande = size === 'lg';

  return (
    <div className="relative">
      <label htmlFor="buscar-socio" className="sr-only">
        Buscar socio por DNI o nombre
      </label>
      <Search
        size={esGrande ? 18 : 16}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        id="buscar-socio"
        type="search"
        inputMode="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`field !pl-10 !pr-10 ${
          esGrande ? '!min-h-12 !text-base font-medium' : '!min-h-10 !text-sm'
        }`}
      />
      {buscando && (
        <Loader2
          size={16}
          strokeWidth={1.5}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted"
          aria-label="Buscando"
        />
      )}
    </div>
  );
}
