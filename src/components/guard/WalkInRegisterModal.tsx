import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { RiskScoreBadge } from '../common/RiskScoreBadge.js';
import { UserPlus, Sparkles, X, Phone, Car, MapPin, Building, ShieldAlert } from 'lucide-react';
import type { Visitor } from '../../types/index.js';

interface WalkInRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (visitor: Visitor) => void;
}

export const WalkInRegisterModal: React.FC<WalkInRegisterModalProps> = ({ isOpen, onClose, onRegistered }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [flatNumber, setFlatNumber] = useState('A-402');
  const [purpose, setPurpose] = useState('Service & Repair');
  const [type, setType] = useState<Visitor['type']>('SERVICE');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<Visitor['vehicleType']>('BIKE');
  const [numberOfVisitors, setNumberOfVisitors] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [previewRisk, setPreviewRisk] = useState<{ riskScore: number; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; factors: string[] } | null>(null);

  if (!isOpen) return null;

  // Live risk score preview
  const checkRisk = async () => {
    if (!name || !phone) return;
    try {
      const res = await api.getVisitorRiskScore({
        name,
        phone,
        flatNumber,
        isPreApproved: false,
        purpose,
        vehicleNumber,
      });
      setPreviewRisk(res);
    } catch (e) {
      console.warn('Risk check preview error:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !flatNumber) return;

    setIsLoading(true);
    try {
      const visitor = await api.registerWalkIn({
        name,
        phone,
        flatNumber,
        purpose,
        type,
        vehicleNumber: vehicleNumber || undefined,
        vehicleType,
        numberOfVisitors,
        guardName: user?.name || 'Vikram Singh',
        gateEntered: user?.guardGate || 'Gate 1 - Main Gate',
      });
      onRegistered(visitor);
      onClose();
      // Reset form
      setName('');
      setPhone('');
      setVehicleNumber('');
      setPreviewRisk(null);
    } catch (err) {
      console.error('Failed to register walk-in:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base tracking-tight">Gate Walk-In Registration</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Visitor Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Santosh Kumar"
                value={name}
                onBlur={checkRisk}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Visitor Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98222 33445"
                  value={phone}
                  onBlur={checkRisk}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Visiting Flat *
              </label>
              <select
                value={flatNumber}
                onChange={(e) => { setFlatNumber(e.target.value); checkRisk(); }}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-neutral-900"
              >
                <option value="A-402">Flat A-402 (Rahul Sharma)</option>
                <option value="B-201">Flat B-201 (Priya Patel)</option>
                <option value="A-102">Flat A-102 (Amitav Roy)</option>
                <option value="A-601">Flat A-601 (Col. R. K. Nair)</option>
                <option value="B-504">Flat B-504 (Sneha Reddy)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="GUEST">Guest</option>
                <option value="DELIVERY">Delivery</option>
                <option value="SERVICE">Service & Repair</option>
                <option value="CAB">Cab Driver</option>
                <option value="DOMESTIC_HELP">Domestic Staff</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Visitor Count
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={numberOfVisitors}
                onChange={(e) => setNumberOfVisitors(Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Purpose / Organization *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Urban Company AC Technician, Airtel Fiber repair, Personal guest..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Vehicle Plate (Optional)
              </label>
              <div className="relative">
                <Car className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="KA-05-EX-9912"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="BIKE">Two-Wheeler</option>
                <option value="CAR">Car</option>
                <option value="CAB">Cab / Auto</option>
                <option value="NONE">Pedestrian</option>
              </select>
            </div>
          </div>

          {/* AI Risk Score preview badge */}
          {previewRisk && (
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs animate-in fade-in">
              <span className="text-neutral-600 font-medium">Pre-Entry Security Risk Analysis:</span>
              <RiskScoreBadge
                score={previewRisk.riskScore}
                level={previewRisk.riskLevel}
                factors={previewRisk.factors}
              />
            </div>
          )}

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Instant Real-Time Notification:</strong> Submitting will immediately ring Flat {flatNumber} intercom and send a live approval push with photo and risk level to the resident's mobile app.
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name || !phone}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Notifying Resident...' : 'Send Approval Request to Resident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
