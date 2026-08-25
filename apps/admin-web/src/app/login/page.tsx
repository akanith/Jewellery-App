'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Shield, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@ramyasjeweller.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-6xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Hero Image Column (7 cols) - Screenshot 5 */}
        <div className="lg:col-span-7 bg-slate-900 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden group">
          {/* Top Logo & Title */}
          <div className="space-y-4 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
                R
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Ramyas Jeweller</h2>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">PREMIUM MANAGEMENT</p>
              </div>
            </div>

            <div className="pt-4 space-y-2 max-w-md">
              <h1 className="text-3xl font-black text-white leading-tight">
                Jewellery Savings Scheme Management
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Manage customer savings with absolute confidence and the precision of heritage craftsmanship.
              </p>
            </div>
          </div>

          {/* Gold Jewellery Heritage Photo Box */}
          <div className="relative w-full h-80 rounded-2xl overflow-hidden my-6 border border-slate-800 shadow-2xl z-10">
            <img
              src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80"
              alt="Heritage Gold Necklace"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          </div>

          {/* Footer */}
          <div className="z-10 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>© 2024 Ramyas Jeweller</span>
            <span>Dindigul • Tamil Nadu</span>
          </div>
        </div>

        {/* Right Sign In Form Column (5 cols) */}
        <div className="lg:col-span-5 p-8 md:p-12 flex flex-col justify-between bg-white">
          <div className="space-y-8 my-auto">
            {/* Form Title */}
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Welcome Back</h2>
              <p className="text-xs text-slate-500 mt-1">Sign in to your dashboard</p>
            </div>

            {/* Inputs Form */}
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ramyasjeweller.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <a href="#" className="text-[11px] font-bold text-amber-600 hover:underline">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Device Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="remember" className="text-xs text-slate-600 font-medium cursor-pointer">
                  Remember this device
                </label>
              </div>

              {/* Submit Button */}
              <Link
                href="/"
                className="w-full py-3.5 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-950/20 transition-all"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </form>

            {/* Admin Support Callout */}
            <div className="pt-2 text-center text-xs text-slate-500">
              Admin assistance?{' '}
              <a href="#" className="font-bold text-slate-900 hover:underline">
                Contact Support
              </a>
            </div>
          </div>

          {/* Footer Links */}
          <div className="pt-8 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
            <a href="#" className="hover:text-slate-600">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600">Terms of Service</a>
            <a href="#" className="hover:text-slate-600">Security</a>
          </div>
        </div>
      </div>
    </div>
  );
}
