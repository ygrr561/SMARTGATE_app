import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useWebSocket } from '../../context/WebSocketContext.js';
import { api } from '../../services/api.js';
import { RiskScoreBadge } from '../common/RiskScoreBadge.js';
import { QRScannerModal } from './QRScannerModal.js';
import { WalkInRegisterModal } from './WalkInRegisterModal.js';
import {
  Shield, QrCode, UserPlus, Package, Siren, CheckCircle2,
  XCircle, LogOut, Search, Clock, Car, Phone, AlertTriangle,
  RotateCcw, MapPin, Sparkles, Check, Users
} from 'lucide-react';
import type { Visitor, Delivery, DomesticHelper, EmergencyIncident, GuardPatrolCheckpoint } from '../../types/index.js';

export const GuardTerminal: React.FC = () => {
  const { user } = useAuth();
  const { playChime, activeSOSAlert, setActiveSOSAlert } = useWebSocket();

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);

  // Data
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [domesticHelpers, setDomesticHelpers] = useState<DomesticHelper[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyIncident[]>([]);
  const [checkpoints, setCheckpoints] = useState<GuardPatrolCheckpoint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New parcel modal
  const [showLogDelivery, setShowLogDelivery] = useState(false);
  const [delCompany, setDelCompany] = useState<'Amazon' | 'Swiggy' | 'Zomato' | 'Blinkit' | 'Courier'>('Amazon');
  const [delPerson, setDelPerson] = useState('');
  const [delPhone, setDelPhone] = useState('');
  const [delFlat, setDelFlat] = useState('A-402');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [visRes, delRes, dhRes, emgRes, cpRes] = await Promise.all([
        api.getVisitors(),
        api.getDeliveries(),
        api.getDomesticHelp(),
        api.getEmergencyIncidents(),
        api.getPatrolCheckpoints(),
      ]);
      setVisitors(visRes);
      setDeliveries(delRes);
      setDomesticHelpers(dhRes);
      setEmergencies(emgRes);
      setCheckpoints(cpRes);
    } catch (e) {
      console.error('Error loading guard terminal data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordExit = async (visitorId: string) => {
    try {
      const updated = await api.recordVisitorExit(visitorId, user?.guardGate || 'Gate 1 - Main Gate', user?.name);
      setVisitors(prev => prev.map(v => v.id === visitorId ? updated : v));
      playChime('ping');
    } catch (e) {
      console.error('Failed to record exit:', e);
    }
  };

  const handleOverride = async (visitorId: string) => {
    const reason = prompt('Please enter security override justification:');
    if (!reason) return;
    try {
      const updated = await api.overrideVisitor(visitorId, reason, user?.name);
      setVisitors(prev => prev.map(v => v.id === visitorId ? updated : v));
      playChime('success');
    } catch (e) {
      console.error('Override failed:', e);
    }
  };

  const handleToggleHelper = async (helperId: string) => {
    try {
      const updated = await api.toggleHelperAttendance(helperId, user?.name);
      setDomesticHelpers(prev => prev.map(dh => dh.id === helperId ? updated : dh));
      playChime('ping');
    } catch (e) {
      console.error('Helper attendance toggle error:', e);
    }
  };

  const handleScanCheckpoint = async (qrCode: string) => {
    try {
      const updated = await api.scanCheckpoint(qrCode, user?.name);
      setCheckpoints(prev => prev.map(cp => cp.qrCode === qrCode ? updated : cp));
      playChime('success');
      alert(`Checkpoint scanned: ${updated.name}`);
    } catch (e) {
      console.error('Checkpoint scan error:', e);
    }
  };

  const handleAcknowledgeSOS = async (id: string) => {
    try {
      const updated = await api.acknowledgeEmergency(id, user?.name);
      setEmergencies(prev => prev.map(emg => emg.id === id ? updated : emg));
      setActiveSOSAlert(null);
      playChime('ping');
    } catch (e) {
      console.error('Acknowledge emergency error:', e);
    }
  };

  const handleResolveSOS = async (id: string) => {
    const notes = prompt('Enter emergency resolution details:') || 'Security attended, resident safe.';
    try {
      const updated = await api.resolveEmergency(id, notes, user?.name);
      setEmergencies(prev => prev.map(emg => emg.id === id ? updated : emg));
      setActiveSOSAlert(null);
      playChime('success');
    } catch (e) {
      console.error('Resolve emergency error:', e);
    }
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delPerson || !delPhone) return;
    try {
      const item = await api.logDelivery({
        company: delCompany,
        deliveryPersonName: delPerson,
        phone: delPhone,
        flatNumber: delFlat,
        packageCount: 1,
        guardName: user?.name,
        gateEntered: user?.guardGate || 'Gate 1 - Main Gate',
      });
      setDeliveries(prev => [item, ...prev]);
      setShowLogDelivery(false);
      setDelPerson('');
      setDelPhone('');
      playChime('success');
    } catch (err) {
      console.error('Failed to log delivery:', err);
    }
  };

  // Filter visitors inside compound
  const insideVisitors = visitors.filter(v => v.status === 'INSIDE' || v.status === 'OVERSTAY');
  const filteredVisitors = insideVisitors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.flatNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.vehicleNumber && v.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingApprovals = visitors.filter(v => v.status === 'PENDING_APPROVAL');
  const activeSOS = emergencies.find(e => e.status !== 'RESOLVED');

  return (
    <div className="space-y-6">
      {/* Station Banner */}
      <div className="bg-neutral-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
              Terminal Active • {user?.guardGate || 'Gate 1 - Main Gate'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Gate Security Control Station
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Logged in Guard: <strong className="text-neutral-200">{user?.name}</strong> • Boom Barrier Clearance & AI Telemetry Active
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            id="btn-guard-scan-qr"
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            Scan Pass / QR Code
          </button>
          <button
            type="button"
            id="btn-guard-walk-in"
            onClick={() => setIsWalkInOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Register Walk-in Visitor
          </button>
          <button
            type="button"
            id="btn-guard-log-parcel"
            onClick={() => setShowLogDelivery(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            Log Parcel
          </button>
        </div>
      </div>

      {/* EMERGENCY SOS BANNER (If Active) */}
      {activeSOS && (
        <div className="bg-rose-600 text-white rounded-2xl p-5 shadow-xl border-2 border-rose-300 animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Siren className="w-6 h-6 animate-bounce text-white" />
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-wide">
                  CRITICAL RESIDENT SOS ALARM: Flat {activeSOS.flatNumber}
                </h3>
                <p className="text-xs text-rose-100">
                  {activeSOS.type} Emergency reported by {activeSOS.residentName} ({activeSOS.phone}). Dispatched at {new Date(activeSOS.triggeredAt).toLocaleTimeString()}.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white text-rose-700 font-mono font-bold text-xs rounded-lg uppercase">
              {activeSOS.status}
            </span>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            {activeSOS.status === 'TRIGGERED' && (
              <button
                type="button"
                id="btn-ack-sos"
                onClick={() => handleAcknowledgeSOS(activeSOS.id)}
                className="px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Acknowledge SOS (Attending to Flat)
              </button>
            )}
            <button
              type="button"
              id="btn-resolve-sos"
              onClick={() => handleResolveSOS(activeSOS.id)}
              className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              Clear & Mark Incident Resolved
            </button>
          </div>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Visitors Inside</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-neutral-900 font-mono">{insideVisitors.length}</span>
            {insideVisitors.some(v => v.status === 'OVERSTAY') && (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                Overstay Alert!
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Pending Approvals</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-600 font-mono">{pendingApprovals.length}</span>
            <span className="text-[11px] text-neutral-400">Awaiting resident</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Domestic Staff On-Duty</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              {domesticHelpers.filter(dh => dh.status === 'INSIDE').length}
            </span>
            <span className="text-[11px] text-neutral-400">of {domesticHelpers.length} helpers</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Gate Parcels Held</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-indigo-600 font-mono">
              {deliveries.filter(d => d.status === 'AT_GATE' || d.status === 'KEPT_AT_GATE').length}
            </span>
            <span className="text-[11px] text-neutral-400">awaiting pickup</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Inside Visitors Directory & Domestic Help */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visitors Inside Compound Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Active Visitors Inside Compound ({insideVisitors.length})
              </h3>
              <p className="text-xs text-neutral-500">Live tracker with overstay watchdog</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search visitor, flat, plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-full sm:w-56"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredVisitors.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-400">
                No active visitors currently recorded inside the premises.
              </div>
            ) : (
              filteredVisitors.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    v.status === 'OVERSTAY' ? 'bg-rose-50/70 border-rose-300' : 'bg-neutral-50 border-neutral-200/80 hover:bg-neutral-100/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-neutral-900">{v.name}</span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Flat {v.flatNumber}
                      </span>
                      <RiskScoreBadge score={v.riskScore} level={v.riskLevel} factors={v.riskFactors} compact />
                      {v.status === 'OVERSTAY' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase animate-pulse">
                          OVERSTAY ({'>'} 4h)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{v.purpose}</span>
                      <span>•</span>
                      <span>Phone: {v.phone}</span>
                      {v.vehicleNumber && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{v.vehicleNumber} ({v.vehicleType})</span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      Entered at {v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} via {v.gateEntered || 'Gate 1'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOverride(v.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-white text-xs font-semibold text-neutral-700 cursor-pointer"
                    >
                      Override
                    </button>
                    <button
                      type="button"
                      id={`btn-exit-${v.id}`}
                      onClick={() => handleRecordExit(v.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Record Exit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Domestic Staff Attendance & Patrol */}
        <div className="space-y-6">
          {/* Domestic Helpers 1-Tap Attendance */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Staff 1-Tap Attendance
              </h3>
              <span className="text-[11px] text-neutral-500">Tap to toggle</span>
            </div>

            <div className="space-y-2.5">
              {domesticHelpers.map((dh) => (
                <div
                  key={dh.id}
                  className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-neutral-900">{dh.name}</div>
                    <div className="text-[11px] text-neutral-500">{dh.role} • Badge {dh.badgeNumber}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleHelper(dh.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      dh.status === 'INSIDE'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                    }`}
                  >
                    {dh.status === 'INSIDE' ? 'INSIDE (Exit)' : 'OUTSIDE (Enter)'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Guard Patrol Checkpoints */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Patrol QR Checkpoints
              </h3>
              <span className="text-[11px] text-neutral-500">Guard NFC / QR</span>
            </div>

            <div className="space-y-2">
              {checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-neutral-900 truncate">{cp.name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{cp.zone} • {cp.qrCode}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleScanCheckpoint(cp.qrCode)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shrink-0 cursor-pointer"
                  >
                    Scan QR
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Log Delivery Modal */}
      {showLogDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Log E-Commerce Delivery</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogDelivery(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDelivery} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Carrier / Company</label>
                <select
                  value={delCompany}
                  onChange={(e) => setDelCompany(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white"
                >
                  <option value="Amazon">Amazon</option>
                  <option value="Swiggy">Swiggy</option>
                  <option value="Zomato">Zomato</option>
                  <option value="Blinkit">Blinkit</option>
                  <option value="Courier">BlueDart / DTDC Courier</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Destination Flat</label>
                <select
                  value={delFlat}
                  onChange={(e) => setDelFlat(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white"
                >
                  <option value="A-402">Flat A-402 (Rahul Sharma)</option>
                  <option value="B-201">Flat B-201 (Priya Patel)</option>
                  <option value="A-102">Flat A-102 (Amitav Roy)</option>
                  <option value="A-601">Flat A-601 (Col. R. K. Nair)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Delivery Person Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Imran Khan"
                  value={delPerson}
                  onChange={(e) => setDelPerson(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 97111 00000"
                  value={delPhone}
                  onChange={(e) => setDelPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogDelivery(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Log Parcel & Issue Gate OTP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded modals */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onEntryGranted={(v) => {
          setVisitors(prev => [v, ...prev.filter(x => x.id !== v.id)]);
        }}
      />

      <WalkInRegisterModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onRegistered={(v) => {
          setVisitors(prev => [v, ...prev]);
        }}
      />
    </div>
  );
};
