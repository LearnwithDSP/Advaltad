import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { db, DbAmbassador } from "../lib/supabase";

interface AmbassadorProfileProps {
  profile: DbAmbassador;
  onProfileUpdated: () => Promise<void>;
}

export const AmbassadorProfile: React.FC<AmbassadorProfileProps> = ({
  profile,
  onProfileUpdated,
}) => {
  const [editName, setEditName] = useState(profile.name);
  const [editCity, setEditCity] = useState(profile.city);
  const [editField, setEditField] = useState(profile.field);
  const [editPhone, setEditPhone] = useState(profile.phone || "");
  const [editPassword, setEditPassword] = useState(profile.password || "");

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState("");

  // Keep state synced if parent profile changes
  useEffect(() => {
    setEditName(profile.name);
    setEditCity(profile.city);
    setEditField(profile.field);
    setEditPhone(profile.phone || "");
    setEditPassword(profile.password || "");
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateSuccess(false);
    setUpdateError("");

    try {
      const updates = {
        name: editName,
        city: editCity,
        field: editField,
        phone: editPhone,
        password: editPassword,
      };

      const success = await db.updateProfile(profile.id, updates);
      if (success) {
        // Log the profile update activity
        await db.logActivity({
          ambassador_id: profile.id,
          ambassador_name: editName,
          type: "profile_update",
          desc: `Updated registry profile: city to "${editCity}", focus division to "${editField}"`,
        });

        setUpdateSuccess(true);
        await onProfileUpdated();
        setTimeout(() => setUpdateSuccess(false), 5000);
      } else {
        setUpdateError("Failed to update profile registry. Please try again.");
      }
    } catch (err: any) {
      console.error("Error updating ambassador profile:", err);
      setUpdateError(err.message || "An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div id="ambassador-profile-container" className="space-y-8">
      {/* Title Header Section */}
      <div className="pb-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">Professional Ambassador Profile</h3>
        <p className="text-xs text-gray-500 font-sans">
          Manage your public ambassador registry information, base territory, and local initiative focus area.
        </p>
      </div>

      {/* Success Alert */}
      <AnimatePresence>
        {updateSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-medium"
            id="profile-update-success-alert"
          >
            <Icon name="CheckCircle2" className="text-emerald-600 flex-shrink-0" size={18} />
            <div>
              <p className="font-bold">Profile updated successfully!</p>
              <p className="text-emerald-700/80">
                Your registry details have been securely written to the Supabase database.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      <AnimatePresence>
        {updateError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-medium"
            id="profile-update-error-alert"
          >
            <Icon name="AlertCircle" className="text-rose-600 flex-shrink-0" size={18} />
            <div>
              <p className="font-bold">Failed to sync profile</p>
              <p className="text-rose-700/80">{updateError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Current Info Cards Display */}
        <div className="md:col-span-4 space-y-6 text-left">
          <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
              <Icon name="Shield" size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400">Current Registered Details</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                This information is registered securely on our digital ledger and is visible to field administrators.
              </p>
            </div>
            
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Professional Name</span>
                <span className="text-sm font-black text-white tracking-tight">{profile.name}</span>
              </div>
              
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Base City & Country</span>
                <span className="text-sm font-black text-white tracking-tight flex items-center gap-1">
                  <Icon name="MapPin" size={12} className="text-emerald-500" />
                  {profile.city}
                </span>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Focus Interest</span>
                <span className="text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-900/30 rounded-lg p-2 mt-1 block">
                  {profile.field}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[9px] font-mono text-slate-500 space-y-0.5">
              <p>REGISTRY_ID: {profile.id}</p>
              <p>STATUS: {profile.status.toUpperCase()}</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100/50 space-y-3">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">
              Fellowship Active Preview
            </span>
            <div className="space-y-1.5 pt-1">
              <h5 className="text-sm font-black text-slate-800 tracking-tight">{editName || profile.name}</h5>
              <p className="text-xs text-slate-500">{editCity || profile.city}</p>
              <p className="text-[11px] font-medium text-emerald-700 bg-emerald-100/30 border border-emerald-200/50 rounded-lg p-2.5 mt-1">
                {editField || profile.field}
              </p>
            </div>
          </div>
        </div>

        {/* Update Profile Form */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm md:col-span-8">
          <form id="ambassador-profile-update-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="input-profile-name" className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Icon name="UserCheck" size={12} className="text-slate-400" />
                  Professional Name *
                </label>
                <input
                  id="input-profile-name"
                  required
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Ramon Bisola"
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                />
              </div>

              <div>
                <label htmlFor="input-profile-city" className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Icon name="MapPin" size={12} className="text-slate-400" />
                  Base City & Country *
                </label>
                <input
                  id="input-profile-city"
                  required
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Lagos, Nigeria"
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="input-profile-field" className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Icon name="Compass" size={12} className="text-slate-400" />
                  Focus Division / Interest
                </label>
                <input
                  id="input-profile-field"
                  required
                  type="text"
                  value={editField}
                  onChange={(e) => setEditField(e.target.value)}
                  placeholder="e.g. Youth Technology Labs"
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 italic">This represents your primary regional activity scope.</p>
              </div>

              <div>
                <label htmlFor="input-profile-phone" className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Icon name="Phone" size={12} className="text-slate-400" />
                  Telephone Contact
                </label>
                <input
                  id="input-profile-phone"
                  required
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +234 801 234 5678"
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Icon name="Lock" size={14} className="text-slate-500" />
                Registry Security
              </h4>
              
              <div className="max-w-md">
                <label htmlFor="input-profile-password" className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                  Ambassador Password *
                </label>
                <input
                  id="input-profile-password"
                  required
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                id="btn-save-profile-settings"
                type="submit"
                disabled={isUpdating}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-emerald-600/10 flex items-center gap-2 cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Synchronizing Supabase...
                  </>
                ) : (
                  <>
                    <Icon name="Check" size={14} />
                    Save Profile Settings
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
