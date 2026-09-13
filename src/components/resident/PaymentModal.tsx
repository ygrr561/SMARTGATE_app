import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { CreditCard, QrCode, Building, CheckCircle2, Download, X, ShieldCheck } from 'lucide-react';
import type { MaintenanceBill } from '../../types/index.js';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: MaintenanceBill | null;
  onPaid: (updatedBill: MaintenanceBill) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, bill, onPaid }) => {
  const [method, setMethod] = useState<'UPI' | 'CARD' | 'NET_BANKING'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<MaintenanceBill | null>(null);

  if (!isOpen || !bill) return null;

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      const updated = await api.payMaintenanceBill(bill.id, method);
      setReceipt(updated);
      onPaid(updated);
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setReceipt(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base tracking-tight">
              {receipt ? 'Payment Receipt' : 'Pay Maintenance Dues'}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!receipt ? (
            <div className="space-y-4">
              {/* Bill Summary */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
                  <span className="font-semibold text-neutral-700">Flat {bill.flatNumber}</span>
                  <span className="font-mono text-neutral-500">{bill.billNumber}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Billing Period:</span>
                  <span className="font-medium text-neutral-800">{bill.month}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Base Maintenance:</span>
                  <span>${bill.baseMaintenance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Covered Parking Slot:</span>
                  <span>${bill.parkingCharges.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Common Water & Utilities:</span>
                  <span>${(bill.waterCharges + bill.utilityCharges).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-neutral-900 font-bold text-sm pt-2 border-t border-neutral-200">
                  <span>Total Due:</span>
                  <span className="text-indigo-600 font-mono">${bill.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-2">
                  Select Payment Option:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('UPI')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                      method === 'UPI'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
                    Instant UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('CARD')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                      method === 'CARD'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
                    Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('NET_BANKING')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                      method === 'NET_BANKING'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <Building className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
                    Net Banking
                  </button>
                </div>
              </div>

              {method === 'UPI' && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-center space-y-2">
                  <div className="w-28 h-28 bg-white border border-neutral-300 rounded-xl mx-auto flex items-center justify-center p-2 shadow-xs">
                    <QrCode className="w-24 h-24 text-neutral-900" />
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Scan with Google Pay, PhonePe, or BHIM to pay <strong className="text-neutral-800">${bill.totalAmount}</strong> to Greenwood Heights Society A/C
                  </div>
                </div>
              )}

              <button
                type="button"
                id="btn-confirm-payment"
                disabled={isProcessing}
                onClick={handlePay}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {isProcessing ? 'Authorizing Payment...' : `Confirm & Pay $${bill.totalAmount}`}
              </button>
            </div>
          ) : (
            /* Digital Receipt */
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-neutral-900">Payment Successful</h4>
                <p className="text-xs text-neutral-500">Official receipt recorded into society ledger.</p>
              </div>

              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 text-xs space-y-2">
                <div className="flex justify-between text-neutral-600">
                  <span>Transaction Ref:</span>
                  <span className="font-mono font-semibold text-neutral-900">{receipt.transactionId}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-bold text-emerald-700">${receipt.totalAmount}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-neutral-800">{receipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Date & Time:</span>
                  <span className="text-neutral-800">{new Date(receipt.paidAt || Date.now()).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => alert(`Receipt ${receipt.transactionId} downloaded to device.`)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-neutral-300 hover:bg-neutral-50 font-semibold text-xs text-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Receipt (PDF)
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="py-2.5 px-5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs cursor-pointer"
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
