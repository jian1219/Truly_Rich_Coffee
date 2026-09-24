import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export async function createBaristaAccount(account) {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.functions.invoke('create-barista', {
        body: account,
    });
    if (error) throw error;
    return data;
}

export async function loadStaffProfiles() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('profiles').select('id, username, full_name, role, active, must_change_password, created_at').eq('role', 'barista').order('created_at');
    if (error) throw error;
    return data || [];
}
