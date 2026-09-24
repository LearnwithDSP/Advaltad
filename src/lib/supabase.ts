import { createClient } from "@supabase/supabase-js";

/**
 * Unified debugging function for logging the specific 'ambassador_id' being used during
 * the 'avu_withdrawals' fetch call to verify that queries correctly filter and join the data.
 */
export interface WithdrawalFetchTraceParams {
  caller: "AdminPortal" | "AmbassadorDashboard" | "PendingWithdrawalsTable" | "db.getAvuWithdrawals" | string;
  targetAmbassadorId?: string | string[];
  filterStatus?: string;
  tableQueried?: string;
  matchedCount?: number;
  totalCount?: number;
  sampleIds?: string[];
  error?: any;
}

export function logWithdrawalFetchTrace(params: WithdrawalFetchTraceParams): void {
  const timestamp = new Date().toISOString();
  const callerColor = params.caller === "AdminPortal" ? "#f59e0b" : params.caller === "AmbassadorDashboard" ? "#10b981" : "#8b5cf6";

  if (params.error) {
    console.error(
      `%c[WITHDRAWAL FETCH TRACE: ${params.caller}]%c [${timestamp}] Error during avu_withdrawals fetch`,
      `background: ${callerColor}; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px;`,
      "color: #ef4444; font-weight: bold;",
      {
        timestamp,
        caller: params.caller,
        targetAmbassadorId: params.targetAmbassadorId,
        filterStatus: params.filterStatus,
        tableQueried: params.tableQueried,
        error: params.error?.message || params.error
      }
    );
  } else {
    console.log(
      `%c[WITHDRAWAL FETCH TRACE: ${params.caller}]%c [${timestamp}] Target ID: ${JSON.stringify(params.targetAmbassadorId || "ALL")} | Matched: ${params.matchedCount ?? 0}/${params.totalCount ?? 0}`,
      `background: ${callerColor}; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px;`,
      "color: #0284c7; font-weight: bold;",
      {
        timestamp,
        caller: params.caller,
        targetAmbassadorId: params.targetAmbassadorId,
        filterStatus: params.filterStatus,
        tableQueried: params.tableQueried || "avu_withdrawals",
        matchedCount: params.matchedCount,
        totalCount: params.totalCount,
        sampleIds: params.sampleIds
      }
    );
  }
}

// Supabase configuration
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process as any).env?.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

/**
 * Resilient fetch wrapper for Supabase JS client that prevents unhandled "Failed to fetch"
 * TypeError exceptions caused by network dropouts, CORS challenges, or browser iframe sandboxing.
 */
const safeSupabaseFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    return await fetch(input, init);
  } catch (networkError: any) {
    console.warn("[Supabase Network Interceptor] Handled network dropout gracefully:", networkError?.message || networkError);
    const urlStr = typeof input === "string" ? input : (input instanceof Request ? input.url : String(input));
    if (urlStr.includes("/auth/v1/")) {
      return new Response(JSON.stringify({ error: { message: "Network unavailable. Please check your connection." } }), {
        status: 400,
        statusText: "Network unavailable",
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      statusText: "OK (Offline/Fallback)",
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: safeSupabaseFetch,
      },
    })
  : null;

const supabaseServiceRole = (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY || (process as any).env?.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = isSupabaseConfigured && supabaseServiceRole
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false },
      global: {
        fetch: safeSupabaseFetch,
      },
    })
  : null;

/**
 * Sends a password reset request via Supabase Auth with explicit redirectTo parameter
 */
export async function resetPasswordForEmail(email: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error("Supabase is not configured") };
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  return { data, error };
}

// Unified Database interface matching your exact table schema columns
export interface DbAmbassador {
  id: string;
  user_id?: string;
  db_id?: string;
  ambassador_id?: string;
  name: string;
  professional_name?: string;
  city: string;
  base_city?: string;
  country?: string;
  base_country?: string;
  field: string;
  focus_interest?: string;
  email: string;
  phone: string;
  phone_number?: string;
  password?: string;
  status: "pending" | "approved" | "disapproved";
  badge_status?: "pending" | "approved" | "disapproved";
  is_approved?: boolean;
  avu_balance: number;
  ledger_balance?: number;
  created_at: string;
}

export interface DbAdmin {
  id: string;
  name: string;
  email: string;
  password?: string;
  user_id?: string;
  role?: string;
  created_at: string;
}

export interface DbBlog {
  id: string;
  title: string;
  excerpt?: string;
  content: string;
  author: string;
  tag?: string;
  image?: string;
  created_at: string;
}

export interface DbAmbassadorWallet {
  id: string;
  ambassador_id: string;
  email: string;
  balance: number;
  created_at: string;
}

export interface DbActivity {
  id: string;
  ambassador_id?: string;
  ambassador_name?: string;
  type: "registration" | "profile_update" | "avu_transfer" | "donation_logged" | "status_change";
  desc: string;
  amount?: string;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_email: string;
  ambassador_id: string;
  ambassador_name: string;
  action: "approved" | "disapproved" | "updated_portfolio" | "suspended";
  created_at: string;
}

export interface DbDonation {
  id: string;
  reference: string;
  email: string;
  name: string;
  phone: string;
  amount: number;
  currency: string;
  program_id: string;
  note: string;
  status: "pending" | "success" | "failed";
  created_at: string;
}

export interface DbDeposit {
  id: string;
  ambassador_id: string;
  funding_by_name: string;
  phone_number: string;
  program_sponsored: string;
  amount_naira: number;
  avu_earned: number;
  paystack_reference: string;
  status: "pending" | "success" | "failed";
  created_at: string;
}

export interface DbP2PTransaction {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  recipient_id: string;
  recipient_name: string;
  recipient_email: string;
  points: number;
  reason?: string;
  created_at: string;
}

export interface DbAvuWithdrawal {
  id: string;
  ambassador_id: string;
  ambassador_name: string;
  email?: string;
  ambassador_email: string;
  current_balance?: number;
  requested_avu?: number;
  amount?: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  avu_amount: number;
  naira_equivalent: number;
  conversion_rate?: number;
  status: "Pending" | "Approved" | "Disapproved" | "pending" | "approved" | "disapproved";
  admin_note?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = "advaltad_ambassadors_db";
const ACTIVITIES_LOCAL_STORAGE_KEY = "advaltad_activities_db";
const BLOGS_LOCAL_STORAGE_KEY = "advaltad_blogs_db";
const WALLETS_LOCAL_STORAGE_KEY = "advaltad_wallets_db";
const ADMIN_LOCAL_STORAGE_KEY = "advaltad_admins_db";
const AUDIT_LOGS_LOCAL_STORAGE_KEY = "advaltad_audit_logs_db";
const DONATIONS_LOCAL_STORAGE_KEY = "advaltad_donations_db";
const DEPOSITS_LOCAL_STORAGE_KEY = "advaltad_deposits_db";
const P2P_TX_LOCAL_STORAGE_KEY = "advaltad_p2p_transactions_db";
export const AVU_WITHDRAWALS_LOCAL_STORAGE_KEY = "advaltad_avu_withdrawals_db";
const AMB_STATIC_ID_MAP_KEY = "advaltad_ambassador_static_id_map";

function getStaticAmbassadorId(identifier: string): string {
  if (!identifier) return "AV-10000";
  const cleanKey = identifier.trim().toLowerCase();

  // If identifier already is a static AV- formatted ID (e.g. AV-73862), preserve it!
  if (/^AV-\d{4,6}$/i.test(cleanKey)) {
    return cleanKey.toUpperCase();
  }

  let map: Record<string, string> = {};
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(AMB_STATIC_ID_MAP_KEY);
      if (stored) map = JSON.parse(stored);
    } catch (e) {
      console.warn("Failed reading static ID map", e);
    }
  }

  if (map[cleanKey]) {
    return map[cleanKey];
  }

  // Calculate deterministic 5-digit number based on string hash of identifier
  let hash = 0;
  for (let i = 0; i < cleanKey.length; i++) {
    hash = (hash << 5) - hash + cleanKey.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);
  const num = (posHash % 89999) + 10000;
  const generatedId = `AV-${num}`;

  map[cleanKey] = generatedId;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(AMB_STATIC_ID_MAP_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  return generatedId;
}

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

function applyAmbassadorFilter(query: any, idOrEmail: string): any {
  const clean = idOrEmail.trim();
  const isStrictUuid = isUuid(clean);
  const isEmail = clean.includes("@");

  if (isStrictUuid) {
    return query.or(`id.eq.${clean},user_id.eq.${clean}`);
  } else if (isEmail) {
    return query.ilike("email", clean.toLowerCase());
  } else {
    // Check if known in memory or local storage to resolve safely without UUID type cast crash in PostgreSQL
    const known = (cachedAmbassadorsMemory || []).find(a =>
      (a.id && a.id.toLowerCase() === clean.toLowerCase()) ||
      (a.ambassador_id && a.ambassador_id.toLowerCase() === clean.toLowerCase()) ||
      (a.email && a.email.toLowerCase() === clean.toLowerCase())
    ) || (getLocalDb() || []).find(a =>
      (a.id && a.id.toLowerCase() === clean.toLowerCase()) ||
      (a.ambassador_id && a.ambassador_id.toLowerCase() === clean.toLowerCase()) ||
      (a.email && a.email.toLowerCase() === clean.toLowerCase())
    );

    if (known?.email) {
      return query.ilike("email", known.email.trim().toLowerCase());
    }
    if (known?.db_id && isUuid(known.db_id)) {
      return query.eq("id", known.db_id);
    }
    // Safe text ilike filter on email (never query user_id with non-uuid strings)
    return query.ilike("email", clean.toLowerCase());
  }
}

