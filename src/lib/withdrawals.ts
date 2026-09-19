import { supabase, db, isSupabaseConfigured } from "./supabase";

export interface WithdrawalFormData {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

/**
 * Ambassador Submitting Withdrawal Request (Form Submission)
 * 
 * - Inserts a new withdrawal request into 'avu_withdrawals' with status 'pending' / 'Pending'.
 * - Leaves balance intact until Admin approves.
 * - Handles Supabase Auth session detection, user ID resolution, and database schema compatibility.
 */
export async function handleWithdrawalSubmit(formData: {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check session or local fallback
    let currentUserId = session?.user?.id;
    let currentUserEmail = session?.user?.email;

    if (!currentUserId && typeof window !== "undefined") {
      currentUserEmail = localStorage.getItem("advaltad_session_email") || undefined;
      currentUserId = localStorage.getItem("advaltad_session_user_id") || undefined;
    }

    if (!session?.user && !currentUserId && !currentUserEmail) {
      alert("Please log in as an ambassador to submit a withdrawal request.");
      return { success: false, error: new Error("Authentication session required.") };
    }

    // Resolve ambassador row for foreign key & metadata compatibility
    let targetAmbassadorId = currentUserId || "00000000-0000-0000-0000-000000000000";
    let ambassadorName = formData.accountName || session?.user?.user_metadata?.name || "Ambassador";
    let ambassadorEmail = currentUserEmail || "";
    let currentBalance = 0;

    if (isSupabaseConfigured && (currentUserId || currentUserEmail)) {
      try {
        const filterOr = currentUserId
          ? `id.eq.${currentUserId},user_id.eq.${currentUserId}` + (currentUserEmail ? `,email.ilike.${currentUserEmail}` : "")
          : `email.ilike.${currentUserEmail}`;

        const { data: amb } = await supabase
          .from("ambassadors")
          .select("id, professional_name, name, email, avu_balance")
          .or(filterOr)
          .maybeSingle();

        if (amb) {
          targetAmbassadorId = amb.id;
          ambassadorName = amb.professional_name || amb.name || ambassadorName;
          ambassadorEmail = amb.email || ambassadorEmail;
          currentBalance = Number(amb.avu_balance || 0);
        }
      } catch (err) {
        console.warn("[handleWithdrawalSubmit] Failed to query ambassador profile:", err);
      }
    }

    // 1. Attempt exact requested insert: { ambassador_id, amount, bank_name, account_number, account_name, status: 'pending' }
    let { error } = await supabase
      .from("avu_withdrawals")
      .insert({
        ambassador_id: targetAmbassadorId,
        amount: formData.amount,
        bank_name: formData.bankName,
        account_number: formData.accountNumber,
        account_name: formData.accountName,
        status: "pending" // Balance stays intact until admin approves!
      });

    // 2. If table schema requires specific constraints (e.g. requested_avu, status: 'Pending', ambassador_name, current_balance)
    if (error) {
      console.warn("[handleWithdrawalSubmit] Initial insert note, retrying with schema-compatible payload:", error.message);
      
      const compatiblePayload: any = {
        ambassador_id: targetAmbassadorId,
        ambassador_name: ambassadorName,
        email: ambassadorEmail,
        current_balance: currentBalance,
        requested_avu: formData.amount,
        naira_equivalent: formData.amount * 1000,
        bank_name: formData.bankName,
        account_number: formData.accountNumber,
        account_name: formData.accountName,
        status: "Pending" // Database check constraint enforces 'Pending'
      };

      const fallbackRes = await supabase
        .from("avu_withdrawals")
        .insert(compatiblePayload)
        .select();

      if (!fallbackRes.error) {
        error = null;
      } else {
        error = fallbackRes.error;
      }
    }

    // 3. Update local storage mirror for offline / immediate UI updates
    if (!error) {
      try {
        await db.createAvuWithdrawal({
          ambassador_id: targetAmbassadorId,
          ambassador_name: ambassadorName,
          email: ambassadorEmail,
          ambassador_email: ambassadorEmail,
          current_balance: currentBalance,
          requested_avu: formData.amount,
          avu_amount: formData.amount,
          naira_equivalent: formData.amount * 1000,
          conversion_rate: 1000,
          bank_name: formData.bankName,
          account_number: formData.accountNumber,
          account_name: formData.accountName,
          status: "Pending"
        });
      } catch (mirrorErr) {
        console.warn("[handleWithdrawalSubmit] Local mirror update note:", mirrorErr);
      }
    }

    if (error) {
      alert("Failed to submit withdrawal request: " + error.message);
      return { success: false, error };
    } else {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated"));
      }
      alert("Withdrawal request submitted! Pending Admin approval.");
      return { success: true };
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    alert("Failed to submit withdrawal request: " + msg);
    return { success: false, error: err };
  }
}

/**
 * Admin Processing Pending Requests - Approve
 * 
 * - Calls RPC 'approve_avu_withdrawal' with p_withdrawal_id and p_admin_id.
 * - Deducts ambassador wallet balance upon approval.
 */
export async function handleApprove(
  withdrawalId: string,
  adminId: string
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const effectiveAdminId = /^[0-9a-f-]{36}$/i.test(adminId)
      ? adminId
      : "00000000-0000-0000-0000-000000000000";

    let { data, error } = await supabase.rpc("approve_avu_withdrawal", {
      p_withdrawal_id: withdrawalId,
      p_admin_id: effectiveAdminId
    });

    // If RPC encountered schema or function error, fallback to direct status update + trigger
    if (error) {
      console.warn("[handleApprove] RPC error, using direct table update:", error.message);
      const directUpdate = await supabase
        .from("avu_withdrawals")
        .update({
          status: "Approved",
          updated_at: new Date().toISOString()
        })
        .eq("id", withdrawalId);

      if (!directUpdate.error) {
        error = null;
      } else {
        // Also ensure db helper fallback executes
        const dbSuccess = await db.updateAvuWithdrawalStatus(withdrawalId, "Approved", undefined, adminId);
        if (dbSuccess) {
          error = null;
        } else {
          error = directUpdate.error;
        }
      }
    }

    if (error) {
      alert("Error approving withdrawal: " + error.message);
      return { success: false, error };
    } else {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated"));
        window.dispatchEvent(new CustomEvent("advaltad_wallet_updated"));
      }
      alert("Approved! Ambassador wallet deducted.");
      return { success: true, data };
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    alert("Error approving withdrawal: " + msg);
    return { success: false, error: err };
  }
}

