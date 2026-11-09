import type { ReactNode } from 'react';

/**
 * Título de sección editorial: display extendida/itálica, una palabra en amarillo
 * y número fantasma grande detrás.
 */
export function SectionHeading({
  num,
  antes,
  destacado,
  despues,
  children,
  centrado = false,
  id,
}: {
  num: string;
  antes?: string;
  destacado: string;
  despues?: string;
  children?: ReactNode;
  centrado?: boolean;
  id?: string;
}) {
  return (
    <div className={`relative mb-10 sm:mb-14 ${centrado ? 'sm:text-center' : ''}`}>
      <span
        aria-hidden="true"
        className={`ghost-num absolute -top-8 sm:-top-14 ${
          centrado ? 'left-0 sm:left-1/2 sm:-translate-x-1/2' : '-left-1 sm:-left-3'
        }`}
      >
        {num}
      </span>
      <h2 id={id} className="display-h2 relative">
        {antes && <>{antes} </>}
        <span className="text-brand">{destacado}</span>
        {despues && <> {despues}</>}
      </h2>
      {children && <div className="relative mt-3">{children}</div>}
    </div>
  );
}
