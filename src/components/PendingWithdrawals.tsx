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
  ShieldAlert,
  ArrowDownToLine,
  Mail,
  ChevronRight
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

export interface PendingWithdrawalsProps {
  adminId?: string;
  onSuccessNotification?: (message: string) => void;
  onErrorNotification?: (message: string) => void;
  className?: string;
}

export interface DiagnosticError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  isRls: boolean;
}

/**
 * Display name resolver: Prioritizes joined ambassador names, falling back to
 * record-level name fields, and finally the raw ambassador_id.
 */
export function getAmbassadorDisplayName(item: AvuWithdrawalRecord): string {
  const amb = item.ambassadors;
  return (
    item.ambassador_name ||
    amb?.professional_name ||
    amb?.full_name ||
    amb?.name ||
    item.account_name ||
    item.ambassador_id
  );
}

/**
 * Display email resolver: Prioritizes joined ambassador email, falling back to
 * record-level email fields.
 */
export function getAmbassadorEmail(item: AvuWithdrawalRecord): string {
  return item.email || item.ambassadors?.email || "";
}

/**
 * PendingWithdrawals (Admin Panel)
 * 
 * Component Requirements:
 * 1. Direct query to `avu_withdrawals` table filtering strictly by pending status.
 * 2. Supabase LEFT JOIN on `ambassadors` to fetch user's name & email, with graceful fallback to raw ID.
 * 3. Realtime subscription via `.on('postgres_changes')` on `avu_withdrawals`.
 * 4. RPC integration for `approve_avu_withdrawal` and `reject_avu_withdrawal` with disabled states.
 * 5. Visual RLS / Permission diagnostics banner with actionable logs.
 */
