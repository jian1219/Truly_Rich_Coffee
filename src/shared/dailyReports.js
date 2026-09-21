import { supabase } from './supabaseClient';

export const DAILY_REPORTS_KEY = 'coffeeDailyReports';
export const DAILY_DRAFTS_KEY = 'coffeeDailyReportDrafts';
export const INVENTORY_ITEMS_KEY = 'coffeeInventoryItems';
export const MENU_ITEMS_KEY = 'coffeeMenuItems';
export const ADMIN_EXPENSES_KEY = 'coffeeAdminExpenses';
export const INVENTORY_ADDITIONS_KEY = 'coffeeInventoryAdditions';

export const REPORT_MENU = [
    { id: 'iced-americano', name: 'Iced Americano' },
    { id: 'cafe-latte', name: 'Cafe Latte' },
    { id: 'spanish-latte', name: 'Spanish Latte' },
    { id: 'matcha-latte', name: 'Matcha Latte' },
    { id: 'butter-croissant', name: 'Butter Croissant' },
];

export function getMenuItems() {
    const saved = localStorage.getItem(MENU_ITEMS_KEY);
    if (!saved) return REPORT_MENU.map((item, index) => ({ ...item, price: [120, 150, 160, 170, 90][index], category: index === 4 ? 'Pastries' : index === 3 ? 'Non-Coffee' : 'Espresso', available: index !== 4 }));
    try {
        const items = JSON.parse(saved);
        return Array.isArray(items) && items.length ? items : REPORT_MENU;
    } catch { return REPORT_MENU; }
}

export function saveMenuItems(items) { localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items)); }

export function getInventoryItems() {
    const saved = localStorage.getItem(INVENTORY_ITEMS_KEY);
    if (!saved) return [
        { id: 'coffee-beans', name: 'Coffee beans', unit: 'kg' },
        { id: 'whole-milk', name: 'Whole milk', unit: 'L' },
        { id: 'oat-milk', name: 'Oat milk', unit: 'L' },
        { id: 'paper-cups', name: 'Paper cups', unit: 'pcs' },
        { id: 'butter-croissants', name: 'Butter croissants', unit: 'pcs' },
    ];
    try {
        const items = JSON.parse(saved);
        return Array.isArray(items) && items.length ? items : [];
    } catch { return []; }
}

export function saveInventoryItems(items) { localStorage.setItem(INVENTORY_ITEMS_KEY, JSON.stringify(items)); }

export function getInventoryAdditions() {
    const saved = localStorage.getItem(INVENTORY_ADDITIONS_KEY);
    if (!saved) return [];
    try { const additions = JSON.parse(saved); return Array.isArray(additions) ? additions : []; } catch { return []; }
}

export function saveInventoryAdditions(additions) { localStorage.setItem(INVENTORY_ADDITIONS_KEY, JSON.stringify(additions)); }

export function getDailyReports() {
    const saved = localStorage.getItem(DAILY_REPORTS_KEY);
    if (!saved) return [];
    try { const reports = JSON.parse(saved); return Array.isArray(reports) ? reports : []; } catch { return []; }
}

export function saveDailyReport(report) {
    const reports = getDailyReports().filter((item) => item.date !== report.date);
    localStorage.setItem(DAILY_REPORTS_KEY, JSON.stringify([...reports, report]));
}

export function getDailyDraft(date) {
    const saved = localStorage.getItem(DAILY_DRAFTS_KEY);
    if (!saved) return null;
    try { const drafts = JSON.parse(saved); return drafts[date] || null; } catch { return null; }
}

export function saveDailyDraft(date, draft) {
    const saved = localStorage.getItem(DAILY_DRAFTS_KEY);
    let drafts = {};
    if (saved) {
        try { drafts = JSON.parse(saved) || {}; } catch { drafts = {}; }
    }
    drafts[date] = { ...draft, savedAt: new Date().toISOString() };
    localStorage.setItem(DAILY_DRAFTS_KEY, JSON.stringify(drafts));
}

