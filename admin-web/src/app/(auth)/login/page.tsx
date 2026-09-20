'use client';

/**
 * RAMYAS JEWELLER - Luxury Split Login Page
 * Exact implementation matching the design specification:
 * Left: Brand showcase, serif heading, luxury necklace hero showcase, subtle RAMYAS watermark.
 * Right: Clean Welcome Back authentication card with email, password, remember me, Sign In button.
 * Bottom: Global copyright and policy links.
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMessage(error);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50/50 text-slate-900">
      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        
        {/* LEFT COLUMN: Brand Showcase & Hero Photo */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center relative select-none">
          {/* Brand Logo & Title Row */}
          <div className="flex items-start gap-4 mb-4">
            {/* Ramyas Monogram Badge */}
            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/80 border border-amber-200/80 shadow-sm flex flex-col items-center justify-center p-1">
              <span className="font-serif-luxury font-bold text-amber-800 text-lg sm:text-xl leading-none">R</span>
              <span className="text-[7px] sm:text-[8px] font-semibold text-amber-900 tracking-wider uppercase leading-tight mt-0.5">RAMYAS</span>
              <span className="text-[6px] text-amber-700 tracking-widest uppercase scale-90">JEWELLER</span>
            </div>

            {/* Main Header */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-serif-luxury font-bold text-[#0d52bd] tracking-tight leading-[1.15]">
                Jewellery Savings Scheme Management
              </h1>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg mb-8">
            Manage customer savings with absolute confidence and the precision of heritage craftsmanship.
          </p>

          {/* Luxury Jewellery Hero Image */}
          <div className="relative w-full max-w-lg aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 bg-slate-900">
            <Image
              src="/necklace-hero.jpg"
              alt="Ramyas Jeweller - Heritage Gold and Diamond Jewellery Showcase"
              fill
              className="object-cover object-center transition duration-500 hover:scale-105"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            />
          </div>

          {/* Bottom Background Watermark */}
          <div className="absolute -bottom-8 -left-4 pointer-events-none opacity-30 text-[#0d52bd]/10 font-serif-luxury font-black text-7xl sm:text-8xl lg:text-9xl tracking-widest uppercase z-[-1]">
            RAMYAS
          </div>
        </div>

        {/* RIGHT COLUMN: Clean White Auth Card */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl p-8 sm:p-10 shadow-lg shadow-slate-200/50 border border-slate-100">
            
            {/* Card Header */}
            <div className="mb-7">
              <h2 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-[#0d52bd]">
                Welcome Back
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 font-normal">
                Sign in to your dashboard
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aurelian.com"
                  className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d52bd]/20 focus:border-[#0d52bd] transition"
                />
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Please contact the Store Administrator to reset your password.')}
                    className="text-xs text-slate-500 hover:text-[#0d52bd] font-medium transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-11 py-3 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d52bd]/20 focus:border-[#0d52bd] transition tracking-widest font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                    aria-label={showPassword ? 'Hide secret' : 'Show secret'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember this device checkbox */}
              <div className="flex items-center pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#0d52bd] border-slate-300 rounded focus:ring-[#0d52bd]/30"
                  />
                  <span>Remember this device</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-[#0d52bd] hover:bg-[#0a4198] active:bg-[#08357a] text-white font-medium rounded-lg text-base shadow-sm hover:shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Card Support Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Admin assistance?{' '}
                <button
                  type="button"
                  onClick={() => alert('Support line: +91 98765 43210 or email admin@ramyasjeweller.com')}
                  className="font-semibold text-[#0d52bd] hover:underline"
                >
                  Contact Support
                </button>
              </p>
            </div>
          </div>

          {/* Under-card Request Access Link */}
          <div className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => alert('Account creation is restricted to verified store personnel. Please contact the Store Owner.')}
              className="font-semibold text-[#0d52bd] hover:underline"
            >
              Request access
            </button>
          </div>
        </div>

      </div>

      {/* Global Bottom Footer */}
      <footer className="w-full py-5 px-6 sm:px-12 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="font-medium text-[#0d52bd]/90">
          © 2024 Ramyas Jeweller
        </div>
        <div className="flex items-center gap-6 text-slate-600">
          <span className="hover:text-slate-900 cursor-pointer transition">Privacy Policy</span>
          <span className="hover:text-slate-900 cursor-pointer transition">Terms of Service</span>
          <span className="hover:text-slate-900 cursor-pointer transition">Security</span>
        </div>
      </footer>
    </div>
  );
}
