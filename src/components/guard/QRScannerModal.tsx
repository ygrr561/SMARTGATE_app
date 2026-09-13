import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useWebSocket } from '../../context/WebSocketContext.js';
import { api } from '../../services/api.js';
import { RiskScoreBadge } from '../common/RiskScoreBadge.js';
import { QrCode, X, Camera, CheckCircle2, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import type { Visitor } from '../../types/index.js';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntryGranted: (visitor: Visitor) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onEntryGranted }) => {
  const { user } = useAuth();
  const { playChime } = useWebSocket();
  const [passCode, setPassCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [scannedVisitor, setScannedVisitor] = useState<Visitor | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAdmitting, setIsAdmitting] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || passCode).trim().toUpperCase();
    if (!code) return;

    setIsVerifying(true);
    setErrorMsg('');
    setScannedVisitor(null);

    try {
      const res = await api.verifyVisitorCode(code);
      if (res.valid && res.visitor) {
        setScannedVisitor(res.visitor);
        playChime('success');
      } else {
        setErrorMsg(res.message || 'Pass code not found or already expired.');
        playChime('ping');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Pass verification failed. Please check code.');
      playChime('ping');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGrantEntry = async () => {
    if (!scannedVisitor) return;
    setIsAdmitting(true);
    try {
      const admitted = await api.recordVisitorEntry(
        scannedVisitor.id,
        user?.guardGate || 'Gate 1 - Main Gate',
        user?.name || 'Vikram Singh'
      );
      playChime('success');
      onEntryGranted(admitted);
      handleReset();
    } catch (err) {
      console.error('Failed to grant entry:', err);
    } finally {
      setIsAdmitting(false);
    }
  };

  const handleReset = () => {
    setScannedVisitor(null);
    setPassCode('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base tracking-tight">QR & Digital Pass Scanner</h3>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!scannedVisitor ? (
            <div className="space-y-4">
              {/* Simulated Camera Viewfinder */}
              <div className="relative h-48 bg-neutral-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-neutral-800 text-white">
                <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-emerald-500/80 rounded-xl flex items-center justify-center">
                  <div className="w-full h-0.5 bg-emerald-400 shadow-sm shadow-emerald-400 animate-bounce" />
                </div>
                <div className="z-10 text-center space-y-1 bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-xs">
                  <Camera className="w-6 h-6 mx-auto text-emerald-400" />
                  <span className="text-xs text-neutral-300 font-medium">Position visitor's QR pass within view</span>
                </div>
              </div>

              {/* Code input form */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Or Enter Pass Code Manually:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. SG-4920"
                    value={passCode}
                    onChange={(e) => setPassCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                    className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-neutral-300 font-mono uppercase font-bold tracking-wider focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    id="btn-verify-pass"
                    disabled={isVerifying || !passCode}
                    onClick={() => handleVerify()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Pass'}
                  </button>
                </div>
              </div>

              {/* Quick test buttons for easy demonstration */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                  Quick Demo Pass Codes:
                </span>
                <div className="flex flex-wrap gap-2">
                  {['SG-4920', 'SG-7731', 'SG-9012'].map((sampleCode) => (
                    <button
                      key={sampleCode}
                      type="button"
                      onClick={() => {
                        setPassCode(sampleCode);
                        handleVerify(sampleCode);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 hover:border-emerald-500 font-mono text-xs font-semibold text-neutral-800 transition-colors cursor-pointer"
                    >
                      {sampleCode}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* Verified Visitor Approval Card */
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950">Valid Digital Pass Verified</h4>
                    <span className="text-[11px] text-emerald-700 font-mono">{scannedVisitor.passCode}</span>
                  </div>
                </div>
                <RiskScoreBadge
                  score={scannedVisitor.riskScore}
                  level={scannedVisitor.riskLevel}
                  factors={scannedVisitor.riskFactors}
                />
              </div>

              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 text-xs space-y-2 text-neutral-700">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Visitor Name:</span>
                  <strong className="text-neutral-900">{scannedVisitor.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Mobile:</span>
                  <span className="font-mono">{scannedVisitor.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Destination Flat:</span>
                  <strong className="text-neutral-900">Flat {scannedVisitor.flatNumber} ({scannedVisitor.residentName})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Purpose:</span>
                  <span>{scannedVisitor.purpose}</span>
                </div>
                {scannedVisitor.vehicleNumber && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Vehicle:</span>
                    <span className="font-mono font-bold text-neutral-800">
                      {scannedVisitor.vehicleNumber} ({scannedVisitor.vehicleType})
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">Current Status:</span>
                  <span className="font-semibold text-emerald-700 uppercase">{scannedVisitor.status}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setScannedVisitor(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Scan Another
                </button>
                <button
                  type="button"
                  id="btn-admit-barrier"
                  disabled={isAdmitting}
                  onClick={handleGrantEntry}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isAdmitting ? 'Logging Entry...' : 'Admit Visitor & Open Boom Barrier'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
