import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../shared/supabaseClient';

const AdminLogin = () => {

    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Handle Login Simulation
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!supabase) {
            setError('Supabase is not configured.');
            setIsLoading(false);
            return;
        }
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (!loginError && data.user) {
            const { data: profile, error: profileError } = await supabase.from('profiles').select('role, active').eq('id', data.user.id).single();
            if (profileError || profile?.role !== 'admin' || !profile.active) {
                await supabase.auth.signOut();
                setError('This account does not have active admin access.');
            } else {
            localStorage.setItem('isAdminAuthenticated', 'true');
            navigate('/admin/dashboard');
            }
        } else {
            setError(loginError?.message || 'Invalid email or password.');
        }
        setIsLoading(false);
    };

    return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 font-sans bg-gray-950 text-gray-100">
      
      {/* LEFT SIDE: Visual Brand Showcase */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-gray-900 via-amber-950/40 to-gray-950 border-r border-amber-900/20 overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-700/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Brand Logo */}
        <div className="flex items-center space-x-3 z-10">
          <div className="p-3 bg-amber-600/20 border border-amber-500/30 rounded-2xl backdrop-blur-md">
            <Coffee className="w-6 h-6 text-amber-500" />
          </div>
          <span className="font-bold tracking-wider text-lg uppercase bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            truly Rich Coffee 
          </span>
        </div>

        {/* Center Quote / Pitch */}
        <div className="z-10 max-w-md space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Management Portal
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Precision control for your coffee workflow.
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Manage your catalog, monitor item availability in real-time, and streamline your entire operations dashboard from a single command center.
          </p>
        </div>

        {/* Footer info */}
        <div className="z-10 text-xs text-gray-500">
          © {new Date().getFullYear()} Truly Rich Coffee System. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="flex items-center justify-center p-8 lg:p-16 bg-gray-950">
        <div className="w-full max-w-md space-y-8 bg-gray-900/60 p-8 rounded-3xl border border-gray-800/80 shadow-2xl backdrop-blur-xl">
          
          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-flex lg:hidden p-3 bg-amber-600/20 border border-amber-500/30 rounded-2xl mb-2">
              <Coffee className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome Back</h2>
            <p className="text-sm text-gray-400">Please sign in to access your administrative dashboard.</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@coffee.com"
                  className="w-full pl-11 pr-4 py-3 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Default credentials for testing: <span className="text-amber-400 font-mono">admin@coffee.com</span> / <span className="text-amber-400 font-mono">admin123</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}

export default AdminLogin;
