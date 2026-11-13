'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};

/**
 * Monta modales y notificaciones directamente en document.body
 * para que `position: fixed` siempre tome como referencia la pantalla visible (viewport)
 * sin importar contenedores padre con scroll o transformaciones CSS.
 */
export function Portal({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isClient) return null;
  return createPortal(children, document.body);
}
