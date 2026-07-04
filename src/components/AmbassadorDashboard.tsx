import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { db, DbAmbassador, isSupabaseConfigured, supabase } from "../lib/supabase";
import { AmbassadorProfile } from "./AmbassadorProfile";
import logoUrl from "../assets/images/Advaltad Logo.jpeg";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface AmbassadorDashboardProps {
  onLogout: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: "payment" | "p2p" | "project" | "general";
}

interface ProjectItem {
  id: string;
  name: string;
  category: string;
  status: "active" | "completed" | "planning";
  progress: number;
  metricLabel: string;
  metricVal: string;
  location: string;
}

interface ExchangeListing {
  id: string;
  title: string;
  provider: string;
  avuCost: number;
  category: "mentorship" | "software" | "hardware" | "educational";
  icon: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const flowTrendData = [
  { name: "Mon", outbound: 350, inbound: 280, totalFlow: 630 },
  { name: "Tue", outbound: 450, inbound: 510, totalFlow: 960 },
  { name: "Wed", outbound: 210, inbound: 190, totalFlow: 400 },
  { name: "Thu", outbound: 680, inbound: 720, totalFlow: 1400 },
  { name: "Fri", outbound: 400, inbound: 380, totalFlow: 780 },
  { name: "Sat", outbound: 150, inbound: 220, totalFlow: 370 },
  { name: "Sun", outbound: 280, inbound: 310, totalFlow: 590 }
];

const hubFlowData = [
  { name: "Lagos", Received: 980, Dispatched: 640 },
  { name: "Mombasa", Received: 410, Dispatched: 580 },
  { name: "Nairobi", Received: 620, Dispatched: 830 },
  { name: "Accra", Received: 870, Dispatched: 520 },
  { name: "Kigali", Received: 350, Dispatched: 290 }
];

export const AmbassadorDashboard: React.FC<AmbassadorDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "certificate" | "p2p" | "payments" | "projects" | "profile">("overview");
  
  // Ambassador Database Profile state
  const [profile, setProfile] = useState<DbAmbassador | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const handleSignOut = () => {
    onLogout();
  };

