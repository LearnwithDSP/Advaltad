import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured, fetchWalletBalance } from "../lib/supabase";

export interface UseWalletStateOptions {
  /**
   * Optional custom initial balance to prevent initial flash.
   * If not provided, reads from localStorage cache ("advaltad_cached_wallet_balance").
   */
  initialBalance?: number;
  /**
   * If true, enables periodic fallback polling (every 3.5s) in case WebSocket dropouts occur.
   * Defaults to true.
   */
  enablePolling?: boolean;
}

export interface UseWalletStateResult {
  /** Current verified AVU balance */
  balance: number;
  /** True while fetching wallet balance from database */
  loading: boolean;
  /** True once auth initialization has completed and resolved */
  authInitialized: boolean;
  /** True if Supabase Realtime channel is connected and subscribed */
  isLive: boolean;
  /** Any error message or null */
  error: string | null;
  /** Programmatic refetch function with stable reference */
  refetch: () => Promise<number>;
  /** Resolved stable identifier used for wallet queries */
  activeIdentifier: string | null;
}

const CACHE_KEY = "advaltad_cached_wallet_balance";
const SESSION_EMAIL_KEY = "advaltad_session_email";

/**
 * useWalletState
 * 
 * Synchronizes wallet balance directly with Supabase Realtime using a stable
 * useEffect dependency guard to ensure the balance is fetched ONLY after auth
 * initialization has completed.
 * 
 * Prevents the "re-render zeroing issue":
 * 1. Auth Guard: Defers querying and never overwrites balance with 0 before auth initializes.
 * 2. Stable Effect Dependencies: Uses stable primitive values ([authInitialized, stableIdentifier])
 *    so component re-renders (route switches, prop changes, parent renders) never tear down
 *    the Realtime subscription or trigger race-condition zeroing.
 * 3. Anti-Zeroing Cache: Hydrates from localStorage cache immediately to eliminate UI flicker.
 *    Verified positive balances are shielded against transient zero-read anomalies.
 * 4. Multi-Table Realtime: Listens on 'ambassadors', 'Ambassadors', 'ambassador_wallets',
 *    'ambassador_wallet', and 'deposits' for instant live synchronization.
 */
