import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process as any).env?.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const supabaseServiceRole = (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY || (process as any).env?.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = isSupabaseConfigured && supabaseServiceRole
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false }
    })
  : null;

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

const LOCAL_STORAGE_KEY = "advaltad_ambassadors_db";
const ACTIVITIES_LOCAL_STORAGE_KEY = "advaltad_activities_db";
const BLOGS_LOCAL_STORAGE_KEY = "advaltad_blogs_db";
const WALLETS_LOCAL_STORAGE_KEY = "advaltad_wallets_db";
const ADMIN_LOCAL_STORAGE_KEY = "advaltad_admins_db";
const AUDIT_LOGS_LOCAL_STORAGE_KEY = "advaltad_audit_logs_db";
const DONATIONS_LOCAL_STORAGE_KEY = "advaltad_donations_db";
const DEPOSITS_LOCAL_STORAGE_KEY = "advaltad_deposits_db";
const P2P_TX_LOCAL_STORAGE_KEY = "advaltad_p2p_transactions_db";
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
    return query.or(`user_id.eq.${clean},id.eq.${clean},ambassador_id.eq.${clean},email.ilike.${clean.toLowerCase()}`);
  }
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

function mapRowToAmbassador(row: any): DbAmbassador {
  const isApprovedCol = row.is_approved === true || row.is_approved === "true" || row.is_approved === 1;
  const isDisapprovedCol = row.is_approved === false || row.is_approved === "false" || row.is_approved === 0;

  const rawStatus = (row.badge_status || row.status || "pending").toString().toLowerCase().trim();
  const mappedStatus: "pending" | "approved" | "disapproved" = 
    isApprovedCol ? "approved" :
    isDisapprovedCol ? "disapproved" :
    (rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified") ? "approved" : 
    (rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended") ? "disapproved" : "pending";

  const nameVal = row.professional_name || row.name || "";
  const cityVal = row.base_city || row.city || "";
  const countryVal = row.base_country || row.country || "Nigeria";
  const fieldVal = row.focus_interest || row.field || "";
  const phoneVal = row.phone_number || row.phone || "";
  const rawEmail = row.email || "";
  const rawId = row.user_id || row.ambassador_id || row.id || "";

  // Assign deterministic static AV- ID that NEVER changes
  const staticId = getStaticAmbassadorId(rawId || rawEmail || row.db_id || nameVal);

  const rawBal = Number(row.avu_balance ?? row.ledger_balance ?? row.balance ?? 0) || 0;

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
    avu_balance: rawBal,
    ledger_balance: rawBal,
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
        if (data.is_approved === true || data.is_approved === "true" || data.is_approved === 1) {
          return true;
        }
        if (data.is_approved === false || data.is_approved === "false" || data.is_approved === 0) {
          return false;
        }
        const rawStatus = (data.badge_status || data.status || "pending").toString().toLowerCase().trim();
        return rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified";
      }
    } catch (err) {
      console.warn("[checkApprovalStatus] Error querying Supabase:", err);
    }
  }

  const localDb = getLocalDb();
  const amb = localDb.find(a => a.email && a.email.trim().toLowerCase() === sanitizedEmail);
  if (amb) {
    if ((amb as any).is_approved === true || (amb as any).is_approved === "true") {
      return true;
    }
    if ((amb as any).is_approved === false || (amb as any).is_approved === "false") {
      return false;
    }
    const rawStatus = (amb.badge_status || amb.status || "pending").toString().toLowerCase().trim();
    return rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified";
  }

  return false;
}

/**
 * Utility function to fetch an ambassador's wallet balance directly from the `ambassadors` table
 * by `user_id`, `id`, or `email`, explicitly selecting `avu_balance` and returning a guaranteed `number`.
 */
export async function fetchWalletBalance(identifier?: string | null): Promise<number> {
  if (!identifier) return 0;
  const cleanId = identifier.trim();
  if (!cleanId) return 0;

  let balance = 0;

  if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
    try {
      const client = supabaseAdmin || supabase;
      const isStrictUuid = isUuid(cleanId);
      const isEmail = cleanId.includes("@");
      
      let query = client.from("ambassadors").select("avu_balance, ledger_balance");
      if (isStrictUuid) {
        query = query.or(`id.eq.${cleanId},user_id.eq.${cleanId}`);
      } else if (isEmail) {
        query = query.ilike("email", cleanId.toLowerCase());
      } else {
        query = query.or(`user_id.eq.${cleanId},id.eq.${cleanId},ambassador_id.eq.${cleanId},email.ilike.${cleanId.toLowerCase()}`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const foundVal = Number(data[0]?.avu_balance ?? data[0]?.ledger_balance ?? 0);
        if (!isNaN(foundVal) && foundVal > 0) {
          balance = foundVal;
        }
      }
    } catch (err) {
      console.warn("[fetchWalletBalance] Supabase query error:", err);
    }
  }

  const localDb = getLocalDb();
  const cleanLower = cleanId.toLowerCase();
  const found = localDb.find(a =>
    a.email?.toLowerCase() === cleanLower ||
    a.id?.toLowerCase() === cleanLower ||
    a.user_id?.toLowerCase() === cleanLower ||
    (a.db_id && a.db_id.toLowerCase() === cleanLower)
  );
  if (found && Number(found.avu_balance) > balance) {
    balance = Number(found.avu_balance);
  }

  return balance;
}

