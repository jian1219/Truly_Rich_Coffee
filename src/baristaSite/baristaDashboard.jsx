import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3, CalendarDays, CheckCircle2, Coffee, FileText, LogOut,
    Package, Plus, Receipt, Save, Sun, Moon, Trash2, X,
} from 'lucide-react';
import {
    getDailyDraft, getDailyReports, getInventoryAdditions, getInventoryItems, getMenuItems,
    saveDailyDraft, saveDailyReport, saveInventoryAdditions, saveInventoryItems,
    loadSupabaseDailyReports, loadSupabaseInventoryAdditions, loadSupabaseInventoryItems, loadSupabaseMenuItems,
    syncSupabaseDailyReport, syncSupabaseInventoryAdditions, syncSupabaseInventoryItems,
} from '../shared/dailyReports';

const today = new Date().toISOString().slice(0, 10);
const blankExpense = { description: '', category: 'Supplies', amount: '' };
const tabs = [
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'expenses', label: 'Expense', icon: Receipt },
    { id: 'sales', label: 'Sales', icon: BarChart3 },
    { id: 'records', label: 'Record', icon: FileText },
    { id: 'ending', label: 'Ending submission', icon: CheckCircle2 },
];

function formatDate(date) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

function reportTotalCups(report) {
    return (report.sales || []).reduce((total, item) => total + Number(item.cups || 0), 0);
}

function reportTotalExpenses(report) {
    return (report.expenses || []).reduce((total, item) => total + Number(item.amount || 0), 0);
}

function DatePicker({ value, onChange }) {
    return <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
        <CalendarDays size={16} className="text-amber-600" />
        <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>;
}

function EmptyState({ children }) {
    return <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">{children}</p>;
}

