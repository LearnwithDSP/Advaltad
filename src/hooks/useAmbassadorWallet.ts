import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface UseAmbassadorWalletResult {
  balance: number;
  loading: boolean;
  authLoading: boolean;
  error: string | null;
  isLive: boolean;
  refetch: () => Promise<number>;
}

/**
 * Production-grade custom hook for Ambassador AVU Wallet Balance.
 * 
 * FIXES ROOT CAUSE OF "FLASH AND DISAPPEAR" BUG:
 * 1. Waits for Supabase Auth to finish initializing before querying.
 * 2. Never zeroes out state during auth loading or transient unauthenticated frames.
 * 3. Uses localStorage cache to eliminate UI flicker on refresh.
 * 4. Subscribes to Supabase Postgres Realtime for instant balance updates on Paystack or Admin credits.
 */
export function useAmbassadorWallet(explicitUserId?: string | null): UseAmbassadorWalletResult {
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
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeUserId, setActiveUserId] = useState<string | null>(explicitUserId || null);
  const activeUserIdRef = useRef<string | null>(explicitUserId || null);
  activeUserIdRef.current = activeUserId;

  // --------------------------------------------------------------------------
  // Step 1: Wait for Supabase Auth session to stabilize before firing queries
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (explicitUserId) {
      setActiveUserId(explicitUserId);
      setAuthLoading(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      // Fallback session email if Supabase Auth is offline
      const sessionEmail = typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null;
      setActiveUserId(sessionEmail);
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    // Fetch initial auth session
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!isMounted) return;
      if (sessionError) {
        console.warn("[useAmbassadorWallet] Session resolution warning:", sessionError.message);
      }
      const resolvedId = session?.user?.id || (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null);
      setActiveUserId(resolvedId);
      setAuthLoading(false);
    });

    // Subscribe to auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const currentId = session?.user?.id || (typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null);
      setActiveUserId(currentId);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [explicitUserId]);

  // --------------------------------------------------------------------------
  // Step 2: Atomic Wallet Fetch from PostgreSQL Single Source of Truth
  // --------------------------------------------------------------------------
  const fetchBalance = useCallback(async (): Promise<number> => {
    const userId = activeUserIdRef.current;

    // CRITICAL GUARD: Do not query or reset balance if auth is still resolving
    if (!userId) {
      setLoading(false);
      // Return existing state; NEVER zero out prematurely!
      return balance;
    }

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return balance;
    }

    try {
      // 1. Try atomic PostgreSQL RPC get_or_create_ambassador_wallet
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);

      if (isUuid) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_or_create_ambassador_wallet", {
          p_ambassador_id: userId,
        });

        if (!rpcError && rpcData && rpcData.length > 0) {
          const val = Number(rpcData[0].avu_balance ?? 0);
          setBalance(val);
          localStorage.setItem("advaltad_cached_wallet_balance", String(val));
          setError(null);
          setLoading(false);
          return val;
        }

        // 2. Direct select from ambassador_wallets table
        const { data: walletRow, error: walletError } = await supabase
          .from("ambassador_wallets")
          .select("avu_balance")
          .eq("ambassador_id", userId)
          .maybeSingle();

        if (!walletError && walletRow) {
          const val = Number(walletRow.avu_balance ?? 0);
          setBalance(val);
          localStorage.setItem("advaltad_cached_wallet_balance", String(val));
          setError(null);
          setLoading(false);
          return val;
        }
      }

      // 3. Fallback: Query ambassadors table (supporting email or UUID identifier)
      let query = supabase.from("ambassadors").select("avu_balance, ledger_balance");
      if (userId.includes("@")) {
        query = query.ilike("email", userId.trim().toLowerCase());
      } else if (isUuid) {
        query = query.or(`id.eq.${userId},user_id.eq.${userId}`);
      } else {
        query = query.eq("ambassador_id", userId);
      }

      const { data: ambRow, error: ambError } = await query.maybeSingle();
      if (!ambError && ambRow) {
        const val = Number(ambRow.avu_balance ?? ambRow.ledger_balance ?? 0);
        setBalance(val);
        localStorage.setItem("advaltad_cached_wallet_balance", String(val));
        setError(null);
        setLoading(false);
        return val;
      }

      setLoading(false);
      return balance;
    } catch (err: any) {
      console.error("[useAmbassadorWallet] Fetch error:", err);
      setError(err?.message || "Failed to load wallet balance");
      setLoading(false);
      // Keep existing balance; do not zero out on transient network error
      return balance;
    }
  }, [balance]);

  // --------------------------------------------------------------------------
  // Step 3: Realtime Subscription & Live Event Synchronization
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Wait until Auth is fully loaded before launching queries or subscriptions
    if (authLoading || !activeUserId) {
      return;
    }

    let isSubscribed = true;
    fetchBalance();

    if (!isSupabaseConfigured || !supabase) {
      // Local event listener fallback
      const handleLocalUpdate = (e: any) => {
        if (!isSubscribed) return;
        const newBal = e.detail?.newBalance ?? e.detail?.senderNewBalance;
        if (newBal !== undefined) {
          setBalance(Number(newBal));
          localStorage.setItem("advaltad_cached_wallet_balance", String(newBal));
        } else {
          fetchBalance();
        }
      };

      window.addEventListener("advaltad_wallet_updated", handleLocalUpdate);
      return () => {
        isSubscribed = false;
        window.removeEventListener("advaltad_wallet_updated", handleLocalUpdate);
      };
    }

    // Set up Supabase Realtime channel on ambassador_wallets table
    const channelName = `wallet-sync-${activeUserId.slice(0, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ambassador_wallets",
        },
        (payload) => {
          if (!isSubscribed) return;
          console.log("[useAmbassadorWallet] Realtime event on ambassador_wallets:", payload);
          const newRecord = payload.new as any;
          if (newRecord?.avu_balance !== undefined) {
            const newBal = Number(newRecord.avu_balance);
            setBalance(newBal);
            localStorage.setItem("advaltad_cached_wallet_balance", String(newBal));
          } else {
            fetchBalance();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ambassadors",
        },
        (payload) => {
          if (!isSubscribed) return;
          console.log("[useAmbassadorWallet] Realtime event on ambassadors:", payload);
          const newRecord = payload.new as any;
          if (newRecord?.avu_balance !== undefined) {
            const newBal = Number(newRecord.avu_balance);
            setBalance(newBal);
            localStorage.setItem("advaltad_cached_wallet_balance", String(newBal));
          } else {
            fetchBalance();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLive(true);
        }
      });

    // Cross-tab and programmatic event sync
    const handleWalletEvent = (e: any) => {
      if (!isSubscribed) return;
      const newBal = e.detail?.newBalance ?? e.detail?.senderNewBalance;
      if (newBal !== undefined) {
        setBalance(Number(newBal));
        localStorage.setItem("advaltad_cached_wallet_balance", String(newBal));
      }
      fetchBalance();
    };

    const handleFocus = () => {
      if (isSubscribed) {
        fetchBalance();
      }
    };

    window.addEventListener("advaltad_wallet_updated", handleWalletEvent);
    window.addEventListener("focus", handleFocus);

    // Reliable background polling fallback every 4 seconds
    const intervalId = setInterval(() => {
      if (isSubscribed) {
        fetchBalance();
      }
    }, 4000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      window.removeEventListener("advaltad_wallet_updated", handleWalletEvent);
      window.removeEventListener("focus", handleFocus);
      supabase.removeChannel(channel);
    };
  }, [authLoading, activeUserId, fetchBalance]);

  return {
    balance,
    loading,
    authLoading,
    error,
    isLive,
    refetch: fetchBalance,
  };
}
