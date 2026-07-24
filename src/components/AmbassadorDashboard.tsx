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

  // Early return is safe here because all hooks are called unconditionally above!
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

      // 1. Process Paystack inline checkout using the exported helper
      const paymentResult = await initializePayment(amt, email, metadata);
      const earnedAvu = paymentResult.avuEarned;

      // 2. Initial Transaction Registration to Supabase directly and local DB
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

      // 3. Process database update to update avu_balance and wallet balances
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

      // Try simulation fallback as a resilient testing option for iframe environments
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
  const [avuBalance, setAvuBalance] = useState(0);
  const [hasFunded, setHasFunded] = useState<boolean>(false);
  const [isFundWalletModalOpen, setIsFundWalletModalOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [p2pTxHistory, setP2pTxHistory] = useState<any[]>([]);
  const [dbAmbassadors, setDbAmbassadors] = useState<DbAmbassador[]>([]);

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
  const [totalDepositsNaira, setTotalDepositsNaira] = useState(0);

  // Leaderboard filters
  const [leaderSearch, setLeaderSearch] = useState("");
  const [leaderRegionFilter, setLeaderRegionFilter] = useState("All");
  const [leaderDivisionFilter, setLeaderDivisionFilter] = useState("All");

  // Leaderboard Entry TypeScript contract
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

  // Preset list of high-performing mock ambassadors across Africa
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

  // Helper to get region group for filters
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

  // Helper to get division group for filters
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

  // Dynamically calculate current logged in user's entry and scores
  const currentUserEntry = {
    id: profile?.id || "AV-ME",
    name: profile?.name || ambassadorName,
    city: profile?.city || ambassadorRegion,
    field: profile?.field || ambassadorField,
    avu_balance: avuBalance,
    totalDeposits: totalDepositsNaira,
    projects: 3, // 3 supervised deployments
    avatarBg: "from-emerald-600 to-teal-700",
    initials: (profile?.name || ambassadorName).split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "RB",
    isCurrentUser: true,
  };

  // Map dbAmbassadors + mock leaders to LeaderEntries
  const mockDbLeaders: DbAmbassador[] = baseMockLeaders.map((m) => ({
    id: m.id,
    user_id: m.id,
    ambassador_id: m.id,
    name: m.name,
    email: `${m.name.toLowerCase().replace(/\s+/g, ".")}@advaltad.org`,
    phone: "+2348000000000",
    city: m.city,
    field: m.field,
    avu_balance: m.avu_balance,
    status: "approved",
    badge_status: "approved",
    created_at: new Date().toISOString()
  }));

  const combinedAllAmbassadors = [...dbAmbassadors];
  for (const mock of mockDbLeaders) {
    const exists = combinedAllAmbassadors.some(
      a =>
        a.id.toLowerCase() === mock.id.toLowerCase() ||
        a.email.toLowerCase() === mock.email.toLowerCase() ||
        (a.ambassador_id && a.ambassador_id.toLowerCase() === mock.id.toLowerCase())
    );
    if (!exists) {
      combinedAllAmbassadors.push(mock);
    }
  }

  const approvedOtherAmbassadors = combinedAllAmbassadors.filter(
    (amb) =>
      amb.id !== profile?.id &&
      amb.email?.toLowerCase() !== profile?.email?.toLowerCase()
  );

  const filteredCandidateAmbassadors = approvedOtherAmbassadors.filter((amb) => {
    if (!recipientSearchQuery.trim()) return true;
    const q = recipientSearchQuery.toLowerCase().trim();
    const ambId = (amb.ambassador_id || amb.user_id || amb.id || "").toLowerCase();
    const name = (amb.name || "").toLowerCase();
    const email = (amb.email || "").toLowerCase();
    const city = (amb.city || "").toLowerCase();
    const field = (amb.field || "").toLowerCase();
    return name.includes(q) || ambId.includes(q) || email.includes(q) || city.includes(q) || field.includes(q);
  });

  const selectedRecipient = approvedOtherAmbassadors.find((amb) => {
    const ambId = amb.ambassador_id || amb.user_id || amb.id;
    return (
      ambId === transferTargetId ||
      amb.id === transferTargetId ||
      (amb.email && amb.email.toLowerCase() === transferTargetId.toLowerCase())
    );
  });

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

  // Compile full leader list - wiped clean of mock leaders and only populates if avu_balance > 0
  const activeDbLeaders = dbLeaders.filter(l => (l.avu_balance || 0) > 0);
  const allLeadersCombined = [];
  if ((currentUserEntry.avu_balance || 0) > 0) {
    allLeadersCombined.push(currentUserEntry);
  }
  allLeadersCombined.push(...activeDbLeaders);

  // Point scoring formula:
  // Points = (avu_balance * 10) + Math.floor(totalDeposits / 100) + (projects_count * 500)
  const getImpactPoints = (leader: any) => {
    const avuContribution = (leader.avu_balance || 0) * 10;
    const depositContribution = Math.floor((leader.totalDeposits || 0) / 100);
    const projectContribution = (leader.projects || 0) * 500;
    return avuContribution + depositContribution + projectContribution;
  };

  // Map to detailed leader object with calculated scores and rank badges
  const processedLeaders: LeaderEntry[] = allLeadersCombined.map(l => {
    const points = getImpactPoints(l);
    
    // Assign Rank Titles based on Points
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
  }).sort((a, b) => b.points - a.points); // Sort high to low

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

      // Fetch P2P Transactions History
      if (user) {
        try {
          const list = await db.getP2PTransactions(user.id);
          setP2pTxHistory(list);
        } catch (p2pErr) {
          console.warn("Failed to load P2P transactions:", p2pErr);
        }
      }

      // Fetch all registered ambassadors
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
            console.warn("No authenticated user exists in Supabase Auth, but checking local session email as fallback...");
            const localSessionEmail = localStorage.getItem("advaltad_session_email");
            if (!localSessionEmail) {
              console.error("No active local session. Force logout.");
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

    const rowId = profile.db_id || profile.id;

    // 1. Subscribe to updates in public.ambassadors table using the exact primary key UUID
    const ambassadorChannel = supabase
      .channel(`public:ambassadors:id=${rowId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ambassadors",
          filter: `id=eq.${rowId}`
        },
        (payload: any) => {
          console.log("Realtime status/balance change detected! Payload:", payload);
          const newRecord = payload.new || {};
          
          if (newRecord) {
            // Immediately update the local UI states to reflect change in avu_balance or status
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

          // Fetch full data in background to synchronize other dashboard statistics
          fetchAmbassadorData();
        }
      )
      .subscribe();

    // 2. Subscribe to inserts/updates in public.deposits table for transactions
    // Since deposits may use profile.id (user_id) or rowId, let's listen to both if they are different
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
          console.log("Realtime deposit transaction change detected! Payload:", payload);
          fetchAmbassadorData();
        }
      )
      .subscribe();

    // 3. Subscribe to changes in public.ambassador_wallet table for balance updates (uses ambassadors row ID)
    const walletChannel = supabase
      .channel(`public:ambassador_wallet:ambassador_id=${rowId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ambassador_wallet",
          filter: `ambassador_id=eq.${rowId}`
        },
        (payload) => {
          console.log("Realtime ambassador wallet change detected! Payload:", payload);
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
  const [showTransferConfirmModal, setShowTransferConfirmModal] = useState(false);

  // Searchable Recipient Combobox state
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
  const recipientComboboxRef = useRef<HTMLDivElement>(null);

  // Close combobox when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (recipientComboboxRef.current && !recipientComboboxRef.current.contains(event.target as Node)) {
        setIsRecipientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleP2PTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(transferAmount);
    if (!transferTargetId || isNaN(amt) || amt <= 0) {
      showToast("error", "Invalid Transfer", "Please select a valid recipient ambassador and enter a positive transfer amount.");
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

    // Open confirmation modal before proceeding
    setShowTransferConfirmModal(true);
  };

  const confirmExecuteTransfer = async () => {
    const amt = parseInt(transferAmount);
    if (!transferTargetId || isNaN(amt) || amt <= 0 || !profile?.id) return;

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
        
        // Update recipient balance in dbAmbassadors state immediately
        setDbAmbassadors(prev => prev.map(a => {
          const matchTarget = 
            a.id.toLowerCase() === transferTargetId.toLowerCase() ||
            (a.email && a.email.toLowerCase() === transferTargetId.toLowerCase()) ||
            (a.user_id && a.user_id.toLowerCase() === transferTargetId.toLowerCase()) ||
            (a.ambassador_id && a.ambassador_id.toLowerCase() === transferTargetId.toLowerCase());
          if (matchTarget) {
            return { ...a, avu_balance: (a.avu_balance || 0) + amt };
          }
          if (a.id === profile?.id || (a.email && a.email.toLowerCase() === profile?.email?.toLowerCase())) {
            return { ...a, avu_balance: res.senderNewBalance };
          }
          return a;
        }));

        showToast("success", "Transfer Completed", res.message);
        setTransferSuccess(true);

        const newNotif: NotificationItem = {
          id: "n-p2p-" + Date.now(),
          title: "AVU Transfer Sent",
          desc: `You transferred ${amt} AVU to ${res.recipientName || selectedRecipient?.name || "Fellow Ambassador"}.`,
          time: "Just now",
          unread: true,
          type: "p2p"
        };
        setNotifications(prev => [newNotif, ...prev]);

        // Refresh transactions list & ambassadors list
        try {
          const list = await db.getP2PTransactions(profile.id);
          setP2pTxHistory(list);
          const freshAmbs = await db.getAmbassadors();
          setDbAmbassadors(freshAmbs || []);
        } catch (err) {
          console.warn("Failed to reload P2P data:", err);
        }

        setShowTransferConfirmModal(false);
        setTransferTargetId("");
        setTransferAmount("");
        setTransferReason("");
        setRecipientSearchQuery("");

        setTimeout(() => {
          setTransferSuccess(false);
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
      
      {/* Upper sub-header bar for profile info and notifications */}
      <div className="bg-white border-b border-gray-200 py-4 shadow-sm relative z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-serif font-black text-xl">
              {ambassadorName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight text-gray-900">{ambassadorName}</h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-mono font-bold tracking-wider shadow-sm">
                    {profile?.ambassador_id || profile?.user_id || profile?.id || "AV-PENDING"}
                  </span>
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

                  {/* Gamified Leaderboard Spotlight & Progress Meter */}
                  <motion.div
                    variants={itemVariants}
                    className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white shadow-xl border border-emerald-500/20 space-y-6 relative overflow-hidden"
                  >
                    {/* Visual glowing overlay circles */}
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

                    {/* Miniature top ranks visual row */}
                    <div className="grid sm:grid-cols-3 gap-4 relative z-10">
                      {/* Top 1 */}
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

                      {/* Top 2 */}
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

                      {/* User Current Live Standing */}
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

                    {/* Progress tracking gauge */}
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

                      {/* Progress bar */}
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
                          Advaltad Foundation
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
                                <div className="relative" ref={recipientComboboxRef}>
                                  <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1">Recipient Ambassador</label>
                                  
                                  {selectedRecipient ? (
                                    <div className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-gray-900 shadow-2xs transition-all">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                                          {selectedRecipient.name ? selectedRecipient.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "AV"}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span className="font-bold text-xs text-gray-900 truncate">{selectedRecipient.name}</span>
                                            <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 flex-shrink-0">
                                              {selectedRecipient.ambassador_id || selectedRecipient.user_id || selectedRecipient.id}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-gray-500 flex items-center gap-1.5 truncate mt-0.5">
                                            <span className="truncate">{selectedRecipient.city || selectedRecipient.field || "Growth Ambassador"}</span>
                                            <span className="text-emerald-700 font-bold font-mono flex-shrink-0">• {selectedRecipient.avu_balance || 0} AVU</span>
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTransferTargetId("");
                                          setRecipientSearchQuery("");
                                          setIsRecipientDropdownOpen(true);
                                        }}
                                        className="ml-2 px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-emerald-700 hover:border-emerald-300 text-[10px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                                      >
                                        <Icon name="RotateCcw" size={11} />
                                        <span>Change</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <div className="relative flex items-center">
                                        <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                                          <Icon name="Search" size={15} />
                                        </div>
                                        <input
                                          id="p2p-target-id"
                                          type="text"
                                          placeholder="Search or select ambassador by name, ID, city..."
                                          value={recipientSearchQuery}
                                          onFocus={() => setIsRecipientDropdownOpen(true)}
                                          onChange={(e) => {
                                            setRecipientSearchQuery(e.target.value);
                                            setIsRecipientDropdownOpen(true);
                                          }}
                                          className="w-full pl-10 pr-9 py-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setIsRecipientDropdownOpen(!isRecipientDropdownOpen)}
                                          className="absolute right-2.5 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                                        >
                                          <Icon name={isRecipientDropdownOpen ? "ChevronUp" : "ChevronDown"} size={16} />
                                        </button>
                                      </div>

                                      <AnimatePresence>
                                        {isRecipientDropdownOpen && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-50"
                                          >
                                            {filteredCandidateAmbassadors.length === 0 ? (
                                              <div className="p-4 text-center text-xs text-gray-400">
                                                No ambassadors found matching "{recipientSearchQuery}"
                                              </div>
                                            ) : (
                                              filteredCandidateAmbassadors.map((amb) => {
                                                const ambId = amb.ambassador_id || amb.user_id || amb.id;
                                                const initials = amb.name ? amb.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "AM";
                                                return (
                                                  <button
                                                    key={amb.id || ambId}
                                                    type="button"
                                                    onClick={() => {
                                                      setTransferTargetId(ambId);
                                                      setIsRecipientDropdownOpen(false);
                                                      setRecipientSearchQuery("");
                                                    }}
                                                    className="w-full p-2.5 px-3.5 text-left flex items-center justify-between hover:bg-emerald-50/80 transition-colors cursor-pointer group"
                                                  >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                                        {initials}
                                                      </div>
                                                      <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 truncate">
                                                          <span className="font-bold text-xs text-gray-900 group-hover:text-emerald-900 truncate">{amb.name}</span>
                                                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-gray-100 group-hover:bg-emerald-100 text-gray-700 group-hover:text-emerald-800 flex-shrink-0">
                                                            {ambId}
                                                          </span>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 truncate">{amb.city || amb.field || "Growth Ambassador"}</p>
                                                      </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 pl-2">
                                                      <span className="text-xs font-mono font-bold text-emerald-600 group-hover:text-emerald-700">
                                                        {amb.avu_balance || 0} AVU
                                                      </span>
                                                      <p className="text-[9px] text-gray-400">Wallet</p>
                                                    </div>
                                                  </button>
                                                );
                                              })
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
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
                    <div className="md:col-span-4 p-5 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-6">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Ledger Statement</h4>
                        
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
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Live Exchange Log</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </h4>
                        
                        {p2pTxHistory.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-gray-400 text-center">
                            No peer transfers logged in your active session yet.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                            {p2pTxHistory.map((tx) => {
                              const isSender = profile?.id && (
                                tx.sender_id.toLowerCase() === profile.id.toLowerCase() || 
                                (profile.user_id && tx.sender_id.toLowerCase() === profile.user_id.toLowerCase()) ||
                                tx.sender_email.toLowerCase() === profile.email.toLowerCase()
                              );
                              return (
                                <div key={tx.id} className="p-3 rounded-xl bg-slate-50 border border-slate-105 space-y-1 text-left">
                                  <div className="flex justify-between items-start">
                                    <span className="font-bold text-slate-800 text-[11px] truncate max-w-[110px]" title={isSender ? tx.recipient_name : tx.sender_name}>
                                      {isSender ? `To: ${tx.recipient_name}` : `From: ${tx.sender_name}`}
                                    </span>
                                    <span className={`font-mono font-black text-[11px] whitespace-nowrap ${isSender ? "text-amber-800" : "text-emerald-700"}`}>
                                      {isSender ? `-${tx.points} AVU` : `+${tx.points} AVU`}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 line-clamp-1">{tx.reason}</p>
                                  <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono">
                                    <span>{tx.id}</span>
                                    <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
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

                  <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 mx-auto text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                      <Icon name="Wallet" size={32} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-extrabold text-slate-900">Secure Wallet Funding Terminal</h4>
                      <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Fund your ambassador growth wallet via our secure Paystack checkout gateway to instantly accumulate Advaltad Value Units (AVU) and earn performance commissions.
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={() => setIsFundWalletModalOpen(true)}
                        className="px-8 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 mx-auto cursor-pointer shadow-md hover:shadow-lg active:scale-98"
                      >
                        <Icon name="Lock" size={16} className="text-emerald-400" />
                        <span>Launch Funding Terminal</span>
                      </button>
                    </div>
                    <div className="pt-6 border-t border-slate-100 flex justify-center gap-8 text-left text-xs text-slate-500 font-sans">
                      <div>
                        <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Processing</p>
                        <p className="font-medium text-slate-700">100% Secure via Paystack</p>
                      </div>
                      <div className="border-l border-slate-200" />
                      <div>
                        <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Conversion Rate</p>
                        <p className="font-medium text-slate-700">₦1,000 = <span className="font-bold text-emerald-600">1.002 AVU</span></p>
                      </div>
                    </div>
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

              {/* TAB 7: GAMIFIED LEADERBOARD */}
              {activeTab === "leaderboard" && (
                <motion.div
                  key="v-leaderboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                >
                  {/* Title Header Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Icon name="Trophy" size={24} className="text-amber-500 shrink-0" />
                        Ambassador Contribution Leaderboard
                      </h3>
                      <p className="text-xs text-gray-500 font-sans">
                        Recognizing regional community leads based on active co-funding, program supervision, and peer operations.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-mono bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200 font-bold self-start sm:self-auto">
                      <Icon name="Sparkles" size={14} className="text-amber-500 animate-pulse" />
                      <span>Ledger Verified Scores</span>
                    </div>
                  </div>

                  {/* Top 3 Physical Podium Row */}
                  {processedLeaders.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-sm text-gray-500 space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                        🏆
                      </div>
                      <div className="space-y-1">
                        <p className="font-extrabold text-slate-800">The Leaderboard Arena is Currently Empty</p>
                        <p className="text-xs text-gray-400 max-w-md mx-auto">
                          Be the first to secure a spot! The Top Leaders Ranking List populates automatically as Ambassadors begin to fund their wallets and buy AVU tokens.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
                      {/* 2nd Place (Silver) */}
                      <div className="order-2 md:order-1 flex flex-col items-center">
                        {(() => {
                          const leader2 = processedLeaders[1];
                          if (!leader2) {
                            return (
                              <div className="w-full text-center space-y-3 opacity-40">
                                <div className="relative inline-block">
                                  <div className="w-16 h-16 rounded-full bg-slate-100 p-0.5 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold text-sm">
                                    TBD
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold text-xs text-slate-400">Position Open</p>
                                  <p className="text-[10px] text-slate-350 font-medium font-mono">0 AVU</p>
                                </div>
                                <div className="h-16 w-full bg-gradient-to-t from-slate-150/40 to-slate-100/20 rounded-t-2xl border-t border-x border-slate-200/40 flex items-center justify-center font-mono font-black text-slate-300 text-lg">
                                  SILVER
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="w-full text-center space-y-3">
                              <div className="relative inline-block">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-slate-400 p-0.5 shadow-lg">
                                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-lg border-2 border-slate-350">
                                    {leader2.initials || "KM"}
                                  </div>
                                </div>
                                <span className="absolute -top-2 -right-1 bg-slate-300 text-slate-900 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow">
                                  2
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="font-extrabold text-sm text-slate-800">{leader2.name}</p>
                                <p className="text-[10px] text-emerald-650 font-extrabold font-mono">{(leader2.avu_balance || 0).toLocaleString()} AVU</p>
                                <p className="text-[10px] text-gray-400 font-medium">{leader2.city} • {leader2.field}</p>
                                <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 rounded-md">
                                  {leader2.rankTitle}
                                </span>
                                <p className="text-xs font-black font-mono text-slate-650 pt-1">{leader2.points.toLocaleString()} PTS</p>
                              </div>

                              {/* Podium Pedestal block */}
                              <div className="h-16 w-full bg-gradient-to-t from-slate-150 to-slate-100 rounded-t-2xl border-t border-x border-slate-200/60 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] flex items-center justify-center font-mono font-black text-slate-400 text-lg">
                                SILVER
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 1st Place (Gold) - Elevated center block */}
                      <div className="order-1 md:order-2 flex flex-col items-center">
                        {(() => {
                          const leader1 = processedLeaders[0];
                          if (!leader1) {
                            return (
                              <div className="w-full text-center space-y-3 relative opacity-50">
                                <div className="relative inline-block">
                                  <div className="w-20 h-20 rounded-full bg-slate-100 p-0.5 border border-dashed border-slate-350 flex items-center justify-center text-slate-400 font-bold text-sm">
                                    TBD
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold text-xs text-slate-400 font-sans">Leader Spot Open</p>
                                  <p className="text-[10px] text-slate-350 font-medium font-mono">0 AVU</p>
                                </div>
                                <div className="h-24 w-full bg-gradient-to-t from-amber-100/30 to-amber-50/10 rounded-t-2xl border-t border-x border-amber-200/40 flex items-center justify-center font-mono font-black text-amber-400 text-xl">
                                  GOLD
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="w-full text-center space-y-3 relative">
                              {/* Confetti element simulation */}
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 text-xl animate-bounce">
                                👑
                              </div>
                              
                              <div className="relative inline-block">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 p-1 shadow-xl ring-4 ring-amber-400/20">
                                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white font-bold text-xl border-2 border-amber-400">
                                    {leader1.initials || "NT"}
                                  </div>
                                </div>
                                <span className="absolute -top-2 -right-1 bg-amber-400 text-slate-950 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow-md">
                                  1
                                </span>
                              </div>
                              
                              <div className="space-y-1 pb-2">
                                <p className="font-black text-base text-gray-950 flex items-center justify-center gap-1">
                                  {leader1.name}
                                  {leader1.isCurrentUser && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                                </p>
                                <p className="text-xs text-emerald-650 font-black font-mono">{(leader1.avu_balance || 0).toLocaleString()} AVU</p>
                                <p className="text-[10px] text-gray-400 font-medium">{leader1.city} • {leader1.field}</p>
                                <span className="inline-block px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-805 bg-amber-100/80 border border-amber-200 rounded-md">
                                  {leader1.rankTitle}
                                </span>
                                <p className="text-sm font-extrabold font-mono text-amber-600 pt-1">{leader1.points.toLocaleString()} PTS</p>
                              </div>

                              {/* Podium Pedestal block */}
                              <div className="h-24 w-full bg-gradient-to-t from-amber-100/60 to-amber-50/40 rounded-t-2xl border-t border-x border-amber-200/60 shadow-[0_-6px_20px_rgba(245,158,11,0.05)] flex flex-col items-center justify-center font-mono font-black text-amber-500 text-xl">
                                <span>GOLD</span>
                                <span className="text-[9px] text-amber-400/80 uppercase tracking-widest mt-0.5">Arena Leader</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 3rd Place (Bronze) */}
                      <div className="order-3 md:order-3 flex flex-col items-center">
                        {(() => {
                          const leader3 = processedLeaders[2];
                          if (!leader3) {
                            return (
                              <div className="w-full text-center space-y-3 opacity-40">
                                <div className="relative inline-block">
                                  <div className="w-16 h-16 rounded-full bg-slate-100 p-0.5 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold text-sm">
                                    TBD
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-bold text-xs text-slate-400">Position Open</p>
                                  <p className="text-[10px] text-slate-350 font-medium font-mono">0 AVU</p>
                                </div>
                                <div className="h-12 w-full bg-gradient-to-t from-orange-50/40 to-orange-50/10 rounded-t-2xl border-t border-x border-orange-200/30 flex items-center justify-center font-mono font-black text-orange-400 text-lg">
                                  BRONZE
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="w-full text-center space-y-3">
                              <div className="relative inline-block">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-orange-800 p-0.5 shadow-lg">
                                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-lg border-2 border-amber-700">
                                    {leader3.initials || "MD"}
                                  </div>
                                </div>
                                <span className="absolute -top-2 -right-1 bg-orange-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow">
                                  3
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="font-extrabold text-sm text-slate-800 flex items-center justify-center gap-1">
                                  {leader3.name}
                                  {leader3.isCurrentUser && <span className="text-[9px] bg-emerald-100 text-emerald-850 px-1.5 py-0.5 rounded font-black uppercase">You</span>}
                                </p>
                                <p className="text-[10px] text-emerald-650 font-extrabold font-mono">{(leader3.avu_balance || 0).toLocaleString()} AVU</p>
                                <p className="text-[10px] text-gray-400 font-medium">{leader3.city} • {leader3.field}</p>
                                <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 rounded-md">
                                  {leader3.rankTitle}
                                </span>
                                <p className="text-xs font-black font-mono text-amber-800 pt-1">{leader3.points.toLocaleString()} PTS</p>
                              </div>

                              {/* Podium Pedestal block */}
                              <div className="h-12 w-full bg-gradient-to-t from-orange-50 to-orange-50/20 rounded-t-2xl border-t border-x border-orange-200/40 shadow-[0_-4px_12px_rgba(0,0,0,0.01)] flex items-center justify-center font-mono font-black text-orange-600/70 text-lg">
                                BRONZE
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Main Grid: Leaders table (Left 8 cols) & Quest list (Right 4 cols) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                    
                    {/* LEADER TABLE (8 COLS) */}
                    <div className="lg:col-span-8 space-y-6">
                      
                      {/* Interactive Search & Filters Panel */}
                      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-gray-400">
                            <Icon name="Search" size={14} />
                          </span>
                          <input
                            type="text"
                            placeholder="Search ambassadors by name..."
                            value={leaderSearch}
                            onChange={(e) => setLeaderSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-emerald-600 text-xs font-medium focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px]">
                          {/* Region Filter */}
                          <div className="space-y-1">
                            <label className="block font-bold text-gray-400 uppercase tracking-widest">Region Group</label>
                            <select
                              value={leaderRegionFilter}
                              onChange={(e) => setLeaderRegionFilter(e.target.value)}
                              className="w-full p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              <option value="All">All Regions</option>
                              <option value="West Africa">West Africa</option>
                              <option value="East Africa">East Africa</option>
                            </select>
                          </div>

                          {/* Division Filter */}
                          <div className="space-y-1">
                            <label className="block font-bold text-gray-400 uppercase tracking-widest">Field Division</label>
                            <select
                              value={leaderDivisionFilter}
                              onChange={(e) => setLeaderDivisionFilter(e.target.value)}
                              className="w-full p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              <option value="All">All Divisions</option>
                              <option value="Technology">Technology</option>
                              <option value="Sustainability">Sustainability</option>
                              <option value="Healthcare">Healthcare</option>
                              <option value="Education & Other">Education & Other</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Leaders Table Rows */}
                      <div className="space-y-3">
                        <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest px-2">Rankings List</h4>
                        
                        {(() => {
                          // Apply client-side search and filters to processedLeaders
                          const filteredLeaders = processedLeaders.filter(leader => {
                            const matchSearch = leader.name.toLowerCase().includes(leaderSearch.toLowerCase()) || 
                                                leader.city.toLowerCase().includes(leaderSearch.toLowerCase());
                            const matchRegion = leaderRegionFilter === "All" || getBroadRegion(leader.city) === leaderRegionFilter;
                            const matchDivision = leaderDivisionFilter === "All" || getBroadDivision(leader.field) === leaderDivisionFilter;
                            return matchSearch && matchRegion && matchDivision;
                          });

                          if (filteredLeaders.length === 0) {
                            return (
                              <div className="p-8 text-center bg-white rounded-3xl border border-gray-100 text-xs text-gray-400 space-y-2">
                                <Icon name="AlertCircle" size={24} className="mx-auto text-gray-300" />
                                <p className="font-bold">No matching ambassadors found.</p>
                                <p className="text-[11px]">Try clearing your search query or adjusting filters.</p>
                              </div>
                            );
                          }

                          return filteredLeaders.map((leader, index) => {
                            const isUser = leader.isCurrentUser;
                            // Find their absolute index/rank inside sortedProcessedLeaders
                            const absoluteRank = processedLeaders.findIndex(l => l.id === leader.id) + 1;
                            
                            return (
                              <div
                                key={leader.id}
                                className={`p-4 rounded-2xl bg-white border transition-all flex items-center justify-between gap-4 ${
                                  isUser 
                                    ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/10 relative" 
                                    : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                                }`}
                              >
                                {isUser && (
                                  <div className="absolute top-0 right-12 -translate-y-1/2 bg-emerald-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow tracking-wider">
                                    Your Score
                                  </div>
                                )}

                                <div className="flex items-center gap-3.5 min-w-0">
                                  {/* Rank Number Circle */}
                                  <span className={`w-6 text-center font-mono text-sm font-black shrink-0 ${
                                    absoluteRank === 1 ? "text-amber-500 text-lg" : absoluteRank === 2 ? "text-slate-400 text-base" : absoluteRank === 3 ? "text-orange-700" : "text-gray-400"
                                  }`}>
                                    #{absoluteRank}
                                  </span>

                                  {/* Initials Circle */}
                                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${leader.avatarBg || "from-slate-400 to-slate-500"} p-0.5 shrink-0 shadow-sm`}>
                                    <div className="w-full h-full rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                                      {leader.initials || leader.name.split(" ").map((n: string) => n[0]).join("").substring(0,2).toUpperCase()}
                                    </div>
                                  </div>

                                  {/* Name & Region */}
                                  <div className="min-w-0 space-y-0.5">
                                    <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 truncate">
                                      {leader.name}
                                      {isUser && <span className="text-[8px] bg-emerald-50 text-emerald-800 px-1 rounded font-bold uppercase">YOU</span>}
                                    </h5>
                                    <p className="text-[10px] text-gray-400 truncate font-sans">
                                      {leader.city} • <span className="font-semibold text-slate-500">{leader.field}</span>
                                    </p>
                                    <p className="text-[10px] text-emerald-650 font-extrabold font-mono flex items-center gap-1 mt-0.5">
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                      {(leader.avu_balance || 0).toLocaleString()} AVU
                                    </p>
                                  </div>
                                </div>

                                {/* Score & Status Badge */}
                                <div className="text-right shrink-0 space-y-1.5">
                                  <span className={`inline-block text-[8px] font-bold px-2 py-0.5 border rounded-full ${leader.badgeColor}`}>
                                    {leader.rankTitle}
                                  </span>
                                  <p className="font-mono text-xs font-black text-slate-800 leading-none">
                                    {leader.points?.toLocaleString()} <span className="text-[9px] text-gray-400 font-bold">PTS</span>
                                  </p>
                                </div>

                              </div>
                            );
                          });
                        })()}
                      </div>

                    </div>

                    {/* MILITARY/QUEST MILESTONE BOARD (4 COLS) */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-5">
                        <div className="space-y-1">
                          <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                            <Icon name="Target" size={15} className="text-emerald-600 shrink-0" />
                            Milestone Quest Board
                          </h4>
                          <p className="text-[10px] text-gray-400 leading-normal">
                            Complete official ambassador actions to gain massive verified score boots instantly!
                          </p>
                        </div>

                        {/* Quests Container */}
                        <div className="space-y-3">
                          {/* Quest 1: Approved status */}
                          {(() => {
                            const isApproved = profile?.status === "approved";
                            return (
                              <div className="p-3 bg-white rounded-2xl border border-gray-150 flex items-start gap-2.5">
                                <div className={`p-1 rounded-lg shrink-0 mt-0.5 ${isApproved ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"}`}>
                                  <Icon name={isApproved ? "Check" : "Lock"} size={13} />
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h6 className="font-bold text-[11px] text-slate-850 truncate">Elite Commission</h6>
                                    <span className="text-[9px] font-bold text-emerald-600 shrink-0">+1,000 PTS</span>
                                  </div>
                                  <p className="text-[9px] text-gray-400 leading-tight">Secure official Approved Fellowship status.</p>
                                  {isApproved ? (
                                    <span className="inline-block text-[8px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded uppercase">CLAIMED</span>
                                  ) : (
                                    <span className="inline-block text-[8px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded uppercase">PENDING HQ APPROVAL</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Quest 2: Fund Wallet */}
                          {(() => {
                            const isFunded = totalDepositsNaira > 0 || hasFunded;
                            return (
                              <div className="p-3 bg-white rounded-2xl border border-gray-150 flex items-start gap-2.5">
                                <div className={`p-1 rounded-lg shrink-0 mt-0.5 ${isFunded ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"}`}>
                                  <Icon name={isFunded ? "Check" : "Plus"} size={13} />
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h6 className="font-bold text-[11px] text-slate-850 truncate">Resource Co-funding</h6>
                                    <span className="text-[9px] font-bold text-emerald-600 shrink-0">+1,500 PTS</span>
                                  </div>
                                  <p className="text-[9px] text-gray-400 leading-tight font-sans">Complete first wallet funding to fuel development.</p>
                                  {isFunded ? (
                                    <span className="inline-block text-[8px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded uppercase">CLAIMED</span>
                                  ) : (
                                    <button 
                                      onClick={() => setActiveTab("payments")}
                                      className="text-[9px] font-extrabold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded uppercase mt-1 cursor-pointer transition-colors"
                                    >
                                      Fund Now ➜
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Quest 3: Customize profile */}
                          {(() => {
                            const isCustomized = (profile?.city && profile.city !== "Lagos, Nigeria") || profile?.phone;
                            return (
                              <div className="p-3 bg-white rounded-2xl border border-gray-150 flex items-start gap-2.5">
                                <div className={`p-1 rounded-lg shrink-0 mt-0.5 ${isCustomized ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"}`}>
                                  <Icon name={isCustomized ? "Check" : "User"} size={13} />
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h6 className="font-bold text-[11px] text-slate-850 truncate">Regional Sync</h6>
                                    <span className="text-[9px] font-bold text-emerald-600 shrink-0">+500 PTS</span>
                                  </div>
                                  <p className="text-[9px] text-gray-400 leading-tight">Customize base city or phone contact details.</p>
                                  {isCustomized ? (
                                    <span className="inline-block text-[8px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded uppercase">CLAIMED</span>
                                  ) : (
                                    <button 
                                      onClick={() => setActiveTab("profile")}
                                      className="text-[9px] font-extrabold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded uppercase mt-1 cursor-pointer transition-colors"
                                    >
                                      Edit Profile ➜
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Quest 4: AVU peer transfer */}
                          {(() => {
                            const hasTransferred = hasFunded && avuBalance < ((totalDepositsNaira / 1000) * 1.002) - 0.001;
                            return (
                              <div className="p-3 bg-white rounded-2xl border border-gray-150 flex items-start gap-2.5">
                                <div className={`p-1 rounded-lg shrink-0 mt-0.5 ${hasTransferred ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"}`}>
                                  <Icon name={hasTransferred ? "Check" : "Zap"} size={13} />
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h6 className="font-bold text-[11px] text-slate-850 truncate">Peer-to-Peer Transit</h6>
                                    <span className="text-[9px] font-bold text-emerald-600 shrink-0">+800 PTS</span>
                                  </div>
                                  <p className="text-[9px] text-gray-400 leading-tight">Complete first peer transfer of AVU points.</p>
                                  {hasTransferred ? (
                                    <span className="inline-block text-[8px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded uppercase">CLAIMED</span>
                                  ) : (
                                    <button 
                                      onClick={() => setActiveTab("p2p")}
                                      className="text-[9px] font-extrabold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded uppercase mt-1 cursor-pointer transition-colors"
                                    >
                                      Transfer ➜
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                        </div>

                        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-[10px] text-emerald-850 leading-normal font-sans">
                          <p className="font-bold mb-1">Rank Thresholds Guide:</p>
                          <ul className="space-y-1 list-disc list-inside text-[9.5px]">
                            <li>👑 <span className="font-bold">Sovereign Catalyst:</span> 15,000+ PTS</li>
                            <li>🏆 <span className="font-bold">Regional Champion:</span> 12,000+ PTS</li>
                            <li>🏅 <span className="font-bold">Impact Pioneer:</span> 9,000+ PTS</li>
                            <li>🥈 <span className="font-bold">Growth Vanguard:</span> 6,000+ PTS</li>
                          </ul>
                        </div>
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

      {/* Dashboard Footer */}
      <footer className="mt-16 border-t border-slate-200/60 bg-white/50 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-slate-150 flex items-center justify-center shrink-0">
                <img
                  src={logoUrl}
                  alt="Advaltad Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-left">
                <span className="text-xs font-display font-black tracking-tight text-slate-800 block">Advaltad Foundation</span>
                <span className="text-[9px] text-emerald-600 font-extrabold block leading-none mt-0.5">CAC Registration No: CAC/IT8135301</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <Icon name="MapPin" size={13} className="text-emerald-600" />
                <span>1/3 Adimula Street, Idimu Lagos, Nigeria</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="Phone" size={13} className="text-emerald-600" />
                <a href="tel:+2349032445174" className="hover:text-emerald-700 transition-colors">+234 903 244 5174</a>
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="Mail" size={13} className="text-emerald-600" />
                <a href="mailto:contact@advaltad.org" className="hover:text-emerald-700 transition-colors">contact@advaltad.org</a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/share/1DARo9G9ZV/" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 flex items-center justify-center transition-all shadow-sm" aria-label="Facebook">
                <Icon name="Facebook" size={13} />
              </a>
              <a href="https://x.com/Advaltad" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 flex items-center justify-center transition-all shadow-sm" aria-label="Twitter">
                <Icon name="Twitter" size={13} />
              </a>
              <a href="https://www.instagram.com/advaltadfoundation?igsh=YW5jYnpobHpmbTVk" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 flex items-center justify-center transition-all shadow-sm" aria-label="Instagram">
                <Icon name="Instagram" size={13} />
              </a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200/40 text-center text-[10px] text-slate-400 font-semibold flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>© {new Date().getFullYear()} Advaltad Growth and Support Foundation. All Rights Reserved.</span>
            <div className="flex items-center gap-4">
              <a href="#privacy" className="hover:text-emerald-700">Privacy Charter</a>
              <span>•</span>
              <a href="#terms" className="hover:text-emerald-700">Terms of Synergy</a>
            </div>
          </div>
        </div>
      </footer>

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

      {/* AVU Transfer Confirmation Modal */}
      <AnimatePresence>
        {showTransferConfirmModal && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 overflow-hidden relative text-left"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
                    <Icon name="Send" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Confirm AVU Transfer</h3>
                    <p className="text-xs text-gray-500">Peer to Peer Value Exchange</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTransferConfirmModal(false)}
                  disabled={isProcessing}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <Icon name="X" size={18} />
                </button>
              </div>

              {/* Transfer Details Card */}
              <div className="space-y-4 mb-6">
                {/* Recipient Details */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Recipient Ambassador</span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      {selectedRecipient?.name
                        ? selectedRecipient.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
                        : "AV"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-gray-900 truncate">
                        {selectedRecipient?.name || "Ambassador"}
                      </h4>
                      <p className="text-xs text-emerald-700 font-mono font-bold">
                        ID: {selectedRecipient?.ambassador_id || selectedRecipient?.user_id || selectedRecipient?.id || transferTargetId}
                      </p>
                      {(selectedRecipient?.city || selectedRecipient?.field) && (
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {[selectedRecipient?.city, selectedRecipient?.field].filter(Boolean).join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transfer Amount & Balance Preview */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-bold uppercase tracking-wide">Transfer Amount</span>
                    <span className="text-2xl font-mono font-black text-emerald-700">{transferAmount} AVU</span>
                  </div>
                  
                  <div className="pt-2 border-t border-emerald-100/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Your Current Balance:</span>
                      <span className="font-mono font-bold text-gray-900">{avuBalance} AVU</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-800 font-bold">
                      <span>Remaining Balance After:</span>
                      <span className="font-mono">{avuBalance - (parseInt(transferAmount) || 0)} AVU</span>
                    </div>
                  </div>
                </div>

                {/* Purpose / Justification */}
                {transferReason && (
                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Activity Justification / Purpose
                    </span>
                    <p className="text-xs text-gray-700 italic">"{transferReason}"</p>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferConfirmModal(false)}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmExecuteTransfer}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Icon name="Loader2" className="animate-spin" size={15} />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="CheckCircle2" size={15} />
                      <span>Confirm & Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fund Wallet Modal */}
      <FundWalletModal
        isOpen={isFundWalletModalOpen}
        onClose={() => setIsFundWalletModalOpen(false)}
        profile={profile}
        onSuccess={(newBalance) => {
          setAvuBalance(newBalance);
          setHasFunded(true);
          if (profile) {
            setProfile({ ...profile, avu_balance: newBalance });
          }
        }}
        showToast={showToast}
        fetchAmbassadorData={fetchAmbassadorData}
      />

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
