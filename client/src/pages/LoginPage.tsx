import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: string) => {
    const emails: Record<string, string> = {
      ciso: 'ciso@unionbank.in',
      investigator: 'investigator@unionbank.in',
      compliance: 'compliance@unionbank.in',
    };
    setEmail(emails[role]);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-mint/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-danger/5 rounded-full blur-3xl" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(rgba(0,245,212,0.03) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center mx-auto mb-4 shadow-lg shadow-mint/20">
            <Shield size={32} className="text-navy-950" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">SurakshaAI</h1>
          <p className="text-mint/70 text-sm font-medium tracking-wide">Protecting Banks from Within</p>
          <p className="text-gray-500 text-xs mt-1">AI-Driven Early Warning System | Union Bank of India</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-center gap-2 text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-mint/50 focus:ring-1 focus:ring-mint/20 transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-mint/50 focus:ring-1 focus:ring-mint/20 transition-all pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-mint to-mint-dark text-navy-950 font-semibold py-3 rounded-lg hover:shadow-lg hover:shadow-mint/20 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Login */}
          <div className="mt-6 pt-6 border-t border-navy-700">
            <p className="text-xs text-gray-500 mb-3">Quick Login (Demo)</p>
            <div className="flex gap-2">
              {['ciso', 'investigator', 'compliance'].map(role => (
                <button
                  key={role}
                  onClick={() => quickLogin(role)}
                  className="flex-1 text-xs py-2 px-3 rounded-lg bg-navy-800 border border-navy-700 text-gray-300 hover:border-mint/30 hover:text-mint transition-all capitalize"
                >
                  {role === 'compliance' ? 'Compliance' : role.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">iDEA 2.0 Hackathon | Union Bank of India × KJ Somaiya</p>
      </div>
    </div>
  );
}
