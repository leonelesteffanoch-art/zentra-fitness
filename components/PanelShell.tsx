'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Clock, Loader2, LogOut, ScanLine, ShieldCheck, Target, Users, Wallet } from 'lucide-react';
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
    icono: <ScanLine size={16} strokeWidth={1.75} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/caja',
    etiqueta: 'Caja y POS',
    icono: <Wallet size={16} strokeWidth={1.75} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/socios',
    etiqueta: 'Socios',
    icono: <Users size={16} strokeWidth={1.75} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/prospectos',
    etiqueta: 'Prospectos',
    icono: <Target size={16} strokeWidth={1.75} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/admin',
    etiqueta: 'Administración',
    icono: <BarChart3 size={16} strokeWidth={1.75} />,
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

/** Marco del panel interno: exige sesión, muestra navegación según el rol. */
export function PanelShell({ children }: { children: ReactNode }) {
  const { perfil, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [reloj, setReloj] = useState<{ hora: string; fecha: string } | null>(null);

  useEffect(() => {
    if (!loading && !perfil) router.replace('/login');
  }, [loading, perfil, router]);

  useEffect(() => {
    const init = setTimeout(() => setReloj(obtenerRelojLima()), 0);
    const id = setInterval(() => setReloj(obtenerRelojLima()), 30_000);
    return () => {
      clearTimeout(init);
      clearInterval(id);
    };
  }, []);

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
    <div className="bg-grain flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line/90 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2.5 px-4 py-2.5 sm:px-6 xl:gap-4 xl:px-8">
          <Link
            href="/"
            aria-label="Ir a la página principal"
            className="group flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
          >
            <Logo className="w-24 xl:w-28" />
          </Link>

          {/* Navegación en línea en pantallas medianas y grandes */}
          <nav aria-label="Principal" className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
            {itemsVisibles.map((i) => {
              const activo = pathname.startsWith(i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={activo ? 'page' : undefined}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-150 xl:gap-2 xl:px-3.5 xl:text-sm ${
                    activo
                      ? 'bg-brand/10 text-bone shadow-[inset_0_0_0_1px_rgba(250,204,21,0.22)]'
                      : 'text-muted hover:bg-surface-2/70 hover:text-bone'
                  }`}
                >
                  <span className={activo ? 'text-brand' : 'text-muted transition-colors'}>
                    {i.icono}
                  </span>
                  <span>{i.etiqueta}</span>
                  {activo && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 -bottom-[11px] h-[2px] rounded-full bg-brand shadow-[0_0_8px_#facc15]"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {reloj && (
              <div
                className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-line/80 bg-surface/90 px-2.5 py-1 text-xs lg:flex"
                title="Hora local (Lima, Perú)"
              >
                <Clock size={13} className="shrink-0 text-brand" strokeWidth={1.75} />
                <span className="whitespace-nowrap font-mono font-semibold tabular-nums text-bone">
                  {reloj.hora}
                </span>
                <span className="text-muted/60" aria-hidden="true">·</span>
                <span className="whitespace-nowrap capitalize text-muted">{reloj.fecha}</span>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2.5 rounded-md border border-line/70 bg-surface/60 px-2.5 py-1">
              <div
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand/15 font-display text-xs font-bold tracking-wider text-brand ring-1 ring-brand/30"
              >
                {iniciales || 'ZF'}
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-[110px] truncate text-xs font-semibold leading-tight text-bone xl:max-w-[140px]">
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
              className="btn btn-ghost shrink-0 !min-h-9 !px-2.5 text-muted hover:!border-bad/40 hover:!text-bad"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Barra de pestañas dedicada en móvil */}
        <nav
          aria-label="Principal móvil"
          className="flex gap-1 overflow-x-auto border-t border-line/60 bg-surface/50 px-2 py-1 md:hidden"
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
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {children}
      </main>
    </div>
  );
}
