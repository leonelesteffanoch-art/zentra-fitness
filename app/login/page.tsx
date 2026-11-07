import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Ingresar',
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section
        aria-hidden
        className="relative hidden overflow-hidden border-r border-line/70 lg:block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/zentra-cover.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55 saturate-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="absolute bottom-10 left-10 max-w-md">
          <p className="text-2xl font-semibold tracking-tight text-bone">
            Recepción y control en tiempo real
          </p>
          <p className="mt-1 text-sm text-muted">
            Zentra Fitness · Villa Estela Km. 39 - Ancón
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10 w-44" />
          <h1 className="font-display mb-8 text-4xl">Ingresar</h1>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
