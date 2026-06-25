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
  TrendingUp, 
  Sparkles,
  MapPin,
  Phone,
  AlertCircle
} from "lucide-react";
import { db, DbAmbassador, DbAdmin, DbActivity } from "../lib/supabase";

interface AdminPortalProps {
  onLogout: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout }) => {
  // Auth view states: "login" | "signup" | "dashboard"
  const [view, setView] = useState<"login" | "signup" | "dashboard">("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<DbAdmin | null>(null);

  // Form states
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "ambassadors" | "activities">("overview");

  // Database records
  const [ambassadors, setAmbassadors] = useState<DbAmbassador[]>([]);
  const [activities, setActivities] = useState<DbActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");

  // Detail view/modal states
  const [selectedAmbassador, setSelectedAmbassador] = useState<DbAmbassador | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [grantAmount, setGrantAmount] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("advaltad_admin_session_email");
    if (savedEmail) {
      db.findAdminByEmail(savedEmail).then((admin) => {
        if (admin) {
          setCurrentAdmin(admin);
          setIsAuthenticated(true);
          setView("dashboard");
        } else {
          localStorage.removeItem("advaltad_admin_session_email");
        }
      });
    }
    loadDbData();
  }, []);

  const loadDbData = async () => {
    try {
      const allAmbassadors = await db.getAmbassadors();
      const allActivities = await db.getActivities();
      setAmbassadors(allAmbassadors);
      setActivities(allActivities);
    } catch (err) {
      console.error("Failed to load DB details inside admin portal:", err);
    }
  };

  // Sign up handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword) {
      setAuthError("All fields are required.");
      return;
    }
    setAuthError("");
    setAuthSuccess("");
    setIsSubmitting(true);

    try {
      const existing = await db.findAdminByEmail(signupEmail);
      if (existing) {
        setAuthError("An admin account with this email already exists.");
        setIsSubmitting(false);
        return;
      }

      const admin = await db.createAdmin({
        name: signupName,
        email: signupEmail,
        password: signupPassword
      });

      setAuthSuccess("Sovereign Admin account created successfully! Please sign in.");
      // Auto-populate login and toggle view
      setLoginEmail(signupEmail);
      setIsSubmitting(false);
      setTimeout(() => {
        setView("login");
        setAuthSuccess("");
        // Clear signup fields
        setSignupName("");
        setSignupEmail("");
        setSignupPassword("");
      }, 2000);
    } catch (err) {
      setAuthError("Failed to register admin account.");
      setIsSubmitting(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAuthError("Please fill in all fields.");
      return;
    }
    setAuthError("");
    setIsSubmitting(true);

    try {
      const admin = await db.findAdminByEmail(loginEmail);
      if (!admin || admin.password !== loginPassword) {
        setAuthError("Invalid administrator credentials.");
        setIsSubmitting(false);
        return;
      }

      // Successful login
      localStorage.setItem("advaltad_admin_session_email", admin.email);
      setCurrentAdmin(admin);
      setIsAuthenticated(true);
      setView("dashboard");
      setIsSubmitting(false);
      loadDbData();
    } catch (err) {
      setAuthError("An unexpected error occurred during admin authentication.");
      setIsSubmitting(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("advaltad_admin_session_email");
    setCurrentAdmin(null);
    setIsAuthenticated(false);
    setView("login");
  };

  // Status Action Handlers
  const handleApproveAmbassador = async (id: string, name: string) => {
    try {
      await db.updateStatus(id, "approved");
      // Log event
      await db.logActivity({
        ambassador_id: id,
        ambassador_name: name,
        type: "status_change",
        desc: `Super Admin "${currentAdmin?.name}" approved Ambassador Fellowship credentials.`
      });
      loadDbData();
      if (selectedAmbassador?.id === id) {
        setSelectedAmbassador(prev => prev ? { ...prev, status: "approved" } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspendAmbassador = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete/suspend Ambassador ${name}?`)) return;
    try {
      await db.deleteAmbassador(id);
      // Log event
      await db.logActivity({
        type: "status_change",
        desc: `Super Admin "${currentAdmin?.name}" suspended/deleted Ambassador ${name} from registry.`
      });
      setSelectedAmbassador(null);
      setIsDetailOpen(false);
      loadDbData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGrantAVU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAmbassador || !grantAmount) return;
    const tokens = parseInt(grantAmount);
    if (isNaN(tokens) || tokens <= 0) return;

    setIsGranting(true);
    setGrantSuccess(false);

    try {
      const newBalance = selectedAmbassador.avu_balance + tokens;
      await db.updateAvuBalance(selectedAmbassador.id, newBalance);
      await db.logActivity({
        ambassador_id: selectedAmbassador.id,
        ambassador_name: selectedAmbassador.name,
        type: "avu_transfer",
        desc: `Super Admin "${currentAdmin?.name}" authorized a direct grant of ${tokens} AVU tokens to portfolio.`,
        amount: `${tokens} AVU`
      });

      setGrantSuccess(true);
      setGrantAmount("");
      loadDbData();
      setSelectedAmbassador(prev => prev ? { ...prev, avu_balance: newBalance } : null);
      setTimeout(() => setGrantSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGranting(false);
    }
  };

  // Filter calculations
  const filteredAmbassadors = ambassadors.filter((amb) => {
    const matchesSearch = 
      amb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      amb.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      amb.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      amb.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" || 
      amb.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalAVU = ambassadors.reduce((acc, curr) => acc + curr.avu_balance, 0);
  const pendingCount = ambassadors.filter(a => a.status === "pending").length;
  const approvedCount = ambassadors.filter(a => a.status === "approved").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 1. AUTHENTICATION PAGES FOR ADMIN */}
      {!isAuthenticated && (
        <div className="flex-1 flex items-center justify-center px-4 py-20 relative overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/25 via-slate-950 to-slate-950 z-0" />
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative z-10 border border-slate-100"
          >
            {/* Header logo / branding */}
            <div className="text-center space-y-2 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 mx-auto flex items-center justify-center font-display font-black text-lg shadow-lg">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-display font-black text-slate-900 tracking-tight">Super Admin Portal</h2>
                <p className="text-xs text-slate-500 font-sans mt-1">Sovereign Fellowship Ledger & Registries Control</p>
              </div>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 mb-6">
                <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 mb-6">
                <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {view === "login" ? (
                <motion.form 
                  key="login-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleLogin} 
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Administrator Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-3.5 text-slate-400" />
                      <input 
                        type="email" 
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="admin@advaltad.org"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-2xl text-xs font-semibold outline-none transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Access Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-3.5 text-slate-400" />
                      <input 
                        type="password" 
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-2xl text-xs font-semibold outline-none transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : "Verify Credentials"}
                  </button>

                  <div className="pt-4 text-center border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setView("signup")}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold tracking-tight cursor-pointer"
                    >
                      Need a sovereign supervisor account? Register here
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form 
                  key="signup-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleSignUp} 
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Sovereign Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="e.g. Sovereign Inspector"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-2xl text-xs font-semibold outline-none transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Supervisor Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-3.5 text-slate-400" />
                      <input 
                        type="email" 
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="inspector@advaltad.org"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-2xl text-xs font-semibold outline-none transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Strong Master Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-3.5 text-slate-400" />
                      <input 
                        type="password" 
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-2xl text-xs font-semibold outline-none transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : "Create Admin Account"}
                  </button>

                  <div className="pt-4 text-center border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setView("login")}
                      className="text-xs text-slate-600 hover:text-slate-800 font-bold tracking-tight cursor-pointer"
                    >
                      Already have an inspector account? Log in
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
            
            {/* Quick exit to home link */}
            <div className="mt-6 text-center">
              <a href="#/home" className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft size={12} /> Back to Public Foundation Website
              </a>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. AUTHENTICATED SUPER ADMIN DASHBOARD */}
      {isAuthenticated && currentAdmin && (
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar menu - collapsible */}
          <aside 
            className={`bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-all duration-300 ${
              sidebarCollapsed ? "w-16" : "w-64"
            } relative z-20`}
          >
            {/* Collapse button trigger */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute right-[-12px] top-10 w-6 h-6 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white cursor-pointer z-30"
            >
              {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>

            {/* Brand Logo Header */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-display font-black text-sm flex-shrink-0">
                A
              </div>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-display leading-tight flex-1"
                >
                  <p className="text-xs font-black tracking-wider text-white">ADVALTAD</p>
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest block">SUPER ADMIN</span>
                </motion.div>
              )}
            </div>

            {/* Menu Items */}
            <nav className="p-3 flex-1 space-y-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "overview"
                    ? "bg-emerald-600 text-white"
                    : "hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Activity size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>Ledger & Activities</span>}
              </button>

              <button
                onClick={() => setActiveTab("ambassadors")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "ambassadors"
                    ? "bg-emerald-600 text-white"
                    : "hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Users size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="flex-1 text-left flex items-center justify-between">
                    Ambassadors
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-[9px] text-slate-900 font-black animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </nav>

            {/* User profile segment in Sidebar bottom */}
            <div className="p-3 border-t border-slate-800">
              <div className="flex items-center gap-2.5 p-1 rounded-xl bg-slate-850/50 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700 flex-shrink-0 uppercase">
                  {currentAdmin.name.charAt(0)}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[11px] font-bold text-white truncate leading-none">{currentAdmin.name}</p>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">{currentAdmin.email}</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleAdminLogout}
                className={`w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all ${
                  sidebarCollapsed ? "justify-center" : ""
                }`}
              >
                <LogOut size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>Sign Out</span>}
              </button>
            </div>

          </aside>

          {/* Main workspace section */}
          <main className="flex-1 flex flex-col overflow-y-auto">
            
            {/* Admin Dashboard Navbar Header */}
            <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={20} />
                  Registry Management Controls
                </h1>
                <p className="text-xs text-slate-400">Verifying and auditing grassroots growth assets across Africa.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadDbData}
                  className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Activity size={14} className="text-slate-500" />
                  Refresh Ledger
                </button>
              </div>
            </header>

            {/* Workspace Contents */}
            <div className="p-6 sm:p-8 space-y-8 max-w-6xl w-full mx-auto">
              
              {/* Quick statistics panels cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Active Fellows</span>
                    <Users size={16} className="text-emerald-500" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-2xl font-black text-slate-950 tracking-tight">{approvedCount}</p>
                    <p className="text-[10px] text-slate-400 font-sans">Grassroots verified portfolios</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Pending Approvals</span>
                    <UserPlus size={16} className={`text-amber-500 ${pendingCount > 0 ? "animate-pulse" : ""}`} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-2xl font-black text-slate-950 tracking-tight">{pendingCount}</p>
                    <p className="text-[10px] text-slate-400 font-sans">Requires sovereign verification</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Sovereign Ledger Logs</span>
                    <Activity size={16} className="text-blue-500" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-2xl font-black text-slate-950 tracking-tight">{activities.length}</p>
                    <p className="text-[10px] text-slate-400 font-sans">Audit events recorded</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 text-white border border-slate-900 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Ledger Flow</span>
                    <Coins size={16} className="text-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-2xl font-black text-emerald-400 tracking-tight">{totalAVU.toLocaleString()} AVU</p>
                    <p className="text-[10px] text-slate-400 font-sans">Active token distribution</p>
                  </div>
                </div>
              </div>

              {/* TABS SELECTIVITY */}
              <AnimatePresence mode="wait">
                
                {/* TAB 1: OVERVIEW & ACTIVITIES */}
                {activeTab === "overview" && (
                  <motion.div
                    key="tab-v-overview"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Sovereign Registry Audit Trail</h3>
                        <p className="text-xs text-slate-500">Chronological history of registered ambassador events, credentials updates, and financial logs.</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                      <div className="divide-y divide-slate-100">
                        {activities.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 text-xs">
                            <Activity size={32} className="mx-auto mb-3 text-slate-300" />
                            No activity events currently registered.
                          </div>
                        ) : (
                          activities.map((act) => {
                            let typeColor = "bg-slate-50 text-slate-600 border-slate-200";
                            if (act.type === "registration") typeColor = "bg-blue-50 text-blue-800 border-blue-100";
                            if (act.type === "avu_transfer") typeColor = "bg-emerald-50 text-emerald-800 border-emerald-100";
                            if (act.type === "donation_logged") typeColor = "bg-amber-50 text-amber-800 border-amber-100";
                            if (act.type === "status_change") typeColor = "bg-purple-50 text-purple-800 border-purple-100";

                            return (
                              <div key={act.id} className="p-5 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left transition-colors">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${typeColor}`}>
                                      {act.type.replace("_", " ")}
                                    </span>
                                    {act.ambassador_name && (
                                      <span className="text-xs font-bold text-slate-800">
                                        {act.ambassador_name}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {new Date(act.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs font-sans text-slate-600 leading-relaxed max-w-2xl">
                                    {act.desc}
                                  </p>
                                </div>

                                {act.amount && (
                                  <div className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-center flex-shrink-0">
                                    {act.amount}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: AMBASSADORS LIST */}
                {activeTab === "ambassadors" && (
                  <motion.div
                    key="tab-v-ambassadors"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Filters bar */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                      <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search name, base city, ID, or email..."
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-150 focus:border-slate-800 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Filter Status:</span>
                        <div className="flex items-center bg-slate-50 p-1 border border-slate-150 rounded-xl w-full md:w-auto">
                          <button
                            onClick={() => setStatusFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              statusFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setStatusFilter("approved")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              statusFilter === "approved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            Approved
                          </button>
                          <button
                            onClick={() => setStatusFilter("pending")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              statusFilter === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            Pending
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Ambassadors directory list */}
                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                      <div className="divide-y divide-slate-100">
                        {filteredAmbassadors.length === 0 ? (
                          <div className="p-16 text-center text-slate-400 text-xs">
                            <Users size={36} className="mx-auto mb-3 text-slate-300" />
                            No ambassadors found matching filters.
                          </div>
                        ) : (
                          filteredAmbassadors.map((amb) => (
                            <div key={amb.id} className="p-6 hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all text-left">
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h4 className="text-sm font-black text-slate-950 tracking-tight">{amb.name}</h4>
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5">
                                    ID: {amb.id}
                                  </span>
                                  {amb.status === "approved" ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending Approval
                                    </span>
                                  )}
                                </div>

                                <div className="grid sm:grid-cols-3 gap-y-1 gap-x-4 text-xs font-sans text-slate-500">
                                  <p className="flex items-center gap-1.5">
                                    <MapPin size={12} className="text-slate-400" />
                                    {amb.city}
                                  </p>
                                  <p className="flex items-center gap-1.5">
                                    <Mail size={12} className="text-slate-400" />
                                    {amb.email}
                                  </p>
                                  <p className="flex items-center gap-1.5">
                                    <Compass size={12} className="text-slate-400" />
                                    {amb.field}
                                  </p>
                                </div>
                              </div>

                              {/* Action tools */}
                              <div className="flex items-center gap-2.5 flex-shrink-0">
                                {amb.status === "pending" && (
                                  <button
                                    onClick={() => handleApproveAmbassador(amb.id, amb.name)}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle size={12} />
                                    Approve
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedAmbassador(amb);
                                    setIsDetailOpen(true);
                                  }}
                                  className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye size={12} className="text-slate-400" />
                                  Manage Portfolio
                                </button>

                                <button
                                  onClick={() => handleSuspendAmbassador(amb.id, amb.name)}
                                  className="p-2 border border-rose-100 bg-rose-50 hover:bg-rose-100/50 text-rose-700 rounded-xl transition-all cursor-pointer"
                                  title="Decline/Delete Portfolio"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

            </div>

          </main>

        </div>
      )}

      {/* 3. MANAGE PORTFOLIO / SLIDING DETAIL DRAWER MODAL */}
      <AnimatePresence>
        {isDetailOpen && selectedAmbassador && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="absolute inset-0 bg-transparent"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white h-full relative z-10 shadow-2xl flex flex-col text-left border-l border-slate-100"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">
                    Grassroots Portfolio Auditor
                  </span>
                  <h3 className="text-base font-black text-slate-950 tracking-tight">{selectedAmbassador.name}</h3>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Body details */}
              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                
                {/* Meta details cards */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 font-mono">ID: {selectedAmbassador.id}</span>
                    {selectedAmbassador.status === "approved" ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                        VERIFIED FELLOW
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider animate-pulse">
                        PENDING AUDIT
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-slate-150/60 text-xs text-slate-700 font-sans space-y-2.5 pt-1">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400">Email Address</span>
                      <span className="font-semibold text-slate-850">{selectedAmbassador.email}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">Telephone Contact</span>
                      <span className="font-semibold text-slate-850">{selectedAmbassador.phone || "No details listed"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">Ledger Balance</span>
                      <span className="font-mono font-black text-slate-900 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg">
                        {selectedAmbassador.avu_balance} AVU
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">Base City & Country</span>
                      <span className="font-semibold text-slate-850">{selectedAmbassador.city}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">Created At</span>
                      <span className="font-semibold text-slate-850">
                        {new Date(selectedAmbassador.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Focus division banner */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Sovereign Field Activity scope
                  </h4>
                  <p className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl p-4 shadow-xs leading-relaxed">
                    {selectedAmbassador.field}
                  </p>
                </div>

                {/* Direct Token Grant System */}
                <div className="p-5 border border-slate-150 rounded-2xl bg-white space-y-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Coins size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider">Direct Token Grant system</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-sans">
                    Authorize a ledger balance boost for this partner's grassroots programs.
                  </p>

                  {grantSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-600" />
                      Direct token authorization synced with ledger!
                    </div>
                  )}

                  <form onSubmit={handleGrantAVU} className="flex gap-2">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 500"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={isGranting}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-200 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {isGranting ? "..." : "Authorize"}
                    </button>
                  </form>
                </div>

                {/* Audit Actions */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Auditor Oversight Actions
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedAmbassador.status === "pending" && (
                      <button
                        onClick={() => handleApproveAmbassador(selectedAmbassador.id, selectedAmbassador.name)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle size={14} /> Approve Fellow
                      </button>
                    )}

                    <button
                      onClick={() => handleSuspendAmbassador(selectedAmbassador.id, selectedAmbassador.name)}
                      className="w-full py-3 bg-rose-50 hover:bg-rose-100/50 text-rose-700 border border-rose-100 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={14} /> Suspend/Delete
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
