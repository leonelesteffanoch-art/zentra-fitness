'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Loader2, LogOut, ScanLine, Users, Wallet } from 'lucide-react';
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-6 border-b border-line/80 bg-ink/95 px-4 py-3 backdrop-blur-sm sm:px-8">
        <Logo className="w-28" />
        <nav aria-label="Principal" className="flex flex-1 gap-1 overflow-x-auto">
          {NAV.filter((i) => i.roles.includes(perfil.rol)).map((i) => {
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
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-bone">{perfil.nombre}</p>
            <p className="text-xs capitalize text-muted">{perfil.rol}</p>
          </div>
          <button
            onClick={signOut}
            className="btn btn-ghost !min-h-9 !px-3"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