export default function BaristaDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ending');
    const [date, setDate] = useState(today);
    const [sales, setSales] = useState(() => getDailyDraft(today)?.sales || {});
    const [expenses, setExpenses] = useState(() => getDailyDraft(today)?.expenses || []);
    const [inventory, setInventory] = useState(() => getDailyDraft(today)?.inventory || {});
    const [inventoryUsed, setInventoryUsed] = useState(() => getDailyDraft(today)?.inventoryUsed || {});
    const [inventoryItems, setInventoryItems] = useState(getInventoryItems);
    const [menuItems, setMenuItems] = useState(getMenuItems);
    const [dailyReports, setDailyReports] = useState(getDailyReports);
    const [inventoryAdditions, setInventoryAdditions] = useState(getInventoryAdditions);
    const [expense, setExpense] = useState(blankExpense);
    const [newInventory, setNewInventory] = useState({ name: '', quantity: '', unit: 'pcs' });
    const [showNewInventoryForm, setShowNewInventoryForm] = useState(false);
    const [showAdditionForm, setShowAdditionForm] = useState(false);
    const [pendingAdditions, setPendingAdditions] = useState([]);
    const [additionForm, setAdditionForm] = useState({ itemId: '', quantity: '' });
    const [draftSaved, setDraftSaved] = useState(Boolean(getDailyDraft(today)));
    const [submitted, setSubmitted] = useState(false);
    const [selectedExpenseDate, setSelectedExpenseDate] = useState(null);
    const [selectedSalesDate, setSelectedSalesDate] = useState(null);
    const [selectedRecordDate, setSelectedRecordDate] = useState(null);
    const [theme, setTheme] = useState(() => localStorage.getItem('baristaTheme') || 'light');

    useEffect(() => {
        const loadRemoteData = async () => {
            try {
                const [remoteMenu, remoteInventory, remoteReports, remoteAdditions] = await Promise.all([
                    loadSupabaseMenuItems(), loadSupabaseInventoryItems(), loadSupabaseDailyReports(), loadSupabaseInventoryAdditions(),
                ]);
                setMenuItems(remoteMenu);
                setInventoryItems(remoteInventory);
                setDailyReports(remoteReports);
                setInventoryAdditions(remoteAdditions);
            } catch (error) {
                console.error('Unable to load Supabase dashboard data.', error);
            }
        };
        loadRemoteData();
    }, []);

    useEffect(() => {
        localStorage.setItem('baristaTheme', theme);
    }, [theme]);

    useEffect(() => {
        const refreshData = () => {
            setMenuItems(getMenuItems());
            setInventoryItems(getInventoryItems());
            setDailyReports(getDailyReports());
            setInventoryAdditions(getInventoryAdditions());
        };
        window.addEventListener('storage', refreshData);
        return () => window.removeEventListener('storage', refreshData);
    }, []);

    const changeDate = (nextDate) => {
        const draft = getDailyDraft(nextDate);
        setDate(nextDate);
        setSales(draft?.sales || {});
        setExpenses(draft?.expenses || []);
        setInventory(draft?.inventory || {});
        setInventoryUsed(draft?.inventoryUsed || {});
        setSubmitted(Boolean(getDailyReports().find((report) => report.date === nextDate)));
        setDraftSaved(Boolean(draft));
    };

    const updateNumber = (setter, id, value) => setter((current) => ({ ...current, [id]: value }));

    const addExpense = () => {
        if (!expense.description.trim() || expense.amount === '' || Number(expense.amount) < 0) return;
        setExpenses((current) => [...current, { ...expense, description: expense.description.trim(), amount: Number(expense.amount) }]);
        setExpense(blankExpense);
        setDraftSaved(false);
    };

    const saveDraft = () => {
        saveDailyDraft(date, { sales, expenses, inventory, inventoryUsed });
        setDraftSaved(true);
    };

    const submitReport = (event) => {
        event.preventDefault();
        const existingReport = getDailyReports().find((report) => report.date === date);
        const nextItems = inventoryItems.map((item) => {
            const previousUsed = Number(existingReport?.inventory?.find((entry) => entry.id === item.id)?.used || 0);
            const startingQuantity = Number(item.quantity || 0) + previousUsed;
            const used = Number(inventoryUsed[item.id] || 0);
            return { ...item, quantity: Math.max(0, startingQuantity - used) };
        });
        const endingInventory = inventoryItems.map((item) => {
            const previousUsed = Number(existingReport?.inventory?.find((entry) => entry.id === item.id)?.used || 0);
            const startingQuantity = Number(item.quantity || 0) + previousUsed;
            const used = Number(inventoryUsed[item.id] || 0);
            return { ...item, stock: Math.max(0, startingQuantity - used), used };
        });
        saveDailyDraft(date, { sales, expenses, inventory, inventoryUsed });
        saveInventoryItems(nextItems);
        setInventoryItems(nextItems);
        syncSupabaseInventoryItems(nextItems).catch((error) => console.error('Unable to sync inventory to Supabase.', error));
        const submittedReport = {
            date,
            submittedAt: new Date().toISOString(),
            sales: menuItems.filter((item) => item.available).map((item) => ({ ...item, cups: Number(sales[item.id] || 0) })),
            expenses,
            inventory: endingInventory,
        };
        saveDailyReport({
            ...submittedReport,
        });
        syncSupabaseDailyReport(submittedReport).catch((error) => console.error('Unable to sync daily report to Supabase.', error));
        setDailyReports(getDailyReports());
        setSubmitted(true);
        setDraftSaved(true);
        setActiveTab('records');
    };

    const addNewInventory = (event) => {
        event.preventDefault();
        const name = newInventory.name.trim();
        if (!name || newInventory.quantity === '' || Number(newInventory.quantity) < 0) return;
        const item = {
            id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
            name,
            unit: newInventory.unit,
            quantity: Number(newInventory.quantity),
        };
        const nextItems = [...inventoryItems, item];
        setInventoryItems(nextItems);
        setInventory((current) => ({ ...current, [item.id]: current[item.id] || item.quantity }));
        saveInventoryItems(nextItems);
        syncSupabaseInventoryItems(nextItems).catch((error) => console.error('Unable to sync inventory to Supabase.', error));
        setNewInventory({ name: '', quantity: '', unit: 'pcs' });
        setShowNewInventoryForm(false);
    };

    const deleteInventory = (id) => {
        const nextItems = inventoryItems.filter((item) => item.id !== id);
        setInventoryItems(nextItems);
        saveInventoryItems(nextItems);
    };

    const addPendingInventory = (event) => {
        event.preventDefault();
        if (!additionForm.itemId || additionForm.quantity === '' || Number(additionForm.quantity) <= 0) return;
        const item = inventoryItems.find((current) => current.id === additionForm.itemId);
        if (!item) return;
        setPendingAdditions((current) => [...current, {
            id: `${item.id}-${Date.now()}`,
            itemId: item.id,
            name: item.name,
            unit: item.unit,
            quantity: Number(additionForm.quantity),
        }]);
        setAdditionForm({ itemId: '', quantity: '' });
    };

    const submitInventoryAdditions = () => {
        if (!pendingAdditions.length) return;
        const nextItems = inventoryItems.map((item) => ({
            ...item,
            quantity: Number(item.quantity || 0) + pendingAdditions
                .filter((addition) => addition.itemId === item.id)
                .reduce((total, addition) => total + addition.quantity, 0),
        }));
        const savedAdditions = pendingAdditions.map((addition) => ({ ...addition, date, submittedAt: new Date().toISOString() }));
        const nextAdditions = [...inventoryAdditions, ...savedAdditions];
        saveInventoryItems(nextItems);
        saveInventoryAdditions(nextAdditions);
        syncSupabaseInventoryItems(nextItems).catch((error) => console.error('Unable to sync inventory to Supabase.', error));
        syncSupabaseInventoryAdditions(savedAdditions).catch((error) => console.error('Unable to sync additions to Supabase.', error));
        setInventoryItems(nextItems);
        setInventoryAdditions(nextAdditions);
        setPendingAdditions([]);
        setShowAdditionForm(false);
    };

    const reportsByDate = useMemo(() => [...dailyReports].sort((a, b) => b.date.localeCompare(a.date)), [dailyReports]);
    const expenseReports = reportsByDate.filter((report) => (report.expenses || []).length);
    const salesReports = reportsByDate.filter((report) => (report.sales || []).length);
    const currentReport = dailyReports.find((report) => report.date === date);
    const selectedExpenseReport = expenseReports.find((report) => report.date === selectedExpenseDate);
    const selectedSalesReport = salesReports.find((report) => report.date === selectedSalesDate);
    const selectedRecord = reportsByDate.find((report) => report.date === selectedRecordDate);

    return (
        <main className={`barista-dashboard min-h-screen bg-[#faf9f7] text-stone-900 ${theme === 'dark' ? 'barista-dashboard-dark' : ''}`}>
            <header className="border-b border-stone-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><Coffee size={22} /></div>
                        <div><p className="text-lg font-bold">Barista dashboard</p><p className="text-xs text-stone-500">Manage your shift and close the day</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
                            <span className="hidden sm:inline">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
                        </button>
                        <button onClick={() => navigate('/')} className="flex min-h-11 items-center gap-2 rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white"><LogOut size={15} /> Exit</button>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><h1 className="text-2xl font-bold">Daily operations</h1><p className="mt-1 text-sm text-stone-500">Save expenses throughout the day, then submit everything when closing.</p></div>
                    <DatePicker value={date} onChange={changeDate} />
                </div>

                <div className="sticky top-0 z-10 grid grid-cols-2 gap-1 rounded-2xl border border-stone-200 bg-white p-1 shadow-sm sm:grid-cols-5" role="tablist" aria-label="Dashboard sections">
                    {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-semibold transition touch-manipulation sm:text-sm ${activeTab === id ? 'bg-amber-100 text-amber-800' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}><Icon size={16} /><span>{label}</span></button>)}
                </div>

                {activeTab === 'inventory' && <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" role="tabpanel">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Inventory list</h2><p className="text-xs text-stone-500">Items are locked after creation. Use Inventory addition when new stock arrives.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setNewInventory({ name: '', quantity: '', unit: 'pcs' }); setShowNewInventoryForm(true); }} className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700"><Plus size={14} /> Add new item</button><button type="button" onClick={() => setShowAdditionForm((current) => !current)} className="flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white"><Package size={14} /> Inventory addition</button></div></div>
                    {showNewInventoryForm && <form onSubmit={addNewInventory} className="grid gap-2 rounded-xl bg-stone-50 p-4 sm:grid-cols-[1fr_120px_120px_auto_auto]"><input required value={newInventory.name} onChange={(event) => setNewInventory({ ...newInventory, name: event.target.value })} placeholder="New item name" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" /><input required type="number" min="0" step="any" value={newInventory.quantity} onChange={(event) => setNewInventory({ ...newInventory, quantity: event.target.value })} placeholder="Starting quantity" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" /><select value={newInventory.unit} onChange={(event) => setNewInventory({ ...newInventory, unit: event.target.value })} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option>pcs</option><option>kg</option><option>L</option><option>box</option><option>bottle</option></select><button className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white">Save new item</button><button type="button" onClick={() => setShowNewInventoryForm(false)} className="flex items-center justify-center rounded-lg border border-stone-200 px-3 py-2 text-stone-500"><X size={15} /></button></form>}
                    {showAdditionForm && <div className="space-y-3 rounded-xl bg-amber-50 p-4"><div><h3 className="text-sm font-semibold">Record incoming inventory</h3><p className="mt-1 text-xs text-stone-600">Add one or more arrivals below. Nothing changes until you review and submit.</p></div><form onSubmit={addPendingInventory} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"><select required value={additionForm.itemId} onChange={(event) => setAdditionForm({ ...additionForm, itemId: event.target.value })} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="">Choose existing item</option>{inventoryItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select><input required type="number" min="0.01" step="any" value={additionForm.quantity} onChange={(event) => setAdditionForm({ ...additionForm, quantity: event.target.value })} placeholder="Quantity arrived" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" /><button className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white"><Plus size={14} className="mr-1 inline" /> Add to review</button></form>{pendingAdditions.length > 0 && <div className="rounded-lg border border-amber-200 bg-white p-3"><h4 className="text-xs font-semibold uppercase text-stone-500">Review before final submit</h4><div className="mt-2 space-y-2">{pendingAdditions.map((addition, index) => <div key={addition.id} className="flex items-center justify-between text-sm"><span>{addition.name} · +{addition.quantity} {addition.unit}</span><button type="button" onClick={() => setPendingAdditions((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs font-semibold text-rose-600">Remove</button></div>)}</div><button type="button" onClick={submitInventoryAdditions} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 size={15} /> Final submit additions</button></div>}</div>}
                    {inventoryItems.length === 0 ? <EmptyState>No inventory items yet.</EmptyState> : <div className="overflow-hidden rounded-xl border border-stone-200"><table className="w-full text-left text-sm"><thead className="bg-stone-50 text-xs uppercase text-stone-500"><tr><th className="p-3">Item</th><th className="p-3">Quantity</th><th className="p-3">Unit</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-stone-100">{inventoryItems.map((item) => <tr key={item.id}><td className="p-3 font-medium">{item.name}</td><td className="p-3">{item.quantity ?? 0}</td><td className="p-3 text-stone-500">{item.unit}</td><td className="p-3 text-right"><button type="button" onClick={() => deleteInventory(item.id)} className="rounded-lg p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${item.name}`}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}
                    <div className="border-t border-stone-200 pt-4"><h3 className="text-sm font-semibold">Inventory usage records</h3><p className="mt-1 text-xs text-stone-500">Each closing submission records what was used and what remained.</p>{reportsByDate.length === 0 ? <p className="mt-3 text-xs text-stone-500">No inventory usage has been recorded yet.</p> : <div className="mt-3 space-y-2">{reportsByDate.map((report) => <div key={report.date} className="rounded-xl bg-stone-50 p-3"><p className="text-sm font-semibold">{formatDate(report.date)}</p><div className="mt-2 grid gap-1 sm:grid-cols-2">{(report.inventory || []).filter((item) => Number(item.used || 0) > 0).map((item) => <p key={item.id} className="text-xs text-stone-600">{item.name}: used <span className="font-semibold text-stone-900">{item.used} {item.unit}</span>, ending <span className="font-semibold text-stone-900">{item.stock} {item.unit}</span></p>)}</div></div>)}</div>}</div>
                    <div className="border-t border-stone-200 pt-4"><h3 className="text-sm font-semibold">Inventory addition records</h3><p className="mt-1 text-xs text-stone-500">Final-submitted incoming stock is recorded here for checking.</p>{inventoryAdditions.length === 0 ? <p className="mt-3 text-xs text-stone-500">No inventory additions have been submitted yet.</p> : <div className="mt-3 space-y-2">{[...inventoryAdditions].reverse().map((addition) => <div key={addition.id} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm"><span>{addition.name} <span className="text-xs text-stone-500">({formatDate(addition.date)})</span></span><strong className="text-emerald-700">+{addition.quantity} {addition.unit}</strong></div>)}</div>}</div>
                </section>}

                {activeTab === 'expenses' && <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" role="tabpanel">
                    <div><h2 className="font-semibold">Expenses by date</h2><p className="text-xs text-stone-500">Select a submitted date to see every expense recorded for that day.</p></div>
                    {expenseReports.length === 0 ? <EmptyState>No submitted expenses yet. Add expenses in the Ending submission tab.</EmptyState> : <div className="grid gap-3 md:grid-cols-[240px_1fr]"><div className="space-y-2">{expenseReports.map((report) => <button type="button" key={report.date} onClick={() => setSelectedExpenseDate(report.date)} className={`w-full rounded-xl border p-3 text-left ${selectedExpenseDate === report.date ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-stone-50'}`}><p className="text-sm font-semibold">{formatDate(report.date)}</p><p className="mt-1 text-xs text-stone-500">{report.expenses.length} expense{report.expenses.length === 1 ? '' : 's'} · ₱{reportTotalExpenses(report)}</p></button>)}</div><div>{selectedExpenseReport ? <div className="rounded-xl bg-stone-50 p-4"><h3 className="font-semibold">{formatDate(selectedExpenseReport.date)}</h3><div className="mt-3 space-y-2">{selectedExpenseReport.expenses.map((item, index) => <div key={`${item.description}-${index}`} className="flex justify-between border-b border-stone-200 pb-2 text-sm"><span>{item.description}<span className="ml-2 text-xs text-stone-500">{item.category}</span></span><strong>₱{item.amount}</strong></div>)}</div></div> : <EmptyState>Choose a date to view its expense list.</EmptyState>}</div></div>}
                </section>}

                {activeTab === 'sales' && <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" role="tabpanel">
                    <div><h2 className="font-semibold">Sales by day</h2><p className="text-xs text-stone-500">Choose a date to see the full cup count and menu breakdown.</p></div>
                    {salesReports.length === 0 ? <EmptyState>No submitted sales yet.</EmptyState> : <div className="grid gap-3 md:grid-cols-[240px_1fr]"><div className="space-y-2">{salesReports.map((report) => <button type="button" key={report.date} onClick={() => setSelectedSalesDate(report.date)} className={`w-full rounded-xl border p-3 text-left ${selectedSalesDate === report.date ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-stone-50'}`}><p className="text-sm font-semibold">{formatDate(report.date)}</p><p className="mt-1 text-xs text-stone-500">{reportTotalCups(report)} cups sold</p></button>)}</div><div>{selectedSalesReport ? <div className="rounded-xl bg-stone-50 p-4"><div className="flex justify-between"><h3 className="font-semibold">{formatDate(selectedSalesReport.date)}</h3><strong className="text-amber-700">{reportTotalCups(selectedSalesReport)} cups</strong></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{(selectedSalesReport.sales || []).map((item) => <div key={item.id} className="flex justify-between rounded-lg bg-white px-3 py-2 text-sm"><span>{item.name}</span><strong>{item.cups}</strong></div>)}</div></div> : <EmptyState>Choose a date to view its sales details.</EmptyState>}</div></div>}
                </section>}

                {activeTab === 'records' && <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" role="tabpanel">
                    <div><h2 className="font-semibold">Submitted daily records</h2><p className="text-xs text-stone-500">A complete history of your submitted closing reports.</p></div>
                    {reportsByDate.length === 0 ? <EmptyState>No closing records submitted yet.</EmptyState> : <div className="space-y-2">{reportsByDate.map((report) => <button type="button" key={report.date} onClick={() => setSelectedRecordDate(selectedRecordDate === report.date ? null : report.date)} className="w-full rounded-xl border border-stone-200 bg-stone-50 p-4 text-left"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{formatDate(report.date)}</span><span className="text-xs text-stone-500">{report.submittedAt ? new Date(report.submittedAt).toLocaleTimeString() : ''}</span></div><div className="mt-2 flex flex-wrap gap-4 text-xs text-stone-600"><span>{reportTotalCups(report)} cups sold</span><span>₱{reportTotalExpenses(report)} expenses</span><span>{(report.inventory || []).length} inventory items</span></div>{selectedRecord?.date === report.date && <div className="mt-4 grid gap-3 border-t border-stone-200 pt-3 text-xs sm:grid-cols-3"><div><p className="font-semibold">Sales</p>{(report.sales || []).filter((item) => item.cups > 0).map((item) => <p key={item.id}>{item.name}: {item.cups} cups</p>)}</div><div><p className="font-semibold">Expenses</p>{(report.expenses || []).map((item, index) => <p key={`${item.description}-${index}`}>{item.description}: ₱{item.amount}</p>)}</div><div><p className="font-semibold">Inventory usage and ending stock</p>{(report.inventory || []).map((item) => <p key={item.id}>{item.name}: used {item.used ?? 0} {item.unit}, ending {item.stock} {item.unit}</p>)}</div></div>}</button>)}</div>}
                </section>}

                {activeTab === 'ending' && <form onSubmit={submitReport} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" role="tabpanel">
                    <div><h2 className="font-semibold">Ending submission</h2><p className="text-xs text-stone-500">Review sales, ending inventory, and all saved expenses before closing {formatDate(date)}.</p></div>
                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-xl bg-stone-50 p-4"><h3 className="text-sm font-semibold">Sales · cups sold</h3><div className="mt-3 space-y-2">{menuItems.filter((item) => item.available).map((item) => <label key={item.id} className="flex items-center justify-between text-sm"><span>{item.name}</span><input type="number" min="0" value={sales[item.id] || ''} onChange={(event) => updateNumber(setSales, item.id, event.target.value)} placeholder="0" className="w-20 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-right" /></label>)}</div></div>
                        <div className="rounded-xl bg-stone-50 p-4"><h3 className="text-sm font-semibold">Ending inventory</h3><p className="mt-1 text-xs text-stone-500">Enter how much was used today. The master inventory will be deducted after submission.</p><div className="mt-3 space-y-3">{inventoryItems.map((item) => { const previousUsed = Number(currentReport?.inventory?.find((entry) => entry.id === item.id)?.used || 0); const available = Number(item.quantity || 0) + previousUsed; const used = Number(inventoryUsed[item.id] || 0); const ending = Math.max(0, available - used); return <label key={item.id} className="block text-sm"><div className="flex items-center justify-between"><span>{item.name} <span className="text-xs text-stone-400">({item.unit})</span></span><span className="text-xs font-semibold text-stone-500">Ending: {ending} {item.unit}</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="text-xs text-stone-500">Used today (available: {available})</span><input type="number" min="0" max={available} step="any" value={inventoryUsed[item.id] || ''} onChange={(event) => updateNumber(setInventoryUsed, item.id, event.target.value)} placeholder="0" className="w-20 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-right" /></div></label>; })}</div></div>
                        <div className="rounded-xl bg-stone-50 p-4"><h3 className="text-sm font-semibold">Expenses during the day</h3><div className="mt-3 space-y-2">{expenses.map((item, index) => <div key={`${item.description}-${index}`} className="flex items-center justify-between text-sm"><span>{item.description}<span className="ml-1 text-xs text-stone-500">({item.category})</span></span><span className="flex items-center gap-2 font-semibold">₱{item.amount}<button type="button" onClick={() => { setExpenses((current) => current.filter((_, itemIndex) => itemIndex !== index)); setDraftSaved(false); }} aria-label={`Remove ${item.description}`}><Trash2 size={14} className="text-rose-600" /></button></span></div>)}</div><div className="mt-4 grid gap-2"><input value={expense.description} onChange={(event) => setExpense({ ...expense, description: event.target.value })} placeholder="Expense description" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" /><div className="flex gap-2"><select value={expense.category} onChange={(event) => setExpense({ ...expense, category: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm"><option>Supplies</option><option>Inventory</option><option>Utilities</option><option>Maintenance</option></select><input type="number" min="0" value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} placeholder="Amount" className="w-24 rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm" /></div><button type="button" onClick={addExpense} className="flex items-center justify-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold"><Plus size={14} /> Add expense</button></div></div>
                    </div>
                    {draftSaved && <p className="text-xs font-medium text-emerald-700">Saved draft for {formatDate(date)}. You can continue this report later.</p>}
                    <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-4"><button type="button" onClick={saveDraft} className="flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700"><Save size={16} /> Save draft</button><button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white hover:bg-amber-700"><CheckCircle2 size={18} /> {submitted ? 'Update closing submission' : 'Submit closing report'}</button></div>
                </form>}
            </div>
        </main>
    );
}
