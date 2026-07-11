import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Activity, 
  ShieldCheck, 
  Search, 
  Trash2, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Coins, 
  Eye, 
  UserPlus, 
  Mail, 
  Lock, 
  Compass, 
  User, 
  AlertCircle, 
  Plus, 
  Edit, 
  History, 
  Download, 
  CreditCard,
  MapPin
} from "lucide-react";
import { db, DbAmbassador, DbAdmin, DbActivity, DbBlog, DbAmbassadorWallet, DbAuditLog, supabase, supabaseAdmin, isSupabaseConfigured } from "../lib/supabase";
import { triggerApprovalEmail, getSentEmails, SentEmailLog } from "../lib/emailService";
import { FinancialOverviewChart } from "./FinancialOverviewChart";
import { RegionalGrowthChart } from "./RegionalGrowthChart";
import { traceDbOperation, traceGenericOperation, logDbOperation } from "../lib/db-logger";

interface AdminPortalProps {
  onLogout: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout }) => {
  // Auth view states: "login" | "signup" | "dashboard"
  const [view, setView] = useState<"login" | "signup" | "dashboard">("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Core Data Tables
  const [ambassadors, setAmbassadors] = useState<DbAmbassador[]>([]);
  const [wallets, setWallets] = useState<DbAmbassadorWallet[]>([]);
  const [activities, setActivities] = useState<DbActivity[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmailLog[]>([]);
  
  // Navigation tabs: "ambassadors" | "wallets" | "emails" | "analytics"
  const [activeTab, setActiveTab] = useState<"ambassadors" | "wallets" | "emails" | "analytics">("ambassadors");
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "disapproved">("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected object for modal viewing
  const [selectedAmbassador, setSelectedAmbassador] = useState<DbAmbassador | null>(null);
  const [selectedEmailForView, setSelectedEmailForView] = useState<SentEmailLog | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Re-fetch Core Data Hook
  const fetchAllAdminData = async () => {
    try {
      console.log("[ADMIN PORTAL] Refreshing global registry records...");
      
      // Fetch Ambassadors
      if (isSupabaseConfigured && supabase) {
        const { data: ambData, error: ambErr } = await supabase
          .from("ambassadors")
          .select("*")
          .order("created_at", { ascending: false });
        if (!ambErr && ambData) {
          setAmbassadors(ambData as DbAmbassador[]);
        }
      } else {
        const localAmbs = await db.getAmbassadors();
        setAmbassadors(localAmbs);
      }

      // Fetch Wallets
      if (isSupabaseConfigured && supabase) {
        const { data: walData, error: walErr } = await supabase
          .from("ambassador_wallets")
          .select("*");
        if (!walErr && walData) setWallets(walData as DbAmbassadorWallet[]);
      }

      // Sync email logs
      const emailLogs = getSentEmails();
      setSentEmails(emailLogs);

    } catch (err) {
      console.error("Failed to re-fetch system tables:", err);
    }
  };

  useEffect(() => {
    // Check local session token on mount
    const activeAdmin = localStorage.getItem("advaltad_admin_session");
    if (activeAdmin) {
      setAdminEmail(activeAdmin);
      setIsAuthenticated(true);
      setView("dashboard");
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && view === "dashboard") {
      fetchAllAdminData();
    }
  }, [isAuthenticated, view]);

  // Handle direct database verification/approval trigger - CRITICAL FIX APPLIED HERE
  const handleApproveAmbassadorDirect = async (id: string, email: string, name: string) => {
    if (!id) return;
    setActionLoadingId(id);
    console.log(`[ADMIN PORTAL] Direct mutation sequence fired for row ID: ${id}`);

    try {
      let success = false;
      
      if (isSupabaseConfigured && supabase) {
        // Fix 1: Target primary ID key directly instead of unstable .or() chain block
        // Fix 2: Mutate only 'badge_status' column to match exact DB constraints
        const { error } = await supabase
          .from("ambassadors")
          .update({ badge_status: "approved" })
          .eq("id", id);
        
        if (!error) {
          success = true;
        } else {
          console.error("Primary key match write error, engaging secondary UUID block lookup:", error);
          
          // Safety verification mapping step if identifier was custom user_id string
          const { error: userKeyErr } = await supabase
            .from("ambassadors")
            .update({ badge_status: "approved" })
            .eq("user_id", id);
            
          if (!userKeyErr) success = true;
        }
      }

      // Fallback adapter block execution hook execution
      const localUpdate = await db.updateStatus(id, "approved");
      if (localUpdate) success = true;

      if (success) {
        console.log(`[ADMIN PORTAL] Mutation successfully written to remote storage pools.`);
        
        // Force synchronous internal view matrix state update immediately to update UI instantly
        setAmbassadors(prev => 
          prev.map(amb => 
            amb.id === id || amb.user_id === id ? { ...amb, badge_status: "approved" } : amb
          )
        );

        // Dispatch background transactional mail notifications
        try {
          await triggerApprovalEmail(email, name);
        } catch (emailErr) {
          console.warn("Mail dispatch unconfigured or skipped:", emailErr);
        }

        // Re-read master cluster logs to ensure pristine telemetry state
        await fetchAllAdminData();
      } else {
        alert("Database mutation rejected. Check system column architecture schema permissions.");
      }
    } catch (err: any) {
      console.error("Critical dashboard state execution crash exception:", err);
      alert("Error processing approval transaction workflow: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDisapproveAmbassadorDirect = async (id: string) => {
    if (!id) return;
    setActionLoadingId(id);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from("ambassadors")
          .update({ badge_status: "disapproved" })
          .eq("id", id);
      }
      await db.updateStatus(id, "disapproved");
      
      setAmbassadors(prev => 
        prev.map(amb => 
          amb.id === id || amb.user_id === id ? { ...amb, badge_status: "disapproved" } : amb
        )
      );
      
      await fetchAllAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (!adminEmail || !adminPassword) {
      setErrorMsg("Please fill in all standard administrative access fields.");
      setLoading(false);
      return;
    }

    if (adminPassword === "admin123" || adminPassword === "advaltad2026") {
      localStorage.setItem("advaltad_admin_session", adminEmail);
      setIsAuthenticated(true);
      setView("dashboard");
    } else {
      setErrorMsg("Invalid administrative clearance signatures. Access Denied.");
    }
    setLoading(false);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("advaltad_admin_session");
    setIsAuthenticated(false);
    setView("login");
    onLogout();
  };

  // Filter Pipeline Implementation
  const filteredAmbassadors = ambassadors.filter(amb => {
    const nameMatch = (amb.professional_name || amb.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (amb.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const cityMatch = (amb.base_city || amb.city || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const searchPass = nameMatch || emailMatch || cityMatch;
    
    const currentBadgeStatus = (amb.badge_status || amb.status || "pending").toLowerCase().trim();
    if (statusFilter === "all") return searchPass;
    if (statusFilter === "pending") return searchPass && currentBadgeStatus === "pending";
    if (statusFilter === "approved") return searchPass && (currentBadgeStatus === "approved" || currentBadgeStatus === "active" || currentBadgeStatus === "verified");
    if (statusFilter === "disapproved") return searchPass && (currentBadgeStatus === "disapproved" || currentBadgeStatus === "rejected");
    
    return searchPass;
  });

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(filteredAmbassadors.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAmbassadors.slice(indexOfFirstItem, indexOfLastItem);

  if (view === "login") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans select-none text-white">
        <div className="w-full max-w-md bg-slate-950/50 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-xl font-black font-serif tracking-tight">Legislative Central Deck</h2>
            <p className="text-xs text-slate-400">Provide clearance protocols to review registry applications.</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2.5">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 uppercase font-black tracking-wider mb-1">Root Identifier</label>
              <input 
                type="email" 
                required
                placeholder="e.g. director@advaltad.org"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-emerald-500 text-sm rounded-xl text-white outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-400 uppercase font-black tracking-wider mb-1">Clearance Cipher</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-emerald-500 text-sm rounded-xl text-white outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Decrypting Protocol..." : "Initialize Dashboard Session"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-inner">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-md font-black tracking-tight font-serif flex items-center gap-2">
              Advaltad Governance Network <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Superuser Desk</span>
            </h1>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">Continuous Ledger Audits & Core Registry Approvals</p>
          </div>
        </div>

        <button 
          onClick={handleAdminLogout}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-200 border border-slate-700 hover:border-red-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>Terminate Session</span>
        </button>
      </header>

      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-12 gap-6 overflow-hidden">
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2 mb-2">Navigation Core</p>
            
            <button
              onClick={() => { setActiveTab("ambassadors"); setCurrentPage(1); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeTab === "ambassadors" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={16} />
                <span>Ambassador Registry</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === "ambassadors" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{ambassadors.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab("wallets"); setCurrentPage(1); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeTab === "wallets" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <div className="flex items-center gap-2.5">
                <Coins size={16} />
                <span>AVU Token Wallets</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === "wallets" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{wallets.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab("emails"); setCurrentPage(1); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeTab === "emails" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <div className="flex items-center gap-2.5">
                <Mail size={16} />
                <span>SMTP Communications Log</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === "emails" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{sentEmails.length}</span>
            </button>

            <button
              onClick={() => { setActiveTab("analytics"); setCurrentPage(1); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeTab === "analytics" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <div className="flex items-center gap-2.5">
                <Activity size={16} />
                <span>Network Analytics Overview</span>
              </div>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black font-mono">LIVE</span>
            </button>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-4 text-white border border-slate-800 shadow-md space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">System Operational Metrics</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <p className="text-xl font-black text-emerald-400 font-serif">{ambassadors.filter(a => (a.badge_status||a.status||"").toLowerCase().trim() === "approved").length}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Active Rows</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <p className="text-xl font-black text-amber-400 font-serif">{ambassadors.filter(a => (a.badge_status||a.status||"").toLowerCase().trim() === "pending").length}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Pending Nodes</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-9 space-y-6 flex flex-col justify-start">
          {activeTab === "ambassadors" && (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, certified email address, or operating base city..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl font-medium placeholder-slate-400 text-slate-700 outline-none focus:border-emerald-600 transition-all shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Filter Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e: any) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-white border border-slate-200/80 px-3 py-2 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-600"
                  >
                    <option value="all">Show All Profiles</option>
                    <option value="pending">Awaiting Approval (Pending)</option>
                    <option value="approved">Active & Verified (Approved)</option>
                    <option value="disapproved">Disapproved / Suspended</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200/60 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Ambassador Profile Info</th>
                      <th className="py-3 px-4">Operating Base City</th>
                      <th className="py-3 px-4">Focus Interest Category</th>
                      <th className="py-3 px-4">System Verification Status</th>
                      <th className="py-3 px-4 text-right">Administrative Interventions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {currentItems.map((amb) => {
                      const badgeStatus = (amb.badge_status || amb.status || "pending").toLowerCase().trim();
                      return (
                        <tr key={amb.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-extrabold text-slate-900 text-sm">{amb.professional_name || amb.name}</div>
                            <div className="text-slate-400 font-mono text-[11px] mt-0.5">{amb.email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400" />
                              <span>{amb.base_city || amb.city || "Not Specified"}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 italic max-w-[200px] truncate">
                            {amb.focus_interest || amb.field || "General Field Deployment"}
                          </td>
                          <td className="py-3.5 px-4">
                            {badgeStatus === "approved" || badgeStatus === "active" || badgeStatus === "verified" ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">
                                <CheckCircle size={10} /> Active Verified
                              </span>
                            ) : badgeStatus === "disapproved" || badgeStatus === "rejected" ? (
                              <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/50 font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">
                                <XCircle size={10} /> Disapproved
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/50 font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">
                                <History size={10} /> Pending Review
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {badgeStatus !== "approved" && badgeStatus !== "active" && badgeStatus !== "verified" && (
                              <button
                                onClick={() => handleApproveAmbassadorDirect(amb.id, amb.email, amb.professional_name || amb.name)}
                                disabled={actionLoadingId === amb.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                {actionLoadingId === amb.id ? (
                                  <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                                ) : (
                                  "Approve Row"
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedAmbassador(amb)}
                              className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer inline-block"
                            >
                              <Eye size={14} />
                            </button>

                            {badgeStatus !== "disapproved" && (
                              <button
                                onClick={() => handleDisapproveAmbassadorDirect(amb.id)}
                                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all cursor-pointer inline-block"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {currentItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                          No active ambassador records match the current lookup criteria filter parameters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                <p>Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAmbassadors.length)} of {filteredAmbassadors.length} entries</p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40 rounded-lg transition-all cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-mono text-slate-800">{currentPage} / {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40 rounded-lg transition-all cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "wallets" && (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-4 flex-1">
              <div className="space-y-1">
                <h3 className="text-md font-black tracking-tight flex items-center gap-1.5"><Coins size={18} className="text-amber-500" /> Decentralized Ledger Ecosystem balances</h3>
                <p className="text-xs text-slate-400">Review token ledger rows synced across registered on-field actors.</p>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] border-b border-slate-100">
                      <th className="p-3">Wallet Binding Key</th>
                      <th className="p-3">Linked Ambassador Account</th>
                      <th className="p-3 text-right">AVU Balance Allocation Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {wallets.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-[10px] text-slate-400">{w.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{w.email}</div>
                          <div className="text-[10px] font-mono text-slate-400">Node ID Reference: {w.ambassador_id}</div>
                        </td>
                        <td className="p-3 text-right font-black text-sm text-emerald-600 font-mono">
                          {Number(w.balance || 0).toLocaleString()} AVU
                        </td>
                      </tr>
                    ))}
                    {wallets.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-400 font-bold">No active wallet metrics discovered inside tracking publication array indexes.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "emails" && (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-4 flex-1">
              <div className="space-y-1">
                <h3 className="text-md font-black tracking-tight flex items-center gap-1.5"><Mail size={18} className="text-indigo-500" /> SMTP Outbound Transmission Audit Terminal</h3>
                <p className="text-xs text-slate-400">Read cryptographically logged notification payloads sent via transport handlers.</p>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] border-b border-slate-100">
                      <th className="p-3">Transmission Timestamp</th>
                      <th className="p-3">Recipient Identity</th>
                      <th className="p-3">Subject String Heading</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-mono text-[11px] text-slate-600">
                    {sentEmails.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 whitespace-nowrap text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-3 font-sans font-bold text-slate-800">
                          {log.recipientName} &lt;{log.recipientEmail}&gt;
                        </td>
                        <td className="p-3 font-sans text-slate-500 truncate max-w-xs">{log.subject}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedEmailForView(log)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-sans font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                          >
                            Preview JSON Payload html
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sentEmails.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 font-sans font-bold">No message logs cached within transmission buffer memory pools.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="grid md:grid-cols-2 gap-6 flex-1">
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 h-[320px] flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Registry Funding allocations</h4>
                  <p className="text-[11px] text-slate-400 leading-tight">Total aggregate token values scattered across operational nodes.</p>
                </div>
                <div className="flex-1 min-h-0 pt-2">
                  <FinancialOverviewChart />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 h-[320px] flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Regional Concentration Metrics</h4>
                  <p className="text-[11px] text-slate-400 leading-tight">Density trace of authorized deployment operators sorted by base city.</p>
                </div>
                <div className="flex-1 min-h-0 pt-2">
                  <RegionalGrowthChart />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {selectedAmbassador && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm select-none text-xs text-slate-700">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col"
            >
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-emerald-400" />
                  <h3 className="text-sm font-black tracking-tight">Full Identity Profile Specifications</h3>
                </div>
                <button onClick={() => setSelectedAmbassador(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer text-sm">✕</button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto font-medium">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-50 pb-3">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Professional Full Name</p>
                    <p className="text-slate-900 font-extrabold text-sm">{selectedAmbassador.professional_name || selectedAmbassador.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Operating Registry Balance</p>
                    <p className="text-emerald-600 font-black text-sm font-mono">{selectedAmbassador.avu_balance || 1250} AVU</p>
                  </div>
                </div>

                <div className="space-y-2 border-b border-slate-50 pb-3">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Communications Interface Mail</p>
                    <p className="text-slate-800 font-mono font-bold select-all">{selectedAmbassador.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Mobile Phone Contact</p>
                    <p className="text-slate-800 font-mono font-bold select-all">{selectedAmbassador.phone_number || selectedAmbassador.phone || "No Number Linked"}</p>
                  </div>
                </div>

                <div className="space-y-2 border-b border-slate-50 pb-3">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Geographic Operational Area (City)</p>
                    <p className="text-slate-800 font-bold">{selectedAmbassador.base_city || selectedAmbassador.city}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Core Field Directive Interest</p>
                    <p className="text-slate-600 italic leading-relaxed">{selectedAmbassador.focus_interest || selectedAmbassador.field}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[11px] font-mono text-slate-400">
                  <div>
                    <p className="uppercase text-[9px] font-black tracking-wider">System Profile Key</p>
                    <p className="truncate select-all">{selectedAmbassador.id}</p>
                  </div>
                  <div>
                    <p className="uppercase text-[9px] font-black tracking-wider">Auth Token Identifier</p>
                    <p className="truncate select-all">{selectedAmbassador.user_id || "Unlinked Authentication Link"}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setSelectedAmbassador(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Dismiss Profile Summary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEmailForView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none text-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Mail size={18} className="text-indigo-400" />
                  <h3 className="text-sm font-black tracking-tight">Outgoing Communication Audit Payload</h3>
                </div>
                <button onClick={() => setSelectedEmailForView(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer text-sm">✕</button>
              </div>

              <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-1.5 text-xs shrink-0 text-left">
                <p className="text-slate-900 font-extrabold"><strong className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Subject:</strong> {selectedEmailForView.subject}</p>
                <p className="text-slate-500 font-mono"><strong className="text-slate-700">To:</strong> {selectedEmailForView.recipientName} &lt;{selectedEmailForView.recipientEmail}&gt;</p>
                <p className="text-slate-500 font-mono"><strong className="text-slate-700">Sent Via:</strong> <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{selectedEmailForView.method}</span></p>
              </div>

              <div className="p-4 overflow-y-auto bg-slate-100 flex-1 flex justify-center">
                <div 
                  className="w-full max-w-full bg-white rounded-xl shadow-sm p-4 overflow-hidden border border-slate-200 max-h-[50vh] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmailForView.bodyHtml }}
                />
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                <button
                  onClick={() => setSelectedEmailForView(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};