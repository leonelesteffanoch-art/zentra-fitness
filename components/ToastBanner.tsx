'use client';

import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Portal } from '@/components/Portal';

export interface AvisoToast {
  tipo: 'ok' | 'error';
  texto: string;
}

interface Props {
  aviso: AvisoToast | null;
  onClose: () => void;
  autoCloseMs?: number;
}

/**
 * Notificación flotante (Toast) fija en pantalla + banner en línea opcional
 * para que ningún mensaje de éxito o error se pierda al hacer scroll.
 */
export function ToastBanner({ aviso, onClose, autoCloseMs = 6000 }: Props) {
  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [aviso, onClose, autoCloseMs]);

  if (!aviso) return null;

  const esOk = aviso.tipo === 'ok';

  return (
    <Portal>
      {/* Notificación flotante siempre visible en la esquina inferior derecha */}
      <div
        role={esOk ? 'status' : 'alert'}
        aria-live="assertive"
        className={`modal-animate fixed bottom-5 right-5 z-50 flex max-w-md items-start gap-3 rounded-lg border border-l-4 p-4 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.85)] backdrop-blur-xl ${
          esOk
            ? 'border-ok/40 border-l-ok bg-surface/95 text-bone'
            : 'border-bad/50 border-l-bad bg-surface/95 text-bone'
        }`}
      >
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            esOk ? 'bg-ok/20 text-ok' : 'bg-bad/20 text-bad'
          }`}
        >
          {esOk ? (
            <CheckCircle2 size={16} strokeWidth={2} />
          ) : (
            <AlertTriangle size={16} strokeWidth={2} />
          )}
        </div>

        <div className="min-w-0 flex-1 pr-2">
          <p className={`text-xs font-bold uppercase tracking-wider ${esOk ? 'text-ok' : 'text-bad'}`}>
            {esOk ? 'Operación exitosa' : 'Atención · No se pudo completar'}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug text-bone">{aviso.texto}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-bone"
          aria-label="Cerrar notificación"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    </Portal>
  );
}
