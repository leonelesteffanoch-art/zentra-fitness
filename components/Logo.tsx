import Image from 'next/image';

/** Logo de Zentra Fitness (blanco, fondo transparente). Recorta el margen del PNG cuadrado. */
export function Logo({ className = 'w-40' }: { className?: string }) {
  return (
    <div className={`relative aspect-[500/150] overflow-hidden ${className}`}>
      <Image
        src="/brand/zentra-logo.png"
        alt="Zentra Fitness"
        width={500}
        height={500}
        priority
        className="absolute left-0 top-1/2 w-full max-w-none -translate-y-1/2"
      />
    </div>
  );
}
