import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-navy-950">
      <Sidebar />
      <div className="ml-60 transition-all duration-300">
        <Topbar />
        <main className="p-6 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