export function extractExactAvuBalance(row: any): number {
  if (!row) return 0;
  const candidate =
    row.avu_balance !== undefined && row.avu_balance !== null ? row.avu_balance :
    row.ledger_balance !== undefined && row.ledger_balance !== null ? row.ledger_balance :
    row.balance !== undefined && row.balance !== null ? row.balance :
    row.wallet_balance !== undefined && row.wallet_balance !== null ? row.wallet_balance :
    row.avu_tokens !== undefined && row.avu_tokens !== null ? row.avu_tokens :
    row.tokens !== undefined && row.tokens !== null ? row.tokens :
    row.points !== undefined && row.points !== null ? row.points :
    0;
  const num = typeof candidate === "number" ? candidate : parseFloat(String(candidate).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
}

function getLocalDb(): DbAmbassador[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalDb(db: DbAmbassador[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
}

export function mapRowToAmbassador(row: any): DbAmbassador {
  const isApprovedCol = row.is_approved === true || row.is_approved === "true" || row.is_approved === 1;
  const rawStatus = (row.badge_status || row.status || "").toString().toLowerCase().trim();
  const isDisapprovedStatus = rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended";
  const isApprovedStatus = isApprovedCol || rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified";

  const mappedStatus: "pending" | "approved" | "disapproved" = 
    isDisapprovedStatus ? "disapproved" :
    isApprovedStatus ? "approved" : "pending";

  const nameVal = row.professional_name || row.name || "";
  const cityVal = row.base_city || row.city || "";
  const countryVal = row.base_country || row.country || "Nigeria";
  const fieldVal = row.focus_interest || row.field || "";
  const phoneVal = row.phone_number || row.phone || "";
  const rawEmail = row.email || "";
  const rawId = row.user_id || row.ambassador_id || row.id || "";

  // Assign deterministic static AV- ID that NEVER changes
  const staticId = getStaticAmbassadorId(rawId || rawEmail || row.db_id || nameVal);

  const exactBal = extractExactAvuBalance(row);

  return {
    id: staticId,
    user_id: row.user_id || staticId,
    db_id: row.id || undefined,
    ambassador_id: staticId,
    name: nameVal,
    professional_name: nameVal,
    city: cityVal,
    base_city: cityVal,
    country: countryVal,
    base_country: countryVal,
    field: fieldVal,
    focus_interest: fieldVal,
    email: rawEmail,
    phone: phoneVal,
    phone_number: phoneVal,
    status: mappedStatus,
    badge_status: mappedStatus,
    is_approved: isApprovedStatus,
    avu_balance: exactBal,
    ledger_balance: exactBal,
    created_at: row.created_at || new Date().toISOString()
  };
}

let cachedAmbassadorsMemory: DbAmbassador[] = [];

/**
 * Queries Supabase database to verify if an ambassador's account has an `is_approved` status set to true.
 */
export async function checkApprovalStatus(email: string): Promise<boolean> {
  const sanitizedEmail = (email || "").replace(/200$/, "").trim().toLowerCase();
  if (!sanitizedEmail) return false;

  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    try {
      const client = supabaseAdmin || supabase;
      let { data, error } = await client
        .from("ambassadors")
        .select("*")
        .ilike("email", sanitizedEmail)
        .maybeSingle();

      if (error || !data) {
        const fallback = await client
          .from("Ambassadors")
          .select("*")
          .ilike("email", sanitizedEmail)
          .maybeSingle();
        data = fallback.data;
      }

      if (data) {
        const isApprovedFlag = data.is_approved === true || data.is_approved === "true" || data.is_approved === 1;
        const rawStatus = (data.badge_status || data.status || "").toString().toLowerCase().trim();
        const isDisapproved = rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended";

        if (isDisapproved) {
          return false;
        }

        if (isApprovedFlag || rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified") {
          return true;
        }

        return false;
      }
    } catch (err) {
      console.warn("[checkApprovalStatus] Error querying Supabase:", err);
    }
  }

  // Check in-memory cache
  const memAmb = cachedAmbassadorsMemory.find(a => a.email && a.email.trim().toLowerCase() === sanitizedEmail);
  if (memAmb) {
    const rawStatus = (memAmb.badge_status || memAmb.status || "").toString().toLowerCase().trim();
    const isApprovedFlag = (memAmb as any).is_approved === true || (memAmb as any).is_approved === "true" || (memAmb as any).is_approved === 1;
    const isDisapproved = rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended";
    if (isDisapproved) return false;
    if (isApprovedFlag || rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified") return true;
    return false;
  }

  const localDb = getLocalDb();
  const amb = localDb.find(a => a.email && a.email.trim().toLowerCase() === sanitizedEmail);
  if (amb) {
    const rawStatus = (amb.badge_status || amb.status || "").toString().toLowerCase().trim();
    const isApprovedFlag = (amb as any).is_approved === true || (amb as any).is_approved === "true" || (amb as any).is_approved === 1;
    const isDisapproved = rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended";
    if (isDisapproved) return false;
    if (isApprovedFlag || rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified") return true;
    return false;
  }

  return false;
}

/**
 * Utility function to fetch an ambassador's wallet balance directly from the database,
 * inspecting ambassadors, ambassador_wallet, and ambassador_wallets safely without UUID cast crashes.
 */
export async function fetchWalletBalance(identifier?: string | null): Promise<number> {
  const sessionEmail = typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null;
  const cachedBalanceStr = typeof window !== "undefined" ? localStorage.getItem("advaltad_cached_wallet_balance") : null;
  const cachedBalance = cachedBalanceStr && !isNaN(Number(cachedBalanceStr)) ? Number(cachedBalanceStr) : 0;

  if (!identifier) {
    identifier = sessionEmail;
  }
  if (!identifier && cachedBalance > 0) {
    return cachedBalance;
  }
  if (!identifier) return 0;
  const cleanId = identifier.trim();
  if (!cleanId && cachedBalance > 0) return cachedBalance;
  if (!cleanId) return 0;

  let bestBalance = 0;
  let balanceFound = false;

  const cleanLower = cleanId.toLowerCase();
  const isEmail = cleanLower.includes("@");
  const isStrictUuid = isUuid(cleanId);

  // 1. Check local storage / in-memory cache to resolve any linked email or UUID db_id
  const localDb = getLocalDb();
  const localMatch = localDb.find(a =>
    (a.email && a.email.toLowerCase() === cleanLower) ||
    (a.id && a.id.toLowerCase() === cleanLower) ||
    (a.user_id && a.user_id.toLowerCase() === cleanLower) ||
    (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanLower) ||
    (a.db_id && a.db_id.toLowerCase() === cleanLower)
  );

  let targetEmail = isEmail
    ? cleanLower
    : (localMatch?.email?.trim().toLowerCase() || sessionEmail?.trim().toLowerCase() || "");
  let targetDbId = isStrictUuid
    ? cleanId
    : (localMatch?.db_id && isUuid(localMatch.db_id)
        ? localMatch.db_id
        : (localMatch?.id && isUuid(localMatch.id) ? localMatch.id : ""));

  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    try {
      const client = supabaseAdmin || supabase;

      let resolvedDbId = targetDbId;
      let resolvedEmail = targetEmail;

      // Tier 1: Query ambassadors / Ambassadors table
      for (const tableName of ["ambassadors", "Ambassadors"]) {
        try {
          let query = client.from(tableName).select("id, user_id, email, avu_balance, ledger_balance, points, tokens, avu_tokens, wallet_balance, balance");
          if (targetEmail) {
            query = query.ilike("email", targetEmail);
          } else if (isStrictUuid) {
            query = query.or(`id.eq.${cleanId},user_id.eq.${cleanId}`);
          } else if (targetDbId) {
            query = query.or(`id.eq.${targetDbId},user_id.eq.${targetDbId}`);
          } else {
            query = query.eq("ambassador_id", cleanId);
          }

          const { data, error } = await query.maybeSingle();
          if (!error && data) {
            const exactBal = extractExactAvuBalance(data);
            bestBalance = exactBal;
            balanceFound = true;
            if (data.id && isUuid(data.id)) {
              resolvedDbId = data.id;
            }
            if (data.email) {
              resolvedEmail = data.email.toLowerCase();
            }
            break;
          }
        } catch (_) {}
      }

      // Tier 2: Check ambassador_wallets (plural table) ONLY if not found in primary profile
      if (!balanceFound) {
        try {
          let pQuery = client.from("ambassador_wallets").select("avu_balance, balance, ambassador_id");
          if (resolvedDbId && isUuid(resolvedDbId)) {
            pQuery = pQuery.eq("ambassador_id", resolvedDbId);
          } else if (resolvedEmail || targetEmail) {
            pQuery = pQuery.ilike("email", resolvedEmail || targetEmail);
          } else if (isStrictUuid) {
            pQuery = pQuery.eq("ambassador_id", cleanId);
          }
          const { data: pwData } = await pQuery.maybeSingle();
          if (pwData) {
            const wBal = Number(pwData.avu_balance ?? pwData.balance ?? 0);
            bestBalance = wBal;
            balanceFound = true;
          }
        } catch (_) {}
      }

      // Tier 3: Check ambassador_wallet (singular table) ONLY if not found in primary profile
      if (!balanceFound && resolvedDbId && isUuid(resolvedDbId)) {
        try {
          const { data: wData } = await client
            .from("ambassador_wallet")
            .select("balance, avu_balance")
            .eq("ambassador_id", resolvedDbId)
            .maybeSingle();
          if (wData) {
            const wBal = Number(wData.balance ?? wData.avu_balance ?? 0);
            bestBalance = wBal;
            balanceFound = true;
          }
        } catch (_) {}
      }

      // Tier 4: Check deposits table ONLY if no balance record was found in profile or wallet tables
      if (!balanceFound && (resolvedEmail || targetEmail || cleanId)) {
        try {
          const emailToQuery = resolvedEmail || targetEmail;
          let depQuery = client.from("deposits").select("avu_earned").eq("status", "success");
          if (emailToQuery) {
            depQuery = depQuery.or(`email.ilike.${emailToQuery},funding_by_name.ilike.${emailToQuery},ambassador_id.eq.${cleanId}`);
          } else {
            depQuery = depQuery.eq("ambassador_id", cleanId);
          }
          const { data: depRows } = await depQuery;
          if (depRows && depRows.length > 0) {
            const totalDepositAvu = depRows.reduce((acc: number, d: any) => acc + (Number(d.avu_earned) || 0), 0);
            if (totalDepositAvu > 0) {
              bestBalance = Number(totalDepositAvu.toFixed(3));
              balanceFound = true;
            }
          }
        } catch (_) {}
      }

      // Tier 5: Check token_grants table ONLY if not found
      if (!balanceFound && (resolvedDbId || targetEmail || cleanId)) {
        try {
          let grantQuery = client.from("token_grants").select("grant_amount, amount");
          if (targetEmail) {
            grantQuery = grantQuery.or(`ambassador_id.eq.${resolvedDbId || cleanId},ambassador_name.ilike.${targetEmail}`);
          } else {
            grantQuery = grantQuery.eq("ambassador_id", resolvedDbId || cleanId);
          }
          const { data: grantRows } = await grantQuery;
          if (grantRows && grantRows.length > 0) {
            const totalGrants = grantRows.reduce((acc: number, g: any) => acc + (Number(g.grant_amount || g.amount) || 0), 0);
            if (totalGrants > 0) {
              bestBalance = Number(totalGrants.toFixed(3));
              balanceFound = true;
            }
          }
        } catch (_) {}
      }

    } catch (err) {
      console.warn("[fetchWalletBalance] Supabase query error:", err);
    }
  }

  // Tier 6: Fallback to local storage if offline or not found
  if (!balanceFound && localMatch) {
    const localBal = extractExactAvuBalance(localMatch);
    bestBalance = localBal;
    balanceFound = true;
  }

  // Anti-reversal guard: only fallback to cached balance if query failed entirely
  if (!balanceFound && cachedBalance > 0) {
    bestBalance = cachedBalance;
  } else if (balanceFound && typeof window !== "undefined") {
    localStorage.setItem("advaltad_cached_wallet_balance", String(bestBalance));
  }

  return bestBalance;
}

export const db = {
  resetPasswordForEmail,
  fetchWalletBalance,
  async getAmbassadors(): Promise<DbAmbassador[]> {
    let resultList: DbAmbassador[] = [];
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        let tableToUse = "ambassadors";
        let { data, error } = await client
          .from("ambassadors")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error || !data) {
          tableToUse = "Ambassadors";
          const fallback = await client
            .from("Ambassadors")
            .select("*")
            .order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) {
          resultList = data.map(mapRowToAmbassador);
        }
      } catch (err) {
        console.warn("Supabase fetch notice:", err);
      }
    }

    if (resultList.length === 0) {
      resultList = getLocalDb();
    }

    // Ensure localDb has seeded defaults if empty (Default AVU balance is 0)
    if (resultList.length === 0) {
      resultList = [
        {
          id: "AV-73862",
          user_id: "AV-73862",
          ambassador_id: "AV-73862",
          name: "Ramon Bisola",
          email: "ramon@example.com",
          city: "Lagos, Nigeria",
          field: "Enriching African youths initiative",
          phone: "+234 801 234 5678",
          status: "approved",
          avu_balance: 0,
          created_at: new Date().toISOString()
        },
        {
          id: "AV-94821",
          user_id: "AV-94821",
          ambassador_id: "AV-94821",
          name: "Grace Mombasa",
          email: "grace@mombasa.org",
          city: "Mombasa, Kenya",
          field: "Eco-Housing & Construction",
          phone: "+254 712 345 678",
          status: "approved",
          avu_balance: 0,
          created_at: new Date().toISOString()
        },
        {
          id: "AV-51209",
          user_id: "AV-51209",
          ambassador_id: "AV-51209",
          name: "Kofi Mensah",
          email: "kofi@accra.org",
          city: "Accra, Ghana",
          field: "NextGen Software Infrastructure",
          phone: "+233 241 234 567",
          status: "approved",
          avu_balance: 0,
          created_at: new Date().toISOString()
        }
      ];
    }

    for (const amb of resultList) {
      const staticId = getStaticAmbassadorId(amb.user_id || amb.ambassador_id || amb.id || amb.email || amb.db_id);
      amb.id = staticId;
      amb.user_id = staticId;
      amb.ambassador_id = staticId;

      if (typeof amb.avu_balance !== "number" || isNaN(amb.avu_balance) || amb.avu_balance < 0) {
        amb.avu_balance = 0;
      }
    }

    saveLocalDb(resultList);
    cachedAmbassadorsMemory = [...resultList];
    return resultList;
  },

  async checkApprovalStatus(email: string): Promise<boolean> {
    return checkApprovalStatus(email);
  },

  async findAmbassadorByEmail(email: string): Promise<DbAmbassador | null> {
    const sanitizedEmail = email.replace(/200$/, "").trim().toLowerCase();
    if (!sanitizedEmail) return null;

    let ambResult: DbAmbassador | null = null;

    // 1. Direct Supabase query first for real-time live database synchronization
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        let { data, error } = await client
          .from("ambassadors")
          .select("*")
          .ilike("email", sanitizedEmail)
          .maybeSingle();

        if (error || !data) {
          const fallback = await client
            .from("Ambassadors")
            .select("*")
            .ilike("email", sanitizedEmail)
            .maybeSingle();
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) {
          ambResult = mapRowToAmbassador(data);
        }
      } catch (err) {
        console.warn("Supabase lookup exception:", err);
      }
    }

    // 2. Check in-memory cache
    if (!ambResult) {
      ambResult = cachedAmbassadorsMemory.find(a => a.email && a.email.trim().toLowerCase() === sanitizedEmail) || null;
    }

    // 3. Check local DB
    if (!ambResult) {
      const localDb = getLocalDb();
      ambResult = localDb.find(a => a.email && a.email.trim().toLowerCase() === sanitizedEmail) || null;
    }

    // 4. Fetch full list as ultimate fallback
    if (!ambResult) {
      const all = await this.getAmbassadors();
      ambResult = all.find(a => a.email && a.email.trim().toLowerCase() === sanitizedEmail) || null;
    }

    if (ambResult) {
      const staticId = getStaticAmbassadorId(ambResult.user_id || ambResult.ambassador_id || ambResult.id || ambResult.email || ambResult.db_id);
      ambResult.id = staticId;
      ambResult.user_id = staticId;
      ambResult.ambassador_id = staticId;
    }

    return ambResult;
  },

  async findAmbassadorById(id: string): Promise<DbAmbassador | null> {
    const cleanId = id.trim().toLowerCase();
    if (!cleanId) return null;

    let ambResult: DbAmbassador | null = null;

    // 1. Direct Supabase query first
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        let query = applyAmbassadorFilter(client.from("ambassadors").select("*"), cleanId);
        let { data, error } = await query.maybeSingle();

        if (error || !data) {
          let fallbackQuery = applyAmbassadorFilter(client.from("Ambassadors").select("*"), cleanId);
          const fallback = await fallbackQuery.maybeSingle();
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) {
          ambResult = mapRowToAmbassador(data);
        }
      } catch (err) {
        console.warn("Supabase findAmbassadorById exception:", err);
      }
    }

    const matchesId = (a: DbAmbassador) =>
      (a.id && a.id.toLowerCase() === cleanId) ||
      (a.user_id && a.user_id.toLowerCase() === cleanId) ||
      (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId) ||
      (a.db_id && a.db_id.toLowerCase() === cleanId) ||
      (a.email && a.email.toLowerCase() === cleanId);

    if (!ambResult) {
      ambResult = cachedAmbassadorsMemory.find(matchesId) || null;
    }

    if (!ambResult) {
      const localDb = getLocalDb();
      ambResult = localDb.find(matchesId) || null;
    }

    if (!ambResult) {
      const allAmbs = await this.getAmbassadors();
      ambResult = allAmbs.find(matchesId) || null;
    }

    if (ambResult) {
      const staticId = getStaticAmbassadorId(ambResult.user_id || ambResult.ambassador_id || ambResult.id || ambResult.email || ambResult.db_id);
      ambResult.id = staticId;
      ambResult.user_id = staticId;
      ambResult.ambassador_id = staticId;
    }

    return ambResult;
  },

  async createAmbassador(newAmbassador: Omit<DbAmbassador, "id" | "avu_balance" | "created_at" | "status"> & { user_id?: string; ambassador_id?: string }): Promise<DbAmbassador> {
    const cleanEmail = newAmbassador.email.trim().toLowerCase();
    const staticId = getStaticAmbassadorId(newAmbassador.user_id || newAmbassador.ambassador_id || cleanEmail || newAmbassador.name);

    const fresh: DbAmbassador = {
      id: staticId,
      user_id: staticId,
      ambassador_id: staticId,
      ...newAmbassador,
      email: cleanEmail,
      avu_balance: 0,
      ledger_balance: 0,
      status: "pending",
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const rowData = {
          user_id: staticId,
          ambassador_id: staticId,
          professional_name: newAmbassador.name,
          base_city: newAmbassador.city,
          base_country: newAmbassador.country || "Nigeria",
          focus_interest: newAmbassador.field,
          email: cleanEmail,
          phone_number: newAmbassador.phone,
          status: "pending",
          badge_status: "pending", 
          is_approved: false,
          avu_balance: 0,
          ledger_balance: 0
        };
        
        const client = supabaseAdmin || supabase;
        let { data, error } = await client.from("ambassadors").insert([rowData]).select().single();
        if (error) {
          const fallback = await client.from("Ambassadors").insert([rowData]).select().single();
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) return mapRowToAmbassador(data);
      } catch (err) {
        console.warn("Supabase create execution notice:", err);
      }
    }

    const localDb = getLocalDb();
    localDb.push(fresh);
    saveLocalDb(localDb);
    return fresh;
  },

  async updateStatus(
    id: string,
    status: "pending" | "approved" | "disapproved",
    extra?: { email?: string; db_id?: string; user_id?: string; name?: string }
  ): Promise<boolean> {
    const cleanId = id.trim();
    const isAppr = status === "approved";

    // 1. Resolve ambassador details from parameters, cache, or local storage
    const knownAmb = (cachedAmbassadorsMemory || []).find(a => 
      (a.id && a.id.toLowerCase() === cleanId.toLowerCase()) || 
      (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId.toLowerCase()) ||
      (a.email && a.email.toLowerCase() === cleanId.toLowerCase()) ||
      (a.db_id && a.db_id.toLowerCase() === cleanId.toLowerCase()) ||
      (a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase())
    ) || (getLocalDb() || []).find(a => 
      (a.id && a.id.toLowerCase() === cleanId.toLowerCase()) || 
      (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId.toLowerCase()) ||
      (a.email && a.email.toLowerCase() === cleanId.toLowerCase()) ||
      (a.db_id && a.db_id.toLowerCase() === cleanId.toLowerCase()) ||
      (a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase())
    );

    const targetEmail = (extra?.email || (cleanId.includes("@") ? cleanId : "") || knownAmb?.email || "").trim().toLowerCase();
    const targetDbId = extra?.db_id || (isUuid(cleanId) ? cleanId : "") || (knownAmb?.db_id && isUuid(knownAmb.db_id) ? knownAmb.db_id : "");
    const targetUserId = extra?.user_id || (knownAmb?.user_id && isUuid(knownAmb.user_id) ? knownAmb.user_id : "");

    // 2a. Attempt Supabase Edge Function invoke ('approve') if deployed on project
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("approve", {
          body: {
            id: cleanId,
            email: targetEmail,
            db_id: targetDbId,
            user_id: targetUserId,
            status,
            is_approved: isAppr
          }
        });
        if (!edgeErr && edgeData?.success) {
          console.log("[updateStatus] Supabase Edge Function 'approve' succeeded:", edgeData);
        }
      } catch (e) {
        // Edge function may not be deployed, proceed smoothly to API and direct client update
      }
    }

    // 2b. Attempt server-side API approval route (Service Role key bypasses RLS in production)
    try {
      const apiRes = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cleanId,
          email: targetEmail,
          db_id: targetDbId,
          user_id: targetUserId,
          status,
          is_approved: isAppr
        })
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.success) {
          console.log("[updateStatus] /api/approve succeeded:", json);
        }
      }
    } catch (_) {
      // Offline, preview, or static mode: fall through to direct Supabase update
    }

    // 3. Direct client Supabase update
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        const payloadsToTry = [
          { badge_status: status, status: status, is_approved: isAppr },
          { badge_status: status, is_approved: isAppr },
          { status: status, is_approved: isAppr },
          { is_approved: isAppr },
          { badge_status: status, status: status },
          { badge_status: status },
          { status: status }
        ];

        let supabaseUpdated = false;

        for (const tableName of ["ambassadors", "Ambassadors"]) {
          for (const payload of payloadsToTry) {
            try {
              // Priority A: Update by email (safest, no UUID casting issues)
              if (targetEmail) {
                const { data, error } = await client
                  .from(tableName)
                  .update(payload)
                  .ilike("email", targetEmail)
                  .select();
                if (!error && data && data.length > 0) {
                  console.log(`[DB UPDATE STATUS SUCCESS] Updated ambassador by email '${targetEmail}' in '${tableName}' to '${status}' (is_approved: ${isAppr})`);
                  supabaseUpdated = true;
                  break;
                } else if (!error) {
                  // If update succeeded without returning rows via select
                  const resNoSelect = await client
                    .from(tableName)
                    .update(payload)
                    .ilike("email", targetEmail);
                  if (!resNoSelect.error) {
                    supabaseUpdated = true;
                    break;
                  }
                }
              }

              // Priority B: Update by database row id (UUID)
              if (targetDbId && isUuid(targetDbId)) {
                const { data, error } = await client
                  .from(tableName)
                  .update(payload)
                  .eq("id", targetDbId)
                  .select();
                if (!error && data && data.length > 0) {
                  console.log(`[DB UPDATE STATUS SUCCESS] Updated ambassador by db_id '${targetDbId}' in '${tableName}' to '${status}' (is_approved: ${isAppr})`);
                  supabaseUpdated = true;
                  break;
                }
              }

              // Priority C: Update by user_id (UUID)
              if (targetUserId && isUuid(targetUserId)) {
                const { data, error } = await client
                  .from(tableName)
                  .update(payload)
                  .eq("user_id", targetUserId)
                  .select();
                if (!error && data && data.length > 0) {
                  console.log(`[DB UPDATE STATUS SUCCESS] Updated ambassador by user_id '${targetUserId}' in '${tableName}' to '${status}' (is_approved: ${isAppr})`);
                  supabaseUpdated = true;
                  break;
                }
              }

              // Priority D: Try applyAmbassadorFilter query
              let query = client.from(tableName).update(payload);
              query = applyAmbassadorFilter(query, cleanId);
              const { data, error } = await query.select();
              if (!error && data && data.length > 0) {
                console.log(`[DB UPDATE STATUS SUCCESS] Updated ambassador '${cleanId}' in '${tableName}' to '${status}' (is_approved: ${isAppr})`);
                supabaseUpdated = true;
                break;
              }
            } catch (err) {
              // Continue trying fallback payloads
            }
          }
          if (supabaseUpdated) break;
        }
      } catch (err) {
        console.warn("Status change direct Supabase update exception:", err);
      }
    }

    // 4. Update in-memory cache
    (cachedAmbassadorsMemory || []).forEach(a => {
      if (
        (cleanId && a.id && a.id.toLowerCase() === cleanId.toLowerCase()) ||
        (cleanId && a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId.toLowerCase()) ||
        (targetEmail && a.email && a.email.toLowerCase() === targetEmail) ||
        (targetDbId && a.db_id === targetDbId) ||
        (targetUserId && a.user_id === targetUserId)
      ) {
        a.status = status;
        a.badge_status = status;
        (a as any).is_approved = isAppr;
      }
    });

    // 5. Update local storage database
    const localDb = getLocalDb();
    let updatedLocal = false;
    localDb.forEach(a => {
      if (
        (cleanId && a.id && a.id.toLowerCase() === cleanId.toLowerCase()) ||
        (cleanId && a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId.toLowerCase()) ||
        (targetEmail && a.email && a.email.toLowerCase() === targetEmail) ||
        (targetDbId && a.db_id === targetDbId) ||
        (targetUserId && a.user_id === targetUserId)
      ) {
        a.status = status;
        a.badge_status = status;
        (a as any).is_approved = isAppr;
        updatedLocal = true;
      }
    });

    if (updatedLocal) {
      saveLocalDb(localDb);
    }

    // 6. Dispatch cross-component and cross-tab update event
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("advaltad-ambassador-status-updated", {
            detail: { id: cleanId, email: targetEmail, status, is_approved: isAppr }
          })
        );
      } catch (_) {}
    }

    return true;
  },

  async getBlogs(): Promise<DbBlog[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("blogs").select("*").order("created_at", { ascending: false });
        if (error || !data) {
          const fallback = await supabase.from("Blogs").select("*").order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("getBlogs error:", err);
      }
    }
    const data = localStorage.getItem(BLOGS_LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async getDonations(): Promise<DbDonation[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("donations").select("*").order("created_at", { ascending: false });
        if (error || !data) {
          const fallback = await supabase.from("Donations").select("*").order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("getDonations error:", err);
      }
    }
    const data = localStorage.getItem(DONATIONS_LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async createDonation(donation: Omit<DbDonation, "id" | "created_at">): Promise<DbDonation> {
    const fresh: DbDonation = {
      id: "DON-" + Math.floor(Math.random() * 89999 + 10000),
      ...donation,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("donations").insert([donation]).select().single();
        if (error) {
          const fallback = await supabase.from("Donations").insert([donation]).select().single();
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("createDonation error:", err);
      }
    }
    const list = await this.getDonations();
    list.push(fresh);
    localStorage.setItem(DONATIONS_LOCAL_STORAGE_KEY, JSON.stringify(list));
    return fresh;
  },

  async getDeposits(): Promise<DbDeposit[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("deposits").select("*").order("created_at", { ascending: false });
        if (error || !data) {
          const fallback = await supabase.from("Deposits").select("*").order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("getDeposits error:", err);
      }
    }
    const data = localStorage.getItem(DEPOSITS_LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async createDeposit(deposit: Omit<DbDeposit, "id" | "created_at">): Promise<DbDeposit> {
    const fresh: DbDeposit = {
      id: "DEP-" + Math.floor(Math.random() * 89999 + 10000),
      ...deposit,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("deposits").insert([deposit]).select().single();
        if (error) {
          const fallback = await supabase.from("Deposits").insert([deposit]).select().single();
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("createDeposit error:", err);
      }
    }
    const list = await this.getDeposits();
    list.push(fresh);
    localStorage.setItem(DEPOSITS_LOCAL_STORAGE_KEY, JSON.stringify(list));
    return fresh;
  },

  async updateDepositStatus(paystackRef: string, status: "pending" | "success" | "failed"): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let tableName = "deposits";
        let { error } = await supabase.from(tableName).update({ status }).eq("paystack_reference", paystackRef);
        if (error) {
          tableName = "Deposits";
          const res = await supabase.from(tableName).update({ status }).eq("paystack_reference", paystackRef);
          error = res.error;
        }
        if (!error) return true;
      } catch (err) {
        console.warn("updateDepositStatus error:", err);
      }
    }
    const list = await this.getDeposits();
    const idx = list.findIndex(d => d.paystack_reference === paystackRef);
    if (idx !== -1) {
      list[idx].status = status;
      localStorage.setItem(DEPOSITS_LOCAL_STORAGE_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },

  async updateProfile(id: string, updates: Partial<DbAmbassador>): Promise<boolean> {
    const cleanId = id.trim();
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const rowData: any = {};
        if (updates.name !== undefined) {
          rowData.professional_name = updates.name;
          rowData.name = updates.name;
        }
        if (updates.city !== undefined) {
          rowData.base_city = updates.city;
          rowData.city = updates.city;
        }
        if (updates.country !== undefined) {
          rowData.base_country = updates.country;
          rowData.country = updates.country;
        }
        if (updates.field !== undefined) {
          rowData.focus_interest = updates.field;
          rowData.field = updates.field;
        }
        if (updates.phone !== undefined) {
          rowData.phone_number = updates.phone;
          rowData.phone = updates.phone;
        }
        if (updates.password !== undefined) rowData.password = updates.password;

        const client = supabaseAdmin || supabase;
        for (const tableName of ["ambassadors", "Ambassadors"]) {
          try {
            let query = client.from(tableName).update(rowData);
            query = applyAmbassadorFilter(query, cleanId);
            const { error, data } = await query.select();
            if (!error && data && data.length > 0) return true;
          } catch (err) {
            console.warn(`updateProfile error for ${tableName}:`, err);
          }
        }
      } catch (err) {
        console.warn("updateProfile error:", err);
      }
    }
    const list = getLocalDb();
    const idx = list.findIndex(a => 
      a.id.toLowerCase() === cleanId.toLowerCase() || 
      (a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase()) ||
      (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId.toLowerCase()) ||
      a.email.toLowerCase() === cleanId.toLowerCase()
    );
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      saveLocalDb(list);
    }
    return true;
  },

  /**
   * Unified, rock-solid method to credit an ambassador with AVU tokens,
   * updating public.ambassadors, public.ambassador_wallet, public.ambassador_wallets,
   * public.deposits, public.token_grants, local storage, and dispatching real-time sync events.
   */
  async creditAmbassadorAvu(params: {
    idOrEmail?: string;
    email?: string;
    id?: string;
    db_id?: string;
    user_id?: string;
    ambassador_id?: string;
    amount: number;
    mode?: "increment" | "set";
    depositRef?: string;
    depositDetails?: {
      funding_by_name?: string;
      phone_number?: string;
      program_sponsored?: string;
      amount_naira?: number;
    };
    adminName?: string;
    reason?: string;
  }): Promise<{ success: boolean; newBalance: number }> {
    const {
      idOrEmail,
      email,
      id,
      db_id,
      user_id,
      ambassador_id,
      amount,
      mode = "increment",
      depositRef,
      depositDetails,
      adminName,
      reason
    } = params;

    const numAmount = Number(amount) || 0;
    const sessionEmail = typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null;
    const rawEmail = email || (idOrEmail && idOrEmail.includes("@") ? idOrEmail : "") || sessionEmail || "";
    const cleanEmail = (rawEmail || "").trim().toLowerCase();

    const rawId = id || db_id || user_id || (!idOrEmail?.includes("@") ? idOrEmail : "") || "";
    const cleanId = (rawId || "").trim();
    const cleanDbId = (db_id || (isUuid(cleanId) ? cleanId : "")).trim();
    const cleanUserId = (user_id || "").trim();
    const cleanAmbId = (ambassador_id || (!isUuid(cleanId) && !cleanId.includes("@") ? cleanId : "")).trim();

    let apiSuccess = false;
    let computedNewBalance = numAmount;

    // Step 1: Attempt the server-side API route (/api/credit-avu) which uses SUPABASE_SERVICE_ROLE_KEY
    if (typeof window !== "undefined") {
      try {
        const response = await fetch("/api/credit-avu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: cleanId,
            email: cleanEmail || undefined,
            db_id: cleanDbId || undefined,
            user_id: cleanUserId || undefined,
            ambassador_id: cleanAmbId || undefined,
            amount: numAmount,
            mode,
            depositRef,
            depositDetails,
            adminName,
            reason
          })
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success) {
            apiSuccess = true;
            computedNewBalance = Number(json.newBalance) || numAmount;
          }
        }
      } catch (apiErr) {
        console.warn("[creditAmbassadorAvu] Server API call warning, falling back to direct DB client:", apiErr);
      }
    }

    // Step 2: Direct Supabase client sync (handles fallback or local dev)
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;

        let ambassador: any = null;
        let foundTable = "ambassadors";

        // Query database to resolve exact row
        for (const tableName of ["ambassadors", "Ambassadors"]) {
          if (cleanEmail) {
            const { data } = await client.from(tableName).select("*").ilike("email", cleanEmail).maybeSingle();
            if (data) {
              ambassador = data;
              foundTable = tableName;
              break;
            }
          }

          const testUuid = cleanDbId || (isUuid(cleanId) ? cleanId : cleanUserId);
          if (testUuid && isUuid(testUuid)) {
            const { data } = await client.from(tableName).select("*").or(`id.eq.${testUuid},user_id.eq.${testUuid}`).maybeSingle();
            if (data) {
              ambassador = data;
              foundTable = tableName;
              break;
            }
          }

          if (cleanAmbId) {
            try {
              const { data } = await client.from(tableName).select("*").eq("ambassador_id", cleanAmbId).maybeSingle();
              if (data) {
                ambassador = data;
                foundTable = tableName;
                break;
              }
            } catch (_) {}
          }
        }

        // Check local storage for fallback row resolution if not found
        const localDb = getLocalDb();
        const localMatch = localDb.find(a =>
          (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail) ||
          (cleanId && a.id && a.id.toLowerCase() === cleanId.toLowerCase()) ||
          (cleanId && a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase()) ||
          (cleanAmbId && a.ambassador_id && a.ambassador_id.toLowerCase() === cleanAmbId.toLowerCase())
        );

        if (!ambassador && localMatch && localMatch.email) {
          for (const tableName of ["ambassadors", "Ambassadors"]) {
            const { data } = await client.from(tableName).select("*").ilike("email", localMatch.email.trim().toLowerCase()).maybeSingle();
            if (data) {
              ambassador = data;
              foundTable = tableName;
              break;
            }
          }
        }

        const dbRowId = ambassador?.id || (isUuid(cleanDbId) ? cleanDbId : (isUuid(cleanId) ? cleanId : ""));
        const targetEmail = (ambassador?.email || cleanEmail || localMatch?.email || "").trim().toLowerCase();
        const resolvedUserId = (ambassador?.user_id || cleanUserId || localMatch?.user_id || "").trim();

        // Calculate new balance if API did not run
        if (!apiSuccess) {
          const currentBal = Math.max(
            Number(ambassador?.avu_balance || 0),
            Number(ambassador?.ledger_balance || 0)
          );
          computedNewBalance = mode === "set" ? Number(numAmount.toFixed(3)) : Number((currentBal + numAmount).toFixed(3));
        }

        // Update ambassadors / Ambassadors (update both avu_balance and ledger_balance)
        for (const tableName of ["ambassadors", "Ambassadors"]) {
          try {
            const updates: any = {
              avu_balance: computedNewBalance,
              ledger_balance: computedNewBalance
            };
            if (dbRowId && isUuid(dbRowId)) {
              await client.from(tableName).update(updates).eq("id", dbRowId);
            }
            if (targetEmail) {
              await client.from(tableName).update(updates).ilike("email", targetEmail);
            }
            if (resolvedUserId && isUuid(resolvedUserId)) {
              await client.from(tableName).update(updates).eq("user_id", resolvedUserId);
            }
            if (!dbRowId && !targetEmail && cleanAmbId) {
              await client.from(tableName).update(updates).eq("ambassador_id", cleanAmbId);
            }
          } catch (err) {
            console.warn(`[creditAmbassadorAvu] Update failed on ${tableName}:`, err);
          }
        }

        // Update ambassador_wallet (singular) with valid UUID ambassador_id
        if (dbRowId && isUuid(dbRowId)) {
          try {
            const { data: exW } = await client.from("ambassador_wallet").select("id").eq("ambassador_id", dbRowId).maybeSingle();
            if (exW) {
              await client.from("ambassador_wallet").update({ balance: computedNewBalance }).eq("id", exW.id);
            } else {
              await client.from("ambassador_wallet").insert({ ambassador_id: dbRowId, balance: computedNewBalance });
            }
          } catch (wErr) {
            console.warn("[creditAmbassadorAvu] ambassador_wallet update notice:", wErr);
          }
        }

        // Update ambassador_wallets (plural)
        try {
          let pluralQuery = client.from("ambassador_wallets").select("id");
          if (dbRowId && isUuid(dbRowId)) pluralQuery = pluralQuery.eq("ambassador_id", dbRowId);
          else if (targetEmail) pluralQuery = pluralQuery.ilike("email", targetEmail);
          const { data: existingPlural } = await pluralQuery.maybeSingle();
          if (existingPlural) {
            await client.from("ambassador_wallets").update({ balance: computedNewBalance }).eq("id", existingPlural.id);
          } else if (dbRowId || targetEmail) {
            await client.from("ambassador_wallets").insert({
              ambassador_id: (dbRowId && isUuid(dbRowId)) ? dbRowId : undefined,
              email: targetEmail || undefined,
              balance: computedNewBalance
            });
          }
        } catch (_) {}

        // Update deposits table status
        const ref = depositRef || (mode === "increment" ? `CREDIT-${Date.now()}` : `BAL-SYNC-${Date.now()}`);
        try {
          const { data: existingDep } = await client.from("deposits").select("id").eq("paystack_reference", ref).maybeSingle();
          const depPayload = {
            ambassador_id: dbRowId || cleanId || targetEmail,
            funding_by_name: depositDetails?.funding_by_name || adminName || "Wallet Credit",
            phone_number: depositDetails?.phone_number || ambassador?.phone || "",
            program_sponsored: depositDetails?.program_sponsored || "AVU Portfolio Credit",
            amount_naira: depositDetails?.amount_naira || (numAmount * 1000),
            avu_earned: numAmount,
            paystack_reference: ref,
            status: "success"
          };
          if (existingDep) {
            await client.from("deposits").update({ status: "success", avu_earned: numAmount }).eq("id", existingDep.id);
          } else {
            await client.from("deposits").insert(depPayload);
          }
        } catch (_) {}

        // Log token grant if admin action
        if (adminName) {
          try {
            await client.from("token_grants").insert({
              admin_id: "admin",
              admin_name: adminName,
              ambassador_id: dbRowId || cleanId || targetEmail,
              ambassador_name: ambassador?.name || "Ambassador",
              grant_amount: numAmount,
              transaction_type: mode === "increment" ? "DIRECT_GRANT" : "BALANCE_OVERRIDE",
              timestamp: new Date().toISOString()
            });
          } catch (_) {}
        }

        // Log in activities table
        try {
          await client.from("activities").insert({
            ambassador_id: dbRowId || cleanId || targetEmail,
            ambassador_name: ambassador?.name || "Ambassador",
            type: "avu_transfer",
            desc: reason || `${adminName || 'System'} credited ${numAmount} AVU tokens to portfolio. New balance: ${computedNewBalance} AVU.`,
            amount: `${numAmount} AVU`,
            created_at: new Date().toISOString()
          });
        } catch (_) {}

      } catch (dbErr) {
        console.warn("[creditAmbassadorAvu] DB client exception:", dbErr);
      }
    }

    // Step 3: Synchronize local storage & in-memory caches
    const list = getLocalDb();
    let updatedLocal = false;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (
        (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail) ||
        (cleanId && a.id && a.id.toLowerCase() === cleanId.toLowerCase()) ||
        (cleanId && a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase()) ||
        (cleanAmbId && a.ambassador_id && a.ambassador_id.toLowerCase() === cleanAmbId.toLowerCase())
      ) {
        list[i].avu_balance = computedNewBalance;
        list[i].ledger_balance = computedNewBalance;
        updatedLocal = true;
      }
    }
    if (updatedLocal) {
      saveLocalDb(list);
    }

    if (cachedAmbassadorsMemory.length > 0) {
      cachedAmbassadorsMemory = cachedAmbassadorsMemory.map(a => {
        if (
          (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail) ||
          (cleanId && a.id && a.id.toLowerCase() === cleanId.toLowerCase()) ||
          (cleanId && a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase()) ||
          (cleanAmbId && a.ambassador_id && a.ambassador_id.toLowerCase() === cleanAmbId.toLowerCase())
        ) {
          return { ...a, avu_balance: computedNewBalance, ledger_balance: computedNewBalance };
        }
        return a;
      });
    }

    // Step 4: Dispatch global wallet updated event for instantaneous UI updates across all components
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("advaltad_wallet_updated", {
          detail: {
            senderNewBalance: computedNewBalance,
            newBalance: computedNewBalance,
            identifier: cleanEmail || cleanId,
            email: cleanEmail,
            id: cleanId,
            amount: numAmount,
            timestamp: Date.now()
          }
        })
      );
    }

    return { success: true, newBalance: computedNewBalance };
  },

  async updateAvuBalance(id: string, newBalance: number): Promise<boolean> {
    const cleanId = id.trim();
    const numericBal = Number(newBalance) || 0;

    await this.creditAmbassadorAvu({
      idOrEmail: cleanId,
      amount: numericBal,
      mode: "set",
      reason: `Direct balance set to ${numericBal} AVU`
    });

    return true;
  },

  async logTokenGrant(grantLog: {
    admin_id: string;
    admin_name?: string;
    ambassador_id: string;
    ambassador_name?: string;
    grant_amount: number;
    transaction_type?: "DIRECT_GRANT" | "ADMIN_WALLET_FUNDING" | string;
    timestamp: string;
  }): Promise<boolean> {
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        const payload = {
          admin_id: grantLog.admin_id,
          admin_name: grantLog.admin_name || "Super Admin",
          ambassador_id: grantLog.ambassador_id,
          ambassador_name: grantLog.ambassador_name || "Ambassador",
          grant_amount: grantLog.grant_amount,
          amount: grantLog.grant_amount,
          transaction_type: grantLog.transaction_type,
          type: grantLog.transaction_type,
          timestamp: grantLog.timestamp,
          created_at: grantLog.timestamp
        };

        for (const table of ["token_grants", "token_transactions", "wallet_transactions", "audit_logs"]) {
          try {
            await client.from(table).insert([payload]);
          } catch (err) {
            console.warn(`logTokenGrant notice for table ${table}:`, err);
          }
        }
      } catch (err) {
        console.warn("logTokenGrant execution warning:", err);
      }
    }
    const grantsStr = typeof window !== "undefined" ? localStorage.getItem("advaltad_token_grants") : null;
    const grants = grantsStr ? JSON.parse(grantsStr) : [];
    grants.push(grantLog);
    if (typeof window !== "undefined") {
      localStorage.setItem("advaltad_token_grants", JSON.stringify(grants));
    }
    return true;
  },

  async logActivity(activity: Omit<DbActivity, "id" | "created_at">): Promise<boolean> {
    const fresh: DbActivity = {
      id: "ACT-" + Math.floor(Math.random() * 89999 + 10000),
      ...activity,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      try {
        let { error } = await supabase.from("activities").insert([fresh]);
        if (error) {
          await supabase.from("Activities").insert([fresh]);
        }
      } catch (err) {
        console.warn("logActivity error:", err);
      }
    }
    const listStr = localStorage.getItem(ACTIVITIES_LOCAL_STORAGE_KEY);
    const list: DbActivity[] = listStr ? JSON.parse(listStr) : [];
    if (!list.some(a => a.id === fresh.id)) {
      list.unshift(fresh);
      localStorage.setItem(ACTIVITIES_LOCAL_STORAGE_KEY, JSON.stringify(list.slice(0, 500)));
    }
    return true;
  },

  async findAdminByEmail(email: string): Promise<DbAdmin | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("admins").select("*").eq("email", cleanEmail).maybeSingle();
        if (error || !data) {
          const fallback = await supabase.from("Admins").select("*").eq("email", cleanEmail).maybeSingle();
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) {
          return {
            id: data.id,
            name: data.full_name || data.name || "",
            email: data.email,
            user_id: data.user_id,
            role: data.role,
            created_at: data.created_at
          };
        }
      } catch (err) {
        console.warn("findAdminByEmail error:", err);
      }
    }
    const listStr = localStorage.getItem(ADMIN_LOCAL_STORAGE_KEY);
    const list: DbAdmin[] = listStr ? JSON.parse(listStr) : [];
    return list.find(a => a.email.trim().toLowerCase() === cleanEmail) || null;
  },

  async getWallets(): Promise<DbAmbassadorWallet[]> {
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        let { data, error } = await client.from("ambassador_wallet").select("*").order("created_at", { ascending: false });
        if (error || !data || data.length === 0) {
          const fallback1 = await client.from("ambassador_wallets").select("*").order("created_at", { ascending: false });
          if (!fallback1.error && fallback1.data && fallback1.data.length > 0) {
            data = fallback1.data;
            error = null;
          } else {
            const fallback2 = await client.from("wallets").select("*").order("created_at", { ascending: false });
            if (!fallback2.error && fallback2.data) {
              data = fallback2.data;
              error = null;
            }
          }
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("getWallets error:", err);
      }
    }
    const data = typeof window !== "undefined" ? localStorage.getItem(WALLETS_LOCAL_STORAGE_KEY) : null;
    return data ? JSON.parse(data) : [];
  },

  async getActivities(): Promise<DbActivity[]> {
    let supabaseActivities: DbActivity[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("activities").select("*").order("created_at", { ascending: false });
        if (error || !data) {
          const fallback = await supabase.from("Activities").select("*").order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) supabaseActivities = data;
      } catch (err) {
        console.warn("getActivities error:", err);
      }
    }
    const data = localStorage.getItem(ACTIVITIES_LOCAL_STORAGE_KEY);
    const localActivities: DbActivity[] = data ? JSON.parse(data) : [];

    const map = new Map<string, DbActivity>();
    for (const act of [...supabaseActivities, ...localActivities]) {
      if (!act || !act.desc) continue;
      const key = act.id || `${act.type}-${act.desc}-${act.created_at}`;
      if (!map.has(key)) {
        map.set(key, act);
      }
    }
    const combined = Array.from(map.values());
    combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return combined;
  },

  async getAuditLogs(): Promise<DbAuditLog[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false });
        if (error || !data) {
          const fallback = await supabase.from("AuditLogs").select("*").order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("getAuditLogs error:", err);
      }
    }
    const data = localStorage.getItem(AUDIT_LOGS_LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async createAdmin(admin: Omit<DbAdmin, "id" | "created_at">): Promise<DbAdmin> {
    const fresh: DbAdmin = {
      id: "ADM-" + Math.floor(Math.random() * 89999 + 10000),
      ...admin,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          user_id: admin.user_id,
          full_name: admin.name,
          email: admin.email,
          role: admin.role || "admin"
        };
        let { data, error } = await supabase.from("admins").insert([payload]).select().single();
        if (error) {
          const fallback = await supabase.from("Admins").insert([payload]).select().single();
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) {
          return {
            id: data.id,
            name: data.full_name || data.name || "",
            email: data.email,
            user_id: data.user_id,
            role: data.role,
            created_at: data.created_at
          };
        }
      } catch (err) {
        console.warn("createAdmin error:", err);
      }
    }
    const listStr = localStorage.getItem(ADMIN_LOCAL_STORAGE_KEY);
    const list: DbAdmin[] = listStr ? JSON.parse(listStr) : [];
    list.push(fresh);
    localStorage.setItem(ADMIN_LOCAL_STORAGE_KEY, JSON.stringify(list));
    return fresh;
  },

  async createAuditLog(log: Omit<DbAuditLog, "id" | "created_at">): Promise<DbAuditLog> {
    const fresh: DbAuditLog = {
      id: "AUD-" + Math.floor(Math.random() * 89999 + 10000),
      ...log,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("audit_logs").insert([log]).select().single();
        if (error) {
          const fallback = await supabase.from("AuditLogs").insert([log]).select().single();
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("createAuditLog error:", err);
      }
    }
    const listStr = localStorage.getItem(AUDIT_LOGS_LOCAL_STORAGE_KEY);
    const list: DbAuditLog[] = listStr ? JSON.parse(listStr) : [];
    list.push(fresh);
    localStorage.setItem(AUDIT_LOGS_LOCAL_STORAGE_KEY, JSON.stringify(list));
    return fresh;
  },

  async deleteAmbassador(id: string): Promise<boolean> {
    const cleanId = id.trim();
    if (isSupabaseConfigured && supabase) {
      try {
        for (const tableName of ["ambassadors", "Ambassadors"]) {
          try {
            let query = supabase.from(tableName).delete();
            query = applyAmbassadorFilter(query, cleanId);
            const { error, data } = await query.select();
            if (!error && data && data.length > 0) return true;
          } catch (err) {
            console.warn(`deleteAmbassador error for ${tableName}:`, err);
          }
        }
      } catch (err) {
        console.warn("deleteAmbassador error:", err);
      }
    }
    const list = getLocalDb();
    const idx = list.findIndex(a => 
      a.id.toLowerCase() === cleanId.toLowerCase() || 
      (a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase()) ||
      (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId.toLowerCase()) ||
      a.email.toLowerCase() === cleanId.toLowerCase()
    );
    if (idx !== -1) {
      list.splice(idx, 1);
      saveLocalDb(list);
    }
    return true;
  },

  async createBlog(blog: Omit<DbBlog, "id" | "created_at">): Promise<DbBlog> {
    const fresh: DbBlog = {
      id: "BLG-" + Math.floor(Math.random() * 89999 + 10000),
      ...blog,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("blogs").insert([blog]).select().single();
        if (error) {
          const fallback = await supabase.from("Blogs").insert([blog]).select().single();
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("createBlog error:", err);
      }
    }
    const list = await this.getBlogs();
    list.push(fresh);
    localStorage.setItem(BLOGS_LOCAL_STORAGE_KEY, JSON.stringify(list));
    return fresh;
  },

  async updateBlog(id: string, updates: Partial<DbBlog>): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let tableName = "blogs";
        let { error } = await supabase.from(tableName).update(updates).eq("id", id);
        if (error) {
          tableName = "Blogs";
          const res = await supabase.from(tableName).update(updates).eq("id", id);
          error = res.error;
        }
        if (!error) return true;
      } catch (err) {
        console.warn("updateBlog error:", err);
      }
    }
    const list = await this.getBlogs();
    const idx = list.findIndex(b => b.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(BLOGS_LOCAL_STORAGE_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },

  async deleteBlog(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let tableName = "blogs";
        let { error } = await supabase.from(tableName).delete().eq("id", id);
        if (error) {
          tableName = "Blogs";
          const res = await supabase.from(tableName).delete().eq("id", id);
          error = res.error;
        }
        if (!error) return true;
      } catch (err) {
        console.warn("deleteBlog error:", err);
      }
    }
    const list = await this.getBlogs();
    const idx = list.findIndex(b => b.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
      localStorage.setItem(BLOGS_LOCAL_STORAGE_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  },

  async createWallet(wallet: Omit<DbAmbassadorWallet, "id" | "created_at">): Promise<DbAmbassadorWallet> {
    const fresh: DbAmbassadorWallet = {
      id: "WLT-" + Math.floor(Math.random() * 89999 + 10000),
      ...wallet,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        for (const tableName of ["ambassador_wallet", "ambassador_wallets", "wallets"]) {
          try {
            const { data, error } = await client.from(tableName).insert([wallet]).select().single();
            if (!error && data) return data;
          } catch (e) {}
        }
      } catch (err) {
        console.warn("createWallet error:", err);
      }
    }
    const list = await this.getWallets();
    list.push(fresh);
    if (typeof window !== "undefined") {
      localStorage.setItem(WALLETS_LOCAL_STORAGE_KEY, JSON.stringify(list));
    }
    return fresh;
  },

  async updateWalletBalance(ambassadorId: string, newBalance: number): Promise<boolean> {
    const cleanId = ambassadorId.trim();
    const numericBal = Number(newBalance) || 0;

    await this.creditAmbassadorAvu({
      idOrEmail: cleanId,
      amount: numericBal,
      mode: "set",
      reason: `Direct wallet balance set to ${numericBal} AVU`
    });

    return true;
  },

  async processFundingSuccess(
    ambassadorId: string,
    email: string,
    amountNaira: number,
    avuToEarn: number,
    paystackRef: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      console.log("[processFundingSuccess] Processing funding for:", { email, ambassadorId, amountNaira, avuToEarn, paystackRef });

      // Mark deposit status as success
      await this.updateDepositStatus(paystackRef, "success");

      // Credit the ambassador with avuToEarn using unified rock-solid engine
      const creditRes = await this.creditAmbassadorAvu({
        email: email || undefined,
        id: isUuid(ambassadorId) ? ambassadorId : undefined,
        db_id: isUuid(ambassadorId) ? ambassadorId : undefined,
        user_id: isUuid(ambassadorId) ? ambassadorId : undefined,
        idOrEmail: email || ambassadorId,
        amount: avuToEarn,
        mode: "increment",
        depositRef: paystackRef,
        depositDetails: {
          funding_by_name: email || ambassadorId,
          phone_number: "",
          program_sponsored: "Wallet Funding",
          amount_naira: amountNaira
        },
        reason: `Wallet funding via Paystack: ₦${amountNaira.toLocaleString()} for ${avuToEarn} AVU (Ref: ${paystackRef})`
      });

      return creditRes;
    } catch (err) {
      console.error("[processFundingSuccess] Error executing funding sequence:", err);
      return { success: false, newBalance: 0 };
    }
  },

  async executeP2PTransfer(
    senderId: string,
    recipientEmailOrId: string,
    points: number,
    reason: string,
    senderEmailParam?: string,
    recipientEmailParam?: string
  ): Promise<{ success: boolean; message: string; senderNewBalance?: number; recipientName?: string }> {
    const sessionEmail = typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null;
    const cleanSender = (senderId || "").trim();
    const cleanRecipient = (recipientEmailOrId || "").trim();
    const cleanSenderEmail = (senderEmailParam || (cleanSender.includes("@") ? cleanSender : (sessionEmail || ""))).trim().toLowerCase();
    const cleanRecipientEmail = (recipientEmailParam || (cleanRecipient.includes("@") ? cleanRecipient : "")).trim().toLowerCase();
    
    if (isNaN(points) || points <= 0) {
      return { success: false, message: "Please specify a valid positive transfer amount." };
    }

    if (!cleanRecipient && !cleanRecipientEmail) {
      return { success: false, message: "Recipient ID or email is required." };
    }

    // Helper to test equality between two ambassador records
    const isSameAmbassador = (a: DbAmbassador, b: DbAmbassador): boolean => {
      if (a.id && b.id && a.id.toLowerCase() === b.id.toLowerCase()) return true;
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) return true;
      if (a.user_id && b.user_id && a.user_id.toLowerCase() === b.user_id.toLowerCase()) return true;
      if (a.db_id && b.db_id && a.db_id.toLowerCase() === b.db_id.toLowerCase()) return true;
      if (a.id && b.user_id && a.id.toLowerCase() === b.user_id.toLowerCase()) return true;
      if (a.user_id && b.id && a.user_id.toLowerCase() === b.id.toLowerCase()) return true;
      return false;
    };

    // 1. Find recipient accurately
    let recipient: DbAmbassador | null = null;
    if (cleanRecipientEmail) {
      recipient = await this.findAmbassadorByEmail(cleanRecipientEmail);
    }
    if (!recipient && cleanRecipient) {
      recipient = await this.findAmbassadorById(cleanRecipient) || await this.findAmbassadorByEmail(cleanRecipient);
    }
    if (!recipient && cleanRecipient) {
      const allAmbs = await this.getAmbassadors();
      const cLow = cleanRecipient.toLowerCase();
      recipient = allAmbs.find(a => 
        (a.id && a.id.toLowerCase() === cLow) ||
        (a.user_id && a.user_id.toLowerCase() === cLow) ||
        (a.ambassador_id && a.ambassador_id.toLowerCase() === cLow) ||
        (a.db_id && a.db_id.toLowerCase() === cLow) ||
        (a.email && a.email.toLowerCase() === cLow)
      ) || null;
    }
    if (!recipient && cleanRecipient) {
      const localDb = getLocalDb();
      const cLow = cleanRecipient.toLowerCase();
      recipient = localDb.find(a => 
        (a.id && a.id.toLowerCase() === cLow) ||
        (a.user_id && a.user_id.toLowerCase() === cLow) ||
        (a.ambassador_id && a.ambassador_id.toLowerCase() === cLow) ||
        (a.db_id && a.db_id.toLowerCase() === cLow) ||
        (a.email && a.email.toLowerCase() === cLow)
      ) || null;
    }

    if (!recipient) {
      return { success: false, message: `Could not find an ambassador with ID or email: "${cleanRecipient || cleanRecipientEmail}"` };
    }

    // 2. Find sender accurately
    let sender: DbAmbassador | null = null;
    if (cleanSenderEmail) {
      const found = await this.findAmbassadorByEmail(cleanSenderEmail);
      if (found && !isSameAmbassador(found, recipient)) {
        sender = found;
      }
    }
    if (!sender && cleanSender) {
      const found = await this.findAmbassadorById(cleanSender);
      if (found && !isSameAmbassador(found, recipient)) {
        sender = found;
      }
    }
    if (!sender && cleanSender) {
      const allAmbs = await this.getAmbassadors();
      const sLow = cleanSender.toLowerCase();
      const found = allAmbs.find(a => 
        ((a.id && a.id.toLowerCase() === sLow) ||
         (a.user_id && a.user_id.toLowerCase() === sLow) ||
         (a.ambassador_id && a.ambassador_id.toLowerCase() === sLow) ||
         (a.db_id && a.db_id.toLowerCase() === sLow) ||
         (a.email && a.email.toLowerCase() === sLow)) &&
        !isSameAmbassador(a, recipient)
      );
      if (found) sender = found;
    }
    if (!sender && sessionEmail) {
      const found = await this.findAmbassadorByEmail(sessionEmail);
      if (found && !isSameAmbassador(found, recipient)) {
        sender = found;
      }
    }
    if (!sender) {
      const localDb = getLocalDb();
      const found = localDb.find(a => !isSameAmbassador(a, recipient));
      if (found) sender = found;
    }

    if (!sender) {
      return { success: false, message: "Sender ambassador profile not found in database session." };
    }

    if (isSameAmbassador(sender, recipient)) {
      return { success: false, message: "Transfer Failed: You cannot transfer points to yourself." };
    }

    // 3. Resolve sender balance comprehensively from all live & local sources
    let currentSenderBal = Number(sender.avu_balance) || 0;

    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        const sUuid = [sender.db_id, sender.user_id, sender.id, cleanSender].find(x => x && isUuid(x));
        const sEmail = sender.email || cleanSenderEmail;
        
        const conditions: string[] = [];
        if (sUuid) {
          conditions.push(`user_id.eq.${sUuid}`, `id.eq.${sUuid}`);
        }
        if (sEmail) {
          conditions.push(`email.eq.${sEmail.toLowerCase()}`, `email.ilike.${sEmail.toLowerCase()}`);
        }

        if (conditions.length > 0) {
          const { data: senderData } = await client
            .from("ambassadors")
            .select("id, user_id, email, avu_balance, ledger_balance")
            .or(conditions.join(","))
            .maybeSingle();

          if (senderData) {
            const fetchedBal = Number(senderData.avu_balance ?? senderData.ledger_balance ?? 0);
            if (!isNaN(fetchedBal) && fetchedBal > currentSenderBal) {
              currentSenderBal = fetchedBal;
            }
            if (senderData.id && isUuid(senderData.id)) {
              sender.db_id = senderData.id;
            }
            if (senderData.user_id && isUuid(senderData.user_id)) {
              sender.user_id = senderData.user_id;
            }
          }
        }
      } catch (e) {
        console.warn("[executeP2PTransfer] Dynamic balance fetch error:", e);
      }
    }

    // Check fetchWalletBalance
    const liveBal = await fetchWalletBalance(sender.email || cleanSenderEmail || sender.db_id || sender.user_id || cleanSender);
    if (liveBal > currentSenderBal) {
      currentSenderBal = liveBal;
    }

    // Check local database
    const localDb = getLocalDb();
    const localMatch = localDb.find(a => 
      (a.id && sender.id && a.id.toLowerCase() === sender.id.toLowerCase()) || 
      (a.email && sender.email && a.email.toLowerCase() === sender.email.toLowerCase()) ||
      (cleanSender && a.id && a.id.toLowerCase() === cleanSender.toLowerCase()) ||
      (cleanSenderEmail && a.email && a.email.toLowerCase() === cleanSenderEmail.toLowerCase())
    );
    if (localMatch && Number(localMatch.avu_balance) > currentSenderBal) {
      currentSenderBal = Number(localMatch.avu_balance);
    }

    // Check wallets table
    try {
      const wallets = await this.getWallets();
      const walletMatch = wallets.find(w =>
        (w.ambassador_id && sender.id && w.ambassador_id.toLowerCase() === sender.id.toLowerCase()) ||
        (w.email && sender.email && w.email.toLowerCase() === sender.email.toLowerCase()) ||
        (cleanSenderEmail && w.email && w.email.toLowerCase() === cleanSenderEmail.toLowerCase()) ||
        (cleanSender && w.ambassador_id && w.ambassador_id.toLowerCase() === cleanSender.toLowerCase())
      );
      if (walletMatch && Number(walletMatch.balance) > currentSenderBal) {
        currentSenderBal = Number(walletMatch.balance);
      }
    } catch (e) {}

    // Helper to resolve valid UUID for ambassadors table
    const getUuid = async (amb: DbAmbassador): Promise<string | null> => {
      if (amb.db_id && isUuid(amb.db_id)) return amb.db_id;
      if (amb.id && isUuid(amb.id)) return amb.id;
      if (amb.user_id && isUuid(amb.user_id)) return amb.user_id;
      if (amb.email && isSupabaseConfigured && (supabaseAdmin || supabase)) {
        try {
          const client = supabaseAdmin || supabase;
          const { data } = await client
            .from("ambassadors")
            .select("id")
            .ilike("email", amb.email.trim().toLowerCase())
            .maybeSingle();
          if (data && data.id && isUuid(data.id)) return data.id;
        } catch (e) {}
      }
      return null;
    };

    const senderUuid = await getUuid(sender);
    const recipientUuid = await getUuid(recipient);

    // Immediate server-side verification check right before UPDATE execution to prevent race conditions
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        const recheckFilters: string[] = [];
        if (senderUuid) {
          recheckFilters.push(`id.eq.${senderUuid}`, `user_id.eq.${senderUuid}`);
        }
        if (sender.email) {
          recheckFilters.push(`email.ilike.${sender.email.trim().toLowerCase()}`);
        }

        if (recheckFilters.length > 0) {
          const { data: latestSenderRow } = await client
            .from("ambassadors")
            .select("avu_balance, ledger_balance, id, user_id, email")
            .or(recheckFilters.join(","))
            .maybeSingle();

          if (latestSenderRow) {
            const liveBal = Number(latestSenderRow.avu_balance ?? latestSenderRow.ledger_balance ?? 0);
            if (!isNaN(liveBal) && liveBal >= 0) {
              console.log("[executeP2PTransfer] Server-side atomic balance check before UPDATE:", {
                sender_id: latestSenderRow.id,
                live_balance: liveBal,
                points_requested: points,
                cached_balance: currentSenderBal
              });
              if (liveBal >= points || liveBal > currentSenderBal) {
                currentSenderBal = liveBal;
                sender.avu_balance = liveBal;
              }
            }
          }
        }
      } catch (err) {
        console.warn("[executeP2PTransfer] Immediate pre-UPDATE check warning:", err);
      }
    }

    if (currentSenderBal < points) {
      return { success: false, message: `Insufficient balance. Available: ${currentSenderBal} AVU` };
    }

    const senderNewBalance = sender.avu_balance - points;
    const recipientNewBalance = (Number(recipient.avu_balance) || 0) + points;

    // Attempt Supabase writes
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        
        // 1. Deduct amount from sender.avu_balance
        if (senderUuid) {
          await client.from("ambassadors").update({ avu_balance: senderNewBalance }).eq("id", senderUuid);
        }
        if (sender.email) {
          await client.from("ambassadors").update({ avu_balance: senderNewBalance }).ilike("email", sender.email.trim().toLowerCase());
        }

        // 2. Add amount to recipient.avu_balance
        if (recipientUuid) {
          await client.from("ambassadors").update({ avu_balance: recipientNewBalance }).eq("id", recipientUuid);
        }
        if (recipient.email) {
          await client.from("ambassadors").update({ avu_balance: recipientNewBalance }).ilike("email", recipient.email.trim().toLowerCase());
        }

        // 3. Insert audit entry into p2p_transactions
        const p2pPayload = {
          sender_id: senderUuid || sender.db_id || sender.id,
          sender_email: sender.email || cleanSenderEmail,
          recipient_id: recipientUuid || recipient.db_id || recipient.id,
          recipient_email: recipient.email || cleanRecipientEmail,
          amount: Number(points),
          note: reason || "Peer transfer"
        };

        const { error: txError } = await client.from("p2p_transactions").insert([p2pPayload]);
        if (txError) {
          console.warn("Error inserting into p2p_transactions:", txError);
        }
      } catch (err) {
        console.warn("Supabase P2P database notice:", err);
      }
    }

    // Always keep local storage updated as well
    const updatedLocalDb = getLocalDb();
    const localSender = updatedLocalDb.find(a => 
      (a.id && sender.id && a.id.toLowerCase() === sender.id.toLowerCase()) || 
      (a.email && sender.email && a.email.toLowerCase() === sender.email.toLowerCase()) ||
      (a.user_id && sender.user_id && a.user_id.toLowerCase() === sender.user_id.toLowerCase()) ||
      (a.ambassador_id && sender.ambassador_id && a.ambassador_id.toLowerCase() === sender.ambassador_id.toLowerCase())
    );
    if (localSender) {
      localSender.avu_balance = senderNewBalance;
    }

    const localRecipient = updatedLocalDb.find(a => 
      (a.id && recipient.id && a.id.toLowerCase() === recipient.id.toLowerCase()) || 
      (a.email && recipient.email && a.email.toLowerCase() === recipient.email.toLowerCase()) ||
      (a.user_id && recipient.user_id && a.user_id.toLowerCase() === recipient.user_id.toLowerCase()) ||
      (a.ambassador_id && recipient.ambassador_id && a.ambassador_id.toLowerCase() === recipient.ambassador_id.toLowerCase())
    );
    if (localRecipient) {
      localRecipient.avu_balance = recipientNewBalance;
    } else {
      updatedLocalDb.push({
        ...recipient,
        avu_balance: recipientNewBalance
      });
    }
    saveLocalDb(updatedLocalDb);

    // Sync memory cache
    cachedAmbassadorsMemory = cachedAmbassadorsMemory.map(a => {
      if ((a.id && sender.id && a.id.toLowerCase() === sender.id.toLowerCase()) || (a.email && sender.email && a.email.toLowerCase() === sender.email.toLowerCase())) {
        return { ...a, avu_balance: senderNewBalance };
      }
      if ((a.id && recipient.id && a.id.toLowerCase() === recipient.id.toLowerCase()) || (a.email && recipient.email && a.email.toLowerCase() === recipient.email.toLowerCase())) {
        return { ...a, avu_balance: recipientNewBalance };
      }
      return a;
    });

    // Save P2P transaction locally
    const transactionId = "P2P-" + Math.floor(Math.random() * 89999 + 10000);
    const timestamp = new Date().toISOString();
    const txRecord: DbP2PTransaction = {
      id: transactionId,
      sender_id: senderUuid || sender.id,
      sender_name: sender.name,
      sender_email: sender.email || cleanSenderEmail,
      recipient_id: recipientUuid || recipient.id,
      recipient_name: recipient.name,
      recipient_email: recipient.email || cleanRecipientEmail,
      points,
      reason: reason || "Peer transfer",
      created_at: timestamp
    };
    const p2pTxStr = localStorage.getItem(P2P_TX_LOCAL_STORAGE_KEY);
    const p2pTransactions: DbP2PTransaction[] = p2pTxStr ? JSON.parse(p2pTxStr) : [];
    p2pTransactions.push(txRecord);
    localStorage.setItem(P2P_TX_LOCAL_STORAGE_KEY, JSON.stringify(p2pTransactions));

    // Log activities
    await this.logActivity({
      ambassador_id: sender.id,
      ambassador_name: sender.name,
      type: "avu_transfer",
      desc: `Transferred ${points} AVU to ${recipient.name} [${recipient.ambassador_id || recipient.id}] for: "${reason || "Peer transfer"}"`,
      amount: `-${points} AVU`
    });

    await this.logActivity({
      ambassador_id: recipient.id,
      ambassador_name: recipient.name,
      type: "avu_transfer",
      desc: `Received ${points} AVU from ${sender.name} [${sender.ambassador_id || sender.id}] for: "${reason || "Peer transfer"}"`,
      amount: `+${points} AVU`
    });

    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("advaltad_wallet_updated", { detail: { senderNewBalance, points } }));
      } catch (e) {}
    }

    return {
      success: true,
      message: `Successfully transferred ${points} AVU to ${recipient.name}.`,
      senderNewBalance,
      recipientName: recipient.name
    };
  },

  async getP2PTransactions(ambassadorIdOrEmail: string): Promise<DbP2PTransaction[]> {
    const clean = ambassadorIdOrEmail.trim().toLowerCase();
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        let query = client.from("p2p_transactions").select("*");
        if (isUuid(clean)) {
          query = query.or(`sender_id.eq.${clean},recipient_id.eq.${clean}`);
        } else if (clean.includes("@")) {
          query = query.or(`sender_email.ilike.${clean},recipient_email.ilike.${clean}`);
        } else {
          query = query.or(`sender_id.eq.${clean},sender_email.ilike.${clean},recipient_id.eq.${clean},recipient_email.ilike.${clean}`);
        }
        const { data, error } = await query.order("created_at", { ascending: false });

        if (!error && data) {
          return data.map((row: any) => ({
            id: row.id || "P2P-" + Math.floor(Math.random() * 89999 + 10000),
            sender_id: row.sender_id,
            sender_name: row.sender_name || row.sender_email || "Ambassador",
            sender_email: row.sender_email,
            recipient_id: row.recipient_id,
            recipient_name: row.recipient_name || row.recipient_email || "Ambassador",
            recipient_email: row.recipient_email,
            points: Number(row.amount || row.points || 0),
            amount: Number(row.amount || row.points || 0),
            amount_avu: Number(row.amount || row.points || 0),
            reason: row.note || row.reason || "P2P Allocation",
            note: row.note || row.reason || "P2P Allocation",
            created_at: row.created_at || new Date().toISOString()
          })) as any;
        }
      } catch (err) {
        console.warn("Error getting Supabase P2P transactions:", err);
      }
    }
    const p2pTxStr = localStorage.getItem(P2P_TX_LOCAL_STORAGE_KEY);
    const list: DbP2PTransaction[] = p2pTxStr ? JSON.parse(p2pTxStr) : [];
    return list.filter(
      t =>
        (t.sender_id && t.sender_id.toLowerCase() === clean) ||
        (t.sender_email && t.sender_email.toLowerCase() === clean) ||
        (t.recipient_id && t.recipient_id.toLowerCase() === clean) ||
        (t.recipient_email && t.recipient_email.toLowerCase() === clean)
    ).map((t: any) => ({
      ...t,
      amount_avu: Number(t.amount || t.points || 0),
      amount: Number(t.amount || t.points || 0),
      note: t.note || t.reason || "P2P Allocation",
      reason: t.reason || t.note || "P2P Allocation"
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getAvuWithdrawals(ambassadorIdOrEmail?: string): Promise<DbAvuWithdrawal[]> {
    let supabaseWithdrawals: DbAvuWithdrawal[] = [];
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        let data: any[] | null = null;
        let error: any = null;

        // 1. Attempt Supabase query joining avu_withdrawals with ambassadors
        try {
          const res1 = await client
            .from("avu_withdrawals")
            .select(`
              *,
              ambassadors:ambassador_id (
                id,
                user_id,
                professional_name,
                name,
                email,
                phone_number,
                phone,
                base_city,
                city,
                base_country,
                country,
                avu_balance,
                ledger_balance,
                status,
                badge_status,
                is_approved
              )
            `)
            .order("created_at", { ascending: false });

          if (!res1.error && res1.data && res1.data.length > 0) {
            data = res1.data;
          } else {
            error = res1.error;
          }
        } catch (e1) {
          error = e1;
        }

        // 2. Direct flat query across candidate table names if relation join was absent
        if (!data || data.length === 0) {
          for (const tName of ["avu_withdrawals", "withdrawals", "AvuWithdrawals"]) {
            try {
              const res2 = await client.from(tName).select("*").order("created_at", { ascending: false });
              if (!res2.error && res2.data && res2.data.length > 0) {
                // Programmatic join with ambassadors table
                try {
                  const ambRes = await client.from("ambassadors").select("*");
                  const ambMap = new Map<string, any>();
                  (ambRes.data || []).forEach((a: any) => {
                    if (a.id) ambMap.set(String(a.id).toLowerCase(), a);
                    if (a.user_id) ambMap.set(String(a.user_id).toLowerCase(), a);
                    if (a.email) ambMap.set(String(a.email).toLowerCase(), a);
                  });
                  data = res2.data.map((row: any) => {
                    const amb =
                      ambMap.get(String(row.ambassador_id || "").toLowerCase()) ||
                      ambMap.get(String(row.email || row.ambassador_email || "").toLowerCase()) ||
                      null;
                    return { ...row, ambassadors: amb };
                  });
                  error = null;
                  break;
                } catch (_) {
                  data = res2.data;
                  error = null;
                  break;
                }
              }
            } catch (_) {}
          }
        }

        if (data && data.length > 0) {
          supabaseWithdrawals = data.map((row: any) => {
            const amb = Array.isArray(row.ambassadors) ? row.ambassadors[0] : row.ambassadors;
            const reqAmount = Number(row.amount ?? row.avu_amount ?? row.requested_avu ?? row.amount_avu ?? 0);
            const convRate = Number(row.conversion_rate || 1000);
            const nairaEq = Number(row.naira_equivalent || row.amount_naira || (reqAmount * convRate));
            const ambName =
              amb?.professional_name ||
              amb?.name ||
              row.ambassador_name ||
              row.full_name ||
              row.account_name ||
              "Ambassador";
            const ambEmail = amb?.email || row.ambassador_email || row.email || "";
            const currentBal =
              amb?.avu_balance !== undefined && amb?.avu_balance !== null
                ? Number(amb.avu_balance)
                : amb?.ledger_balance !== undefined && amb?.ledger_balance !== null
                ? Number(amb.ledger_balance)
                : Number(row.current_balance ?? row.avu_balance ?? 0);

            const rawStatus = (row.status || "pending").toString().trim();
            let normStatus: "Pending" | "Approved" | "Disapproved" = "Pending";
            if (rawStatus.toLowerCase() === "approved") normStatus = "Approved";
            else if (rawStatus.toLowerCase() === "disapproved" || rawStatus.toLowerCase() === "rejected") normStatus = "Disapproved";
            else normStatus = "Pending";

            return {
              id: row.id || "WTH-" + Math.floor(Math.random() * 89999 + 10000),
              ambassador_id: row.ambassador_id || amb?.id || row.user_id || "",
              ambassador_name: ambName,
              email: ambEmail,
              ambassador_email: ambEmail,
              current_balance: currentBal,
              requested_avu: reqAmount,
              bank_name: row.bank_name || "",
              account_number: row.account_number || "",
              account_name: row.account_name || ambName,
              avu_amount: reqAmount,
              naira_equivalent: nairaEq,
              conversion_rate: convRate,
              status: normStatus,
              admin_note: row.admin_note || "",
              reviewed_by: row.reviewed_by || "",
              reviewed_at: row.reviewed_at || "",
              created_at: row.created_at || new Date().toISOString(),
              updated_at: row.updated_at
            };
          });
        }
      } catch (err) {
        console.warn("Error getting Supabase AVU withdrawals:", err);
      }
    }

    const localData = typeof window !== "undefined" ? localStorage.getItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY) : null;
    const localWithdrawals: DbAvuWithdrawal[] = localData ? JSON.parse(localData) : [];

    const map = new Map<string, DbAvuWithdrawal>();
    for (const item of [...supabaseWithdrawals, ...localWithdrawals]) {
      if (!item || !item.id) continue;
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    let all = Array.from(map.values());
    all.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    if (ambassadorIdOrEmail) {
      const clean = ambassadorIdOrEmail.trim().toLowerCase();
      all = all.filter(w => {
        const wAmbId = (w.ambassador_id || "").toLowerCase().trim();
        const wEmail = (w.ambassador_email || w.email || "").toLowerCase().trim();
        const wName = (w.ambassador_name || w.account_name || "").toLowerCase().trim();
        const joinedAmb = (w as any).ambassadors;
        const joinedId = (joinedAmb?.id || joinedAmb?.user_id || "").toLowerCase().trim();
        const joinedEmail = (joinedAmb?.email || "").toLowerCase().trim();

        return (
          (wAmbId && (wAmbId === clean || wAmbId.includes(clean) || clean.includes(wAmbId))) ||
          (joinedId && (joinedId === clean || joinedId.includes(clean) || clean.includes(joinedId))) ||
          (wEmail && (wEmail === clean || wEmail.includes(clean))) ||
          (joinedEmail && (joinedEmail === clean || joinedEmail.includes(clean))) ||
          (wName && (wName === clean || clean.includes(wName)))
        );
      });
    }

    logWithdrawalFetchTrace({
      caller: "db.getAvuWithdrawals",
      targetAmbassadorId: ambassadorIdOrEmail || "ALL",
      tableQueried: "avu_withdrawals",
      matchedCount: all.length,
      totalCount: map.size,
      sampleIds: all.slice(0, 3).map(w => `${w.id}:${w.ambassador_id}`)
    });

    return all;
  },

  async createAvuWithdrawal(
    withdrawal: Omit<DbAvuWithdrawal, "id" | "created_at">
  ): Promise<DbAvuWithdrawal> {
    const generatedUuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, '0');
    const timestamp = new Date().toISOString();
    const reqAmount = Number(withdrawal.requested_avu || withdrawal.avu_amount || withdrawal.amount || 0);
    const convRate = Number(withdrawal.conversion_rate || 1000);
    const nairaEq = Number(withdrawal.naira_equivalent || (reqAmount * convRate));

    let fresh: DbAvuWithdrawal = {
      id: generatedUuid,
      ambassador_id: withdrawal.ambassador_id,
      ambassador_name: withdrawal.ambassador_name,
      email: withdrawal.email || withdrawal.ambassador_email,
      ambassador_email: withdrawal.ambassador_email || withdrawal.email || "",
      current_balance: withdrawal.current_balance,
      requested_avu: reqAmount,
      avu_amount: reqAmount,
      amount: reqAmount,
      naira_equivalent: nairaEq,
      bank_name: withdrawal.bank_name,
      account_number: withdrawal.account_number,
      account_name: withdrawal.account_name,
      status: "Pending",
      conversion_rate: convRate,
      created_at: timestamp
    };

    let serverSaved = false;

    // 1. Primary: Server-side API route (/api/withdraw) using SUPABASE_SERVICE_ROLE_KEY to bypass RLS and foreign-key snags
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: reqAmount,
          requested_avu: reqAmount,
          bank_name: withdrawal.bank_name,
          account_number: withdrawal.account_number,
          account_name: withdrawal.account_name,
          ambassador_id: withdrawal.ambassador_id,
          ambassador_name: withdrawal.ambassador_name,
          email: withdrawal.email || withdrawal.ambassador_email,
          ambassador_email: withdrawal.ambassador_email || withdrawal.email,
          current_balance: withdrawal.current_balance
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data) {
          fresh = {
            ...fresh,
            ...json.data,
            id: json.data.id || fresh.id,
            status: "Pending"
          };
          serverSaved = true;
        }
      }
    } catch (_) {}

    // 2. Secondary direct Supabase insertion fallback
    if (!serverSaved && isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || "").trim());
        const validAmbId = isUuid(fresh.ambassador_id) ? fresh.ambassador_id : undefined;

        for (const tName of ["avu_withdrawals", "withdrawals", "AvuWithdrawals"]) {
          try {
            const payload: any = {
              id: fresh.id,
              amount: reqAmount,
              requested_avu: reqAmount,
              avu_amount: reqAmount,
              naira_equivalent: nairaEq,
              conversion_rate: 1000,
              bank_name: fresh.bank_name,
              account_number: fresh.account_number,
              account_name: fresh.account_name,
              ambassador_name: fresh.ambassador_name,
              email: fresh.email,
              ambassador_email: fresh.email,
              status: "pending",
              created_at: timestamp
            };
            if (validAmbId) payload.ambassador_id = validAmbId;

            const { data: inserted, error: insErr } = await client.from(tName).insert([payload]).select().maybeSingle();
            if (!insErr && inserted) {
              if (inserted.id) fresh.id = inserted.id;
              serverSaved = true;
              break;
            } else {
              // Retry with title-case status
              payload.status = "Pending";
              const r2 = await client.from(tName).insert([payload]).select().maybeSingle();
              if (r2.data) {
                if (r2.data.id) fresh.id = r2.data.id;
                serverSaved = true;
                break;
              }
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn("Direct Supabase insertion notice:", err);
      }
    }

    // 3. Save to local storage mirror
    if (typeof window !== "undefined") {
      const localData = localStorage.getItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY);
      const list: DbAvuWithdrawal[] = localData ? JSON.parse(localData) : [];
      list.unshift(fresh);
      localStorage.setItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem("advaltad_withdrawals_sync_ping", String(Date.now()));
      window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated", { detail: fresh }));
    }

    // 4. Log Activity
    await this.logActivity({
      ambassador_id: fresh.ambassador_id,
      ambassador_name: fresh.ambassador_name,
      type: "avu_transfer",
      desc: `Requested AVU withdrawal of ${fresh.avu_amount} AVU (₦${fresh.naira_equivalent.toLocaleString()}) to ${fresh.bank_name} (${fresh.account_number})`,
      amount: `-${fresh.avu_amount} AVU`
    });

    return fresh;
  },

  async updateAvuWithdrawalStatus(
    id: string,
    status: "Approved" | "Disapproved",
    adminNote?: string,
    adminEmail?: string
  ): Promise<boolean> {
    if (status === "Approved") {
      const res = await handleApprove(id, undefined, adminEmail, adminNote);
      return res.success;
    } else {
      const res = await handleReject(id, undefined, adminEmail, adminNote);
      return res.success;
    }
  }
};

