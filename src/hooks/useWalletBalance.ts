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

      let query = client.from("ambassadors").select("avu_balance, email, id, user_id");

      const isStrictUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (isStrictUuid) {
        query = query.or(`id.eq.${cleanId},user_id.eq.${cleanId}`);
      } else if (cleanId.includes("@")) {
        query = query.eq("email", cleanId);
      } else {
        const storedEmail = typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null;
        if (storedEmail && storedEmail.includes("@")) {
          query = query.eq("email", storedEmail.trim().toLowerCase());
        } else {
          query = query.eq("email", cleanId);
        }
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) {
        console.warn("useWalletBalance fetch error:", fetchErr);
        setError(fetchErr.message);
        setLoading(false);
        return balance;
      }

      if (data && data.length > 0) {
        const row = data[0];
        const currentBal = Number(row?.avu_balance) || 0;
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