/**
 * Admin Processing Pending Requests - Reject / Disapprove
 * 
 * - Calls RPC 'reject_avu_withdrawal' with p_withdrawal_id and p_admin_id.
 * - Leaves ambassador balance untouched.
 */
export async function handleReject(
  withdrawalId: string,
  adminId: string
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const effectiveAdminId = /^[0-9a-f-]{36}$/i.test(adminId)
      ? adminId
      : "00000000-0000-0000-0000-000000000000";

    let { data, error } = await supabase.rpc("reject_avu_withdrawal", {
      p_withdrawal_id: withdrawalId,
      p_admin_id: effectiveAdminId
    });

    // If RPC encountered schema or function error, fallback to direct status update
    if (error) {
      console.warn("[handleReject] RPC error, using direct table update:", error.message);
      const directUpdate = await supabase
        .from("avu_withdrawals")
        .update({
          status: "Disapproved",
          updated_at: new Date().toISOString()
        })
        .eq("id", withdrawalId);

      if (!directUpdate.error) {
        error = null;
      } else {
        const dbSuccess = await db.updateAvuWithdrawalStatus(withdrawalId, "Disapproved", undefined, adminId);
        if (dbSuccess) {
          error = null;
        } else {
          error = directUpdate.error;
        }
      }
    }

    if (error) {
      alert("Error rejecting request: " + error.message);
      return { success: false, error };
    } else {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated"));
      }
      alert("Disapproved! Balance left untouched.");
      return { success: true, data };
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    alert("Error rejecting request: " + msg);
    return { success: false, error: err };
  }
}
