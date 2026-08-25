'use client';

import { useState, useEffect } from 'react';
import { X, Save, User, Phone, MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { CustomerService } from '@/features/customers';
import { CustomerStatus } from '@ramyas-jeweller/shared-types';
import { AppError } from '@/lib/errors/app-error';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  customerData?: {
    name: string;
    mobile: string;
    altMobile?: string;
    address: string;
    nomineeName?: string;
    relationship?: string;
    status?: string;
  };
  onSave?: () => void;
}

export function EditCustomerModal({ isOpen, onClose, customerId, customerData, onSave }: EditCustomerModalProps) {
  const [name, setName] = useState(customerData?.name || '');
  const [mobile, setMobile] = useState(customerData?.mobile || '');
  const [altMobile, setAltMobile] = useState(customerData?.altMobile || '');
  const [address, setAddress] = useState(customerData?.address || '');
  const [nomineeName, setNomineeName] = useState(customerData?.nomineeName || '');
  const [relationship, setRelationship] = useState(customerData?.relationship || 'Spouse');
  const [status, setStatus] = useState<CustomerStatus>('ACTIVE');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (customerData) {
      setName(customerData.name || '');
      setMobile(customerData.mobile || '');
      setAltMobile(customerData.altMobile || '');
      setAddress(customerData.address || '');
      setNomineeName(customerData.nomineeName || '');
      setRelationship(customerData.relationship || 'Spouse');
      if (customerData.status === 'ACTIVE' || customerData.status === 'Active Member') {
        setStatus('ACTIVE');
      } else if (customerData.status === 'INACTIVE' || customerData.status === 'Inactive') {
        setStatus('INACTIVE');
      } else {
        setStatus('SUSPENDED');
      }
    }
  }, [customerData]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setErrorMessage(null);

    const cleanedMobile = mobile.trim().replace(/\D/g, '');
    if (!cleanedMobile || !/^[6-9]\d{9}$/.test(cleanedMobile)) {
      setErrorMessage('A valid 10-digit mobile number starting with 6, 7, 8, or 9 is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (customerId) {
        await CustomerService.updateCustomer(customerId, {
          fullName: name.trim(),
          mobileNumber: cleanedMobile,
          address: address.trim(),
          nomineeName: nomineeName.trim(),
          nomineeRelationship: relationship,
          status: status,
        });
      }

      setSavedSuccess(true);
      if (onSave) {
        onSave();
      }
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      if (err instanceof AppError) {
        setErrorMessage(err.toUserMessage());
      } else {
        setErrorMessage('Failed to update customer profile in database.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end font-sans">
      {/* Drawer Panel */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-blue-950">Edit Customer Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update personal and contact details for {name || 'Customer'}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 flex-1">
          {savedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Customer profile updated in database successfully!</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              PERSONAL INFORMATION
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name*
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number*
                </label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alt Mobile
                </label>
                <input
                  type="text"
                  value={altMobile}
                  onChange={(e) => setAltMobile(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Residential Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Nominee & Status */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              NOMINEE & ACCOUNT STATUS
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nominee Name
                </label>
                <input
                  type="text"
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-2xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/20 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
