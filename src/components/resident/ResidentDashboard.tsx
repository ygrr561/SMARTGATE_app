import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useWebSocket } from '../../context/WebSocketContext.js';
import { api } from '../../services/api.js';
import { RiskScoreBadge } from '../common/RiskScoreBadge.js';
import { PreApproveModal } from './PreApproveModal.js';
import { ComplaintModal } from './ComplaintModal.js';
import { PaymentModal } from './PaymentModal.js';
import {
  Users, QrCode, Package, CreditCard, Wrench, Calendar, Bell, Shield,
  Plus, CheckCircle2, XCircle, Clock, Car, Phone, MapPin, AlertTriangle,
  ChevronRight, Vote, FileText, Check
} from 'lucide-react';
import type {
  Visitor, Delivery, Vehicle, DomesticHelper, MaintenanceBill,
  Complaint, Amenity, Announcement, Poll, DocumentItem
} from '../../types/index.js';

export const ResidentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { playChime } = useWebSocket();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'VISITORS' | 'DELIVERIES' | 'HOUSEHOLD' | 'BILLS' | 'COMPLAINTS' | 'AMENITIES' | 'COMMUNITY'>('VISITORS');

  // Modals state
  const [isPreApproveOpen, setIsPreApproveOpen] = useState(false);
  const [isComplaintOpen, setIsComplaintOpen] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState<MaintenanceBill | null>(null);

  // Data states
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [domesticHelpers, setDomesticHelpers] = useState<DomesticHelper[]>([]);
  const [bills, setBills] = useState<MaintenanceBill[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Amenity booking form state
  const [selectedAmenityId, setSelectedAmenityId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState('2026-09-18');
  const [bookingSlot, setBookingSlot] = useState('18:00 - 20:00');

  const flatNumber = user?.flatNumber || 'A-402';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        visRes, delRes, vehRes, dhRes, billRes, cmpRes, amenRes, ancRes, pollRes, docRes
      ] = await Promise.all([
        api.getVisitors({ flatNumber }),
        api.getDeliveries(flatNumber),
        api.getVehicles(flatNumber),
        api.getDomesticHelp(flatNumber),
        api.getMaintenanceBills(flatNumber),
        api.getComplaints(flatNumber),
        api.getAmenities(),
        api.getAnnouncements(),
        api.getPolls(),
        api.getDocuments(),
      ]);

      setVisitors(visRes);
      setDeliveries(delRes);
      setVehicles(vehRes);
      setDomesticHelpers(dhRes);
      setBills(billRes);
      setComplaints(cmpRes);
      setAmenities(amenRes);
      setAnnouncements(ancRes);
      setPolls(pollRes);
      setDocuments(docRes);
    } catch (err) {
      console.error('Error loading resident data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [flatNumber]);

  const handleApproveVisitor = async (id: string) => {
    try {
      const updated = await api.approveVisitor(id, user?.name);
      setVisitors(prev => prev.map(v => v.id === id ? updated : v));
      playChime('success');
    } catch (err) {
      console.error('Failed to approve visitor:', err);
    }
  };

  const handleRejectVisitor = async (id: string) => {
    try {
      const updated = await api.rejectVisitor(id, 'Resident denied entry', user?.name);
      setVisitors(prev => prev.map(v => v.id === id ? updated : v));
      playChime('ping');
    } catch (err) {
      console.error('Failed to reject visitor:', err);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    try {
      const updated = await api.votePoll(pollId, optionId, user?.id || 'usr-res-1');
      setPolls(prev => prev.map(p => p.id === pollId ? updated : p));
      playChime('success');
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleBookAmenity = async (amenity: Amenity) => {
    try {
      await api.bookAmenity({
        amenityId: amenity.id,
        bookingDate,
        timeSlot: bookingSlot,
        totalGuests: 4,
        flatNumber,
        residentName: user?.name,
      });
      playChime('success');
      alert(`Booking confirmed for ${amenity.name} on ${bookingDate} (${bookingSlot})!`);
      setSelectedAmenityId('');
    } catch (err) {
      console.error('Booking failed:', err);
    }
  };

  const pendingApprovals = visitors.filter(v => v.status === 'PENDING_APPROVAL');
  const insideVisitors = visitors.filter(v => v.status === 'INSIDE' || v.status === 'OVERSTAY');
  const unpaidBill = bills.find(b => b.status === 'PENDING' || b.status === 'OVERDUE');

  return (
    <div className="space-y-6">
      {/* Resident Welcome & Quick Stat Row */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
                Resident Portal
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-xs text-neutral-300">Flat {flatNumber} • {user?.wing || 'Wing A'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Welcome back, {user?.name}
            </h2>
            <p className="text-xs text-neutral-300 mt-1">
              SmartGate AI has pre-screened all gate clearances for your residence today.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-quick-preapprove"
              onClick={() => setIsPreApproveOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              Pre-Approve Guest
            </button>
            <button
              type="button"
              id="btn-quick-complaint"
              onClick={() => setIsComplaintOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-indigo-400" />
              Log Ticket
            </button>
            {unpaidBill && (
              <button
                type="button"
                id="btn-quick-pay-dues"
                onClick={() => setSelectedBillForPay(unpaidBill)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Pay Dues (${unpaidBill.totalAmount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Pending Approval Alert Bar if visitor at gate */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-500/15 border-2 border-amber-500 rounded-2xl p-4 sm:p-5 text-neutral-900 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-600 animate-ping" />
              <h3 className="font-bold text-sm text-amber-950 uppercase tracking-wide">
                Visitor Awaiting Approval at Gate ({pendingApprovals.length})
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
              Immediate Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingApprovals.map((v) => (
              <div key={v.id} className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-neutral-900">{v.name}</h4>
                    <RiskScoreBadge score={v.riskScore} level={v.riskLevel} factors={v.riskFactors} compact />
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5">{v.purpose} • {v.phone}</p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">Gate: {v.gateEntered || 'Main Gate 1'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRejectVisitor(v.id)}
                    className="p-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Deny Entry"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveVisitor(v.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="border-b border-neutral-200">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-px">
          {[
            { id: 'VISITORS', label: 'Visitors & Passes', icon: Users, badge: insideVisitors.length > 0 ? insideVisitors.length : undefined },
            { id: 'DELIVERIES', label: 'Deliveries', icon: Package, badge: deliveries.filter(d => d.status === 'AT_GATE' || d.status === 'KEPT_AT_GATE').length || undefined },
            { id: 'HOUSEHOLD', label: 'Flat & Household', icon: Shield },
            { id: 'BILLS', label: 'Maintenance Bills', icon: CreditCard, badge: unpaidBill ? '!' : undefined },
            { id: 'COMPLAINTS', label: 'Helpdesk Tickets', icon: Wrench },
            { id: 'AMENITIES', label: 'Amenities', icon: Calendar },
            { id: 'COMMUNITY', label: 'Community & Notice', icon: Bell },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`resident-tab-${tab.id.toLowerCase()}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    tab.badge === '!' ? 'bg-rose-500 text-white' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT: 1. VISITORS & PASSES */}
      {activeTab === 'VISITORS' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Passes & Visitor History</h3>
              <p className="text-xs text-neutral-500">Live compound gate log for Flat {flatNumber}</p>
            </div>
            <button
              type="button"
              id="btn-tab-preapprove"
              onClick={() => setIsPreApproveOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Guest Pass
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visitors.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-xs hover:shadow-md transition-shadow space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">{v.name}</h4>
                    <span className="text-[11px] text-neutral-500 block">{v.purpose}</span>
                  </div>
                  <RiskScoreBadge score={v.riskScore} level={v.riskLevel} factors={v.riskFactors} compact />
                </div>

                <div className="space-y-1.5 text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Status:</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      v.status === 'INSIDE' ? 'bg-emerald-100 text-emerald-800' :
                      v.status === 'OVERSTAY' ? 'bg-rose-100 text-rose-800 font-bold' :
                      v.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-800' :
                      v.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                      'bg-neutral-200 text-neutral-700'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  {v.passCode && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Pass Code:</span>
                      <span className="font-mono font-bold text-neutral-900">{v.passCode}</span>
                    </div>
                  )}
                  {v.vehicleNumber && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Vehicle:</span>
                      <span className="font-mono text-neutral-800">{v.vehicleNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Time:</span>
                    <span>{v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : v.expectedTime || 'Today'}</span>
                  </div>
                </div>

                {v.status === 'PENDING_APPROVAL' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRejectVisitor(v.id)}
                      className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveVisitor(v.id)}
                      className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. DELIVERIES */}
      {activeTab === 'DELIVERIES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">E-Commerce & Food Deliveries</h3>
              <p className="text-xs text-neutral-500">Parcels received at security gate with Leave-at-Gate OTP codes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliveries.map((del) => (
              <div key={del.id} className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {del.company.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-neutral-900">{del.company} Parcel</h4>
                      <span className="text-[11px] text-neutral-500">Associate: {del.deliveryPersonName}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    del.status === 'KEPT_AT_GATE' ? 'bg-amber-100 text-amber-800' :
                    del.status === 'DELIVERED_TO_DOOR' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-indigo-100 text-indigo-800'
                  }`}>
                    {del.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="bg-neutral-50 rounded-xl p-3 text-xs space-y-1.5 text-neutral-600">
                  <div className="flex justify-between">
                    <span>Tracking Number:</span>
                    <span className="font-mono text-neutral-900 font-medium">{del.trackingNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Packages:</span>
                    <span>{del.packageCount} item(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Arrived At:</span>
                    <span>{new Date(del.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({del.gateEntered})</span>
                  </div>
                </div>

                {del.leaveAtGateOtp && del.status !== 'DELIVERED_TO_DOOR' && (
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-indigo-950 font-medium">Gate Pickup / Handover OTP:</span>
                    <span className="font-mono font-bold text-base text-indigo-700 tracking-wider">
                      {del.leaveAtGateOtp}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. HOUSEHOLD, VEHICLES & HELP */}
      {activeTab === 'HOUSEHOLD' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registered Vehicles */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-indigo-600" />
                Registered Resident Vehicles
              </h4>
              <span className="text-xs text-neutral-500 font-mono">Assigned Slot: P-{flatNumber}</span>
            </div>

            <div className="space-y-3">
              {vehicles.map((veh) => (
                <div key={veh.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-neutral-900 font-mono text-sm">{veh.registrationNumber}</div>
                    <div className="text-neutral-500 text-[11px]">{veh.brandModel} • {veh.color}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      veh.status === 'INSIDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {veh.status}
                    </span>
                    <div className="text-[10px] text-neutral-400 mt-1 font-mono">{veh.parkingSlot}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Domestic Staff */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Daily Domestic Helpers & Staff
              </h4>
              <span className="text-xs text-emerald-600 font-medium">Police Verified</span>
            </div>

            <div className="space-y-3">
              {domesticHelpers.map((dh) => (
                <div key={dh.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-neutral-900">{dh.name}</div>
                    <div className="text-neutral-500 text-[11px]">{dh.role} • Badge {dh.badgeNumber}</div>
                    <div className="text-[10px] text-neutral-400">Timings: {dh.allowedTimings}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      dh.status === 'INSIDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {dh.status === 'INSIDE' ? '● INSIDE COMPOUND' : 'OUTSIDE'}
                    </span>
                    <div className="text-[10px] text-neutral-500 mt-1">Rating: ★ {dh.rating}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. BILLS & RECEIPTS */}
      {activeTab === 'BILLS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Maintenance Bills & Payments</h3>
              <p className="text-xs text-neutral-500">Society monthly dues, utility split, and digital receipts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bills.map((bill) => (
              <div key={bill.id} className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">{bill.month}</h4>
                    <span className="text-[11px] text-neutral-500 font-mono">{bill.billNumber}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    bill.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                    bill.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {bill.status}
                  </span>
                </div>

                <div className="bg-neutral-50 rounded-xl p-3 text-xs space-y-1 text-neutral-600">
                  <div className="flex justify-between">
                    <span>Base Maintenance:</span>
                    <span>${bill.baseMaintenance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Parking & Water:</span>
                    <span>${bill.parkingCharges + bill.waterCharges}</span>
                  </div>
                  <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                    <span>Total Amount:</span>
                    <span className="font-mono text-indigo-700 text-sm">${bill.totalAmount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-500">
                    {bill.status === 'PAID'
                      ? `Paid via ${bill.paymentMethod} on ${new Date(bill.paidAt || '').toLocaleDateString()}`
                      : `Due on ${bill.dueDate}`}
                  </span>
                  {bill.status !== 'PAID' ? (
                    <button
                      type="button"
                      id={`btn-pay-${bill.id}`}
                      onClick={() => setSelectedBillForPay(bill)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Pay Now
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Receipt #{bill.transactionId}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. COMPLAINTS & TICKETS */}
      {activeTab === 'COMPLAINTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Facility Helpdesk Tickets</h3>
              <p className="text-xs text-neutral-500">AI-triaged maintenance issues with AMC vendor SLA tracking</p>
            </div>
            <button
              type="button"
              id="btn-raise-ticket"
              onClick={() => setIsComplaintOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Raise Ticket
            </button>
          </div>

          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-500">{c.ticketNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {c.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.priority === 'CRITICAL' || c.priority === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.priority} PRIORITY
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-neutral-900 mt-1">{c.title}</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold self-start sm:self-auto ${
                    c.status === 'RESOLVED' || c.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' :
                    c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-neutral-100 text-neutral-700'
                  }`}>
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">{c.description}</p>

                {c.assignedVendor && (
                  <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dispatched AMC Vendor: <strong className="text-neutral-800">{c.assignedVendor}</strong></span>
                  </div>
                )}

                {c.comments && c.comments.length > 0 && (
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 space-y-1.5 text-xs">
                    <span className="text-[10px] font-semibold uppercase text-neutral-400">Activity Log & Updates:</span>
                    {c.comments.map((cm) => (
                      <div key={cm.id} className="text-[11px] text-neutral-700">
                        <strong className="text-indigo-900">{cm.authorName}:</strong> {cm.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. AMENITIES */}
      {activeTab === 'AMENITIES' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Apartment Clubhouse & Amenities</h3>
              <p className="text-xs text-neutral-500">Instant reservation for banquet hall, swimming pool, and sports facilities</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {amenities.map((am) => (
              <div key={am.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs flex flex-col justify-between">
                <div className="h-44 relative bg-neutral-100 overflow-hidden">
                  <img
                    src={am.imageUrl}
                    alt={am.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-900/80 text-white backdrop-blur-xs">
                    {am.pricingType === 'FREE' ? 'Complimentary' : `$${am.ratePerHour}/hr`}
                  </span>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-base text-neutral-900">{am.name}</h4>
                    <p className="text-xs text-neutral-600 mt-1">{am.description}</p>
                    <div className="mt-2 text-[11px] text-neutral-500 space-y-0.5">
                      <div>📍 Location: {am.location}</div>
                      <div>⏰ Timings: {am.openingTime} - {am.closingTime} (Capacity: {am.capacity} persons)</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    {selectedAmenityId === am.id ? (
                      <div className="w-full space-y-2 animate-in fade-in">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="text-xs p-1.5 border border-neutral-300 rounded-lg bg-white"
                          />
                          <select
                            value={bookingSlot}
                            onChange={(e) => setBookingSlot(e.target.value)}
                            className="text-xs p-1.5 border border-neutral-300 rounded-lg bg-white"
                          >
                            <option value="07:00 - 09:00">07:00 - 09:00 AM</option>
                            <option value="10:00 - 12:00">10:00 - 12:00 PM</option>
                            <option value="16:00 - 18:00">16:00 - 18:00 PM</option>
                            <option value="18:00 - 20:00">18:00 - 20:00 PM</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAmenityId('')}
                            className="py-1 px-3 text-xs text-neutral-600 rounded-lg border hover:bg-neutral-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBookAmenity(am)}
                            className="flex-1 py-1 px-3 text-xs bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 cursor-pointer"
                          >
                            Confirm Reservation
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedAmenityId(am.id)}
                        className="w-full py-2 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Reserve Facility
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 7. COMMUNITY, NOTICE BOARD & POLLS */}
      {activeTab === 'COMMUNITY' && (
        <div className="space-y-6">
          {/* Active Polls */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <Vote className="w-4 h-4 text-indigo-600" />
              Resident Polls & Voting
            </h3>

            {polls.map((poll) => {
              const totalVotes = poll.options.reduce((acc, o) => acc + o.votes, 0);
              const hasVoted = poll.votedUserIds.includes(user?.id || '');

              return (
                <div key={poll.id} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">{poll.question}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">{poll.description}</p>
                  </div>

                  <div className="space-y-2">
                    {poll.options.map((opt) => {
                      const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                      return (
                        <div key={opt.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-neutral-800">{opt.text}</span>
                            <span className="font-mono text-neutral-500">{opt.votes} votes ({pct}%)</span>
                          </div>
                          <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                          {!hasVoted && (
                            <button
                              type="button"
                              onClick={() => handleVotePoll(poll.id, opt.id)}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                            >
                              Vote this option
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-neutral-200/60 text-[11px] text-neutral-400 flex justify-between">
                    <span>Status: Active</span>
                    <span>Total Community Votes: {totalVotes}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Announcements & Notices */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              Official Society Notice Board
            </h3>

            <div className="space-y-3">
              {announcements.map((anc) => (
                <div key={anc.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        anc.isUrgent ? 'bg-rose-100 text-rose-800' : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {anc.category}
                      </span>
                      <h4 className="font-bold text-sm text-neutral-900">{anc.title}</h4>
                    </div>
                    <span className="text-[10px] text-neutral-400">{new Date(anc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-neutral-600 leading-relaxed">{anc.content}</p>
                  <span className="text-[10px] text-neutral-400 block">Published by: {anc.publishedBy}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Documents & Byelaws */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Society Documents & Registered Bye-Laws
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="font-semibold text-neutral-900 truncate">{doc.title}</div>
                    <div className="text-[11px] text-neutral-500">{doc.category} • {doc.fileSize}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert(`Downloading: ${doc.title}`)}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] shrink-0 cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Modals */}
      <PreApproveModal
        isOpen={isPreApproveOpen}
        onClose={() => setIsPreApproveOpen(false)}
        onCreated={(v) => setVisitors(prev => [v, ...prev])}
      />

      <ComplaintModal
        isOpen={isComplaintOpen}
        onClose={() => setIsComplaintOpen(false)}
        onCreated={(c) => setComplaints(prev => [c, ...prev])}
      />

      <PaymentModal
        isOpen={Boolean(selectedBillForPay)}
        onClose={() => setSelectedBillForPay(null)}
        bill={selectedBillForPay}
        onPaid={(updated) => {
          setBills(prev => prev.map(b => b.id === updated.id ? updated : b));
        }}
      />
    </div>
  );
};
