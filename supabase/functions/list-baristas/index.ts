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
        const { data: adminProfile, error: adminProfileError } = await adminClient
            .from('profiles')
            .select('role, active')
            .eq('id', user.id)
            .single();
        if (adminProfileError || adminProfile?.role !== 'admin' || !adminProfile.active) {
            throw new Error('Only an active admin can view staff accounts.');
        }

        const { data: profiles, error: staffError } = await adminClient
            .from('profiles')
            .select('id, username, full_name, role, active, must_change_password, created_at')
            .eq('role', 'barista')
            .order('created_at');
        if (staffError) throw staffError;

        const authUsers = [];
        for (let page = 1; ; page += 1) {
            const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
            if (error) throw error;
            authUsers.push(...data.users);
            if (data.users.length < 1000) break;
        }

        const emailById = new Map(authUsers.map((authUser) => [authUser.id, authUser.email || '']));
        const staff = (profiles || []).map((profile) => ({
            ...profile,
            email: emailById.get(profile.id) || '',
        }));

        return new Response(JSON.stringify({ staff }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to load staff accounts.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
