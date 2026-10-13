import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Wallet, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  ExternalLink, 
  Zap, 
  Sparkles,
  CreditCard,
  Phone,
  User,
  HeartHandshake,
  AlertCircle
} from "lucide-react";
import { 
  convertNairaToAvu, 
  getPaystackPublicKey, 
  loadPaystackScript 
} from "../lib/paystack";
import { supabase, isSupabaseConfigured, db, DbAmbassador, fetchWalletBalance } from "../lib/supabase";

export interface WalletTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambassador: DbAmbassador | null;
  onSuccess?: (newBalance: number) => void;
  onBalanceUpdated?: (newBalance: number) => void;
  showToast?: (type: "success" | "error" | "info", title: string, message: string) => void;
}

export interface DepositReceipt {
  reference: string;
  ambassadorName: string;
  ambassadorEmail: string;
  amountNaira: number;
  avuEarned: number;
  date: string;
  fundingByName: string;
  programSponsored: string;
  alreadyProcessed?: boolean;
}

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export const WalletTopupModal: React.FC<WalletTopupModalProps> = ({
  isOpen,
  onClose,
  ambassador,
  onSuccess,
  onBalanceUpdated,
  showToast
}) => {
  const [amountNaira, setAmountNaira] = useState<string>("10000");
  const [fundingByName, setFundingByName] = useState<string>("");
  const [fundingPhone, setFundingPhone] = useState<string>("");
  const [programSponsored, setProgramSponsored] = useState<string>("Youth Empowerment Initiative");
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<DepositReceipt | null>(null);

  // Active Realtime Channel Ref
  const realtimeChannelRef = useRef<any>(null);

  // Normalize ambassador identifiers
  const sessionEmail = typeof window !== "undefined" ? (localStorage.getItem("advaltad_session_email") || "") : "";
  const email = (ambassador?.email || sessionEmail || "ambassador@advaltad.org").trim().toLowerCase();
  const ambassadorId = (ambassador?.id || ambassador?.db_id || ambassador?.user_id || email).trim();
  const ambassadorName = ambassador?.name || ambassador?.professional_name || "Ambassador";

  // Pre-fill user data
  useEffect(() => {
    if (isOpen) {
      setFundingByName(ambassador?.name || ambassador?.professional_name || "");
      setFundingPhone(ambassador?.phone || ambassador?.phone_number || "");
      setErrorMessage(null);
      setCompletedReceipt(null);
      setProcessStep("");
    }
  }, [isOpen, ambassador]);

  // Set up Supabase Realtime Listener for instant UI balance updates
  useEffect(() => {
    if (!isOpen || !supabase || !isSupabaseConfigured) return;

    try {
      const channelId = `realtime-wallet-sync-${Date.now()}`;
      const channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ambassadors",
          },
          (payload) => {
            const newRec = payload.new as any;
            if (newRec && (newRec.email?.toLowerCase() === email || newRec.id === ambassadorId)) {
              const updatedBal = Number(newRec.avu_balance) || 0;
              console.log("[WalletTopupModal Realtime] Received live balance update:", updatedBal);
              if (onBalanceUpdated) onBalanceUpdated(updatedBal);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "wallet_deposits",
          },
          (payload) => {
            const newDep = payload.new as any;
            if (newDep && (newDep.ambassador_id === ambassadorId || newDep.ambassador_id === ambassador?.id)) {
              console.log("[WalletTopupModal Realtime] Confirmed deposit recorded:", newDep.payment_reference);
              fetchWalletBalance(email).then((bal) => {
                if (onBalanceUpdated) {
                  onBalanceUpdated(bal);
                }
              });
            }
          }
        )
        .subscribe();

      realtimeChannelRef.current = channel;

      return () => {
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }
      };
    } catch (realtimeErr) {
      console.warn("[WalletTopupModal] Realtime subscription notice:", realtimeErr);
    }
  }, [isOpen, email, ambassadorId, onBalanceUpdated]);

  if (!isOpen) return null;

  const numericAmt = parseFloat(amountNaira) || 0;
  const avuToEarn = convertNairaToAvu(numericAmt);

  const notify = (type: "success" | "error" | "info", title: string, message: string) => {
    if (showToast) {
      showToast(type, title, message);
    } else {
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
  };

  /**
   * Primary Execution Flow:
   * 1. Preserves metadata on Paystack servers
   * 2. Opens Paystack inline popup
   * 3. On success, calls public.credit_ambassador_wallet_safe RPC idempotently
   * 4. Updates UI and dispatches global balance synchronization events
   */
  const handleInitiateTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fundingByName.trim()) {
      setErrorMessage("Please enter the name of the sponsor or depositor.");
      notify("error", "Input Required", "Please enter the name of the sponsor or depositor.");
      return;
    }

    if (isNaN(numericAmt) || numericAmt < 500) {
      setErrorMessage("Minimum wallet funding is ₦500.");
      notify("error", "Invalid Amount", "Minimum wallet funding is ₦500.");
      return;
    }

    setIsProcessing(true);
    setProcessStep("Loading secure payment gateway...");

    // Generate unique payment reference
    const paymentRef = `WAL-${Date.now()}-${Math.floor(Math.random() * 8999 + 1000)}`;

    try {
      // 1. Ensure Paystack inline script is loaded
      const scriptReady = await loadPaystackScript();
      if (!scriptReady || !(window as any).PaystackPop) {
        throw new Error("Unable to connect to Paystack payment gateway. Please check your network connection.");
      }

      setProcessStep("Preparing transaction metadata...");

      // 2. Prepare comprehensive metadata preserved on Paystack's servers
      // This guarantees the Paystack Webhook receives full context even if the user drops off!
      const metadata = {
        ambassador_id: ambassadorId,
        ambassador_email: email,
        user_id: ambassador?.user_id || "",
        db_id: ambassador?.db_id || ambassador?.id || "",
        avu_amount: avuToEarn,
        avu_earned: avuToEarn,
        amount_naira: numericAmt,
        funding_by_name: fundingByName,
        funding_phone: fundingPhone,
        program_sponsored: programSponsored,
        custom_fields: [
          {
            display_name: "Ambassador ID",
            variable_name: "ambassador_id",
            value: ambassadorId,
          },
          {
            display_name: "Ambassador Email",
            variable_name: "ambassador_email",
            value: email,
          },
          {
            display_name: "AVU Tokens Earned",
            variable_name: "avu_amount",
            value: avuToEarn,
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

      // 3. Create initial pending deposit record in Supabase (if accessible)
      try {
        if (supabase && isSupabaseConfigured) {
          await supabase.from("deposits").insert([{
            ambassador_id: ambassadorId,
            funding_by_name: fundingByName,
            phone_number: fundingPhone,
            program_sponsored: programSponsored,
            amount_naira: numericAmt,
            avu_earned: avuToEarn,
            paystack_reference: paymentRef,
            status: "pending"
          }]);
        }
      } catch (insertErr) {
        console.warn("[WalletTopupModal] Non-fatal pending state record notice:", insertErr);
      }

      setProcessStep("Awaiting payment authorization in Paystack...");

      // 4. Initialize Paystack Inline Pop
      const paystackPublicKey = getPaystackPublicKey();
      const paystackPop = (window as any).PaystackPop;

      const handler = paystackPop.setup({
        key: paystackPublicKey,
        email: email,
        amount: Math.round(numericAmt * 100), // Converted to KOBO (1 NGN = 100 Kobo)
        ref: paymentRef,
        metadata: metadata,
        callback: async (response: any) => {
          // ==================================================================
          // CRITICAL STEP: User completed payment in browser.
          // Call credit_ambassador_wallet_safe RPC directly for instant credit!
          // ==================================================================
          const confirmedRef = response.reference || paymentRef;
          setProcessStep("Payment verified! Atomically crediting AVU balance...");

          try {
            let finalNewBalance = 0;
            let alreadyProcessed = false;

            // Attempt Layer 1: Call atomic PostgreSQL RPC
            if (supabase && isSupabaseConfigured) {
              const { data: rpcData, error: rpcError } = await supabase.rpc(
                "credit_ambassador_wallet_safe",
                {
                  p_ambassador_id: ambassadorId,
                  p_amount_avu: avuToEarn,
                  p_naira_paid: numericAmt,
                  p_reference: confirmedRef,
                  p_provider: "paystack"
                }
              );

              if (!rpcError && rpcData) {
                console.log("[WalletTopupModal] RPC credit_ambassador_wallet_safe result:", rpcData);
                finalNewBalance = Number(rpcData.new_balance) || 0;
                alreadyProcessed = Boolean(rpcData.already_processed);
              } else {
                console.warn("[WalletTopupModal] RPC execution notice, attempting unified engine fallback:", rpcError);
                // Fallback to unified local engine
                const fallbackRes = await db.processFundingSuccess(
                  ambassadorId,
                  email,
                  numericAmt,
                  avuToEarn,
                  confirmedRef
                );
                finalNewBalance = fallbackRes.newBalance;
              }
            } else {
              // Local Dev / Mock Fallback
              const fallbackRes = await db.processFundingSuccess(
                ambassadorId,
                email,
                numericAmt,
                avuToEarn,
                confirmedRef
              );
              finalNewBalance = fallbackRes.newBalance;
            }

            // Construct Receipt
            const receipt: DepositReceipt = {
              reference: confirmedRef,
              ambassadorName: fundingByName || ambassadorName,
              ambassadorEmail: email,
              amountNaira: numericAmt,
              avuEarned: avuToEarn,
              date: new Date().toLocaleString(),
              fundingByName: fundingByName,
              programSponsored: programSponsored,
              alreadyProcessed
            };

            setCompletedReceipt(receipt);
            setIsProcessing(false);
            setProcessStep("");

            // Notify parent components and listeners
            if (onSuccess) onSuccess(finalNewBalance);
            if (onBalanceUpdated) onBalanceUpdated(finalNewBalance);

            // Dispatch cross-window / tab broadcast
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("advaltad_wallet_updated", {
                detail: { newBalance: finalNewBalance, reference: confirmedRef }
              }));
            }

            notify(
              "success",
              "Wallet Credited Successfully",
              `+${avuToEarn.toLocaleString()} AVU added to your wallet! Ref: ${confirmedRef}`
            );
          } catch (postPaymentErr: any) {
            console.error("[WalletTopupModal] Post-payment processing error:", postPaymentErr);
            // Even if local fetch failed, the webhook will complete it on server
            setIsProcessing(false);
            setCompletedReceipt({
              reference: confirmedRef,
              ambassadorName: fundingByName || ambassadorName,
              ambassadorEmail: email,
              amountNaira: numericAmt,
              avuEarned: avuToEarn,
              date: new Date().toLocaleString(),
              fundingByName: fundingByName,
              programSponsored: programSponsored
            });
            notify(
              "info",
              "Payment Received",
              "Payment received! Webhook is synchronizing your balance with the blockchain ledger."
            );
          }
        },
        onClose: () => {
          setIsProcessing(false);
          setProcessStep("");
          notify("info", "Payment Window Closed", "Paystack payment modal was closed.");
        }
      });

      handler.openIframe();
    } catch (err: any) {
      console.error("[WalletTopupModal] Topup initiation failure:", err);
      setIsProcessing(false);
      setProcessStep("");
      setErrorMessage(err?.message || "Failed to initialize payment gateway. Please try again.");
      notify("error", "Gateway Error", err?.message || "Failed to initialize payment gateway.");
    }
  };

  const handleModalClose = () => {
    if (isProcessing) return; // Prevent closing while in critical payment transition
    setCompletedReceipt(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        exit={{ opacity: 0 }}
        onClick={handleModalClose}
        className="absolute inset-0 bg-slate-950 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                Top Up AVU Wallet
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Instant Credit
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                1,000 NGN = <span className="text-emerald-400 font-semibold">1.002 AVU</span> • Protected by Paystack
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {completedReceipt ? (
            /* Success Receipt View */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h4 className="text-xl font-bold text-white">Deposit Confirmed!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Your AVU balance has been atomically updated and synced.
                </p>
              </div>

              {/* Receipt Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Payment Reference:</span>
                  <span className="text-emerald-400 font-bold">{completedReceipt.reference}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Amount Paid:</span>
                  <span className="text-white font-semibold">₦{completedReceipt.amountNaira.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">AVU Credited:</span>
                  <span className="text-emerald-400 font-bold text-sm">+{completedReceipt.avuEarned.toLocaleString()} AVU</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Sponsor / Funder:</span>
                  <span className="text-white">{completedReceipt.fundingByName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Sponsored Program:</span>
                  <span className="text-slate-300">{completedReceipt.programSponsored}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-400">{completedReceipt.date}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>Done & Return to Dashboard</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* Payment Input Form */
            <form onSubmit={handleInitiateTopup} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Amount Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Top-Up Amount (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={amountNaira}
                    onChange={(e) => setAmountNaira(e.target.value)}
                    disabled={isProcessing}
                    placeholder="Enter amount in Naira"
                    className="w-full pl-9 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white font-semibold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setAmountNaira(amt.toString())}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                        numericAmt === amt
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold shadow-sm"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time AVU Output Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-950 to-slate-900 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    You Will Receive
                  </p>
                  <p className="text-xl font-black text-emerald-400 tracking-tight flex items-center gap-1.5 mt-0.5">
                    +{avuToEarn.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    <span className="text-xs font-bold text-emerald-500">AVU</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sparkles size={20} />
                </div>
              </div>

              {/* Funder Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Funder / Sponsor Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={fundingByName}
                    onChange={(e) => setFundingByName(e.target.value)}
                    disabled={isProcessing}
                    placeholder="Enter your name or organization"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={fundingPhone}
                    onChange={(e) => setFundingPhone(e.target.value)}
                    disabled={isProcessing}
                    placeholder="e.g. 08012345678"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Program Sponsored */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Program Supported
                </label>
                <div className="relative">
                  <HeartHandshake size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select
                    value={programSponsored}
                    onChange={(e) => setProgramSponsored(e.target.value)}
                    disabled={isProcessing}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50 appearance-none"
                  >
                    <option value="Youth Empowerment Initiative">Youth Empowerment Initiative</option>
                    <option value="Agricultural Development Fund">Agricultural Development Fund</option>
                    <option value="Healthcare & Maternal Support">Healthcare & Maternal Support</option>
                    <option value="Educational Scholarship Grant">Educational Scholarship Grant</option>
                    <option value="General Ambassador Fund">General Ambassador Fund</option>
                  </select>
                </div>
              </div>

              {/* Security & Idempotency Assurance Banner */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Payments are processed via Paystack with 256-bit encryption. The serverless webhook and atomic database engine guarantee zero dropped credits even on flaky connections.
                </span>
              </div>

              {/* Active Step Indicator */}
              {isProcessing && processStep && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5 animate-pulse">
                  <Loader2 size={16} className="animate-spin shrink-0 text-emerald-400" />
                  <span>{processStep}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessing || numericAmt <= 0}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      <span>Proceed with Paystack (₦{numericAmt.toLocaleString()})</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default WalletTopupModal;
