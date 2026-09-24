import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, DollarSign, Users, Receipt, 
  LogOut, Plus, Trash2, Edit2, Check, X, ShieldCheck, 
  TrendingUp, Calendar, ShoppingBag, ArrowDownRight, Tablet, Filter, Settings, Sun, Moon
} from 'lucide-react';
import { getDailyReports, getInventoryAdditions, getInventoryItems, getMenuItems, loadSupabaseDailyReports, loadSupabaseInventoryAdditions, loadSupabaseInventoryItems, loadSupabaseMenuItems, saveMenuItems, syncSupabaseMenuItems } from '../shared/dailyReports';
import { createBaristaAccount, loadStaffProfiles, resetBaristaPassword, supabase } from '../shared/supabaseClient';
import logo from '../images/logo-trc.png';

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sales');
  const [dailyReports, setDailyReports] = useState(getDailyReports);
  const [inventoryItems, setInventoryItems] = useState(getInventoryItems);
  const [inventoryAdditions, setInventoryAdditions] = useState(getInventoryAdditions);
  const [selectedSalesReport, setSelectedSalesReport] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [resetStaff, setResetStaff] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'dark');
  const [profileForm, setProfileForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      setProfileForm((current) => ({ ...current, username: profile?.username || user.email?.split('@')[0] || '' }));
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const loadRemoteData = async () => {
      try {
        const [remoteMenu, remoteInventory, remoteReports, remoteAdditions] = await Promise.all([
          loadSupabaseMenuItems(), loadSupabaseInventoryItems(), loadSupabaseDailyReports(), loadSupabaseInventoryAdditions(),
        ]);
        setProducts(remoteMenu);
        setInventoryItems(remoteInventory);
        setDailyReports(remoteReports);
        setInventoryAdditions(remoteAdditions);
      } catch (error) {
        console.error('Unable to load Supabase admin data.', error);
      }
    };
    loadRemoteData();
  }, []);

  useEffect(() => {
    const refreshReports = async () => {
      try {
        const [remoteInventory, remoteReports, remoteAdditions] = await Promise.all([
          loadSupabaseInventoryItems(), loadSupabaseDailyReports(), loadSupabaseInventoryAdditions(),
        ]);
        setDailyReports(remoteReports);
        setInventoryItems(remoteInventory);
        setInventoryAdditions(remoteAdditions);
      } catch (error) {
        console.error('Unable to refresh admin data from Supabase.', error);
      }
    };
    window.addEventListener('storage', refreshReports);
    return () => window.removeEventListener('storage', refreshReports);
  }, []);

  // --- MOCK DATA STATES ---
  const [products, setProducts] = useState(() => getMenuItems());

  // Sales Filter States: 'all', 'today', 'specific-month', 'specific-date'
  const [salesFilterType, setSalesFilterType] = useState('all');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [selectedSalesMonth, setSelectedSalesMonth] = useState(todayStr.slice(0, 7));
  const [selectedSalesDate, setSelectedSalesDate] = useState(todayStr);

  // Upgraded Staff State with POS Tablet Access Permission
  const [staff, setStaff] = useState([
    { id: 1, name: 'Ian Garciano', role: 'Head Barista / Owner', shift: 'Morning', status: 'Active', posAccess: true },
    { id: 2, name: 'Sarah Jenkins', role: 'Cashier / Barista', shift: 'Closing', status: 'Active', posAccess: true },
  ]);

  // Expense Filter States: 'all', 'today', 'specific-month', 'specific-date'
  const [expenseFilterType, setExpenseFilterType] = useState('all');
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState(todayStr.slice(0, 7));
  const [selectedExpenseDate, setSelectedExpenseDate] = useState(todayStr);

  // Modal states for Product CRUD
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', category: 'Espresso', available: true });

  // Modal states for Staff CRUD
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffFormData, setStaffFormData] = useState({ 
    name: '', 
    username: '',
    email: '',
    password: '',
    role: 'Barista', 
    shift: 'Morning', 
    status: 'Active', 
    posAccess: true 
  });
  useEffect(() => {
    loadStaffProfiles().then((profiles) => {
      if (profiles.length) setStaff(profiles.map((profile) => ({ id: profile.id, name: profile.full_name, username: profile.username, email: '', role: 'Barista', shift: 'Morning', status: profile.active ? 'Active' : 'Inactive', posAccess: profile.active })));
    }).catch((error) => console.error('Unable to load staff profiles.', error));
  }, []);
  const submittedSales = dailyReports.map((report) => {
    const cups = (report.sales || []).reduce((total, item) => total + Number(item.cups || 0), 0);
    const total = (report.sales || []).reduce((sum, item) => sum + Number(item.cups || 0) * (products.find((product) => product.id === item.id)?.price || 0), 0);
    return { id: report.date, date: report.date, items: `${cups} cups across ${(report.sales || []).filter((item) => item.cups > 0).length} menu items`, total, payment: 'Daily report', time: report.submittedAt ? new Date(report.submittedAt).toLocaleTimeString() : '-', report };
  });
  const submittedExpenses = dailyReports.flatMap((report) => (report.expenses || []).map((item, index) => ({ id: `${report.date}-${index}`, title: item.description, category: item.category, amount: Number(item.amount || 0), date: report.date })));
  const allSales = submittedSales;
  const allExpenses = submittedExpenses;

  // Logout Handler
  const handleLogout = () => {
    supabase?.auth.signOut();
    localStorage.removeItem('isAdminAuthenticated');
    navigate('/admin/login');
  };

  const saveProfileSettings = async (event) => {
    event.preventDefault();
    setProfileMessage('');
    setProfileError('');
    if (!supabase) {
      setProfileError('Supabase is not configured.');
      return;
    }
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      setProfileError('Passwords do not match.');
      return;
    }
    if (profileForm.password && profileForm.password.length < 8) {
      setProfileError('Password must be at least 8 characters.');
      return;
    }
    setProfileLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Your admin session has expired. Please log in again.');
      const { error: profileErrorResponse } = await supabase.from('profiles').update({ username: profileForm.username.trim() }).eq('id', user.id);
      if (profileErrorResponse) throw profileErrorResponse;
      if (profileForm.password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: profileForm.password });
        if (passwordError) throw passwordError;
      }
      setProfileForm((current) => ({ ...current, password: '', confirmPassword: '' }));
      setProfileMessage('Profile settings saved successfully.');
    } catch (error) {
      setProfileError(error.message || 'Unable to save profile settings.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Product CRUD functions
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    if (editingId) {
      setProducts(prev => {
        const next = prev.map(p => p.id === editingId ? { ...p, ...formData, price: Number(formData.price) } : p);
        saveMenuItems(next);
        syncSupabaseMenuItems(next).catch((error) => console.error('Unable to sync menu to Supabase.', error));
        return next;
      });
    } else {
      setProducts(prev => {
        const next = [...prev, { id: Date.now(), ...formData, price: Number(formData.price) }];
        saveMenuItems(next);
        syncSupabaseMenuItems(next).catch((error) => console.error('Unable to sync menu to Supabase.', error));
        return next;
      });
    }
    setIsOpenModal(false);
    setEditingId(null);
    setFormData({ name: '', price: '', category: 'Espresso', available: true });
  };

  // Staff CRUD functions
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    if (!staffFormData.name || !staffFormData.username || !staffFormData.email || !staffFormData.password) return;
    setStaffLoading(true);
    if (editingStaffId) {
      setStaff(prev => prev.map(st => st.id === editingStaffId ? { ...st, ...staffFormData } : st));
    } else {
      try {
        const created = await createBaristaAccount({ fullName: staffFormData.name, username: staffFormData.username, email: staffFormData.email, password: staffFormData.password });
        setStaff(prev => [...prev, { id: created.id, ...staffFormData, role: 'Barista', status: 'Active', posAccess: true }]);
      } catch (error) {
        setStaffError(error.message || 'Unable to create staff account.');
        setStaffLoading(false);
        return;
      }
    }
    setIsStaffModalOpen(false);
    setEditingStaffId(null);
    setStaffFormData({ name: '', username: '', email: '', password: '', role: 'Barista', shift: 'Morning', status: 'Active', posAccess: true });
    setStaffLoading(false);
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!resetStaff || resetPassword.length < 8) return;
    setResetLoading(true);
    setStaffError('');
    try {
      await resetBaristaPassword(resetStaff.id, resetPassword);
      setResetStaff(null);
      setResetPassword('');
    } catch (error) {
      setStaffError(error.message || 'Unable to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  // --- SALES FILTER LOGIC ---
  const reportMonths = [...new Set([...allSales, ...allExpenses].map((item) => item.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a));
  const formatMonth = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  useEffect(() => {
    if (reportMonths.length && !reportMonths.includes(selectedSalesMonth)) setSelectedSalesMonth(reportMonths[0]);
    if (reportMonths.length && !reportMonths.includes(selectedExpenseMonth)) setSelectedExpenseMonth(reportMonths[0]);
  }, [reportMonths.join(','), selectedSalesMonth, selectedExpenseMonth]);

  const filteredSales = allSales.filter(sale => {
    if (salesFilterType === 'today') return sale.date === todayStr;
    if (salesFilterType === 'month') return sale.date.startsWith(selectedSalesMonth);
    if (salesFilterType === 'date') return sale.date === selectedSalesDate;
    return true; // 'all'
  });

  const todayRevenue = allSales.filter(s => s.date === todayStr).reduce((sum, item) => sum + item.total, 0);
  const selectedMonthRevenue = allSales.filter(s => s.date.startsWith(selectedSalesMonth)).reduce((sum, item) => sum + item.total, 0);
  const totalRevenueAll = allSales.reduce((sum, item) => sum + item.total, 0);

  // --- EXPENSE FILTER LOGIC ---
  const filteredExpenses = allExpenses.filter(ex => {
    if (expenseFilterType === 'today') return ex.date === todayStr;
    if (expenseFilterType === 'month') return ex.date.startsWith(selectedExpenseMonth);
    if (expenseFilterType === 'date') return ex.date === selectedExpenseDate;
    return true; // 'all'
  });
  const expenseGroups = [...new Set(filteredExpenses.map((expense) => expense.date))].sort((a, b) => b.localeCompare(a));

  const todayExpenses = allExpenses.filter(e => e.date === todayStr).reduce((sum, item) => sum + item.amount, 0);
  const selectedMonthExpenses = allExpenses.filter(e => e.date.startsWith(selectedExpenseMonth)).reduce((sum, item) => sum + item.amount, 0);
  const totalExpensesAll = allExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className={`admin-dashboard min-h-screen font-sans flex flex-col ${theme === 'light' ? 'admin-dashboard-light' : 'bg-gray-950 text-gray-100'}`}>
      
      {/* TOP HEADER */}
      <header className="bg-gray-900 border-b border-gray-800 px-8 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="Truly Rich Coffee" className="h-12 w-12 rounded-xl border border-amber-500/30 bg-amber-600/10 object-contain p-1.5" />
          <div>
            <h1 className="font-bold tracking-tight text-white flex items-center gap-2">
              TRC Admin 
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">v1.0</span>
            </h1>
            <p className="text-[10px] text-gray-400">Created by <span className="text-amber-400 font-medium">Ian G.</span></p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Logged in as Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* NAVIGATION TABS BAR */}
      <div className="bg-gray-900/60 border-b border-gray-800 px-8 flex space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 py-4 px-5 border-b-2 font-semibold text-sm transition ${
            activeTab === 'menu' 
              ? 'border-amber-500 text-amber-400 bg-amber-500/5' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Package className="w-4 h-4" /> Menu
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 py-4 px-5 border-b-2 font-semibold text-sm transition ${
            activeTab === 'inventory' 
              ? 'border-amber-500 text-amber-400 bg-amber-500/5' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Package className="w-4 h-4" /> Inventory
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 py-4 px-5 border-b-2 font-semibold text-sm transition ${
            activeTab === 'sales' 
              ? 'border-amber-500 text-amber-400 bg-amber-500/5' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Sales & Orders
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 py-4 px-5 border-b-2 font-semibold text-sm transition ${
            activeTab === 'staff' 
              ? 'border-amber-500 text-amber-400 bg-amber-500/5' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-4 h-4" /> Staff Management
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 py-4 px-5 border-b-2 font-semibold text-sm transition ${
            activeTab === 'expenses' 
              ? 'border-amber-500 text-amber-400 bg-amber-500/5' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Receipt className="w-4 h-4" /> Expenses
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 py-4 px-5 border-b-2 font-semibold text-sm transition ${
            activeTab === 'settings'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        
        {/* --- TAB 1: MENU --- */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Menu Control</h2>
                <p className="text-sm text-gray-400">Set menu prices and choose which products baristas can enter on the POS.</p>
              </div>
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ name: '', price: '', category: 'Espresso', available: true });
                  setIsOpenModal(true);
                }}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-amber-900/20 transition"
              >
                <Plus className="w-4 h-4" /> Add New Product
              </button>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-950/60 border-b border-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-800/30 transition">
                      <td className="p-4 font-semibold text-white">{p.name}</td>
                      <td className="p-4">
                        <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-100">₱{p.price}</td>
                      <td className="p-4">
                        <button
                          onClick={() => setProducts(prev => prev.map(item => item.id === p.id ? { ...item, available: !item.available } : item))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                            p.available 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {p.available ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          {p.available ? 'Available' : 'Sold Out'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setFormData({ name: p.name, price: p.price, category: p.category, available: p.available });
                            setIsOpenModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProducts(prev => prev.filter(item => item.id !== p.id))}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 2: INVENTORY --- */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div><h2 className="text-xl font-bold text-white">Inventory overview</h2><p className="text-sm text-gray-400">Read-only inventory information, usage, ending stock, and incoming additions submitted by baristas.</p></div>
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"><table className="w-full text-left"><thead className="bg-gray-950/60 text-xs uppercase text-gray-400"><tr><th className="p-4">Item</th><th className="p-4">Current quantity</th><th className="p-4">Unit</th></tr></thead><tbody className="divide-y divide-gray-800">{inventoryItems.map((item) => <tr key={item.id}><td className="p-4 font-semibold text-white">{item.name}</td><td className="p-4 text-gray-200">{item.quantity ?? 0}</td><td className="p-4 text-gray-400">{item.unit}</td></tr>)}</tbody></table></div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5"><h3 className="font-semibold text-white">Daily inventory usage and ending stock</h3>{dailyReports.length === 0 ? <p className="mt-3 text-sm text-gray-500">No inventory submissions yet.</p> : dailyReports.slice().sort((a, b) => b.date.localeCompare(a.date)).map((report) => <div key={report.date} className="mt-3 rounded-xl bg-gray-950 p-3"><p className="text-sm font-semibold text-white">{report.date}</p><div className="mt-2 grid gap-1 sm:grid-cols-2">{(report.inventory || []).map((item) => <p key={item.id} className="text-xs text-gray-400">{item.name}: used <span className="font-semibold text-amber-400">{item.used ?? 0} {item.unit}</span>, ending <span className="font-semibold text-emerald-400">{item.stock} {item.unit}</span></p>)}</div></div>)}</div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5"><h3 className="font-semibold text-white">Incoming inventory additions</h3>{inventoryAdditions.length === 0 ? <p className="mt-3 text-sm text-gray-500">No additions submitted yet.</p> : <div className="mt-3 space-y-2">{[...inventoryAdditions].reverse().map((addition) => <div key={addition.id} className="flex items-center justify-between rounded-xl bg-gray-950 p-3 text-sm"><span className="text-gray-300">{addition.name} · {addition.date}</span><span className="font-semibold text-emerald-400">+{addition.quantity} {addition.unit}</span></div>)}</div>}</div>
          </div>
        )}

        {/* --- TAB 2: SALES & REVENUE REPORTS (WITH MONTH & DAY SELECTORS) --- */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Daily Sales Reports</h2>
                <p className="text-sm text-gray-400">Review sales totals submitted by the barista for each business day.</p>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-800 bg-gray-950/60 p-2">
                <button
                  onClick={() => setSalesFilterType('all')}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    salesFilterType === 'all' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  All time
                </button>
                <button
                  onClick={() => setSalesFilterType('today')}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    salesFilterType === 'today' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Today
                </button>

                {/* Month Picker Dropdown */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-950 px-2 py-1.5">
                  <span className="text-xs text-gray-400">Month:</span>
                  <select
                    value={selectedSalesMonth}
                    onChange={(e) => {
                      setSelectedSalesMonth(e.target.value);
                      setSalesFilterType('month');
                    }}
                    className="bg-transparent text-xs text-amber-400 font-semibold focus:outline-none cursor-pointer"
                  >
                    {reportMonths.length === 0 ? <option value={selectedSalesMonth}>No months available</option> : reportMonths.map((month) => <option key={month} value={month}>{formatMonth(month)}</option>)}
                  </select>
                </div>

                {/* Specific Date Picker */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-950 px-2 py-1.5">
                  <span className="text-xs text-gray-400">Date:</span>
                  <input
                    type="date"
                    value={selectedSalesDate}
                    onChange={(e) => {
                      setSelectedSalesDate(e.target.value);
                      setSalesFilterType('date');
                    }}
                    className="bg-transparent text-xs text-amber-400 font-semibold focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Revenue</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">₱{todayRevenue}</h3>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                    <TrendingUp className="w-3 h-3" /> Daily report total
                  </span>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Selected Month Total</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">₱{selectedMonthRevenue}</h3>
                  <span className="text-[11px] text-gray-400 mt-1 block">For {selectedSalesMonth}</span>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">All-Time Revenue</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">₱{totalRevenueAll}</h3>
                  <span className="text-[11px] text-gray-400 mt-1 block">{filteredSales.length} daily reports logged</span>
                </div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>
            </div>

            {dailyReports.length > 0 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                <div className="px-6 py-4 bg-gray-950/40 border-b border-gray-800">
                  <h3 className="font-bold text-white text-sm">Latest barista closing report</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Submitted for {dailyReports[dailyReports.length - 1].date}
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Cups sold by menu</h4>
                    <div className="space-y-2">
                      {(dailyReports[dailyReports.length - 1].sales || []).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.name}</span>
                          <span className="font-bold text-amber-400">{item.cups} cups</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Expenses</h4>
                    {(dailyReports[dailyReports.length - 1].expenses || []).length === 0 ? (
                      <p className="text-sm text-gray-500">No expenses reported.</p>
                    ) : (dailyReports[dailyReports.length - 1].expenses || []).map((item, index) => (
                      <div key={`${item.description}-${index}`} className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">{item.description}</span>
                        <span className="font-bold text-red-400">₱{item.amount}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Ending inventory</h4>
                    <div className="space-y-2">
                      {(dailyReports[dailyReports.length - 1].inventory || []).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.name}</span>
                          <span className="font-bold text-emerald-400">{item.stock} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
              <div className="px-6 py-4 bg-gray-950/40 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-400" />
                  Daily Sales Reports ({filteredSales.length} reports for filter: <span className="text-amber-400 font-mono">{salesFilterType}</span>)
                </h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-950/60 border-b border-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="p-4">Report Date</th>
                    <th className="p-4">Submitted At</th>
                    <th className="p-4">Sales Summary</th>
                    <th className="p-4">Source</th>
                    <th className="p-4 text-right">Daily Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-500 text-sm">
                        No sales records found matching this timeframe filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => (
                      <Fragment key={s.id}>
                      <tr onClick={() => setSelectedSalesReport(selectedSalesReport?.date === s.date ? null : s.report)} className="cursor-pointer hover:bg-gray-800/30 transition">
                        <td className="p-4 font-semibold text-amber-400">{s.date}</td>
                        <td className="p-4 text-xs text-gray-300">
                          <span className="text-gray-300">{s.time}</span>
                        </td>
                        <td className="p-4 text-gray-300 text-sm">{s.items}</td>
                        <td className="p-4">
                          <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-md border border-gray-700 font-medium">
                            {s.payment}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-400">₱{s.total}</td>
                      </tr>
                      {selectedSalesReport?.date === s.date && <tr className="bg-gray-950/70"><td colSpan="5" className="p-5"><div className="grid gap-4 md:grid-cols-3"><div><h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">Menu sales</h4>{(s.report.sales || []).filter((item) => item.cups > 0).map((item) => <p key={item.id} className="text-sm text-gray-300">{item.name}: <span className="font-semibold text-white">{item.cups} cups</span></p>)}</div><div><h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-400">Expenses</h4>{(s.report.expenses || []).map((item, index) => <p key={`${item.description}-${index}`} className="text-sm text-gray-300">{item.description}: <span className="font-semibold text-white">₱{item.amount}</span></p>)}</div><div><h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">Ending inventory</h4>{(s.report.inventory || []).map((item) => <p key={item.id} className="text-sm text-gray-300">{item.name}: used {item.used ?? 0}, ending {item.stock} {item.unit}</p>)}</div></div></td></tr>}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 3: STAFF MANAGEMENT --- */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Staff Directory & POS Access</h2>
                <p className="text-sm text-gray-400">Manage baristas, cashiers, shifts, and tablet checkout permissions.</p>
              </div>
              <button
                onClick={() => {
                  setEditingStaffId(null);
                  setStaffFormData({ name: '', username: '', email: '', password: '', role: 'Barista / Cashier', shift: 'Morning', status: 'Active', posAccess: true });
                  setIsStaffModalOpen(true);
                }}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-amber-900/20 transition"
              >
                <Plus className="w-4 h-4" /> Add New Staff
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff.map((st) => (
                <div key={st.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-lg">{st.name}</h3>
                      <p className="text-xs text-amber-400 font-semibold mt-0.5">{st.role}</p>
                      {st.username && <p className="text-xs text-gray-400 mt-2">Username: <span className="text-gray-200 font-medium">{st.username}</span></p>}
                      <p className="text-xs text-gray-400 mt-2">Assigned Shift: <span className="text-gray-200 font-medium">{st.shift}</span></p>
                    </div>
                    <span className={`px-3 py-1 border text-xs font-bold rounded-full ${
                      st.status === 'Active' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                      {st.status}
                    </span>
                  </div>

                  <div className="bg-gray-950/60 border border-gray-800/80 px-4 py-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Tablet className={`w-4 h-4 ${st.posAccess ? 'text-amber-400' : 'text-gray-600'}`} />
                      <div>
                        <p className="text-xs font-bold text-gray-200">POS Tablet Privilege</p>
                        <p className="text-[11px] text-gray-400">
                          {st.posAccess ? 'Allowed to log in & ring up orders' : 'Access revoked for tablet'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setStaff(prev => prev.map(item => item.id === st.id ? { ...item, posAccess: !item.posAccess } : item))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                        st.posAccess
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {st.posAccess ? 'Revoke Access' : 'Grant Access'}
                    </button>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-800/60">
                    <button
                      onClick={() => {
                        setEditingStaffId(st.id);
                        setStaffFormData({ 
                          name: st.name, 
                          role: st.role, 
                          shift: st.shift, 
                          status: st.status, 
                          posAccess: st.posAccess 
                        });
                        setIsStaffModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Details
                    </button>
                    <button
                      onClick={() => { setResetStaff(st); setResetPassword(''); setStaffError(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40 rounded-lg text-xs font-semibold transition"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => setStaff(prev => prev.filter(item => item.id !== st.id))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 rounded-lg text-xs font-semibold transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 4: EXPENSES (WITH MONTH & DAY SELECTORS) --- */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Shop Expenses & Cost Tracker</h2>
                <p className="text-sm text-gray-400">Select any past month or specific date to review historical cost outflows.</p>
              </div>
              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-800 bg-gray-950/60 p-2">
                <button
                  onClick={() => setExpenseFilterType('all')}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    expenseFilterType === 'all' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  All time
                </button>
                <button
                  onClick={() => setExpenseFilterType('today')}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    expenseFilterType === 'today' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Today
                </button>

                {/* Month Picker Dropdown */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-950 px-2 py-1.5">
                  <span className="text-xs text-gray-400">Month:</span>
                  <select
                    value={selectedExpenseMonth}
                    onChange={(e) => {
                      setSelectedExpenseMonth(e.target.value);
                      setExpenseFilterType('month');
                    }}
                    className="bg-transparent text-xs text-amber-400 font-semibold focus:outline-none cursor-pointer"
                  >
                    {reportMonths.length === 0 ? <option value={selectedExpenseMonth}>No months available</option> : reportMonths.map((month) => <option key={month} value={month}>{formatMonth(month)}</option>)}
                  </select>
                </div>

                {/* Specific Date Picker */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-950 px-2 py-1.5">
                  <span className="text-xs text-gray-400">Date:</span>
                  <input
                    type="date"
                    value={selectedExpenseDate}
                    onChange={(e) => {
                      setSelectedExpenseDate(e.target.value);
                      setExpenseFilterType('date');
                    }}
                    className="bg-transparent text-xs text-amber-400 font-semibold focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Expenses</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">₱{todayExpenses}</h3>
                  <span className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-medium">
                    <ArrowDownRight className="w-3 h-3" /> Daily outflow
                  </span>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Selected Month Outflow</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">₱{selectedMonthExpenses}</h3>
                  <span className="text-[11px] text-gray-400 mt-1 block">For {selectedExpenseMonth}</span>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">All-Time Expenses</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">₱{totalExpensesAll}</h3>
                  <span className="text-[11px] text-gray-400 mt-1 block">{allExpenses.length} barista-submitted entries</span>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
              <div className="px-6 py-4 bg-gray-950/40 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-red-400" />
                  Expense Records ({filteredExpenses.length} entries found for filter: <span className="text-red-400 font-mono">{expenseFilterType}</span>)
                </h3>
              </div>
              {filteredExpenses.length === 0 ? <p className="p-8 text-center text-gray-500 text-sm">No barista expense records found matching this timeframe filter.</p> : <div className="divide-y divide-gray-800/60">{expenseGroups.map((expenseDate) => { const dayExpenses = filteredExpenses.filter((expense) => expense.date === expenseDate); const dayTotal = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0); return <div key={expenseDate}><button type="button" onClick={() => setSelectedExpenseDate(selectedExpenseDate === expenseDate ? null : expenseDate)} className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-800/30"><div><p className="font-semibold text-white">{expenseDate}</p><p className="mt-1 text-xs text-gray-400">{dayExpenses.length} expense{dayExpenses.length === 1 ? '' : 's'} · submitted by barista</p></div><span className="font-bold text-red-400">-₱{dayTotal}</span></button>{selectedExpenseDate === expenseDate && <div className="space-y-2 bg-gray-950/70 p-4">{dayExpenses.map((expense) => <div key={expense.id} className="flex items-center justify-between rounded-lg bg-gray-900 p-3 text-sm"><div><p className="font-semibold text-white">{expense.title}</p><span className="text-xs text-gray-400">{expense.category}</span></div><span className="font-bold text-red-400">-₱{expense.amount}</span></div>)}</div>}</div>; })}</div>}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Admin Settings</h2>
              <p className="text-sm text-gray-400">Update your admin profile and choose the dashboard appearance.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <form onSubmit={saveProfileSettings} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
                <div>
                  <h3 className="font-semibold text-white">Profile and password</h3>
                  <p className="mt-1 text-xs text-gray-400">Passwords are securely managed by Supabase Auth.</p>
                </div>
                {profileMessage && <p className="rounded-xl border border-emerald-800/50 bg-emerald-950/40 p-3 text-xs text-emerald-300">{profileMessage}</p>}
                {profileError && <p className="rounded-xl border border-red-800/50 bg-red-950/40 p-3 text-xs text-red-300">{profileError}</p>}
                <label className="block text-xs font-bold uppercase text-gray-400">Username<input required value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm font-normal normal-case text-white focus:border-amber-500 focus:outline-none" /></label>
                <label className="block text-xs font-bold uppercase text-gray-400">New password<input type="password" minLength="8" value={profileForm.password} onChange={(event) => setProfileForm({ ...profileForm, password: event.target.value })} placeholder="Leave blank to keep current password" className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm font-normal normal-case text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" /></label>
                <label className="block text-xs font-bold uppercase text-gray-400">Confirm new password<input type="password" minLength="8" value={profileForm.confirmPassword} onChange={(event) => setProfileForm({ ...profileForm, confirmPassword: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm font-normal normal-case text-white focus:border-amber-500 focus:outline-none" /></label>
                <button type="submit" disabled={profileLoading} className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{profileLoading ? 'Saving...' : 'Save profile settings'}</button>
              </form>

              <div className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
                <div>
                  <h3 className="font-semibold text-white">Appearance</h3>
                  <p className="mt-1 text-xs text-gray-400">Choose the display mode that is most comfortable for your eyes.</p>
                </div>
                <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex w-full items-center justify-between rounded-xl border border-gray-800 bg-gray-950 p-4 text-left">
                  <span><span className="block text-sm font-semibold text-white">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span><span className="mt-1 block text-xs text-gray-400">Saved automatically for this browser.</span></span>
                  {theme === 'dark' ? <Moon className="text-amber-400" /> : <Sun className="text-amber-400" />}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ADD/EDIT PRODUCT MODAL */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId ? 'Edit Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Caramel Macchiato"
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="Espresso">Espresso</option>
                  <option value="Non-Coffee">Non-Coffee</option>
                  <option value="Pastries">Pastries</option>
                  <option value="Add-ons">Add-ons</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Price (₱)</label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="150"
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="avail"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded bg-gray-950 border-gray-800 focus:ring-amber-500"
                />
                <label htmlFor="avail" className="text-sm font-semibold text-gray-300">
                  Available for sale on POS
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-amber-900/20 transition"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingStaffId ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h3>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              {staffError && <p className="rounded-xl border border-red-800/50 bg-red-950/40 p-3 text-xs text-red-300">{staffError}</p>}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffFormData.name}
                  onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  placeholder="e.g., Juan Dela Cruz"
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {!editingStaffId && <><div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Username</label>
                <input type="text" required value={staffFormData.username} onChange={(e) => setStaffFormData({ ...staffFormData, username: e.target.value })} placeholder="e.g., juan.barista" className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500" />
              </div><div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Login Email</label>
                <input type="email" required value={staffFormData.email} onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })} placeholder="juan@example.com" className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500" />
              </div><div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Temporary Password</label>
                <input type="password" minLength="8" required value={staffFormData.password} onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })} placeholder="At least 8 characters" className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500" />
                <p className="mt-1 text-[11px] text-gray-500">Give this temporary password to the barista securely.</p>
              </div></>}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Role / Position</label>
                <input
                  type="text"
                  required
                  value={staffFormData.role}
                  onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                  placeholder="e.g., Barista / Cashier"
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Shift</label>
                <select
                  value={staffFormData.shift}
                  onChange={(e) => setStaffFormData({ ...staffFormData, shift: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="Morning">Morning Shift</option>
                  <option value="Closing">Closing Shift</option>
                  <option value="Full-Day">Full-Day Shift</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Employment Status</label>
                <select
                  value={staffFormData.status}
                  onChange={(e) => setStaffFormData({ ...staffFormData, status: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="pos-access-check"
                  checked={staffFormData.posAccess}
                  onChange={(e) => setStaffFormData({ ...staffFormData, posAccess: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded bg-gray-950 border-gray-800 focus:ring-amber-500"
                />
                <label htmlFor="pos-access-check" className="text-sm font-semibold text-gray-300">
                  Allow POS Tablet Login Access
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-amber-900/20 transition"
                >
                  {staffLoading ? 'Creating account...' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Reset staff password</h3>
            <p className="mt-2 text-sm text-gray-400">Create a temporary password for {resetStaff.name}. The staff member should change it after signing in.</p>
            <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
              {staffError && <p className="rounded-xl border border-red-800/50 bg-red-950/40 p-3 text-xs text-red-300">{staffError}</p>}
              <input type="password" required minLength="8" autoFocus value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetStaff(null)} className="flex-1 rounded-xl bg-gray-800 py-3 text-sm font-semibold text-gray-300">Cancel</button>
                <button type="submit" disabled={resetLoading} className="flex-1 rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white disabled:opacity-50">{resetLoading ? 'Resetting...' : 'Reset password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}