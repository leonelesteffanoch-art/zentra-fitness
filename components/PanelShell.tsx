'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Clock,
  Loader2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  ShieldCheck,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';
import type { Rol } from '@/types';

interface ItemNav {
  href: string;
  etiqueta: string;
  icono: ReactNode;
  roles: Rol[];
}

const NAV: ItemNav[] = [
  {
    href: '/recepcion',
    etiqueta: 'Recepción',
    icono: <ScanLine size={18} strokeWidth={1.75} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/caja',
    etiqueta: 'Caja y POS',
    icono: <Wallet size={18} strokeWidth={1.75} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/socios',
    etiqueta: 'Socios',
    icono: <Users size={18} strokeWidth={1.75} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/prospectos',
    etiqueta: 'Prospectos',
    icono: <Target size={18} strokeWidth={1.75} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/admin',
    etiqueta: 'Administración',
    icono: <BarChart3 size={18} strokeWidth={1.75} />,
    roles: ['admin'],
  },
];

function obtenerRelojLima(): { hora: string; fecha: string } {
  const ahora = new Date();
  return {
    hora: ahora.toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
    }),
    fecha: ahora.toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }),
  };
}

/** Marco del panel interno: exige sesión, muestra navegación lateral en escritorio y superior en móvil. */
export function PanelShell({ children }: { children: ReactNode }) {
  const { perfil, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [reloj, setReloj] = useState<{ hora: string; fecha: string } | null>(null);
  const [colapsado, setColapsado] = useState(false);

  useEffect(() => {
    if (!loading && !perfil) router.replace('/login');
  }, [loading, perfil, router]);

  useEffect(() => {
    const init = setTimeout(() => {
      setReloj(obtenerRelojLima());
      try {
        if (localStorage.getItem('zentra_sidebar_colapsado') === '1') {
          setColapsado(true);
        }
      } catch {
        // Ignorar errores de almacenamiento
      }
    }, 0);
    const id = setInterval(() => setReloj(obtenerRelojLima()), 30_000);
    return () => {
      clearTimeout(init);
      clearInterval(id);
    };
  }, []);

  function alternarSidebar() {
    setColapsado((prev) => {
      const sig = !prev;
      try {
        localStorage.setItem('zentra_sidebar_colapsado', sig ? '1' : '0');
      } catch {
        // Ignorar errores de almacenamiento
      }
      return sig;
    });
  }

  if (loading || !perfil) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted" role="status">
        <Loader2 className="animate-spin text-brand" strokeWidth={1.75} />
        <span className="sr-only">Cargando</span>
      </div>
    );
  }

  const itemsVisibles = NAV.filter((i) => i.roles.includes(perfil.rol));
  const iniciales = perfil.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="bg-grain flex min-h-screen flex-col md:flex-row">
      {/* Barra lateral izquierda en pantallas medianas y grandes */}
      <aside
        aria-label="Barra lateral de navegación"
        className={`hidden shrink-0 select-none flex-col border-r border-line/90 bg-ink/95 backdrop-blur-xl transition-[width] duration-200 ease-out md:sticky md:top-0 md:z-30 md:flex md:h-screen ${
          colapsado ? 'md:w-[68px]' : 'md:w-[224px]'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line/80 px-3.5">
          {!colapsado ? (
            <>
              <Link
                href="/"
                aria-label="Ir a la página principal"
                className="group flex shrink-0 items-center transition-opacity hover:opacity-90"
              >
                <Logo className="w-28" />
              </Link>
              <button
                type="button"
                onClick={alternarSidebar}
                className="btn btn-ghost !min-h-8 !px-2 text-muted hover:text-bone"
                aria-label="Contraer menú lateral"
                title="Contraer menú lateral"
              >
                <PanelLeftClose size={16} strokeWidth={1.75} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={alternarSidebar}
              className="btn btn-ghost mx-auto !min-h-9 !px-2.5 text-muted hover:text-bone"
              aria-label="Expandir menú lateral"
              title="Expandir menú lateral"
            >
              <PanelLeftOpen size={18} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <nav aria-label="Principal" className="flex-1 space-y-1.5 overflow-y-auto px-2.5 py-4">
          {itemsVisibles.map((i) => {
            const activo = pathname.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={activo ? 'page' : undefined}
                title={colapsado ? i.etiqueta : undefined}
                className={`relative flex items-center rounded-md py-2.5 text-sm font-medium transition-all duration-150 ${
                  colapsado ? 'justify-center px-2' : 'gap-3 px-3'
                } ${
                  activo
                    ? 'bg-brand/10 text-bone shadow-[inset_0_0_0_1px_rgba(250,204,21,0.22)]'
                    : 'text-muted hover:bg-surface-2/70 hover:text-bone'
                }`}
              >
                {activo && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand shadow-[0_0_8px_#facc15]"
                  />
                )}
                <span className={`shrink-0 ${activo ? 'text-brand' : 'text-muted transition-colors'}`}>
                  {i.icono}
                </span>
                {!colapsado && <span className="truncate">{i.etiqueta}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-line/80 p-2.5">
          {reloj &&
            (!colapsado ? (
              <div
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line/80 bg-surface/90 px-2.5 py-1.5 text-[11px]"
                title="Hora local (Lima, Perú)"
              >
                <Clock size={13} className="shrink-0 text-brand" strokeWidth={1.75} />
                <span className="whitespace-nowrap font-mono font-semibold tabular-nums text-bone">
                  {reloj.hora}
                </span>
                <span className="text-muted/60" aria-hidden="true">·</span>
                <span className="truncate whitespace-nowrap capitalize text-muted">{reloj.fecha}</span>
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-md border border-line/80 bg-surface/90 py-2 text-brand"
                title={`${reloj.hora} · ${reloj.fecha} (Hora local Lima)`}
              >
                <Clock size={15} strokeWidth={1.75} />
              </div>
            ))}

          {!colapsado ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-line/70 bg-surface/60 px-2.5 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand/15 font-display text-xs font-bold tracking-wider text-brand ring-1 ring-brand/30"
                >
                  {iniciales || 'ZF'}
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-xs font-semibold leading-tight text-bone">
                    {perfil.nombre}
                  </p>
                  <p className="flex items-center gap-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-muted">
                    {perfil.rol === 'admin' && <ShieldCheck size={10} className="shrink-0 text-brand" />}
                    {perfil.rol}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="btn btn-ghost shrink-0 !min-h-8 !px-2 text-muted hover:!border-bad/40 hover:!text-bad"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={15} strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${perfil.nombre} (${perfil.rol})`}
                className="flex h-8 w-8 items-center justify-center rounded bg-brand/15 font-display text-xs font-bold tracking-wider text-brand ring-1 ring-brand/30"
              >
                {iniciales || 'ZF'}
              </div>
              <button
                onClick={signOut}
                className="btn btn-ghost !min-h-8 !px-2 text-muted hover:!border-bad/40 hover:!text-bad"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={15} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Cabecera compacta únicamente en pantallas móviles */}
      <header className="sticky top-0 z-30 border-b border-line/90 bg-ink/90 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-2.5 px-4 py-2.5">
          <Link
            href="/"
            aria-label="Ir a la página principal"
            className="group flex shrink-0 items-center transition-opacity hover:opacity-90"
          >
            <Logo className="w-24" />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div
              title={`${perfil.nombre} (${perfil.rol})`}
              className="flex items-center gap-2 rounded-md border border-line/70 bg-surface/60 px-2 py-1"
            >
              <div
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand/15 font-display text-[11px] font-bold tracking-wider text-brand ring-1 ring-brand/30"
              >
                {iniciales || 'ZF'}
              </div>
              <span className="hidden max-w-[120px] truncate text-xs font-semibold text-bone sm:inline">
                {perfil.nombre}
              </span>
            </div>

            <button
              onClick={signOut}
              className="btn btn-ghost shrink-0 !min-h-8 !px-2 text-muted hover:!border-bad/40 hover:!text-bad"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Barra de pestañas dedicada en móvil */}
        <nav
          aria-label="Principal móvil"
          className="flex gap-1 overflow-x-auto border-t border-line/60 bg-surface/50 px-2 py-1"
        >
          {itemsVisibles.map((i) => {
            const activo = pathname.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={activo ? 'page' : undefined}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2.5 py-2 text-xs font-medium transition-colors ${
                  activo
                    ? 'bg-brand/15 text-brand ring-1 ring-brand/30'
                    : 'text-muted hover:text-bone'
                }`}
              >
                {i.icono}
                <span>{i.etiqueta}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1440px] min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
