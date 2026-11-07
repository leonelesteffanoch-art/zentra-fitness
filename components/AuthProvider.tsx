'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { obtenerPerfil, cerrarSesion } from '@/services/authService';
import type { Perfil } from '@/types';

interface AuthState {
  perfil: Perfil | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  perfil: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  // Perfil cargado, etiquetado con el usuario al que pertenece
  const [cargado, setCargado] = useState<{ userId: string; perfil: Perfil | null } | null>(null);

  // Sesión de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Perfil (rol + gym_id) cuando cambia el usuario
  useEffect(() => {
    if (!userId) return;
    let activo = true;
    obtenerPerfil(userId)
      .then((p) => activo && setCargado({ userId, perfil: p }))
      .catch(() => activo && setCargado({ userId, perfil: null }));
    return () => {
      activo = false;
    };
  }, [userId]);

  const listo = userId === null || (typeof userId === 'string' && cargado?.userId === userId);
  const perfil = userId && cargado?.userId === userId ? cargado.perfil : null;

  const signOut = async () => {
    await cerrarSesion();
  };

  return (
    <AuthContext.Provider value={{ perfil, loading: !listo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
