import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Building2,
  Banknote,
  ShieldCheck,
  Plus,
  ChevronRight,
  FileText,
  Wallet
} from "lucide-react";
import { DbAvuWithdrawal } from "../lib/supabase";

interface WithdrawalTrackerCardProps {
  withdrawals: DbAvuWithdrawal[];
  onOpenWithdrawalModal: () => void;
  onRefresh?: () => void;
  className?: string;
}

export const WithdrawalTrackerCard: React.FC<WithdrawalTrackerCardProps> = ({
  withdrawals,
  onOpenWithdrawalModal,
  onRefresh,
  className = ""
}) => {
  // Sort withdrawals: newest first
  const sortedWithdrawals = useMemo(() => {
    return [...withdrawals].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [withdrawals]);

  // Find all pending requests
  const pendingRequests = useMemo(() => {
    return sortedWithdrawals.filter(
      (w) => w.status?.toLowerCase() === "pending"
    );
  }, [sortedWithdrawals]);

  // Default to first pending request, or first recent request if none pending
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Active withdrawal being tracked
  const activeWithdrawal = useMemo(() => {
    if (pendingRequests.length > 0) {
      return pendingRequests[Math.min(selectedIndex, pendingRequests.length - 1)];
    }
    return sortedWithdrawals[0] || null;
  }, [pendingRequests, sortedWithdrawals, selectedIndex]);

  const isPending = activeWithdrawal?.status?.toLowerCase() === "pending";
  const isApproved = activeWithdrawal?.status?.toLowerCase() === "approved";
  const isDisapproved = activeWithdrawal?.status?.toLowerCase() === "disapproved";

  // Amount & Naira conversion
  const avuAmount = Number(activeWithdrawal?.avu_amount || activeWithdrawal?.requested_avu || 0);
  const nairaEquivalent = Number(activeWithdrawal?.naira_equivalent || avuAmount * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 text-left ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <RefreshCw size={20} className={isPending ? "animate-spin text-amber-400" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                Withdrawal Tracker
              </h3>
              {isPending ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Live Review
                </span>
              ) : isApproved ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle2 size={11} />
                  Settled
                </span>
              ) : isDisapproved ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                  <XCircle size={11} />
                  Disapproved
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                  Standby
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status milestones for your AVU token bank liquidation
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-bold transition-all cursor-pointer"
              title="Refresh live status"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenWithdrawalModal}
            className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Plus size={14} />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* Multiple pending requests selector tabs (if > 1 pending) */}
      {pendingRequests.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold shrink-0">
            Pending Queue ({pendingRequests.length}):
          </span>
          {pendingRequests.map((req, idx) => (
            <button
              key={req.id}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer ${
                selectedIndex === idx
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-slate-200"
              }`}
            >
              Request #{idx + 1} &bull; {req.avu_amount || req.requested_avu} AVU
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {!activeWithdrawal ? (
        /* Empty State */
        <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Wallet size={22} />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              No Pending Withdrawals
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your previous withdrawal requests have been processed, or you have not submitted an AVU liquidation request yet.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenWithdrawalModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md"
          >
            <Plus size={14} />
            <span>Request AVU Liquidation</span>
          </button>
        </div>
      ) : (
        /* Active Request Tracking Card */
        <div className="space-y-5">
          {/* Active Request Overview Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded-md">
                  ID: {activeWithdrawal.id?.substring(0, 18)}...
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Submitted: {activeWithdrawal.created_at ? new Date(activeWithdrawal.created_at).toLocaleString() : "Recently"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 pt-0.5">
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                  {avuAmount.toLocaleString()} AVU
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                  &bull; ₦{nairaEquivalent.toLocaleString()} NGN
                </span>
              </div>
            </div>

            {/* Destination Bank & Beneficiary */}
            <div className="sm:text-right border-t sm:border-t-0 border-slate-800/60 pt-2.5 sm:pt-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                Destination Account
              </span>
              <p className="text-xs font-bold text-slate-200">
                {activeWithdrawal.bank_name}
              </p>
              <p className="text-xs font-mono text-slate-400">
                {activeWithdrawal.account_number}{" "}
                <span className="text-[11px] font-sans text-slate-500">
                  ({activeWithdrawal.account_name})
                </span>
              </p>
            </div>
          </div>

          {/* 3-STAGE ICON-BASED PROGRESS BAR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Progress Pipeline
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {isPending
                  ? "Step 2 of 3 Active"
                  : isApproved
                  ? "Step 3 of 3 Complete"
                  : "Decision Finalized"}
              </span>
            </div>

            {/* Visual Icon Milestone Steps with Connector Lines */}
            <div className="relative">
              {/* Connector Bar Background */}
              <div className="absolute top-5 left-8 right-8 h-1 bg-slate-800 -translate-y-1/2 z-0 hidden sm:block" />

              {/* Connector Bar Active Fills */}
              <div
                className={`absolute top-5 left-8 h-1 -translate-y-1/2 z-0 hidden sm:block transition-all duration-700 ${
                  isApproved
                    ? "w-[calc(100%-4rem)] bg-emerald-500"
                    : isDisapproved
                    ? "w-[calc(100%-4rem)] bg-rose-500"
                    : "w-1/2 bg-amber-500 animate-pulse"
                }`}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-2 relative z-10">
                {/* STEP 1: REQUESTED */}
                <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 bg-slate-900/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-800/60">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                    <Send size={16} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1 sm:justify-center">
                      <span>1. Requested</span>
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Request logged in treasury queue
                    </p>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                      Balance Kept Intact
                    </span>
                  </div>
                </div>

                {/* STEP 2: PROCESSING / REVIEW */}
                <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 bg-slate-900/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-800/60">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isPending
                        ? "bg-amber-500/20 border-amber-400 text-amber-400 animate-pulse ring-4 ring-amber-500/20"
                        : isApproved
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-rose-500/20 border-rose-500 text-rose-400"
                    }`}
                  >
                    {isPending ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : isApproved ? (
                      <ShieldCheck size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1 sm:justify-center">
                      <span>2. Processing</span>
                      {isPending && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      )}
                      {isApproved && (
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isPending
                        ? "Treasury admin auditing request"
                        : isApproved
                        ? "Audit verified & approved"
                        : "Audit flagged & rejected"}
                    </p>
                    <span
                      className={`text-[10px] font-mono font-bold block ${
                        isPending
                          ? "text-amber-400"
                          : isApproved
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {isPending
                        ? "Pending Approval"
                        : isApproved
                        ? "Approved"
                        : "Disapproved"}
                    </span>
                  </div>
                </div>

                {/* STEP 3: COMPLETED */}
                <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 bg-slate-900/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-800/60">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isApproved
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm ring-4 ring-emerald-500/20"
                        : isDisapproved
                        ? "bg-rose-500/20 border-rose-500 text-rose-400 ring-4 ring-rose-500/20"
                        : "bg-slate-800 border-slate-700 text-slate-500"
                    }`}
                  >
                    {isApproved ? (
                      <Banknote size={16} />
                    ) : isDisapproved ? (
                      <XCircle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1 sm:justify-center">
                      <span>3. {isDisapproved ? "Disapproved" : "Completed"}</span>
                      {isApproved && (
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isApproved
                        ? "Bank liquidation disbursed"
                        : isDisapproved
                        ? "Balance left untouched"
                        : "Awaiting approval to disburse"}
                    </p>
                    <span
                      className={`text-[10px] font-mono font-bold block ${
                        isApproved
                          ? "text-emerald-400"
                          : isDisapproved
                          ? "text-rose-400"
                          : "text-slate-500"
                      }`}
                    >
                      {isApproved
                        ? "Wallet Deducted & Settled"
                        : isDisapproved
                        ? "Liquidation Rejected"
                        : "Next Stage"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Note callout if present */}
            {activeWithdrawal.admin_note && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-amber-400">Admin Audit Note: </span>
                {activeWithdrawal.admin_note}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