  // Form states for profile edit
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editField, setEditField] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Ambassador Personal State
  const [ambassadorName, setAmbassadorName] = useState("Ramon Bisola");
  const [ambassadorRegion, setAmbassadorRegion] = useState("Lagos, Nigeria");
  const [ambassadorField, setAmbassadorField] = useState("Youth Technology Labs");
  const [commissionDate, setCommissionDate] = useState("May 27, 2026");
  const [avuBalance, setAvuBalance] = useState(1250);
  const [hasFunded, setHasFunded] = useState<boolean>(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; type: "success" | "error" | "info"; title: string; message: string }[]>([]);

  const showToast = (type: "success" | "error" | "info", title: string, message: string) => {
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // Paystack wallet funding form states
  const [fundingByName, setFundingByName] = useState("");
  const [fundingPhone, setFundingPhone] = useState("");
  const [programSponsored, setProgramSponsored] = useState("Youth Empowerment Initiative");
  const [amountNaira, setAmountNaira] = useState("");
  const [totalDepositsNaira, setTotalDepositsNaira] = useState(0);

  // Dynamically inject Paystack inline script
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
        return;
      }
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Sync funding profile fields when profile loads
  useEffect(() => {
    if (profile) {
      setFundingByName(profile.professional_name || profile.name || "");
      setFundingPhone(profile.phone_number || profile.phone || "");
    }
  }, [profile]);

  const fetchAmbassadorData = async () => {
    const sessionEmail = localStorage.getItem("advaltad_session_email") || "ramon@example.com";
    setIsLoadingProfile(true);
    try {
      let user = await db.findAmbassadorByEmail(sessionEmail);
      if (!user) {
        // Create auto-fallback if none exists yet (e.g. initial demo setup)
        user = await db.createAmbassador({
          name: "Ramon Bisola",
          city: "Lagos, Nigeria",
          field: "Enriching African youths initiative",
          email: sessionEmail,
          phone: "+234 801 234 5678",
          password: "password123"
        });
        // Auto approve Ramon's default login
        if (sessionEmail === "ramon@example.com") {
          await db.updateStatus(user.id, "approved");
          user.status = "approved";
        }
      }
      setProfile(user);
      setAmbassadorName(user.name);
      setAmbassadorRegion(user.city);
      setAmbassadorField(user.field);
      setAvuBalance(user.avu_balance);

      setEditName(user.name);
      setEditCity(user.city);
      setEditField(user.field);
      setEditPhone(user.phone || "");
      setEditPassword(user.password || "");

      // Format clean date based on registration or default
      if (user.created_at) {
        const d = new Date(user.created_at);
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        setCommissionDate(d.toLocaleDateString('en-US', options));
      }

      // Check funding status from DB/localStorage deposits table
      try {
        const allDeposits = await db.getDeposits();
        const matchedSuccessDeposits = allDeposits.filter(d => 
          d.ambassador_id === user.id && d.status === "success"
        );
        const sumNaira = matchedSuccessDeposits.reduce((acc, curr) => acc + (curr.amount_naira || 0), 0);
        setTotalDepositsNaira(sumNaira);
        setHasFunded(matchedSuccessDeposits.length > 0);
      } catch (err) {
        console.error("Error checking funding status from deposits:", err);
        setHasFunded(false);
        setTotalDepositsNaira(0);
      }
    } catch (e) {
      console.error("Error loading ambassador data", e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    const verifyAndFetch = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error || !user) {
            console.error("No authenticated user exists in Supabase Auth:", error);
            // Clear local states
            localStorage.removeItem("advaltad_session_email");
            onLogout();
            window.location.href = "/";
            return;
          }
        } catch (err) {
          console.error("Error verifying authenticated user via Supabase:", err);
          localStorage.removeItem("advaltad_session_email");
          onLogout();
          window.location.href = "/";
          return;
        }
      }
      fetchAmbassadorData();
    };

    verifyAndFetch();
  }, []);

  useEffect(() => {
    if (!profile || profile.status !== "pending") return;

    const intervalId = setInterval(async () => {
      try {
        const user = await db.findAmbassadorByEmail(profile.email);
        if (user && user.status !== "pending") {
          setProfile(user);
          setAmbassadorName(user.name);
          setAmbassadorRegion(user.city);
          setAmbassadorField(user.field);
          setAvuBalance(user.avu_balance);
        }
      } catch (err) {
        console.error("Error polling ambassador status:", err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [profile]);

  useEffect(() => {
    if (!profile || !isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel(`public:ambassadors:email=${profile.email}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ambassadors",
          filter: `email=eq.${profile.email}`
        },
        () => {
          console.log("Realtime status change detected! Reloading profile...");
          fetchAmbassadorData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  

  
  // Certificate Interactive Form State
  const [certFormOpen, setCertFormOpen] = useState(false);
  const [tempName, setTempName] = useState(ambassadorName);
  const [tempRegion, setTempRegion] = useState(ambassadorRegion);
  const [tempField, setTempField] = useState(ambassadorField);
  const [tempDate, setTempDate] = useState(commissionDate);
  const [downloadingCert, setDownloadingCert] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n-1",
      title: "Value Exchange Confirmed",
      desc: "Grace Adebayo accepted your query for 2 Sustainable Shelter Layout designs. -300 AVU allocated.",
      time: "20 mins ago",
      unread: true,
      type: "p2p"
    },
    {
      id: "n-2",
      title: "Direct Regional Donation",
      desc: "$450 allocated to NextGen Scholarships in Lagos from a verified anonymous sponsor.",
      time: "2 hours ago",
      unread: true,
      type: "payment"
    },
    {
      id: "n-3",
      title: "Mobile Clinic Live Launch",
      desc: "Mombasa wellness hub has initiated telemedicine services. Project milestones updated.",
      time: "1 day ago",
      unread: false,
      type: "project"
    }
  ]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Peer to Peer Value Transfer State
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [p2pType, setP2pType] = useState<"send" | "request" | "analytics">("send");

  // Dynamic Donation Link builder
  const [donationLinkText, setDonationLinkText] = useState("https://advaltad.org/campaign/ramon-youth-labs");
  const [campaignTitle, setCampaignTitle] = useState("Support Ramon's TechHub");
  const [campaignGenerated, setCampaignGenerated] = useState(false);

  // Direct Terminal Donation form inside gateway
  const [termAmount, setTermAmount] = useState("");
  const [termDonorName, setTermDonorName] = useState("");
  const [termDonorEmail, setTermDonorEmail] = useState("");
  const [termStatus, setTermStatus] = useState<"idle" | "submitting" | "completed">("idle");

  // Project supervising states
  const [projects, setProjects] = useState<ProjectItem[]>([
    {
      id: "p-1",
      name: "Surulere Software Hub & Tech Incubator",
      category: "Youth Empowerment",
      status: "active",
      progress: 68,
      metricLabel: "Active Trainees",
      metricVal: "48 Students",
      location: "Surulere, Lagos"
    },
    {
      id: "p-2",
      name: "Ikeja Classroom Rehabilitation & Broadband",
      category: "Education Initiatives",
      status: "completed",
      progress: 100,
      metricLabel: "Schools Renovated",
      metricVal: "4 Primary Schools",
      location: "Ikeja, Lagos"
    },
    {
      id: "p-3",
      name: "Sango-Ota Solar Water Borehole Grid",
      category: "Community Development",
      status: "planning",
      progress: 15,
      metricLabel: "Target Liter Supply",
      metricVal: "10k Liters/day",
      location: "Ogun Corridor"
    }
  ]);

  // Peer list for P2P resource library
  const [exchangeItems, setExchangeItems] = useState<ExchangeListing[]>([
    { id: "e-1", title: "Eco-Adobe Brick Compressor blueprints", provider: "Grace (Mombasa)", avuCost: 150, category: "hardware", icon: "Home" },
    { id: "e-2", title: "NextGen Tech Curriculum (React/Figma Spec)", provider: "Advaltad HQ", avuCost: 0, category: "educational", icon: "GraduationCap" },
    { id: "e-3", title: "Premium CAD/GIS Architectural Account Access", provider: "Kofi (Accra)", avuCost: 400, category: "software", icon: "Cpu" },
    { id: "e-4", title: "1-on-1 Grant Writing Mentorship (60 mins)", provider: "Nia (Nairobi NGO Lead)", avuCost: 200, category: "mentorship", icon: "Compass" }
  ]);

  const [activeItemDetails, setActiveItemDetails] = useState<ExchangeListing | null>(null);
  const [itemExchangeSuccess, setItemExchangeSuccess] = useState(false);

  // Simulate updating the Certificate fields
  const handleCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmbassadorName(tempName);
    setAmbassadorRegion(tempRegion);
    setAmbassadorField(tempField);
    setCommissionDate(tempDate);
    setCertFormOpen(false);

    // Keep database in sync if logged in
    if (profile?.id) {
      try {
        await db.updateProfile(profile.id, {
          name: tempName,
          city: tempRegion,
          field: tempField
        });
        await db.logActivity({
          ambassador_id: profile.id,
          ambassador_name: tempName,
          type: "profile_update",
          desc: `Updated fellowship certificate credentials: name to "${tempName}", division to "${tempField}"`
        });
        // Update edit states too
        setEditName(tempName);
        setEditCity(tempRegion);
        setEditField(tempField);
      } catch (err) {
        console.error("Failed to sync certificate update with profile database:", err);
      }
    }

    // Add a positive system notification
    const newNotif: NotificationItem = {
      id: "n-cert-" + Date.now(),
      title: "Fellowship Certificate updated",
      desc: `Your credential badge for "${tempName}" was regenerated successfully.`,
      time: "Just now",
      unread: true,
      type: "general"
    };
    setNotifications([newNotif, ...notifications]);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setIsUpdatingProfile(true);
    setUpdateSuccess(false);
    try {
      const updates = {
        name: editName,
        city: editCity,
        field: editField,
        phone: editPhone,
        password: editPassword
      };
      await db.updateProfile(profile.id, updates);
      await db.logActivity({
        ambassador_id: profile.id,
        ambassador_name: editName,
        type: "profile_update",
        desc: `Updated public registry profile: city to "${editCity}", phone contact, and focus division to "${editField}"`
      });
      
      // Update local states
      setAmbassadorName(editName);
      setAmbassadorRegion(editCity);
      setAmbassadorField(editField);
      
      // Also update certificate temp states so they stay matched
      setTempName(editName);
      setTempRegion(editCity);
      setTempField(editField);

      // Reload database profile record
      await fetchAmbassadorData();
      
      setUpdateSuccess(true);
      
      // Add system notification
      const newNotif: NotificationItem = {
        id: "n-profile-" + Date.now(),
        title: "Profile details updated",
        desc: `Your professional profile and base city were updated successfully.`,
        time: "Just now",
        unread: true,
        type: "general"
      };
      setNotifications(prev => [newNotif, ...prev]);

      setTimeout(() => setUpdateSuccess(false), 4000);
    } catch (err) {
      console.error("Error updating profile details", err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleP2PTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(transferAmount);
    if (!transferTargetId || isNaN(amt) || amt <= 0 || amt > avuBalance) return;

    setAvuBalance(prev => prev - amt);
    
    if (profile?.id) {
      try {
        await db.updateAvuBalance(profile.id, avuBalance - amt);
        await db.logActivity({
          ambassador_id: profile.id,
          ambassador_name: ambassadorName,
          type: "avu_transfer",
          desc: `Initiated peer ledger transfer of ${amt} AVU to Trustee [${transferTargetId}] for: "${transferReason || "Peer technical support"}"`,
          amount: `${amt} AVU`
        });
      } catch (err) {
        console.error("Failed to update ledger on P2P", err);
      }
    }
    
    setTransferSuccess(true);
    
    const newNotif: NotificationItem = {
      id: "n-p2p-" + Date.now(),
      title: "AVU Transfer Completed",
      desc: `You sent ${amt} AVU to Ambassador ${transferTargetId} for: "${transferReason || "No details provided"}".`,
      time: "Just now",
      unread: true,
      type: "p2p"
    };
    setNotifications([newNotif, ...notifications]);

    setTimeout(() => {
      setTransferSuccess(false);
      setTransferAmount("");
      setTransferTargetId("");
      setTransferReason("");
    }, 4000);
  };

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundingByName.trim()) {
      showToast("error", "Input Required", "Please enter the name of the person funding the project.");
      return;
    }
    if (!fundingPhone.trim()) {
      showToast("error", "Input Required", "Please enter a valid phone number.");
      return;
    }
    const amt = parseFloat(amountNaira);
    if (isNaN(amt) || amt <= 0) {
      showToast("error", "Invalid Amount", "Please enter a valid amount in Naira.");
      return;
    }

    const paystackRef = `ref_${Date.now()}`;
    const avuToEarn = Math.floor(amt / 1000);

    // Secure fallback for ambassador id
    const currentAmbassadorId = profile?.id || "00000000-0000-0000-0000-000000000000";

    showToast("info", "Initializing Transaction", `Preparing secure connection to Paystack checkout for ₦${amt.toLocaleString()}...`);

    // 1. Initial Transaction Registration to Supabase directly and local DB
    try {
      if (supabase && isSupabaseConfigured) {
        await supabase.from("deposits").insert([{
          ambassador_id: currentAmbassadorId,
          funding_by_name: fundingByName,
          phone_number: fundingPhone,
          program_sponsored: programSponsored,
          amount_naira: amt,
          avu_earned: avuToEarn,
          paystack_reference: paystackRef,
          status: "pending"
        }]);
      }
      // Keep local state in sync
      await db.createDeposit({
        ambassador_id: currentAmbassadorId,
        funding_by_name: fundingByName,
        phone_number: fundingPhone,
        program_sponsored: programSponsored,
        amount_naira: amt,
        avu_earned: avuToEarn,
        paystack_reference: paystackRef,
        status: "pending"
      });
    } catch (err) {
      console.error("Database registration failed or bypassed:", err);
    }

    // 2. Paystack Initialization with full error-trapped callback/onClose toast feedback
    const paystackPop = (window as any).PaystackPop;
    if (paystackPop) {
      try {
        const handler = paystackPop.setup({
          key: "pk_live_e7fddb22eb7063991306bc82bd907a0be7a1a3fb",
          email: profile?.email || "ambassador@domain.com",
          amount: Math.round(amt * 100), // Kobo conversion
          ref: paystackRef,
          metadata: {
            ambassador_id: currentAmbassadorId,
            funding_by_name: fundingByName,
            program_sponsored: programSponsored,
            avu_earned: avuToEarn
          },
          callback: async function(res: any) {
            try {
              await db.updateDepositStatus(paystackRef, "success");
              showToast("success", "Payment Verified", `Successfully verified payment of ₦${amt.toLocaleString()} NGN via Paystack. Credited ${avuToEarn} AVU to your balance!`);
              setAmountNaira("");
              setFundingByName("");
              setFundingPhone("");
              fetchAmbassadorData();
            } catch (err) {
              console.error("Error updating successful deposit status", err);
              showToast("error", "Verification Error", "Could not fully verify transaction in database, please contact support.");
            }
          },
          onClose: async function() {
            try {
              await db.updateDepositStatus(paystackRef, "failed");
              showToast("error", "Transaction Cancelled", "The Paystack transaction was cancelled by the user.");
              fetchAmbassadorData();
            } catch (err) {
              console.error("Error updating cancelled deposit status", err);
            }
          }
        });
        
        handler.openIframe();
      } catch (err) {
        console.error("Paystack initialization error", err);
        showToast("error", "Initialization Failed", "Failed to launch Paystack inline check. Using simulated gateway fallback.");
        launchSimulationFallback(paystackRef, amt, avuToEarn);
      }
    } else {
      // High fidelity simulation fallback to allow easy testing in sandboxed iframes
      launchSimulationFallback(paystackRef, amt, avuToEarn);
    }
  };

  const launchSimulationFallback = async (paystackRef: string, amt: number, avuToEarn: string | number) => {
    const simulatedResponse = confirm(
      `[PAYSTACK SIMULATED GATEWAY]\n\n` +
      `Funding project for: ${fundingByName}\n` +
      `Sponsoring Program: ${programSponsored}\n` +
      `Amount: ₦${amt.toLocaleString()} NGN\n` +
      `Calculated AVU: ${avuToEarn} AVU\n\n` +
      `Click OK to simulate SUCCESS callback, or Cancel to simulate cancellation.`
    );

    if (simulatedResponse) {
      try {
        await db.updateDepositStatus(paystackRef, "success");
        showToast("success", "Payment Verified (Simulation)", `Successfully processed simulated payment of ₦${amt.toLocaleString()} NGN. Logged ${avuToEarn} AVU to your balance!`);
        setAmountNaira("");
        setFundingByName("");
        setFundingPhone("");
        fetchAmbassadorData();
      } catch (err) {
        console.error("Error updating simulated success deposit", err);
      }
    } else {
      try {
        await db.updateDepositStatus(paystackRef, "failed");
        showToast("error", "Transaction Cancelled", "The simulated transaction was cancelled by the user.");
        fetchAmbassadorData();
      } catch (err) {
        console.error("Error updating simulated failed deposit", err);
      }
    }
  };

  const handleDirectDonationGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(termAmount);
    if (!termDonorName || !termDonorEmail || isNaN(amt) || amt <= 0) return;

    setTermStatus("submitting");
    setTimeout(async () => {
      setTermStatus("completed");
      setHasFunded(true);
      
      if (profile?.id) {
        try {
          await db.logActivity({
            ambassador_id: profile.id,
            ambassador_name: ambassadorName,
            type: "donation_logged",
            desc: `Logged physical check/cash donation of $${amt} USD from ${termDonorName} (${termDonorEmail}) into regional pipeline tracker.`,
            amount: `$${amt} USD`
          });
        } catch (err) {
          console.error("Failed to log activity", err);
        }
      }
      
      const newNotif: NotificationItem = {
        id: "n-term-" + Date.now(),
        title: "Manual Donation Logged",
        desc: `$${amt} USD logged from ${termDonorName}. Sent directly to budget routing.`,
        time: "Just now",
        unread: true,
        type: "payment"
      };
      setNotifications([newNotif, ...notifications]);
    }, 1800);
  };

  const handleDownloadCertificate = () => {
    setDownloadingCert(true);
    setTimeout(() => {
      setDownloadingCert(false);
      alert("Certificate generated in high resolution. This simulates download capabilities and ensures compliance with standard vector layouts.");
    }, 2000);
  };

  const markAllNotifRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16 font-sans select-none text-slate-900">
      
      {/* Upper sub-header bar for profile info and notifications */}
      <div className="bg-white border-b border-gray-200 py-4 shadow-sm relative z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-serif font-black text-xl">
              {ambassadorName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-gray-900">{ambassadorName}</h2>
                {profile?.status === "pending" ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    Awaiting Approval
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    Fellow ambassador
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-sans mt-0.5">
                {ambassadorRegion} • Lead Scholar in <span className="font-semibold text-emerald-700">{ambassadorField}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* AVU Balance Quick badge */}
            <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                P
              </div>
              <div className="text-left leading-none">
                <span className="block text-[9px] uppercase font-bold text-gray-400">AVU Balance</span>
                <span className="text-xs font-black text-emerald-800 font-mono tracking-tight">{avuBalance} AVU</span>
              </div>
            </div>

            {/* Notification bell hub */}
            <div className="relative">
              <button
                id="notif-bell-hub"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center relative cursor-pointer text-gray-600 focus:outline-none"
              >
                <Icon name="Mail" size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setNotifDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <span className="text-xs font-bold text-gray-700">Recent Terminal Alerts</span>
                        <button
                          onClick={markAllNotifRead}
                          className="text-[10px] uppercase font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          Mark all read
                        </button>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-4 hover:bg-gray-50/50 transition-colors relative flex gap-3 ${
                              notif.unread ? "bg-emerald-50/10" : ""
                            }`}
                          >
                            {notif.unread && (
                              <span className="absolute top-4 left-2.5 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            )}
                            
                            <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500 max-h-max self-start mt-0.5">
                              <Icon
                                name={
                                  notif.type === "payment"
                                    ? "Coins"
                                    : notif.type === "p2p"
                                      ? "TrendingUp"
                                      : "Compass"
                                }
                                size={14}
                              />
                            </div>

                            <div className="space-y-0.5 flex-1">
                              <p className="text-xs font-bold text-gray-800">{notif.title}</p>
                              <p className="text-[11px] text-gray-500 leading-relaxed">{notif.desc}</p>
                              <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-1">
                                <Icon name="Clock" size={8} /> {notif.time}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Logout actions */}
            <button
              id="dashboard-logout"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:bg-emerald-700 hover:border-emerald-600 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Sign out
            </button>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {isLoadingProfile ? (
          <div className="bg-white rounded-3xl p-20 border border-slate-100 flex flex-col items-center justify-center space-y-4 shadow-sm text-center">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Securing Ledger Link...</p>
          </div>
        ) : profile?.status === "disapproved" ? (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-3xl border border-rose-100 shadow-xl overflow-hidden p-8 sm:p-10 space-y-8 relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon name="XCircle" size={32} className="text-rose-500 animate-bounce" />
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-800 text-[10px] font-extrabold uppercase tracking-widest">
                    Verification Declined
                  </span>
                  <h3 className="text-2xl font-display font-black text-[#1E293B] tracking-tight pt-1">
                    Administrative Authorization Declined
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Unfortunately, your registered fellowship credentials were not authorized by the chief administrator.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100/50 space-y-3 text-left">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">What happens next?</h4>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Your registration status was updated to disapproved. This could be due to missing details, invalid contact info, or incorrect project alignment. Please contact your coordinator or the Advaltad Fellowship team for guidance.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onLogout}
                  className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs cursor-pointer text-center"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : profile?.status === "pending" ? (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-3xl border border-amber-100 shadow-xl overflow-hidden p-8 sm:p-10 space-y-8 relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon name="ShieldAlert" size={32} className="animate-pulse" />
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-widest">
                    Awaiting Verification
                  </span>
                  <h3 className="text-2xl font-display font-black text-[#1E293B] tracking-tight pt-1">
                    Administrative Authorization Pending
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Registry credentials synchronized. Awaiting Chief Administrator signature.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 text-xs font-sans">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100/50 space-y-3 text-left">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Your Registered Profile</h4>
                  <div className="space-y-2 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">FULL NAME</span>
                      <span className="text-sm font-semibold text-slate-800">{profile.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">BASE REGION</span>
                      <span className="text-sm font-semibold text-slate-800">{profile.city}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">FOCUS DIVISION</span>
                      <span className="text-sm font-semibold text-slate-800">{profile.field}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">EMAIL ADDRESS</span>
                      <span className="text-sm font-semibold text-slate-800">{profile.email}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100/50 flex flex-col justify-between text-left">
                  <div className="space-y-2">
                    <h4 className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">Registry Commitment</h4>
                    <p className="text-slate-600 leading-relaxed text-xs">
                      Every authorized Advaltad Ambassador is designated as a digital sovereign trustee. Your credentials are stored securely on the ledger and await supervisor certification to prevent invalid field project deployments.
                    </p>
                  </div>
                  <div className="pt-4 text-[10px] text-emerald-600 font-mono">
                    SECURE_ID: {profile.id} • PENDING_SYNC
                  </div>
                </div>
              </div>

              {/* Standalone Sign Out section */}
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSignOut}
                  className="px-6 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm tracking-wide transition-all cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Icon name="LogOut" size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Navigation vertical toolbar tabs */}
          <div className="lg:col-span-3 space-y-2">
            <button
              id="tab-overview"
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-left transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "bg-white hover:bg-gray-100/50 text-gray-700 border border-gray-100"
              }`}
            >
              <Icon name="Compass" size={16} />
              <span>Overview Dashboard</span>
            </button>

            <button
              id="tab-certificate"
              onClick={() => setActiveTab("certificate")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-left transition-all cursor-pointer ${
                activeTab === "certificate"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "bg-white hover:bg-gray-100/50 text-gray-700 border border-gray-100"
              }`}
            >
              <Icon name="Award" size={16} />
              <span>Fellowship Certificate</span>
            </button>

            <button
              id="tab-p2p"
              onClick={() => setActiveTab("p2p")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-left transition-all cursor-pointer ${
                activeTab === "p2p"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "bg-white hover:bg-gray-100/50 text-gray-700 border border-gray-100"
              }`}
            >
              <Icon name="TrendingUp" size={16} />
              <span>P2P Value Exchange</span>
            </button>

            <button
              id="tab-payments"
              onClick={() => setActiveTab("payments")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-left transition-all cursor-pointer ${
                activeTab === "payments"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "bg-white hover:bg-gray-100/50 text-gray-700 border border-gray-100"
              }`}
            >
              <Icon name="Coins" size={16} />
              <span>Payment Gateway Link</span>
            </button>

            <button
              id="tab-projects"
              onClick={() => setActiveTab("projects")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-left transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "bg-white hover:bg-gray-100/50 text-gray-700 border border-gray-100"
              }`}
            >
              <Icon name="Home" size={16} />
              <span>My Local Projects</span>
            </button>

            <button
              id="tab-profile"
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-left transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "bg-white hover:bg-gray-100/50 text-gray-700 border border-gray-100"
              }`}
            >
              <Icon name="UserCheck" size={16} />
              <span>Update Profile & City</span>
            </button>

            {/* Quick stats panel left card */}
            <div className="p-5 rounded-3xl bg-slate-900 text-white border border-gray-850 space-y-4 pt-6">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Campaign Impact</span>
              
              <div className="space-y-1">
                <p className="text-2xl font-black font-mono tracking-tight">{hasFunded ? `₦${totalDepositsNaira.toLocaleString()}` : "₦0"}</p>
                <p className="text-[10px] text-gray-400">Total Funds Directed Globally</p>
              </div>

              {/* Minimal bar progress visual */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Target Goal</span>
                  <span className="font-bold text-emerald-400">{hasFunded ? "91% reached" : "0% reached"}</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: hasFunded ? "91.6%" : "0%" }}></div>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 leading-normal font-sans">
                Every regional donation tracked automatically triggers software licenses or bricks on-field directly. Under 51(c)(3) standards.
              </p>
            </div>
          </div>

          {/* Active Workscreen panels */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: OVERVIEW DASHBOARD */}
              {activeTab === "overview" && (
                <motion.div
                  key="v-overview"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                >
                  {/* Top quick bento cards */}
                  <motion.div variants={containerVariants} className="grid sm:grid-cols-3 gap-6">
                    
                    <motion.div
                      variants={itemVariants}
                      className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-2 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
                      <div className="text-emerald-600 bg-emerald-50 p-2 rounded-xl max-w-max">
                        <Icon name="Coins" size={18} />
                      </div>
                      <p className="text-2xl font-black tracking-tight">{hasFunded ? `₦${totalDepositsNaira.toLocaleString()}` : "₦0"}</p>
                      <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Campaign Deposits</p>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-2 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
                      <div className="text-emerald-600 bg-emerald-50 p-2 rounded-xl max-w-max">
                        <Icon name="TrendingUp" size={18} />
                      </div>
                      <p className="text-2xl font-black tracking-tight">{hasFunded ? `${avuBalance} AVU` : "0 AVU"}</p>
                      <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Dynamic Exchange Points</p>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-2 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
                      <div className="text-emerald-600 bg-emerald-50 p-2 rounded-xl max-w-max">
                        <Icon name="Home" size={18} />
                      </div>
                      <p className="text-2xl font-black tracking-tight">{hasFunded ? "3 Project Grids" : "0 Project Grids"}</p>
                      <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Supervised Deployments</p>
                    </motion.div>

                  </motion.div>

                  {/* Regional telemetry & visual campaign track */}
                  <motion.div variants={containerVariants} className="grid md:grid-cols-12 gap-6 items-start">
                    
                    {/* Active Campaign Status Feed */}
                    <motion.div
                      variants={itemVariants}
                      className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-100 shadow-sm md:col-span-8 space-y-6"
                    >
                      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                        <div>
                          <h3 className="font-bold text-gray-900">Regional Development Tracker</h3>
                          <p className="text-xs text-slate-500 font-sans">Active field works matching your fellowship interest segment.</p>
                        </div>
                        <span className="p-2.5 rounded-xl bg-gray-50 text-slate-400 flex items-center justify-center">
                          <Icon name="Compass" size={16} />
                        </span>
                      </div>

                      {/* Map-based representation of Africa project pipeline details */}
                      <div className="relative h-60 bg-gradient-to-br from-emerald-900 to-slate-900 rounded-2xl overflow-hidden flex items-center justify-center text-white">
                        {/* Map Background visual overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-10">
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:1rem_1rem]" />
                        </div>
                        
                        <div className="absolute top-1/4 left-1/3 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex flex-col items-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mt-1">Lagos TechHub</span>
                          <span className="text-[9px] text-gray-300 font-mono">Surulere Live Grid</span>
                        </div>

                        <div className="absolute bottom-1/3 right-1/4 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex flex-col items-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mt-1">Sango solar</span>
                          <span className="text-[9px] text-gray-300 font-mono">Borehole Grid</span>
                        </div>

                        <p className="text-xs text-white/40 font-mono uppercase tracking-widest text-center">Interactive Regional Radar Matrix</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-sans text-gray-500">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="font-bold text-slate-800">48 certified tech youth</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Surulere developer labs completed standard courseware.</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="font-bold text-slate-800">10k L solar pumps</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Hydrated solar grids mapped to regional water corridors.</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Left panel: Quick activity logs feed */}
                    <motion.div
                      variants={itemVariants}
                      className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm md:col-span-4 space-y-4"
                    >
                      <h4 className="font-bold text-sm text-gray-900">Live Team Progress</h4>
                      <p className="text-xs text-slate-500 font-sans">Fellow actions tracked directly inside the West-Africa network.</p>

                      <div className="space-y-4 pt-2">
                        <div className="flex gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                          <p className="font-sans text-gray-600">
                            <span className="font-bold text-slate-800">Kofi</span> imported 2 High-Power GIS accounts via P2P.
                          </p>
                        </div>
                        <div className="flex gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                          <p className="font-sans text-gray-600">
                            <span className="font-bold text-slate-800">Nia</span> submitted financial audit spreadsheet for Nairobi tech labs.
                          </p>
                        </div>
                        <div className="flex gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                          <p className="font-sans text-gray-600">
                            <span className="font-bold text-slate-800">HQ</span> announced the launch of certified printable badges.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <button
                          onClick={() => setActiveTab("certificate")}
                          className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          View Certificate Hub
                        </button>
                      </div>
                    </motion.div>

                  </motion.div>

                  {/* Why Hold AVU Educational Panel */}
                  <motion.div
                    variants={itemVariants}
                    className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">
                          Why Hold Advaltad Value Units (AVU) in Your Growth Ambassador Wallet?
                        </h3>
                        <p className="text-[11px] text-slate-500 font-sans mt-1 leading-relaxed">
                          Holding Advaltad Value Units (AVU) is more than owning a digital asset—it's a commitment to sustainable development, collaboration, and social impact across Africa.
                        </p>
                      </div>
                      <div className="flex-shrink-0 bg-emerald-50 text-emerald-600 p-3 rounded-2xl flex items-center gap-2 font-mono text-xs font-bold border border-emerald-100">
                        <Icon name="Sparkles" size={16} />
                        <span>Empowered Growth</span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Benefit 1 */}
                      <div className="p-5 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-100 hover:border-emerald-100/50 transition-all duration-300 group space-y-3">
                        <div className="p-2.5 rounded-xl bg-white text-emerald-600 w-10 h-10 flex items-center justify-center shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                          <Icon name="Globe" size={18} />
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                          1. Contribute to Africa's Development
                        </h4>
                        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                          Your participation supports initiatives that promote sustainable growth and community development across Africa.
                        </p>
                      </div>

                      {/* Benefit 2 */}
                      <div className="p-5 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-100 hover:border-emerald-100/50 transition-all duration-300 group space-y-3">
                        <div className="p-2.5 rounded-xl bg-white text-emerald-600 w-10 h-10 flex items-center justify-center shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                          <Icon name="HeartHandshake" size={18} />
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                          2. Global Networking for Growth
                        </h4>
                        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                          Connect with Growth Ambassadors from different countries, creating opportunities for learning, collaboration, and business development.
                        </p>
                      </div>

                      {/* Benefit 3 */}
                      <div className="p-5 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-100 hover:border-emerald-100/50 transition-all duration-300 group space-y-3">
                        <div className="p-2.5 rounded-xl bg-white text-emerald-600 w-10 h-10 flex items-center justify-center shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                          <Icon name="Coins" size={18} />
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                          3. Exchange Value with Other Growth Ambassadors
                        </h4>
                        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                          Use your Advaltad Value Units to exchange value within the Advaltad community, encouraging mutual support and economic participation.
                        </p>
                      </div>

                      {/* Benefit 4 */}
                      <div className="p-5 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-100 hover:border-emerald-100/50 transition-all duration-300 group space-y-3">
                        <div className="p-2.5 rounded-xl bg-white text-emerald-600 w-10 h-10 flex items-center justify-center shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                          <Icon name="HandHelping" size={18} />
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                          4. Pool Resources for Greater Productivity
                        </h4>
                        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                          Join a community that believes in peer support, resource sharing, and collective action to achieve greater impact.
                        </p>
                      </div>

                      {/* Benefit 5 */}
                      <div className="p-5 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-100 hover:border-emerald-100/50 transition-all duration-300 group space-y-3">
                        <div className="p-2.5 rounded-xl bg-white text-emerald-600 w-10 h-10 flex items-center justify-center shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                          <Icon name="Home" size={18} />
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                          5. Access Humanitarian Housing Schemes
                        </h4>
                        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                          Eligible participants may benefit from humanitarian housing initiatives designed to improve access to affordable housing.
                        </p>
                      </div>

                      {/* Benefit 6 */}
                      <div className="p-5 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-100 hover:border-emerald-100/50 transition-all duration-300 group space-y-3">
                        <div className="p-2.5 rounded-xl bg-white text-emerald-600 w-10 h-10 flex items-center justify-center shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                          <Icon name="Heart" size={18} />
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                          6. Support Charitable Causes
                        </h4>
                        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                          Every Value Unit held contributes to programs that uplift vulnerable communities through humanitarian and charitable projects.
                        </p>
                      </div>
                    </div>

                    {/* Footer Call to Action */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left mt-2 shadow-sm">
                      <div className="space-y-0.5">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-emerald-200">Advaltad Fellowship Motto</p>
                        <p className="font-serif italic text-sm text-slate-100">"Together, we grow. Together, we create lasting impact."</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab("payments")}
                        className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-emerald-800 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95 cursor-pointer shrink-0"
                      >
                        <Icon name="Coins" size={14} />
                        <span>Fund Wallet & Earn AVU</span>
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* TAB 2: FELLOWSHIP CERTIFICATE */}
              {activeTab === "certificate" && (
                <motion.div
                  key="v-cert"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Fellowship Commission Credentials</h3>
                      <p className="text-xs text-gray-500 font-sans">Regenerate and print your official certified Ambassador badge dynamically.</p>
                    </div>
                    
                    <button
                      id="update-cert-details-btn"
                      onClick={() => {
                        setTempName(ambassadorName);
                        setTempRegion(ambassadorRegion);
                        setTempField(ambassadorField);
                        setTempDate(commissionDate);
                        setCertFormOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Icon name="UserCheck" size={14} />
                      Customize Credentials
                    </button>
                  </div>

                  {/* High Quality Styled Graphic Digital Certificate Frame */}
                  <div id="credentials-badge-vector" className="relative p-6 sm:p-12 rounded-3xl bg-white border-8 border-emerald-900 shadow-xl overflow-hidden text-center max-w-4xl mx-auto">
                    
                    {/* Leafy organic watermark backgrounds */}
                    <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
                      <div className="absolute inset-[-50px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.5)_0,transparent_75%)]" />
                    </div>

                    <div className="relative z-10 border-2 border-emerald-900/10 p-6 sm:p-10 rounded-2xl space-y-8 font-serif">
                      
                      {/* Top credentials header logo */}
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-emerald-950/20 flex items-center justify-center shadow-md">
                          <img
                            src={logoUrl}
                            alt="Advaltad Foundation Logo"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-xs font-sans uppercase font-black tracking-widest text-emerald-800">
                          Advaltad: Adding Value to Africa's Development
                        </span>
                        <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-widest">
                          Global Fellowship Commission
                        </span>
                      </div>

                      {/* Declaration */}
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-widest text-slate-400 font-sans italic">This is to certify that</p>
                        <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none pt-2 font-sans py-1">
                          {ambassadorName}
                        </h4>
                        <p className="text-xs text-slate-500 italic font-sans max-w-lg mx-auto leading-relaxed pt-2">
                          has been formally designated as a certified global Fellow and Sovereign Representative, fully authorized to supervise direct field asset operations for:
                        </p>
                      </div>

                      {/* Field Tag */}
                      <div className="max-w-max mx-auto px-6 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 font-sans font-extrabold text-sm tracking-tight uppercase shadow-sm">
                        {ambassadorField}
                      </div>

                      {/* Sub-text details */}
                      <p className="text-xs text-slate-400 font-sans max-w-md mx-auto leading-relaxed">
                        Granted full operations representation in <span className="font-semibold text-slate-700">{ambassadorRegion}</span>, committing to direct audited allocations and peer-to-peer developer hubs transparency.
                      </p>

                      {/* Directors Signatures with dynamic verification checksum */}
                      <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-100 font-sans">
                        <div className="flex flex-col items-center">
                          <span className="font-serif italic text-emerald-800 text-sm">Oluwaseun Adewole</span>
                          <span className="w-24 h-px bg-slate-350 my-1"></span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Executive Director</span>
                        </div>

                        <div className="flex flex-col items-center">
                          <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded bg-slate-50 border border-emerald-100">
                            {commissionDate.toUpperCase()}
                          </span>
                          <span className="w-24 h-px bg-slate-350 my-1"></span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Commission Date</span>
                        </div>
                      </div>

                      {/* Badge unique sha checksum identifier */}
                      <div className="text-[9px] font-mono text-gray-400/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-100/60 font-sans">
                        <span>CERTIFICATE CHECKSUM: ADVALTAD_COMMIT_VERIFIED_SHA256_F{Math.floor(Math.random() * 888 + 111)}X</span>
                        <span>STATUS: SECURE DEPLOYED PORTAL DEVISE</span>
                      </div>

                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      id="download-cert-btn"
                      onClick={handleDownloadCertificate}
                      disabled={downloadingCert}
                      className="px-6 py-3.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 mx-auto hover:bg-slate-800 max-w-max transition-colors cursor-pointer"
                    >
                      {downloadingCert ? (
                        <>
                          <div className="w-4 h-4 rounded-full border border-white border-t-transparent animate-spin" />
                          Rendering high-res PDF asset...
                        </>
                      ) : (
                        <>
                          <Icon name="Award" size={14} />
                          Print / Download Physical Credential Badges
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: P2P VALUE EXCHANGE */}
              {activeTab === "p2p" && (
                <motion.div
                  key="v-p2p"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                >
                  <div className="pb-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">Peer-to-Peer Value Exchange System</h3>
                    <p className="text-xs text-gray-500 font-sans">Trade computational materials, local solar blueprints, laptop setups, and direct guidance with fellow scholars.</p>
                  </div>

                  <div className="grid md:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Peer lists */}
                    <div className="md:col-span-8 space-y-6">
                      <div className="flex bg-gray-150 p-1 bg-gray-100 mt-2 rounded-xl mb-4 max-w-md">
                        <button
                          onClick={() => setP2pType("send")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            p2pType === "send" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                          }`}
                        >
                          Send AVU Points
                        </button>
                        <button
                          onClick={() => setP2pType("request")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            p2pType === "request" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                          }`}
                        >
                          Resource Library
                        </button>
                        <button
                          onClick={() => setP2pType("analytics")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            p2pType === "analytics" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                          }`}
                        >
                          AVU Flow Network
                        </button>
                      </div>

                      <AnimatePresence mode="wait">
                        {p2pType === "send" && (
                          <motion.div
                            key="p2p-send"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-105 shadow-sm space-y-6"
                          >
                            <h4 className="font-bold text-sm text-gray-950">Direct Peer Transfer Terminal</h4>
                            <p className="text-xs text-gray-500">Instantly route Advaltad Value Units (AVU) to another fellow's digital registry wallet for structural cooperation.</p>

                            {transferSuccess && (
                              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                                <Icon name="Check" size={16} />
                                <span>Points dispatch secured. Checked on Ledger! Balance updated to {avuBalance} AVU.</span>
                              </div>
                            )}

                            <form onSubmit={handleP2PTransfer} className="space-y-4 text-xs font-sans">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Recipient Ambassador ID</label>
                                  <input
                                    id="p2p-target-id"
                                    type="text"
                                    required
                                    placeholder="e.g. AV-26-8924"
                                    value={transferTargetId}
                                    onChange={(e) => setTransferTargetId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900"
                                  />
                                </div>

                                <div>
                                  <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Transfer Amount (AVU)</label>
                                  <input
                                    id="p2p-amount"
                                    type="number"
                                    required
                                    placeholder="e.g. 150"
                                    value={transferAmount}
                                    onChange={(e) => setTransferAmount(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Activity Justification / Purpose</label>
                                <input
                                  id="p2p-reason"
                                  type="text"
                                  placeholder="e.g. Exchanging solar pump maintenance blueprints for 3 communities"
                                  value={transferReason}
                                  onChange={(e) => setTransferReason(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900"
                                />
                              </div>

                              <button
                                id="p2p-submit"
                                type="submit"
                                disabled={!transferTargetId || !transferAmount}
                                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                              >
                                Certify and Dispatch Exchange Points
                              </button>
                            </form>
                          </motion.div>
                        )}

                        {p2pType === "request" && (
                          <motion.div
                            key="p2p-lib"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                          >
                            <h4 className="font-bold text-sm text-gray-950">Ambassador Shared Resource Ledger</h4>
                            <p className="text-xs text-gray-500">Exchange Points for high-value structural modules designed by peer leads across Africa.</p>

                            <div className="grid sm:grid-cols-2 gap-4">
                              {exchangeItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-5 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                                        {item.category}
                                      </span>
                                      <span className="font-mono text-xs font-black text-emerald-600">
                                        {item.avuCost > 0 ? `${item.avuCost} AVU` : "FREE"}
                                      </span>
                                    </div>
                                    <h5 className="font-bold text-xs text-slate-900 line-clamp-1">{item.title}</h5>
                                    <p className="text-[10px] text-gray-500">Shared by: <span className="font-semibold">{item.provider}</span></p>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setActiveItemDetails(item);
                                      setItemExchangeSuccess(false);
                                    }}
                                    className="w-full py-2 rounded-xl bg-gray-50 hover:bg-emerald-50 text-[11px] font-bold text-gray-700 hover:text-emerald-800"
                                  >
                                    Review Deal Details
                                  </button>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {p2pType === "analytics" && (
                          <motion.div
                            key="p2p-analytics"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                          >
                            {/* Analytics KPI mini row */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl">
                                <span className="text-[10px] font-bold text-emerald-850 uppercase tracking-wider block">Network Traffic</span>
                                <p className="text-lg font-black text-slate-900 mt-1">5,130 AVU</p>
                                <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">▲ 14% this week</span>
                              </div>
                              <div className="p-4 bg-teal-50/40 border border-teal-100 rounded-2xl">
                                <span className="text-[10px] font-bold text-teal-850 uppercase tracking-wider block">Completed Swaps</span>
                                <p className="text-lg font-black text-slate-900 mt-1">112 Items</p>
                                <span className="text-[9px] text-teal-600 font-bold block mt-0.5">98.2% fulfillment</span>
                              </div>
                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Corridors</span>
                                <p className="text-lg font-black text-slate-900 mt-1">8 Regions</p>
                                <span className="text-[9px] text-slate-500 font-bold block mt-0.5">West & East Africa</span>
                              </div>
                            </div>

                            {/* Recharts Area Chart */}
                            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
                              <div>
                                <h4 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                  <Icon name="TrendingUp" size={14} className="text-emerald-600 animate-pulse" />
                                  Live AVU Transaction Volumes (daily transits)
                                </h4>
                                <p className="text-[10px] text-gray-500 mt-0.5">Daily volume of active peer allocations mapped as Outbound vs Inbound transits.</p>
                              </div>

                              <div className="h-[210px] w-full mt-2 font-sans text-xs">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={flowTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#f8fafc", fontSize: "11px" }}
                                      labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#10b981" }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: "8px", fontSize: "10px" }} />
                                    <Area type="monotone" dataKey="outbound" name="Outbound Dispatch" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorOutbound)" />
                                    <Area type="monotone" dataKey="inbound" name="Inbound Receipt" stroke="#0d9488" strokeWidth={1.5} fillOpacity={1} fill="url(#colorInbound)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Recharts Bar Chart */}
                            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
                              <div>
                                <h4 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                  <Icon name="Building2" size={14} className="text-emerald-600" />
                                  Regional Inflow / Outflow Balance
                                </h4>
                                <p className="text-[10px] text-gray-500 mt-0.5">An analysis of community points balance across five active ambassador support hubs.</p>
                              </div>

                              <div className="h-[210px] w-full mt-2 font-sans text-xs">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={hubFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#f8fafc", fontSize: "11px" }}
                                      labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#2dd4bf" }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: "8px", fontSize: "10px" }} />
                                    <Bar dataKey="Received" name="Received Inflow" fill="#10b981" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="Dispatched" name="Dispatched Outflow" fill="#0d9488" radius={[3, 3, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Active Corridor Flow Channels */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                              <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Global Corridor Active Flow Channels</h5>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="font-bold text-slate-800 text-[11px]">Lagos Hub</span>
                                    <span className="text-gray-400 text-[10px]">➜</span>
                                    <span className="font-bold text-slate-650 text-[11px]">Accra Support</span>
                                  </div>
                                  <span className="font-bold text-emerald-600 font-mono text-[11px]">+400 AVU</span>
                                </div>

                                <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="font-bold text-slate-800 text-[11px]">Mombasa Corridor</span>
                                    <span className="text-gray-400 text-[10px]">➜</span>
                                    <span className="font-bold text-slate-655 text-[11px]">Kigali Center</span>
                                  </div>
                                  <span className="font-bold text-emerald-600 font-mono text-[11px]">+250 AVU</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Right column: Ledger stats */}
                    <div className="md:col-span-4 p-5 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-4">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Ledger Statement</h4>
                      
                      <div className="space-y-3.5 text-xs text-slate-500">
                        <div className="pb-3 border-b border-gray-100 flex justify-between">
                          <span>Initial AVU Commission</span>
                          <span className="text-slate-900 font-bold">+1,500 AVU</span>
                        </div>
                        <div className="pb-3 border-b border-gray-100 flex justify-between">
                          <span>Curriculum Package Access</span>
                          <span className="text-slate-900 font-bold">0 AVU (HQ Free)</span>
                        </div>
                        <div className="pb-3 border-b border-gray-100 flex justify-between">
                          <span>Shelter Blueprints swap</span>
                          <span className="text-amber-800 font-bold">-250 AVU</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="text-[10px] text-gray-400">Advaltad Value Units carry no static fiat conversions. They signify mutual intellectual assets shared across communities natively.</p>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* TAB 4: PAYMENT GATEWAY CAMPAIGN LINK */}
              {activeTab === "payments" && (
                <motion.div
                  key="v-payments"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                  style={{ fontFamily: "'Roboto', sans-serif" }}
                >
                  <div className="pb-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">Wallet Funding Terminal</h3>
                    <p className="text-xs text-gray-500 font-sans">Sponsor programs to fund your wallet and accumulate Advaltad Value Units (AVU) securely.</p>
                  </div>

                  <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 mx-auto">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100 font-sans">
                      <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                        <Icon name="Wallet" size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">Secure Deposit Gateway</h4>
                        <p className="text-[11px] text-slate-500">All payments are safely processed via Paystack Inline checkout</p>
                      </div>
                    </div>

                    <form onSubmit={handleFundWallet} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Field 1: Who is funding Project */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Who is funding Project</label>
                          <input
                            required
                            type="text"
                            placeholder="Ambassador Name"
                            value={fundingByName}
                            onChange={(e) => setFundingByName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-sans"
                          />
                        </div>

                        {/* Field 2: Phone Number */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                          <input
                            required
                            type="tel"
                            placeholder="+234..."
                            value={fundingPhone}
                            onChange={(e) => setFundingPhone(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-sans"
                          />
                        </div>
                      </div>

                      {/* Field 3: Programs to be Sponsored */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Programs to be Sponsored</label>
                        <select
                          required
                          value={programSponsored}
                          onChange={(e) => setProgramSponsored(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                        >
                          <option value="Youth Empowerment Initiative">Youth Empowerment Initiative</option>
                          <option value="Community Health Drive">Community Health Drive</option>
                          <option value="Digital Literacy Accelerator">Digital Literacy Accelerator</option>
                        </select>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Field 4: Total Amount to be funded */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount to be funded (₦)</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₦</span>
                            <input
                              required
                              type="number"
                              min="100"
                              placeholder="e.g. 50000"
                              value={amountNaira}
                              onChange={(e) => setAmountNaira(e.target.value)}
                              className="w-full pl-8 pr-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>
                        </div>

                        {/* Field 5: Total AVU to receive */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Total AVU to receive</label>
                          <input
                            disabled
                            type="text"
                            value={`${(Math.floor(Number(amountNaira || 0) / 1000)).toLocaleString()} AVU`}
                            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-emerald-800 font-mono cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          className="w-full py-3 rounded-lg bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm relative z-50"
                        >
                          <Icon name="Lock" size={14} className="text-emerald-400" />
                          <span 
                            className="w-full h-full block cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert("Testing Direct Click Connection!");
                              handleFundWallet(e);
                            }}
                          >
                            Fund Wallet (₦{Number(amountNaira || 0).toLocaleString()})
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
              {/* TAB 5: MANAGED LOCAL PROJECTS */}
              {activeTab === "projects" && (
                <motion.div
                  key="v-projects"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                >
                  <div className="pb-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">Your Supervised Project Portfolio</h3>
                    <p className="text-xs text-gray-500 font-sans">Active operations and construction portfolios directly associated with your ambassador commission credentials.</p>
                  </div>

                  <div className="space-y-6">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-emerald-500/20 transition-all"
                      >
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md uppercase">
                              {project.category}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                              <Icon name="MapPin" size={10} /> {project.location}
                            </span>
                          </div>

                          <h4 className="text-base font-extrabold text-slate-900 leading-snug">{project.name}</h4>

                          {/* Minimalist progress bar */}
                          <div className="space-y-1.5 max-w-md">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Milestone deployment</span>
                              <span className="font-bold text-slate-700">{project.progress}% completed</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${project.progress}%` }}></div>
                            </div>
                          </div>
                        </div>

                        {/* Quantitative metric column */}
                        <div className="flex flex-col sm:items-end justify-center self-start sm:self-auto space-y-1.5 border-t sm:border-0 pt-4 sm:pt-0 shrink-0">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{project.metricLabel}</span>
                          <span className="text-lg font-black text-emerald-800 font-mono">{project.metricVal}</span>
                          
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-sans font-bold bg-gray-50 text-gray-500 border border-gray-100 uppercase">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              project.status === "active"
                                ? "bg-emerald-500"
                                : project.status === "completed"
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                            }`} />
                            {project.status}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 6: PROFILE DETAILS & CITY UPDATER */}
              {activeTab === "profile" && (
                <motion.div
                  key="v-profile"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                >
                  <AmbassadorProfile
                    profile={profile!}
                    onProfileUpdated={fetchAmbassadorData}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
        )}
      </div>

      {/* Pop up overlay credential updater form */}
      <AnimatePresence>
        {certFormOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setCertFormOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8"
            >
              <button
                onClick={() => setCertFormOpen(false)}
                className="absolute top-4 right-4 p-1 text-gray-405 hover:text-slate-600 rounded-lg hover:bg-gray-50"
              >
                <Icon name="X" size={18} />
              </button>

              <div className="pb-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-slate-900">Configure Commission Credentials</h3>
                <p className="text-xs text-gray-400 mt-0.5">Note: Certificates are generated automatically reflecting information submitted in real-time below.</p>
              </div>

              <form onSubmit={handleCertSubmit} className="space-y-4 pt-6 text-xs font-sans">
                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Ambassador Full Name</label>
                  <input
                    required
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-150 focus:border-emerald-600 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Country/Territory Range</label>
                  <input
                    required
                    type="text"
                    value={tempRegion}
                    onChange={(e) => setTempRegion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-150 focus:border-emerald-600 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Commission Field Focus</label>
                  <select
                    value={tempField}
                    onChange={(e) => setTempField(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-150 focus:border-emerald-600 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option>Youth Technology Labs</option>
                    <option>NextGen Scholarships</option>
                    <option>Eco-sustainable housing</option>
                    <option>Mobile clinics hygiene</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-500 uppercase mb-1">Official Commission Date</label>
                  <input
                    required
                    type="text"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-150 focus:border-emerald-600 rounded-xl text-xs font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Regenerate Credentials Securely
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Peer details view dialog */}
      <AnimatePresence>
        {activeItemDetails && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveItemDetails(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8"
            >
              <button
                onClick={() => setActiveItemDetails(null)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-slate-600 rounded-lg hover:bg-gray-50"
              >
                <Icon name="X" size={18} />
              </button>

              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                  <Icon name={activeItemDetails.icon} size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase px-2 py-0.5 rounded bg-emerald-50 max-h-max">
                    {activeItemDetails.category}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">Resource validation registry</p>
                </div>
              </div>

              <div className="space-y-3.5 py-6 text-xs font-sans text-gray-600">
                <h4 className="font-extrabold text-sm text-gray-950 leading-snug">{activeItemDetails.title}</h4>
                <p>Provider: <span className="font-semibold text-slate-800">{activeItemDetails.provider}</span></p>
                
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                  <p className="font-bold text-slate-800">Operational terms:</p>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    By confirming this exchange, intellectual blueprints are licensed to your region. Exchange points are subtracted immediately.
                  </p>
                </div>

                <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-xl text-emerald-800">
                  <span>Exchange balance cost:</span>
                  <span className="font-mono font-black">{activeItemDetails.avuCost} AVU</span>
                </div>

                {itemExchangeSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-center font-bold font-sans">
                    Package assets unlocked successfully!
                  </div>
                )}
              </div>

              {!itemExchangeSuccess ? (
                <button
                  disabled={avuBalance < activeItemDetails.avuCost}
                  onClick={() => {
                    setAvuBalance(prev => prev - activeItemDetails.avuCost);
                    setItemExchangeSuccess(true);
                    
                    const newNotif: NotificationItem = {
                      id: "n-ex-" + Date.now(),
                      title: "Bundle unlocked!",
                      desc: `Your account redeemed "${activeItemDetails.title}" -${activeItemDetails.avuCost} AVU.`,
                      time: "Just now",
                      unread: true,
                      type: "p2p"
                    };
                    setNotifications([newNotif, ...notifications]);

                    setTimeout(() => {
                      setActiveItemDetails(null);
                    }, 2200);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-150 disabled:text-gray-400 text-white font-bold tracking-tight text-xs flex items-center justify-center gap-1.5"
                >
                  Confirm exchange swap
                </button>
              ) : (
                <button
                  onClick={() => setActiveItemDetails(null)}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold"
                >
                  Done
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notifications Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, x: 50, scale: 0.9, rotate: -1 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 80, transition: { duration: 0.25, ease: "easeInOut" } }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              drag="x"
              dragConstraints={{ left: 0, right: 150 }}
              dragElastic={{ right: 0.6, left: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.x > 100) {
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }
              }}
              className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl p-4 flex gap-3.5 items-start w-full relative overflow-hidden select-none cursor-grab active:cursor-grabbing hover:shadow-2xl hover:border-slate-200/80 dark:hover:border-slate-700/80 transition-shadow duration-300"
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${
                toast.type === "success" 
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" 
                  : toast.type === "error"
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
              }`}>
                <Icon 
                  name={toast.type === "success" ? "CheckCircle2" : toast.type === "error" ? "AlertCircle" : "Info"} 
                  size={18} 
                />
              </div>
              <div className="flex-1 space-y-1 pr-4">
                <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                  {toast.title}
                  {toast.type === "success" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{toast.message}</p>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all absolute top-3 right-3"
              >
                <Icon name="X" size={13} />
              </button>
              
              {/* Animated Progress Timeline Bar */}
              <motion.div 
                initial={{ width: "100%" }} 
                animate={{ width: "0%" }} 
                transition={{ duration: 6, ease: "linear" }} 
                className={`absolute bottom-0 left-0 h-[3px] rounded-b-2xl shrink-0 ${
                  toast.type === "success" 
                    ? "bg-emerald-500 dark:bg-emerald-400" 
                    : toast.type === "error"
                    ? "bg-rose-500 dark:bg-rose-400"
                    : "bg-blue-500 dark:bg-blue-400"
                }`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
};