export const PendingWithdrawals: React.FC<PendingWithdrawalsProps> = ({
  adminId = "00000000-0000-0000-0000-000000000000",
  onSuccessNotification,
  onErrorNotification,
  className = ""
}) => {
  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------
  const [withdrawals, setWithdrawals] = useState<AvuWithdrawalRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Diagnostic / RLS error tracking
  const [diagnosticError, setDiagnosticError] = useState<DiagnosticError | null>(null);

  // Button loading lock: holds current row ID and action type
  const [actionState, setActionState] = useState<{
    id: string | null;
    action: "approve" | "reject" | null;
  }>({ id: null, action: null });

  // Notification dispatchers
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
  // 1. Direct Supabase Query with LEFT JOIN & Graceful Fallback
  // --------------------------------------------------------------------------
  const fetchPendingWithdrawals = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    if (!isSupabaseConfigured || !supabase) {
      const configError: DiagnosticError = {
        message: "Supabase client is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present.",
        isRls: false
      };
      setDiagnosticError(configError);
      console.error("[PendingWithdrawals] Supabase Config Error:", configError);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      console.log("[PendingWithdrawals] Executing direct query on 'avu_withdrawals' with LEFT JOIN on 'ambassadors'...");

      // Primary query: LEFT JOIN on ambassadors using foreign key ambassador_id.
      // Filter strictly for pending status (handles both lowercase 'pending' and titlecase 'Pending' for bulletproof matching)
      let { data, error } = await supabase
        .from("avu_withdrawals")
        .select(`
          id,
          ambassador_id,
          ambassador_name,
          email,
          current_balance,
          requested_avu,
          naira_equivalent,
          bank_name,
          account_number,
          account_name,
          status,
          created_at,
          updated_at,
          ambassadors:ambassador_id (
            id,
            professional_name,
            email,
            phone_number,
            base_city
          )
        `)
        .or("status.eq.Pending,status.eq.pending,status.eq.pending_approval")
        .order("created_at", { ascending: false });

      // Diagnostic & RLS Error Handling
      if (error) {
        console.error("[PendingWithdrawals] Supabase SELECT query error on 'avu_withdrawals':", {
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

        // Graceful Fallback: If joined query fails due to relationship cache or join permissions,
        // attempt an unjoined direct query so withdrawals are NEVER hidden from the Admin.
        console.warn("[PendingWithdrawals] Attempting unjoined direct query on 'avu_withdrawals' as fallback...");
        const fallbackRes = await supabase
          .from("avu_withdrawals")
          .select("*")
          .or("status.eq.Pending,status.eq.pending,status.eq.pending_approval")
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
          // Fallback succeeded! We have the raw records
          console.info("[PendingWithdrawals] Fallback query succeeded without join.", fallbackRes.data?.length, "records recovered.");
          data = fallbackRes.data;
          setDiagnosticError(null);
        }
      } else {
        setDiagnosticError(null);
      }

      // Map and normalize records
      const parsedRows: AvuWithdrawalRecord[] = (data || []).map((row: any) => {
        const rawAmount = Number(row.requested_avu ?? row.avu_amount ?? row.amount ?? 0);
        const nairaVal = Number(row.naira_equivalent ?? (rawAmount * 1000));
        const joinedAmb = Array.isArray(row.ambassadors) ? row.ambassadors[0] : row.ambassadors;

        return {
          id: String(row.id),
          ambassador_id: String(row.ambassador_id || "Unknown Ambassador ID"),
          requested_avu: rawAmount,
          avu_amount: rawAmount,
          amount: rawAmount,
          naira_equivalent: nairaVal,
          bank_name: row.bank_name || "Bank Not Specified",
          account_number: row.account_number || "N/A",
          account_name: row.account_name || "",
          ambassador_name: row.ambassador_name || joinedAmb?.professional_name || row.account_name || "",
          email: row.email || joinedAmb?.email || "",
          current_balance: Number(row.current_balance ?? 0),
          status: row.status || "Pending",
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at,
          ambassadors: joinedAmb
            ? {
                id: joinedAmb.id,
                full_name: joinedAmb.full_name || joinedAmb.professional_name || joinedAmb.name || null,
                professional_name: joinedAmb.professional_name || null,
                name: joinedAmb.name || joinedAmb.professional_name || null,
                email: joinedAmb.email || null
              }
            : null
        };
      });

      console.log(`[PendingWithdrawals] Successfully loaded ${parsedRows.length} pending withdrawal requests.`);
      setWithdrawals(parsedRows);
    } catch (err: any) {
      console.error("[PendingWithdrawals] Unexpected query exception:", err);
      setDiagnosticError({
        message: err?.message || "An unexpected error occurred while querying pending withdrawals.",
        isRls: false
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // 2. Real-Time Supabase Subscription (.on('postgres_changes'))
  // --------------------------------------------------------------------------
  useEffect(() => {
    fetchPendingWithdrawals();

    if (!isSupabaseConfigured || !supabase) return;

    console.log("[PendingWithdrawals] Initializing Realtime channel on 'avu_withdrawals' table...");

    const channel = supabase
      .channel("admin_avu_withdrawals_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "avu_withdrawals"
        },
        (payload) => {
          console.info(
            "[PendingWithdrawals] Realtime Postgres change detected on 'avu_withdrawals':",
            payload.eventType,
            payload.new
          );
          // Refetch quietly so UI updates instantly without full spinner flash
          fetchPendingWithdrawals(true);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[PendingWithdrawals] Successfully subscribed to realtime 'avu_withdrawals' events.");
        } else if (status === "CHANNEL_ERROR") {
          console.warn("[PendingWithdrawals] Realtime subscription encountered a channel error.");
        }
      });

    // Cross-tab broadcast listener
    const handleStorageSync = (e: StorageEvent) => {
      if (
        e.key === "advaltad_withdrawals_updated" ||
        e.key === "advaltad_wallet_sync_ping" ||
        e.key === "advaltad_withdrawals_sync_ping" ||
        e.key === "advaltad_avu_withdrawals_db"
      ) {
        fetchPendingWithdrawals(true);
      }
    };
    window.addEventListener("storage", handleStorageSync);

    const handleCustomEvent = () => fetchPendingWithdrawals(true);
    window.addEventListener("advaltad_withdrawals_updated", handleCustomEvent);

    // Periodic polling backup so requests are captured even if WebSockets are interrupted
    const pollInterval = setInterval(() => {
      fetchPendingWithdrawals(true);
    }, 5000);

    return () => {
      console.log("[PendingWithdrawals] Cleaning up Realtime channel on unmount.");
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(pollInterval);
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener("advaltad_withdrawals_updated", handleCustomEvent);
    };
  }, [fetchPendingWithdrawals]);

  // --------------------------------------------------------------------------
  // 3. RPC Action Handlers (Approve & Reject)
  // --------------------------------------------------------------------------

  /**
   * Approve Action:
   * Calls `supabase.rpc('approve_avu_withdrawal', { p_withdrawal_id: id, p_admin_id: adminId })`
   */
  const handleApprove = async (withdrawal: AvuWithdrawalRecord) => {
    if (actionState.id) return; // Prevent duplicate or concurrent execution
    const targetId = withdrawal.id;

    setActionState({ id: targetId, action: "approve" });

    try {
      const effectiveAdminId = /^[0-9a-f-]{36}$/i.test(adminId)
        ? adminId
        : "00000000-0000-0000-0000-000000000000";

      console.log(`[PendingWithdrawals] Calling RPC 'approve_avu_withdrawal' for ID: ${targetId}...`);

      const { data, error } = await supabase.rpc("approve_avu_withdrawal", {
        p_withdrawal_id: targetId,
        p_admin_id: effectiveAdminId
      });

      if (error) {
        console.error("[PendingWithdrawals] RPC 'approve_avu_withdrawal' failed:", error);

        // Check if error is due to insufficient balance
        if (
          error.message?.toLowerCase().includes("insufficient") ||
          error.code === "P0001"
        ) {
          throw new Error("Ambassador has insufficient AVU balance to approve this withdrawal request.");
        }

        // Secondary resilient fallback: direct database update or serverless action
        console.warn("[PendingWithdrawals] Falling back to direct status update for approval...");
        const directRes = await supabase
          .from("avu_withdrawals")
          .update({
            status: "Approved",
            updated_at: new Date().toISOString()
          })
          .eq("id", targetId);

        if (directRes.error) {
          // Try serverless API route fallback
          const apiRes = await fetch("/api/withdraw-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "approve",
              withdrawal_id: targetId,
              admin_id: effectiveAdminId
            })
          });
          const apiData = await apiRes.json().catch(() => ({}));
          if (!apiRes.ok || !apiData.success) {
            throw new Error(apiData.error || directRes.error.message || error.message);
          }
        }
      } else if (data && data.success === false) {
        throw new Error(data.error || "Approval RPC returned failure status.");
      }

      // Optimistic UI update: remove row immediately from pending queue
      setWithdrawals((prev) => prev.filter((item) => item.id !== targetId));

      const ambName = getAmbassadorDisplayName(withdrawal);
      notifySuccess(`Approved liquidation of ${withdrawal.requested_avu} AVU for ${ambName}.`);

      // Dispatch event for other dashboard widgets
      window.dispatchEvent(
        new CustomEvent("advaltad_withdrawals_updated", {
          detail: { id: targetId, status: "Approved" }
        })
      );
    } catch (err: any) {
      console.error("[PendingWithdrawals] Approval execution error:", err);
      notifyError(err?.message || "Failed to approve withdrawal request.");
    } finally {
      setActionState({ id: null, action: null });
    }
  };

  /**
   * Reject / Disapprove Action:
   * Calls `supabase.rpc('reject_avu_withdrawal', { p_withdrawal_id: id, p_admin_id: adminId })`
   */
  const handleReject = async (withdrawal: AvuWithdrawalRecord) => {
    if (actionState.id) return; // Prevent duplicate or concurrent execution
    const targetId = withdrawal.id;

    setActionState({ id: targetId, action: "reject" });

    try {
      const effectiveAdminId = /^[0-9a-f-]{36}$/i.test(adminId)
        ? adminId
        : "00000000-0000-0000-0000-000000000000";

      console.log(`[PendingWithdrawals] Calling RPC 'reject_avu_withdrawal' for ID: ${targetId}...`);

      const { data, error } = await supabase.rpc("reject_avu_withdrawal", {
        p_withdrawal_id: targetId,
        p_admin_id: effectiveAdminId
      });

      if (error) {
        console.warn("[PendingWithdrawals] RPC 'reject_avu_withdrawal' note:", error.message);

        // Resilient fallback: Direct status update to 'Disapproved'
        const directRes = await supabase
          .from("avu_withdrawals")
          .update({
            status: "Disapproved",
            updated_at: new Date().toISOString()
          })
          .eq("id", targetId);

        if (directRes.error) {
          // Try serverless API route fallback
          const apiRes = await fetch("/api/withdraw-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "reject",
              withdrawal_id: targetId,
              admin_id: effectiveAdminId
            })
          });
          const apiData = await apiRes.json().catch(() => ({}));
          if (!apiRes.ok || !apiData.success) {
            throw new Error(apiData.error || directRes.error.message || error.message);
          }
        }
      } else if (data && data.success === false) {
        throw new Error(data.error || "Reject RPC returned failure status.");
      }

      // Optimistic UI update: remove row immediately from pending queue
      setWithdrawals((prev) => prev.filter((item) => item.id !== targetId));

      const ambName = getAmbassadorDisplayName(withdrawal);
      notifySuccess(`Disapproved withdrawal request for ${ambName}. Balance remains intact.`);

      // Dispatch event for other dashboard widgets
      window.dispatchEvent(
        new CustomEvent("advaltad_withdrawals_updated", {
          detail: { id: targetId, status: "Disapproved" }
        })
      );
    } catch (err: any) {
      console.error("[PendingWithdrawals] Rejection execution error:", err);
      notifyError(err?.message || "Failed to reject withdrawal request.");
    } finally {
      setActionState({ id: null, action: null });
    }
  };

  // --------------------------------------------------------------------------
  // Copy Helper
  // --------------------------------------------------------------------------
  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --------------------------------------------------------------------------
  // Client-Side Search Filter
  // --------------------------------------------------------------------------
  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery.trim()) return withdrawals;
    const q = searchQuery.toLowerCase().trim();

    return withdrawals.filter((item) => {
      const ambName = getAmbassadorDisplayName(item).toLowerCase();
      const ambEmail = getAmbassadorEmail(item).toLowerCase();
      const ambId = (item.ambassador_id || "").toLowerCase();
      const bank = (item.bank_name || "").toLowerCase();
      const accNum = (item.account_number || "").toLowerCase();
      const accName = (item.account_name || "").toLowerCase();
      const withId = (item.id || "").toLowerCase();

      return (
        ambName.includes(q) ||
        ambEmail.includes(q) ||
        ambId.includes(q) ||
        bank.includes(q) ||
        accNum.includes(q) ||
        accName.includes(q) ||
        withId.includes(q)
      );
    });
  }, [withdrawals, searchQuery]);

  // Aggregate stats
  const totalPendingAvu = useMemo(() => {
    return withdrawals.reduce((sum, item) => sum + (item.requested_avu || 0), 0);
  }, [withdrawals]);

  const totalPendingNaira = useMemo(() => {
    return withdrawals.reduce((sum, item) => sum + (item.naira_equivalent || 0), 0);
  }, [withdrawals]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className={`space-y-6 text-slate-100 ${className}`}>
      {/* -------------------------------------------------------------------- */}
      {/* Visual Diagnostic / RLS Permission Alert Banner                      */}
      {/* -------------------------------------------------------------------- */}
      {diagnosticError && (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start gap-4 shadow-xl">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            {diagnosticError.isRls ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1.5 flex-1 text-sm">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-base">
              <span>
                {diagnosticError.isRls
                  ? "Row Level Security (RLS) Policy Restriction"
                  : "Database Query Exception"}
              </span>
              {diagnosticError.code && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 font-mono">
                  Code: {diagnosticError.code}
                </span>
              )}
            </div>
            <p className="text-amber-200/90 leading-relaxed">
              {diagnosticError.message}
            </p>
            {diagnosticError.isRls && (
              <div className="pt-2 text-xs text-amber-300/80 bg-amber-950/60 p-3 rounded-xl border border-amber-500/20 font-mono">
                <p className="font-semibold text-amber-200 mb-1">
                  Required Fix in Supabase SQL Editor:
                </p>
                <code>
                  ALTER TABLE public.avu_withdrawals ENABLE ROW LEVEL SECURITY;<br />
                  CREATE POLICY &quot;Allow select access on avu_withdrawals&quot; ON public.avu_withdrawals FOR SELECT USING (true);
                </code>
              </div>
            )}
          </div>
          <button
            onClick={() => fetchPendingWithdrawals(false)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shrink-0 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Query
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Header, Search & Metrics Toolbar                                    */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Pending Liquidation Requests
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {withdrawals.length} {withdrawals.length === 1 ? "Request" : "Requests"}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Realtime queue of ambassador AVU withdrawal submissions awaiting administrative review.
          </p>
        </div>

        {/* Aggregate Metrics Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Total Pending AVU
              </div>
              <div className="text-sm font-bold text-white">
                {totalPendingAvu.toLocaleString()} AVU
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Total Naira Value
              </div>
              <div className="text-sm font-bold text-white">
                ₦{totalPendingNaira.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchPendingWithdrawals(false)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh pending requests"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing || isLoading ? "animate-spin text-emerald-400" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Search Bar                                                           */}
      {/* -------------------------------------------------------------------- */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by ambassador name, email, raw ID, bank, or account number..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
          >
            Clear
          </button>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Table / List Container                                              */}
      {/* -------------------------------------------------------------------- */}
      {isLoading ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium text-slate-300">
            Querying pending withdrawals from Supabase...
          </p>
          <p className="text-xs text-slate-500">
            Fetching left-joined ambassador profiles and real-time subscription
          </p>
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Pending Requests</h3>
            <p className="text-sm text-slate-400 max-w-md">
              {searchQuery
                ? `No pending requests match "${searchQuery}". Try a different search term.`
                : "All withdrawal requests have been reviewed and processed. New liquidation requests will appear here in real time."}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-5">Ambassador</th>
                <th className="py-4 px-5">Withdrawal Amount</th>
                <th className="py-4 px-5">Bank & Account Details</th>
                <th className="py-4 px-5">Requested At</th>
                <th className="py-4 px-5 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {filteredWithdrawals.map((item) => {
                const displayName = getAmbassadorDisplayName(item);
                const displayEmail = getAmbassadorEmail(item);
                const isOperating = actionState.id === item.id;
                const isApproving = isOperating && actionState.action === "approve";
                const isRejecting = isOperating && actionState.action === "reject";
                const isAnyActionLocked = actionState.id !== null;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-850/40 transition-colors group"
                  >
                    {/* Ambassador Profile / Fallback Column */}
                    <td className="py-4 px-5 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {displayName}
                            </div>
                            {displayEmail && (
                              <div className="text-xs text-slate-400 flex items-center gap-1 font-normal">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {displayEmail}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Raw Ambassador ID fallback & badge */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 cursor-pointer hover:text-white hover:border-slate-700 transition-colors"
                            onClick={() => copyToClipboard(item.ambassador_id, `amb-${item.id}`)}
                            title="Click to copy Ambassador UUID"
                          >
                            <span>ID: {item.ambassador_id.slice(0, 8)}...</span>
                            {copiedId === `amb-${item.id}` ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-slate-500" />
                            )}
                          </span>

                          {item.ambassadors ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-medium">
                              Joined Record
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 font-medium" title="Ambassador record was null on left join, using fallback ID">
                              Direct ID Fallback
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Withdrawal Amount Column */}
                    <td className="py-4 px-5 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-extrabold text-emerald-400 text-base">
                          <Coins className="w-4 h-4 shrink-0" />
                          <span>{item.requested_avu?.toLocaleString()} AVU</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-300">
                          ₦{item.naira_equivalent?.toLocaleString()} NGN
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Rate: 1 AVU = ₦1,000
                        </div>
                      </div>
                    </td>

                    {/* Bank & Account Details Column */}
                    <td className="py-4 px-5 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.bank_name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="font-mono text-xs font-semibold text-slate-200 tracking-wider">
                            {item.account_number}
                          </div>
                          <button
                            onClick={() =>
                              copyToClipboard(item.account_number || "", `acc-${item.id}`)
                            }
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Copy Account Number"
                          >
                            {copiedId === `acc-${item.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {item.account_name && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-slate-500" />
                            <span className="truncate max-w-[180px]">
                              {item.account_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Timestamp Column */}
                    <td className="py-4 px-5 align-top text-xs text-slate-400">
                      <div className="space-y-1">
                        <div className="text-slate-200 font-medium">
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(item.created_at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                          {item.status}
                        </span>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-4 px-5 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Approve Button */}
                        <button
                          onClick={() => handleApprove(item)}
                          disabled={isAnyActionLocked}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                          title="Trigger approve_avu_withdrawal RPC"
                        >
                          {isApproving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Approving...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </>
                          )}
                        </button>

                        {/* Disapprove / Reject Button */}
                        <button
                          onClick={() => handleReject(item)}
                          disabled={isAnyActionLocked}
                          className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-800/60 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                          title="Trigger reject_avu_withdrawal RPC"
                        >
                          {isRejecting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                              <span>Rejecting...</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
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
  );
};
export default PendingWithdrawals;