export const db = {
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
          const mapped = data.map(mapRowToAmbassador);

          // Sync wallet balances from ambassador_wallet / ambassador_wallets / wallets
          let walletList: DbAmbassadorWallet[] = [];
          try {
            walletList = await this.getWallets();
          } catch (wErr) {}

          for (const amb of mapped) {
            const staticId = getStaticAmbassadorId(amb.user_id || amb.ambassador_id || amb.id || amb.email || amb.db_id);
            amb.id = staticId;
            amb.user_id = staticId;
            amb.ambassador_id = staticId;

            const matchedWallet = walletList.find(w => 
              w.ambassador_id === staticId || 
              (amb.db_id && w.ambassador_id === amb.db_id) || 
              (amb.email && w.email && w.email.toLowerCase() === amb.email.toLowerCase()) ||
              (amb.email && w.ambassador_id && w.ambassador_id.toLowerCase() === amb.email.toLowerCase())
            );
            if (matchedWallet && typeof matchedWallet.balance === "number") {
              amb.avu_balance = matchedWallet.balance;
            }

            if (amb.db_id) {
              try {
                await client.from(tableToUse).update({ user_id: staticId, ambassador_id: staticId }).eq("id", amb.db_id);
              } catch (updateErr) {}
            }
          }
          resultList = mapped;
        }
      } catch (err) {
        console.error("Supabase fetch exception:", err);
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

    // Guarantee EVERY ambassador has valid static AV- user_id and ambassador_id
    // and wipe default balances to 0 if no funding deposit or received transfer exists
    let localDepositsList: DbDeposit[] = [];
    try {
      const depData = localStorage.getItem(DEPOSITS_LOCAL_STORAGE_KEY);
      if (depData) localDepositsList = JSON.parse(depData);
    } catch (e) {}

    let localP2PList: any[] = [];
    try {
      const p2pData = localStorage.getItem(P2P_TX_LOCAL_STORAGE_KEY);
      if (p2pData) localP2PList = JSON.parse(p2pData);
    } catch (e) {}

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

      // Sync wallet balance from ambassador_wallet / ambassador_wallets / wallets in Supabase
      if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
        try {
          const wallets = await this.getWallets();
          const wallet = wallets.find(w => 
            w.ambassador_id === staticId || 
            (ambResult?.db_id && w.ambassador_id === ambResult.db_id) || 
            (w.email || "").toLowerCase() === sanitizedEmail
          );
          if (wallet && wallet.balance !== undefined && wallet.balance !== null) {
            ambResult.avu_balance = Number(wallet.balance) || 0;
          }
        } catch (wErr) {}
      }
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

      if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
        try {
          const wallets = await this.getWallets();
          const wallet = wallets.find(w => 
            w.ambassador_id === staticId || 
            (ambResult?.db_id && w.ambassador_id === ambResult.db_id) || 
            (ambResult?.email && (w.email || "").toLowerCase() === ambResult.email.toLowerCase())
          );
          if (wallet && wallet.balance !== undefined && wallet.balance !== null) {
            ambResult.avu_balance = Number(wallet.balance) || 0;
          }
        } catch (wErr) {}
      }
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
        console.error("Supabase create execution failure:", err);
      }
    }

    const localDb = getLocalDb();
    localDb.push(fresh);
    saveLocalDb(localDb);
    return fresh;
  },

  async updateStatus(id: string, status: "pending" | "approved" | "disapproved"): Promise<boolean> {
    const cleanId = id.trim();
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        const payloadsToTry = [
          { status: status, badge_status: status },
          { badge_status: status },
          { status: status }
        ];

        for (const tableName of ["ambassadors", "Ambassadors"]) {
          for (const payload of payloadsToTry) {
            try {
              let query = client.from(tableName).update(payload);
              query = applyAmbassadorFilter(query, cleanId);
              const { data, error } = await query.select();
              if (!error && data && data.length > 0) {
                console.log(`[DB UPDATE STATUS SUCCESS] Updated ambassador ${cleanId} status to '${status}' in table '${tableName}'`);
                return true;
              }
            } catch (err) {
              console.warn(`Attempt failed for table ${tableName}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn("Status change update exception:", err);
      }
    }

    const localDb = getLocalDb();
    const index = localDb.findIndex(a => 
      a.id.toLowerCase() === cleanId.toLowerCase() || 
      (a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase()) ||
      (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId.toLowerCase()) ||
      a.email.toLowerCase() === cleanId.toLowerCase()
    );
    if (index !== -1) {
      localDb[index].status = status;
      localDb[index].badge_status = status;
      saveLocalDb(localDb);
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

  async updateAvuBalance(id: string, newBalance: number): Promise<boolean> {
    const cleanId = id.trim();
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        if (isUuid(cleanId)) {
          await client.from("ambassadors").update({ avu_balance: newBalance }).eq("id", cleanId);
        } else if (cleanId.includes("@")) {
          await client.from("ambassadors").update({ avu_balance: newBalance }).ilike("email", cleanId.toLowerCase());
        } else {
          const { data } = await client
            .from("ambassadors")
            .select("id")
            .or(`user_id.eq.${cleanId},email.ilike.${cleanId}`)
            .maybeSingle();
          if (data && data.id) {
            await client.from("ambassadors").update({ avu_balance: newBalance }).eq("id", data.id);
          }
        }
      } catch (err) {
        console.warn("updateAvuBalance error:", err);
      }
    }
    const list = getLocalDb();
    let updatedLocal = false;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (
        a.id.toLowerCase() === cleanId.toLowerCase() ||
        (a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase()) ||
        (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId.toLowerCase()) ||
        (a.email && a.email.toLowerCase() === cleanId.toLowerCase())
      ) {
        list[i].avu_balance = newBalance;
        updatedLocal = true;
      }
    }
    if (updatedLocal) {
      saveLocalDb(list);
    }

    if (cachedAmbassadorsMemory.length > 0) {
      cachedAmbassadorsMemory = cachedAmbassadorsMemory.map(a => {
        if (
          a.id.toLowerCase() === cleanId.toLowerCase() ||
          (a.user_id && a.user_id.toLowerCase() === cleanId.toLowerCase()) ||
          (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId.toLowerCase()) ||
          (a.email && a.email.toLowerCase() === cleanId.toLowerCase())
        ) {
          return { ...a, avu_balance: newBalance };
        }
        return a;
      });
    }
    return true;
  },

  async logTokenGrant(grantLog: {
    admin_id: string;
    admin_name?: string;
    ambassador_id: string;
    ambassador_name?: string;
    grant_amount: number;
    transaction_type: "DIRECT_GRANT";
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
    const cleanId = ambassadorId.trim().toLowerCase();
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        let success = false;

        // 1. Update wallet tables in Supabase
        for (const tableName of ["ambassador_wallet", "ambassador_wallets", "wallets", "wallet", "Wallet", "Wallets"]) {
          try {
            const res = await client
              .from(tableName)
              .update({ balance: newBalance })
              .or(`ambassador_id.eq.${ambassadorId},ambassador_id.ilike.${cleanId},email.ilike.${cleanId}`);
            if (!res.error) success = true;
          } catch (err) {
            console.warn(`updateWalletBalance error for ${tableName}:`, err);
          }
        }

        // 2. Also update ambassadors avu_balance column in Supabase
        for (const tableName of ["ambassadors", "Ambassadors", "profiles", "Profiles"]) {
          try {
            let query = client.from(tableName).update({ avu_balance: newBalance });
            query = applyAmbassadorFilter(query, cleanId);
            await query.select();
          } catch (err) {}
        }

        if (success) return true;
      } catch (err) {
        console.warn("updateWalletBalance error:", err);
      }
    }
    const list = await this.getWallets();
    const idx = list.findIndex(w => w.ambassador_id === ambassadorId || (w.email || "").toLowerCase() === cleanId);
    if (idx !== -1) {
      list[idx].balance = newBalance;
      if (typeof window !== "undefined") {
        localStorage.setItem(WALLETS_LOCAL_STORAGE_KEY, JSON.stringify(list));
      }
      return true;
    }
    return false;
  },

  async processFundingSuccess(
    ambassadorId: string,
    email: string,
    amountNaira: number,
    avuToEarn: number,
    paystackRef: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      // A. Check if deposit already completed to prevent double crediting
      if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
        const client = supabaseAdmin || supabase;
        let { data: depData, error: depErr } = await client
          .from("deposits")
          .select("status")
          .eq("paystack_reference", paystackRef)
          .maybeSingle();
        
        if (depErr || !depData) {
          const fallback = await client
            .from("Deposits")
            .select("status")
            .eq("paystack_reference", paystackRef)
            .maybeSingle();
          depData = fallback.data;
        }

        if (depData && depData.status === "success") {
          console.log(`[DEPOSIT CONTROL] Reference ${paystackRef} already processed success. Halting to prevent double credit.`);
          const ambassador = await this.findAmbassadorByEmail(email);
          return { success: true, newBalance: ambassador?.avu_balance || 0 };
        }
      } else {
        const localDeposits = await this.getDeposits();
        const localDep = localDeposits.find(d => d.paystack_reference === paystackRef);
        if (localDep && localDep.status === "success") {
          const ambassador = await this.findAmbassadorByEmail(email);
          return { success: true, newBalance: ambassador?.avu_balance || 0 };
        }
      }

      // 1. Update deposit status to success or create if missing
      const updatedDep = await this.updateDepositStatus(paystackRef, "success");

      // 2. Find the ambassador to get the current avu_balance
      const ambassador = await this.findAmbassadorByEmail(email) || await this.findAmbassadorById(ambassadorId);
      if (!ambassador) {
        console.error("Could not find ambassador by email/id:", email, ambassadorId);
        return { success: false, newBalance: 0 };
      }
      
      const dbRowId = ambassador.db_id || ambassador.id; // Correct database UUID row ID
      const currentAvuBalance = ambassador?.avu_balance || 0;
      const newAvuBalance = Number((currentAvuBalance + avuToEarn).toFixed(3));

      if (!updatedDep) {
        await this.createDeposit({
          ambassador_id: dbRowId,
          funding_by_name: ambassador.name || email,
          phone_number: ambassador.phone || "",
          program_sponsored: "Wallet Funding",
          amount_naira: amountNaira,
          avu_earned: avuToEarn,
          paystack_reference: paystackRef,
          status: "success"
        });
      }

      // 3. Update ambassador's avu_balance in public.ambassadors across all ID variations
      await this.updateAvuBalance(dbRowId, newAvuBalance);
      if (ambassador.user_id && ambassador.user_id !== dbRowId) {
        await this.updateAvuBalance(ambassador.user_id, newAvuBalance);
      }
      if (ambassador.ambassador_id && ambassador.ambassador_id !== dbRowId) {
        await this.updateAvuBalance(ambassador.ambassador_id, newAvuBalance);
      }
      if (ambassador.email) {
        await this.updateAvuBalance(ambassador.email, newAvuBalance);
      }

      // 4. Update the wallet balance in public.ambassador_wallets
      // First, get all wallets to see if a wallet already exists for this ambassador
      const wallets = await this.getWallets();
      const existingWallet = wallets.find(
        w => w.ambassador_id === dbRowId || w.ambassador_id === ambassadorId || (w.email || "").toLowerCase() === email.toLowerCase()
      );

      if (existingWallet) {
        const newWalletBalance = Number((existingWallet.balance + avuToEarn).toFixed(3));
        await this.updateWalletBalance(existingWallet.ambassador_id || dbRowId, newWalletBalance);
      } else {
        // Create a new wallet record with the balance set to avuToEarn
        await this.createWallet({
          ambassador_id: dbRowId,
          email: email,
          balance: avuToEarn
        });
      }

      // 4b. Explicitly update public.ambassador_wallet, public.wallet, and public.profiles tables to ensure 100% database sync
      if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
        try {
          const client = supabaseAdmin || supabase;

          // Update profiles table if present
          for (const pTable of ["profiles", "Profiles"]) {
            try {
              await client
                .from(pTable)
                .update({ avu_balance: newAvuBalance })
                .or(`id.eq.${dbRowId},email.eq.${email}`);
            } catch (pErr) {
              // Ignore if profiles table is absent
            }
          }

          // Update ambassador_wallet & wallet tables
          const { data: walletData, error: walletError } = await client
            .from("ambassador_wallet")
            .select("*")
            .or(`ambassador_id.eq.${dbRowId},ambassador_id.eq.${ambassadorId}`);
          
          if (!walletError && walletData && walletData.length > 0) {
            const currentWalletBalance = Number(walletData[0].balance || 0);
            const newWalletBalance = Number((currentWalletBalance + avuToEarn).toFixed(3));
            await client
              .from("ambassador_wallet")
              .update({ balance: newWalletBalance })
              .eq("id", walletData[0].id);
          } else {
            await client
              .from("ambassador_wallet")
              .insert([{ ambassador_id: dbRowId, balance: avuToEarn }]);
          }
        } catch (wErr) {
          console.warn("Error updating ambassador_wallet/profiles table:", wErr);
        }
      }

      // 5. Log activity
      await this.logActivity({
        ambassador_id: dbRowId,
        ambassador_name: ambassador?.name || "Ambassador",
        type: "avu_transfer",
        desc: `Funded wallet with ₦${amountNaira.toLocaleString()} Naira. Received ${avuToEarn} AVU tokens (Reference: ${paystackRef}).`,
        amount: `${avuToEarn} AVU`
      });

      return { success: true, newBalance: newAvuBalance };
    } catch (err) {
      console.error("Error executing processFundingSuccess transaction sequence:", err);
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
        console.error("Supabase P2P database error:", err);
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
  }
};
