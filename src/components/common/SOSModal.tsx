import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useWebSocket } from '../../context/WebSocketContext.js';
import { api } from '../../services/api.js';
import { AlertOctagon, Heart, Flame, ShieldAlert, PhoneCall, CheckCircle, X, Siren } from 'lucide-react';
import type { EmergencyType } from '../../types/index.js';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { playChime } = useWebSocket();
  const [selectedType, setSelectedType] = useState<EmergencyType>('MEDICAL');
  const [isTriggered, setIsTriggered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const emergencyOptions = [
    { type: 'MEDICAL' as EmergencyType, label: 'Medical Emergency', icon: Heart, desc: 'Ambulance, heart, sudden injury, illness', color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { type: 'FIRE' as EmergencyType, label: 'Fire Hazard / Smoke', icon: Flame, desc: 'Flames, burning smell, gas leak', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { type: 'SECURITY' as EmergencyType, label: 'Security / Intruder', icon: ShieldAlert, desc: 'Trespasser, theft, harassment, disturbance', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { type: 'LIFT_EMERGENCY' as EmergencyType, label: 'Elevator Entrapment', icon: AlertOctagon, desc: 'Stuck inside elevator car, door failure', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  ];

  const handleTriggerSOS = async () => {
    setIsLoading(true);
    try {
      await api.triggerSOS({
        type: selectedType,
        flatNumber: user?.flatNumber || 'A-402',
        residentName: user?.name || 'Resident',
        phone: user?.phone || '+91 98450 12345',
      });
      playChime('siren');
      setIsTriggered(true);
    } catch (err) {
      console.error('Failed to trigger emergency:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsTriggered(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Siren className="w-5 h-5 animate-pulse" />
            <h3 className="text-base font-bold tracking-tight">Emergency SOS Dispatch</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-rose-700/80 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!isTriggered ? (
            <>
              <div>
                <p className="text-xs text-neutral-600 font-medium">
                  Pressing SOS immediately activates the compound siren, flashes the guard station monitors at Gate 1 & Gate 2, and alerts facility management.
                </p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-lg text-xs font-mono font-semibold text-neutral-800">
                  <span>Dispatch Location: Flat {user?.flatNumber || 'A-402'} ({user?.wing || 'Wing A'})</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block">
                  Select Incident Type:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {emergencyOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setSelectedType(opt.type)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20 shadow-xs'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${opt.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-neutral-900">{opt.label}</div>
                          <div className="text-xs text-neutral-500 mt-0.5">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="btn-confirm-sos"
                  disabled={isLoading}
                  onClick={handleTriggerSOS}
                  className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Siren className="w-5 h-5 animate-bounce" />
                  {isLoading ? 'DISPATCHING SIREN...' : 'SOUND SOS ALARM NOW'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center animate-pulse">
                <Siren className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-neutral-900">SOS Alarm Broadcasted!</h4>
                <p className="text-xs text-neutral-600 max-w-xs mx-auto">
                  Security guards at Gate 1 and Gate 2 have received your alert for <strong className="text-rose-600">{selectedType}</strong> at Flat {user?.flatNumber}.
                </p>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs text-left space-y-2.5">
                <div className="flex items-center justify-between font-medium text-neutral-700">
                  <span>Main Gate Intercom:</span>
                  <a href="tel:080-4912-3001" className="text-emerald-700 font-mono font-bold flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5" /> 1001 (Gate 1)
                  </a>
                </div>
                <div className="flex items-center justify-between font-medium text-neutral-700">
                  <span>Facility Manager:</span>
                  <span className="font-mono font-bold">+91 98201 11223</span>
                </div>
                <div className="flex items-center justify-between font-medium text-neutral-700">
                  <span>City Ambulance:</span>
                  <span className="font-mono font-bold text-rose-600">108</span>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-sos"
                onClick={handleClose}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Emergency Screen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
