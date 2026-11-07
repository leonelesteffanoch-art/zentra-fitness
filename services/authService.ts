import { supabase } from '@/lib/supabase';
import type { Perfil } from '@/types';

/** Inicia sesión y verifica que el usuario tenga un perfil de staff activo. */
export async function iniciarSesion(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : error.message
    );
  }
  const perfil = await obtenerPerfil(data.user.id);
  if (!perfil) {
    await supabase.auth.signOut();
    throw new Error('Tu usuario no tiene un perfil activo. Contacta al administrador.');
  }
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
}

/** Perfil del staff (rol y gimnasio) del usuario autenticado. */
export async function obtenerPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, gym_id, nombre, rol, activo')
    .eq('id', userId)
    .eq('activo', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as Perfil | null;
}
