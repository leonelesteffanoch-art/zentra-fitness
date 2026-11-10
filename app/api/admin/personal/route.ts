import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Rol } from '@/types';

function crearAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verificarAdminSolicitante(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return { error: 'No autenticado', status: 401 as const };
  }

  const adminClient = crearAdminClient();
  const { data: userRes, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !userRes?.user) {
    return { error: 'Sesión inválida o expirada', status: 401 as const };
  }

  const { data: perfil } = await adminClient
    .from('perfiles')
    .select('id, gym_id, nombre, rol, activo')
    .eq('id', userRes.user.id)
    .eq('activo', true)
    .maybeSingle();

  if (!perfil || perfil.rol !== 'admin') {
    return { error: 'Acceso restringido únicamente al administrador', status: 403 as const };
  }

  return { adminClient, adminPerfil: perfil };
}

/** GET /api/admin/personal -> Lista todo el personal del gimnasio con su correo y rol. */
export async function GET(req: NextRequest) {
  try {
    const verif = await verificarAdminSolicitante(req);
    if ('error' in verif) {
      return NextResponse.json({ error: verif.error }, { status: verif.status });
    }
    const { adminClient, adminPerfil } = verif;

    const [{ data: perfiles, error: perfErr }, { data: authUsers }] = await Promise.all([
      adminClient
        .from('perfiles')
        .select('id, gym_id, nombre, rol, activo, created_at')
        .eq('gym_id', adminPerfil.gym_id)
        .order('created_at', { ascending: true }),
      adminClient.auth.admin.listUsers({ perPage: 200 }),
    ]);

    if (perfErr) {
      return NextResponse.json({ error: perfErr.message }, { status: 400 });
    }

    const mapaEmails = new Map<string, string>();
    for (const u of authUsers?.users ?? []) {
      if (u.email) mapaEmails.set(u.id, u.email);
    }

    const personal = (perfiles ?? []).map((p) => ({
      id: p.id,
      gym_id: p.gym_id,
      nombre: p.nombre,
      email: mapaEmails.get(p.id) ?? '—',
      rol: p.rol as Rol,
      activo: Boolean(p.activo),
      created_at: p.created_at,
    }));

    return NextResponse.json({ personal });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/** POST /api/admin/personal -> Crea un nuevo trabajador (recepcionista o admin). */
export async function POST(req: NextRequest) {
  try {
    const verif = await verificarAdminSolicitante(req);
    if ('error' in verif) {
      return NextResponse.json({ error: verif.error }, { status: verif.status });
    }
    const { adminClient, adminPerfil } = verif;

    const body = (await req.json()) as {
      nombre?: string;
      email?: string;
      password?: string;
      rol?: Rol;
    };

    const nombre = (body.nombre ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    const rol: Rol = body.rol === 'admin' ? 'admin' : 'recepcionista';

    if (nombre.length < 2) {
      return NextResponse.json({ error: 'Ingresa el nombre del trabajador' }, { status: 400 });
    }
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Ingresa un correo electrónico válido' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // 1. Crear el usuario en Supabase Auth con email confirmado inmediatamente
    const { data: creado, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !creado?.user) {
      const msg =
        createErr?.message?.includes('already been registered') ||
        createErr?.message?.includes('already registered')
          ? 'Ya existe un usuario registrado con ese correo'
          : createErr?.message ?? 'No se pudo crear el usuario';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 2. Insertar el perfil asociado al mismo gimnasio
    const { error: perfErr } = await adminClient.from('perfiles').upsert({
      id: creado.user.id,
      gym_id: adminPerfil.gym_id,
      nombre,
      rol,
      activo: true,
    });

    if (perfErr) {
      await adminClient.auth.admin.deleteUser(creado.user.id);
      return NextResponse.json({ error: perfErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      trabajador: {
        id: creado.user.id,
        gym_id: adminPerfil.gym_id,
        nombre,
        email,
        rol,
        activo: true,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear trabajador' },
      { status: 500 }
    );
  }
}

/** PATCH /api/admin/personal -> Actualiza rol, estado activo, nombre o contraseña de un trabajador. */
export async function PATCH(req: NextRequest) {
  try {
    const verif = await verificarAdminSolicitante(req);
    if ('error' in verif) {
      return NextResponse.json({ error: verif.error }, { status: verif.status });
    }
    const { adminClient, adminPerfil } = verif;

    const body = (await req.json()) as {
      id?: string;
      nombre?: string;
      rol?: Rol;
      activo?: boolean;
      password?: string;
    };

    const targetId = (body.id ?? '').trim();
    if (!targetId) {
      return NextResponse.json({ error: 'Falta el ID del trabajador' }, { status: 400 });
    }

    // Verificar que el trabajador pertenezca al mismo gimnasio
    const { data: objetivo } = await adminClient
      .from('perfiles')
      .select('id, gym_id, rol, activo')
      .eq('id', targetId)
      .eq('gym_id', adminPerfil.gym_id)
      .maybeSingle();

    if (!objetivo) {
      return NextResponse.json({ error: 'Trabajador no encontrado en este gimnasio' }, { status: 404 });
    }

    // Impedir que el administrador en sesión se desactive o se quite el rol admin a sí mismo
    if (targetId === adminPerfil.id) {
      if (body.activo === false) {
        return NextResponse.json(
          { error: 'No puedes desactivar tu propio usuario administrador' },
          { status: 400 }
        );
      }
      if (body.rol && body.rol !== 'admin') {
        return NextResponse.json(
          { error: 'No puedes quitarte el rol de administrador a ti mismo' },
          { status: 400 }
        );
      }
    }

    const cambiosPerfil: Record<string, unknown> = {};
    if (typeof body.nombre === 'string' && body.nombre.trim().length >= 2) {
      cambiosPerfil.nombre = body.nombre.trim();
    }
    if (body.rol === 'admin' || body.rol === 'recepcionista') {
      cambiosPerfil.rol = body.rol;
    }
    if (typeof body.activo === 'boolean') {
      cambiosPerfil.activo = body.activo;
    }

    if (Object.keys(cambiosPerfil).length > 0) {
      const { error: updErr } = await adminClient
        .from('perfiles')
        .update(cambiosPerfil)
        .eq('id', targetId)
        .eq('gym_id', adminPerfil.gym_id);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 400 });
      }
    }

    const actualizacionesAuth: { password?: string; ban_duration?: string } = {};

    if (typeof body.password === 'string' && body.password.length > 0) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }
      actualizacionesAuth.password = body.password;
    }

    if (typeof body.activo === 'boolean') {
      actualizacionesAuth.ban_duration = body.activo ? 'none' : '876000h';
    }

    if (Object.keys(actualizacionesAuth).length > 0) {
      const { error: authUpdErr } = await adminClient.auth.admin.updateUserById(
        targetId,
        actualizacionesAuth
      );
      if (authUpdErr) {
        return NextResponse.json({ error: authUpdErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al actualizar trabajador' },
      { status: 500 }
    );
  }
}
