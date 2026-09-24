import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) throw new Error('Authentication is required.');

        const userClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user) throw new Error('Authentication is required.');

        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        const { data: adminProfile, error: profileError } = await adminClient
            .from('profiles')
            .select('role, active')
            .eq('id', user.id)
            .single();
        if (profileError || adminProfile?.role !== 'admin' || !adminProfile.active) {
            throw new Error('Only an active admin can create staff accounts.');
        }

        const { email, password, username, fullName } = await request.json();
        if (!email || !password || !username || !fullName || password.length < 8) {
            throw new Error('Email, username, full name, and a password of at least 8 characters are required.');
        }

        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username, full_name: fullName, role: 'barista', must_change_password: true },
        });
        if (createError) throw createError;

        const { error: insertError } = await adminClient.from('profiles').upsert({
            id: created.user.id,
            username,
            full_name: fullName,
            role: 'barista',
            active: true,
            must_change_password: true,
        });
        if (insertError) {
            await adminClient.auth.admin.deleteUser(created.user.id);
            throw insertError;
        }

        return new Response(JSON.stringify({ id: created.user.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to create staff account.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
