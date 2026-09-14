import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured, fetchWalletBalance } from "../lib/supabase";

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
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("advaltad_cached_wallet_balance");
      if (cached && !isNaN(Number(cached))) {
        return Number(cached);
      }
    }
    return 0;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedIdentifier = (
    identifier || (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null) || ""
  ).trim();

  const fetchBalance = useCallback(async (): Promise<number> => {
    const idToUse = (
      resolvedIdentifier || (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null) || ""
    ).trim();

    if (!idToUse) {
      // Never zero out state if identifier is still resolving (guards against refresh race conditions)
      setLoading(false);
      return balance;
    }

    try {
      const currentBal = await fetchWalletBalance(idToUse);
      setBalance(currentBal);
      if (typeof window !== "undefined") {
        localStorage.setItem("advaltad_cached_wallet_balance", String(currentBal));
      }
      setError(null);
      setLoading(false);
      return currentBal;
    } catch (err: any) {
      console.error("useWalletBalance error:", err);
      setError(err?.message || "Failed to fetch wallet balance");
      setLoading(false);
      return balance;
    }
  }, [resolvedIdentifier, balance]);

  useEffect(() => {
    let active = true;

    fetchBalance();

    const idToUse = (
      resolvedIdentifier || (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null) || ""
    ).trim();

    if (!idToUse || !isSupabaseConfigured || !supabase) {
      // Still listen to local events even if supabase is not yet ready
      const handleWalletUpdated = (e: any) => {
        if (active) {
          if (e.detail?.newBalance !== undefined) {
            setBalance(Number(e.detail.newBalance));
          } else if (e.detail?.senderNewBalance !== undefined) {
            setBalance(Number(e.detail.senderNewBalance));
          }
          fetchBalance();
        }
      };

      const handleStorage = (e: StorageEvent) => {
        if (active && (e.key === "advaltad_ambassadors" || e.key === "advaltad_wallets" || e.key === "advaltad_session_email")) {
          fetchBalance();
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("advaltad_wallet_updated", handleWalletUpdated);
        window.addEventListener("storage", handleStorage);
      }

      return () => {
        active = false;
        if (typeof window !== "undefined") {
          window.removeEventListener("advaltad_wallet_updated", handleWalletUpdated);
          window.removeEventListener("storage", handleStorage);
        }
      };
    }

    const cleanId = idToUse.toLowerCase();

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassador_wallet" },
        async (payload: any) => {
          if (!active) return;
          console.info("[useWalletBalance] Realtime update on ambassador_wallet table:", payload);
          await fetchBalance();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassador_wallets" },
        async (payload: any) => {
          if (!active) return;
          console.info("[useWalletBalance] Realtime update on ambassador_wallets table:", payload);
          await fetchBalance();
        }
      )
      .subscribe();

    // Periodic polling as a rock-solid fallback when realtime web-sockets are delayed in iframes or across tabs
    const pollInterval = setInterval(() => {
      if (active) {
        fetchBalance();
      }
    }, 3500);

    const handleFocus = () => {
      if (active) {
        fetchBalance();
      }
    };

    const handleWalletUpdated = (e: any) => {
      if (active) {
        if (e.detail?.newBalance !== undefined) {
          setBalance(Number(e.detail.newBalance));
        } else if (e.detail?.senderNewBalance !== undefined) {
          setBalance(Number(e.detail.senderNewBalance));
        }
        fetchBalance();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (active && (e.key === "advaltad_ambassadors" || e.key === "advaltad_wallets" || e.key === "advaltad_session_email")) {
        fetchBalance();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
      window.addEventListener("advaltad_wallet_updated", handleWalletUpdated);
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      active = false;
      clearInterval(pollInterval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("advaltad_wallet_updated", handleWalletUpdated);
        window.removeEventListener("storage", handleStorage);
      }
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [resolvedIdentifier, fetchBalance]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance
  };
}
