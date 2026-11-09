import Link from 'next/link';
import { ClipboardList, IdCard, Smartphone, Wallet, UserCheck } from 'lucide-react';

const PASOS = [
  { icono: ClipboardList, titulo: 'Elige tu plan', detalle: null },
  { icono: Wallet, titulo: 'Paga en recepción', detalle: 'Efectivo, Yape, Plin o tarjeta' },
  { icono: IdCard, titulo: 'Ingresa con tu DNI', detalle: null },
  { icono: Smartphone, titulo: 'Consulta tus días desde tu celular', detalle: null },
];

export function ComoFunciona() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
      <ol className="grid gap-px overflow-hidden border border-line/80 bg-line/80 sm:grid-cols-2 lg:col-span-7">
        {PASOS.map(({ icono: Icono, titulo, detalle }, i) => (
          <li key={titulo} className="relative flex min-h-44 flex-col justify-between bg-ink p-6">
            <div className="flex items-start justify-between">
              <span
                aria-hidden="true"
                className="font-[family-name:var(--font-archivo)] text-6xl font-black italic leading-none text-bone/15"
                style={{ fontStretch: '125%' }}
              >
                {i + 1}
              </span>
              <Icono aria-hidden="true" size={24} strokeWidth={1.5} className="text-muted" />
            </div>
            <div className="mt-6">
              <p className="text-base font-semibold text-bone">
                <span className="sr-only">Paso {i + 1}: </span>
                {titulo}
              </p>
              {detalle && <p className="mt-1 text-sm text-muted">{detalle}</p>}
            </div>
          </li>
        ))}
      </ol>

      {/* Maqueta visual del portal de socio (datos ficticios) */}
      <div className="lg:col-span-5">
        <figure className="mx-auto max-w-sm">
          <div
            aria-hidden="true"
            className="relative rotate-[-1.5deg] border border-line bg-ink p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Ejemplo
              </span>
              <span className="font-mono text-[11px] text-muted">ZENTRA · PORTAL</span>
            </div>

            <div className="mt-6 border-l-4 border-l-ok pl-4">
              <p className="text-lg font-semibold text-bone">Carlos R.</p>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-medium text-ok">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                Activo
              </span>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <span
                  className="font-[family-name:var(--font-archivo)] text-5xl font-black italic leading-none text-bone"
                  style={{ fontStretch: '115%' }}
                >
                  18
                </span>
                <span className="text-xs text-muted">Vence 27 nov</span>
              </div>
              <p className="mt-1 text-xs text-muted">días restantes</p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-line">
                <div className="h-full w-[60%] rounded-full bg-ok" />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line/70 pt-4 text-sm">
              <span className="text-muted">Asistencias este mes</span>
              <span className="font-semibold text-bone tabular-nums">12</span>
            </div>
          </div>
          <figcaption className="mt-6 flex flex-col items-center gap-4 text-center">
            <span className="text-sm text-muted">Así se ve tu portal (ejemplo con datos ficticios)</span>
            <Link href="/consulta" className="btn btn-secondary">
              <UserCheck size={16} strokeWidth={1.5} aria-hidden="true" />
              Consultar mi DNI
            </Link>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
