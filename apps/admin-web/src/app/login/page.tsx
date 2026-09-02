'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@ramyasjeweller.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsLoading(false);
        throw new Error(data.error || 'Invalid email or password. Please try again.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_user', JSON.stringify(data.user));
      }

      // Perform instant full navigation to dashboard
      window.location.href = '/customers';
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Invalid admin credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4 lg:p-8 font-sans selection:bg-[#4A0C1E] selection:text-white">
      {/* ── CENTERED CONTAINER FOR PERFECT ALIGNMENT ── */}
      <div className="w-full max-w-6xl bg-[#FAF8F5] rounded-3xl overflow-hidden shadow-2xl border border-slate-200/70 flex flex-col lg:flex-row min-h-[640px]">
        
        {/* ── LEFT PANEL: BRANDING & HERO IMAGE ── */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden bg-[#FAF8F5] border-r border-slate-200/50">
          {/* Background Watermark Text */}
          <div className="absolute -bottom-8 -left-8 text-[140px] font-black text-slate-200/40 select-none pointer-events-none tracking-widest z-0 leading-none">
            RAMYAS
          </div>

          <div className="relative z-10 space-y-5">
            {/* Logo Badge */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E8DFD5] flex items-center justify-center shadow-sm">
                <span className="text-[#854D0E] font-serif font-bold text-lg">R</span>
              </div>
              <div>
                <span className="text-xs font-extrabold tracking-widest text-[#4A0C1E] block uppercase">Ramyas</span>
                <span className="text-[10px] tracking-wider text-slate-400 font-semibold uppercase">Jeweller</span>
              </div>
            </div>

            {/* Heading Section */}
            <div className="pt-2 max-w-md">
              <h1 className="text-2xl lg:text-4xl font-extrabold text-[#4A0C1E] tracking-tight leading-tight font-serif">
                Jewellery Savings Scheme Management
              </h1>
              <p className="text-slate-600 text-xs lg:text-sm mt-2 leading-relaxed font-normal">
                Manage customer savings with absolute confidence and the precision of heritage craftsmanship.
              </p>
            </div>

            {/* Hero Image Card */}
            <div className="pt-2">
              <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 bg-[#3B0712] relative group max-w-sm">
                <img
                  src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80"
                  alt="Gold & Diamond Jewellery"
                  className="w-full h-[240px] lg:h-[270px] object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2A040D]/80 via-transparent to-transparent" />
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="relative z-10 pt-6">
            <p className="text-xs font-bold text-slate-500 tracking-wide">
              © 2024 Ramyas Jeweller
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL: LOGIN CARD ── */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-between bg-white">
          <div className="w-full max-w-sm mx-auto my-auto py-4">
            <div className="space-y-6">
              {/* Card Header */}
              <div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-[#4A0C1E] tracking-tight font-serif">
                  Welcome Back
                </h2>
                <p className="text-slate-500 text-xs lg:text-sm mt-1 font-medium">
                  Sign in to your dashboard
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleAdminLogin} className="space-y-4">
                {/* Email Address */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="admin@ramyasjeweller.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#FAF8F6] border border-[#F1E6EA] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#854D0E] focus:bg-white transition-all text-sm font-medium"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <a href="#" className="text-[11px] font-bold text-[#854D0E] hover:underline">
                      Forgot Password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-11 bg-[#FAF8F6] border border-[#F1E6EA] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#854D0E] focus:bg-white transition-all text-sm font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember This Device */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#4A0C1E] focus:ring-[#4A0C1E]"
                  />
                  <label htmlFor="remember" className="text-xs font-medium text-slate-600 select-none cursor-pointer">
                    Remember this device
                  </label>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#4A0C1E] hover:bg-[#380917] text-[#FCD34D] font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-70 active:scale-[0.99] cursor-pointer"
                >
                  <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Assistance Footer Inside Card */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">Admin assistance?</span>
                <a href="#" className="text-[#4A0C1E] font-bold hover:underline">
                  Contact Support
                </a>
              </div>
            </div>

            {/* Below Card Access Text */}
            <div className="text-center mt-6">
              <p className="text-xs font-medium text-slate-600">
                Don't have an account?{' '}
                <a href="#" className="text-[#4A0C1E] font-extrabold hover:underline">
                  Request access
                </a>
              </p>
            </div>
          </div>

          {/* Right Footer Links */}
          <div className="flex justify-center lg:justify-end space-x-6 text-[11px] text-slate-400 font-medium pt-4">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Security</a>
          </div>
        </div>
      </div>
    </div>
  );
}
