'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { obtenerPerfil, cerrarSesion } from '@/services/authService';
import type { Perfil } from '@/types';

interface AuthState {
  perfil: Perfil | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setPerfilDirecto: (perfil: Perfil | null) => void;
}

const AuthContext = createContext<AuthState>({
  perfil: null,
  loading: true,
  signOut: async () => {},
  setPerfilDirecto: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [cargado, setCargado] = useState<{ userId: string; perfil: Perfil | null } | null>(null);

  // Sesión de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (!uid) setCargado(null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evento, session) => {
      const uid = session?.user.id ?? null;
      setUserId(uid);
      if (!uid || evento === 'SIGNED_OUT') {
        setCargado(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Perfil (rol + gym_id) cuando cambia el usuario
  useEffect(() => {
    if (!userId) return;
    if (cargado?.userId === userId && cargado.perfil) return;

    let activo = true;
    obtenerPerfil(userId)
      .then((p) => {
        if (activo) setCargado({ userId, perfil: p });
      })
      .catch(() => {
        if (activo) setCargado({ userId, perfil: null });
      });
    return () => {
      activo = false;
    };
  }, [userId, cargado]);

  const setPerfilDirecto = useCallback((p: Perfil | null) => {
    if (p) {
      setUserId(p.id);
      setCargado({ userId: p.id, perfil: p });
    } else {
      setUserId(null);
      setCargado(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    setUserId(null);
    setCargado(null);
    await cerrarSesion();
  }, []);

  const listo = userId === null || (typeof userId === 'string' && cargado?.userId === userId);
  const perfil = userId && cargado?.userId === userId ? cargado.perfil : null;

  return (
    <AuthContext.Provider value={{ perfil, loading: !listo, signOut, setPerfilDirecto }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
