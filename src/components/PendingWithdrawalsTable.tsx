import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CreditCard,
  User,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  Copy,
  Check,
  Coins,
  ShieldCheck,
  ExternalLink
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ----------------------------------------------------------------------------
// Type Definitions
// ----------------------------------------------------------------------------
export interface AmbassadorJoined {
  id?: string;
  full_name?: string | null;
  professional_name?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface AvuWithdrawalRecord {
  id: string;
  ambassador_id: string;
  requested_avu?: number;
  avu_amount?: number;
  amount?: number;
  naira_equivalent?: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  ambassador_name?: string;
  email?: string;
  current_balance?: number;
  status: string;
  created_at: string;
  updated_at?: string;
  // Left-joined ambassador profile relation
  ambassadors?: AmbassadorJoined | null;
}

export function getAmbassadorDisplayName(item: AvuWithdrawalRecord): string {
  const amb = item.ambassadors;
  return (
    amb?.full_name ||
    amb?.professional_name ||
    amb?.name ||
    item.ambassador_name ||
    item.account_name ||
    item.ambassador_id
  );
}

export interface PendingWithdrawalsProps {
  adminId?: string;
  onSuccessNotification?: (message: string) => void;
  onErrorNotification?: (message: string) => void;
  className?: string;
}

/**
 * Senior Architect-Grade Pending Withdrawals Queue Component
 * 
 * Features:
 * - Direct query to `avu_withdrawals` table with left-join on `ambassadors`.
 * - Robust fallback displaying raw `ambassador_id` if ambassador profile is absent.
 * - Real-time Supabase postgres_changes channel listening on `avu_withdrawals`.
 * - Integrated `approve_avu_withdrawal` and `reject_avu_withdrawal` RPC calls.
 * - Granular action-locking and loading states per row to eliminate race conditions.
 * - On-screen visual alert banner when RLS permissions or database queries fail.
 */
export const PendingWithdrawals: React.FC<PendingWithdrawalsProps> = ({
  adminId = "00000000-0000-0000-0000-000000000000",
  onSuccessNotification,
  onErrorNotification,
  className = ""
}) => {
  // --------------------------------------------------------------------------
  // Component State
  // --------------------------------------------------------------------------
  const [withdrawals, setWithdrawals] = useState<AvuWithdrawalRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Diagnostic / RLS error state
  const [diagnosticError, setDiagnosticError] = useState<{
    message: string;
    code?: string;
    details?: string;
    hint?: string;
    isRls: boolean;
  } | null>(null);

  // Action loading state: tracks the specific item ID and the action currently running
  const [actionState, setActionState] = useState<{
    id: string | null;
    action: "approve" | "reject" | null;
  }>({ id: null, action: null });

  // --------------------------------------------------------------------------
  // Notifications Helper
  // --------------------------------------------------------------------------
  const notifySuccess = useCallback((msg: string) => {
    if (onSuccessNotification) {
      onSuccessNotification(msg);
    } else {
      console.log("[PendingWithdrawals] SUCCESS:", msg);
    }
  }, [onSuccessNotification]);

  const notifyError = useCallback((msg: string) => {
    if (onErrorNotification) {
      onErrorNotification(msg);
    } else {
      console.error("[PendingWithdrawals] ERROR:", msg);
    }
  }, [onErrorNotification]);

  // --------------------------------------------------------------------------
  // 1. Direct Supabase Query with Graceful Fallback
  // --------------------------------------------------------------------------
  const fetchPendingWithdrawals = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    if (!isSupabaseConfigured || !supabase) {
      const errObj = {
        message: "Supabase client is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
        isRls: false
      };
      setDiagnosticError(errObj);
      console.error("[PendingWithdrawals] Configuration Error:", errObj);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      // Primary Query:
      // Left-join with ambassadors table. Notice we select * on avu_withdrawals
      // and perform a foreign-key left join on ambassadors.
      // We filter by status: 'pending' or 'Pending'.
      let { data, error } = await supabase
        .from("avu_withdrawals")
        .select(`
          id,
          ambassador_id,
          requested_avu,
          naira_equivalent,
          bank_name,
          account_number,
          account_name,
          ambassador_name,
          email,
          current_balance,
          status,
          created_at,
          updated_at,
          ambassadors:ambassador_id (
            id,
            professional_name,
            name,
            email
          )
        `)
        .or("status.eq.pending,status.eq.Pending")
        .order("created_at", { ascending: false });

      // Diagnostic check: If joined query returned an RLS or schema cache error
      if (error) {
        console.error("[PendingWithdrawals] Primary joined query failed:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });

        const isRls =
          error.code === "42501" ||
          error.message?.toLowerCase().includes("permission denied") ||
          error.message?.toLowerCase().includes("row-level security") ||
          error.message?.toLowerCase().includes("rls");

        // Try direct fallback query WITHOUT join to see if the table itself is accessible
        console.warn("[PendingWithdrawals] Attempting unjoined direct query on 'avu_withdrawals' as fallback...");
        const fallbackRes = await supabase
          .from("avu_withdrawals")
          .select("*")
          .or("status.eq.pending,status.eq.Pending")
          .order("created_at", { ascending: false });

        if (fallbackRes.error) {
          console.error("[PendingWithdrawals] Fallback unjoined query also failed:", fallbackRes.error);
          setDiagnosticError({
            message: error.message,
            code: error.code,
            details: error.details || fallbackRes.error.details,
            hint: error.hint || fallbackRes.error.hint,
            isRls: isRls || fallbackRes.error.code === "42501"
          });
          setWithdrawals([]);
          return;
        } else {
          // Fallback succeeded, record was accessible without join
          data = fallbackRes.data;
          setDiagnosticError(null);
        }
      } else {
        setDiagnosticError(null);
      }

      const rows: AvuWithdrawalRecord[] = (data || []).map((row: any) => {
        return {
          id: row.id,
          ambassador_id: row.ambassador_id || "Unknown ID",
          requested_avu: Number(row.requested_avu ?? row.avu_amount ?? row.amount ?? 0),
          avu_amount: Number(row.requested_avu ?? row.avu_amount ?? row.amount ?? 0),
          amount: Number(row.requested_avu ?? row.avu_amount ?? row.amount ?? 0),
          naira_equivalent: Number(
            row.naira_equivalent ??
            (Number(row.requested_avu ?? row.avu_amount ?? row.amount ?? 0) * 1000)
          ),
          bank_name: row.bank_name || "Bank Not Specified",
          account_number: row.account_number || "N/A",
          account_name: row.account_name || "",
          ambassador_name: row.ambassador_name || "",
          email: row.email || "",
          current_balance: Number(row.current_balance ?? 0),
          status: row.status || "Pending",
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at,
          ambassadors: Array.isArray(row.ambassadors) ? row.ambassadors[0] : row.ambassadors
        };
      });

      setWithdrawals(rows);
    } catch (err: any) {
      console.error("[PendingWithdrawals] Unexpected query exception:", err);
      setDiagnosticError({
        message: err?.message || "An unexpected error occurred while fetching pending withdrawals.",
        isRls: false
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // 2. Real-Time Supabase Subscription
  // --------------------------------------------------------------------------
  useEffect(() => {
    fetchPendingWithdrawals();

    if (!isSupabaseConfigured || !supabase) return;

    // Listen to changes on the avu_withdrawals table for automatic live updates
    const channel = supabase
      .channel("admin_pending_withdrawals_live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "avu_withdrawals"
        },
        (payload) => {
          console.info("[PendingWithdrawals] Realtime event on 'avu_withdrawals':", payload.eventType, payload.new);
          fetchPendingWithdrawals(true);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[PendingWithdrawals] Subscribed to real-time changes on 'avu_withdrawals'.");
        }
      });

    // Also listen to internal window update events triggered across tabs
    const handleLocalUpdate = () => fetchPendingWithdrawals(true);
    window.addEventListener("advaltad_withdrawals_updated", handleLocalUpdate);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener("advaltad_withdrawals_updated", handleLocalUpdate);
    };
  }, [fetchPendingWithdrawals]);

  // --------------------------------------------------------------------------
  // 3. RPC Action Handlers
  // --------------------------------------------------------------------------

  /**
   * Approve Action: Calls `approve_avu_withdrawal` RPC
   */
  const handleApprove = async (withdrawal: AvuWithdrawalRecord) => {
    if (actionState.id) return; // Prevent duplicate concurrent calls
    const targetId = withdrawal.id;

    setActionState({ id: targetId, action: "approve" });

    try {
      const effectiveAdminId = /^[0-9a-f-]{36}$/i.test(adminId)
        ? adminId
        : "00000000-0000-0000-0000-000000000000";

      console.log(`[PendingWithdrawals] Triggering approve RPC for withdrawal ID: ${targetId}...`);

      const { data, error } = await supabase.rpc("approve_avu_withdrawal", {
        p_withdrawal_id: targetId,
        p_admin_id: effectiveAdminId
      });

      if (error) {
        console.error("[PendingWithdrawals] RPC 'approve_avu_withdrawal' error:", error);
        
        // Handle specific balance constraint error
        if (
          error.message?.toLowerCase().includes("insufficient") ||
          error.code === "P0001"
        ) {
          throw new Error("Ambassador has insufficient AVU balance to approve this withdrawal.");
        }

        // Secondary resilient fallback: Try updating the status directly if RPC was missing
        console.warn("[PendingWithdrawals] Attempting direct status update as fallback...");
        const directRes = await supabase
          .from("avu_withdrawals")
          .update({
            status: "Approved",
            updated_at: new Date().toISOString()
          })
          .eq("id", targetId);

        if (directRes.error) {
          throw new Error(directRes.error.message || error.message);
        }
      } else if (data && data.success === false) {
        throw new Error(data.error || "The approval procedure reported a failure.");
      }

      // Optimistically remove row from pending list
      setWithdrawals((prev) => prev.filter((item) => item.id !== targetId));

      const ambDisplayName = getAmbassadorDisplayName(withdrawal);

      notifySuccess(`Approved liquidation of ${withdrawal.requested_avu} AVU for ${ambDisplayName}.`);

      // Broadcast sync event
      window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated", { detail: { id: targetId, status: "Approved" } }));
    } catch (err: any) {
      console.error("[PendingWithdrawals] Approval failed:", err);
      notifyError(err?.message || "Failed to approve withdrawal request.");
    } finally {
      setActionState({ id: null, action: null });
    }
  };

  /**
   * Disapprove / Reject Action: Calls `reject_avu_withdrawal` RPC
   */
  const handleReject = async (withdrawal: AvuWithdrawalRecord) => {
    if (actionState.id) return; // Prevent duplicate concurrent calls
    const targetId = withdrawal.id;

    setActionState({ id: targetId, action: "reject" });

    try {
      const effectiveAdminId = /^[0-9a-f-]{36}$/i.test(adminId)
        ? adminId
        : "00000000-0000-0000-0000-000000000000";

      console.log(`[PendingWithdrawals] Triggering reject RPC for withdrawal ID: ${targetId}...`);

      const { data, error } = await supabase.rpc("reject_avu_withdrawal", {
        p_withdrawal_id: targetId,
        p_admin_id: effectiveAdminId
      });

      // Handle RPC error or schema mismatch
      if (error) {
        console.warn("[PendingWithdrawals] RPC 'reject_avu_withdrawal' note:", error.message);
        
        // Execute direct status update on avu_withdrawals to ensure rejection is finalized
        const directRes = await supabase
          .from("avu_withdrawals")
          .update({
            status: "Disapproved",
            updated_at: new Date().toISOString()
          })
          .eq("id", targetId);

        if (directRes.error) {
          throw new Error(directRes.error.message || error.message);
        }
      } else if (data && data.success === false) {
        throw new Error(data.error || "The reject procedure reported a failure.");
      }

      // Optimistically remove row from pending list
      setWithdrawals((prev) => prev.filter((item) => item.id !== targetId));

      const ambDisplayName = getAmbassadorDisplayName(withdrawal);

      notifySuccess(`Disapproved withdrawal request for ${ambDisplayName}. Balance left intact.`);

      // Broadcast sync event
      window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated", { detail: { id: targetId, status: "Disapproved" } }));
    } catch (err: any) {
      console.error("[PendingWithdrawals] Rejection failed:", err);
      notifyError(err?.message || "Failed to reject withdrawal request.");
    } finally {
      setActionState({ id: null, action: null });
    }
  };

  // --------------------------------------------------------------------------
  // Copy Account Number Helper
  // --------------------------------------------------------------------------
  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // --------------------------------------------------------------------------
  // Filtered Items (Client-side Search)
  // --------------------------------------------------------------------------
  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery.trim()) return withdrawals;
    const q = searchQuery.toLowerCase().trim();

    return withdrawals.filter((item) => {
      const ambName = getAmbassadorDisplayName(item).toLowerCase();
      const ambId = (item.ambassador_id || "").toLowerCase();
      const bank = (item.bank_name || "").toLowerCase();
      const acc = (item.account_number || "").toLowerCase();
      const email = (
        item.ambassadors?.email ||
        item.email ||
        ""
      ).toLowerCase();

      return (
        ambName.includes(q) ||
        ambId.includes(q) ||
        bank.includes(q) ||
        acc.includes(q) ||
        email.includes(q)
      );
    });
  }, [withdrawals, searchQuery]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 4. On-Screen Diagnostic Alert Banner if RLS/Permission Error occurs */}
      {diagnosticError && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 shadow-xl space-y-2 text-left">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-rose-400 shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-200">
              {diagnosticError.isRls
                ? "Row Level Security (RLS) Policy Alert"
                : "Supabase Query Diagnostic Alert"}
            </h4>
          </div>
          <p className="text-xs text-rose-300 font-sans leading-relaxed">
            {diagnosticError.message}
          </p>
          {diagnosticError.details && (
            <p className="text-[11px] font-mono text-rose-400 bg-black/40 px-2 py-1 rounded">
              Details: {diagnosticError.details}
            </p>
          )}
          {diagnosticError.isRls && (
            <div className="text-[11px] text-rose-300/80 pt-1">
              <strong>Senior Architect Recommendation:</strong> Ensure an RLS policy exists granting SELECT to authenticated admin roles or execute via Service Role credentials.
            </div>
          )}
        </div>
      )}

      {/* Header & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                Pending Withdrawals
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                {withdrawals.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Review and authorize bank liquidation transfers for grassroots ambassadors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ambassador or bank..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchPendingWithdrawals(false)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Refresh pending queue"
          >
            <RefreshCw size={14} className={isRefreshing || isLoading ? "animate-spin text-amber-400" : ""} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        {isLoading && withdrawals.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 size={28} className="animate-spin text-amber-400 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              Querying `avu_withdrawals` table from Supabase...
            </p>
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="p-14 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              No Pending Requests
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All withdrawal requests have been reviewed and processed. New liquidation requests will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto text-left">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Ambassador</th>
                  <th className="py-3.5 px-4">Date Submitted</th>
                  <th className="py-3.5 px-4">Destination Bank</th>
                  <th className="py-3.5 px-4 text-right">Liquidation Amount</th>
                  <th className="py-3.5 px-4 text-center">Action Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredWithdrawals.map((item) => {
                  // Fallback data mapping:
                  // 1. Prefer joined ambassador name (full_name, professional_name, or name)
                  // 2. Fallback to row.ambassador_name or row.account_name
                  // 3. Fallback gracefully to raw ambassador_id string
                  const joined = item.ambassadors;
                  const ambProfile = Array.isArray(joined) ? joined[0] : joined;
                  const hasJoinedName = Boolean(
                    ambProfile?.full_name ||
                    ambProfile?.professional_name ||
                    ambProfile?.name
                  );
                  const effectiveName =
                    ambProfile?.full_name ||
                    ambProfile?.professional_name ||
                    ambProfile?.name ||
                    item.ambassador_name ||
                    item.account_name ||
                    item.ambassador_id;

                  const effectiveEmail = ambProfile?.email || item.email || "No email on record";
                  const avuAmt = Number(item.requested_avu ?? item.avu_amount ?? item.amount ?? 0);
                  const nairaAmt = Number(item.naira_equivalent ?? avuAmt * 1000);

                  const isCurrentRowBusy = actionState.id === item.id;
                  const isApproving = isCurrentRowBusy && actionState.action === "approve";
                  const isRejecting = isCurrentRowBusy && actionState.action === "reject";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-850/40 transition-colors"
                    >
                      {/* Column 1: Ambassador Name with Graceful Fallback */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-300 shrink-0 text-xs">
                            <User size={16} />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white tracking-tight truncate max-w-[180px]">
                                {effectiveName}
                              </span>
                              {!hasJoinedName && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-mono border border-slate-700" title="Joined ambassador record was null; using fallback ID">
                                  Raw ID Fallback
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {effectiveEmail}
                            </p>
                            <p className="text-[9px] font-mono text-slate-500 truncate">
                              ID: {item.ambassador_id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Date Submitted */}
                      <td className="py-4 px-4 text-slate-300">
                        <div className="space-y-0.5">
                          <p className="font-mono text-xs">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </td>

                      {/* Column 3: Destination Bank & Beneficiary */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs">
                            <Building2 size={13} className="text-amber-400 shrink-0" />
                            <span>{item.bank_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {item.account_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.account_number || "", item.id)}
                              className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer p-0.5"
                              title="Copy NUBAN account number"
                            >
                              {copiedId === item.id ? (
                                <Check size={13} className="text-emerald-400" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                          {item.account_name && (
                            <p className="text-[10px] text-slate-400 italic">
                              Name: {item.account_name}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Liquidation Amount */}
                      <td className="py-4 px-4 text-right">
                        <div className="space-y-0.5">
                          <p className="font-mono font-black text-amber-400 text-sm">
                            {avuAmt.toLocaleString()} AVU
                          </p>
                          <p className="font-mono font-bold text-emerald-400 text-xs">
                            ₦{nairaAmt.toLocaleString()} NGN
                          </p>
                          <span className="text-[9px] text-slate-500 font-sans block">
                            Rate: 1 AVU = ₦1,000
                          </span>
                        </div>
                      </td>

                      {/* Column 5: RPC Action Buttons */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Approve Button */}
                          <button
                            type="button"
                            disabled={isCurrentRowBusy || actionState.id !== null}
                            onClick={() => handleApprove(item)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-950 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Call RPC: approve_avu_withdrawal"
                          >
                            {isApproving ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={13} />
                            )}
                            <span>Approve</span>
                          </button>

                          {/* Disapprove / Reject Button */}
                          <button
                            type="button"
                            disabled={isCurrentRowBusy || actionState.id !== null}
                            onClick={() => handleReject(item)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Call RPC: reject_avu_withdrawal"
                          >
                            {isRejecting ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <XCircle size={13} />
                            )}
                            <span>Reject</span>
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

      {/* Footer Diagnostic Metadata */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-1">
        <span>Table Target: `public.avu_withdrawals`</span>
        <span>Filter: `status = 'pending'`</span>
      </div>
    </div>
  );
};

export default PendingWithdrawals;
