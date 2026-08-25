'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { AuthService } from '@/features/auth';
import { normalizeError } from '@/lib/errors/error-handler';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Email address is required.');
      return false;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return; // Prevent duplicate submissions

    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await AuthService.signInWithPassword(email, password);
      router.replace('/');
    } catch (err) {
      const appErr = normalizeError(err);
      setErrorMessage(appErr.toUserMessage());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-blue-100">
      <div className="w-full max-w-6xl bg-[#FAF9F6] rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        {/* Left Hero Branding Column (7 cols) */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#FAF9F6] via-[#F1F5F9] to-[#E2E8F0]">
          {/* Watermark Background Text */}
          <div className="absolute -bottom-10 -left-10 text-[140px] font-black text-slate-200/40 select-none pointer-events-none tracking-tighter leading-none">
            RAMYAS
          </div>

          {/* Header Section */}
          <div className="space-y-6 z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-200 text-amber-900 font-extrabold text-xl flex items-center justify-center shadow-xs ring-4 ring-amber-50">
                R
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 tracking-wider uppercase">RAMYAS JEWELLER</h2>
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">MANAGEMENT SYSTEM</p>
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 tracking-tight leading-tight">
                Jewellery Savings Scheme Management
              </h1>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
                Manage customer savings with absolute confidence and the precision of heritage craftsmanship.
              </p>
            </div>
          </div>

          {/* Hero Jewelry Photo Container */}
          <div className="relative w-full max-w-md mx-auto my-6 rounded-3xl overflow-hidden border border-slate-200/80 shadow-2xl z-10 group">
            <img
              src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&auto=format&fit=crop&q=80"
              alt="Heritage Diamond & Gold Jewellery"
              className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/60 via-transparent to-transparent" />
          </div>

          {/* Left Footer */}
          <div className="z-10 text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>© 2026 Ramyas Jeweller</span>
            <span className="text-slate-400 font-mono">Dindigul • 624001</span>
          </div>
        </div>

        {/* Right Sign In Form Column (5 cols) */}
        <div className="lg:col-span-5 p-8 md:p-12 flex flex-col justify-between bg-white relative z-10">
          <div className="space-y-8 my-auto max-w-md mx-auto w-full">
            {/* Title Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-blue-950">Welcome Back</h2>
              <p className="text-xs text-slate-500 font-medium">Sign in to your dashboard</p>
            </div>

            {/* Error Message Area */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} noValidate className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="admin@ramyasjeweller.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="••••••••••••"
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Device Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-600 accent-blue-900 cursor-pointer disabled:opacity-50"
                />
                <label htmlFor="remember" className="text-xs text-slate-600 font-semibold cursor-pointer">
                  Remember this device
                </label>
              </div>

              {/* Royal Blue Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-[0.99] disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Assistance Row */}
            <div className="pt-2 text-center text-xs text-slate-500 font-medium">
              Admin assistance?{' '}
              <a href="#" className="font-bold text-blue-950 hover:underline">
                Contact Support
              </a>
            </div>
          </div>

          {/* Footer Links */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
            <a href="#" className="hover:text-slate-600">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600">Terms of Service</a>
            <a href="#" className="hover:text-slate-600">Security</a>
          </div>
        </div>
      </div>
    </div>
  );
}
