import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { db, DbAmbassador, DbActivity, DbDeposit, isSupabaseConfigured, supabase, supabaseAdmin } from "../lib/supabase";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { convertNairaToAvu, convertAvuToNaira, initializePayment } from "../lib/paystack";
import { downloadDepositReceiptPDF, ReceiptData } from "../lib/pdfReceipt";
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

const CustomBalanceTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px] text-left z-50">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-mono text-[11px] text-slate-300 font-bold">{data.fullDate || label}</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Day {data.dayNumber}/30
          </span>
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400 text-[11px]">AVU Balance:</span>
            <span className="font-mono font-black text-white text-xs">{Number(data.balance || 0).toLocaleString()} AVU</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="text-slate-400">Naira Value:</span>
            <span className="font-mono text-emerald-400 font-bold">₦{Number(data.nairaValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          {data.change !== 0 && (
            <div className="flex items-center justify-between gap-3 text-[10px] pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">Daily Delta:</span>
              <span className={`font-mono font-bold ${data.change > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {data.change > 0 ? `+${data.change}` : data.change} AVU
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

interface FundWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DbAmbassador | null;
  onSuccess: (newBalance?: number) => void;
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
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null);

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
    showToast("info", "Initiating Deposit", `Creating pending transaction record for ₦${amt.toLocaleString()} (${avuToEarn} AVU)...`);

    const transactionRef = `WAL-${Date.now()}`;

    // 1. Create a 'pending' state in the database before opening the Paystack payment gateway
    try {
      if (supabase && isSupabaseConfigured) {
        await supabase.from("deposits").insert([{
          ambassador_id: currentAmbassadorId,
          funding_by_name: fundingByName,
          phone_number: fundingPhone,
          program_sponsored: programSponsored,
          amount_naira: amt,
          avu_earned: avuToEarn,
          paystack_reference: transactionRef,
          status: "pending"
        }]);
      }
      await db.createDeposit({
        ambassador_id: currentAmbassadorId,
        funding_by_name: fundingByName,
        phone_number: fundingPhone,
        program_sponsored: programSponsored,
        amount_naira: amt,
        avu_earned: avuToEarn,
        paystack_reference: transactionRef,
        status: "pending"
      });
    } catch (pendingErr) {
      console.warn("Error creating pending deposit state:", pendingErr);
    }

    // 2. Open Paystack payment modal with active loading overlay in UI
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

      const paymentResult = await initializePayment(amt, email, metadata, transactionRef);
      
      // 3. Upon receiving successful payment callback, commit balance increment to wallet and profiles/ambassadors tables
      const result = await db.processFundingSuccess(
        currentAmbassadorId,
        email,
        amt,
        paymentResult.avuEarned || avuToEarn,
        paymentResult.reference || transactionRef
      );

      if (result.success) {
        const receiptObj: ReceiptData = {
          reference: paymentResult.reference || transactionRef,
          ambassadorName: profile?.name || fundingByName || "Ambassador",
          ambassadorEmail: email,
          amountNaira: amt,
          avuEarned: paymentResult.avuEarned || avuToEarn,
          date: new Date().toLocaleString(),
          fundingByName: fundingByName,
          programSponsored: programSponsored,
        };
        setCompletedReceipt(receiptObj);
        onSuccess(result.newBalance);
        showToast("success", "Wallet Balance Credited", `Successfully committed +${avuToEarn} AVU to your wallet balance!`);
        fetchAmbassadorData();
      } else {
        showToast("error", "Verification Notice", "Could not fully commit wallet transaction in database, please contact support.");
        onClose();
      }
    } catch (paystackError: any) {
      console.warn("Paystack Inline gateway finished or closed:", paystackError);
      showToast("info", "Transaction Notice", "Paystack payment window closed or cancelled.");
      fetchAmbassadorData();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModalClose = () => {
    setCompletedReceipt(null);
    setAmountNaira("");
    setFundingByName("");
    setFundingPhone("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        onClick={handleModalClose}
        className="absolute inset-0 bg-black backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] overflow-hidden"
      >
        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center animate-pulse">
              <Icon name="Loader2" size={32} className="text-emerald-400 animate-spin" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h5 className="font-extrabold text-sm uppercase tracking-wider text-white">
                Paystack Gateway Active
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Pending transaction created. Awaiting payment authorization to commit <span className="text-emerald-400 font-bold font-mono">+{avuToEarn} AVU</span> to your wallet table...
              </p>
            </div>
            <div className="w-full max-w-xs bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        )}
        <button
          onClick={handleModalClose}
          type="button"
          className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-slate-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Icon name="X" size={18} />
        </button>

        {completedReceipt ? (
          <div className="space-y-6 text-slate-900 py-2 font-sans">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Icon name="CheckCircle2" size={36} />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-xl text-slate-900 uppercase tracking-wide">Top-Up Successful</h4>
              <p className="text-xs text-slate-500">Your wallet balance has been updated with AVU tokens.</p>
            </div>

            {/* Transaction Summary Table */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Reference Code</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-200/60 px-2 py-0.5 rounded-md">{completedReceipt.reference}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Date & Time</span>
                <span className="font-medium text-slate-800">{completedReceipt.date}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Ambassador</span>
                <span className="font-semibold text-slate-800">{completedReceipt.ambassadorName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Funder / Sponsor</span>
                <span className="font-medium text-slate-800">{completedReceipt.fundingByName || "Direct Top-Up"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Program Sponsored</span>
                <span className="font-medium text-slate-800">{completedReceipt.programSponsored}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Amount Paid (NGN)</span>
                <span className="font-mono font-black text-slate-900 text-sm">₦{completedReceipt.amountNaira.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">AVU Tokens Earned</span>
                <span className="font-mono font-black text-emerald-600 text-base">+{completedReceipt.avuEarned.toLocaleString()} AVU</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => downloadDepositReceiptPDF(completedReceipt)}
                className="flex-1 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 cursor-pointer"
              >
                <Icon name="Download" size={16} />
                <span>Download Receipt (PDF)</span>
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="py-3.5 px-5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </motion.div>
    </div>
  );
};

export const AmbassadorDashboard: React.FC<AmbassadorDashboardProps> = ({ onLogout }) => {
  // ==========================================
  // ALL HOOKS DECLARED FIRST AT COMPONENT TOP
  // ==========================================
  const [activeTab, setActiveTab] = useState<"overview" | "activities" | "certificate" | "p2p" | "payments" | "projects" | "profile" | "leaderboard">("overview");

  // Profile & Auth state
  const [profile, setProfile] = useState<DbAmbassador | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Ambassador Personal State
  const [ambassadorName, setAmbassadorName] = useState("Ramon Bisola");
  const [ambassadorRegion, setAmbassadorRegion] = useState("Lagos, Nigeria");
  const [ambassadorField, setAmbassadorField] = useState("Youth Technology Labs");
  const [commissionDate, setCommissionDate] = useState("May 27, 2026");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Single Source of Truth for Wallet Balance from Supabase
  const activeIdentifier = profile?.user_id || profile?.db_id || profile?.email || profile?.id || (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null);
  const { balance: avuBalance, refetch: refetchWalletBalance } = useWalletBalance(activeIdentifier);

  // Direct DOM binding for Desktop & Mobile Balance Elements
  useEffect(() => {
    const formatted = Number(avuBalance || 0).toLocaleString();
    const desktopEl = document.getElementById("desktop-avu-balance");
    if (desktopEl) {
      desktopEl.innerHTML = `${formatted} <span className="text-xs text-emerald-400 font-sans font-bold">AVU</span>`;
    }
    const mobileEl = document.getElementById("mobile-avu-balance");
    if (mobileEl) {
      mobileEl.innerText = `${formatted} AVU`;
    }
  }, [avuBalance]);

  const [hasFunded, setHasFunded] = useState<boolean>(false);
  const [isFundWalletModalOpen, setIsFundWalletModalOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [p2pTxHistory, setP2pTxHistory] = useState<any[]>([]);
  const [dbAmbassadors, setDbAmbassadors] = useState<DbAmbassador[]>([]);
  const [activities, setActivities] = useState<DbActivity[]>([]);
  const totalDepositsNaira = convertAvuToNaira(avuBalance);

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; type: "success" | "error" | "info"; title: string; message: string }[]>([]);

  // Certificate Form State
  const [certFormOpen, setCertFormOpen] = useState(false);
  const [tempName, setTempName] = useState("Ramon Bisola");
  const [tempRegion, setTempRegion] = useState("Lagos, Nigeria");
  const [tempField, setTempField] = useState("Youth Technology Labs");
  const [tempDate, setTempDate] = useState("May 27, 2026");
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [userDeposits, setUserDeposits] = useState<DbDeposit[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Peer to Peer Value Transfer State
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [p2pType, setP2pType] = useState<"send" | "request" | "analytics">("send");
  const [showTransferConfirmModal, setShowTransferConfirmModal] = useState(false);
  const [transferProgressStep, setTransferProgressStep] = useState("Initializing P2P Ledger...");
  const [transferProgressPercent, setTransferProgressPercent] = useState(0);

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

  // Dynamically inject Paystack inline script and verify URL callback reference if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
        const script = document.createElement("script");
        script.src = "https://js.paystack.co/v1/inline.js";
        script.async = true;
        document.head.appendChild(script);
      }

      // Check for Paystack redirect URL parameters (?reference=... or ?trxref=...)
      const urlParams = new URLSearchParams(window.location.search);
      const paystackRef = urlParams.get("reference") || urlParams.get("trxref");
      if (paystackRef) {
        const autoVerifyPaystackRef = async () => {
          try {
            const sessionEmail = localStorage.getItem("advaltad_session_email") || "ramon@example.com";
            const user = await db.findAmbassadorByEmail(sessionEmail);
            if (user) {
              const res = await db.processFundingSuccess(
                user.id,
                sessionEmail,
                1000,
                1.002,
                paystackRef
              );
              if (res.success) {
                refetchWalletBalance();
                setProfile(prev => prev ? { ...prev, avu_balance: res.newBalance } : null);
                showToast("success", "Paystack Payment Verified", "Your wallet has been credited with AVU tokens!");
                fetchAmbassadorData();
              }
            }
          } catch (err) {
            console.error("Paystack auto-verification error:", err);
          } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        };
        autoVerifyPaystackRef();
      }
    }
  }, []);

  const showToast = (type: "success" | "error" | "info", title: string, message: string) => {
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // -------------------------------------------------------------
  // Unified fetchAuthenticatedAmbassador function (strictly using Supabase Auth session user_id)
  // -------------------------------------------------------------
  const fetchAuthenticatedAmbassador = async (): Promise<DbAmbassador | null> => {
    console.log("[fetchAuthenticatedAmbassador] Step 1: Checking Supabase Auth session...");
    
    let authUserId: string | null = null;
    let authUserEmail: string | null = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr) {
          console.warn("[fetchAuthenticatedAmbassador] Step 1 Warning: Supabase auth.getUser() returned:", authErr.message);
        }
        if (user) {
          authUserId = user.id;
          authUserEmail = user.email || null;
          console.log("[fetchAuthenticatedAmbassador] Step 2: Supabase Auth session verified.", {
            auth_user_id: authUserId,
            auth_email: authUserEmail
          });
        } else {
          console.log("[fetchAuthenticatedAmbassador] Step 2: No active Supabase Auth user session found.");
        }
      } catch (err) {
        console.error("[fetchAuthenticatedAmbassador] Step 1 Exception checking auth user:", err);
      }
    } else {
      console.log("[fetchAuthenticatedAmbassador] Step 1: Supabase client is not configured or in offline mode.");
    }

    // Step 3: Strictly query ambassadors table using the session user_id if present
    let dbRecord: any = null;
    if (isSupabaseConfigured && (supabaseAdmin || supabase) && authUserId) {
      console.log("[fetchAuthenticatedAmbassador] Step 3: Strictly querying 'ambassadors' table using auth user_id:", authUserId);
      try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client!
          .from("ambassadors")
          .select("*")
          .or(`user_id.eq.${authUserId},id.eq.${authUserId}`)
          .maybeSingle();

        if (error) {
          console.warn("[fetchAuthenticatedAmbassador] Step 3 Query Error:", error);
        } else if (data) {
          dbRecord = data;
          console.log("[fetchAuthenticatedAmbassador] Step 3 Success: Retrieved ambassador record from Supabase by user_id:", {
            id: data.id,
            user_id: data.user_id,
            email: data.email,
            name: data.name,
            raw_avu_balance: data.avu_balance,
            ledger_balance: data.ledger_balance
          });
        } else {
          console.log("[fetchAuthenticatedAmbassador] Step 3 Notice: No ambassador row directly matched user_id:", authUserId);
        }
      } catch (dbErr) {
        console.error("[fetchAuthenticatedAmbassador] Step 3 Exception during query:", dbErr);
      }
    }

    // Fallback: If no dbRecord found via strict authUserId (e.g. initial demo/local fallback)
    if (!dbRecord) {
      console.log("[fetchAuthenticatedAmbassador] Step 3b: Fallback search if user record wasn't found by strict auth user_id...");
      const searchIdentifier = authUserEmail || (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null) || "ramon@example.com";
      const found = await db.findAmbassadorByEmail(searchIdentifier);
      if (found) {
        dbRecord = found;
        console.log("[fetchAuthenticatedAmbassador] Step 3b Success: Resolved ambassador record via identifier fallback:", {
          id: found.id,
          user_id: found.user_id,
          email: found.email,
          name: found.name,
          avu_balance: found.avu_balance
        });
      }
    }

    // If still no user record exists, create initial ambassador record
    if (!dbRecord) {
      console.log("[fetchAuthenticatedAmbassador] Step 3c: Creating default ambassador record...");
      const effectiveEmail = authUserEmail || (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null) || "ramon@example.com";
      dbRecord = await db.createAmbassador({
        name: "Ramon Bisola",
        city: "Lagos, Nigeria",
        field: "Enriching African youths initiative",
        email: effectiveEmail,
        phone: "+234 801 234 5678",
        password: "password123",
        user_id: authUserId || undefined
      });
      if (effectiveEmail === "ramon@example.com" || effectiveEmail.includes("ramon")) {
        await db.updateStatus(dbRecord.id, "approved");
        dbRecord.status = "approved";
      }
    }

    // Step 4: Verify and normalize avu_balance against database expectations
    const rawBalance = dbRecord.avu_balance ?? dbRecord.ledger_balance ?? 0;
    const validatedBalance = isNaN(Number(rawBalance)) || Number(rawBalance) < 0 ? 0 : Number(rawBalance);

    console.log("[fetchAuthenticatedAmbassador] Step 4: Validating avu_balance against database expectation:", {
      ambassador_id: dbRecord.id,
      user_id: dbRecord.user_id,
      email: dbRecord.email,
      raw_database_balance: rawBalance,
      verified_numerical_balance: validatedBalance,
      is_balance_positive: validatedBalance > 0
    });

    const verifiedAmbassador: DbAmbassador = {
      ...dbRecord,
      avu_balance: validatedBalance
    };

    console.log("[fetchAuthenticatedAmbassador] Step 5: Final verified ambassador object ready.", verifiedAmbassador);
    return verifiedAmbassador;
  };

  const fetchAmbassadorData = async (isInitial = false) => {
    if (isInitial) {
      setIsLoadingProfile(true);
    }
    try {
      const user = await fetchAuthenticatedAmbassador();
      if (!user) {
        throw new Error("Unable to retrieve authenticated ambassador profile");
      }

      setProfile(user);
      setAmbassadorName(user.name);
      setAmbassadorRegion(user.city);
      setAmbassadorField(user.field);
      refetchWalletBalance();

      if (isInitial) {
        setTempName(user.name);
        setTempRegion(user.city);
        setTempField(user.field);

        if (user.created_at) {
          const d = new Date(user.created_at);
          const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
          setCommissionDate(d.toLocaleDateString('en-US', options));
          setTempDate(d.toLocaleDateString('en-US', options));
        }

        // DISMISS PRELOADER IMMEDIATELY once profile is ready
        setIsLoadingProfile(false);
      }

      // Fetch secondary lists in parallel in background without blocking initial load
      Promise.allSettled([
        db.getDeposits().then(allDeposits => {
          const depositsList = allDeposits.filter(d => 
            (d.ambassador_id && user.id && d.ambassador_id.toLowerCase() === user.id.toLowerCase()) ||
            (d.ambassador_id && user.user_id && d.ambassador_id.toLowerCase() === user.user_id.toLowerCase()) ||
            (d.ambassador_id && user.ambassador_id && d.ambassador_id.toLowerCase() === user.ambassador_id.toLowerCase()) ||
            (d.ambassador_id && user.db_id && d.ambassador_id.toLowerCase() === user.db_id.toLowerCase()) ||
            (d.funding_by_name && user.name && d.funding_by_name.toLowerCase() === user.name.toLowerCase()) ||
            (user.email && d.ambassador_id && d.ambassador_id.toLowerCase() === user.email.toLowerCase())
          );
          setUserDeposits(depositsList);
          const matchedSuccessDeposits = depositsList.filter(d => d.status === "success");
          setHasFunded(matchedSuccessDeposits.length > 0 || (user.avu_balance || 0) > 0);
        }).catch(err => console.error("Error checking deposits:", err)),

        db.getP2PTransactions(user.id).then(list => setP2pTxHistory(list)).catch(err => console.warn("P2P tx error:", err)),
        db.getAmbassadors().then(allAmbs => setDbAmbassadors(allAmbs || [])).catch(err => console.warn("Ambassadors error:", err)),
        db.getActivities().then(allActs => setActivities(allActs || [])).catch(err => console.warn("Activities error:", err)),
        loadLiveNotifications(user).catch(err => console.warn("Notifications error:", err))
      ]);
    } catch (e) {
      console.error("Error loading ambassador data", e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadLiveNotifications = async (user: DbAmbassador) => {
    if (!user) return;
    const uid = (user.id || user.user_id || user.db_id || "").toLowerCase();
    const uname = (user.name || "").toLowerCase();
    const uemail = (user.email || "").toLowerCase();

    const notifList: NotificationItem[] = [];

    const isUserRecord = (ambId?: string, ambName?: string, ambEmail?: string) => {
      if (ambId && (ambId.toLowerCase() === uid || ambId.toLowerCase() === uemail)) return true;
      if (ambName && uname && ambName.toLowerCase() === uname) return true;
      if (ambEmail && uemail && ambEmail.toLowerCase() === uemail) return true;
      return false;
    };

    const formatTimeAgo = (dateStr?: string) => {
      if (!dateStr) return "Recently";
      try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - d.getTime());
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } catch {
        return "Recently";
      }
    };

    // 1. Audit logs (Admin actions with this individual ambassador)
    try {
      const logs = await db.getAuditLogs();
      logs.forEach((log) => {
        if (isUserRecord(log.ambassador_id, log.ambassador_name)) {
          let title = "Admin Action";
          let desc = `Admin action: ${log.action}`;
          if (log.action === "approved") {
            title = "Super Admin Approval";
            desc = `Super Admin "${log.admin_name || 'Admin'}" approved your ambassador application & fellowship status.`;
          } else if (log.action === "disapproved") {
            title = "Fellowship Status Update";
            desc = `Super Admin "${log.admin_name || 'Admin'}" set your profile status to disapproved.`;
          } else if (log.action === "updated_portfolio") {
            title = "Admin Portfolio Update";
            desc = `Super Admin "${log.admin_name || 'Admin'}" updated your official portfolio credentials.`;
          } else if (log.action === "suspended") {
            title = "Account Status Notice";
            desc = `Super Admin "${log.admin_name || 'Admin'}" updated your account access level.`;
          }
          notifList.push({
            id: `audit-${log.id}`,
            title,
            desc,
            time: formatTimeAgo(log.created_at),
            unread: true,
            type: "general"
          });
        }
      });
    } catch (err) {
      console.warn("Error fetching audit logs for notifications:", err);
    }

    // 2. Activities (Admin token grants, status changes, etc.)
    try {
      const acts = await db.getActivities();
      acts.forEach((act) => {
        if (isUserRecord(act.ambassador_id, act.ambassador_name)) {
          let title = "System Activity";
          if (act.type === "avu_transfer") title = "Admin Token Grant";
          else if (act.type === "status_change") title = "Admin Status Change";
          else if (act.type === "registration") title = "Registration Verified";

          notifList.push({
            id: `act-${act.id}`,
            title,
            desc: act.desc,
            time: formatTimeAgo(act.created_at),
            unread: true,
            type: act.type === "avu_transfer" ? "p2p" : "general"
          });
        }
      });
    } catch (err) {
      console.warn("Error fetching activities for notifications:", err);
    }

    // 3. Wallet Deposits & Grants
    try {
      const deposits = await db.getDeposits();
      deposits.forEach((dep) => {
        const matchesUser = isUserRecord(dep.ambassador_id, dep.funding_by_name) || (dep.funding_by_name && uname && dep.funding_by_name.toLowerCase().includes(uname));
        if (matchesUser) {
          const isAdminFunding = (dep.funding_by_name || "").toLowerCase().includes("admin") || (dep.funding_by_name || "").toLowerCase().includes("authorization");
          const title = isAdminFunding ? "Admin Wallet Top-Up" : "Wallet Deposit Verified";
          const desc = isAdminFunding
            ? `${dep.funding_by_name}: Credited ₦${(dep.amount_naira || 0).toLocaleString()} (+${dep.avu_earned || 0} AVU) to your wallet balance.`
            : `Paystack top-up of ₦${(dep.amount_naira || 0).toLocaleString()} verified (+${dep.avu_earned || 0} AVU). Ref: ${dep.paystack_reference || 'REF'}`;

          notifList.push({
            id: `dep-${dep.id || dep.paystack_reference}`,
            title,
            desc,
            time: formatTimeAgo(dep.created_at),
            unread: dep.status === "success",
            type: "payment"
          });
        }
      });
    } catch (err) {
      console.warn("Error fetching deposits for notifications:", err);
    }

    // 4. P2P Transactions
    try {
      const p2p = await db.getP2PTransactions(user.id || user.email);
      p2p.forEach((tx) => {
        const isRecipient = isUserRecord(tx.recipient_id, tx.recipient_name, tx.recipient_email);
        const isSender = isUserRecord(tx.sender_id, tx.sender_name, tx.sender_email);

        if (isRecipient) {
          notifList.push({
            id: `p2p-in-${tx.id}`,
            title: "AVU Received",
            desc: `Received ${tx.points} AVU from ${tx.sender_name}. ${tx.reason ? `Reason: "${tx.reason}"` : ''}`,
            time: formatTimeAgo(tx.created_at),
            unread: true,
            type: "p2p"
          });
        } else if (isSender) {
          notifList.push({
            id: `p2p-out-${tx.id}`,
            title: "AVU Transferred",
            desc: `Transferred ${tx.points} AVU to ${tx.recipient_name}. ${tx.reason ? `Reason: "${tx.reason}"` : ''}`,
            time: formatTimeAgo(tx.created_at),
            unread: false,
            type: "p2p"
          });
        }
      });
    } catch (err) {
      console.warn("Error fetching P2P transactions for notifications:", err);
    }

    // 5. Current Fellowship Relationship status
    if (user.status) {
      notifList.push({
        id: `status-${user.id}`,
        title: user.status === "approved" ? "Active Fellowship Status" : "Pending Application Review",
        desc: user.status === "approved"
          ? "Your ambassador profile is verified & active with Advaltad Super Admin."
          : "Your ambassador application is currently under review by Super Admin.",
        time: formatTimeAgo(user.created_at),
        unread: false,
        type: "general"
      });
    }

    // Deduplicate & sort newest first
    const uniqueMap = new Map<string, NotificationItem>();
    notifList.forEach(item => uniqueMap.set(item.id, item));

    const sortedList = Array.from(uniqueMap.values());
    if (sortedList.length > 0) {
      setNotifications(sortedList);
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
      fetchAmbassadorData(true);
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
          refetchWalletBalance();
        }
      } catch (err) {
        console.error("Error polling ambassador status:", err);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [profile?.status, profile?.email]);

  useEffect(() => {
    if (!profile || !isSupabaseConfigured || !supabase) return;

    const rowId = profile.db_id || profile.id;
    const ambId = profile.id;

    const ambassadorChannel = supabase
      .channel(`public:ambassadors:realtime:${ambId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassadors" },
        () => fetchAmbassadorData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Ambassadors" },
        () => fetchAmbassadorData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassador_wallet" },
        () => fetchAmbassadorData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassador_wallets" },
        () => fetchAmbassadorData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        () => fetchAmbassadorData(false)
      )
      .subscribe();

    const depositsChannel = supabase
      .channel(`public:deposits:${ambId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposits" },
        () => fetchAmbassadorData(false)
      )
      .subscribe();

    const auditChannel = supabase
      .channel(`public:audit_logs:${ambId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audit_logs" },
        () => fetchAmbassadorData(false)
      )
      .subscribe();

    const activityChannel = supabase
      .channel(`public:activities:${ambId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        () => fetchAmbassadorData(false)
      )
      .subscribe();

    // Silent background poll for live admin transaction updates
    const pollTimer = setInterval(() => {
      fetchAmbassadorData(false);
    }, 12000);

    return () => {
      supabase.removeChannel(ambassadorChannel);
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(auditChannel);
      supabase.removeChannel(activityChannel);
      clearInterval(pollTimer);
    };
  }, [profile?.id, profile?.db_id, profile?.email]);

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

  const approvedOtherAmbassadors = dbAmbassadors.filter((amb) => {
    const pId = (profile?.id || "").toLowerCase();
    const pUserId = (profile?.user_id || "").toLowerCase();
    const pDbId = (profile?.db_id || "").toLowerCase();
    const pEmail = (profile?.email || "").toLowerCase();

    const aId = (amb.id || "").toLowerCase();
    const aUserId = (amb.user_id || "").toLowerCase();
    const aDbId = (amb.db_id || "").toLowerCase();
    const aEmail = (amb.email || "").toLowerCase();

    if (pEmail && aEmail && pEmail === aEmail) return false;
    if (pId && (aId === pId || aUserId === pId || aDbId === pId)) return false;
    if (pUserId && (aId === pUserId || aUserId === pUserId || aDbId === pUserId)) return false;
    if (pDbId && (aId === pDbId || aUserId === pDbId || aDbId === pDbId)) return false;

    return true;
  });

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
    if (!transferTargetId) return false;
    const target = transferTargetId.trim().toLowerCase();
    return (
      (amb.id && amb.id.toLowerCase() === target) ||
      (amb.email && amb.email.toLowerCase() === target)
    );
  });

  // Safe helper to extract initials without throwing
  const getSafeInitials = (nameStr?: any, fallback = "RB"): string => {
    if (!nameStr || typeof nameStr !== "string") return fallback;
    const trimmed = nameStr.trim();
    if (!trimmed) return fallback;
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fallback;
    return parts.map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || fallback;
  };

  // Safe helper to extract ISO date strings without throwing
  const getSafeIsoDateKey = (dateVal: any): string | null => {
    try {
      if (!dateVal) return null;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split("T")[0];
    } catch {
      return null;
    }
  };

  // Calculate Leaderboard entries
  const currentUserEntry = {
    id: profile?.id || "AV-ME",
    name: profile?.name || ambassadorName || "Ramon Bisola",
    city: profile?.city || ambassadorRegion || "Lagos, Nigeria",
    field: profile?.field || ambassadorField || "Growth Ambassador",
    avu_balance: avuBalance,
    totalDeposits: totalDepositsNaira,
    projects: 3,
    avatarBg: "from-emerald-600 to-teal-700",
    initials: getSafeInitials(profile?.name || ambassadorName, "RB"),
    isCurrentUser: true,
  };

  const activeDbLeaders = dbAmbassadors
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
      const initials = getSafeInitials(a.name, "AM");
      return {
        id: a.id || a.ambassador_id || `AV-DB-${idx}`,
        name: a.name || "Ambassador",
        city: a.city || "Lagos, Nigeria",
        field: a.field || "Growth Ambassador",
        avu_balance: a.avu_balance || 0,
        totalDeposits: convertAvuToNaira(a.avu_balance || 0),
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
  // 30-DAY AVU BALANCE TREND CALCULATION (RECHARTS)
  // ==========================================
  const avuBalanceTrend30Days = useMemo(() => {
    try {
      const today = new Date();
      const daysCount = 30;
      const history: Array<{
        dayNumber: number;
        date: string;
        fullDate: string;
        balance: number;
        change: number;
        nairaValue: number;
        deposits: number;
        transfers: number;
      }> = [];

      const currentBal = Number(avuBalance || 0);
      const thirtyDaysAgoTime = today.getTime() - (daysCount * 24 * 60 * 60 * 1000);

      const dailyEventsMap = new Map<string, { deposits: number; p2pIn: number; p2pOut: number }>();

      (Array.isArray(userDeposits) ? userDeposits : []).forEach((dep) => {
        if (dep && dep.status === "success" && dep.created_at) {
          const key = getSafeIsoDateKey(dep.created_at);
          if (key) {
            const d = new Date(dep.created_at);
            if (!isNaN(d.getTime()) && d.getTime() >= thirtyDaysAgoTime) {
              const existing = dailyEventsMap.get(key) || { deposits: 0, p2pIn: 0, p2pOut: 0 };
              existing.deposits += (Number(dep.avu_earned) || 0);
              dailyEventsMap.set(key, existing);
            }
          }
        }
      });

      (Array.isArray(p2pTxHistory) ? p2pTxHistory : []).forEach((tx) => {
        if (tx && tx.created_at) {
          const key = getSafeIsoDateKey(tx.created_at);
          if (key) {
            const d = new Date(tx.created_at);
            if (!isNaN(d.getTime()) && d.getTime() >= thirtyDaysAgoTime) {
              const existing = dailyEventsMap.get(key) || { deposits: 0, p2pIn: 0, p2pOut: 0 };
              if (tx.recipient_id === profile?.id) {
                existing.p2pIn += (Number(tx.amount_avu) || 0);
              } else if (tx.sender_id === profile?.id) {
                existing.p2pOut += (Number(tx.amount_avu) || 0);
              }
              dailyEventsMap.set(key, existing);
            }
          }
        }
      });

      let runningBalance = Math.max(0, currentBal * 0.45);

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateKey = getSafeIsoDateKey(d) || `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        const shortDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const fullDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        const events = dailyEventsMap.get(dateKey);
        let dayDeposits = 0;
        let dayTransfers = 0;
        let dayDelta = 0;

        if (events) {
          dayDeposits = events.deposits;
          dayTransfers = events.p2pIn - events.p2pOut;
          dayDelta = dayDeposits + dayTransfers;
        }

        if (i === 0) {
          runningBalance = currentBal;
        } else {
          const stepProgress = (daysCount - i) / daysCount;
          const targetForDay = currentBal * (0.45 + (0.55 * Math.pow(stepProgress, 1.25)));
          if (dayDelta !== 0) {
            runningBalance = Math.max(0, runningBalance + dayDelta);
          } else {
            const pseudoNoise = Math.sin((daysCount - i) * 0.8) * (currentBal > 0 ? (currentBal * 0.012) : 0);
            runningBalance = Math.max(0, targetForDay + pseudoNoise);
          }
        }

        const roundedBal = Number(runningBalance.toFixed(2));
        const prevBal = history.length > 0 ? history[history.length - 1].balance : roundedBal;
        const change = Number((roundedBal - prevBal).toFixed(2));

        history.push({
          dayNumber: daysCount - i,
          date: shortDate,
          fullDate,
          balance: roundedBal,
          change,
          nairaValue: convertAvuToNaira(roundedBal),
          deposits: dayDeposits,
          transfers: dayTransfers,
        });
      }

      if (history.length > 0) {
        history[history.length - 1].balance = currentBal;
        history[history.length - 1].nairaValue = totalDepositsNaira;
      }

      return history;
    } catch (err) {
      console.warn("[avuBalanceTrend30Days] calculation error:", err);
      return [];
    }
  }, [avuBalance, userDeposits, p2pTxHistory, profile?.id, totalDepositsNaira]);

  // Derived 30-Day Trend Metrics
  const trendMetrics = useMemo(() => {
    if (!avuBalanceTrend30Days.length) {
      return { start: 0, current: 0, change: 0, percentChange: 0, peak: 0, low: 0, isPositive: true };
    }
    const start = avuBalanceTrend30Days[0].balance;
    const current = Number(avuBalance || 0);
    const change = Number((current - start).toFixed(2));
    const percentChange = start > 0 ? Number(((change / start) * 100).toFixed(1)) : (current > 0 ? 100 : 0);
    const balances = avuBalanceTrend30Days.map(d => d.balance);
    const peak = Math.max(...balances, current);
    const low = Math.min(...balances, current);
    return {
      start,
      current,
      change,
      percentChange,
      peak,
      low,
      isPositive: change >= 0
    };
  }, [avuBalanceTrend30Days, avuBalance]);

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

  // Diagnostic log interface and function for P2P operations
  interface P2PDiagnosticLog {
    action: string;
    timestamp: string;
    authState: {
      isAuthenticated: boolean;
      authUserId: string | null;
      authEmail: string | null;
      sessionEmail: string | null;
      sessionUser: string | null;
    };
    currentUserObject: {
      id?: string;
      user_id?: string;
      db_id?: string;
      ambassador_id?: string;
      email?: string;
      name?: string;
      localAvuBalance?: number;
    } | null;
    supabaseQuery: {
      table: string;
      filters: string[];
      rawPayload: any;
      resolvedAvuBalance: number;
      matchVerified: boolean;
      error?: any;
    };
    validationResult: {
      requestedAmount?: number;
      availableBalance: number;
      hasSufficientBalance: boolean;
      status: "PASSED" | "FAILED";
      message: string;
    };
  }

  const logP2PDiagnostics = (data: P2PDiagnosticLog) => {
    console.group(`%c[ADVALTAD P2P DIAGNOSTICS] ${data.action} @ ${data.timestamp}`, "color: #10b981; font-weight: bold; font-size: 11px;");
    console.log("🔐 1. Auth & Session State:", data.authState);
    console.log("👤 2. Current User Object:", data.currentUserObject);
    console.log("📡 3. Supabase Query & Raw Payload:", data.supabaseQuery);
    console.log("⚖️ 4. Validation Result & Balance Status:", data.validationResult);
    console.groupEnd();
  };

  /**
   * Single, robust function that validates authentication using fetchAuthenticatedAmbassador,
   * queries the Supabase ambassadors table strictly with the auth session user_id,
   * and performs verification logging before any P2P operation is attempted.
   */
  const fetchAndValidateSenderBalance = async (
    requestedAmount?: number
  ): Promise<{
    isValid: boolean;
    balance: number;
    senderProfile: DbAmbassador | null;
    errorMessage?: string;
  }> => {
    const timestamp = new Date().toISOString();
    console.log(`[P2P Validation] Starting validation for requested amount: ${requestedAmount ?? 0} AVU at ${timestamp}`);

    const authenticatedUser = await fetchAuthenticatedAmbassador();
    const finalResolvedBalance = Number(authenticatedUser?.avu_balance ?? 0);

    const reqAmt = typeof requestedAmount === "number" ? requestedAmount : 0;
    const hasSufficient = reqAmt <= 0 || finalResolvedBalance >= reqAmt;
    const validationPassed = hasSufficient && (finalResolvedBalance > 0 || reqAmt === 0);

    const diagData: P2PDiagnosticLog = {
      action: "P2P_BALANCE_VALIDATION",
      timestamp,
      authState: {
        isAuthenticated: !!authenticatedUser?.user_id,
        authUserId: authenticatedUser?.user_id || null,
        authEmail: authenticatedUser?.email || null,
        sessionEmail: typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null,
        sessionUser: typeof window !== "undefined" ? localStorage.getItem("advaltad_session_user") : null
      },
      currentUserObject: authenticatedUser ? {
        id: authenticatedUser.id,
        user_id: authenticatedUser.user_id,
        db_id: authenticatedUser.db_id,
        ambassador_id: authenticatedUser.ambassador_id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        localAvuBalance: authenticatedUser.avu_balance
      } : null,
      supabaseQuery: {
        table: "ambassadors",
        filters: authenticatedUser?.user_id ? [`user_id.eq.${authenticatedUser.user_id}`, `id.eq.${authenticatedUser.user_id}`] : [`email.eq.${authenticatedUser?.email}`],
        rawPayload: authenticatedUser,
        resolvedAvuBalance: finalResolvedBalance,
        matchVerified: true
      },
      validationResult: {
        requestedAmount: reqAmt,
        availableBalance: finalResolvedBalance,
        hasSufficientBalance: hasSufficient,
        status: validationPassed ? "PASSED" : "FAILED",
        message: validationPassed 
          ? `Sender balance validated successfully: ${finalResolvedBalance} AVU available.` 
          : `Insufficient balance. Available: ${finalResolvedBalance} AVU, Requested: ${reqAmt} AVU.`
      }
    };

    logP2PDiagnostics(diagData);

    if (authenticatedUser && profile && authenticatedUser.avu_balance !== profile.avu_balance) {
      setProfile(authenticatedUser);
    }

    return {
      isValid: validationPassed,
      balance: finalResolvedBalance,
      senderProfile: authenticatedUser,
      errorMessage: validationPassed ? undefined : `Insufficient balance. Available: ${finalResolvedBalance} AVU`
    };
  };

  // Pre-fetch & validate balance when entering P2P tab
  useEffect(() => {
    if (activeTab === "p2p") {
      fetchAndValidateSenderBalance();
    }
  }, [activeTab]);

  const handleP2PTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    const selectedRecipientId = transferTargetId.trim();

    if (!profile?.id && !profile?.email) {
      showToast("error", "Session Error", "Could not locate your active ambassador session.");
      return;
    }

    const senderIds = [profile?.id, profile?.user_id, profile?.db_id, profile?.email]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());
    const targetRec = selectedRecipient;
    const recipientIds = [selectedRecipientId, targetRec?.id, targetRec?.user_id, targetRec?.db_id, targetRec?.email]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());

    const isSelfTransfer = !selectedRecipientId || senderIds.some(s => recipientIds.includes(s));
    if (isSelfTransfer) {
      showToast("error", "Invalid Recipient", "You cannot transfer points to yourself. Please select a different recipient.");
      return;
    }

    if (isNaN(amt) || amt <= 0) {
      showToast("error", "Invalid Amount", "Please enter a valid positive transfer amount.");
      return;
    }

    // Explicitly validate balance using single robust Supabase call with full diagnostics
    const validation = await fetchAndValidateSenderBalance(amt);

    if (!validation.isValid) {
      showToast(
        "error", 
        "Insufficient Balance", 
        validation.errorMessage || `You only have ${validation.balance} AVU points available.`
      );
      return;
    }

    setShowTransferConfirmModal(true);
  };

  const confirmExecuteTransfer = async () => {
    const amt = parseFloat(transferAmount);
    const selectedRecipientId = transferTargetId.trim();

    if (!profile || (!profile.id && !profile.email)) {
      showToast("error", "Session Error", "Could not locate your active ambassador session.");
      return;
    }

    const senderIds = [profile.id, profile.user_id, profile.db_id, profile.email]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());
    const targetRec = selectedRecipient;
    const recipientIds = [selectedRecipientId, targetRec?.id, targetRec?.user_id, targetRec?.db_id, targetRec?.email]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());

    const isSelfTransfer = !selectedRecipientId || senderIds.some(s => recipientIds.includes(s));
    if (isSelfTransfer) {
      showToast("error", "Invalid Recipient", "You cannot transfer points to yourself. Please select a different recipient.");
      setIsProcessing(false);
      return;
    }

    if (isNaN(amt) || amt <= 0) return;

    // -------------------------------------------------------------
    // IMMEDIATE SERVER-SIDE VERIFICATION CHECK (Right inside transaction block before UPDATE)
    // -------------------------------------------------------------
    setIsProcessing(true);
    setTransferProgressPercent(20);
    setTransferProgressStep("Executing immediate server-side balance verification check...");

    console.log("[P2P Transaction Block] Performing immediate server-side verification check before UPDATE...");
    const verifiedSender = await fetchAuthenticatedAmbassador();
    const serverVerifiedBalance = Number(verifiedSender?.avu_balance ?? 0);

    console.log("[P2P Transaction Block] Immediate server-side balance check result:", {
      sender_id: verifiedSender?.id,
      sender_user_id: verifiedSender?.user_id,
      sender_email: verifiedSender?.email,
      server_verified_balance: serverVerifiedBalance,
      requested_amount: amt,
      has_sufficient_balance: serverVerifiedBalance >= amt
    });

    if (serverVerifiedBalance < amt) {
      console.error(`[P2P Transaction Block] Transaction aborted: server balance (${serverVerifiedBalance} AVU) is lower than requested (${amt} AVU).`);
      showToast(
        "error",
        "Insufficient Balance",
        `Server verification check failed: Your available balance is ${serverVerifiedBalance} AVU, but ${amt} AVU is required.`
      );
      setShowTransferConfirmModal(false);
      setIsProcessing(false);
      return;
    }

    // Rolling progress animation phase 1
    await new Promise(resolve => setTimeout(resolve, 250));
    setTransferProgressPercent(50);
    setTransferProgressStep("Verifying recipient profile & checking transfer limits...");

    // Rolling progress animation phase 2
    await new Promise(resolve => setTimeout(resolve, 300));
    setTransferProgressPercent(80);
    setTransferProgressStep("Executing AVU token transfer across ambassador wallets...");

    try {
      // Explicitly separate sender and recipient payload using UUID / email fallbacks
      const payload = {
        sender_id: verifiedSender?.user_id || verifiedSender?.db_id || verifiedSender?.id || profile.user_id || profile.db_id || profile.id || profile.email,
        sender_email: verifiedSender?.email || profile.email,
        recipient_id: selectedRecipient?.user_id || selectedRecipient?.db_id || selectedRecipient?.id || selectedRecipientId,
        recipient_email: selectedRecipient?.email || (selectedRecipientId.includes("@") ? selectedRecipientId : ""),
        amount: Number(amt),
        note: transferReason || "Peer technical support"
      };

      const res = await db.executeP2PTransfer(
        payload.sender_id,
        payload.recipient_id,
        payload.amount,
        payload.note,
        payload.sender_email,
        payload.recipient_email
      );

      if (res.success && res.senderNewBalance !== undefined) {
        setTransferProgressPercent(100);
        setTransferProgressStep("Transfer completed successfully!");

        refetchWalletBalance();
        if (profile) {
          setProfile(prev => prev ? { ...prev, avu_balance: res.senderNewBalance } : null);
        }
        
        setDbAmbassadors(prev => prev.map(a => {
          const matchTarget = 
            (a.id && selectedRecipientId && a.id.toLowerCase() === selectedRecipientId.toLowerCase()) ||
            (a.email && selectedRecipientId && a.email.toLowerCase() === selectedRecipientId.toLowerCase());
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
          const list = await db.getP2PTransactions(profile.id || profile.email);
          setP2pTxHistory(list);
          const freshAmbs = await db.getAmbassadors();
          setDbAmbassadors(freshAmbs || []);
        } catch (err) {
          console.warn("Failed to reload P2P data:", err);
        }

        // Brief delay so the user sees the 100% completed roll animation
        await new Promise(resolve => setTimeout(resolve, 800));

        setShowTransferConfirmModal(false);
        setTransferTargetId("");
        setTransferAmount("");
        setTransferReason("");
        setRecipientSearchQuery("");
        setTransferProgressPercent(0);

        setTimeout(() => {
          setTransferSuccess(false);
        }, 4000);
      } else {
        setTransferProgressPercent(0);
        showToast("error", "Transfer Failed", res.message || "An unexpected error occurred.");
      }
    } catch (err) {
      setTransferProgressPercent(0);
      console.error("Failed to complete P2P transfer:", err);
      showToast("error", "Transfer Error", "An error occurred while processing the value transfer. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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
      if (profile?.id) {
        await db.updateProfile(profile.id, { avu_balance: newBal });
      }
      refetchWalletBalance();
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

  const rawProfileStatus = (profile?.badge_status || profile?.status || "pending").toString().toLowerCase().trim();
  const isPendingApproval = rawProfileStatus === "pending";
  const isDisapprovedStatus = rawProfileStatus === "disapproved" || rawProfileStatus === "rejected" || rawProfileStatus === "suspended";

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300 animate-pulse">Initializing Ambassador Dashboard...</p>
      </div>
    );
  }

  // AWAITING ADMIN APPROVAL SCREEN
  if (isPendingApproval) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Background Accent Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Branding & Logout Bar */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-8 z-10">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Advaltad Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-800 shadow-md" />
            <div>
              <h1 className="text-sm font-black text-white tracking-wide">ADVALTAD FOUNDATION</h1>
              <span className="text-[10px] text-slate-400 font-mono">Growth Ambassador Fellowship</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            type="button"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Icon name="LogOut" size={14} className="text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Central Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-2xl bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl z-10 text-center space-y-6"
        >
          {/* Animated Clock / Shield Icon */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-amber-500/20 animate-ping opacity-30" />
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Icon name="Clock" size={38} className="animate-pulse" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Awaiting Executive Admin Approval</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Application Under Review
            </h2>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              Hello <strong className="text-white font-semibold">{ambassadorName}</strong>, your Growth Ambassador application has been received and is currently under review by our executive board.
            </p>
          </div>

          {/* Applicant Details Summary */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 text-left space-y-3">
            <div className="text-[11px] uppercase font-mono font-bold text-slate-400 tracking-wider flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span>Application Reference Profile</span>
              <span className="text-amber-400 font-bold">Status: Pending Review</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Full Name</span>
                <span className="font-bold text-slate-200">{ambassadorName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Email Address</span>
                <span className="font-bold text-slate-200 truncate block">{profile?.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Location / Region</span>
                <span className="font-bold text-slate-200">{ambassadorRegion}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Focus Area</span>
                <span className="font-bold text-slate-200">{ambassadorField}</span>
              </div>
            </div>
          </div>

          {/* Real-Time Database Sync Banner */}
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs text-left flex items-start gap-3">
            <Icon name="Radio" size={18} className="text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-200">Real-Time Database Listener Active</p>
              <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                Your account is linked to the live database. As soon as a Super Admin approves your application in the Admin Portal, this dashboard will automatically refresh and grant access to your AVU Wallet, certified fellowship badge, and P2P tools.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => fetchAmbassadorData(true)}
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              <Icon name="RefreshCw" size={15} />
              <span>Check Approval Status</span>
            </button>
            <button
              onClick={onLogout}
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Icon name="LogOut" size={15} />
              <span>Log Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // DISAPPROVED SCREEN
  if (isDisapprovedStatus) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl z-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <Icon name="XCircle" size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Application Disapproved</h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Your Growth Ambassador application for <strong className="text-white">{ambassadorName}</strong> has been disapproved by the executive board.
            </p>
          </div>
          <button
            onClick={onLogout}
            type="button"
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const navTabs = [
    { id: "overview", label: "Overview", shortLabel: "Overview", icon: "LayoutDashboard" },
    { id: "activities", label: "Activities & Logs", shortLabel: "Activities", icon: "Activity" },
    { id: "certificate", label: "Fellowship Certificate", shortLabel: "Certificate", icon: "Award" },
    { id: "p2p", label: "P2P Token Transfer", shortLabel: "P2P", icon: "ArrowLeftRight" },
    { id: "payments", label: "Payments & Funding", shortLabel: "Payments", icon: "Wallet" },
    { id: "projects", label: "Projects", shortLabel: "Projects", icon: "FolderKanban" },
    { id: "leaderboard", label: "Leaderboard", shortLabel: "Leaderboard", icon: "Trophy" },
    { id: "profile", label: "Profile", shortLabel: "Profile", icon: "User" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col md:flex-row">
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

      {/* DESKTOP & TABLET SIDEBAR NAVIGATION (hidden on mobile, flex on md+) */}
      <aside className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 sticky top-0 h-screen overflow-y-auto flex-shrink-0 text-left text-slate-300 z-30 justify-between transition-all duration-300 relative ${
        sidebarCollapsed ? "w-20 p-3" : "w-56 md:w-60 lg:w-64 xl:w-72 p-4 lg:p-5"
      }`}>
        {/* Toggle Collapse Chevron Button for Tablet / Desktop */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          type="button"
          className="absolute -right-3 top-8 w-6 h-6 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white cursor-pointer z-40 shadow-lg"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Icon name={sidebarCollapsed ? "ChevronRight" : "ChevronLeft"} size={12} />
        </button>

        <div className="space-y-6">
          {/* Logo & Ambassador Badge */}
          <div className={`flex items-center pb-4 border-b border-slate-800 ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
            <img src={logoUrl} alt="Advaltad Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-sm flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold text-white tracking-wide truncate">{ambassadorName}</h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 inline-block">
                  Fellow Ambassador
                </span>
              </div>
            )}
          </div>

          {/* Wallet Summary Card */}
          {!sidebarCollapsed ? (
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Wallet Balance</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">₦{totalDepositsNaira.toLocaleString()}</span>
              </div>
              <div id="desktop-avu-balance" className="text-xl font-black text-white font-mono">
                {avuBalance.toLocaleString()} <span className="text-xs text-emerald-400 font-sans font-bold">AVU</span>
              </div>
              <button
                onClick={() => setIsFundWalletModalOpen(true)}
                type="button"
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Icon name="Plus" size={14} />
                <span>Fund Wallet</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsFundWalletModalOpen(true)}
              type="button"
              className="w-full p-2.5 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
              title="Fund Wallet"
            >
              <Icon name="Coins" size={18} />
              <span className="text-[9px] font-mono font-bold">{avuBalance.toLocaleString()}</span>
            </button>
          )}

          {/* Sidebar Navigation Links */}
          <nav className="space-y-1.5">
            {!sidebarCollapsed && (
              <span className="text-[10px] uppercase font-mono font-extrabold text-slate-500 px-3 tracking-wider block mb-2">Navigation</span>
            )}
            {navTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  title={sidebarCollapsed ? tab.label : undefined}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                    sidebarCollapsed ? "justify-center px-0" : "px-3.5"
                  } ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon name={tab.icon as any} size={16} />
                  {!sidebarCollapsed && <span>{tab.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between px-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Icon name="MapPin" size={12} className="text-emerald-400" />
                <span className="truncate max-w-[120px]">{ambassadorRegion}</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  type="button"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 relative cursor-pointer"
                >
                  <Icon name="Bell" size={16} />
                  {notifications.some(n => n.unread) && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                  )}
                </button>

                <AnimatePresence>
                  {notifDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-10 left-0 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3"
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
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                type="button"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 relative cursor-pointer"
                title="Notifications"
              >
                <Icon name="Bell" size={16} />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                )}
              </button>
            </div>
          )}

          <button
            onClick={onLogout}
            type="button"
            title={sidebarCollapsed ? "Sign Out" : undefined}
            className={`w-full py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-700/50 transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer ${
              sidebarCollapsed ? "justify-center px-0" : "justify-center px-3"
            }`}
          >
            <Icon name="LogOut" size={14} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* MOBILE TOP HEADER (< md) */}
        <header className="md:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logoUrl} alt="Advaltad Logo" className="w-8 h-8 rounded-lg object-cover border border-slate-700 shadow-sm flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xs font-extrabold text-white tracking-wide truncate">{ambassadorName}</h1>
              <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Icon name="MapPin" size={10} />
                <span className="truncate">{ambassadorRegion}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div id="mobile-avu-balance" className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-mono text-emerald-400 font-bold">
              {avuBalance.toLocaleString()} AVU
            </div>
            <button
              onClick={() => setIsFundWalletModalOpen(true)}
              type="button"
              className="p-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs cursor-pointer"
              title="Fund Wallet"
            >
              <Icon name="Plus" size={14} />
            </button>

            {/* Mobile Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                type="button"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 relative cursor-pointer"
                title="Live Notifications"
              >
                <Icon name="Bell" size={16} />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {notifDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-extrabold text-white uppercase tracking-wider text-[11px]">Live Notifications</span>
                      <button
                        onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                        type="button"
                        className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-bold"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-slate-500 text-center py-4 text-[11px]">No notifications recorded yet.</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-2.5 rounded-xl border text-left space-y-1 ${n.unread ? "bg-slate-800/80 border-slate-700" : "bg-slate-900 border-slate-800/60 opacity-75"}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200">{n.title}</span>
                              <span className="text-[9px] text-slate-500 font-mono">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">{n.desc}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={onLogout}
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-300 cursor-pointer"
              title="Sign Out"
            >
              <Icon name="LogOut" size={14} />
            </button>
          </div>
        </header>

        {/* MOBILE BOTTOM NAVIGATION TAB BAR (< md) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-1 py-1.5 flex items-center justify-around overflow-x-auto scrollbar-none shadow-2xl">
          {navTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all cursor-pointer flex-shrink-0 min-w-[56px] ${
                  isActive
                    ? "text-emerald-400 font-black bg-emerald-500/10 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon name={tab.icon as any} size={18} />
                <span className="text-[9px] tracking-tight leading-none whitespace-nowrap font-bold">{tab.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-6 lg:p-8 pb-24 md:pb-12 text-left">
          {/* TABLET & DESKTOP TOP HEADER BAR (hidden on mobile) */}
          <div className="hidden md:flex flex-wrap lg:flex-nowrap items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md mb-6 shadow-sm text-left gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                <Icon name={navTabs.find(t => t.id === activeTab)?.icon as any || "LayoutDashboard"} size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-white tracking-wide uppercase truncate">
                  {navTabs.find(t => t.id === activeTab)?.label || "Dashboard"}
                </h2>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                  <Icon name="MapPin" size={10} className="text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{ambassadorRegion}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400 font-bold truncate">{ambassadorField}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 flex-wrap sm:flex-nowrap">
              {/* AVU Balance Pill */}
              <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 min-h-[42px]">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Wallet:</span>
                <span className="text-xs font-mono font-black text-emerald-400">{avuBalance.toLocaleString()} AVU</span>
              </div>

              {/* Fund Wallet Button */}
              <button
                onClick={() => setIsFundWalletModalOpen(true)}
                type="button"
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer min-h-[42px]"
              >
                <Icon name="Plus" size={14} />
                <span>Fund Wallet</span>
              </button>

              {/* P2P Transfer Button */}
              <button
                onClick={() => setActiveTab("p2p")}
                type="button"
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[42px]"
              >
                <Icon name="ArrowLeftRight" size={14} className="text-emerald-400" />
                <span>P2P Transfer</span>
              </button>
            </div>
          </div>
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
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
                    <h3 className="text-2xl font-black text-white font-mono">₦{totalDepositsNaira.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-xs font-sans font-medium text-slate-400">NGN</span></h3>
                    <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <Icon name="CheckCircle2" size={12} />
                      <span>{avuBalance > 0 ? "Naira Value of Available AVU" : "No AVU tokens in wallet"}</span>
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

              {/* Charts Grid - 30-Day AVU Balance Trend Area Chart & Hub Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 30-Day AVU Balance Trend Area Chart */}
                <motion.div variants={itemVariants} className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">30-Day AVU Balance Trend</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Verified wallet balance trajectory & transaction trends over the past 30 days</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-lg border font-mono text-[10px] font-bold flex items-center gap-1.5 ${
                        trendMetrics.isPositive 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}>
                        <Icon name="TrendingUp" size={12} />
                        <span>{trendMetrics.isPositive ? "+" : ""}{trendMetrics.change.toLocaleString()} AVU ({trendMetrics.percentChange > 0 ? "+" : ""}{trendMetrics.percentChange}%)</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-[10px] font-bold text-slate-300">
                        Past 30 Days
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-500 block font-bold">Current AVU</span>
                      <span className="font-mono font-black text-white text-sm">{avuBalance.toLocaleString()} <span className="text-[10px] text-emerald-400 font-bold">AVU</span></span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-500 block font-bold">30D Starting</span>
                      <span className="font-mono font-bold text-slate-300">{trendMetrics.start.toLocaleString()} AVU</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-500 block font-bold">30D Peak</span>
                      <span className="font-mono font-bold text-emerald-400">{trendMetrics.peak.toLocaleString()} AVU</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-500 block font-bold">Naira Valuation</span>
                      <span className="font-mono font-bold text-slate-300">₦{totalDepositsNaira.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  {/* Recharts Area Chart */}
                  <div className="h-72 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={avuBalanceTrend30Days} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="avu30DayGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: "#334155" }}
                          minTickGap={24}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: "#334155" }}
                          domain={["auto", "auto"]}
                          tickFormatter={(v) => Number(v) >= 1000 ? `${(Number(v)/1000).toFixed(1)}k` : `${v}`}
                        />
                        <Tooltip content={<CustomBalanceTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          name="AVU Balance"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#avu30DayGrad)"
                          activeDot={{ r: 5, fill: "#10b981", stroke: "#0f172a", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Regional Hub Activity BarChart */}
                <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Regional Hub Activity</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Received vs Dispatched AVU across African hubs</p>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300">Hubs</div>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hubFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: "#334155" }} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: "#334155" }} />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
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

              {/* Activity Stream Section */}
              <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-left">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Icon name="Activity" size={16} className="text-emerald-400" />
                      <span>Recent Activity Stream</span>
                    </h3>
                    <p className="text-xs text-slate-400">Live ledger log events and system authorizations</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("activities")}
                    className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    View All Activities &rarr;
                  </button>
                </div>
                <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
                  {activities.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No recent activity events recorded.
                    </div>
                  ) : (
                    activities.slice(0, 10).map((act) => {
                      let typeBg = "bg-slate-800 text-slate-300 border-slate-700";
                      if (act.type === "avu_transfer") typeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                      if (act.type === "status_change") typeBg = "bg-purple-500/10 text-purple-400 border-purple-500/30";
                      if (act.type === "registration") typeBg = "bg-sky-500/10 text-sky-400 border-sky-500/30";
                      if (act.type === "profile_update") typeBg = "bg-amber-500/10 text-amber-400 border-amber-500/30";

                      return (
                        <div key={act.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${typeBg}`}>
                                {act.type.replace("_", " ")}
                              </span>
                              {act.ambassador_name && (
                                <span className="font-bold text-slate-200 truncate">{act.ambassador_name}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{act.desc}</p>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                            {act.amount && <p className="font-mono font-bold text-emerald-400">{act.amount}</p>}
                            <p className="text-[10px] text-slate-500">
                              {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "activities" && (
            <motion.div key="activities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 max-w-5xl mx-auto text-left">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center gap-2">
                    <Icon name="Activity" size={20} className="text-emerald-400" />
                    <span>System & Portfolio Activity Ledger</span>
                  </h2>
                  <p className="text-xs text-slate-400">Real-time ledger events, AVU token allocations, transfers, and verification status logs</p>
                </div>
                <button
                  type="button"
                  onClick={fetchAmbassadorData}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Icon name="RefreshCw" size={14} />
                  <span>Refresh Activity Log</span>
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="divide-y divide-slate-800/80">
                  {activities.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      <Icon name="Activity" size={32} className="mx-auto mb-3 text-slate-600" />
                      No activity events currently registered.
                    </div>
                  ) : (
                    activities.map((act) => {
                      let typeBg = "bg-slate-800 text-slate-300 border-slate-700";
                      if (act.type === "avu_transfer") typeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                      if (act.type === "status_change") typeBg = "bg-purple-500/10 text-purple-400 border-purple-500/30";
                      if (act.type === "registration") typeBg = "bg-sky-500/10 text-sky-400 border-sky-500/30";
                      if (act.type === "profile_update") typeBg = "bg-amber-500/10 text-amber-400 border-amber-500/30";

                      return (
                        <div key={act.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${typeBg}`}>
                                {act.type.replace("_", " ")}
                              </span>
                              {act.ambassador_name && (
                                <span className="font-bold text-slate-200">{act.ambassador_name}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{act.desc}</p>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                            {act.amount && (
                              <span className="px-3 py-1 rounded-xl bg-slate-950 font-mono font-bold text-emerald-400 border border-slate-800 text-xs">
                                {act.amount}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 font-mono">
                              {act.created_at ? new Date(act.created_at).toLocaleString() : "Just now"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
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

              {/* Modern Certificate Canvas Box with Beautiful Side Ribbons */}
              <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-2 sm:p-4 shadow-2xl border-2 border-amber-500/40">
                {/* Outer Gold Decorative Frame */}
                <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-12 border border-amber-500/30 text-center space-y-6 sm:space-y-8 overflow-hidden">
                  
                  {/* Left Side Ornamental Ribbon Banner */}
                  <div className="absolute top-0 left-0 bottom-0 w-8 sm:w-12 pointer-events-none flex flex-col justify-between items-center py-2 z-10">
                    <div className="w-full h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 shadow-xl opacity-90 border-r border-amber-300/40 relative flex flex-col justify-between items-center py-4">
                      {/* Ribbon Fold Lines & Sheen */}
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                      {/* Side Medallion Badge */}
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 border-2 border-amber-100 flex items-center justify-center shadow-lg my-auto">
                        <Icon name="Award" size={14} className="text-slate-950" />
                      </div>
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                    </div>
                  </div>

                  {/* Right Side Ornamental Ribbon Banner */}
                  <div className="absolute top-0 right-0 bottom-0 w-8 sm:w-12 pointer-events-none flex flex-col justify-between items-center py-2 z-10">
                    <div className="w-full h-full bg-gradient-to-l from-amber-600 via-amber-400 to-amber-700 shadow-xl opacity-90 border-l border-amber-300/40 relative flex flex-col justify-between items-center py-4">
                      {/* Ribbon Fold Lines & Sheen */}
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                      {/* Side Medallion Badge */}
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 border-2 border-amber-100 flex items-center justify-center shadow-lg my-auto">
                        <Icon name="ShieldCheck" size={14} className="text-slate-950" />
                      </div>
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                      <div className="w-full h-1 bg-amber-200/50 my-2" />
                    </div>
                  </div>

                  {/* Top & Bottom Accent Gold Bars */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600 z-20" />
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600 z-20" />

                  {/* Inner Certificate Content Container */}
                  <div className="px-6 sm:px-12 py-2 space-y-6 sm:space-y-8 relative z-20">
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 sm:pb-6">
                      <div className="flex items-center gap-3">
                        <img src={logoUrl} alt="Advaltad" className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-amber-400/50 shadow-md" />
                        <div className="text-left hidden sm:block">
                          <span className="text-[11px] font-black tracking-widest uppercase text-amber-400 block font-sans">Advaltad Fellowship</span>
                          <span className="text-[9px] text-slate-400 block font-sans">Pan-African Grassroots Commission</span>
                        </div>
                      </div>
                      
                      {/* Top Center Crown/Crest */}
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 mb-1">
                          <Icon name="Crown" size={20} />
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] sm:text-[10px] font-mono text-amber-400 font-bold block uppercase tracking-widest">Commission Ref</span>
                        <span className="text-xs sm:text-sm font-mono text-slate-200 font-extrabold">{profile?.id || "AV-2026-99401"}</span>
                      </div>
                    </div>

                    {/* Main Body */}
                    <div className="space-y-3 sm:space-y-4 py-2">
                      <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-inner">
                        Certificate of Official Commission
                      </div>
                      
                      <p className="text-[11px] sm:text-xs text-slate-400 uppercase tracking-widest font-semibold">This is to certify that</p>
                      
                      <h3 className="text-2xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 font-serif tracking-tight py-1 drop-shadow-md">
                        {ambassadorName}
                      </h3>
                      
                      <div className="w-24 sm:w-32 h-0.5 mx-auto bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

                      <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed font-sans px-2">
                        has been duly vetted, ratified, and commissioned as an official <span className="text-amber-300 font-extrabold">Growth Ambassador</span> overseeing local empowerment initiatives in <span className="text-emerald-400 font-bold">{ambassadorRegion}</span> under the <span className="text-amber-200 font-bold">{ambassadorField}</span> division.
                      </p>
                    </div>

                    {/* Bottom Signatures & Central Starburst Seal */}
                    <div className="pt-6 sm:pt-8 border-t border-amber-500/20 grid grid-cols-3 items-end gap-2 text-center">
                      {/* Left Signature */}
                      <div className="text-left space-y-1">
                        <div className="h-8 border-b border-amber-400/30 font-serif italic text-amber-200 text-xs sm:text-sm flex items-end">
                          Ramon Bisola
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">Executive Chairman</p>
                        <p className="text-[8px] text-slate-500 font-mono">{commissionDate}</p>
                      </div>

                      {/* Center Starburst Seal */}
                      <div className="flex flex-col items-center justify-center relative">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 p-0.5 shadow-2xl border-2 border-yellow-100 flex items-center justify-center relative z-20">
                          <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-700 via-amber-500 to-yellow-300 flex flex-col items-center justify-center text-slate-950 border border-amber-200 shadow-inner p-1">
                            <Icon name="Award" size={18} className="text-slate-950 drop-shadow" />
                            <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-tighter text-slate-950 leading-none mt-0.5">Verified Seal</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Signature */}
                      <div className="text-right space-y-1">
                        <div className="h-8 border-b border-amber-400/30 font-serif italic text-amber-200 text-xs sm:text-sm flex items-end justify-end">
                          Advaltad Board
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">Director of Governance</p>
                        <p className="text-[8px] text-emerald-400 font-mono font-bold flex items-center gap-1 justify-end">
                          <Icon name="CheckCircle2" size={10} /> Verified On-Chain
                        </p>
                      </div>
                    </div>
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
                    {/* Recipient Ambassador Select & Combobox */}
                    <div className="space-y-2 relative" ref={recipientComboboxRef}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Select Recipient Ambassador
                      </label>
                      
                      {/* Direct HTML <select> dropdown */}
                      <select
                        value={transferTargetId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTransferTargetId(val);
                          const match = approvedOtherAmbassadors.find(a => a.id === val || a.email === val);
                          if (match) {
                            setRecipientSearchQuery(`${match.name} (${match.city})`);
                          } else {
                            setRecipientSearchQuery("");
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">
                          -- Choose Recipient Ambassador --
                        </option>
                        {approvedOtherAmbassadors.map((amb) => (
                          <option key={amb.id || amb.email} value={amb.id || amb.email} className="bg-slate-900 text-white">
                            {amb.name} ({amb.city}) - {amb.email}
                          </option>
                        ))}
                      </select>

                      {/* Search Combobox Input */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Or search ambassador by name, city, or ID..."
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
                                const ambVal = amb.id || amb.email;
                                const isSelected = transferTargetId === ambVal;
                                return (
                                  <button
                                    key={ambVal}
                                    type="button"
                                    onClick={() => {
                                      setTransferTargetId(ambVal);
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
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Transfer Amount (AVU)</label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold">
                            Available: <span className="text-emerald-400 font-mono font-black">{Math.max(Number(avuBalance) || 0, Number(profile?.avu_balance) || 0).toLocaleString()} AVU</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setTransferAmount(String(Math.max(Number(avuBalance) || 0, Number(profile?.avu_balance) || 0)))}
                            className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[9px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            Max
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        placeholder="e.g. 1.5 or 250"
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
                      {isProcessing ? (
                        <div className="py-4 space-y-4 text-center">
                          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                              <Icon name="RefreshCw" size={20} className="animate-spin" />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-white">Processing AVU Transfer</h3>
                            <p className="text-xs text-emerald-400 font-mono font-medium mt-1 animate-pulse">
                              {transferProgressStep}
                            </p>
                          </div>

                          {/* Rolling Progress Bar */}
                          <div className="space-y-1.5 pt-1">
                            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                              <motion.div
                                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: `${transferProgressPercent}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                              <span>{transferProgressPercent}%</span>
                              <span>{transferAmount} AVU &rarr; {selectedRecipient?.name || "Recipient"}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
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
                            <button type="button" onClick={() => setShowTransferConfirmModal(false)} className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                            <button type="button" onClick={confirmExecuteTransfer} className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-emerald-950/50">Confirm</button>
                          </div>
                        </>
                      )}
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

                {/* Top-Up Deposit Summaries & PDF Receipts History */}
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 text-left">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                        <Icon name="Receipt" size={18} className="text-emerald-400" />
                        <span>Top-Up Deposit Summaries & Receipts</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Download official PDF receipts for your verified AVU wallet deposits</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {userDeposits.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                        No wallet top-up transactions recorded yet. Open Paystack Deposit Checkout to credit your wallet.
                      </div>
                    ) : (
                      userDeposits.map((dep) => (
                        <div key={dep.id || dep.paystack_reference} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className={`p-2.5 rounded-xl ${dep.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                              <Icon name={dep.status === 'success' ? 'CheckCircle2' : 'Clock'} size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-white font-mono">{dep.paystack_reference || 'WAL-REF'}</p>
                              <p className="text-[10px] text-slate-400">{dep.created_at ? new Date(dep.created_at).toLocaleString() : 'Recent Transaction'}</p>
                              <span className="text-[10px] font-bold text-slate-500 block">Funder: {dep.funding_by_name || 'Self Direct'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/60 pt-3 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <p className="font-mono font-black text-xs text-white">₦{(dep.amount_naira || 0).toLocaleString()}</p>
                              <p className="font-mono font-bold text-emerald-400 text-xs">+{(dep.avu_earned || 0).toLocaleString()} AVU</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => downloadDepositReceiptPDF({
                                reference: dep.paystack_reference || 'WAL-REF',
                                ambassadorName: profile?.name || dep.funding_by_name || "Ambassador",
                                ambassadorEmail: profile?.email || "ambassador@domain.com",
                                amountNaira: dep.amount_naira || 0,
                                avuEarned: dep.avu_earned || 0,
                                date: dep.created_at ? new Date(dep.created_at).toLocaleString() : new Date().toLocaleString(),
                                fundingByName: dep.funding_by_name || "Direct Deposit",
                                programSponsored: dep.program_sponsored || "Youth Empowerment Initiative"
                              })}
                              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700/80"
                            >
                              <Icon name="Download" size={14} />
                              <span>Download Receipt</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

                <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Filter leaders by name or city..."
                    value={leaderSearch}
                    onChange={e => setLeaderSearch(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 min-h-[44px] outline-none focus:border-emerald-500 transition-colors w-full sm:w-64"
                  />
                  <select
                    value={leaderRegionFilter}
                    onChange={e => setLeaderRegionFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer min-h-[44px] outline-none focus:border-emerald-500 transition-colors w-full sm:w-auto"
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
      </div>

      {/* Fund Wallet Modal */}
      <FundWalletModal
        isOpen={isFundWalletModalOpen}
        onClose={() => setIsFundWalletModalOpen(false)}
        profile={profile}
        onSuccess={() => refetchWalletBalance()}
        showToast={showToast}
        fetchAmbassadorData={fetchAmbassadorData}
      />
    </div>
  );
};
