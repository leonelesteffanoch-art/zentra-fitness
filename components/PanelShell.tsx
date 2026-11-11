'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Loader2, LogOut, ScanLine, Target, Users, Wallet } from 'lucide-react';
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
    icono: <ScanLine size={16} strokeWidth={1.5} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/caja',
    etiqueta: 'Caja y POS',
    icono: <Wallet size={16} strokeWidth={1.5} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/socios',
    etiqueta: 'Socios',
    icono: <Users size={16} strokeWidth={1.5} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/prospectos',
    etiqueta: 'Prospectos',
    icono: <Target size={16} strokeWidth={1.5} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/admin',
    etiqueta: 'Administración',
    icono: <BarChart3 size={16} strokeWidth={1.5} />,
    roles: ['admin'],
  },
];

/** Marco del panel interno: exige sesión, muestra navegación según el rol. */
export function PanelShell({ children }: { children: ReactNode }) {
  const { perfil, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !perfil) router.replace('/login');
  }, [loading, perfil, router]);

  if (loading || !perfil) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted" role="status">
        <Loader2 className="animate-spin" strokeWidth={1.5} />
        <span className="sr-only">Cargando</span>
      </div>
    );
  }

  const itemsVisibles = NAV.filter((i) => i.roles.includes(perfil.rol));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href="/" aria-label="Ir a la página principal" className="shrink-0">
            <Logo className="w-28" />
          </Link>

          {/* Navegación en línea en pantallas medianas y grandes */}
          <nav aria-label="Principal" className="hidden flex-1 gap-1 md:flex md:pl-4">
            {itemsVisibles.map((i) => {
              const activo = pathname.startsWith(i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={activo ? 'page' : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    activo
                      ? 'border-brand text-bone'
                      : 'border-transparent text-muted hover:text-bone'
                  }`}
                >
                  {i.icono}
                  {i.etiqueta}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <p className="text-xs font-medium leading-tight text-bone sm:text-sm">
                {perfil.nombre}
              </p>
              <p className="text-[11px] capitalize text-muted sm:text-xs">{perfil.rol}</p>
            </div>
            <button
              onClick={signOut}
              className="btn btn-ghost !min-h-9 !px-2.5 sm:!px-3"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Barra de pestañas dedicada en móvil para no apretar el logo y el usuario */}
        <nav
          aria-label="Principal móvil"
          className="flex gap-1 overflow-x-auto border-t border-line/60 px-3 md:hidden"
        >
          {itemsVisibles.map((i) => {
            const activo = pathname.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={activo ? 'page' : undefined}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2.5 text-xs font-medium transition-colors ${
                  activo
                    ? 'border-brand text-bone'
                    : 'border-transparent text-muted hover:text-bone'
                }`}
              >
                {i.icono}
                <span>{i.etiqueta}</span>
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