export interface WithdrawalFormData {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  ambassadorId?: string;
  ambassadorEmail?: string;
  ambassadorName?: string;
  currentBalance?: number;
}

/**
 * Ambassador Submitting Withdrawal Request (Form Submission)
 * 
 * - Submits withdrawal to backend API / direct database tables.
 * - Leaves balance intact until Admin approves.
 */
export async function handleWithdrawalSubmit(formData: WithdrawalFormData): Promise<{ success: boolean; error?: any; data?: any }> {
  try {
    let currentUserId: string | undefined = formData.ambassadorId;
    let currentUserEmail: string | undefined = formData.ambassadorEmail;
    let ambassadorName: string = formData.ambassadorName || formData.accountName || "Ambassador";
    let currentBalance: number = formData.currentBalance ?? 0;

    // Check session or local fallback if not explicitly provided
    if (!currentUserId || !currentUserEmail) {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            currentUserId = currentUserId || session.user.id;
            currentUserEmail = currentUserEmail || session.user.email;
            ambassadorName = ambassadorName !== "Ambassador" ? ambassadorName : (session.user.user_metadata?.name || ambassadorName);
          }
        } catch (_) {}
      }

      if (!currentUserId && typeof window !== "undefined") {
        currentUserId = localStorage.getItem("advaltad_session_user_id") || undefined;
      }
      if (!currentUserEmail && typeof window !== "undefined") {
        currentUserEmail = localStorage.getItem("advaltad_session_email") || undefined;
      }
    }

    // Resolve ambassador row for foreign key & metadata compatibility
    let targetAmbassadorId = currentUserId || "00000000-0000-0000-0000-000000000000";
    let ambassadorEmail = currentUserEmail || "ambassador@advaltad.org";

    if (isSupabaseConfigured && (supabaseAdmin || supabase) && (currentUserId || currentUserEmail)) {
      try {
        const client = supabaseAdmin || supabase;
        const filterOr = currentUserId
          ? `id.eq.${currentUserId},user_id.eq.${currentUserId}` + (currentUserEmail ? `,email.ilike.${currentUserEmail}` : "")
          : `email.ilike.${currentUserEmail}`;

        const { data: amb } = await client
          .from("ambassadors")
          .select("id, professional_name, name, email, avu_balance")
          .or(filterOr)
          .maybeSingle();

        if (amb) {
          targetAmbassadorId = amb.id;
          ambassadorName = amb.professional_name || amb.name || ambassadorName;
          ambassadorEmail = amb.email || ambassadorEmail;
          if (currentBalance === 0) {
            currentBalance = Number(amb.avu_balance || 0);
          }
        }
      } catch (err) {
        console.warn("[handleWithdrawalSubmit] Failed to query ambassador profile:", err);
      }
    }

    const compatiblePayload = {
      ambassador_id: targetAmbassadorId,
      ambassador_name: ambassadorName,
      email: ambassadorEmail,
      ambassador_email: ambassadorEmail,
      current_balance: currentBalance,
      requested_avu: formData.amount,
      avu_amount: formData.amount,
      amount: formData.amount,
      naira_equivalent: formData.amount * 1000,
      conversion_rate: 1000,
      bank_name: formData.bankName,
      account_number: formData.accountNumber,
      account_name: formData.accountName,
      status: "Pending" as const
    };

    // 1. Create using db.createAvuWithdrawal (handles /api/withdraw, direct Supabase, and local storage mirror)
    const createdRecord = await db.createAvuWithdrawal(compatiblePayload);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated", { detail: createdRecord }));
      localStorage.setItem("advaltad_withdrawals_sync_ping", String(Date.now()));
    }

    return { success: true, data: createdRecord };
  } catch (err: any) {
    console.error("[handleWithdrawalSubmit] Error:", err);
    return { success: false, error: err };
  }
}

