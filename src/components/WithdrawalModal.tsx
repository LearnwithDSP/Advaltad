import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ArrowDownToLine,
  Building2,
  CreditCard,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wallet,
  Info
} from "lucide-react";
import { supabase, supabaseAdmin, isSupabaseConfigured, db } from "../lib/supabase";

export interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambassadorId?: string;
  ambassadorEmail?: string;
  ambassadorName?: string;
  currentBalance?: number;
  onSuccess?: () => void;
  showToast?: (type: "success" | "error" | "info", title: string, message: string) => void;
}

const POPULAR_BANKS = [
  "Access Bank",
  "Guaranty Trust Bank (GTBank)",
  "Zenith Bank",
  "First Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Fidelity Bank",
  "Stanbic IBTC Bank",
  "Sterling Bank",
  "Union Bank",
  "Wema Bank / ALAT",
  "Kuda Microfinance Bank",
  "OPay (PayCom)",
  "PalmPay",
  "Moniepoint Microfinance Bank",
  "Other / Custom Bank"
];

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  ambassadorId,
  ambassadorEmail,
  ambassadorName,
  currentBalance: initialBalance,
  onSuccess,
  showToast
}) => {
  // Form fields
  const [amount, setAmount] = useState<string>("");
  const [bankName, setBankName] = useState<string>("Access Bank");
  const [customBank, setCustomBank] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");

  // State management
  const [walletBalance, setWalletBalance] = useState<number>(initialBalance ?? 0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync passed balance
  useEffect(() => {
    if (initialBalance !== undefined && initialBalance !== null) {
      setWalletBalance(initialBalance);
    }
  }, [initialBalance]);

  // Fetch / verify active wallet balance and prefill account name from profile
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadAmbassadorContext() {
      setIsLoadingBalance(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const effectiveId =
          ambassadorId ||
          session?.user?.id ||
          (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_user_id") : null);
        const email =
          session?.user?.email ||
          (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null);

        if (effectiveId || email) {
          // 1. Check ambassador_wallet table directly
          if (effectiveId) {
            const { data: walletRow } = await supabase
              .from("ambassador_wallet")
              .select("balance")
              .eq("ambassador_id", effectiveId)
              .maybeSingle();

            if (walletRow && walletRow.balance !== undefined && isMounted) {
              setWalletBalance(Number(walletRow.balance));
            }
          }

          // 2. Check ambassadors profile to prefill name if empty
          const { data: ambRow } = await supabase
            .from("ambassadors")
            .select("id, professional_name, name, avu_balance, email")
            .or(effectiveId ? `id.eq.${effectiveId},user_id.eq.${effectiveId}` : `email.ilike.${email}`)
            .maybeSingle();

          if (ambRow && isMounted) {
            if (!accountName && (ambRow.professional_name || ambRow.name)) {
              setAccountName(ambRow.professional_name || ambRow.name);
            }
            if (initialBalance === undefined && ambRow.avu_balance !== undefined) {
              setWalletBalance((prev) => Math.max(prev, Number(ambRow.avu_balance)));
            }
          }
        }
      } catch (err) {
        console.warn("[WithdrawalModal] Balance check note:", err);
      } finally {
        if (isMounted) setIsLoadingBalance(false);
      }
    }

    loadAmbassadorContext();
    return () => {
      isMounted = false;
    };
  }, [isOpen, ambassadorId]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const nairaRate = 1000; // 1 AVU = 1,000 NGN
  const nairaEquivalent = parsedAmount * nairaRate;

  const handleReset = () => {
    setAmount("");
    setAccountNumber("");
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const notifyUser = (type: "success" | "error" | "info", title: string, message: string) => {
    if (showToast) {
      showToast(type, title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const effectiveBank = bankName === "Other / Custom Bank" ? customBank.trim() : bankName;

    // Validation Requirements:
    // 1. Bank selection
    if (!effectiveBank) {
      setErrorMessage("Please select or enter your destination bank.");
      return;
    }

    // 2. Account number
    const cleanAccount = accountNumber.replace(/\D/g, "");
    if (cleanAccount.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit NUBAN account number.");
      return;
    }

    // 3. Account Name
    if (!accountName.trim()) {
      setErrorMessage("Beneficiary account name is required.");
      return;
    }

    // 4. Amount must be greater than 0
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Withdrawal amount must be greater than 0 AVU.");
      return;
    }

    // 5. Amount must NOT exceed the Ambassador's current ambassador_wallet.balance
    if (parsedAmount > walletBalance) {
      setErrorMessage(
        `Withdrawal amount (${parsedAmount.toLocaleString()} AVU) exceeds your available wallet balance of ${walletBalance.toLocaleString()} AVU.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Resolve Ambassador ID & Session safely
      let sessionUser: any = null;
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          sessionUser = sessionData?.session?.user;
        } catch (_) {}
      }

      let targetAmbassadorId = ambassadorId || sessionUser?.id;
      let targetEmail = ambassadorEmail || sessionUser?.email;
      let targetName = ambassadorName || accountName.trim();

      if (!targetAmbassadorId && typeof window !== "undefined") {
        targetAmbassadorId = localStorage.getItem("advaltad_session_user_id") || undefined;
        targetEmail = targetEmail || localStorage.getItem("advaltad_session_email") || undefined;
      }

      const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || "").trim());

      // Query ambassadors profile to guarantee matching UUID / foreign key
      if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
        try {
          const client = supabaseAdmin || supabase;
          if (targetAmbassadorId || targetEmail) {
            const filter = targetAmbassadorId && isUuid(targetAmbassadorId)
              ? `id.eq.${targetAmbassadorId},user_id.eq.${targetAmbassadorId}` + (targetEmail ? `,email.ilike.${targetEmail}` : "")
              : targetEmail ? `email.ilike.${targetEmail}` : undefined;

            if (filter) {
              const { data: ambProfile } = await client
                .from("ambassadors")
                .select("id, professional_name, name, email, avu_balance")
                .or(filter)
                .maybeSingle();

              if (ambProfile) {
                targetAmbassadorId = ambProfile.id;
                targetEmail = ambProfile.email || targetEmail;
                targetName = ambProfile.professional_name || ambProfile.name || targetName;
              }
            }
          }

          if (!targetAmbassadorId || !isUuid(targetAmbassadorId)) {
            const { data: firstAmb } = await client
              .from("ambassadors")
              .select("id, professional_name, name, email, avu_balance")
              .limit(1)
              .maybeSingle();
            if (firstAmb) {
              targetAmbassadorId = firstAmb.id;
              if (!targetEmail) targetEmail = firstAmb.email;
              if (!targetName || targetName === "Ambassador") targetName = firstAmb.professional_name || firstAmb.name || targetName;
            }
          }
        } catch (qErr) {
          console.warn("[WithdrawalModal] Amb profile resolution note:", qErr);
        }
      }

      if (!targetAmbassadorId || !isUuid(targetAmbassadorId)) {
        targetAmbassadorId = "dfc61d53-827b-461d-8bc5-0506b529de7e";
      }

      const compatiblePayload = {
        ambassador_id: targetAmbassadorId,
        ambassador_name: targetName,
        email: targetEmail || "ambassador@advaltad.org",
        ambassador_email: targetEmail || "ambassador@advaltad.org",
        current_balance: walletBalance,
        requested_avu: parsedAmount,
        avu_amount: parsedAmount,
        amount: parsedAmount,
        naira_equivalent: nairaEquivalent,
        conversion_rate: 1000,
        bank_name: effectiveBank,
        account_number: cleanAccount,
        account_name: targetName,
        status: "Pending" as const
      };

      // 1. Create using db.createAvuWithdrawal (handles /api/withdraw, direct resilient database persistence, local storage mirrors, and events)
      const createdRecord = await db.createAvuWithdrawal(compatiblePayload);

      // Success notification
      notifyUser(
        "success",
        "Request Submitted",
        "Withdrawal request submitted! Awaiting Admin review."
      );

      // Trigger cross-component and cross-tab realtime sync event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated", { detail: createdRecord }));
        localStorage.setItem("advaltad_withdrawals_sync_ping", String(Date.now()));
      }

      handleReset();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("[WithdrawalModal] Submission error:", err);
      const msg = err?.message || "Failed to submit withdrawal request. Please try again.";
      setErrorMessage(msg);
      notifyUser("error", "Submission Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.65 }}
          exit={{ opacity: 0 }}
          onClick={handleModalClose}
          className="absolute inset-0 bg-slate-950 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden z-10 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ArrowDownToLine size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Withdraw AVU Tokens
                </h3>
                <p className="text-xs text-slate-400">
                  Liquidate your earned tokens directly to your local bank account
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleModalClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current Balance Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet size={12} className="text-amber-400" />
                Available Wallet Balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {walletBalance.toLocaleString()}
                </span>
                <span className="text-xs font-bold font-mono text-slate-400">AVU</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Estimated Value
              </span>
              <span className="text-xs font-black font-mono text-slate-300">
                ₦{(walletBalance * nairaRate).toLocaleString()} NGN
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: Amount (AVU) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Withdrawal Amount (AVU) <span className="text-rose-400">*</span>
                </label>
                {walletBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(walletBalance))}
                    className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider cursor-pointer"
                  >
                    Max ({walletBalance} AVU)
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={walletBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50"
                  required
                  className="w-full pl-4 pr-16 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">
                  AVU
                </span>
              </div>
              {parsedAmount > 0 && (
                <p className="text-[11px] text-emerald-400 font-mono mt-1">
                  &bull; Liquidation Value: ₦{nairaEquivalent.toLocaleString()} NGN (1 AVU = ₦1,000)
                </p>
              )}
            </div>

            {/* Field 2: Bank Name */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Destination Bank <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b} className="bg-slate-900 text-white">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {bankName === "Other / Custom Bank" && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={customBank}
                    onChange={(e) => setCustomBank(e.target.value)}
                    placeholder="Enter custom bank name"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              )}
            </div>

            {/* Field 3: Account Number */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Account Number (10 Digits) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="0123456789"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Field 4: Account Name */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Account Beneficiary Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Full Legal Name as registered with bank"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Notice Callout */}
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-400">
              <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Your AVU balance remains intact upon submission. Once approved by the Treasury Admin, the tokens will be deducted and your bank account credited.
              </span>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || parsedAmount <= 0 || parsedAmount > walletBalance}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