function reportRows(report) {
    return {
        report: { date: report.date, submitted_at: report.submittedAt || new Date().toISOString() },
        sales: (report.sales || []).map((item) => ({ report_date: report.date, menu_item_id: String(item.id), item_name: item.name, price: Number(item.price || 0), cups: Number(item.cups || 0) })),
        expenses: (report.expenses || []).map((item) => ({ report_date: report.date, description: item.description, category: item.category, amount: Number(item.amount || 0) })),
        inventory: (report.inventory || []).map((item) => ({ report_date: report.date, inventory_item_id: String(item.id), item_name: item.name, unit: item.unit, used_quantity: Number(item.used || 0), ending_quantity: Number(item.stock || 0) })),
    };
}

export async function loadSupabaseMenuItems() {
    if (!supabase) return getMenuItems();
    const { data, error } = await supabase.from('menu_items').select('*').order('name');
    if (error) throw error;
    return data || [];
}

export async function loadSupabaseInventoryItems() {
    if (!supabase) return getInventoryItems();
    const { data, error } = await supabase.from('inventory_items').select('*').order('name');
    if (error) throw error;
    return (data || []).map((item) => ({ ...item, quantity: Number(item.quantity || 0) }));
}

export async function loadSupabaseInventoryAdditions() {
    if (!supabase) return getInventoryAdditions();
    const { data, error } = await supabase.from('inventory_additions').select('*').order('submitted_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => ({ id: item.id, itemId: item.item_id, name: item.item_id, unit: 'pcs', quantity: Number(item.quantity), date: item.date, submittedAt: item.submitted_at }));
}

export async function loadSupabaseDailyReports() {
    if (!supabase) return getDailyReports();
    const [{ data: reports, error: reportError }, { data: sales, error: salesError }, { data: expenses, error: expenseError }, { data: inventory, error: inventoryError }] = await Promise.all([
        supabase.from('daily_reports').select('*').order('date', { ascending: false }),
        supabase.from('daily_report_sales').select('*'),
        supabase.from('daily_report_expenses').select('*'),
        supabase.from('daily_report_inventory').select('*'),
    ]);
    if (reportError || salesError || expenseError || inventoryError) throw reportError || salesError || expenseError || inventoryError;
    return (reports || []).map((report) => ({
        date: report.date,
        submittedAt: report.submitted_at,
        sales: (sales || []).filter((item) => item.report_date === report.date).map((item) => ({ id: item.menu_item_id, name: item.item_name, price: Number(item.price || 0), cups: Number(item.cups || 0) })),
        expenses: (expenses || []).filter((item) => item.report_date === report.date).map((item) => ({ description: item.description, category: item.category, amount: Number(item.amount || 0) })),
        inventory: (inventory || []).filter((item) => item.report_date === report.date).map((item) => ({ id: item.inventory_item_id, name: item.item_name, unit: item.unit, used: Number(item.used_quantity || 0), stock: Number(item.ending_quantity || 0) })),
    }));
}

export async function syncSupabaseMenuItems(items) {
    if (!supabase) return;
    const { error } = await supabase.from('menu_items').upsert(items.map(({ id, name, price, category, available }) => ({ id: String(id), name, price: Number(price || 0), category, available })));
    if (error) throw error;
}

export async function syncSupabaseInventoryItems(items) {
    if (!supabase) return;
    const { error } = await supabase.from('inventory_items').upsert(items.map(({ id, name, unit, quantity }) => ({ id: String(id), name, unit, quantity: Number(quantity || 0) })));
    if (error) throw error;
}

export async function syncSupabaseInventoryAdditions(additions) {
    if (!supabase || !additions.length) return;
    const { error } = await supabase.from('inventory_additions').insert(additions.map((item) => ({ item_id: item.itemId, quantity: Number(item.quantity), date: item.date, submitted_at: item.submittedAt })));
    if (error) throw error;
}

export async function syncSupabaseDailyReport(report) {
    if (!supabase) return;
    const rows = reportRows(report);
    const { error: reportError } = await supabase.from('daily_reports').upsert(rows.report);
    if (reportError) throw reportError;
    for (const [table, tableRows] of [['daily_report_sales', rows.sales], ['daily_report_expenses', rows.expenses], ['daily_report_inventory', rows.inventory]]) {
        const { error: deleteError } = await supabase.from(table).delete().eq('report_date', report.date);
        if (deleteError) throw deleteError;
        if (tableRows.length) {
            const { error: insertError } = await supabase.from(table).insert(tableRows);
            if (insertError) throw insertError;
        }
    }
}
