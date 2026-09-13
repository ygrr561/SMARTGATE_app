import React, { useState } from 'react';
import { useWebSocket } from '../../context/WebSocketContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { RiskScoreBadge } from './RiskScoreBadge.js';
import { CheckCircle2, XCircle, UserCheck, ShieldAlert, Phone, Car, MapPin, Clock } from 'lucide-react';

export const LiveApprovalModal: React.FC<{ onActionComplete?: () => void }> = ({ onActionComplete }) => {
  const { incomingVisitorRequest, setIncomingVisitorRequest, playChime } = useWebSocket();
  const { user } = useAuth();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!incomingVisitorRequest) return null;
  const visitor = incomingVisitorRequest;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await api.approveVisitor(visitor.id, user?.name);
      playChime('success');
      setIncomingVisitorRequest(null);
      if (onActionComplete) onActionComplete();
    } catch (e) {
      console.error('Failed to approve visitor:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await api.rejectVisitor(visitor.id, rejectReason || 'Resident unavailable or denied entry', user?.name);
      playChime('ping');
      setIncomingVisitorRequest(null);
      setShowRejectInput(false);
      setRejectReason('');
      if (onActionComplete) onActionComplete();
    } catch (e) {
      console.error('Failed to reject visitor:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Urgent header bar */}
        <div className="bg-amber-600 px-6 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white animate-ping" />
            <h3 className="font-semibold text-base tracking-tight">Incoming Visitor at Gate</h3>
          </div>
          <span className="text-xs font-mono bg-amber-700/80 px-2 py-0.5 rounded text-amber-100">
            Flat {visitor.flatNumber}
          </span>
        </div>

        <div className="p-6 space-y-5">
          {/* Visitor Card Details */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600 text-2xl font-bold shrink-0 shadow-xs">
              {visitor.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-lg font-bold text-neutral-900 truncate">{visitor.name}</h4>
                <RiskScoreBadge
                  score={visitor.riskScore || 20}
                  level={visitor.riskLevel || 'LOW'}
                  factors={visitor.riskFactors}
                />
              </div>

              <div className="mt-1 flex flex-wrap gap-y-1 gap-x-3 text-xs text-neutral-600">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  {visitor.phone}
                </span>
                {visitor.vehicleNumber && (
                  <span className="flex items-center gap-1 font-mono">
                    <Car className="w-3.5 h-3.5 text-neutral-400" />
                    {visitor.vehicleNumber} ({visitor.vehicleType || 'VEHICLE'})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Visit metadata */}
          <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Stated Purpose:</span>
              <span className="text-neutral-900 font-semibold">{visitor.purpose}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Visitor Type:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-200/70 text-neutral-800">
                {visitor.type}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Reporting Gate:</span>
              <span className="text-neutral-700 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-neutral-400" />
                {visitor.gateEntered || 'Gate 1 - Main Gate'} ({visitor.guardName || 'Security'})
              </span>
            </div>
          </div>

          {/* AI Security assessment notice */}
          {visitor.riskScore >= 50 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Security Advisory:</strong> SmartGate AI flagged this visitor due to {visitor.riskFactors?.join(', ') || 'unusual check-in pattern'}. Please verify identity before approval.
              </div>
            </div>
          )}

          {/* Reject reason input */}
          {showRejectInput && (
            <div className="space-y-2 animate-in fade-in duration-150">
              <label className="text-xs font-medium text-neutral-700 block">Decline Reason (shared with Gate Guard):</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Not expecting any visitor, resident not home..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {!showRejectInput ? (
              <button
                type="button"
                id="btn-deny-visitor"
                onClick={() => setShowRejectInput(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-sm transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Deny Entry
              </button>
            ) : (
              <button
                type="button"
                id="btn-confirm-deny-visitor"
                disabled={isSubmitting}
                onClick={handleReject}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Confirm Deny
              </button>
            )}

            <button
              type="button"
              id="btn-approve-visitor"
              disabled={isSubmitting}
              onClick={handleApprove}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
