import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { db, DbAmbassador, isSupabaseConfigured, supabase } from "../lib/supabase";
import { convertNairaToAvu, initializePayment } from "../lib/paystack";
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

  if (!isOpen) return null;

  const amt = parseFloat(amountNaira) || 0;
  const avuToEarn = convertNairaToAvu(amt);
  const email = profile?.email || "ambassador@domain.com";
  const currentAmbassadorId = profile?.id || "00000000-0000-0000-0000-000000000000";

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
    showToast("info", "Initializing Transaction", `Preparing checkout for ₦${amt.toLocaleString()}...`);

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
        console.error("Database registration error:", err);
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
        showToast("success", "Payment Verified", `Successfully verified payment of ₦${amt.toLocaleString()} NGN. Credited ${earnedAvu} AVU to your balance!`);
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
        `Would you like to process this transaction using the simulated backup gateway for testing?`
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
            console.error("Database registration failed:", dbErr);
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
          console.error("Error updating simulated deposit", err);
          showToast("error", "Verification Error", "Simulation failed.");
        } finally {
          setIsProcessing(false);
        }
      } else {
        showToast("error", "Transaction Cancelled", "The transaction was cancelled by the user.");
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
      >
        <button
          onClick={onClose}
          type="button"
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
  // ==========================================
  // ALL HOOKS DECLARED FIRST AT COMPONENT TOP
  // ==========================================
  const [activeTab, setActiveTab] = useState<"overview" | "certificate" | "p2p" | "payments" | "projects" | "profile" | "leaderboard">("overview");

  // Profile & Auth state
  const [profile, setProfile] = useState<DbAmbassador | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

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
  const [totalDepositsNaira, setTotalDepositsNaira] = useState(0);

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; type: "success" | "error" | "info"; title: string; message: string }[]>([]);

  // Certificate Form State
  const [certFormOpen, setCertFormOpen] = useState(false);
  const [tempName, setTempName] = useState("Ramon Bisola");
  const [tempRegion, setTempRegion] = useState("Lagos, Nigeria");
  const [tempField, setTempField] = useState("Youth Technology Labs");
  const [tempDate, setTempDate] = useState("May 27, 2026");
  const [downloadingCert, setDownloadingCert] = useState(false);

  // Notifications state
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

  // Leaderboard filters
  const [leaderSearch, setLeaderSearch] = useState("");
  const [leaderRegionFilter, setLeaderRegionFilter] = useState("All");
  const [leaderDivisionFilter, setLeaderDivisionFilter] = useState("All");

  // Direct Terminal Donation form state
  const [donationLinkText, setDonationLinkText] = useState("https://advaltad.org/campaign/ramon-youth-labs");
  const [campaignTitle, setCampaignTitle] = useState("Support Ramon's TechHub");
  const [campaignGenerated, setCampaignGenerated] = useState(false);
  const [termAmount, setTermAmount] = useState("");
  const [termDonorName, setTermDonorName] = useState("");
  const [termDonorEmail, setTermDonorEmail] = useState("");
  const [termStatus, setTermStatus] = useState<"idle" | "submitting" | "completed">("idle");

  // Projects state
  const [projects] = useState<ProjectItem[]>([
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

  // Resource exchange items
  const [exchangeItems] = useState<ExchangeListing[]>([
    { id: "e-1", title: "Eco-Adobe Brick Compressor blueprints", provider: "Grace (Mombasa)", avuCost: 150, category: "hardware", icon: "Home" },
    { id: "e-2", title: "NextGen Tech Curriculum (React/Figma Spec)", provider: "Advaltad HQ", avuCost: 0, category: "educational", icon: "GraduationCap" },
    { id: "e-3", title: "Premium CAD/GIS Architectural Account Access", provider: "Kofi (Accra)", avuCost: 400, category: "software", icon: "Cpu" },
    { id: "e-4", title: "1-on-1 Grant Writing Mentorship (60 mins)", provider: "Nia (Nairobi NGO Lead)", avuCost: 200, category: "mentorship", icon: "Compass" }
  ]);
  const [activeItemDetails, setActiveItemDetails] = useState<ExchangeListing | null>(null);
  const [itemExchangeSuccess, setItemExchangeSuccess] = useState(false);

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

  const showToast = (type: "success" | "error" | "info", title: string, message: string) => {
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

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

      setTempName(user.name);
      setTempRegion(user.city);
      setTempField(user.field);

      if (user.created_at) {
        const d = new Date(user.created_at);
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        setCommissionDate(d.toLocaleDateString('en-US', options));
        setTempDate(d.toLocaleDateString('en-US', options));
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
        console.error("Error checking funding status:", err);
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
        console.warn("Failed to load ambassadors list:", ambErr);
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
              onLogout();
              window.location.href = "/";
              return;
            }
          }
        } catch (err) {
          const localSessionEmail = localStorage.getItem("advaltad_session_email");
          if (!localSessionEmail) {
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
        () => fetchAmbassadorData()
      )
      .subscribe();

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
        () => fetchAmbassadorData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ambassadorChannel);
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(walletChannel);
    };
  }, [profile]);

  // ==========================================
  // DERIVED DATA & COMPUTATIONS (Safe to access hooks now)
  // ==========================================
  const getBroadRegion = (city: string) => {
    const c = (city || "").toLowerCase();
    if (c.includes("lagos") || c.includes("accra") || c.includes("dakar") || c.includes("nigeria") || c.includes("ghana") || c.includes("senegal") || c.includes("lekki") || c.includes("surulere")) {
      return "West Africa";
    }
    if (c.includes("nairobi") || c.includes("mombasa") || c.includes("kigali") || c.includes("kenya") || c.includes("rwanda")) {
      return "East Africa";
    }
    return "Other";
  };

  const getBroadDivision = (field: string) => {
    const f = (field || "").toLowerCase();
    if (f.includes("tech") || f.includes("software") || f.includes("initiative") || f.includes("enriching")) {
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

  const approvedOtherAmbassadors = dbAmbassadors.filter(
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

  // Calculate Leaderboard entries
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

  const activeDbLeaders = dbAmbassadors
    .filter(a => a.id !== profile?.id && a.email?.toLowerCase() !== profile?.email?.toLowerCase() && (a.avu_balance || 0) > 0)
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

  const getImpactPoints = (leader: any) => {
    const avuContribution = (leader.avu_balance || 0) * 10;
    const depositContribution = Math.floor((leader.totalDeposits || 0) / 100);
    const projectContribution = (leader.projects || 0) * 500;
    return avuContribution + depositContribution + projectContribution;
  };

  const allLeadersCombined = [];
  if ((currentUserEntry.avu_balance || 0) >= 0) {
    allLeadersCombined.push(currentUserEntry);
  }
  allLeadersCombined.push(...activeDbLeaders);

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

  // ==========================================
  // HANDLERS
  // ==========================================
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
      } catch (err) {
        console.error("Failed to sync certificate update:", err);
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
        
        setDbAmbassadors(prev => prev.map(a => {
          const matchTarget = 
            (a.id && transferTargetId && a.id.toLowerCase() === transferTargetId.toLowerCase()) ||
            (a.email && transferTargetId && a.email.toLowerCase() === transferTargetId.toLowerCase()) ||
            (a.user_id && transferTargetId && a.user_id.toLowerCase() === transferTargetId.toLowerCase()) ||
            (a.ambassador_id && transferTargetId && a.ambassador_id.toLowerCase() === transferTargetId.toLowerCase());
          if (matchTarget) {
            return { ...a, avu_balance: (a.avu_balance || 0) + amt };
          }
          if (a.id === profile?.id || (a.email && profile?.email && a.email.toLowerCase() === profile.email.toLowerCase())) {
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
            desc: `Logged donation of $${amt} USD from ${termDonorName} (${termDonorEmail}) into regional pipeline tracker.`,
            amount: `$${amt} USD`
          });
        } catch (err) {
          console.error("Failed to log activity:", err);
        }
      }

      const newNotif: NotificationItem = {
        id: "n-don-" + Date.now(),
        title: "Direct Pipeline Donation Logged",
        desc: `$${amt} USD logged for ${campaignTitle} from ${termDonorName}.`,
        time: "Just now",
        unread: true,
        type: "payment"
      };
      setNotifications(prev => [newNotif, ...prev]);

      setTermAmount("");
      setTermDonorName("");
      setTermDonorEmail("");
      setTimeout(() => setTermStatus("idle"), 4000);
    }, 1200);
  };

  const handleClaimExchange = (item: ExchangeListing) => {
    setActiveItemDetails(item);
    if (avuBalance < item.avuCost) {
      showToast("error", "Insufficient Balance", `You need ${item.avuCost} AVU tokens to acquire "${item.title}". Current balance: ${avuBalance} AVU.`);
      return;
    }

    setIsProcessing(true);
    setTimeout(async () => {
      const newBal = avuBalance - item.avuCost;
      setAvuBalance(newBal);
      if (profile?.id) {
        await db.updateProfile(profile.id, { avu_balance: newBal });
      }
      setItemExchangeSuccess(true);
      setIsProcessing(false);
      showToast("success", "Asset Redeemed", `Successfully exchanged ${item.avuCost} AVU for ${item.title}. Resource access dispatched.`);

      const newNotif: NotificationItem = {
        id: "n-ex-" + Date.now(),
        title: "Peer Resource Acquired",
        desc: `Redeemed ${item.title} for ${item.avuCost} AVU from ${item.provider}.`,
        time: "Just now",
        unread: true,
        type: "p2p"
      };
      setNotifications(prev => [newNotif, ...prev]);

      setTimeout(() => {
        setItemExchangeSuccess(false);
        setActiveItemDetails(null);
      }, 4000);
    }, 1000);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300 animate-pulse">Initializing Ambassador Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-20">
      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-[150] space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border text-xs font-sans space-y-1 backdrop-blur-md ${
                toast.type === "success"
                  ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
                  : toast.type === "error"
                  ? "bg-rose-950/90 border-rose-500/40 text-rose-100"
                  : "bg-slate-900/90 border-slate-700 text-slate-100"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <Icon
                  name={toast.type === "success" ? "CheckCircle2" : toast.type === "error" ? "AlertCircle" : "Info"}
                  size={16}
                  className={toast.type === "success" ? "text-emerald-400" : toast.type === "error" ? "text-rose-400" : "text-sky-400"}
                />
                <span>{toast.title}</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Advaltad Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-wide">{ambassadorName}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Fellow Ambassador
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Icon name="MapPin" size={12} className="text-emerald-400" />
                <span>{ambassadorRegion}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AVU Balance Chip */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs font-mono">
              <span className="text-slate-400 font-sans font-bold">Balance:</span>
              <span className="font-extrabold text-emerald-400">{avuBalance.toLocaleString()} AVU</span>
            </div>

            {/* Fund Wallet Button */}
            <button
              onClick={() => setIsFundWalletModalOpen(true)}
              type="button"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="Plus" size={14} />
              <span className="hidden sm:inline">Fund Wallet</span>
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                type="button"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors relative cursor-pointer"
              >
                <Icon name="Bell" size={18} />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {notifDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-extrabold text-white uppercase tracking-wider text-[11px]">Notifications</span>
                      <button
                        onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                        type="button"
                        className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-bold"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-2.5 rounded-xl border text-left space-y-1 ${n.unread ? "bg-slate-800/80 border-slate-700" : "bg-slate-900 border-slate-800/60 opacity-75"}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{n.title}</span>
                            <span className="text-[9px] text-slate-500">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">{n.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              type="button"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-700/50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <Icon name="LogOut" size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 sticky top-20 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {[
            { id: "overview", label: "Overview", icon: "LayoutDashboard" },
            { id: "certificate", label: "Fellowship Certificate", icon: "Award" },
            { id: "p2p", label: "P2P Token Transfer", icon: "ArrowLeftRight" },
            { id: "payments", label: "Payments & Funding", icon: "Wallet" },
            { id: "projects", label: "Projects", icon: "FolderKanban" },
            { id: "leaderboard", label: "Leaderboard", icon: "Trophy" },
            { id: "profile", label: "Profile", icon: "User" },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon name={tab.icon as any} size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-8">
              {/* Stat Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div variants={itemVariants} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AVU Token Balance</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Icon name="Coins" size={20} />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-white font-mono">{avuBalance.toLocaleString()} <span className="text-sm font-sans font-bold text-emerald-400">AVU</span></h3>
                    <p className="text-[11px] text-slate-400">Value ratio: 1,000 NGN = 1.002 AVU</p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Funding Deposited</span>
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                      <Icon name="DollarSign" size={20} />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-white font-mono">₦{totalDepositsNaira.toLocaleString()} <span className="text-xs font-sans font-medium text-slate-400">NGN</span></h3>
                    <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <Icon name="CheckCircle2" size={12} />
                      <span>{hasFunded ? "Active Funding Account" : "No funding logged yet"}</span>
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regional Projects</span>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                      <Icon name="FolderKanban" size={20} />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-white font-mono">3 <span className="text-xs font-sans font-medium text-slate-400">Supervised</span></h3>
                    <p className="text-[11px] text-slate-400">1 active, 1 completed, 1 planning</p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Global Rank</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <Icon name="Trophy" size={20} />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-white font-mono">
                      #{processedLeaders.findIndex(l => l.isCurrentUser) + 1 || 1} <span className="text-xs font-sans font-medium text-amber-400">Ranked</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Impact Score: {getImpactPoints(currentUserEntry).toLocaleString()} pts</p>
                  </div>
                </motion.div>
              </div>

              {/* Charts Grid */}
              <div className="grid lg:grid-cols-2 gap-6">
                <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Token Flow Trend</h3>
                      <p className="text-xs text-slate-400">AVU transfers & allocations across weekly cycles</p>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300">AVU / Week</div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={flowTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }} />
                        <Area type="monotone" dataKey="totalFlow" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#flowGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Regional Hub Activity</h3>
                      <p className="text-xs text-slate-400">Received vs Dispatched AVU across African hubs</p>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hubFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }} />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        <Bar dataKey="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Dispatched" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Projects Preview */}
              <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Supervised Projects</h3>
                    <p className="text-xs text-slate-400">Current progress on active community impact initiatives</p>
                  </div>
                  <button onClick={() => setActiveTab("projects")} type="button" className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer">
                    View All Projects &rarr;
                  </button>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {projects.map(p => (
                    <div key={p.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                          p.status === "active" ? "bg-sky-500/10 text-sky-400 border border-sky-500/30" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}>
                          {p.status}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-400">{p.progress}%</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-200 line-clamp-1">{p.name}</h4>
                        <p className="text-[10px] text-slate-500">{p.location}</p>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "certificate" && (
            <motion.div key="certificate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-wide uppercase">Fellowship Credential Badge</h2>
                  <p className="text-xs text-slate-400">Official verified commission credential for Advaltad Growth Ambassadors</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCertFormOpen(true)}
                    type="button"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Icon name="Edit3" size={14} />
                    <span>Edit Badge Info</span>
                  </button>
                  <button
                    onClick={() => {
                      setDownloadingCert(true);
                      setTimeout(() => {
                        setDownloadingCert(false);
                        window.print();
                      }, 800);
                    }}
                    type="button"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
                  >
                    <Icon name={downloadingCert ? "Loader2" : "Download"} size={14} className={downloadingCert ? "animate-spin" : ""} />
                    <span>Download / Print</span>
                  </button>
                </div>
              </div>

              {/* Certificate Canvas Box */}
              <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border-2 border-emerald-500/30 text-center space-y-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                  <img src={logoUrl} alt="Advaltad" className="w-12 h-12 rounded-2xl object-cover border border-slate-700" />
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase tracking-widest">Commission ID</span>
                    <span className="text-xs font-mono text-slate-300 font-bold">{profile?.id || "AV-2026-99401"}</span>
                  </div>
                </div>

                <div className="space-y-3 py-4">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest">
                    Official Certificate of Commission
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-black text-white font-serif">{ambassadorName}</h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                    is hereby recognized and commissioned as an official <span className="text-emerald-400 font-bold">Growth Ambassador</span> supervising regional empowerment initiatives in <span className="text-slate-200 font-bold">{ambassadorRegion}</span> under the <span className="text-slate-200 font-bold">{ambassadorField}</span> division.
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-4 text-left">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Date of Commission</p>
                    <p className="text-xs text-slate-300 font-bold font-mono">{commissionDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Verification Status</p>
                    <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-end">
                      <Icon name="CheckCircle2" size={12} />
                      <span>Verified On-Chain</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Cert Form Modal */}
              <AnimatePresence>
                {certFormOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 className="font-bold text-sm text-white">Edit Credential Details</h3>
                        <button onClick={() => setCertFormOpen(false)} type="button" className="text-slate-400 hover:text-white cursor-pointer"><Icon name="X" size={16} /></button>
                      </div>
                      <form onSubmit={handleCertSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Ambassador Name</label>
                          <input type="text" value={tempName} onChange={e => setTempName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Region / City</label>
                          <input type="text" value={tempRegion} onChange={e => setTempRegion(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Focus Division</label>
                          <input type="text" value={tempField} onChange={e => setTempField(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setCertFormOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                          <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">Save Changes</button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === "p2p" && (
            <motion.div key="p2p" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Transfer Form */}
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Icon name="ArrowLeftRight" size={18} className="text-emerald-400" />
                      <span>Peer-to-Peer AVU Transfer</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Directly allocate AVU tokens to fellow ambassadors across African hubs</p>
                  </div>

                  <form onSubmit={handleP2PTransfer} className="space-y-5">
                    {/* Searchable Recipient Combobox */}
                    <div className="space-y-1.5 relative" ref={recipientComboboxRef}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Recipient Ambassador</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search ambassador by name, city, or ID..."
                          value={recipientSearchQuery}
                          onChange={(e) => {
                            setRecipientSearchQuery(e.target.value);
                            setIsRecipientDropdownOpen(true);
                          }}
                          onFocus={() => setIsRecipientDropdownOpen(true)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setIsRecipientDropdownOpen(!isRecipientDropdownOpen)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <Icon name="ChevronDown" size={16} />
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {isRecipientDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1"
                          >
                            {filteredCandidateAmbassadors.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-500 font-medium">No matching ambassadors found</div>
                            ) : (
                              filteredCandidateAmbassadors.map(amb => {
                                const ambId = amb.ambassador_id || amb.user_id || amb.id;
                                const isSelected = transferTargetId === ambId || transferTargetId === amb.id || transferTargetId === amb.email;
                                return (
                                  <button
                                    key={amb.id || ambId}
                                    type="button"
                                    onClick={() => {
                                      setTransferTargetId(ambId);
                                      setRecipientSearchQuery(`${amb.name} (${amb.city})`);
                                      setIsRecipientDropdownOpen(false);
                                    }}
                                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                      isSelected ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30" : "hover:bg-slate-800 text-slate-200"
                                    }`}
                                  >
                                    <div>
                                      <div className="font-bold">{amb.name}</div>
                                      <div className="text-[10px] text-slate-400">{amb.city} • {amb.field}</div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[10px] font-mono text-emerald-400 font-bold">{(amb.avu_balance || 0).toLocaleString()} AVU</span>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Selected Recipient Card */}
                    {selectedRecipient && (
                      <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                            {selectedRecipient.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white">{selectedRecipient.name}</p>
                            <p className="text-[10px] text-slate-400">{selectedRecipient.city}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">Verified Ambassador</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Transfer Amount (AVU)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 250"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Purpose / Project Note</label>
                      <input
                        type="text"
                        placeholder="e.g. Allocation for Surulere TechHub classroom supplies"
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? "Processing Transfer..." : "Transfer AVU Tokens"}
                    </button>
                  </form>
                </div>

                {/* Peer Resource Library */}
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Icon name="Compass" size={18} className="text-sky-400" />
                      <span>Peer Resource Exchange</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Acquire equipment specs, software accounts, and mentorship using AVU</p>
                  </div>

                  <div className="space-y-3">
                    {exchangeItems.map(item => (
                      <div key={item.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4 text-left">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
                            <Icon name={item.icon as any} size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-200">{item.title}</h4>
                            <p className="text-[10px] text-slate-400">Offered by {item.provider}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleClaimExchange(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono text-xs font-bold border border-slate-700 transition-colors cursor-pointer shrink-0"
                        >
                          {item.avuCost === 0 ? "Free" : `${item.avuCost} AVU`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Transfer History</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {p2pTxHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No P2P transfers logged yet.</p>
                  ) : (
                    p2pTxHistory.map(tx => (
                      <div key={tx.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tx.sender_id === profile?.id ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                            <Icon name={tx.sender_id === profile?.id ? "ArrowUpRight" : "ArrowDownLeft"} size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-200">{tx.sender_id === profile?.id ? `To: ${tx.recipient_name || tx.recipient_id}` : `From: ${tx.sender_name || tx.sender_id}`}</p>
                            <p className="text-[10px] text-slate-500">{tx.reason || "P2P Allocation"}</p>
                          </div>
                        </div>
                        <span className={`font-mono font-bold ${tx.sender_id === profile?.id ? "text-rose-400" : "text-emerald-400"}`}>
                          {tx.sender_id === profile?.id ? `-${tx.amount_avu} AVU` : `+${tx.amount_avu} AVU`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Confirmation Modal */}
              <AnimatePresence>
                {showTransferConfirmModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full space-y-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                        <Icon name="ArrowLeftRight" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">Confirm AVU Transfer</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          You are about to transfer <span className="font-mono font-bold text-emerald-400">{transferAmount} AVU</span> to <span className="font-bold text-white">{selectedRecipient?.name || "Selected Ambassador"}</span>.
                        </p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setShowTransferConfirmModal(false)} className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                        <button type="button" onClick={confirmExecuteTransfer} disabled={isProcessing} className="w-1/2 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">Confirm</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === "payments" && (
            <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Funding Card */}
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Icon name="Wallet" size={18} className="text-emerald-400" />
                      <span>Wallet Funding Terminal</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Fund your regional project account via Paystack online checkout</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Current Account Balance</span>
                    <p className="text-2xl font-black text-white font-mono">₦{totalDepositsNaira.toLocaleString()} <span className="text-xs font-sans text-slate-400 font-normal">NGN Deposited</span></p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFundWalletModalOpen(true)}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icon name="CreditCard" size={16} />
                    <span>Open Paystack Deposit Checkout</span>
                  </button>
                </div>

                {/* Direct Pipeline Logger */}
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Icon name="FileText" size={18} className="text-sky-400" />
                      <span>Manual/Physical Donation Logger</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Log cash or cheque regional campaign contributions</p>
                  </div>

                  <form onSubmit={handleDirectDonationGateway} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Donor Full Name</label>
                      <input type="text" placeholder="e.g. Dr. Adebayo Ogunlesi" value={termDonorName} onChange={e => setTermDonorName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Donor Email Contact</label>
                      <input type="email" placeholder="donor@domain.org" value={termDonorEmail} onChange={e => setTermDonorEmail(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Contribution Amount ($ USD)</label>
                      <input type="number" placeholder="500" value={termAmount} onChange={e => setTermAmount(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono" />
                    </div>
                    <button type="submit" disabled={termStatus === "submitting"} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer">
                      {termStatus === "submitting" ? "Logging Contribution..." : "Log Contribution to Pipeline"}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "projects" && (
            <motion.div key="projects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-wide uppercase">Regional Supervised Projects</h2>
                  <p className="text-xs text-slate-400">Track and monitor community development projects</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {projects.map(p => (
                  <div key={p.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.category}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                        p.status === "active" ? "bg-sky-500/10 text-sky-400 border border-sky-500/30" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-white">{p.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Icon name="MapPin" size={12} className="text-emerald-400" />
                        <span>{p.location}</span>
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{p.metricLabel}:</span>
                        <span className="font-bold text-white font-mono">{p.metricVal}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-wide uppercase">African Growth Ambassadors Leaderboard</h2>
                  <p className="text-xs text-slate-400">Impact scoring based on AVU tokens, regional projects, and total funding</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Filter leaders by name or city..."
                    value={leaderSearch}
                    onChange={e => setLeaderSearch(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500"
                  />
                  <select
                    value={leaderRegionFilter}
                    onChange={e => setLeaderRegionFilter(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer"
                  >
                    <option value="All">All Regions</option>
                    <option value="West Africa">West Africa</option>
                    <option value="East Africa">East Africa</option>
                  </select>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-4 text-center w-16">Rank</th>
                        <th className="p-4">Ambassador</th>
                        <th className="p-4">Region</th>
                        <th className="p-4 text-right">AVU Tokens</th>
                        <th className="p-4 text-right">Impact Score</th>
                        <th className="p-4 text-center">Badge Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {processedLeaders.map((leader, index) => {
                        const rankNum = index + 1;
                        return (
                          <tr key={leader.id} className={`transition-colors ${leader.isCurrentUser ? "bg-emerald-950/30 border-l-4 border-l-emerald-500 font-medium" : "hover:bg-slate-800/40"}`}>
                            <td className="p-4 text-center font-bold font-mono">
                              {rankNum === 1 ? "🥇" : rankNum === 2 ? "🥈" : rankNum === 3 ? "🥉" : `#${rankNum}`}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${leader.avatarBg} text-white font-bold text-xs flex items-center justify-center shadow-sm`}>
                                  {leader.initials}
                                </div>
                                <div>
                                  <span className="font-bold text-white block">{leader.name} {leader.isCurrentUser && "(You)"}</span>
                                  <span className="text-[10px] text-slate-400">{leader.field}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-medium text-slate-300">{leader.city}</td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-400">{(leader.avu_balance || 0).toLocaleString()} AVU</td>
                            <td className="p-4 text-right font-mono font-bold text-white">{leader.points.toLocaleString()} pts</td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${leader.badgeColor}`}>
                                {leader.rankTitle}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "profile" && profile && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AmbassadorProfile profile={profile} onProfileUpdated={fetchAmbassadorData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fund Wallet Modal */}
      <FundWalletModal
        isOpen={isFundWalletModalOpen}
        onClose={() => setIsFundWalletModalOpen(false)}
        profile={profile}
        onSuccess={(newBal) => setAvuBalance(newBal)}
        showToast={showToast}
        fetchAmbassadorData={fetchAmbassadorData}
      />
    </div>
  );
};
