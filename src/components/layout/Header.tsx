import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useWebSocket } from '../../context/WebSocketContext.js';
import { SOSModal } from '../common/SOSModal.js';
import {
  Shield, ShieldCheck, Bell, Siren, Users, KeyRound, Radio, LogOut,
  ChevronDown, CheckCircle2, AlertTriangle, AlertCircle, X
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, role, switchUser, availableDemoUsers, logout } = useAuth();
  const { isConnected, liveNotifications, dismissNotification } = useWebSocket();
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Society Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-900 text-base tracking-tight leading-none">SmartGate</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  AI SECURE
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 font-medium tracking-tight mt-0.5">
                Greenwood Heights Apartments
              </div>
            </div>
          </div>

          {/* Center: Live Real-Time & Active Mode Indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse text-emerald-600' : 'text-amber-500'}`} />
              <span>{isConnected ? 'Real-time Event Bus Active' : 'Connecting Event Bus...'}</span>
            </div>

            {user?.role === 'GUARD' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-900 text-white font-mono">
                {user.guardGate || 'Gate 1 - Main Gate'}
              </span>
            )}
            {user?.role === 'RESIDENT' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Flat {user.flatNumber} • {user.wing}
              </span>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                id="role-switch-menu-btn"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 transition-colors cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full ${
                  role === 'RESIDENT' ? 'bg-indigo-600' :
                  role === 'GUARD' ? 'bg-emerald-600' : 'bg-purple-600'
                }`} />
                <span className="truncate max-w-[120px]">{user?.name}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-200/80 text-neutral-700">
                  {role}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              {showRoleMenu && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setShowRoleMenu(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Switch Test Persona:
                  </div>
                  {availableDemoUsers.map((demo) => {
                    const isSelected = demo.id === user?.id;
                    return (
                      <button
                        key={demo.id}
                        type="button"
                        onClick={() => switchUser(demo.id)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={demo.avatarUrl}
                            alt={demo.name}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                          />
                          <div>
                            <div className="font-semibold text-neutral-900">{demo.name}</div>
                            <div className="text-[10px] text-neutral-500">
                              {demo.role} {demo.flatNumber ? `• Flat ${demo.flatNumber}` : demo.guardGate ? `• ${demo.guardGate}` : ''}
                            </div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                id="btn-notif-bell"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {liveNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-2">
                    <span className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-indigo-600" />
                      Live Gate Events ({liveNotifications.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNotifMenu(false)}
                      className="text-neutral-400 hover:text-neutral-600 text-xs cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {liveNotifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-neutral-500">
                        No new events recorded in this session.
                      </div>
                    ) : (
                      liveNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border text-xs relative ${
                            n.type === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-950' :
                            n.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-950' :
                            n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' :
                            'bg-neutral-50 border-neutral-200 text-neutral-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold text-[11px] leading-tight">{n.title}</span>
                            <span className="text-[10px] text-neutral-400 font-mono shrink-0">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-neutral-600 mt-1 leading-snug">{n.message}</p>
                          <button
                            type="button"
                            onClick={() => dismissNotification(n.id)}
                            className="absolute top-1.5 right-1.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Resident Emergency SOS Trigger Button */}
            {role === 'RESIDENT' && (
              <button
                type="button"
                id="btn-header-sos"
                onClick={() => setIsSOSOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs tracking-tight shadow-sm shadow-rose-600/30 transition-all cursor-pointer animate-pulse hover:animate-none"
              >
                <Siren className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">SOS</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <SOSModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />
    </header>
  );
};
