'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Search, X } from 'lucide-react';

interface Props {
  onSearch: (termino: string) => void;
  buscando?: boolean;
  placeholder?: string;
  size?: 'md' | 'lg';
  variant?: 'default' | 'hero';
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 180;

/**
 * Buscador por DNI o nombre. Dispara UNA consulta: a los 180 ms sin escribir
 * o al instante con Enter. Incluye atajo de teclado "/" y botón para limpiar.
 */
export function SearchBar({
  onSearch,
  buscando = false,
  placeholder = 'Buscar por DNI o nombre del socio',
  size = 'md',
  variant = 'default',
  autoFocus = false,
}: Props) {
  const [valor, setValor] = useState('');
  const ultimo = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  function disparar(termino: string) {
    const t = termino.trim();
    if (t === ultimo.current) return;
    ultimo.current = t;
    onSearchRef.current(t);
  }

  useEffect(() => {
    timer.current = setTimeout(() => disparar(valor), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [valor]);

  useEffect(() => {
    function handleGlobalSlash(e: globalThis.KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener('keydown', handleGlobalSlash);
    return () => window.removeEventListener('keydown', handleGlobalSlash);
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (timer.current) clearTimeout(timer.current);
      disparar(valor);
    } else if (e.key === 'Escape' && valor) {
      e.stopPropagation();
      limpiar();
    }
  }

  function limpiar() {
    if (timer.current) clearTimeout(timer.current);
    setValor('');
    disparar('');
    inputRef.current?.focus();
  }

  const esGrande = size === 'lg';
  const esHero = variant === 'hero';

  return (
    <div className="group relative">
      <label htmlFor="buscar-socio" className="sr-only">
        Buscar socio por DNI o nombre
      </label>
      <Search
        size={esHero ? 22 : esGrande ? 18 : 16}
        strokeWidth={esHero ? 2.25 : 1.75}
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 transition-colors ${
          esHero
            ? 'left-4 text-brand'
            : 'left-3.5 text-muted group-focus-within:text-brand'
        }`}
      />
      <input
        ref={inputRef}
        id="buscar-socio"
        type="text"
        inputMode="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`field transition-all ${
          esHero
            ? '!min-h-13 !rounded-md !pl-12 !pr-28 !text-base sm:!text-lg font-medium !bg-surface-2 !border-brand/50 placeholder:text-muted/80 focus:!border-brand focus:!ring-1 focus:!ring-brand/30'
            : esGrande
            ? '!min-h-12 !pl-10 !pr-16 !text-base font-medium'
            : '!min-h-10 !pl-10 !pr-16 !text-sm'
        }`}
      />
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {buscando ? (
          <Loader2
            size={16}
            strokeWidth={1.75}
            className="animate-spin text-brand"
            aria-label="Buscando"
          />
        ) : valor ? (
          <button
            type="button"
            onClick={limpiar}
            className={
              esHero
                ? 'inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-bone transition-colors hover:border-brand/60 hover:text-brand'
                : 'flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-bone'
            }
            aria-label="Limpiar búsqueda"
            title="Limpiar (Esc)"
          >
            <X size={14} strokeWidth={2} />
            {esHero && <span>Limpiar</span>}
          </button>
        ) : esHero ? null : (
          <kbd
            aria-hidden="true"
            className="hidden rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline-block"
            title="Presiona / para buscar rápido"
          >
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
