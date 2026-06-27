import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured, db } from "../lib/supabase";
import { Users, RefreshCw, AlertTriangle, CheckCircle, Shield } from "lucide-react";

export const AdminStats: React.FC = () => {
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);
  const [disapprovedCount, setDisapprovedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchCounts = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        // Fallback to local storage if Supabase is not configured
        const localData = localStorage.getItem("advaltad_db_ambassadors");
        if (localData) {
          const parsed = JSON.parse(localData);
          setTotalCount(parsed.length);
          setPendingCount(parsed.filter((a: any) => a.status === "pending").length);
          setApprovedCount(parsed.filter((a: any) => a.status === "approved").length);
          setDisapprovedCount(parsed.filter((a: any) => a.status === "disapproved").length);
        } else {
          setTotalCount(0);
          setPendingCount(0);
          setApprovedCount(0);
          setDisapprovedCount(0);
        }
        setLastRefreshed(new Date());
        setLoading(false);
        return;
      }

      // Step 1: Validate active user session context to bypass/account for RLS issues
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn("Session retrieval failed:", sessionError);
      }
      setIsAuthenticated(!!session);
      setSessionChecked(true);

      // Step 2: Query the correct Ambassadors table (supporting both casing variations)
      let tableToUse = "Ambassadors";
      
      // Let's test the exact query specified: supabase.from('Ambassadors').select('*', { count: 'exact', head: true })
      let { count, error: queryError } = await supabase
        .from("Ambassadors")
        .select("*", { count: "exact", head: true });

      // If capitalized Ambassadors table does not exist or fails, fall back to lowercase "ambassadors"
      if (queryError) {
        console.info("Trying lowercase 'ambassadors' table fallback...");
        const fallbackRes = await supabase
          .from("ambassadors")
          .select("*", { count: "exact", head: true });
        
        if (!fallbackRes.error) {
          count = fallbackRes.count;
          tableToUse = "ambassadors";
          queryError = null;
        } else {
          // Both failed, throw query error
          throw new Error(queryError.message || fallbackRes.error.message);
        }
      }

      setTotalCount(count !== undefined ? count : 0);

      // Let's fetch the detail breakdown to show complete administrative intelligence
      const { data: breakdownData, error: breakdownError } = await supabase
        .from(tableToUse)
        .select("badge_status");

      if (!breakdownError && breakdownData) {
        let pCount = 0;
        let aCount = 0;
        let dCount = 0;

        breakdownData.forEach((row: any) => {
          const rawStatus = (row.badge_status || "pending").toString().toLowerCase().trim();
          if (rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified") {
            aCount++;
          } else if (rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended") {
            dCount++;
          } else {
            pCount++; // Treat 'waiting admin approval', 'pending', and empty as pending
          }
        });

        setPendingCount(pCount);
        setApprovedCount(aCount);
        setDisapprovedCount(dCount);
      } else {
        // Standard fallback if breakdown fails but total succeeded
        setPendingCount(0);
        setApprovedCount(0);
        setDisapprovedCount(0);
      }

      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Failed to query Ambassadors counts:", err);
      setError(err?.message || "Internal database connection failure.");
    } finally {
      setLoading(false);
    }
  };

  // Perform initial fetch and set up real-time refresh poll
  useEffect(() => {
    fetchCounts();

    // Set up polling interval for real-time refresh (e.g., every 15 seconds)
    const interval = setInterval(() => {
      fetchCounts();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div id="admin-stats-container" className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Shield size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-display font-black tracking-tight uppercase">Sovereign Directory Ledger</h3>
            <p className="text-[10px] text-slate-400 font-mono">Real-time cryptographic registry telemetry</p>
          </div>
        </div>

        <button
          id="admin-stats-refresh-btn"
          onClick={fetchCounts}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
          title="Force update ledger telemetry"
        >
          <RefreshCw size={14} className={`${loading ? "animate-spin text-emerald-400" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-200 text-xs flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 text-red-400 flex-shrink-0" />
          <div className="space-y-1">
            <span className="font-extrabold font-mono block">LEDGER_SYNC_ERROR</span>
            <p className="opacity-90 leading-relaxed text-[11px]">{error}</p>
          </div>
        </div>
      )}

      {/* Main Stats Display */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl space-y-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Total Signups</span>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black tracking-tight text-white font-mono">
              {totalCount !== null ? totalCount : "—"}
            </p>
          </div>
          <p className="text-[9px] text-slate-400 font-sans">Combined registered applications</p>
        </div>

        {/* Pending Approvals */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl space-y-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block">Pending verification</span>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black tracking-tight text-amber-400 font-mono">
              {pendingCount !== null ? pendingCount : "—"}
            </p>
          </div>
          <p className="text-[9px] text-slate-400 font-sans">Requires sovereign check</p>
        </div>

        {/* Approved Growth Fellows */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl space-y-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">Active Fellows</span>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
              {approvedCount !== null ? approvedCount : "—"}
            </p>
          </div>
          <p className="text-[9px] text-slate-400 font-sans">On-chain active ambassadors</p>
        </div>

        {/* Disapproved Applications */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl space-y-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-red-400 block">Suspended/Rejected</span>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black tracking-tight text-red-400 font-mono">
              {disapprovedCount !== null ? disapprovedCount : "—"}
            </p>
          </div>
          <p className="text-[9px] text-slate-400 font-sans">Disapproved registration slots</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1 border-t border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <span>
            {isSupabaseConfigured 
              ? `Connected (using RLS-${isAuthenticated ? "auth-session" : "public"})` 
              : "Demo Fallback Mode"}
          </span>
        </div>
        {lastRefreshed && (
          <span>Telemetry: {lastRefreshed.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
};
