import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CreditCard,
  User,
  RefreshCw,
  Search,
  AlertCircle,
  Loader2,
  Banknote,
  Copy,
  Check
} from "lucide-react";
import { supabase, isSupabaseConfigured, db, handleApprove as executeApprove, handleReject as executeReject, AVU_WITHDRAWALS_LOCAL_STORAGE_KEY } from "../lib/supabase";
import { logWithdrawalFetchTrace } from "../lib/db-logger";

export interface PendingWithdrawal {
  id: string;
  ambassador_id: string;
  amount?: number;
  requested_avu?: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
  naira_equivalent?: number;
  current_balance?: number;
  email?: string;
  ambassador_name?: string;
  ambassadors?: {
    id: string;
    professional_name?: string;
    name?: string;
    email?: string;
    avu_balance?: number;
  } | null;
}

export interface PendingWithdrawalsTableProps {
  adminId?: string;
  onSuccessNotification?: (message: string) => void;
  onErrorNotification?: (message: string) => void;
  className?: string;
}

export const PendingWithdrawalsTable: React.FC<PendingWithdrawalsTableProps> = ({
  adminId = "00000000-0000-0000-0000-000000000000",
  onSuccessNotification,
  onErrorNotification,
  className = ""
}) => {
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dedicated loading state per withdrawal row: tracks row ID and action ('approve' | 'reject')
  const [processingState, setProcessingState] = useState<{
    id: string | null;
    action: "approve" | "reject" | null;
  }>({ id: null, action: null });

  const notifySuccess = (message: string) => {
    if (onSuccessNotification) {
      onSuccessNotification(message);
    } else {
      alert(`Success: ${message}`);
    }
  };

  const notifyError = (message: string) => {
    if (onErrorNotification) {
      onErrorNotification(message);
    } else {
      alert(`Error: ${message}`);
    }
  };

  // --------------------------------------------------------------------------
  // Query pending withdrawals joined with Ambassador profile
  // --------------------------------------------------------------------------
  // Query pending withdrawals with ambassador details
  // --------------------------------------------------------------------------
  const fetchPendingWithdrawals = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from db.getAvuWithdrawals() which combines Supabase query with ambassador join and local storage fallback
      const allWithdrawals = await db.getAvuWithdrawals();
      const pendingList = (allWithdrawals || []).filter(
        (w) => (w.status || "Pending").toLowerCase() === "pending"
      );

      const formatted: PendingWithdrawal[] = pendingList.map((w) => {
        const reqAmount = Number(w.requested_avu ?? w.avu_amount ?? 0);
        const convRate = Number(w.conversion_rate || 1000);
        const nairaEq = Number(w.naira_equivalent || reqAmount * convRate);
        const ambName = w.ambassador_name || w.account_name || "Ambassador";
        const ambEmail = w.email || w.ambassador_email || "";

        return {
          id: w.id,
          ambassador_id: w.ambassador_id,
          amount: reqAmount,
          requested_avu: reqAmount,
          bank_name: w.bank_name || "",
          account_number: w.account_number || "",
          account_name: w.account_name || ambName,
          status: w.status,
          created_at: w.created_at,
          naira_equivalent: nairaEq,
          current_balance: Number(w.current_balance || 0),
          email: ambEmail,
          ambassador_name: ambName,
          ambassadors: {
            id: w.ambassador_id,
            professional_name: ambName,
            name: ambName,
            email: ambEmail,
            avu_balance: Number(w.current_balance || 0)
          }
        };
      });

      logWithdrawalFetchTrace({
        caller: "PendingWithdrawalsTable",
        targetAmbassadorId: formatted.map(w => w.ambassador_id),
        filterStatus: "pending",
        tableQueried: "avu_withdrawals",
        matchedCount: formatted.length,
        totalCount: (allWithdrawals || []).length,
        sampleIds: formatted.slice(0, 3).map(w => `${w.id}:${w.ambassador_id}:${w.ambassador_name}`)
      });

      setWithdrawals(formatted);
    } catch (err: any) {
      console.error("[PendingWithdrawalsTable] Fetch exception:", err);
      // Fallback directly to local storage cache if available
      try {
        const localData = typeof window !== "undefined" ? localStorage.getItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY) : null;
        if (localData) {
          const list = JSON.parse(localData);
          const pending = list.filter((w: any) => (w.status || "Pending").toLowerCase() === "pending");
          setWithdrawals(pending);
        }
      } catch (_) {}
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch, Realtime subscription, and cross-tab storage sync
  useEffect(() => {
    fetchPendingWithdrawals();

    const handleLocalEvent = () => fetchPendingWithdrawals();
    window.addEventListener("advaltad_withdrawals_updated", handleLocalEvent);
    window.addEventListener("advaltad_wallet_updated", handleLocalEvent);

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === "advaltad_withdrawals_sync_ping" ||
        e.key === AVU_WITHDRAWALS_LOCAL_STORAGE_KEY ||
        e.key === "advaltad_wallet_sync_ping"
      ) {
        fetchPendingWithdrawals();
      }
    };
    window.addEventListener("storage", handleStorage);

    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel("admin-pending-withdrawals-channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "avu_withdrawals" },
          () => {
            fetchPendingWithdrawals();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "AvuWithdrawals" },
          () => {
            fetchPendingWithdrawals();
          }
        )
        .subscribe();
    }

    // Auto background poll every 3.5s to ensure live state
    const pollInterval = setInterval(() => {
      fetchPendingWithdrawals();
    }, 3500);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener("advaltad_withdrawals_updated", handleLocalEvent);
      window.removeEventListener("advaltad_wallet_updated", handleLocalEvent);
      window.removeEventListener("storage", handleStorage);
      clearInterval(pollInterval);
    };
  }, [fetchPendingWithdrawals]);

  // --------------------------------------------------------------------------
  // ACTION: APPROVE WITHDRAWAL & DEDUCT AMBASSADOR BALANCE
  // --------------------------------------------------------------------------
  const handleApprove = async (withdrawal: PendingWithdrawal) => {
    const withdrawalId = withdrawal.id;
    const requestedAmount = Number(withdrawal.amount ?? withdrawal.requested_avu ?? 0);
    const ambName =
      withdrawal.ambassadors?.professional_name ||
      withdrawal.ambassadors?.name ||
      withdrawal.ambassador_name ||
      withdrawal.account_name ||
      "Ambassador";

    setProcessingState({ id: withdrawalId, action: "approve" });

    try {
      const effectiveAdminId = /^[0-9a-f-]{36}$/i.test(adminId)
        ? adminId
        : "00000000-0000-0000-0000-000000000000";

      const result = await executeApprove(withdrawalId, effectiveAdminId);
      if (!result.success) {
        throw result.error || new Error("Failed to process approval.");
      }

      // Remove item from pending list immediately
      setWithdrawals((prev) => prev.filter((item) => item.id !== withdrawalId));

      notifySuccess(
        `Withdrawal approved! Exact balance of ${requestedAmount.toLocaleString()} AVU was deducted from ${ambName}'s wallet.`
      );

      // Trigger cross-window / realtime synchronization
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated"));
        window.dispatchEvent(
          new CustomEvent("advaltad_wallet_updated", {
            detail: {
              ambassadorId: withdrawal.ambassador_id,
              deductedAmount: requestedAmount,
              newBalance: result.newBalance
            }
          })
        );
      }
    } catch (err: any) {
      console.error("[PendingWithdrawalsTable] Approve failed:", err);
      const msg = err?.message || "Failed to approve withdrawal.";
      notifyError(msg);
    } finally {
      setProcessingState({ id: null, action: null });
    }
  };

  // --------------------------------------------------------------------------
  // ACTION: REJECT / DISAPPROVE WITHDRAWAL
  // --------------------------------------------------------------------------
  const handleReject = async (withdrawal: PendingWithdrawal) => {
    const withdrawalId = withdrawal.id;
    const ambName =
      withdrawal.ambassadors?.professional_name ||
      withdrawal.ambassadors?.name ||
      withdrawal.ambassador_name ||
      withdrawal.account_name ||
      "Ambassador";

    setProcessingState({ id: withdrawalId, action: "reject" });

    try {
      const effectiveAdminId = /^[0-9a-f-]{36}$/i.test(adminId)
        ? adminId
        : "00000000-0000-0000-0000-000000000000";

      const result = await executeReject(withdrawalId, effectiveAdminId);
      if (!result.success) {
        throw result.error || new Error("Failed to reject withdrawal.");
      }

      // Remove item from pending list immediately
      setWithdrawals((prev) => prev.filter((item) => item.id !== withdrawalId));

      notifySuccess(`Withdrawal request for ${ambName} was disapproved. Balance was left untouched.`);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated"));
      }
    } catch (err: any) {
      console.error("[PendingWithdrawalsTable] Reject failed:", err);
      const msg = err?.message || "Failed to reject withdrawal.";
      notifyError(msg);
    } finally {
      setProcessingState({ id: null, action: null });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered withdrawals
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (
      w.ambassadors?.professional_name ||
      w.ambassadors?.name ||
      w.ambassador_name ||
      w.account_name ||
      ""
    ).toLowerCase();
    const bank = (w.bank_name || "").toLowerCase();
    const acc = (w.account_number || "").toLowerCase();
    const email = (w.ambassadors?.email || w.email || "").toLowerCase();
    return name.includes(q) || bank.includes(q) || acc.includes(q) || email.includes(q);
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                Pending Withdrawals Queue
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                {withdrawals.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Audit and authorize bank liquidation transfers for ambassadors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ambassador or bank..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchPendingWithdrawals}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition-colors cursor-pointer shrink-0"
            title="Refresh queue"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-amber-400" : ""} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {isLoading && withdrawals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 size={24} className="animate-spin text-amber-400 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              Loading pending withdrawal queue from Supabase...
            </p>
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 size={28} className="text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              No Pending Requests
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All withdrawal requests have been reviewed and processed. New liquidation requests will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Ambassador Name</th>
                  <th className="py-3 px-4">Date Requested</th>
                  <th className="py-3 px-4">Bank Details</th>
                  <th className="py-3 px-4 text-right">AVU Amount Requested</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredWithdrawals.map((item) => {
                  const ambName =
                    item.ambassadors?.professional_name ||
                    item.ambassadors?.name ||
                    item.ambassador_name ||
                    item.account_name ||
                    "Ambassador";

                  const ambEmail = item.ambassadors?.email || item.email || "No email on record";
                  const avuAmt = Number(item.amount ?? item.requested_avu ?? 0);
                  const nairaEquiv = Number(item.naira_equivalent ?? avuAmt * 1000);
                  const isThisRowBusy = processingState.id === item.id;
                  const isApproving = isThisRowBusy && processingState.action === "approve";
                  const isRejecting = isThisRowBusy && processingState.action === "reject";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Column 1: Ambassador Name & Profile Context */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-300 shrink-0 text-xs">
                            {ambName.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-100">{ambName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{ambEmail}</p>
                            <span className="text-[9px] font-mono text-slate-500 block">
                              ID: {item.ambassador_id?.substring(0, 13)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Date Requested */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="text-slate-200 font-mono text-xs">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })
                              : "Recently"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : ""}
                          </p>
                        </div>
                      </td>

                      {/* Column 3: Bank Details */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                            <Building2 size={13} className="text-amber-400 shrink-0" />
                            <span>{item.bank_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {item.account_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.account_number, item.id)}
                              className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                              title="Copy account number"
                            >
                              {copiedId === item.id ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 italic">
                            Beneficiary: {item.account_name}
                          </p>
                        </div>
                      </td>

                      {/* Column 4: AVU Amount Requested */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="text-sm font-black font-mono text-amber-400">
                            {avuAmt.toLocaleString()} AVU
                          </p>
                          <p className="text-[11px] font-mono font-bold text-emerald-400">
                            ₦{nairaEquiv.toLocaleString()} NGN
                          </p>
                        </div>
                      </td>

                      {/* Column 5: Action Buttons */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {/* Approve Button (Green) */}
                          <button
                            type="button"
                            onClick={() => handleApprove(item)}
                            disabled={isThisRowBusy}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                            title="Approve and deduct wallet atomically"
                          >
                            {isApproving ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Approving...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </>
                            )}
                          </button>

                          {/* Disapprove / Reject Button (Red) */}
                          <button
                            type="button"
                            onClick={() => handleReject(item)}
                            disabled={isThisRowBusy}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                            title="Reject request with zero deduction"
                          >
                            {isRejecting ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Rejecting...</span>
                              </>
                            ) : (
                              <>
                                <XCircle size={13} />
                                <span>Reject</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
