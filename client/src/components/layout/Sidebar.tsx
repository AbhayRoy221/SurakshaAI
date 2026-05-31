import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Bell, Network, Bot, BarChart3, ClipboardList, Settings, ChevronLeft, ChevronRight, Shield, Radio } from 'lucide-react';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/alerts', icon: Bell, label: 'Alerts' },
    { to: '/collusion', icon: Network, label: 'Collusion Graph' },
    { to: '/assistant', icon: Bot, label: 'AI Assistant' },
    { to: '/behavioral', icon: BarChart3, label: 'Behavioral Analytics' },
    ...(user?.role === 'compliance' || user?.role === 'ciso' ? [{ to: '/compliance', icon: ClipboardList, label: 'Compliance' }] : []),
    ...(user?.role === 'ciso' ? [{ to: '/pipeline', icon: Radio, label: 'Pipeline Monitor' }] : []),
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full bg-navy-900 border-r border-navy-700 z-40 transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-navy-700 gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center flex-shrink-0">
          <Shield size={18} className="text-navy-950" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-white leading-tight">SurakshaAI</h1>
            <p className="text-[10px] text-mint/70 leading-tight">Protecting Banks from Within</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
              isActive
                ? 'bg-mint/10 text-mint border border-mint/20'
                : 'text-gray-400 hover:bg-navy-800 hover:text-white border border-transparent'
            }`}
          >
            <item.icon size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-12 flex items-center justify-center border-t border-navy-700 text-gray-500 hover:text-mint transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