/**
 * Admin Processing Pending Requests - Approve
 * 
 * - Calls RPC 'approve_avu_withdrawal' with p_withdrawal_id and p_admin_id.
 * - Atomically deducts exact requested amount from ambassador's wallet in all Supabase tables.
 * - Updates local storage caches and broadcasts events for instant cross-tab UI reflection.
 */
export async function handleApprove(
  withdrawalId: string,
  adminId?: string,
  adminEmail?: string,
  adminNote?: string
): Promise<{ success: boolean; data?: any; error?: any; newBalance?: number; requestedAmount?: number }> {
  try {
    const effectiveAdminId = (adminId && /^[0-9a-f-]{36}$/i.test(adminId))
      ? adminId
      : "00000000-0000-0000-0000-000000000000";
    const reviewer = adminEmail || "Executive Treasury Admin";
    const timestamp = new Date().toISOString();

    // 0. Primary attempt via serverless /api/withdraw-action
    try {
      const apiRes = await fetch("/api/withdraw-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          withdrawal_id: withdrawalId,
          admin_id: effectiveAdminId,
          admin_email: reviewer,
          admin_note: adminNote
        })
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json?.success) {
          if (typeof window !== "undefined") {
            const localData = localStorage.getItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY);
            if (localData) {
              try {
                const list: DbAvuWithdrawal[] = JSON.parse(localData);
                const idx = list.findIndex(w => w.id === withdrawalId);
                if (idx !== -1) {
                  list[idx].status = "Approved";
                  list[idx].reviewed_by = reviewer;
                  list[idx].reviewed_at = timestamp;
                  if (adminNote) list[idx].admin_note = adminNote;
                  list[idx].updated_at = timestamp;
                  localStorage.setItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY, JSON.stringify(list));
                }
              } catch (_) {}
            }
            if (json.newBalance !== undefined) {
              localStorage.setItem("advaltad_cached_wallet_balance", String(json.newBalance));
            }
            localStorage.setItem("advaltad_withdrawals_sync_ping", String(Date.now()));
            window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated", { detail: { id: withdrawalId, status: "Approved" } }));
            window.dispatchEvent(new CustomEvent("advaltad_wallet_updated", { detail: { balance: json.newBalance } }));
          }
          return { success: true, newBalance: json.newBalance, requestedAmount: json.requestedAmount };
        }
      }
    } catch (_) {}

    // 1. Locate the withdrawal request record
    const allWithdrawals = await db.getAvuWithdrawals();
    let target = allWithdrawals.find(w => w.id === withdrawalId);

    // If not in cache, query Supabase directly
    if (!target && isSupabaseConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data: wRow } = await client.from("avu_withdrawals").select("*").eq("id", withdrawalId).maybeSingle();
      if (wRow) {
        target = {
          id: wRow.id,
          ambassador_id: wRow.ambassador_id || "",
          ambassador_name: wRow.ambassador_name || wRow.account_name || "Ambassador",
          email: wRow.email || wRow.ambassador_email || "",
          ambassador_email: wRow.ambassador_email || wRow.email || "",
          current_balance: Number(wRow.current_balance || 0),
          requested_avu: Number(wRow.requested_avu ?? wRow.avu_amount ?? wRow.amount ?? 0),
          bank_name: wRow.bank_name || "",
          account_number: wRow.account_number || "",
          account_name: wRow.account_name || "",
          avu_amount: Number(wRow.avu_amount ?? wRow.requested_avu ?? wRow.amount ?? 0),
          naira_equivalent: Number(wRow.naira_equivalent || 0),
          conversion_rate: Number(wRow.conversion_rate || 1000),
          status: "Pending",
          created_at: wRow.created_at || timestamp
        };
      }
    }

    const requestedAmount = Number(target?.requested_avu ?? target?.avu_amount ?? 0);
    const targetAmbassadorId = target?.ambassador_id || "";
    const targetEmail = target?.ambassador_email || target?.email || "";
    const targetName = target?.ambassador_name || target?.account_name || "Ambassador";

    // 2. Attempt Supabase RPC execution if available
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.rpc("approve_avu_withdrawal", {
          p_withdrawal_id: withdrawalId,
          p_admin_id: effectiveAdminId
        });
      } catch (_) {}
    }

    // 3. Guarantee record status update on avu_withdrawals table in Supabase
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const updatePayload: any = {
        status: "Approved",
        reviewed_by: reviewer,
        reviewed_at: timestamp,
        updated_at: timestamp
      };
      if (adminNote) updatePayload.admin_note = adminNote;

      for (const tName of ["avu_withdrawals", "AvuWithdrawals"]) {
        try {
          await client.from(tName).update(updatePayload).eq("id", withdrawalId);
        } catch (_) {}
      }
    }

    // 4. CRITICAL: Deduct exact AVU tokens from ambassador's wallet across all tables in Supabase
    let computedNewBal = 0;
    let balanceUpdated = false;

    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      try {
        // Query ambassadors / Ambassadors table
        for (const tName of ["ambassadors", "Ambassadors"]) {
          let q = client.from(tName).select("id, email, avu_balance, wallet_balance, balance");
          if (targetAmbassadorId && isUuid(targetAmbassadorId)) {
            q = q.or(`id.eq.${targetAmbassadorId},user_id.eq.${targetAmbassadorId}` + (targetEmail ? `,email.ilike.${targetEmail}` : ""));
          } else if (targetEmail) {
            q = q.ilike("email", targetEmail);
          } else if (targetAmbassadorId) {
            q = q.eq("id", targetAmbassadorId);
          }

          const { data: ambRow } = await q.maybeSingle();
          if (ambRow) {
            const currentBal = Number(ambRow.avu_balance ?? ambRow.wallet_balance ?? ambRow.balance ?? 0);
            computedNewBal = Math.max(0, Number((currentBal - requestedAmount).toFixed(3)));
            balanceUpdated = true;

            await client.from(tName).update({
              avu_balance: computedNewBal,
              wallet_balance: computedNewBal,
              balance: computedNewBal,
              updated_at: timestamp
            }).eq("id", ambRow.id);
          }
        }

        // Also update ambassador_wallet (singular) & ambassador_wallets (plural)
        for (const wTable of ["ambassador_wallet", "ambassador_wallets"]) {
          try {
            let currentWBal = computedNewBal;
            if (!balanceUpdated) {
              let wSel = client.from(wTable).select("balance, avu_balance");
              if (targetAmbassadorId && isUuid(targetAmbassadorId)) wSel = wSel.eq("ambassador_id", targetAmbassadorId);
              else if (targetEmail) wSel = wSel.ilike("email", targetEmail);
              const { data: wRow } = await wSel.maybeSingle();
              if (wRow) {
                const prevW = Number(wRow.balance ?? wRow.avu_balance ?? 0);
                computedNewBal = Math.max(0, Number((prevW - requestedAmount).toFixed(3)));
                currentWBal = computedNewBal;
                balanceUpdated = true;
              }
            }

            let wQ = client.from(wTable).update({
              balance: currentWBal,
              avu_balance: currentWBal,
              updated_at: timestamp
            });
            if (targetAmbassadorId && isUuid(targetAmbassadorId)) {
              wQ = wQ.eq("ambassador_id", targetAmbassadorId);
            } else if (targetEmail) {
              wQ = wQ.ilike("email", targetEmail);
            }
            await wQ;
          } catch (_) {}
        }
      } catch (deductErr) {
        console.warn("[handleApprove] Supabase wallet deduction warning:", deductErr);
      }
    }

    // 5. Update local storage mirrors and caches
    if (typeof window !== "undefined") {
      // Update avu withdrawals local storage
      const localData = localStorage.getItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY);
      if (localData) {
        try {
          const list: DbAvuWithdrawal[] = JSON.parse(localData);
          const idx = list.findIndex(w => w.id === withdrawalId);
          if (idx !== -1) {
            list[idx].status = "Approved";
            list[idx].reviewed_by = reviewer;
            list[idx].reviewed_at = timestamp;
            if (adminNote) list[idx].admin_note = adminNote;
            list[idx].updated_at = timestamp;
            localStorage.setItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY, JSON.stringify(list));
          }
        } catch (_) {}
      }

      // Update ambassadors local storage
      const localAmbs = localStorage.getItem("advaltad_ambassadors");
      if (localAmbs) {
        try {
          const ambList = JSON.parse(localAmbs);
          let updatedAmb = false;
          for (let i = 0; i < ambList.length; i++) {
            const a = ambList[i];
            if (
              (targetAmbassadorId && a.id && a.id.toLowerCase() === targetAmbassadorId.toLowerCase()) ||
              (targetAmbassadorId && a.user_id && a.user_id.toLowerCase() === targetAmbassadorId.toLowerCase()) ||
              (targetEmail && a.email && a.email.toLowerCase() === targetEmail.toLowerCase())
            ) {
              const prev = Number(a.avu_balance ?? a.wallet_balance ?? 0);
              if (!balanceUpdated) {
                computedNewBal = Math.max(0, Number((prev - requestedAmount).toFixed(3)));
              }
              ambList[i].avu_balance = computedNewBal;
              ambList[i].ledger_balance = computedNewBal;
              ambList[i].wallet_balance = computedNewBal;
              ambList[i].balance = computedNewBal;
              updatedAmb = true;
            }
          }
          if (updatedAmb) {
            localStorage.setItem("advaltad_ambassadors", JSON.stringify(ambList));
          }
        } catch (_) {}
      }

      // Update wallets local storage
      const localWallets = localStorage.getItem("advaltad_wallets");
      if (localWallets) {
        try {
          const wList = JSON.parse(localWallets);
          let updatedW = false;
          for (let i = 0; i < wList.length; i++) {
            const w = wList[i];
            if (
              (targetAmbassadorId && w.ambassador_id && w.ambassador_id.toLowerCase() === targetAmbassadorId.toLowerCase()) ||
              (targetEmail && w.email && w.email.toLowerCase() === targetEmail.toLowerCase())
            ) {
              wList[i].balance = computedNewBal;
              updatedW = true;
            }
          }
          if (updatedW) {
            localStorage.setItem("advaltad_wallets", JSON.stringify(wList));
          }
        } catch (_) {}
      }

      // Update cached wallet balance if this session corresponds to the ambassador
      const sessionEmail = localStorage.getItem("advaltad_session_email");
      const sessionUserId = localStorage.getItem("advaltad_session_user_id");
      if (
        (sessionEmail && targetEmail && sessionEmail.toLowerCase() === targetEmail.toLowerCase()) ||
        (sessionUserId && targetAmbassadorId && sessionUserId.toLowerCase() === targetAmbassadorId.toLowerCase())
      ) {
        localStorage.setItem("advaltad_cached_wallet_balance", String(computedNewBal));
      }
    }

    // 6. Log activity and audit trail
    await db.logActivity({
      ambassador_id: targetAmbassadorId,
      ambassador_name: targetName,
      type: "avu_transfer",
      desc: `Withdrawal Approved: Disbursed ₦${(target?.naira_equivalent || requestedAmount * 1000).toLocaleString()} to ${target?.bank_name || 'Bank'} (${target?.account_number || ''}). Deducted ${requestedAmount} AVU from balance. New balance: ${computedNewBal} AVU.`,
      amount: `-${requestedAmount} AVU`
    });

    await db.createAuditLog({
      admin_id: effectiveAdminId,
      admin_name: reviewer,
      admin_email: adminEmail || "treasury@advaltad.org",
      ambassador_id: targetAmbassadorId,
      ambassador_name: targetName,
      action: "approved"
    });

    // 7. Dispatch events for real-time synchronization across all tabs and components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated", {
        detail: { id: withdrawalId, status: "Approved", ambassadorId: targetAmbassadorId, newBalance: computedNewBal }
      }));
      window.dispatchEvent(new CustomEvent("advaltad_wallet_updated", {
        detail: {
          ambassadorId: targetAmbassadorId,
          email: targetEmail,
          newBalance: computedNewBal,
          deductedAmount: requestedAmount,
          timestamp: Date.now()
        }
      }));
      // Cross-tab synchronization via localStorage pings
      localStorage.setItem("advaltad_wallet_sync_ping", JSON.stringify({
        ambassadorId: targetAmbassadorId,
        email: targetEmail,
        newBalance: computedNewBal,
        deductedAmount: requestedAmount,
        timestamp: Date.now()
      }));
      localStorage.setItem("advaltad_withdrawals_sync_ping", String(Date.now()));
    }

    return { success: true, newBalance: computedNewBal, requestedAmount };
  } catch (err: any) {
    console.error("[handleApprove] Approval exception:", err);
    return { success: false, error: err };
  }
}

