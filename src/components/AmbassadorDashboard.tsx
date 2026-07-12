import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { db, DbAmbassador, isSupabaseConfigured, supabase } from "../lib/supabase";
import { convertNairaToAvu, initializePaystackTransaction, processPayment, initializePayment } from "../lib/paystack";
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
  { name: "Sat", stroke: 150, inbound: 220, totalFlow: 370 },
  { name: "Sun", outbound: 280, inbound: 310, totalFlow: 590 }
];

const hubFlowData = [
  { name: "Lagos", Received: 980, Dispatched: 640 },
  { name: "Mombasa", Received: 410, Dispatched: 580 },
  { name: "Nairobi", Received: 620, Dispatched: 830 },
  { name: "Accra", Received: 870, Dispatched: 520 },
  { name: "Kigali", Received: 350, Dispatched: 290 }
];

interface FundWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DbAmbassador | null;
  onSuccess: (newBalance: number) => void;
  showToast: (type: "success" | "error" | "info", title: string, message: string) => void;
  fetchAmbassadorData: () => void;
}

export const FundWalletModal: React.FC<FundWalletModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSuccess,
  showToast,
  fetchAmbassadorData
}) => {
  const [amountNaira, setAmountNaira] = useState("");
  const [fundingByName, setFundingByName] = useState("");
  const [fundingPhone, setFundingPhone] = useState("");
  const [programSponsored, setProgramSponsored] = useState("Youth Empowerment Initiative");
  const [isProcessing, setIsProcessing] = useState(false);

  const amt = parseFloat(amountNaira) || 0;
  const avuToEarn = convertNairaToAvu(amt);
  const email = profile?.email || "ambassador@domain.com";
  const currentAmbassadorId = profile?.id || "00000000-0000-0000-0000-000000000000";

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundingByName.trim()) {
      showToast("error", "Input Required", "Please enter the name of the person funding the project.");
      return;
    }
    if (!fundingPhone.trim()) {
      showToast("error", "Input Required", "Please enter a valid phone number.");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      showToast("error", "Invalid Amount", "Please enter a valid amount in Naira.");
      return;
    }

    setIsProcessing(true);
    showToast("info", "Initializing Transaction", `Preparing secure connection to Paystack checkout for ₦${amt.toLocaleString()}...`);

    try {
      const metadata = {
        custom_fields: [
          {
            display_name: "Ambassador ID",
            variable_name: "ambassador_id",
            value: currentAmbassadorId,
          },
          {
            display_name: "Funding By",
            variable_name: "funding_by_name",
            value: fundingByName,
          },
          {
            display_name: "Program Sponsored",
            variable_name: "program_sponsored",
            value: programSponsored,
          }
        ]
      };

      const paymentResult = await initializePayment(amt, email, metadata);
      const earnedAvu = paymentResult.avuEarned;

      try {
        if (supabase && isSupabaseConfigured) {
          await supabase.from("deposits").insert([{
            ambassador_id: currentAmbassadorId,
            funding_by_name: fundingByName,
            phone_number: fundingPhone,
            program_sponsored: programSponsored,
            amount_naira: amt,
            avu_earned: earnedAvu,
            paystack_reference: paymentResult.reference,
            status: "success"
          }]);
        }
        await db.createDeposit({
          ambassador_id: currentAmbassadorId,
          funding_by_name: fundingByName,
          phone_number: fundingPhone,
          program_sponsored: programSponsored,
          amount_naira: amt,
          avu_earned: earnedAvu,
          paystack_reference: paymentResult.reference,
          status: "success"
        });
      } catch (err) {
        console.error("Database registration failed or bypassed:", err);
      }

      const result = await db.processFundingSuccess(
        currentAmbassadorId,
        email,
        amt,
        earnedAvu,
        paymentResult.reference
      );

      if (result.success) {
        onSuccess(result.newBalance);
        showToast("success", "Payment Verified", `Successfully verified payment of ₦${amt.toLocaleString()} NGN via Paystack. Credited ${earnedAvu} AVU to your balance!`);
        setAmountNaira("");
        setFundingByName("");
        setFundingPhone("");
        fetchAmbassadorData();
        onClose();
      } else {
        showToast("error", "Verification Error", "Could not fully verify transaction in database, please contact support.");
      }
    } catch (paystackError: any) {
      console.warn("Paystack Inline failed or closed, launching simulated fallback:", paystackError);

      const simulatedConfirm = confirm(
        `[PAYSTACK GATEWAY DIALOGUE]\n\n` +
        `The Paystack checkout window was closed or bypassed.\n` +
        `Would you like to process this transaction using the high-fidelity simulated backup gateway for testing?`
      );

      if (simulatedConfirm) {
        const simulatedRef = `WAL-${Date.now()}`;
        setIsProcessing(true);
        try {
          try {
            if (supabase && isSupabaseConfigured) {
              await supabase.from("deposits").insert([{
                ambassador_id: currentAmbassadorId,
                funding_by_name: fundingByName,
                phone_number: fundingPhone,
                program_sponsored: programSponsored,
                amount_naira: amt,
                avu_earned: avuToEarn,
                paystack_reference: simulatedRef,
                status: "success"
              }]);
            }
            await db.createDeposit({
              ambassador_id: currentAmbassadorId,
              funding_by_name: fundingByName,
              phone_number: fundingPhone,
              program_sponsored: programSponsored,
              amount_naira: amt,
              avu_earned: avuToEarn,
              paystack_reference: simulatedRef,
              status: "success"
            });
          } catch (dbErr) {
            console.error("Database registration failed or bypassed:", dbErr);
          }

          const result = await db.processFundingSuccess(
            currentAmbassadorId,
            email,
            amt,
            avuToEarn,
            simulatedRef
          );

          if (result.success) {
            onSuccess(result.newBalance);
            showToast("success", "Payment Verified (Simulation)", `Successfully processed simulated payment of ₦${amt.toLocaleString()} NGN. Logged ${avuToEarn} AVU to your balance!`);
            setAmountNaira("");
            setFundingByName("");
            setFundingPhone("");
            fetchAmbassadorData();
            onClose();
          } else {
            showToast("error", "Verification Error", "Simulation completed but database update failed.");
          }
        } catch (err) {
          console.error("Error updating simulated success deposit", err);
          showToast("error", "Verification Error", "Simulation failed.");
        } finally {
          setIsProcessing(false);
        }
      } else {
        showToast("error", "Transaction Cancelled", "The Paystack transaction was cancelled by the user.");
        fetchAmbassadorData();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]"
        style={{ fontFamily: "'Roboto', sans-serif" }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-slate-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Icon name="X" size={18} />
        </button>

        <div className="flex items-center gap-3 pb-5 border-b border-slate-100 font-sans">
          <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon name="Wallet" size={24} />
          </div>
          <div>
            <h4 className="font-extrabold text-lg text-slate-900 uppercase tracking-wide">Wallet Funding Terminal</h4>
            <p className="text-xs text-slate-500">Fund your growth wallet to instantly accumulate AVU tokens securely.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Who is funding Project</label>
              <input
                required
                type="text"
                placeholder="Ambassador Name"
                value={fundingByName}
                onChange={(e) => setFundingByName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Phone Number</label>
              <input
                required
                type="tel"
                placeholder="+234..."
                value={fundingPhone}
                onChange={(e) => setFundingPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Programs to be Sponsored</label>
            <select
              required
              value={programSponsored}
              onChange={(e) => setProgramSponsored(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
            >
              <option value="Youth Empowerment Initiative">Youth Empowerment Initiative</option>
              <option value="Community Health Drive">Community Health Drive</option>
              <option value="Digital Literacy Accelerator">Digital Literacy Accelerator</option>
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Amount (₦)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₦</span>
                <input
                  required
                  type="number"
                  min="100"
                  placeholder="e.g. 50000"
                  value={amountNaira}
                  onChange={(e) => setAmountNaira(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">AVU to Receive</label>
              <input
                disabled
                type="text"
                value={`${convertNairaToAvu(Number(amountNaira || 0)).toFixed(3)} AVU`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-black text-emerald-800 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rate Ratio</p>
              <p className="text-xs text-slate-600 font-sans font-medium">1,000 Naira = <span className="font-bold text-emerald-700">1.002 AVU</span></p>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Icon name={isProcessing ? "Loader2" : "Lock"} size={14} className={`text-emerald-400 ${isProcessing ? "animate-spin" : ""}`} />
              <span>{isProcessing ? "Initializing..." : "Initialize Paystack Deposit"}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export const AmbassadorDashboard: React.FC<AmbassadorDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "certificate" | "p2p" | "payments" | "projects" | "profile" | "leaderboard">("overview");
  
  const [profile, setProfile] = useState<DbAmbassador | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const handleSignOut = () => {
    onLogout();
  };

  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editField, setEditField] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const [ambassadorName, setAmbassadorName] = useState("Ramon Bisola");
  const [ambassadorRegion, setAmbassadorRegion] = useState("Lagos, Nigeria");
  const [ambassadorField, setAmbassadorField] = useState("Youth Technology Labs");
  const [commissionDate, setCommissionDate] = useState("May 27, 2026");
  const [avuBalance, setAvuBalance] = useState(0);
  const [hasFunded, setHasFunded] = useState<boolean>(false);
  const [isFundWalletModalOpen, setIsFundWalletModalOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [p2pTxHistory, setP2pTxHistory] = useState<any[]>([]);
  const [dbAmbassadors, setDbAmbassadors] = useState<DbAmbassador[]>([]);

  const [toasts, setToasts] = useState<{ id: string; type: "success" | "error" | "info"; title: string; message: string }[]>([]);

  const showToast = (type: "success" | "error" | "info", title: string, message: string) => {
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const [totalDepositsNaira, setTotalDepositsNaira] = useState(0);

  const [leaderSearch, setLeaderSearch] = useState("");
  const [leaderRegionFilter, setLeaderRegionFilter] = useState("All");
  const [leaderDivisionFilter, setLeaderDivisionFilter] = useState("All");

  interface LeaderEntry {
    id: string;
    name: string;
    city: string;
    field: string;
    avu_balance: number;
    totalDeposits: number;
    projects: number;
    avatarBg: string;
    initials: string;
    isCurrentUser: boolean;
    points: number;
    level: number;
    rankTitle: string;
    badgeColor: string;
  }

  const baseMockLeaders = [
    { id: "AV-001", name: "Nia Tolani", city: "Nairobi, Kenya", field: "Mobile clinics hygiene", avu_balance: 1450, totalDeposits: 170000, projects: 4, avatarBg: "from-purple-500 to-indigo-600", initials: "NT", isCurrentUser: false },
    { id: "AV-002", name: "Kofi Mensah", city: "Accra, Ghana", field: "Youth Technology Labs", avu_balance: 1320, totalDeposits: 140000, projects: 3, avatarBg: "from-blue-500 to-teal-500", initials: "KM", isCurrentUser: false },
    { id: "AV-003", name: "Marie Diallo", city: "Kigali, Rwanda", field: "Eco-sustainable housing", avu_balance: 1210, totalDeposits: 120000, projects: 3, avatarBg: "from-emerald-500 to-emerald-700", initials: "MD", isCurrentUser: false },
    { id: "AV-004", name: "Amadi Chukwu", city: "Surulere, Nigeria", field: "Youth Technology Labs", avu_balance: 1100, totalDeposits: 90000, projects: 2, avatarBg: "from-orange-500 to-red-500", initials: "AC", isCurrentUser: false },
    { id: "AV-005", name: "Fatoumata Bâ", city: "Dakar, Senegal", field: "NextGen Scholarships", avu_balance: 1050, totalDeposits: 80000, projects: 2, avatarBg: "from-pink-500 to-rose-500", initials: "FB", isCurrentUser: false },
    { id: "AV-006", name: "Musa Hassan", city: "Mombasa, Kenya", field: "Eco-sustainable housing", avu_balance: 950, totalDeposits: 45000, projects: 2, avatarBg: "from-yellow-500 to-amber-600", initials: "MH", isCurrentUser: false },
    { id: "AV-007", name: "Grace Mwangi", city: "Nairobi, Kenya", field: "Mobile clinics hygiene", avu_balance: 820, totalDeposits: 20000, projects: 1, avatarBg: "from-teal-400 to-emerald-600", initials: "GM", isCurrentUser: false },
    { id: "AV-008", name: "Ezenwa Cole", city: "Lekki, Nigeria", field: "NextGen Scholarships", avu_balance: 750, totalDeposits: 10000, projects: 1, avatarBg: "from-indigo-400 to-purple-600", initials: "EC", isCurrentUser: false },
  ];

  const getBroadRegion = (city: string) => {
    const c = city.toLowerCase();
    if (c.includes("lagos") || c.includes("accra") || c.includes("dakar") || c.includes("nigeria") || c.includes("ghana") || c.includes("senegal") || c.includes("lekki") || c.includes("surulere")) {
      return "West Africa";
    }
    if (c.includes("nairobi") || c.includes("mombasa") || c.includes("kigali") || c.includes("kenya") || c.includes("rwanda")) {
      return "East Africa";
    }
    return "Other";
  };

  const getBroadDivision = (field: string) => {
    const f = field.toLowerCase();
    if (f.includes("tech") || f.includes("software") || f.includes("initiative")) {
      return "Technology";
    }
    if (f.includes("housing") || f.includes("sustainable") || f.includes("eco")) {
      return "Sustainability";
    }
    if (f.includes("clinic") || f.includes("hygiene") || f.includes("health")) {
      return "Healthcare";
    }
    return "Education & Other";
  };

  const currentUserEntry = {
    id: profile?.id || "AV-ME",
    name: profile?.name || ambassadorName,
    city: profile?.city || ambassadorRegion,
    field: profile?.field || ambassadorField,
    avu_balance: avuBalance,
    totalDeposits: totalDepositsNaira,
    projects: 3,
    avatarBg: "from-emerald-600 to-teal-700",
    initials: (profile?.name || ambassadorName).split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "RB",
    isCurrentUser: true,
  };

  const dbLeaders = dbAmbassadors
    .filter(a => a.id !== profile?.id && a.email?.toLowerCase() !== profile?.email?.toLowerCase())
    .map((a, idx) => {
      const colors = [
        "from-purple-500 to-indigo-600",
        "from-blue-500 to-teal-500",
        "from-emerald-500 to-emerald-700",
        "from-orange-500 to-red-500",
        "from-pink-500 to-rose-500",
        "from-yellow-500 to-amber-600"
      ];
      const avatarBg = colors[idx % colors.length];
      const initials = a.name ? a.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "AM";
      return {
        id: a.id || a.ambassador_id || `AV-DB-${idx}`,
        name: a.name,
        city: a.city || "Lagos, Nigeria",
        field: a.field || "Growth Ambassador",
        avu_balance: a.avu_balance || 0,
        totalDeposits: 0,
        projects: 2,
        avatarBg,
        initials,
        isCurrentUser: false,
      };
    });

  const allLeadersCombined = [
    currentUserEntry,
    ...dbLeaders,
    ...baseMockLeaders.filter(l => 
      l.id !== (profile?.id || "AV-ME") && 
      !dbLeaders.some(dl => dl.name.toLowerCase() === l.name.toLowerCase())
    )
  ];

  const getImpactPoints = (leader: any) => {
    const avuContribution = (leader.avu_balance || 0) * 10;
    const depositContribution = Math.floor((leader.totalDeposits || 0) / 100);
    const projectContribution = (leader.projects || 0) * 500;
    return avuContribution + depositContribution + projectContribution;
  };

  const processedLeaders: LeaderEntry[] = allLeadersCombined.map(l => {
    const points = getImpactPoints(l);
    
    let level = 1;
    let rankTitle = "Active Fellow";
    let badgeColor = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900";
    if (points >= 15000) {
      level = 5;
      rankTitle = "Sovereign Catalyst";
      badgeColor = "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/40 dark:text-purple-350 dark:border-purple-900";
    } else if (points >= 12000) {
      level = 4;
      rankTitle = "Regional Champion";
      badgeColor = "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-350 dark:border-blue-900";
    } else if (points >= 9000) {
      level = 3;
      rankTitle = "Impact Pioneer";
      badgeColor = "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-350 dark:border-emerald-900";
    } else if (points >= 6000) {
      level = 2;
      rankTitle = "Growth Vanguard";
      badgeColor = "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-850/40 dark:text-slate-300 dark:border-slate-800";
    }

    return {
      ...l,
      points,
      level,
      rankTitle,
      badgeColor
    };
  }).sort((a, b) => b.points - a.points);

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

  const fetchAmbassadorData = async () => {
    const sessionEmail = localStorage.getItem("advaltad_session_email") || "ramon@example.com";
    setIsLoadingProfile(true);
    try {
      let user = await db.findAmbassadorByEmail(sessionEmail);
      if (!user) {
        user = await db.createAmbassador({
          name: "Ramon Bisola",
          city: "Lagos, Nigeria",
          field: "Enriching African youths initiative",
          email: sessionEmail,
          phone: "+234 801 234 5678",
          password: "password123"
        });
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

      if (user.created_at) {
        const d = new Date(user.created_at);
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        setCommissionDate(d.toLocaleDateString('en-US', options));
      }

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

      if (user) {
        try {
          const list = await db.getP2PTransactions(user.id);
          setP2pTxHistory(list);
        } catch (p2pErr) {
          console.warn("Failed to load P2P transactions:", p2pErr);
        }
      }

      try {
        const allAmbs = await db.getAmbassadors();
        setDbAmbassadors(allAmbs || []);
      } catch (ambErr) {
        console.warn("Failed to load registered ambassadors list:", ambErr);
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
            const localSessionEmail = localStorage.getItem("advaltad_session_email");
            if (!localSessionEmail) {
              localStorage.removeItem("advaltad_session_email");
              onLogout();
              window.location.href = "/";
              return;
            }
          }
        } catch (err) {
          console.error("Error verifying authenticated user via Supabase:", err);
          const localSessionEmail = localStorage.getItem("advaltad_session_email");
          if (!localSessionEmail) {
            localStorage.removeItem("advaltad_session_email");
            onLogout();
            window.location.href = "/";
            return;
          }
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

    const ambassadorChannel = supabase
      .channel(`public:ambassadors:id=${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ambassadors",
          filter: `id=eq.${profile.id}`
        },
        (payload: any) => {
          const newRecord = payload.new || {};
          if (newRecord) {
            if (newRecord.avu_balance !== undefined) {
              setAvuBalance(newRecord.avu_balance);
            }
            setProfile((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                ...newRecord,
                avu_balance: newRecord.avu_balance !== undefined ? newRecord.avu_balance : prev.avu_balance,
                badge_status: newRecord.badge_status !== undefined ? newRecord.badge_status : (newRecord.status || prev.badge_status || prev.status)
              };
            });
          }
          fetchAmbassadorData();
        }
      )
      .subscribe();

    const depositsChannel = supabase
      .channel(`public:deposits:ambassador_id=${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deposits",
          filter: `ambassador_id=eq.${profile.id}`
        },
        (payload) => {
          fetchAmbassadorData();
        }
      )
      .subscribe();

    const walletChannel = supabase
      .channel(`public:ambassador_wallet:ambassador_id=${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ambassador_wallet",
          filter: `ambassador_id=eq.${profile.id}`
        },
        (payload) => {
          fetchAmbassadorData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ambassadorChannel);
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(walletChannel);
    };
  }, [profile]);

  const [certFormOpen, setCertFormOpen] = useState(false);
  const [tempName, setTempName] = useState(ambassadorName);
  const [tempRegion, setTempRegion] = useState(ambassadorRegion);
  const [tempField, setTempField] = useState(ambassadorField);
  const [tempDate, setTempDate] = useState(commissionDate);
  const [downloadingCert, setDownloadingCert] = useState(false);

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

  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [p2pType, setP2pType] = useState<"send" | "request" | "analytics">("send");

  const [donationLinkText, setDonationLinkText] = useState("https://advaltad.org/campaign/ramon-youth-labs");
  const [campaignTitle, setCampaignTitle] = useState("Support Ramon's TechHub");
  const [campaignGenerated, setCampaignGenerated] = useState(false);

  const [termAmount, setTermAmount] = useState("");
  const [termDonorName, setTermDonorName] = useState("");
  const [termDonorEmail, setTermDonorEmail] = useState("");
  const [termStatus, setTermStatus] = useState<"idle" | "submitting" | "completed">("idle");

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

  const [exchangeItems, setExchangeItems] = useState<ExchangeListing[]>([
    { id: "e-1", title: "Eco-Adobe Brick Compressor blueprints", provider: "Grace (Mombasa)", avuCost: 150, category: "hardware", icon: "Home" },
    { id: "e-2", title: "NextGen Tech Curriculum (React/Figma Spec)", provider: "Advaltad HQ", avuCost: 0, category: "educational", icon: "GraduationCap" },
    { id: "e-3", title: "Premium CAD/GIS Architectural Account Access", provider: "Kofi (Accra)", avuCost: 400, category: "software", icon: "Cpu" },
    { id: "e-4", title: "1-on-1 Grant Writing Mentorship (60 mins)", provider: "Nia (Nairobi NGO Lead)", avuCost: 200, category: "mentorship", icon: "Compass" }
  ]);

  const [activeItemDetails, setActiveItemDetails] = useState<ExchangeListing | null>(null);
  const [itemExchangeSuccess, setItemExchangeSuccess] = useState(false);

  const handleCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmbassadorName(tempName);
    setAmbassadorRegion(tempRegion);
    setAmbassadorField(tempField);
    setCommissionDate(tempDate);
    setCertFormOpen(false);

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
        setEditName(tempName);
        setEditCity(tempRegion);
        setEditField(tempField);
      } catch (err) {
        console.error("Failed to sync certificate update with profile database:", err);
      }
    }

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
      
      setAmbassadorName(editName);
      setAmbassadorRegion(editCity);
      setAmbassadorField(editField);
      
      setTempName(editName);
      setTempRegion(editCity);
      setTempField(editField);

      await fetchAmbassadorData();
      
      setUpdateSuccess(true);
      
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
    if (!transferTargetId || isNaN(amt) || amt <= 0) {
      showToast("error", "Invalid Transfer", "Please specify a valid recipient email/ID and transfer amount.");
      return;
    }

    if (!profile?.id) {
      showToast("error", "Session Error", "Could not locate your active ambassador session.");
      return;
    }

    if (amt > avuBalance) {
      showToast("error", "Insufficient Balance", `You only have ${avuBalance} AVU points available.`);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await db.executeP2PTransfer(
        profile.id,
        transferTargetId,
        amt,
        transferReason || "Peer technical support"
      );

      if (res.success && res.senderNewBalance !== undefined) {
        setAvuBalance(res.senderNewBalance);
        if (profile) {
          setProfile(prev => prev ? { ...prev, avu_balance: res.senderNewBalance } : null);
        }
        
        showToast("success", "Transfer Completed", res.message);
        setTransferSuccess(true);

        const newNotif: NotificationItem = {
          id: "n-p2p-" + Date.now(),
          title: "AVU Transfer Sent",
          desc: `You transferred ${amt} AVU to ${res.recipientName || "Fellow Ambassador"}.`,
          time: "Just now",
          unread: true,
          type: "p2p"
        };
        setNotifications(prev => [newNotif, ...prev]);

        try {
          const list = await db.getP2PTransactions(profile.id);
          setP2pTxHistory(list);
        } catch (err) {
          console.warn("Failed to reload P2P transactions history:", err);
        }

        setTimeout(() => {
          setTransferSuccess(false);
          setTransferAmount("");
          setTransferTargetId("");
          setTransferReason("");
        }, 4000);
      } else {
        showToast("error", "Transfer Failed", res.message || "An unexpected error occurred.");
      }
    } catch (err) {
      console.error("Failed to complete P2P transfer:", err);
      showToast("error", "Transfer Error", "An error occurred while processing the value transfer. Please try again.");
    } finally {
      setIsProcessing(false);
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
            <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                P
              </div>
              <div className="text-left leading-none">
                <span className="block text-[9px] uppercase font-bold text-gray-400">AVU Balance</span>
                <span className="text-xs font-black text-emerald-800 font-mono tracking-tight">{avuBalance} AVU</span>
              </div>
            </div>

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
          
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3">
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
              id="tab-leaderboard"
              onClick={() => setActiveTab("leaderboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-left transition-all cursor-pointer ${
                activeTab === "leaderboard"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                  : "bg-white hover:bg-gray-100/50 text-gray-700 border border-gray-100"
              }`}
            >
              <Icon name="Trophy" size={16} className={activeTab === "leaderboard" ? "text-amber-200" : "text-amber-500"} />
              <span className="flex items-center gap-1.5 w-full justify-between">
                <span>Top Leaders</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">RANKING</span>
              </span>
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
          </div>

          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              
              {activeTab === "overview" && (
                <motion.div
                  key="v-overview"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                >
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

                  <motion.div variants={containerVariants} className="grid md:grid-cols-12 gap-6 items-start">
                    
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

                      <div className="relative h-60 bg-gradient-to-br from-emerald-900 to-slate-900 rounded-2xl overflow-hidden flex items-center justify-center text-white">
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

                  <motion.div
                    variants={itemVariants}
                    className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white shadow-xl border border-emerald-500/20 space-y-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-max">
                          <Icon name="Trophy" size={10} className="text-amber-400" />
                          Ambassador Arena
                        </span>
                        <h3 className="text-lg font-bold tracking-tight">Community Contribution Spotlight</h3>
                        <p className="text-xs text-gray-300 font-sans leading-normal">
                          High-performing fellows directing field resources and creating certified regional growth.
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveTab("leaderboard")}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer self-start md:self-auto"
                      >
                        <Icon name="Trophy" size={13} />
                        <span>View Full Leaderboard</span>
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4 relative z-10">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shrink-0">
                          👑 1st
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-xs truncate">Nia Tolani</p>
                          <p className="text-[10px] text-gray-400 truncate">Nairobi • 16,200 pts</p>
                          <span className="text-[9px] font-bold text-amber-400">Sovereign Catalyst</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-300 to-gray-500 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shrink-0">
                          🥈 2nd
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-xs truncate">Kofi Mensah</p>
                          <p className="text-[10px] text-gray-400 truncate font-sans">Accra • 14,800 pts</p>
                          <span className="text-[9px] font-bold text-gray-300">Regional Champion</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 relative">
                        <div className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                        
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0 border border-emerald-400">
                          ⚡ YOU
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-xs truncate">{ambassadorName || "Ramon Bisola"}</p>
                          <p className="text-[10px] text-emerald-300 font-mono font-bold truncate">
                            {((avuBalance * 10) + Math.floor(totalDepositsNaira / 100) + 1500).toLocaleString()} PTS
                          </p>
                          <span className="text-[9px] font-bold text-emerald-400">
                            {((avuBalance * 10) + Math.floor(totalDepositsNaira / 100) + 1500) >= 15000 
                              ? "👑 Sovereign Catalyst" 
                              : "🏆 Regional Champion"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3 relative z-10 font-sans">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-gray-200">Your Leaderboard Standing: Rank #3 Overall</p>
                          <p className="text-[10px] text-gray-400">
                            You are currently trailing <span className="text-white font-bold">Kofi Mensah</span> by only <span className="text-emerald-400 font-bold font-mono">{Math.max(0, 14800 - ((avuBalance * 10) + Math.floor(totalDepositsNaira / 100) + 1500)).toLocaleString()} points</span>!
                          </p>
                        </div>
                        
                        <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                          NEXT TIER: 14,800 PTS
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" 
                            style={{ 
                              width: `${Math.min(100, (((avuBalance * 10) + Math.floor(totalDepositsNaira / 100) + 1500) / 14800) * 100)}%` 
                            }} 
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-400">
                          <span>{((avuBalance * 10) + Math.floor(totalDepositsNaira / 100) + 1500).toLocaleString()} PTS</span>
                          <span>14,800 PTS</span>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-gray-300 leading-normal flex items-center gap-1">
                        <Icon name="Sparkles" size={10} className="text-amber-400 shrink-0" />
                        <span>Tip: Fund your wallet or complete active milestones in the Leaderboard tab to gain massive point boosts instantly!</span>
                      </p>
                    </div>

                  </motion.div>
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

                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left mt-2 shadow-sm">
                      <div className="space-y-0.5">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-emerald-200">Advaltad Fellowship Motto</p>
                        <p className="font-serif italic text-sm text-slate-100">"Together, we grow. Together, we create lasting impact."</p>
                      </div>
                      <button 
                        onClick={() => setIsFundWalletModalOpen(true)}
                        className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-emerald-800 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95 cursor-pointer shrink-0"
                      >
                        <Icon name="Coins" size={14} />
                        <span>Fund Wallet & Earn AVU</span>
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* TAB 2: FELLOWSHIP CERTIFICATE - RETOUCHED DESIGN ONLY */}
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
                      <h3 className="text-xl font-bold text-gray-900 tracking-tight">Fellowship Commission Credentials</h3>
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

                  {/* PREMIUM RETOUCHED CERTIFICATE GRID LAYOUT */}
                  <div 
                    id="credentials-badge-vector" 
                    className="relative max-w-4xl mx-auto rounded-3xl p-1 bg-gradient-to-br from-amber-200 via-emerald-800 to-emerald-950 shadow-2xl overflow-hidden"
                  >
                    {/* Architectural Grid Watermark Pattern */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
                    
                    {/* Radial Backlight Ambient Glow */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(252,211,77,0.15)_0%,transparent_70%)]" />

                    {/* Outer Deep Border Margin Shield */}
                    <div className="rounded-[22px] bg-slate-900 p-3 sm:p-5 h-full w-full">
                      
                      {/* Dual Fine-Line Security Filigree Framework */}
                      <div className="relative rounded-[18px] bg-white border border-amber-200/60 p-6 sm:p-14 md:p-16 overflow-hidden">
                        
                        {/* Internal Corner Accents Decoration */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-900/30 rounded-tl-sm pointer-events-none" />
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-900/30 rounded-tr-sm pointer-events-none" />
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-900/30 rounded-bl-sm pointer-events-none" />
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-900/30 rounded-br-sm pointer-events-none" />

                        {/* Certificate Branding Headers */}
                        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                          <div className="relative group">
                            <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md transition-all group-hover:blur-lg" />
                            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white border-2 border-emerald-900 p-0.5 shadow-xl">
                              <img
                                src={logoUrl}
                                alt="Advaltad Foundation Logo"
                                className="w-full h-full object-cover rounded-full"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <h2 className="text-xs sm:text-sm font-sans font-black uppercase tracking-[0.25em] text-emerald-950">
                              Advaltad Foundation
                            </h2>
                            <p className="text-[9px] sm:text-10px font-mono uppercase tracking-[0.3em] text-amber-600 font-extrabold">
                              Global Fellowship Commission Registry
                            </p>
                          </div>
                        </div>

                        {/* Central Statement & Core Typography */}
                        <div className="relative z-10 text-center space-y-6 my-10 max-w-2xl mx-auto">
                          <div className="space-y-2">
                            <p className="text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-slate-400 italic">
                              This foundational credential verifies that
                            </p>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-slate-900 py-1 drop-shadow-sm">
                              {ambassadorName}
                            </h1>
                          </div>
                          
                          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto" />

                          <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-xl mx-auto leading-relaxed font-light">
                            has been formally authorized as a certified global <span className="font-semibold text-emerald-950">Fellow and Sovereign Trustee</span>, empowered to initiate regional resource networks, allocate computational assets, and oversee sustainable field programs under the division of:
                          </p>

                          {/* Refined Division Focus Badge Component */}
                          <div className="relative max-w-max mx-auto mt-2">
                            <div className="absolute inset-0 bg-emerald-600/5 blur-sm rounded-xl" />
                            <div className="relative px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-900 to-emerald-950 text-amber-300 font-mono font-black text-xs tracking-wider uppercase border border-amber-400/30 shadow-lg">
                              {ambassadorField}
                            </div>
                          </div>
                        </div>

                        {/* Attestation Geographic Context */}
                        <p className="relative z-10 text-center text-xs text-slate-500 font-sans max-w-md mx-auto leading-normal">
                          Granted operations commission within the <span className="font-semibold text-slate-800 border-b border-dotted border-slate-300 pb-0.5">{ambassadorRegion}</span> grid corridor, binding execution protocols to standard ledger transparency workflows.
                        </p>

                        {/* Signatures & Execution Blocks */}
                        <div className="relative z-10 grid grid-cols-2 gap-12 sm:gap-24 pt-12 mt-10 border-t border-slate-100 font-sans text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <span className="font-serif italic text-emerald-900 text-base font-bold tracking-wide">
                              Oluwaseun Adewole
                            </span>
                            <div className="w-28 h-px bg-gradient-to-r from-transparent via-slate-350 to-transparent" />
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
                              Executive Director
                            </span>
                          </div>

                          <div className="flex flex-col items-center space-y-2">
                            <span className="text-xs font-mono font-black text-emerald-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/80 shadow-inner">
                              {commissionDate.toUpperCase()}
                            </span>
                            <div className="w-28 h-px bg-gradient-to-r from-transparent via-slate-350 to-transparent" />
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
                              Commission Date
                            </span>
                          </div>
                        </div>

                        {/* Micro Cryptographic Verification Trackers */}
                        <div className="relative z-10 mt-12 pt-5 border-t border-slate-100/60 flex flex-col md:flex-row items-center justify-between gap-3 text-[9px] font-mono text-slate-400/80 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>NODE IDENTIFIER: ADVALTAD_FELLOW_SECURE_SHA256_F{Math.floor(Math.random() * 888 + 111)}X</span>
                          </div>
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-500 text-[8px]">
                            COMPLIANCE STATUS: VERIFIED BY SOURCE LEDGER
                          </span>
                        </div>

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
                                  <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Recipient Email or Ambassador ID</label>
                                  <input
                                    id="p2p-target-id"
                                    type="text"
                                    required
                                    placeholder="e.g. peer@advaltad.org or AV-10001"
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
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="md:col-span-4 p-5 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-4">
                      <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Exchange History Ledger</h4>
                      <div className="divide-y divide-gray-50 max-h-[340px] overflow-y-auto">
                        {p2pTxHistory.length === 0 ? (
                          <div className="py-8 text-center text-xs text-gray-400 font-sans">
                            No peer transactions logged on this local node profile yet.
                          </div>
                        ) : (
                          p2pTxHistory.map((tx, index) => (
                            <div key={tx.id || index} className="py-3 flex flex-col gap-1 text-xs">
                              <div className="flex justify-between font-bold">
                                <span className={tx.sender_id === profile?.id ? "text-rose-600" : "text-emerald-600"}>
                                  {tx.sender_id === profile?.id ? "Outbound Transfer" : "Inbound Deposit"}
                                </span>
                                <span className="font-mono">{tx.amount} AVU</span>
                              </div>
                              <p className="text-[11px] text-gray-500 line-clamp-2">{tx.reason}</p>
                              <span className="text-[9px] text-gray-400 font-mono mt-0.5">Ref: {tx.id?.substring(0,8)}...</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
        )}
      </div>

      <AnimatePresence>
        {certFormOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setCertFormOpen(false)}
              className="absolute inset-0 bg-black backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl p-6 space-y-4"
            >
              <h4 className="font-black text-sm uppercase text-gray-900 tracking-wider">Customize Commission Badge</h4>
              <form onSubmit={handleCertSubmit} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-gray-500 uppercase font-bold mb-1">Ambassador Name</label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 uppercase font-bold mb-1">Operations City</label>
                  <input
                    type="text"
                    value={tempRegion}
                    onChange={(e) => setTempRegion(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 uppercase font-bold mb-1">Supervised Division Segment</label>
                  <input
                    type="text"
                    value={tempField}
                    onChange={(e) => setTempField(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 uppercase font-bold mb-1">Commission Date</label>
                  <input
                    type="text"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCertFormOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Regenerate Frame
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFundWalletModalOpen && (
          <FundWalletModal
            isOpen={isFundWalletModalOpen}
            onClose={() => setIsFundWalletModalOpen(false)}
            profile={profile}
            onSuccess={(newBalance) => setAvuBalance(newBalance)}
            showToast={showToast}
            fetchAmbassadorData={fetchAmbassadorData}
          />
        )}
      </AnimatePresence>

    </div>
  );
};