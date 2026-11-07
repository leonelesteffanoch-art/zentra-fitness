'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { iniciarSesion } from '@/services/authService';
import { useAuth } from '@/components/AuthProvider';

export function LoginForm() {
  const router = useRouter();
  const { perfil, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!loading && perfil) router.replace('/recepcion');
  }, [loading, perfil, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(email.trim(), password);
      // La redirección la hace el efecto de arriba cuando AuthProvider carga el perfil.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="label">Correo</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password" className="label">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando || !email || !password} className="btn btn-primary w-full">
        {enviando && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
        Ingresar
      </button>
    </form>
  );
}