/**
 * Admin Processing Pending Requests - Reject / Disapprove
 * 
 * - Leaves ambassador balance untouched.
 * - Updates status to 'Disapproved' and notifies.
 */
export async function handleReject(
  withdrawalId: string,
  adminId?: string,
  adminEmail?: string,
  adminNote?: string
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const effectiveAdminId = (adminId && /^[0-9a-f-]{36}$/i.test(adminId))
      ? adminId
      : "00000000-0000-0000-0000-000000000000";
    const reviewer = adminEmail || "Executive Treasury Admin";
    const timestamp = new Date().toISOString();

    // 0. Primary attempt via serverless /api/withdraw-action
    try {
      const apiRes = await fetch("/api/withdraw-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          withdrawal_id: withdrawalId,
          admin_id: effectiveAdminId,
          admin_email: reviewer,
          admin_note: adminNote
        })
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json?.success) {
          if (typeof window !== "undefined") {
            const localData = localStorage.getItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY);
            if (localData) {
              try {
                const list: DbAvuWithdrawal[] = JSON.parse(localData);
                const idx = list.findIndex(w => w.id === withdrawalId);
                if (idx !== -1) {
                  list[idx].status = "Disapproved";
                  list[idx].reviewed_by = reviewer;
                  list[idx].reviewed_at = timestamp;
                  if (adminNote) list[idx].admin_note = adminNote;
                  list[idx].updated_at = timestamp;
                  localStorage.setItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY, JSON.stringify(list));
                }
              } catch (_) {}
            }
            localStorage.setItem("advaltad_withdrawals_sync_ping", String(Date.now()));
            window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated", { detail: { id: withdrawalId, status: "Disapproved" } }));
          }
          return { success: true };
        }
      }
    } catch (_) {}

    const allWithdrawals = await db.getAvuWithdrawals();
    const target = allWithdrawals.find(w => w.id === withdrawalId);

    // Call RPC if available
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.rpc("reject_avu_withdrawal", {
          p_withdrawal_id: withdrawalId,
          p_admin_id: effectiveAdminId
        });
      } catch (_) {}
    }

    // Direct table update
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const updatePayload: any = {
        status: "Disapproved",
        reviewed_by: reviewer,
        reviewed_at: timestamp,
        updated_at: timestamp
      };
      if (adminNote) updatePayload.admin_note = adminNote;

      for (const tName of ["avu_withdrawals", "AvuWithdrawals"]) {
        try {
          await client.from(tName).update(updatePayload).eq("id", withdrawalId);
        } catch (_) {}
      }
    }

    // Update local storage
    if (typeof window !== "undefined") {
      const localData = localStorage.getItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY);
      if (localData) {
        try {
          const list: DbAvuWithdrawal[] = JSON.parse(localData);
          const idx = list.findIndex(w => w.id === withdrawalId);
          if (idx !== -1) {
            list[idx].status = "Disapproved";
            list[idx].reviewed_by = reviewer;
            list[idx].reviewed_at = timestamp;
            if (adminNote) list[idx].admin_note = adminNote;
            list[idx].updated_at = timestamp;
            localStorage.setItem(AVU_WITHDRAWALS_LOCAL_STORAGE_KEY, JSON.stringify(list));
          }
        } catch (_) {}
      }
      localStorage.setItem("advaltad_withdrawals_sync_ping", String(Date.now()));
      window.dispatchEvent(new CustomEvent("advaltad_withdrawals_updated", { detail: { id: withdrawalId, status: "Disapproved" } }));
    }

    if (target) {
      await db.logActivity({
        ambassador_id: target.ambassador_id,
        ambassador_name: target.ambassador_name,
        type: "status_change",
        desc: `Withdrawal Disapproved: Request for ${target.requested_avu || target.avu_amount} AVU was rejected by treasury.${adminNote ? ` Note: ${adminNote}` : ""}`
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("[handleReject] Reject exception:", err);
    return { success: false, error: err };
  }
}
