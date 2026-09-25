import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import logo from './images/logo-trc.png';
import { canInstallPwa, installPwa } from './pwaInstall';


import Login from './adminSite/adminLogin';
import Dashboard from './adminSite/adminDashboard';
import BaristaLogin from './baristaSite/baristaLogin';
import BaristaDashboard from './baristaSite/baristaDashboard';


function Home() {
  const [canInstall, setCanInstall] = useState(canInstallPwa);

  useEffect(() => {
    const updateInstallState = () => setCanInstall(canInstallPwa());
    window.addEventListener('pwa-install-available', updateInstallState);
    return () => window.removeEventListener('pwa-install-available', updateInstallState);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-stone-950 px-6 py-8 font-sans text-stone-100 sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
          <section className="space-y-8">
            <img src={logo} alt="Truly Rich Coffee" className="h-28 w-auto object-contain object-left sm:h-36" />
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-500">Welcome to the coffee house</p>
              <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
                Every cup is made to feel like home.
              </h1>
              <p className="max-w-xl text-base leading-8 text-stone-400 sm:text-lg">
                Truly Rich Coffee brings together carefully selected beans, smooth milk, and handcrafted drinks
                served fresh throughout the day. Use the workspace that matches your role to keep every order and
                ingredient moving smoothly.
              </p>
            </div>
            <div className="grid max-w-xl gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                <p className="text-2xl">☕</p>
                <p className="mt-3 text-sm font-semibold text-white">Freshly prepared</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">Made with care for every guest.</p>
              </div>
              <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                <p className="text-2xl">🌱</p>
                <p className="mt-3 text-sm font-semibold text-white">Quality ingredients</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">Thoughtfully stocked and tracked.</p>
              </div>
              <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                <p className="text-2xl">🤎</p>
                <p className="mt-3 text-sm font-semibold text-white">Made with heart</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">A warm experience in every order.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="mb-7">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">Choose your workspace</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-stone-400">Select the dashboard you need to open.</p>
            </div>
            <div className="space-y-4">
              {canInstall && (
                <button
                  type="button"
                  onClick={async () => {
                    await installPwa();
                    setCanInstall(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
                >
                  Install TRC POS on this tablet
                </button>
              )}
              <Link
                to="/barista/login"
                className="group block rounded-2xl border border-amber-600/50 bg-amber-600 p-5 transition hover:-translate-y-0.5 hover:bg-amber-500 hover:shadow-xl hover:shadow-amber-950/40"
              >
                <span className="flex items-center justify-between">
                  <span>
                    <span className="block text-lg font-bold text-white">Barista</span>
                    <span className="mt-1 block text-sm text-amber-100">Open the cashier and POS workspace</span>
                  </span>
                  <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
              <Link
                to="/admin/login"
                className="group block rounded-2xl border border-stone-700 bg-stone-800 p-5 transition hover:-translate-y-0.5 hover:border-stone-600 hover:bg-stone-700 hover:shadow-xl"
              >
                <span className="flex items-center justify-between">
                  <span>
                    <span className="block text-lg font-bold text-white">Admin</span>
                    <span className="mt-1 block text-sm text-stone-400">Manage reports, staff, and inventory</span>
                  </span>
                  <span className="text-2xl text-stone-300 transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </div>
            <p className="mt-8 text-center text-xs text-stone-500">
              Created by <span className="font-medium text-amber-500">Barista Ian G.</span>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function App() {
 return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/barista/login" element={<BaristaLogin />} />
        <Route path="/barista/dashboard" element={<BaristaDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
