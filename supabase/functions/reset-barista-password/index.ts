import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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
        const { data: adminProfile } = await adminClient.from('profiles').select('role, active').eq('id', user.id).single();
        if (adminProfile?.role !== 'admin' || !adminProfile.active) throw new Error('Only an active admin can reset passwords.');

        const { userId, password } = await request.json();
        if (!userId || !password || password.length < 8) throw new Error('A password of at least 8 characters is required.');

        const { data: staffProfile, error: staffError } = await adminClient.from('profiles').select('role').eq('id', userId).single();
        if (staffError || staffProfile?.role !== 'barista') throw new Error('Only barista accounts can be reset here.');

        const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password });
        if (updateError) throw updateError;
        const { error: profileUpdateError } = await adminClient.from('profiles').update({ must_change_password: true }).eq('id', userId);
        if (profileUpdateError) throw profileUpdateError;

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to reset password.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
