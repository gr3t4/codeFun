// Lets an admin set a new password for any account.
// The service_role key never leaves this server-side function.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  let body: { user_id?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }
  const { user_id, new_password } = body;
  if (!user_id || !new_password || String(new_password).length < 6) {
    return json({ error: 'Se requiere user_id y una contraseña de al menos 6 caracteres.' }, 400);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'No autenticado.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Client scoped to the caller's own session, just to verify who they are.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller }, error: userError } = await callerClient.auth.getUser();
  if (userError || !caller) return json({ error: 'Sesión inválida.' }, 401);

  // Service-role client: bypasses RLS, used only to check authorization
  // and to perform the actual password reset.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();
  if (profileError || !callerProfile) {
    return json({ error: 'No se pudo verificar tu cuenta.' }, 403);
  }

  if (callerProfile.role === 'admin') {
    // admins can reset anyone's password
  } else if (callerProfile.role === 'teacher') {
    // teachers can only reset the password of a student enrolled in one of their own groups
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();
    if (!targetProfile || targetProfile.role !== 'student') {
      return json({ error: 'Solo puedes cambiar la contraseña de alumnos.' }, 403);
    }
    const { data: membership } = await adminClient
      .from('group_members')
      .select('student_id, school_groups!inner(teacher_id)')
      .eq('student_id', user_id)
      .eq('school_groups.teacher_id', caller.id)
      .limit(1);
    if (!membership || membership.length === 0) {
      return json({ error: 'Solo puedes cambiar la contraseña de alumnos de tus propios grupos.' }, 403);
    }
  } else {
    return json({ error: 'No tienes permiso para cambiar contraseñas.' }, 403);
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
    password: new_password,
  });
  if (updateError) return json({ error: updateError.message }, 400);

  return json({ ok: true });
});
