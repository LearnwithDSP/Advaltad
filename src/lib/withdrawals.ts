/**
 * Withdrawals module helper
 * Re-exports the withdrawal workflow functions from supabase.ts for backward compatibility.
 */
export {
  handleWithdrawalSubmit,
  handleApprove,
  handleReject,
  type WithdrawalFormData
} from "./supabase";
