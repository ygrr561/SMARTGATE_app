import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { Wrench, Sparkles, AlertCircle, X, CheckCircle2, Clock } from 'lucide-react';
import type { Complaint } from '../../types/index.js';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (complaint: Complaint) => void;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<{
    category: string;
    priority: string;
    suggestedVendor: string;
    detectedIssue: string;
    estimatedResolutionHours: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setAiAnalysis(null);
      return;
    }
  }, [isOpen]);

  // Debounced NLP preview while typing
  useEffect(() => {
    const text = `${title} ${description}`.trim();
    if (text.length < 10) {
      setAiAnalysis(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.classifyComplaint(text);
        setAiAnalysis(res);
      } catch (err) {
        console.warn('NLP preview error:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [title, description]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsLoading(true);
    try {
      const complaint = await api.createComplaint({
        flatNumber: user?.flatNumber || 'A-402',
        residentName: user?.name || 'Rahul Sharma',
        title,
        description,
      });
      onCreated(complaint);
      onClose();
    } catch (err) {
      console.error('Failed to log complaint:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base tracking-tight">Raise Facility Ticket / Complaint</h3>
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
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Issue Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Passenger Elevator jerking or low utility water pressure..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Detailed Description *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe what happened, location (e.g. Wing A 4th floor), noise, leak severity, or time noticed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Real-time AI NLP Classification Card */}
          {aiAnalysis && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-xs space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between font-semibold text-indigo-950">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  AI Auto-Triage & Classification
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  aiAnalysis.priority === 'CRITICAL' || aiAnalysis.priority === 'HIGH'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {aiAnalysis.priority} PRIORITY
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-neutral-700">
                <div>
                  <span className="text-neutral-500 block">Category:</span>
                  <strong className="text-indigo-900 font-semibold">{aiAnalysis.category}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Assigned AMC Vendor:</span>
                  <strong className="text-indigo-900 font-semibold">{aiAnalysis.suggestedVendor}</strong>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-neutral-600 flex items-center gap-1.5 border-t border-indigo-100/70 mt-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Estimated Resolution: <strong>{aiAnalysis.estimatedResolutionHours} hours</strong> (SLA tracking enabled)</span>
              </div>
            </div>
          )}

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
              disabled={isLoading || !title || !description}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Submitting Ticket...' : 'Submit Ticket to Facility Desk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
