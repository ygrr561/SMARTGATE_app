import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { WebSocketProvider } from './context/WebSocketContext.js';
import { Header } from './components/layout/Header.js';
import { ResidentDashboard } from './components/resident/ResidentDashboard.js';
import { GuardTerminal } from './components/guard/GuardTerminal.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { LiveApprovalModal } from './components/common/LiveApprovalModal.js';
import { SOSModal } from './components/common/SOSModal.js';
import { Shield, Sparkles, Building2, Phone, CheckCircle2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar with Role Switcher */}
      <Header onOpenSOS={() => setIsSOSModalOpen(true)} />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {user?.role === 'RESIDENT' && <ResidentDashboard />}
        {user?.role === 'GUARD' && <GuardTerminal />}
        {user?.role === 'ADMIN' && <AdminDashboard />}
      </main>

      {/* Global Interactive Overlays */}
      <LiveApprovalModal />
      <SOSModal isOpen={isSOSModalOpen} onClose={() => setIsSOSModalOpen(false)} />

      {/* Compact System Status Footer */}
      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-xs py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">SmartGate AI Engine:</span>
            <span>All telemetry operational • Gate 1 & 2 Online</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Security Intercom: <strong className="text-slate-700">Ext 1000</strong></span>
            <span>•</span>
            <span>Gate Helpline: <strong className="text-slate-700">+91 80 4912 0000</strong></span>
            <span>•</span>
            <span className="font-mono text-slate-400">Greenwood Heights Society v2.4</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <AppContent />
      </WebSocketProvider>
    </AuthProvider>
  );
}
