import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { RiskScoreBadge } from '../common/RiskScoreBadge.js';
import { QrCode, X, Check, Copy, Share2, Sparkles, User, Phone, Car, Clock } from 'lucide-react';
import type { Visitor } from '../../types/index.js';

interface PreApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (visitor: Visitor) => void;
}

export const PreApproveModal: React.FC<PreApproveModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('Family & Friends Visit');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'CAR' | 'BIKE' | 'CAB' | 'NONE'>('CAR');
  const [expectedTime, setExpectedTime] = useState('Today, Afternoon');
  const [numberOfVisitors, setNumberOfVisitors] = useState(1);
  const [createdPass, setCreatedPass] = useState<Visitor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsLoading(true);
    try {
      const visitor = await api.preApproveVisitor({
        name,
        phone,
        flatNumber: user?.flatNumber || 'A-402',
        residentName: user?.name || 'Rahul Sharma',
        purpose,
        vehicleNumber: vehicleNumber || undefined,
        vehicleType,
        expectedTime,
        numberOfVisitors,
      });
      setCreatedPass(visitor);
      onCreated(visitor);
    } catch (err) {
      console.error('Failed to create pass:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (createdPass?.passCode) {
      navigator.clipboard.writeText(createdPass.passCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setCreatedPass(null);
    setName('');
    setPhone('');
    setVehicleNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base tracking-tight">
              {createdPass ? 'Digital Entry Pass Ready' : 'Pre-Approve Visitor / Guest'}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!createdPass ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Visitor Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Desai"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98450 00000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Visit Purpose
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Family & Friends Visit">Family & Friends Visit</option>
                    <option value="Electrician / Plumber Repair">Electrician / Plumber Repair</option>
                    <option value="Home Delivery / Courier">Home Delivery / Courier</option>
                    <option value="Cab Pickup / Drop">Cab Pickup / Drop</option>
                    <option value="Tutor / Home Trainer">Tutor / Home Trainer</option>
                    <option value="Other Service">Other Service</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Expected Time / Slot
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. 15:30 PM Today"
                      value={expectedTime}
                      onChange={(e) => setExpectedTime(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Vehicle Number (Optional)
                  </label>
                  <div className="relative">
                    <Car className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="KA-01-AB-1234"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-300 font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="CAR">Car</option>
                    <option value="BIKE">Two-Wheeler / Bike</option>
                    <option value="CAB">Cab / Taxi</option>
                    <option value="NONE">Pedestrian / Walk-in</option>
                  </select>
                </div>
              </div>

              {/* AI Auto-Approval info */}
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">SmartGate AI Express Lane:</span> Pre-approved visitors bypass manual security interrogation. Guard terminal automatically validates the QR code for instant compound boom-barrier clearance.
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name || !phone}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? 'Generating Pass...' : 'Generate Pre-Approved Pass'}
                </button>
              </div>
            </form>
          ) : (
            /* Digital Pass Result Card */
            <div className="space-y-5 animate-in fade-in zoom-in-95">
              <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white p-5 rounded-2xl shadow-lg border border-neutral-700 relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-700/80 mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-semibold block">
                      Greenwood Heights • SmartGate Pass
                    </span>
                    <h4 className="text-base font-bold text-white">{createdPass.name}</h4>
                  </div>
                  <RiskScoreBadge
                    score={createdPass.riskScore}
                    level={createdPass.riskLevel}
                    compact
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] text-neutral-400 block">Destination Flat:</span>
                      <span className="font-bold text-sm text-neutral-100">Flat {createdPass.flatNumber}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-400 block">Host Resident:</span>
                      <span className="text-neutral-200">{createdPass.residentName}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-400 block">Purpose:</span>
                      <span className="text-neutral-200">{createdPass.purpose}</span>
                    </div>
                  </div>

                  {/* Simulated QR Code Canvas */}
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl text-neutral-900 shadow-xs">
                    <div className="w-24 h-24 bg-neutral-900 rounded-lg p-2 flex items-center justify-center text-white relative">
                      <QrCode className="w-20 h-20 text-white" />
                    </div>
                    <span className="text-[11px] font-mono font-bold tracking-wider mt-1 text-neutral-800">
                      {createdPass.passCode}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-700 flex items-center justify-between text-xs text-neutral-300">
                  <span>Pass Code: <strong className="font-mono text-indigo-300 text-sm tracking-wider">{createdPass.passCode}</strong></span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>

              <div className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                Share this pass code or QR with your visitor. Security guards will verify it at the boom barrier for instant entry.
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-neutral-300 hover:bg-neutral-50 font-semibold text-xs text-neutral-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  {copied ? 'Pass Code Copied!' : 'Share Pass via WhatsApp / SMS'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-2.5 px-5 rounded-xl bg-neutral-900 hover:bg-neutral-800 font-semibold text-xs text-white cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
