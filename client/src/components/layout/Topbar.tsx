import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Wifi } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  const roleBadgeColor = {
    ciso: 'bg-mint/20 text-mint border-mint/30',
    investigator: 'bg-info/20 text-info border-info/30',
    compliance: 'bg-warning/20 text-warning border-warning/30',
  };

  const roleLabels = { ciso: 'CISO', investigator: 'Investigator', compliance: 'Compliance Officer' };

  return (
    <header className="h-16 bg-navy-900/80 backdrop-blur-xl border-b border-navy-700 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-danger'}`} />
          <span className="font-mono text-xs">{connected ? 'System Active' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className={`text-xs px-3 py-1 rounded-full border font-medium ${roleBadgeColor[user?.role || 'investigator']}`}>
          {roleLabels[user?.role || 'investigator']}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mint/30 to-mint/10 flex items-center justify-center text-mint text-xs font-bold">
            {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <span className="text-sm text-gray-300 font-medium hidden md:block">{user?.name}</span>
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-navy-800" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
