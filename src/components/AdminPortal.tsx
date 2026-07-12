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
  const [activeTab, setActiveTab] = useState<"overview" | "ambassadors" | "activities" | "blogs" | "wallets" | "history" | "payments">("overview");

  // Payment Gateway Tab states
  const [selectedAmbId, setSelectedAmbId] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("Youth Empowerment Initiative");
  const [milestoneAmount, setMilestoneAmount] = useState("15000");
  const [directDepositAmount, setDirectDepositAmount] = useState("");
  const [generatedPublicLink, setGeneratedPublicLink] = useState("");

  // Database records
  const [ambassadors, setAmbassadors] = useState<DbAmbassador[]>([]);
  const [activities, setActivities] = useState<DbActivity[]>([]);
  const [auditLogs, setAuditLogs] = useState<DbAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "disapproved">("all");

  // Blog states
  const [blogs, setBlogs] = useState<DbBlog[]>([]);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogTag, setBlogTag] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogImage, setBlogImage] = useState("");
  const [editingBlog, setEditingBlog] = useState<DbBlog | null>(null);
  const [isBlogFormOpen, setIsBlogFormOpen] = useState(false);

  // Wallet states
  const [wallets, setWallets] = useState<DbAmbassadorWallet[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedWalletAmbassador, setSelectedWalletAmbassador] = useState<DbAmbassador | null>(null);
  const [walletFundAmount, setWalletFundAmount] = useState("");
  const [isFundingWallet, setIsFundingWallet] = useState(false);

  // Detail view/modal states
  const [selectedAmbassador, setSelectedAmbassador] = useState<DbAmbassador | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [grantAmount, setGrantAmount] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState(false);

  // Manage Portfolio editing form states
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editField, setEditField] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Status Action Confirmation Modal State
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    id: string;
    name: string;
    action: "approve" | "disapprove" | "suspend";
  } | null>(null);

  // Transactional Email states
  const [sentEmails, setSentEmails] = useState<SentEmailLog[]>([]);
  const [historySubTab, setHistorySubTab] = useState<"audit" | "emails">("audit");
  const [selectedEmailForView, setSelectedEmailForView] = useState<SentEmailLog | null>(null);

  // Loading state for database fetching
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbError, setDbError] = useState("");

  // Bulk action states
  const [selectedAmbassadorIds, setSelectedAmbassadorIds] = useState<string[]>([]);
  const [bulkConfirmModal, setBulkConfirmModal] = useState<{
    ids: string[];
    action: "approve" | "disapprove";
  } | null>(null);

  useEffect(() => {
    if (selectedAmbassador) {
      setEditName(selectedAmbassador.name);
      setEditCity(selectedAmbassador.city);
      setEditField(selectedAmbassador.field);
      setEditPhone(selectedAmbassador.phone || "");
      setEditSuccess(false);
    }
  }, [selectedAmbassador]);

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

  // Setup real-time Supabase subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel("admin-ambassadors-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassadors" },
        () => {
          console.info("Realtime Postgres update received on 'ambassadors' table, refetching fresh records...");
          loadDbData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Ambassadors" },
        () => {
          console.info("Realtime Postgres update received on 'Ambassadors' table, refetching fresh records...");
          loadDbData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  // Reload data on tab change, view change, or authentication status change
  useEffect(() => {
    if (isAuthenticated) {
      loadDbData();
    }
  }, [activeTab, view, isAuthenticated]);

  const loadBlogs = async () => {
    try {
      const allBlogs = await db.getBlogs();
      setBlogs(allBlogs);
    } catch (err) {
      console.error("Failed to load blogs:", err);
    }
  };

  const loadWallets = async () => {
    try {
      const allWallets = await db.getWallets();
      setWallets(allWallets);
    } catch (err) {
      console.error("Failed to load wallets:", err);
    }
  };

  const loadDbData = async () => {
    setIsLoadingDb(true);
    setDbError("");
    try {
      // Load wallets first so we have accurate balance data to merge
      let walletsData: DbAmbassadorWallet[] = [];
      try {
        walletsData = await db.getWallets();
        setWallets(walletsData);
        logDbOperation("Admin Portal Fetch Wallets Success", { count: walletsData.length }, null);
      } catch (wErr) {
        console.error("[ADMIN PORTAL] Failed to pre-load wallets:", wErr);
        logDbOperation("Admin Portal Fetch Wallets Error", {}, wErr);
      }

      let allAmbassadors: DbAmbassador[] = [];
      if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
        console.log("[ADMIN PORTAL] ATTEMPT: Initiating direct SELECT * query on 'public.ambassadors' table ordered by created_at desc to pull raw, real-time data from Supabase...");
        const client = supabaseAdmin || supabase;
        let { data, error } = await client
          .from("ambassadors")
          .select("*")
          .order("created_at", { ascending: false });

        if (error || !data) {
          console.warn("[ADMIN PORTAL] Warning: Direct query on 'ambassadors' table failed or returned empty. Trying fallback casing 'Ambassadors'...", error);
          const fallbackRes = await client
            .from("Ambassadors")
            .select("*")
            .order("created_at", { ascending: false });
          if (!fallbackRes.error && fallbackRes.data) {
            data = fallbackRes.data;
          } else if (fallbackRes.error) {
            console.error("[ADMIN PORTAL] Error: All attempts to query Supabase 'ambassadors'/'Ambassadors' table with SELECT * failed:", fallbackRes.error);
            logDbOperation("Admin Portal Fetch Ambassadors Fallback Error", {}, fallbackRes.error);
            throw fallbackRes.error;
          }
        }

        if (data) {
          console.log("[ADMIN PORTAL] SUCCESS: Direct SELECT * query completed with 'created_at' desc. Fetched raw records count:", data.length);
          console.table(data); // Console table output of raw fetched data bypasses local filters for direct visual check
          logDbOperation("Admin Portal Fetch Ambassadors Success", { count: data.length }, null);
          
          // MAP ALL ROWS DIRECTLY WITHOUT ANY LOCAL FILTERING (Ensure raw, real-time representation of all rows)
          allAmbassadors = data.map((row: any) => {
            const rawStatus = (row.badge_status || row.status || "pending").toString().toLowerCase().trim();
            const mappedStatus: "pending" | "approved" | "disapproved" = 
              (rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified") ? "approved" : 
              (rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended") ? "disapproved" : "pending";

            const nameVal = row.professional_name || row.name || "";
            const cityVal = row.base_city || row.city || "";
            const fieldVal = row.focus_interest || row.field || "";
            const phoneVal = row.phone_number || row.phone || "";

            const ambId = row.user_id || row.id || "";
            const ambEmail = row.email || "";
            
            // Find matched wallet balance
            const wallet = walletsData.find(w => w.ambassador_id === ambId || (w.email || "").toLowerCase() === (ambEmail || "").toLowerCase());
            const walletBal = wallet ? wallet.balance : 0;

            return {
              id: ambId,
              user_id: row.user_id || undefined,
              db_id: row.id || undefined,
              name: nameVal,
              professional_name: nameVal,
              city: cityVal,
              base_city: cityVal,
              field: fieldVal,
              focus_interest: fieldVal,
              email: ambEmail,
              phone: phoneVal,
              phone_number: phoneVal,
              status: mappedStatus,
              badge_status: mappedStatus,
              avu_balance: walletBal,
              created_at: row.created_at || new Date().toISOString()
            };
          });
        }
      } else {
        console.log("[ADMIN PORTAL] ATTEMPT: Supabase is not configured. Falling back to memory-based/local db.getAmbassadors()...");
        // Fallback only if Supabase environment is completely unconfigured
        allAmbassadors = await db.getAmbassadors();
      }

      if (!allAmbassadors || allAmbassadors.length === 0) {
        console.error("Error: Ambassadors array returned empty from 'public.ambassadors' table query.");
        logDbOperation("Admin Portal Fetch Ambassadors Array Empty Warning", {}, new Error("Ambassadors array is empty"));
      }
      const allActivities = await db.getActivities();
      setAmbassadors(allAmbassadors || []);
      setActivities(allActivities || []);
      await loadBlogs();
      try {
        const logs = await db.getAuditLogs();
        setAuditLogs(logs);
        logDbOperation("Admin Portal Fetch Audit Logs Success", { count: logs.length }, null);
      } catch (logErr) {
        console.error("Failed to load audit logs inside admin portal:", logErr);
        logDbOperation("Admin Portal Fetch Audit Logs Error", {}, logErr);
      }
      try {
        const emails = await getSentEmails();
        setSentEmails(emails);
        logDbOperation("Admin Portal Fetch Sent Emails Success", { count: emails.length }, null);
      } catch (emErr) {
        console.error("Failed to load sent emails inside admin portal:", emErr);
        logDbOperation("Admin Portal Fetch Sent Emails Error", {}, emErr);
      }
    } catch (err: any) {
      console.error("Failed to load DB details inside admin portal:", err);
      logDbOperation("Admin Portal Fetch Core DB Data Error", {}, err);
      setDbError(err?.message || "Failed to load database details.");
    } finally {
      setIsLoadingDb(false);
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
      const existing = await traceGenericOperation("Check Existing Admin on Signup", { email: signupEmail }, () => db.findAdminByEmail(signupEmail));
      if (existing) {
        setAuthError("An admin account with this email already exists.");
        setIsSubmitting(false);
        return;
      }

      let userId = "";
      if (isSupabaseConfigured && supabase) {
        const { data: signUpData, error: signUpError } = await traceDbOperation("Admin Supabase Auth Signup", { email: signupEmail }, supabase.auth.signUp({
          email: signupEmail,
          password: signupPassword,
          options: {
            data: {
              full_name: signupName,
              role: "admin"
            }
          }
        }));

        if (signUpError) {
          setAuthError(signUpError.message);
          setIsSubmitting(false);
          return;
        }

        if (signUpData.user) {
          userId = signUpData.user.id;
        }
      }

      await traceGenericOperation("Create Admin Record", { name: signupName, email: signupEmail, role: "admin" }, () => db.createAdmin({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        user_id: userId || undefined,
        role: "admin"
      }));

      setAuthSuccess("Admin account created successfully! Please sign in.");
      setLoginEmail(signupEmail);
      setIsSubmitting(false);
      setTimeout(() => {
        setView("login");
        setAuthSuccess("");
        setSignupName("");
        setSignupEmail("");
        setSignupPassword("");
      }, 2000);
    } catch (err: any) {
      setAuthError(err.message || "Failed to register admin account.");
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
      let loggedInEmail = loginEmail;
      let adminRecord: DbAdmin | null = null;

      if (isSupabaseConfigured && supabase) {
        const { data: signInData, error: signInError } = await traceDbOperation("Admin Supabase Auth Signin", { email: loginEmail }, supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword
        }));

        if (signInError) {
          logDbOperation("Admin Supabase Auth Signin Error", { email: loginEmail }, signInError);
          setAuthError(signInError.message);
          setIsSubmitting(false);
          return;
        }

        if (signInData.user) {
          adminRecord = await traceGenericOperation("Fetch Admin Profile on Login", { email: loginEmail }, () => db.findAdminByEmail(loginEmail));
          if (!adminRecord) {
            const noAdminErr = new Error("Your account is not registered as an administrator in the database registry.");
            logDbOperation("Fetch Admin Profile on Login Missing Record", { email: loginEmail }, noAdminErr);
            setAuthError(noAdminErr.message);
            setIsSubmitting(false);
            await supabase.auth.signOut();
            return;
          }
          loggedInEmail = adminRecord.email;
        }
      } else {
        const admin = await traceGenericOperation("Fetch Admin Profile on Local Login", { email: loginEmail }, () => db.findAdminByEmail(loginEmail));
        if (!admin || admin.password !== loginPassword) {
          const invalidCredsErr = new Error("Invalid administrator credentials.");
          logDbOperation("Fetch Admin Profile on Local Login Invalid Credentials", { email: loginEmail }, invalidCredsErr);
          setAuthError(invalidCredsErr.message);
          setIsSubmitting(false);
          return;
        }
        adminRecord = admin;
      }

      if (adminRecord) {
        logDbOperation("Admin Portal Login Success", { email: loggedInEmail, name: adminRecord.name, role: adminRecord.role }, null);
        localStorage.setItem("advaltad_admin_session_email", loggedInEmail);
        setCurrentAdmin(adminRecord);
        setIsAuthenticated(true);
        setView("dashboard");
        window.location.hash = "#/admin/dashboard";
        setIsSubmitting(false);
        loadDbData();
      }
    } catch (err: any) {
      logDbOperation("Admin Portal Login Uncaught Error", { email: loginEmail }, err);
      setAuthError(err.message || "An unexpected error occurred during admin authentication.");
      setIsSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("advaltad_admin_session_email");
    setCurrentAdmin(null);
    setIsAuthenticated(false);
    setView("login");
    window.location.hash = "#/admin";
  };

  // Status Action Handlers
  const handleToggleStatus = async (id: string, currentStatus: "pending" | "approved" | "disapproved") => {
    const newStatus: "pending" | "approved" | "disapproved" = currentStatus === "pending" ? "approved" : "pending";
    const ambassador = ambassadors.find(a => a.id === id);
    const originalAmbassadors = [...ambassadors];

    // Immediate state updates for instant visual feedback (Optimistic Update)
    setAmbassadors(prev =>
      prev.map(amb =>
        amb.id === id
          ? { ...amb, status: newStatus, badge_status: newStatus }
          : amb
      )
    );

    try {
      console.log(`[ADMIN TOGGLER] Direct database update for ${id}: 'badge_status' set to ${newStatus}`);
      const success = await db.updateStatus(id, newStatus);
      if (!success) {
        throw new Error("Supabase status update failed");
      }

      // Add visual confirmation / notification log
      await db.logActivity({
        ambassador_id: id,
        ambassador_name: ambassador?.name || "Ambassador",
        type: "status_change",
        desc: `Super Admin "${currentAdmin?.name}" quick toggled status to "${newStatus}" without modal confirmation.`
      });

      await db.createAuditLog({
        admin_id: currentAdmin?.id || currentAdmin?.user_id || "unknown",
        admin_name: currentAdmin?.name || "Super Admin",
        admin_email: currentAdmin?.email || "admin@advaltad.org",
        ambassador_id: id,
        ambassador_name: ambassador?.name || "Ambassador",
        action: newStatus === "approved" ? "approved" : "disapproved"
      });

      // Dispatch notification email if changing to approved
      if (newStatus === "approved" && ambassador) {
        try {
          await triggerApprovalEmail(ambassador);
        } catch (mailErr) {
          console.error("[ADMIN TOGGLER] Failed to send approval email:", mailErr);
        }
      }

      // Sync backend state in background
      loadDbData();
    } catch (err) {
      console.error("[ADMIN TOGGLER] Error during status toggle update:", err);
      // Revert state if failed
      setAmbassadors(originalAmbassadors);
    }
  };

  const executeApproveAmbassador = async (id: string, name: string) => {
    try {
      await db.updateStatus(id, "approved");

      // Dispatch transactional email notification
      const amb = ambassadors.find(a => a.id === id);
      if (amb) {
        try {
          console.log("[ADMIN PORTAL] Dispatching transactional email notification for approved ambassador:", name);
          const mailRes = await triggerApprovalEmail(amb);
          console.log("[ADMIN PORTAL] Transactional email notification dispatched successfully:", mailRes);
        } catch (mailErr) {
          console.error("[ADMIN PORTAL] Failed to dispatch transactional email:", mailErr);
        }
      }

      await db.logActivity({
        ambassador_id: id,
        ambassador_name: name,
        type: "status_change",
        desc: `Super Admin "${currentAdmin?.name}" approved Ambassador Fellowship credentials.`
      });
      await db.createAuditLog({
        admin_id: currentAdmin?.id || currentAdmin?.user_id || "unknown",
        admin_name: currentAdmin?.name || "Super Admin",
        admin_email: currentAdmin?.email || "admin@advaltad.org",
        ambassador_id: id,
        ambassador_name: name,
        action: "approved"
      });
      loadDbData();
      if (selectedAmbassador?.id === id) {
        setSelectedAmbassador(prev => prev ? { ...prev, status: "approved" } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveAmbassador = async (id: string, name: string) => {
    setStatusConfirmModal({ id, name, action: "approve" });
  };

  const executeDisapproveAmbassador = async (id: string, name: string) => {
    try {
      await db.updateStatus(id, "disapproved");
      await db.logActivity({
        ambassador_id: id,
        ambassador_name: name,
        type: "status_change",
        desc: `Super Admin "${currentAdmin?.name}" disapproved Ambassador Fellowship credentials.`
      });
      await db.createAuditLog({
        admin_id: currentAdmin?.id || currentAdmin?.user_id || "unknown",
        admin_name: currentAdmin?.name || "Super Admin",
        admin_email: currentAdmin?.email || "admin@advaltad.org",
        ambassador_id: id,
        ambassador_name: name,
        action: "disapproved"
      });
      loadDbData();
      if (selectedAmbassador?.id === id) {
        setSelectedAmbassador(prev => prev ? { ...prev, status: "disapproved" } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisapproveAmbassador = async (id: string, name: string) => {
    setStatusConfirmModal({ id, name, action: "disapprove" });
  };

  const executeSuspendAmbassador = async (id: string, name: string) => {
    try {
      await db.deleteAmbassador(id);
      await db.logActivity({
        type: "status_change",
        desc: `Super Admin "${currentAdmin?.name}" suspended/deleted Ambassador ${name} from registry.`
      });
      await db.createAuditLog({
        admin_id: currentAdmin?.id || currentAdmin?.user_id || "unknown",
        admin_name: currentAdmin?.name || "Super Admin",
        admin_email: currentAdmin?.email || "admin@advaltad.org",
        ambassador_id: id,
        ambassador_name: name,
        action: "suspended"
      });
      setSelectedAmbassador(null);
      setIsDetailOpen(false);
      loadDbData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspendAmbassador = async (id: string, name: string) => {
    setStatusConfirmModal({ id, name, action: "suspend" });
  };

  const executeBulkStatusUpdate = async (ids: string[], action: "approve" | "disapprove") => {
    try {
      const statusValue = action === "approve" ? "approved" : "disapproved";
      for (const id of ids) {
        await db.updateStatus(id, statusValue);
        const amb = ambassadors.find(a => a.id === id);
        const name = amb ? (amb.name || amb.professional_name || "Ambassador") : "Ambassador";
        
        if (action === "approve" && amb) {
          try {
            console.log("[ADMIN PORTAL] Bulk dispatching transactional email notification for:", name);
            await triggerApprovalEmail(amb);
          } catch (mailErr) {
            console.error("[ADMIN PORTAL] Failed to dispatch bulk transactional email:", mailErr);
          }
        }

        await db.logActivity({
          type: "status_change",
          desc: `Super Admin "${currentAdmin?.name}" bulk updated Ambassador ${name} verification status to: ${statusValue}.`
        });
        
        await db.createAuditLog({
          admin_id: currentAdmin?.id || currentAdmin?.user_id || "unknown",
          admin_name: currentAdmin?.name || "Super Admin",
          admin_email: currentAdmin?.email || "admin@advaltad.org",
          ambassador_id: id,
          ambassador_name: name,
          action: action === "approve" ? "approved" : "disapproved"
        });
      }
      setSelectedAmbassadorIds([]);
      loadDbData();
    } catch (err) {
      console.error("Bulk status update failed:", err);
    }
  };

  const handleExportToCSV = () => {
    if (ambassadors.length === 0) {
      alert("No ambassadors available to export.");
      return;
    }

    const headers = [
      "ID", "Professional Name", "Email Address", "Phone Number",
      "Verification Status", "AVU Balance", "Focus Specialty", "Base City", "Created At"
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      const escaped = str.replace(/"/g, '""');
      if (escaped.includes(",") || escaped.includes("\n") || escaped.includes("\r") || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const csvRows = [
      headers.join(","),
      ...ambassadors.map((amb) => [
        escapeCSV(amb.id),
        escapeCSV(amb.professional_name || amb.name || "N/A"),
        escapeCSV(amb.email || "N/A"),
        escapeCSV(amb.phone_number || amb.phone || "N/A"),
        escapeCSV(amb.badge_status || amb.status || "pending"),
        escapeCSV(amb.avu_balance !== undefined ? amb.avu_balance : 0),
        escapeCSV(amb.focus_interest || amb.field || "N/A"),
        escapeCSV(amb.base_city || amb.city || "N/A"),
        escapeCSV(amb.created_at)
      ].join(","))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `advaltad_ambassadors_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSavePortfolioDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAmbassador || !editName || !editCity) return;
    setIsSavingDetails(true);
    setEditSuccess(false);

    try {
      const updates = {
        name: editName,
        city: editCity,
        field: editField,
        phone: editPhone
      };
      await db.updateProfile(selectedAmbassador.id, updates);
      
      await db.logActivity({
        ambassador_id: selectedAmbassador.id,
        ambassador_name: editName,
        type: "profile_update",
        desc: `Super Admin "${currentAdmin?.name}" updated public registry portfolio for ${editName}`
      });

      await db.createAuditLog({
        admin_id: currentAdmin?.id || currentAdmin?.user_id || "unknown",
        admin_name: currentAdmin?.name || "Super Admin",
        admin_email: currentAdmin?.email || "admin@advaltad.org",
        ambassador_id: selectedAmbassador.id,
        ambassador_name: editName,
        action: "updated_portfolio"
      });

      setSelectedAmbassador(prev => prev ? { ...prev, ...updates } : null);
      loadDbData();
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving portfolio details", err);
    } finally {
      setIsSavingDetails(false);
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

  // Blog Management Handlers
  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle || !blogContent) return;

    try {
      const blogData = {
        title: blogTitle,
        tag: blogTag || "GENERAL UPDATE",
        excerpt: blogExcerpt || blogContent.substring(0, 120) + "...",
        content: blogContent,
        image: blogImage || "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=1200",
        author: currentAdmin?.name || "Super Admin"
      };

      if (editingBlog) {
        await db.updateBlog(editingBlog.id, blogData);
        await db.logActivity({
          type: "status_change",
          desc: `Super Admin "${currentAdmin?.name}" updated blog entry: "${blogTitle}"`
        });
      } else {
        await db.createBlog(blogData);
        await db.logActivity({
          type: "status_change",
          desc: `Super Admin "${currentAdmin?.name}" published a new blog story: "${blogTitle}"`
        });
      }

      setBlogTitle("");
      setBlogTag("");
      setBlogExcerpt("");
      setBlogContent("");
      setBlogImage("");
      setEditingBlog(null);
      setIsBlogFormOpen(false);
      loadBlogs();
    } catch (err) {
      console.error("Failed to submit blog:", err);
    }
  };

  const handleEditBlogClick = (blog: DbBlog) => {
    setEditingBlog(blog);
    setBlogTitle(blog.title);
    setBlogTag(blog.tag || "");
    setBlogExcerpt(blog.excerpt || "");
    setBlogContent(blog.content);
    setBlogImage(blog.image || "");
    setIsBlogFormOpen(true);
  };

  const handleDeleteBlog = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete blog "${title}"?`)) return;
    try {
      await db.deleteBlog(id);
      await db.logActivity({
        type: "status_change",
        desc: `Super Admin "${currentAdmin?.name}" deleted blog: "${title}"`
      });
      loadBlogs();
    } catch (err) {
      console.error("Failed to delete blog:", err);
    }
  };

  // Ambassador Financial Wallet Handlers
  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletAmbassador || !walletFundAmount) return;
    const amount = parseInt(walletFundAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsFundingWallet(true);
    try {
      const currentWallet = wallets.find(w => w.ambassador_id === selectedWalletAmbassador.id);
      const currentBal = currentWallet ? currentWallet.balance : selectedWalletAmbassador.avu_balance;
      const newBal = currentBal + amount;

      if (currentWallet) {
        await db.updateWalletBalance(selectedWalletAmbassador.id, newBal);
      } else {
        await db.createWallet({
          ambassador_id: selectedWalletAmbassador.id,
          email: selectedWalletAmbassador.email,
          balance: newBal
        });
      }

      await db.updateAvuBalance(selectedWalletAmbassador.id, newBal);

      await db.logActivity({
        ambassador_id: selectedWalletAmbassador.id,
        ambassador_name: selectedWalletAmbassador.name,
        type: "avu_transfer",
        desc: `Super Admin "${currentAdmin?.name}" allocated ${amount} AVU to Ambassador wallet.`,
        amount: `${amount} AVU`
      });

      setWalletFundAmount("");
      setSelectedWalletAmbassador(null);
      setIsWalletModalOpen(false);
      loadWallets();
      loadDbData();
    } catch (err) {
      console.error("Failed to fund wallet:", err);
    } finally {
      setIsFundingWallet(false);
    }
  };

  // Filter calculations
  const filteredAmbassadors = (ambassadors || []).filter((ambassador) => {
    if (!ambassador) return false;
    
    const name = (ambassador.name || "").toLowerCase();
    const email = (ambassador.email || "").toLowerCase();
    const phone = ambassador.phone || "";
    const search = searchQuery.toLowerCase();

    const matchesSearch = name.includes(search) || email.includes(search) || phone.includes(search);

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && ambassador.status === statusFilter;
  });

  const totalAVU = ambassadors.reduce((acc, curr) => acc + curr.avu_balance, 0);
  const pendingCount = ambassadors.filter(a => a.status === "pending").length;
  const approvedCount = ambassadors.filter(a => a.status === "approved").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* 1. AUTHENTICATION PAGES FOR ADMIN */}
      {!isAuthenticated && (
        <div className="flex-1 flex items-center justify-center px-4 py-20 relative overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/25 via-slate-950 to-slate-950 z-0" />
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative z-10 border border-slate-100"
          >
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
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Admin Email Address</label>
                    <div className="relative text-left">
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
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Strong Admin Password</label>
                    <div className="relative text-left">
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
                    ) : "Login Admin Account"}
                  </button>

                  <div className="pt-4 text-center border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setView("signup")}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold tracking-tight cursor-pointer"
                    >
                      Need an admin account? Register here
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
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Admin Full Name</label>
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

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Admin Email Address</label>
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

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Strong Admin Password</label>
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
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute right-[-12px] top-10 w-6 h-6 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white cursor-pointer z-30"
            >
              {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>

            <div className="p-4 border-b border-slate-800 flex items-center gap-2.5 overflow-hidden text-left">
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

              <button
                onClick={() => setActiveTab("blogs")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "blogs"
                    ? "bg-emerald-600 text-white"
                    : "hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Compass size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>Blog Management</span>}
              </button>

              <button
                onClick={() => setActiveTab("wallets")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "wallets"
                    ? "bg-emerald-600 text-white"
                    : "hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Coins size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>Financial Overview</span>}
              </button>

              <button
                onClick={() => setActiveTab("payments")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "payments"
                    ? "bg-emerald-600 text-white"
                    : "hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <CreditCard size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>Payment Gateway</span>}
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "history"
                    ? "bg-emerald-600 text-white"
                    : "hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <History size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>Oversight History</span>}
              </button>
            </nav>

            <div className="p-3 border-t border-slate-800">
              <div className="flex items-center gap-2.5 p-1 rounded-xl bg-slate-850/50 overflow-hidden text-left">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700 flex-shrink-0 uppercase">
                  {(currentAdmin?.name || "A").charAt(0)}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate leading-none">{currentAdmin?.name || "Super Admin"}</p>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">{currentAdmin?.email || ""}</p>
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
          <main className="flex-1 flex flex-col overflow-y-auto text-left">
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
                  onClick={handleExportToCSV}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-slate-950"
                >
                  <Download size={14} />
                  Export to CSV
                </button>
                <button
                  onClick={loadDbData}
                  className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Activity size={14} className="text-slate-500" />
                  Refresh Ledger
                </button>
              </div>
            </header>

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
                {isLoadingDb ? (
                  <motion.div
                    key="live-db-loading"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm text-center"
                  >
                    <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Syncing Live Ledger...</h3>
                    <p className="text-xs text-slate-400 mt-1">Verifying direct digital certificates with the public.ambassadors registry.</p>
                  </motion.div>
                ) : (
                  <>
                    {/* TAB 1: OVERVIEW & ACTIVITIES */}
                    {activeTab === "overview" && (
                  <motion.div
                    key="tab-v-overview"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <RegionalGrowthChart ambassadors={ambassadors} />

                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 pt-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Sovereign Registry Audit Trail</h3>
                        <p className="text-xs text-slate-500">Chronological history of registered ambassador events, credentials updates, and financial logs.</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm text-left">
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
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                      <div className="relative w-full md:max-w-md text-left">
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
                          <button
                            onClick={() => setStatusFilter("disapproved")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              statusFilter === "disapproved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            Disapproved
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="select-all-ambassadors"
                          className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 focus:ring-2 cursor-pointer accent-slate-900"
                          checked={filteredAmbassadors.length > 0 && filteredAmbassadors.every(amb => selectedAmbassadorIds.includes(amb.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newSelections = Array.from(new Set([...selectedAmbassadorIds, ...filteredAmbassadors.map(a => a.id)]));
                              setSelectedAmbassadorIds(newSelections);
                            } else {
                              const filteredIds = filteredAmbassadors.map(a => a.id);
                              setSelectedAmbassadorIds(selectedAmbassadorIds.filter(id => !filteredIds.includes(id)));
                            }
                          }}
                        />
                        <label htmlFor="select-all-ambassadors" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          {selectedAmbassadorIds.length > 0 
                            ? `${selectedAmbassadorIds.length} Selected` 
                            : "Select All Visible"
                          }
                        </label>
                      </div>

                      {selectedAmbassadorIds.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setBulkConfirmModal({ ids: selectedAmbassadorIds, action: "approve" })}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle size={12} />
                            Bulk Approve
                          </button>
                          <button
                            onClick={() => setBulkConfirmModal({ ids: selectedAmbassadorIds, action: "disapprove" })}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-600/10 flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle size={12} />
                            Bulk Disapprove
                          </button>
                          <button
                            onClick={() => setSelectedAmbassadorIds([])}
                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

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
                              <div className="flex items-start gap-4 flex-1">
                                <div className="pt-1 flex-shrink-0">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 focus:ring-2 cursor-pointer accent-slate-900"
                                    checked={selectedAmbassadorIds.includes(amb.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedAmbassadorIds([...selectedAmbassadorIds, amb.id]);
                                      } else {
                                        setSelectedAmbassadorIds(selectedAmbassadorIds.filter(id => id !== amb.id));
                                      }
                                    }}
                                  />
                                </div>
                                <div className="space-y-1.5 flex-1 text-left">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <h4 className="text-sm font-black text-slate-950 tracking-tight">{amb.name}</h4>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5">
                                      ID: {amb.id}
                                    </span>
                                    {amb.status === "approved" ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Verified
                                      </span>
                                    ) : amb.status === "disapproved" ? (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Flagged
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
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
                              </div>

                              <div className="flex items-center gap-2.5 flex-shrink-0">
                                <button
                                  onClick={() => handleToggleStatus(amb.id, amb.status)}
                                  className={`px-3 py-2 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
                                    amb.status === "approved"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80"
                                      : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80"
                                  }`}
                                  title="Quick toggle status between Pending and Approved"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${amb.status === "approved" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                                  Quick Toggle
                                </button>

                                {amb.status === "pending" && (
                                  <>
                                    <button
                                      onClick={() => handleApproveAmbassador(amb.id, amb.name)}
                                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1 cursor-pointer"
                                    >
                                      <CheckCircle size={12} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleDisapproveAmbassador(amb.id, amb.name)}
                                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-600/10 flex items-center gap-1 cursor-pointer"
                                    >
                                      <XCircle size={12} />
                                      Disapprove
                                    </button>
                                  </>
                                )}
                                {amb.status === "disapproved" && (
                                  <button
                                    onClick={() => handleApproveAmbassador(amb.id, amb.name)}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle size={12} />
                                    Re-Approve
                                  </button>
                                )}
                                {amb.status === "approved" && (
                                  <button
                                    onClick={() => handleDisapproveAmbassador(amb.id, amb.name)}
                                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-600/10 flex items-center gap-1 cursor-pointer"
                                  >
                                    <XCircle size={12} />
                                    Disapprove
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

                {/* TAB 4: BLOG MANAGEMENT */}
                {activeTab === "blogs" && (
                  <motion.div
                    key="tab-v-blogs"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 text-left"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4 text-left">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Blog & Impact Stories</h3>
                        <p className="text-xs text-slate-500">Create, edit, and publish dynamic updates and grassroots impact stories to the system.</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingBlog(null);
                          setBlogTitle("");
                          setBlogTag("");
                          setBlogExcerpt("");
                          setBlogContent("");
                          setBlogImage("");
                          setIsBlogFormOpen(!isBlogFormOpen);
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                      >
                        <Plus size={14} />
                        {isBlogFormOpen ? "Close Editor" : "Create Story"}
                      </button>
                    </div>

                    {isBlogFormOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4 text-left"
                      >
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
                          {editingBlog ? "Edit Impact Story" : "Compose New Impact Story"}
                        </h4>

                        <form onSubmit={handleBlogSubmit} className="space-y-4 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Story Title *</label>
                              <input
                                type="text"
                                required
                                value={blogTitle}
                                onChange={(e) => setBlogTitle(e.target.value)}
                                placeholder="e.g. From Code-Block to Career"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-slate-800 text-slate-800"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Category Tag</label>
                              <input
                                type="text"
                                value={blogTag}
                                onChange={(e) => setBlogTag(e.target.value)}
                                placeholder="e.g. EDUCATION"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-slate-800 text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Image URL</label>
                              <input
                                type="text"
                                value={blogImage}
                                onChange={(e) => setBlogImage(e.target.value)}
                                placeholder="https://images.unsplash.com/..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-slate-800 text-slate-800"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500">Brief Excerpt</label>
                              <input
                                type="text"
                                value={blogExcerpt}
                                onChange={(e) => setBlogExcerpt(e.target.value)}
                                placeholder="Summary..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-slate-800 text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-slate-500">Full Content Text *</label>
                            <textarea
                              rows={6}
                              required
                              value={blogContent}
                              onChange={(e) => setBlogContent(e.target.value)}
                              placeholder="Write narrative here..."
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-slate-800 text-slate-800 leading-relaxed"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsBlogFormOpen(false);
                                setEditingBlog(null);
                              }}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                            >
                              {editingBlog ? "Save Changes" : "Publish Story"}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}

                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm text-left">
                      <div className="divide-y divide-slate-100">
                        {blogs.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 text-xs">
                            <Compass size={32} className="mx-auto mb-3 text-slate-300" />
                            No blogs or impact stories currently published.
                          </div>
                        ) : (
                          blogs.map((blog) => (
                            <div key={blog.id} className="p-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                              <div className="flex gap-4 items-start flex-1 min-w-0">
                                {blog.image ? (
                                  <img
                                    src={blog.image}
                                    alt={blog.title}
                                    referrerPolicy="no-referrer"
                                    className="w-16 h-16 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                    <Compass size={24} />
                                  </div>
                                )}
                                <div className="space-y-1 text-left min-w-0">
                                  <span className="text-[9px] font-black tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                                    {blog.tag || "GENERAL UPDATE"}
                                  </span>
                                  <h4 className="text-xs font-black text-slate-900 truncate tracking-tight">{blog.title}</h4>
                                  <p className="text-[11px] text-slate-500 line-clamp-1">{blog.excerpt}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono text-left">
                                    <span>By {blog.author}</span>
                                    <span>•</span>
                                    <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
                                <button
                                  onClick={() => handleEditBlogClick(blog)}
                                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit size={12} className="text-slate-400" />
                                  Edit Story
                                </button>
                                <button
                                  onClick={() => handleDeleteBlog(blog.id, blog.title)}
                                  className="p-1.5 border border-rose-100 bg-rose-50 hover:bg-rose-100/50 text-rose-700 rounded-xl transition-all cursor-pointer"
                                  title="Delete Blog"
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

                {/* TAB 5: FINANCIAL OVERVIEW */}
                {activeTab === "wallets" && (
                  <motion.div
                    key="tab-v-wallets"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 text-left"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4 text-left">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Ambassador Financial Overview</h3>
                        <p className="text-xs text-slate-500">Track and allocate funding directly to certified Ambassador accounts.</p>
                      </div>
                      <div className="bg-slate-900 text-emerald-400 font-mono text-xs px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                        <Coins size={14} />
                        <span className="font-bold tracking-tight">Total Authorized Reserves: {totalAVU} AVU</span>
                      </div>
                    </div>

                    <FinancialOverviewChart ambassadors={ambassadors} wallets={wallets} />

                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm text-left">
                      <div className="divide-y divide-slate-100">
                        {ambassadors.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 text-xs">
                            <Coins size={32} className="mx-auto mb-3 text-slate-300" />
                            No registered ambassadors to overview.
                          </div>
                        ) : (
                          ambassadors.map((amb) => {
                            const wallet = wallets.find(w => w.ambassador_id === amb.id || (w.email || "").toLowerCase() === (amb.email || "").toLowerCase());
                            const balance = wallet ? wallet.balance : amb.avu_balance;
                            const walletId = wallet ? wallet.id : "No Active Wallet Instance";

                            return (
                              <div key={amb.id} className="p-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                                <div className="space-y-1 flex-1 min-w-0 text-left">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-black text-slate-900 truncate tracking-tight">{amb.name}</h4>
                                    {amb.status === "approved" ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-wider border border-emerald-100">
                                        CERTIFIED
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-wider border border-amber-100 animate-pulse">
                                        PENDING AUDIT
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{amb.email}</p>
                                  <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                                    <span className="text-slate-500 font-bold">Wallet ID:</span>
                                    <span className="truncate max-w-[150px]">{walletId}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 self-end md:self-auto flex-shrink-0">
                                  <div className="text-right">
                                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-0.5">Wallet Balance</span>
                                    <span className="font-mono font-black text-sm text-slate-900 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-100 block text-center">
                                      {balance} AVU
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setSelectedWalletAmbassador(amb);
                                      setWalletFundAmount("");
                                      setIsWalletModalOpen(true);
                                    }}
                                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer self-center"
                                  >
                                    <Coins size={12} />
                                    Allocate Funds
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 6: AUDIT OVERSIGHT HISTORY */}
                {activeTab === "history" && (
                  <motion.div
                    key="tab-v-history"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 text-left"
                  >
                    <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Administrative Oversight History</h3>
                        <p className="text-xs text-slate-500">Track and audit system registration metrics & transactional notifications.</p>
                      </div>
                      
                      {/* Segment selector */}
                      <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center border border-slate-200">
                        <button
                          onClick={() => setHistorySubTab("audit")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            historySubTab === "audit"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-950"
                          }`}
                        >
                          Audit Logs
                        </button>
                        <button
                          onClick={() => setHistorySubTab("emails")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                            historySubTab === "emails"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-950"
                          }`}
                        >
                          <Mail size={12} />
                          Transactional Emails
                        </button>
                      </div>
                    </div>

                    {historySubTab === "audit" ? (
                      <>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                          <div className="relative w-full md:max-w-md text-left">
                            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                            <input
                              type="text"
                              value={historySearchQuery}
                              onChange={(e) => setHistorySearchQuery(e.target.value)}
                              placeholder="Search admin, or ambassador..."
                              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-150 focus:border-slate-800 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                            />
                          </div>
                          <div className="text-xs font-mono text-slate-400">
                            Total Records: {auditLogs.length}
                          </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm text-left">
                          <div className="divide-y divide-slate-100">
                            {auditLogs.filter(log => {
                              const query = historySearchQuery.toLowerCase();
                              return (
                                (log.admin_name || "").toLowerCase().includes(query) ||
                                (log.admin_email || "").toLowerCase().includes(query) ||
                                (log.ambassador_name || "").toLowerCase().includes(query) ||
                                (log.ambassador_id || "").toLowerCase().includes(query)
                              );
                            }).length === 0 ? (
                              <div className="p-16 text-center text-slate-400 text-xs text-left">
                                <History size={36} className="mx-auto mb-3 text-slate-300 animate-pulse" />
                                No administrative oversight logs recorded or found.
                              </div>
                            ) : (
                              auditLogs
                                .filter(log => {
                                  const query = historySearchQuery.toLowerCase();
                                  return (
                                    (log.admin_name || "").toLowerCase().includes(query) ||
                                    (log.admin_email || "").toLowerCase().includes(query) ||
                                    (log.ambassador_name || "").toLowerCase().includes(query) ||
                                    (log.ambassador_id || "").toLowerCase().includes(query)
                                  );
                                })
                                .map((log) => (
                                  <div key={log.id} className="p-6 hover:bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all text-left">
                                    <div className="space-y-2 flex-1 min-w-0 text-left">
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5">
                                          Log ID: {log.id}
                                        </span>
                                        {log.action === "approved" ? (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle size={10} className="text-emerald-500" /> Approved
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                            <XCircle size={10} className="text-rose-500" /> Disapproved
                                          </span>
                                        )}
                                      </div>

                                      <div className="grid md:grid-cols-2 gap-4 text-xs font-sans text-slate-600 pt-1">
                                        <div className="space-y-1">
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">ADMINISTRATIVE AUDITOR</span>
                                          <p className="font-bold text-slate-900">{log.admin_name}</p>
                                          <p className="text-[10px] font-mono text-slate-500">{log.admin_email}</p>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">FELLOWSHIP TARGET</span>
                                          <p className="font-bold text-slate-900">{log.ambassador_name}</p>
                                          <p className="text-[10px] font-mono text-slate-500">ID: {log.ambassador_id}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex-shrink-0 text-left md:text-right">
                                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">AUDIT TIMESTAMP</span>
                                      <p className="text-xs font-mono text-slate-600 font-bold">
                                        {new Date(log.created_at).toLocaleDateString()}
                                      </p>
                                      <p className="text-[10px] font-mono text-slate-400 text-left md:text-right">
                                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                          <div className="relative w-full md:max-w-md text-left">
                            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                            <input
                              type="text"
                              value={historySearchQuery}
                              onChange={(e) => setHistorySearchQuery(e.target.value)}
                              placeholder="Search recipient email, name, or subject..."
                              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-150 focus:border-slate-800 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                            />
                          </div>
                          <div className="text-xs font-mono text-slate-400">
                            Total Dispatched: {sentEmails.length}
                          </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm text-left">
                          <div className="divide-y divide-slate-100">
                            {sentEmails.filter(email => {
                              const query = historySearchQuery.toLowerCase();
                              return (
                                (email.recipientEmail || "").toLowerCase().includes(query) ||
                                (email.recipientName || "").toLowerCase().includes(query) ||
                                (email.subject || "").toLowerCase().includes(query)
                              );
                            }).length === 0 ? (
                              <div className="p-16 text-center text-slate-400 text-xs text-left">
                                <Mail size={36} className="mx-auto mb-3 text-slate-300 animate-pulse" />
                                No transactional email notifications triggered yet.
                              </div>
                            ) : (
                              sentEmails
                                .filter(email => {
                                  const query = historySearchQuery.toLowerCase();
                                  return (
                                    (email.recipientEmail || "").toLowerCase().includes(query) ||
                                    (email.recipientName || "").toLowerCase().includes(query) ||
                                    (email.subject || "").toLowerCase().includes(query)
                                  );
                                })
                                .map((email) => (
                                  <div key={email.id} className="p-6 hover:bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all text-left">
                                    <div className="space-y-2 flex-1 min-w-0 text-left">
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5">
                                          ID: {email.id}
                                        </span>
                                        {email.status === "sent" ? (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle size={10} className="text-emerald-500" /> Sent via SMTP
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                            <Activity size={10} className="text-blue-500" /> Logged Fallback
                                          </span>
                                        )}
                                        {email.generatedWithAI && (
                                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-100 text-[9px] font-black uppercase tracking-wider">
                                            ✨ Gemini AI Personalized
                                          </span>
                                        )}
                                      </div>

                                      <div className="pt-1">
                                        <h4 className="text-xs font-bold text-slate-900">{email.subject}</h4>
                                      </div>

                                      <div className="grid md:grid-cols-2 gap-4 text-xs font-sans text-slate-600 pt-1">
                                        <div className="space-y-1">
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">RECIPIENT</span>
                                          <p className="font-bold text-slate-900">{email.recipientName}</p>
                                          <p className="text-[10px] font-mono text-slate-500">{email.recipientEmail}</p>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">DISPATCH ROUTE</span>
                                          <p className="font-bold text-slate-800 uppercase text-[10px]">{email.method}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-col md:items-end gap-3 flex-shrink-0">
                                      <div className="text-left md:text-right">
                                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">TRIGGER TIMESTAMP</span>
                                        <p className="text-xs font-mono text-slate-600 font-bold">
                                          {new Date(email.sentAt).toLocaleDateString()}
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-400 text-left md:text-right">
                                          {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => setSelectedEmailForView(email)}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 self-start md:self-end cursor-pointer"
                                      >
                                        <Eye size={10} /> View HTML Email
                                      </button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* TAB 7: PAYMENT GATEWAY */}
                {activeTab === "payments" && (
                  <motion.div
                    key="tab-v-payments"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 text-left"
                  >
                    <div className="border-b border-slate-100 pb-4 text-left">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Program Funding & Payment Gateway</h3>
                      <p className="text-xs text-slate-500">Configure public fundraising campaign links or process dynamic updates securely.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 text-left">
                          <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Program Funding Configuration
                          </h4>

                          <div>
                            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                              Select Foundational Program
                            </label>
                            <select
                              value={selectedProgram}
                              onChange={(e) => {
                                setSelectedProgram(e.target.value);
                                const amounts: Record<string, string> = {
                                  "Youth Empowerment Initiative": "15000",
                                  "Community Health Drive": "25000",
                                  "Digital Literacy Accelerator": "18500"
                                };
                                setMilestoneAmount(amounts[e.target.value] || "10000");
                              }}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                            >
                              <option value="Youth Empowerment Initiative">Youth Empowerment Initiative</option>
                              <option value="Community Health Drive">Community Health Drive</option>
                              <option value="Digital Literacy Accelerator">Digital Literacy Accelerator</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                              Required Funding Milestone (₦)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₦</span>
                              <input
                                required
                                type="number"
                                min="100"
                                placeholder="e.g. 50000"
                                value={milestoneAmount}
                                onChange={(e) => setMilestoneAmount(e.target.value)}
                                className="w-full pl-8 pr-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                              Credit to Fellowship Ambassador
                            </label>
                            <select
                              value={selectedAmbId}
                              onChange={(e) => setSelectedAmbId(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all text-slate-800"
                            >
                              <option value="">-- Select Approved Ambassador --</option>
                              {ambassadors.map((amb) => (
                                <option key={amb.id} value={amb.id}>
                                  {amb.name} ({amb.city || "No City"})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => {
                                if (!selectedAmbId) {
                                  alert("Please select an ambassador to attribute campaign credit.");
                                  return;
                                }
                                const ambassadorObj = ambassadors.find(a => a.id === selectedAmbId);
                                const ambName = ambassadorObj ? ambassadorObj.name : "Ambassador";
                                const queryLink = `${window.location.origin}/#/donate?project=${encodeURIComponent(selectedProgram)}&needed=${milestoneAmount}&ambassador_id=${encodeURIComponent(selectedAmbId)}&ambassador_name=${encodeURIComponent(ambName)}`;
                                setGeneratedPublicLink(queryLink);
                              }}
                              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer border border-transparent"
                            >
                              Generate Public Shareable Link
                            </button>
                          </div>

                          {generatedPublicLink && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 space-y-2 text-xs text-left"
                            >
                              <span className="block text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Campaign Link Generated!</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={generatedPublicLink}
                                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 font-mono text-[10px] select-all outline-none"
                                />
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedPublicLink);
                                    alert("Link copied to clipboard successfully!");
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all text-[11px] cursor-pointer"
                                >
                                  Copy
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-left">
                          <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Direct Deposit Engine (Paystack Gateway)
                          </h4>

                          <div className="grid sm:grid-cols-3 gap-4 items-end">
                            <div className="sm:col-span-2 text-left">
                              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                                Deposit Amount (NGN)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₦</span>
                                <input
                                  type="number"
                                  value={directDepositAmount}
                                  onChange={(e) => setDirectDepositAmount(e.target.value)}
                                  className="w-full pl-7 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-mono font-bold text-slate-800 outline-none transition-all"
                                  placeholder="e.g. 5000"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (!selectedAmbId) {
                                  alert("Please select an ambassador to receive credit.");
                                  return;
                                }
                                const depAmt = parseFloat(directDepositAmount);
                                if (isNaN(depAmt) || depAmt <= 0) {
                                  alert("Please enter a valid deposit amount.");
                                  return;
                                }
                                
                                const ambassadorObj = ambassadors.find(a => a.id === selectedAmbId);
                                const ambName = ambassadorObj ? ambassadorObj.name : "Ambassador";

                                const paystackPop = (window as any).PaystackPop;
                                if (paystackPop) {
                                  const handler = paystackPop.setup({
                                    key: "pk_live_e7fddb22eb7063991306bc82bd907a0be7a1a3fb",
                                    email: "admin-deposit@advaltad.org",
                                    amount: depAmt * 100,
                                    currency: "NGN",
                                    metadata: {
                                      ambassador_id: selectedAmbId,
                                      ambassador_name: ambName,
                                      project: selectedProgram,
                                      deposit_type: "direct_deposit"
                                    },
                                    callback: function(res: any) {
                                      alert(`Direct payment processed successfully! Reference: ${res.reference}. Logged credit to ${ambName}.`);
                                      setDirectDepositAmount("");
                                    }
                                  });
                                  handler.openIframe();
                                } else {
                                  alert(`[SIMULATION] Initiating Paystack Gateway for ₦${depAmt} NGN credited to ${ambName}.\n\nSimulation-completed.`);
                                  setDirectDepositAmount("");
                                }
                              }}
                              className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm h-10 cursor-pointer border border-transparent"
                            >
                              Direct Ambassador Deposit
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 text-left">
                        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-6 space-y-4">
                          <h4 className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-amber-600" />
                            Manual Override Notice
                          </h4>
                          <p className="text-xs text-amber-900/80 leading-relaxed">
                            Once payment confirmations are validated, administrators must manually adjust and update the ambassador's AVU balance to align with their secure wallet limits.
                          </p>
                          <div className="pt-2">
                            <button
                              onClick={() => setActiveTab("wallets")}
                              className="text-[10px] font-black uppercase text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-0"
                            >
                              Open Financial Overview to credit AVU
                              <ChevronRight size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                  </>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      )}

      {/* 3. MANAGE PORTFOLIO DRAWER MODAL */}
      <AnimatePresence>
        {isDetailOpen && selectedAmbassador && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="absolute inset-0 bg-transparent"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white h-full relative z-10 shadow-2xl flex flex-col text-left border-l border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">
                    Grassroots Portfolio Auditor
                  </span>
                  <h3 className="text-base font-black text-slate-950 tracking-tight">{selectedAmbassador.name}</h3>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border border-transparent"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-8">
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
                  </div>
                </div>

                <div className="p-5 border border-slate-150 rounded-2xl bg-white space-y-4 text-left">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Edit size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider">Modify Portfolio Details</h4>
                  </div>

                  {editSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 animate-bounce">
                      <CheckCircle size={14} className="text-emerald-600" />
                      Portfolio updated and synced!
                    </div>
                  )}

                  <form onSubmit={handleSavePortfolioDetails} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Professional Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Base City
                        </label>
                        <input
                          type="text"
                          required
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Telephone Contact
                        </label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-800"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingDetails || !editName || !editCity}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-200 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-transparent"
                    >
                      {isSavingDetails ? "Saving..." : "Save Portfolio Updates"}
                    </button>
                  </form>
                </div>

                <div className="p-5 border border-slate-150 rounded-2xl bg-white space-y-4 text-left">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Coins size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider">Direct Token Grant system</h4>
                  </div>

                  {grantSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-600" />
                      Direct token authorization synced!
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
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={isGranting}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-200 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-transparent"
                    >
                      {isGranting ? "..." : "Authorize"}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. ALLOCATE WALLET FUNDS DIALOG MODAL */}
      <AnimatePresence>
        {isWalletModalOpen && selectedWalletAmbassador && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Coins className="text-emerald-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Allocate Wallet Funds</h3>
                </div>
                <button
                  onClick={() => {
                    setIsWalletModalOpen(false);
                    setSelectedWalletAmbassador(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-500">
                  You are funding the primary wallet ledger for <strong className="text-slate-950">{selectedWalletAmbassador.name}</strong> ({selectedWalletAmbassador.email}).
                </p>
              </div>

              <form onSubmit={handleFundWallet} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Funding Amount (AVU Tokens)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={walletFundAmount}
                    onChange={(e) => setWalletFundAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl font-semibold outline-none text-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWalletModalOpen(false);
                      setSelectedWalletAmbassador(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-xl transition-all cursor-pointer border-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isFundingWallet}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase rounded-xl transition-all cursor-pointer border-transparent flex items-center justify-center min-w-[100px]"
                  >
                    {isFundingWallet ? "Processing..." : "Allocate Funds"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. SINGLE STATUS CONFIRMATION MODAL */}
      <AnimatePresence>
        {statusConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative text-left"
            >
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Confirm Action</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Are you sure you want to change the status of <strong className="text-slate-950">{statusConfirmModal.name}</strong> to <span className="font-bold text-emerald-600">{statusConfirmModal.action}</span>?
              </p>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setStatusConfirmModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer border border-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (statusConfirmModal.action === "approve") {
                      await executeApproveAmbassador(statusConfirmModal.id, statusConfirmModal.name);
                    } else if (statusConfirmModal.action === "disapprove") {
                      await executeDisapproveAmbassador(statusConfirmModal.id, statusConfirmModal.name);
                    } else if (statusConfirmModal.action === "suspend") {
                      await executeSuspendAmbassador(statusConfirmModal.id, statusConfirmModal.name);
                    }
                    setStatusConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-xl cursor-pointer border border-transparent"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. BULK STATUS CONFIRMATION MODAL */}
      <AnimatePresence>
        {bulkConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative text-left"
            >
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Confirm Bulk Action</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Are you sure you want to bulk execute <strong className="text-slate-950">{bulkConfirmModal.action}</strong> updates across <strong className="text-slate-950">{bulkConfirmModal.ids.length}</strong> items?
              </p>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setBulkConfirmModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer border border-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await executeBulkStatusUpdate(bulkConfirmModal.ids, bulkConfirmModal.action);
                    setBulkConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl cursor-pointer border border-transparent"
                >
                  Bulk Execute
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. TRANSACTIONAL EMAIL PREVIEW MODAL */}
      <AnimatePresence>
        {selectedEmailForView && (
          <div className="fixed inset-0 bg-slate-900/65 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl relative text-left flex flex-col max-h-[85vh] z-[60]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Transactional Email Preview</h3>
                  <p className="text-[10px] text-slate-300 font-mono mt-0.5">ID: {selectedEmailForView.id}</p>
                </div>
                <button
                  onClick={() => setSelectedEmailForView(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Metadata fields */}
              <div className="bg-slate-50 p-4 border-b border-slate-100 text-xs space-y-1.5">
                <p className="text-slate-500 font-mono"><strong className="text-slate-700">Subject:</strong> {selectedEmailForView.subject}</p>
                <p className="text-slate-500 font-mono"><strong className="text-slate-700">To:</strong> {selectedEmailForView.recipientName} &lt;{selectedEmailForView.recipientEmail}&gt;</p>
                <p className="text-slate-500 font-mono"><strong className="text-slate-700">Sent Via:</strong> <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{selectedEmailForView.method}</span></p>
              </div>

              {/* Content Area with direct injection inside sandbox boundaries */}
              <div className="p-4 overflow-y-auto bg-slate-100 flex-1 flex justify-center">
                <div 
                  className="w-full max-w-full bg-white rounded-xl shadow-sm p-4 overflow-hidden border border-slate-200 max-h-[50vh] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmailForView.bodyHtml }}
                />
              </div>

              {/* Footer action */}
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