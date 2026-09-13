import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { AIAssistantChat } from './AIAssistantChat.js';
import { RiskScoreBadge } from '../common/RiskScoreBadge.js';
import {
  ShieldAlert, Sparkles, Building, Users, CreditCard, Wrench,
  AlertTriangle, CheckCircle2, TrendingUp, Cpu, Activity, Search,
  Filter, FileText, Check, Clock, Phone, MapPin, Send
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import type {
  Flat, Visitor, MaintenanceBill, Complaint, SecurityAnomaly, AuditLog
} from '../../types/index.js';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AI_INTELLIGENCE' | 'DIRECTORY' | 'MAINTENANCE' | 'COMPLAINTS' | 'AUDIT'>('OVERVIEW');

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [anomalies, setAnomalies] = useState<SecurityAnomaly[]>([]);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [maintenanceData, setMaintenanceData] = useState<any[]>([]);
  const [maintenanceSummary, setMaintenanceSummary] = useState<any>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [flatSearch, setFlatSearch] = useState('');
  const [wingFilter, setWingFilter] = useState('ALL');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        statsRes, flatsRes, visRes, anomRes, trafRes, maintSumRes, predMaintRes, cmpRes, audRes
      ] = await Promise.all([
        api.getSystemStats(),
        api.getFlats(),
        api.getVisitors(),
        api.getAnomalies(),
        api.getTrafficPredictions(),
        api.getMaintenanceSummary(),
        api.getPredictiveMaintenance(),
        api.getComplaints(),
        api.getAuditLogs(),
      ]);

      setStats(statsRes);
      setFlats(flatsRes);
      setVisitors(visRes);
      setAnomalies(anomRes);
      setTrafficData(trafRes);
      setMaintenanceSummary(maintSumRes);
      setMaintenanceData(predMaintRes);
      setComplaints(cmpRes);
      setAuditLogs(audRes);
    } catch (e) {
      console.error('Error loading admin dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateComplaintStatus = async (id: string, newStatus: string) => {
    try {
      const updated = await api.updateComplaintStatus(id, { status: newStatus });
      setComplaints(prev => prev.map(c => c.id === id ? updated : c));
    } catch (e) {
      console.error('Failed to update complaint status:', e);
    }
  };

  const filteredFlats = flats.filter(f => {
    const matchesWing = wingFilter === 'ALL' || f.wing === wingFilter;
    const matchesSearch = f.number.toLowerCase().includes(flatSearch.toLowerCase()) ||
                          f.residentName.toLowerCase().includes(flatSearch.toLowerCase());
    return matchesWing && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Header */}
      <div className="bg-gradient-to-r from-neutral-900 via-indigo-950 to-neutral-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
              Management & Society Admin
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="text-xs text-neutral-300">Col. R. K. Nair (President)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Greenwood Heights Executive Operations
          </h2>
          <p className="text-xs text-neutral-300 mt-1">
            Real-time multi-gate security telemetrics, predictive AI equipment status, and financial health
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors cursor-pointer"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Flat Occupancy</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-neutral-900 font-mono">
              {stats?.occupiedFlats || 47}/{stats?.totalFlats || 48}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              98% Occupied
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">142 registered residents</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">September Maintenance</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              ${(maintenanceSummary?.collectedAmount || 16300).toLocaleString()}
            </span>
            <span className="text-[11px] text-neutral-500">collected</span>
          </div>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">
            ${(maintenanceSummary?.pendingAmount || 10950).toLocaleString()} pending ({maintenanceSummary?.defaultersCount || 2} defaulters)
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Today's Gate Traffic</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-indigo-600 font-mono">
              {stats?.totalVisitors || 5} Entries
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">({stats?.activeVisitors || 2} inside)</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Parking: {stats?.parkingOccupancyPct || 78}% occupied</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">AI Security & Health</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-600 font-mono">
              {anomalies.length} Alerts
            </span>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
              Active Watch
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">1 overstay • 1 elevator telemetry</span>
        </div>
      </div>

      {/* Admin Module Tabs */}
      <div className="border-b border-neutral-200">
        <div className="flex space-x-2 overflow-x-auto pb-px">
          {[
            { id: 'OVERVIEW', label: 'Executive Overview', icon: Building },
            { id: 'AI_INTELLIGENCE', label: 'SmartGate AI Telemetry', icon: Sparkles, badge: anomalies.length },
            { id: 'DIRECTORY', label: 'Flats & Residents', icon: Users },
            { id: 'MAINTENANCE', label: 'Billing & Defaulters', icon: CreditCard },
            { id: 'COMPLAINTS', label: 'Helpdesk SLA Tracking', icon: Wrench, badge: complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length },
            { id: 'AUDIT', label: 'Security Audit Trail', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`admin-tab-${tab.id.toLowerCase()}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. EXECUTIVE OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Top Row: AI Assistant & Security Anomaly Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Embedded Gemini AI Admin Assistant */}
            <AIAssistantChat />

            {/* Live Security Anomalies Feed */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Live Security Anomaly Alerts
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-500 font-medium">Real-time heuristics</span>
                </div>

                <div className="space-y-3 mt-3">
                  {anomalies.map((anom) => (
                    <div
                      key={anom.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        anom.severity === 'HIGH' ? 'bg-rose-50/70 border-rose-200 text-rose-950' : 'bg-amber-50/70 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{anom.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          anom.severity === 'HIGH' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {anom.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 leading-relaxed">{anom.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                        <span>Category: {anom.category}</span>
                        <span className="font-mono">Detected: {anom.detectedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compound Equipment Health Summary */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                <div className="font-semibold text-neutral-900 mb-1">Equipment Telemetry Status:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Wing A Elevator: <strong>Vibration Watch</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Diesel Generator: <strong>Operational (98%)</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>STP Water Pump: <strong>Optimal Pressure</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Rooftop Solar: <strong>Generating 44.2 kW</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Predictive Hourly Traffic Chart */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Predictive Gate Traffic & Entry Volume
                </h3>
                <p className="text-xs text-neutral-500">Historical AI regression model vs actual recorded arrivals across Gate 1 & Gate 2</p>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">Hourly Interval</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPredicted)" name="AI Predicted Traffic" />
                  <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" name="Actual Verified Entries" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 2. AI INTELLIGENCE & TELEMETRY */}
      {activeTab === 'AI_INTELLIGENCE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {maintenanceData.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-neutral-900">{item.equipment}</h4>
                      <span className="text-[11px] text-neutral-500">{item.location}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'ATTENTION_NEEDED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span>Health Score:</span>
                    <strong className="font-mono text-neutral-900">{item.healthScore}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Physical Service:</span>
                    <span>{item.lastServiceDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Scheduled Overhaul:</span>
                    <span className="text-indigo-600 font-semibold">{item.nextDueService}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failure Probability (30-day):</span>
                    <span className="font-mono text-amber-700 font-bold">{item.failureProbability30Days}%</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600">
                  <strong className="text-neutral-800">AI Telemetry Diagnostic:</strong> {item.telemetryNotes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. FLATS & RESIDENTS DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-neutral-900">Apartment Flats Directory</h3>
              <p className="text-xs text-neutral-500">48 Units in Greenwood Heights (Wing A & Wing B)</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={wingFilter}
                onChange={(e) => setWingFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white"
              >
                <option value="ALL">All Wings</option>
                <option value="Wing A">Wing A</option>
                <option value="Wing B">Wing B</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search flat number or resident..."
                  value={flatSearch}
                  onChange={(e) => setFlatSearch(e.target.value)}
                  className="text-xs pl-8 pr-3 py-2 rounded-xl border border-neutral-300 w-48 sm:w-60"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Flat</th>
                  <th className="py-2.5 px-3">Resident</th>
                  <th className="py-2.5 px-3">Intercom</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Parking Slot</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredFlats.map((flat) => (
                  <tr key={flat.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">{flat.number}</td>
                    <td className="py-2.5 px-3 font-medium text-neutral-800">{flat.residentName}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-600">{flat.intercomNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-600">{flat.residentPhone}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-700">{flat.parkingSlot}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        flat.status === 'OCCUPIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {flat.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MAINTENANCE BILLS & DEFAULTERS */}
      {activeTab === 'MAINTENANCE' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Maintenance Defaulters & Overdue Collection</h3>
                <p className="text-xs text-neutral-500">Units with outstanding balances for current billing cycles</p>
              </div>
            </div>

            <div className="space-y-3">
              {maintenanceSummary?.defaultersList?.map((d: any, i: number) => (
                <div key={i} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900 font-mono">Flat {d.flatNumber}</span>
                      <span className="text-neutral-700 font-medium">({d.residentName})</span>
                      {d.isOverdue && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <div className="text-neutral-500 text-[11px] mt-0.5">
                      Period: {d.month} • Due Date: {d.dueDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-rose-700">${d.amount}</span>
                    <button
                      type="button"
                      onClick={() => alert(`Digital payment notice & WhatsApp notification sent to ${d.residentName} (Flat ${d.flatNumber}).`)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Reminder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. HELPDESK TICKETS & SLA */}
      {activeTab === 'COMPLAINTS' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-neutral-900">Society Maintenance Complaints & AMC SLA</h3>
              <p className="text-xs text-neutral-500">Manage vendor assignments and resolution workflows</p>
            </div>
          </div>

          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-neutral-200 text-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-neutral-500">{c.ticketNumber}</span>
                      <span className="font-bold text-sm text-neutral-900">{c.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                        Flat {c.flatNumber}
                      </span>
                    </div>
                    <p className="text-neutral-600 mt-1">{c.description}</p>
                  </div>
                  <select
                    value={c.status}
                    onChange={(e) => handleUpdateComplaintStatus(c.id, e.target.value)}
                    className="text-xs p-1.5 rounded-lg border border-neutral-300 font-semibold bg-white"
                  >
                    <option value="REPORTED">REPORTED</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. SECURITY AUDIT TRAIL */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-neutral-900">Security & Operational Audit Logs</h3>
              <p className="text-xs text-neutral-500">Immutable ledger of gate clearances, authentications, and emergency actions</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs flex items-center justify-between">
                <div className="space-y-0.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-700">{log.action}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-neutral-200 text-neutral-800">
                      {log.category}
                    </span>
                  </div>
                  <p className="text-neutral-600">{log.details}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold text-neutral-800 block">{log.userName} ({log.userRole})</span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
