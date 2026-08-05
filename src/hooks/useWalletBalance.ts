import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured, supabaseAdmin } from "../lib/supabase";

export interface UseWalletBalanceResult {
  balance: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<number>;
}

/**
 * Custom React hook to fetch and synchronize an ambassador's wallet balance (`avu_balance`)
 * directly from Supabase's `ambassadors` table with real-time updates via `supabase.channel`.
 * 
 * @param identifier Can be ambassador ID, user_id, ambassador_id string, or email address.
 */
export function useWalletBalance(identifier?: string | null): UseWalletBalanceResult {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (): Promise<number> => {
    if (!identifier) {
      setBalance(0);
      setLoading(false);
      return 0;
    }

    try {
      const client = supabaseAdmin || supabase;
      if (!isSupabaseConfigured || !client) {
        setLoading(false);
        return 0;
      }

      const cleanId = identifier.trim().toLowerCase();

      // Query ambassadors table directly by id, user_id, ambassador_id, or email
      let { data, error: fetchErr } = await client
        .from("ambassadors")
        .select("avu_balance, ledger_balance, id, email, user_id, ambassador_id")
        .or(`id.eq.${cleanId},user_id.eq.${cleanId},ambassador_id.eq.${cleanId},email.eq.${cleanId}`);

      if (fetchErr || !data || data.length === 0) {
        // Try fallback table casing "Ambassadors"
        const fallback = await client
          .from("Ambassadors")
          .select("avu_balance, ledger_balance, id, email, user_id, ambassador_id")
          .or(`id.eq.${cleanId},user_id.eq.${cleanId},ambassador_id.eq.${cleanId},email.eq.${cleanId}`);

        if (!fallback.error && fallback.data && fallback.data.length > 0) {
          data = fallback.data;
          fetchErr = null;
        }
      }

      if (fetchErr) {
        console.warn("useWalletBalance fetch error:", fetchErr);
        setError(fetchErr.message);
        setLoading(false);
        return balance;
      }

      if (data && data.length > 0) {
        const row = data[0];
        const parsedVal = row.avu_balance !== undefined && row.avu_balance !== null ? row.avu_balance : row.ledger_balance;
        const currentBal = Number(parsedVal) || 0;
        setBalance(currentBal);
        setError(null);
        setLoading(false);
        return currentBal;
      } else {
        setBalance(0);
        setError(null);
        setLoading(false);
        return 0;
      }
    } catch (err: any) {
      console.error("useWalletBalance error:", err);
      setError(err?.message || "Failed to fetch wallet balance");
      setLoading(false);
      return balance;
    }
  }, [identifier]);

  useEffect(() => {
    let active = true;

    fetchBalance();

    if (!identifier || !isSupabaseConfigured || !supabase) {
      return;
    }

    const cleanId = identifier.trim().toLowerCase();

    // Realtime channel subscription for instant live balance updates
    const channel = supabase
      .channel(`public:wallet_balance:${cleanId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassadors" },
        async (payload: any) => {
          if (!active) return;
          console.info("[useWalletBalance] Realtime update on ambassadors table:", payload);
          await fetchBalance();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Ambassadors" },
        async (payload: any) => {
          if (!active) return;
          console.info("[useWalletBalance] Realtime update on Ambassadors table:", payload);
          await fetchBalance();
        }
      )
      .subscribe();

    // Periodic polling as a fallback when realtime web-sockets are delayed or inactive in iframe previews
    const pollInterval = setInterval(() => {
      if (active) {
        fetchBalance();
      }
    }, 5000);

    const handleFocus = () => {
      if (active) {
        fetchBalance();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      active = false;
      clearInterval(pollInterval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [identifier, fetchBalance]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance
  };
}