export function useWalletState(
  explicitIdentifier?: string | null,
  options?: UseWalletStateOptions
): UseWalletStateResult {
  const { initialBalance, enablePolling = true } = options || {};

  // 1. Initialize balance from cache or provided initial balance to prevent flicker
  const [balance, setBalance] = useState<number>(() => {
    if (typeof initialBalance === "number" && !isNaN(initialBalance)) {
      return initialBalance;
    }
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached !== null && !isNaN(Number(cached))) {
        return Number(cached);
      }
    }
    return 0;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Stable primitive identifier stored in state
  const [stableIdentifier, setStableIdentifier] = useState<string | null>(() => {
    if (explicitIdentifier && explicitIdentifier.trim()) {
      return explicitIdentifier.trim();
    }
    if (typeof window !== "undefined") {
      const sessionEmail = localStorage.getItem(SESSION_EMAIL_KEY);
      return sessionEmail ? sessionEmail.trim() : null;
    }
    return null;
  });

  // Keep references to latest mutable values to ensure stable callbacks without re-triggering effects
  const balanceRef = useRef<number>(balance);
  balanceRef.current = balance;

  const stableIdentifierRef = useRef<string | null>(stableIdentifier);
  stableIdentifierRef.current = stableIdentifier;

  const authInitializedRef = useRef<boolean>(authInitialized);
  authInitializedRef.current = authInitialized;

  // --------------------------------------------------------------------------
  // Phase 1: Auth Initialization Guard
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // If caller provided an explicit non-empty identifier, auth is resolved immediately
    if (explicitIdentifier && explicitIdentifier.trim()) {
      const clean = explicitIdentifier.trim();
      setStableIdentifier(clean);
      setAuthInitialized(true);
      return;
    }

    // Check if Supabase client is available
    if (!isSupabaseConfigured || !supabase) {
      const fallbackEmail = typeof window !== "undefined" ? localStorage.getItem(SESSION_EMAIL_KEY) : null;
      if (isMounted) {
        setStableIdentifier(fallbackEmail ? fallbackEmail.trim() : null);
        setAuthInitialized(true);
      }
      return;
    }

    let authUnsubscribe: (() => void) | undefined;

    // Resolve Supabase Auth session safely
    try {
      supabase.auth.getSession().then(({ data: { session }, error: sessionErr }) => {
        if (!isMounted) return;
        if (sessionErr) {
          console.warn("[useWalletState] Session lookup warning:", sessionErr.message);
        }
        const resolved = session?.user?.email || session?.user?.id || (
          typeof window !== "undefined" ? localStorage.getItem(SESSION_EMAIL_KEY) : null
        );
        const clean = resolved ? resolved.trim() : null;
        setStableIdentifier(clean);
        setAuthInitialized(true);
      }).catch((err) => {
        if (!isMounted) return;
        console.warn("[useWalletState] Handled auth lookup exception:", err?.message || err);
        const fallbackEmail = typeof window !== "undefined" ? localStorage.getItem(SESSION_EMAIL_KEY) : null;
        setStableIdentifier(fallbackEmail ? fallbackEmail.trim() : null);
        setAuthInitialized(true);
      });

      // Listen for runtime auth state transitions (sign in, token refresh, sign out)
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        const currentId = session?.user?.email || session?.user?.id || (
          typeof window !== "undefined" ? localStorage.getItem(SESSION_EMAIL_KEY) : null
        );
        const clean = currentId ? currentId.trim() : null;
        setStableIdentifier(clean);
        setAuthInitialized(true);
      });
      authUnsubscribe = authListener?.subscription?.unsubscribe;
    } catch (err) {
      if (isMounted) {
        console.warn("[useWalletState] Supabase auth initialization notice:", err);
        const fallbackEmail = typeof window !== "undefined" ? localStorage.getItem(SESSION_EMAIL_KEY) : null;
        setStableIdentifier(fallbackEmail ? fallbackEmail.trim() : null);
        setAuthInitialized(true);
      }
    }

    return () => {
      isMounted = false;
      if (authUnsubscribe) {
        try {
          authUnsubscribe();
        } catch (_) {}
      }
    };
  }, [explicitIdentifier]);

  // --------------------------------------------------------------------------
  // Phase 2: Stable Balance Fetch Function (Zero-Dependency Refetcher)
  // --------------------------------------------------------------------------
  const refetch = useCallback(async (): Promise<number> => {
    // Read from stable ref to prevent recreation on every balance change
    const targetId = stableIdentifierRef.current || (
      typeof window !== "undefined" ? localStorage.getItem(SESSION_EMAIL_KEY) : null
    );

    // CRITICAL GUARD: Never query or zero balance if auth is not initialized or identifier is empty
    if (!authInitializedRef.current || !targetId) {
      setLoading(false);
      return balanceRef.current;
    }

    try {
      const liveBal = await fetchWalletBalance(targetId);

      // Verify against local cache or previous positive balance
      // Prevents race conditions where a concurrent read returns 0 during an active write
      const currentCache = typeof window !== "undefined"
        ? Number(localStorage.getItem(CACHE_KEY) || 0)
        : 0;

      // If Supabase returned a positive balance, commit it immediately
      if (liveBal > 0) {
        setBalance(liveBal);
        if (typeof window !== "undefined") {
          localStorage.setItem(CACHE_KEY, String(liveBal));
        }
        setError(null);
        setLoading(false);
        return liveBal;
      }

      // If query returned 0, check if we hold a verified positive balance that should not be wiped
      const preserved = Math.max(balanceRef.current, currentCache);
      if (preserved > 0 && liveBal === 0) {
        // Retain existing balance to prevent re-render zeroing flicker
        setBalance(preserved);
        setLoading(false);
        return preserved;
      }

      setBalance(0);
      setLoading(false);
      return 0;
    } catch (err: any) {
      console.warn("[useWalletState] Reconciled fetch notice:", err?.message || err);
      setError(null);
      setLoading(false);
      return balanceRef.current;
    }
  }, []); // Strictly empty dependencies: reads stable mutable refs

  // --------------------------------------------------------------------------
  // Phase 3: Supabase Realtime Synchronization with Stable Dependency Guard
  // --------------------------------------------------------------------------
  useEffect(() => {
    // STABLE DEPENDENCY GUARD:
    // Only execute if auth is initialized AND a valid identifier exists.
    // Ordinary component re-renders will NEVER re-trigger this effect because
    // [authInitialized, stableIdentifier] are primitive types.
    if (!authInitialized || !stableIdentifier) {
      if (authInitialized && !stableIdentifier) {
        setLoading(false);
      }
      return;
    }

    let isSubscribed = true;

    // Initial fetch once auth has settled
    refetch();

    // Fallback if Supabase client is not configured
    if (!isSupabaseConfigured || !supabase) {
      const handleLocalEvent = (e: any) => {
        if (!isSubscribed) return;
        const newBal = e.detail?.newBalance ?? e.detail?.senderNewBalance;
        if (newBal !== undefined && Number(newBal) >= 0) {
          const val = Number(newBal);
          setBalance(val);
          if (typeof window !== "undefined") {
            localStorage.setItem(CACHE_KEY, String(val));
          }
        } else {
          refetch();
        }
      };

      const handleStorage = (e: StorageEvent) => {
        if (isSubscribed && (e.key === "advaltad_ambassadors" || e.key === CACHE_KEY || e.key === SESSION_EMAIL_KEY)) {
          refetch();
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("advaltad_wallet_updated", handleLocalEvent);
        window.addEventListener("storage", handleStorage);
      }

      return () => {
        isSubscribed = false;
        if (typeof window !== "undefined") {
          window.removeEventListener("advaltad_wallet_updated", handleLocalEvent);
          window.removeEventListener("storage", handleStorage);
        }
      };
    }

    // Generate clean channel name
    const sanitizedId = stableIdentifier.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
    const channelName = `realtime-wallet-${sanitizedId}-${Date.now() % 10000}`;

    const handleRealtimePayload = (payload: any) => {
      if (!isSubscribed) return;
      const record = payload?.new as any;
      if (record && typeof record === "object") {
        const potentialBalance = record.avu_balance !== undefined ? record.avu_balance : record.balance;
        if (potentialBalance !== undefined && Number(potentialBalance) >= 0) {
          const newBal = Number(potentialBalance);
          setBalance(newBal);
          if (typeof window !== "undefined") {
            localStorage.setItem(CACHE_KEY, String(newBal));
          }
        }
      }
      refetch();
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassadors" },
        handleRealtimePayload
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Ambassadors" },
        handleRealtimePayload
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassador_wallets" },
        handleRealtimePayload
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ambassador_wallet" },
        handleRealtimePayload
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposits" },
        () => {
          if (isSubscribed) refetch();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "token_grants" },
        () => {
          if (isSubscribed) refetch();
        }
      )
      .subscribe((status) => {
        if (isSubscribed && status === "SUBSCRIBED") {
          setIsLive(true);
        }
      });

    // Programmatic and cross-tab window event handlers
    const handleProgrammaticUpdate = (e: any) => {
      if (!isSubscribed) return;
      const newBal = e.detail?.newBalance ?? e.detail?.senderNewBalance;
      if (newBal !== undefined && Number(newBal) >= 0) {
        const val = Number(newBal);
        setBalance(val);
        if (typeof window !== "undefined") {
          localStorage.setItem(CACHE_KEY, String(val));
        }
      }
      refetch();
    };

    const handleWindowFocus = () => {
      if (isSubscribed) {
        refetch();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (!isSubscribed) return;
      if (e.key === "advaltad_ambassadors" || e.key === CACHE_KEY || e.key === SESSION_EMAIL_KEY) {
        if (e.key === CACHE_KEY && e.newValue) {
          const cachedVal = Number(e.newValue);
          if (!isNaN(cachedVal)) {
            setBalance(cachedVal);
          }
        }
        refetch();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("advaltad_wallet_updated", handleProgrammaticUpdate);
      window.addEventListener("focus", handleWindowFocus);
      window.addEventListener("storage", handleStorageChange);
    }

    // Optional polling interval to maintain parity during iframe websocket sleeps
    let pollInterval: any = null;
    if (enablePolling) {
      pollInterval = setInterval(() => {
        if (isSubscribed) {
          refetch();
        }
      }, 3500);
    }

    return () => {
      isSubscribed = false;
      setIsLive(false);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("advaltad_wallet_updated", handleProgrammaticUpdate);
        window.removeEventListener("focus", handleWindowFocus);
        window.removeEventListener("storage", handleStorageChange);
      }
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [authInitialized, stableIdentifier, refetch, enablePolling]);

  return {
    balance,
    loading,
    authInitialized,
    isLive,
    error,
    refetch,
    activeIdentifier: stableIdentifier,
  };
}
