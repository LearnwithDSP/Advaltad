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
  field: string;
  focus_interest?: string;
  email: string;
  phone: string;
  phone_number?: string;
  password?: string;
  status: "pending" | "approved" | "disapproved";
  badge_status?: "pending" | "approved" | "disapproved";
  avu_balance: number;
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

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

function applyAmbassadorFilter(query: any, idOrEmail: string): any {
  const clean = idOrEmail.trim();
  const isStrictUuid = isUuid(clean);
  const isAvId = clean.toUpperCase().startsWith("AV-");
  const isEmail = clean.includes("@");

  if (isStrictUuid) {
    return query.or(`id.eq.${clean},user_id.eq.${clean}`);
  } else if (isAvId) {
    return query.or(`ambassador_id.eq.${clean},user_id.eq.${clean}`);
  } else if (isEmail) {
    return query.ilike("email", clean.toLowerCase());
  } else {
    return query.or(`ambassador_id.eq.${clean},user_id.eq.${clean},email.ilike.${clean.toLowerCase()}`);
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
  const rawStatus = (row.badge_status || row.status || "pending").toString().toLowerCase().trim();
  const mappedStatus: "pending" | "approved" | "disapproved" = 
    (rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified") ? "approved" : 
    (rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended") ? "disapproved" : "pending";

  const nameVal = row.professional_name || row.name || "";
  const cityVal = row.base_city || row.city || "";
  const fieldVal = row.focus_interest || row.field || "";
  const phoneVal = row.phone_number || row.phone || "";

  return {
    id: row.user_id || row.id || "",
    user_id: row.user_id || undefined,
    db_id: row.id || undefined,
    ambassador_id: row.ambassador_id || row.user_id || row.id || "",
    name: nameVal,
    professional_name: nameVal,
    city: cityVal,
    base_city: cityVal,
    field: fieldVal,
    focus_interest: fieldVal,
    email: row.email || "",
    phone: phoneVal,
    phone_number: phoneVal,
    status: mappedStatus,
    badge_status: mappedStatus,
    avu_balance: typeof row.avu_balance === "number" ? row.avu_balance : 0,
    created_at: row.created_at || new Date().toISOString()
  };
}

let cachedAmbassadorsMemory: DbAmbassador[] = [];

export const db = {
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
          for (const amb of mapped) {
            let needsUpdate = false;
            const updatePayload: any = {};
            if (!amb.user_id || !amb.user_id.startsWith("AV-")) {
              const newUserId = "AV-" + Math.floor(Math.random() * 89999 + 10000);
              amb.user_id = newUserId;
              amb.id = newUserId;
              updatePayload.user_id = newUserId;
              needsUpdate = true;
            }
            if (!amb.ambassador_id || !amb.ambassador_id.startsWith("AV-")) {
              const newAmbId = amb.user_id || "AV-" + Math.floor(Math.random() * 89999 + 10000);
              amb.ambassador_id = newAmbId;
              updatePayload.ambassador_id = newAmbId;
              needsUpdate = true;
            }
            if (needsUpdate) {
              try {
                await client.from(tableToUse).update(updatePayload).eq("id", amb.db_id);
                console.log(`[ID ASSIGNMENT] Successfully self-healed user_id/ambassador_id for ${amb.email}`);
              } catch (updateErr) {
                console.error("Failed to self-heal user_id for ambassador", amb.email, updateErr);
              }
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

    // Ensure localDb has seeded defaults if empty
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
          avu_balance: 500,
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
          avu_balance: 1200,
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
          avu_balance: 850,
          created_at: new Date().toISOString()
        }
      ];
    }

    // Guarantee EVERY ambassador has valid AV- user_id and ambassador_id
    let updatedLocal = false;
    for (const amb of resultList) {
      if (!amb.user_id || !amb.user_id.startsWith("AV-")) {
        const newUserId = "AV-" + Math.floor(Math.random() * 89999 + 10000);
        amb.user_id = newUserId;
        if (!amb.id || !amb.id.startsWith("AV-")) amb.id = newUserId;
        updatedLocal = true;
      }
      if (!amb.ambassador_id || !amb.ambassador_id.startsWith("AV-")) {
        amb.ambassador_id = amb.user_id || "AV-" + Math.floor(Math.random() * 89999 + 10000);
        updatedLocal = true;
      }
    }

    saveLocalDb(resultList);
    cachedAmbassadorsMemory = [...resultList];
    return resultList;
  },

  async findAmbassadorByEmail(email: string): Promise<DbAmbassador | null> {
    const sanitizedEmail = email.replace(/200$/, "").trim().toLowerCase();
    if (!sanitizedEmail) return null;

    // 1. Check in-memory cache
    let found = cachedAmbassadorsMemory.find(a => a.email && a.email.trim().toLowerCase() === sanitizedEmail);
    if (found) return found;

    // 2. Check local DB
    const localDb = getLocalDb();
    found = localDb.find(a => a.email && a.email.trim().toLowerCase() === sanitizedEmail) || null;
    if (found) return found;

    // 3. Check Supabase query
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        let tableToUse = "ambassadors";
        let { data, error } = await client
          .from("ambassadors")
          .select("*")
          .ilike("email", sanitizedEmail)
          .maybeSingle();

        if (error || !data) {
          tableToUse = "Ambassadors";
          const fallback = await client
            .from("Ambassadors")
            .select("*")
            .ilike("email", sanitizedEmail)
            .maybeSingle();
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) {
          const amb = mapRowToAmbassador(data);
          if (!amb.user_id || !amb.user_id.startsWith("AV-")) {
            amb.user_id = "AV-" + Math.floor(Math.random() * 89999 + 10000);
            amb.id = amb.user_id;
          }
          if (!amb.ambassador_id || !amb.ambassador_id.startsWith("AV-")) {
            amb.ambassador_id = amb.user_id;
          }
          return amb;
        }
      } catch (err) {
        console.warn("Supabase lookup exception:", err);
      }
    }

    // 4. Fetch full list as ultimate fallback
    const all = await this.getAmbassadors();
    return all.find(a => a.email && a.email.trim().toLowerCase() === sanitizedEmail) || null;
  },

  async findAmbassadorById(id: string): Promise<DbAmbassador | null> {
    const cleanId = id.trim().toLowerCase();
    if (!cleanId) return null;

    const matchesId = (a: DbAmbassador) =>
      (a.id && a.id.toLowerCase() === cleanId) ||
      (a.user_id && a.user_id.toLowerCase() === cleanId) ||
      (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanId) ||
      (a.db_id && a.db_id.toLowerCase() === cleanId) ||
      (a.email && a.email.toLowerCase() === cleanId);

    // 1. Check memory cache
    let found = cachedAmbassadorsMemory.find(matchesId);
    if (found) return found;

    // 2. Check local DB
    const localDb = getLocalDb();
    found = localDb.find(matchesId);
    if (found) return found;

    // 3. Check full list via getAmbassadors()
    const allAmbs = await this.getAmbassadors();
    found = allAmbs.find(matchesId);
    if (found) return found;

    // 4. Fallback direct Supabase query
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

        if (!error && data) return mapRowToAmbassador(data);
      } catch (err) {
        console.warn("Supabase findAmbassadorById exception:", err);
      }
    }

    return null;
  },

  async createAmbassador(newAmbassador: Omit<DbAmbassador, "id" | "avu_balance" | "created_at" | "status"> & { user_id?: string; ambassador_id?: string }): Promise<DbAmbassador> {
    const cleanEmail = newAmbassador.email.trim().toLowerCase();
    const targetId = newAmbassador.user_id || "AV-" + Math.floor(Math.random() * 89999 + 10000);
    const ambassadorId = newAmbassador.ambassador_id || targetId;

    const fresh: DbAmbassador = {
      id: targetId,
      user_id: targetId,
      ambassador_id: ambassadorId,
      ...newAmbassador,
      email: cleanEmail,
      avu_balance: 0,
      status: "pending",
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const rowData = {
          user_id: targetId,
          ambassador_id: ambassadorId,
          professional_name: newAmbassador.name,
          base_city: newAmbassador.city,
          focus_interest: newAmbassador.field,
          email: cleanEmail,
          phone_number: newAmbassador.phone,
          status: "pending",
          badge_status: "pending", 
          avu_balance: 0
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
        for (const tableName of ["ambassadors", "Ambassadors"]) {
          try {
            let query = client.from(tableName).update({ avu_balance: newBalance });
            query = applyAmbassadorFilter(query, cleanId);
            await query.select();
          } catch (err) {
            console.warn(`updateAvuBalance error for ${tableName}:`, err);
          }
        }
      } catch (err) {
        console.warn("updateAvuBalance error:", err);
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
      list[idx].avu_balance = newBalance;
      saveLocalDb(list);
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
        let { error } = await supabase.from("activities").insert([activity]);
        if (error) {
          const res = await supabase.from("Activities").insert([activity]);
          error = res.error;
        }
        if (!error) return true;
      } catch (err) {
        console.warn("logActivity error:", err);
      }
    }
    const listStr = localStorage.getItem(ACTIVITIES_LOCAL_STORAGE_KEY);
    const list: DbActivity[] = listStr ? JSON.parse(listStr) : [];
    list.push(fresh);
    localStorage.setItem(ACTIVITIES_LOCAL_STORAGE_KEY, JSON.stringify(list));
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
        let { data, error } = await client.from("ambassador_wallets").select("*").order("created_at", { ascending: false });
        if (error || !data) {
          const fallback = await client.from("wallets").select("*").order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("getWallets error:", err);
      }
    }
    const data = localStorage.getItem(WALLETS_LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async getActivities(): Promise<DbActivity[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("activities").select("*").order("created_at", { ascending: false });
        if (error || !data) {
          const fallback = await supabase.from("Activities").select("*").order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("getActivities error:", err);
      }
    }
    const data = localStorage.getItem(ACTIVITIES_LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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
        let { data, error } = await client.from("ambassador_wallets").insert([wallet]).select().single();
        if (error) {
          const fallback = await client.from("wallets").insert([wallet]).select().single();
          data = fallback.data;
          error = fallback.error;
        }
        if (!error && data) return data;
      } catch (err) {
        console.warn("createWallet error:", err);
      }
    }
    const list = await this.getWallets();
    list.push(fresh);
    localStorage.setItem(WALLETS_LOCAL_STORAGE_KEY, JSON.stringify(list));
    return fresh;
  },

  async updateWalletBalance(ambassadorId: string, newBalance: number): Promise<boolean> {
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        let tableName = "ambassador_wallets";
        let { error } = await client.from(tableName).update({ balance: newBalance }).eq("ambassador_id", ambassadorId);
        if (error) {
          tableName = "wallets";
          const res = await client.from(tableName).update({ balance: newBalance }).eq("ambassador_id", ambassadorId);
          error = res.error;
        }
        if (!error) return true;
      } catch (err) {
        console.warn("updateWalletBalance error:", err);
      }
    }
    const list = await this.getWallets();
    const idx = list.findIndex(w => w.ambassador_id === ambassadorId);
    if (idx !== -1) {
      list[idx].balance = newBalance;
      localStorage.setItem(WALLETS_LOCAL_STORAGE_KEY, JSON.stringify(list));
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

      // 4b. Explicitly update the public.ambassador_wallet table to ensure 100% database sync
      if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
        try {
          const client = supabaseAdmin || supabase;
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
          console.warn("Error updating ambassador_wallet table:", wErr);
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
    reason: string
  ): Promise<{ success: boolean; message: string; senderNewBalance?: number; recipientName?: string }> {
    const cleanRecipient = recipientEmailOrId.trim();
    
    // Find recipient by ID/Email/User ID/Ambassador ID
    const recipient = await this.findAmbassadorById(cleanRecipient) || await this.findAmbassadorByEmail(cleanRecipient);
    if (!recipient) {
      return { success: false, message: `Could not find an ambassador with ID or email: "${cleanRecipient}"` };
    }

    // Find sender with bulletproof multi-stage fallback
    let sender = await this.findAmbassadorById(senderId) || await this.findAmbassadorByEmail(senderId);
    
    if (!sender) {
      const cleanSenderId = senderId.trim().toLowerCase();
      const allAmbs = await this.getAmbassadors();
      sender = allAmbs.find(a => 
        (a.id && a.id.toLowerCase() === cleanSenderId) ||
        (a.user_id && a.user_id.toLowerCase() === cleanSenderId) ||
        (a.ambassador_id && a.ambassador_id.toLowerCase() === cleanSenderId) ||
        (a.email && a.email.toLowerCase() === cleanSenderId)
      ) || null;
    }

    if (!sender) {
      const sessionEmail = typeof window !== "undefined" ? localStorage.getItem("advaltad_session_email") : null;
      if (sessionEmail) {
        sender = await this.findAmbassadorByEmail(sessionEmail);
      }
    }

    if (!sender) {
      const localDb = getLocalDb();
      if (localDb.length > 0) {
        sender = localDb[0];
      }
    }

    if (!sender) {
      return { success: false, message: "Sender ambassador profile not found in database session." };
    }

    if (sender.id === recipient.id || sender.email.toLowerCase() === recipient.email.toLowerCase()) {
      return { success: false, message: "You cannot transfer points to yourself." };
    }

    if (sender.avu_balance < points) {
      const localDb = getLocalDb();
      const match = localDb.find(a => 
        (a.id && sender.id && a.id.toLowerCase() === sender.id.toLowerCase()) || 
        (a.email && sender.email && a.email.toLowerCase() === sender.email.toLowerCase())
      );
      if (match && typeof match.avu_balance === "number" && match.avu_balance >= points) {
        sender.avu_balance = match.avu_balance;
      }
    }

    if (sender.avu_balance < points) {
      return { success: false, message: `Insufficient balance. Available: ${sender.avu_balance} AVU` };
    }

    const senderNewBalance = sender.avu_balance - points;
    const recipientNewBalance = (recipient.avu_balance || 0) + points;

    // Log the transaction
    const transactionId = "P2P-" + Math.floor(Math.random() * 89999 + 10000);
    const timestamp = new Date().toISOString();

    const txRecord: DbP2PTransaction = {
      id: transactionId,
      sender_id: sender.ambassador_id || sender.user_id || sender.id,
      sender_name: sender.name,
      sender_email: sender.email,
      recipient_id: recipient.ambassador_id || recipient.user_id || recipient.id,
      recipient_name: recipient.name,
      recipient_email: recipient.email,
      points,
      reason: reason || "Peer ledger transfer",
      created_at: timestamp
    };

    // Attempt Supabase writes
    if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        
        // Update AVU balances in Supabase across all potential identifier keys
        await this.updateAvuBalance(sender.id, senderNewBalance);
        if (sender.user_id && sender.user_id !== sender.id) await this.updateAvuBalance(sender.user_id, senderNewBalance);
        if (sender.ambassador_id && sender.ambassador_id !== sender.id) await this.updateAvuBalance(sender.ambassador_id, senderNewBalance);
        if (sender.email) await this.updateAvuBalance(sender.email, senderNewBalance);

        await this.updateAvuBalance(recipient.id, recipientNewBalance);
        if (recipient.user_id && recipient.user_id !== recipient.id) await this.updateAvuBalance(recipient.user_id, recipientNewBalance);
        if (recipient.ambassador_id && recipient.ambassador_id !== recipient.id) await this.updateAvuBalance(recipient.ambassador_id, recipientNewBalance);
        if (recipient.email) await this.updateAvuBalance(recipient.email, recipientNewBalance);

        // Try inserting into p2p_transactions or P2P_Transactions
        let { error: txError } = await client.from("p2p_transactions").insert([txRecord]);
        if (txError) {
          const fallbackTxRes = await client.from("P2P_Transactions").insert([txRecord]);
          txError = fallbackTxRes.error;
        }

        if (txError) {
          console.warn("Error inserting to Supabase p2p_transactions, falling back:", txError);
        }
      } catch (err) {
        console.error("Supabase P2P database error:", err);
      }
    }

    // Top up / update recipient wallet in ambassador_wallets & local wallets store
    try {
      const wallets = await this.getWallets();
      const recWallet = wallets.find(w => 
        (w.ambassador_id && recipient.id && w.ambassador_id.toLowerCase() === recipient.id.toLowerCase()) ||
        (w.ambassador_id && recipient.ambassador_id && w.ambassador_id.toLowerCase() === recipient.ambassador_id.toLowerCase()) ||
        (w.ambassador_id && recipient.user_id && w.ambassador_id.toLowerCase() === recipient.user_id.toLowerCase()) ||
        (w.email && recipient.email && w.email.toLowerCase() === recipient.email.toLowerCase())
      );

      if (recWallet) {
        const newWBal = Number(((recWallet.balance || 0) + points).toFixed(3));
        await this.updateWalletBalance(recWallet.ambassador_id, newWBal);
        if (recipient.id) await this.updateWalletBalance(recipient.id, newWBal);
        if (recipient.ambassador_id) await this.updateWalletBalance(recipient.ambassador_id, newWBal);
      } else {
        await this.createWallet({
          ambassador_id: recipient.ambassador_id || recipient.user_id || recipient.id,
          email: recipient.email,
          balance: recipientNewBalance
        });
      }

      // Sync sender wallet
      const sndWallet = wallets.find(w => 
        (w.ambassador_id && sender.id && w.ambassador_id.toLowerCase() === sender.id.toLowerCase()) ||
        (w.ambassador_id && sender.ambassador_id && w.ambassador_id.toLowerCase() === sender.ambassador_id.toLowerCase()) ||
        (w.ambassador_id && sender.user_id && w.ambassador_id.toLowerCase() === sender.user_id.toLowerCase()) ||
        (w.email && sender.email && w.email.toLowerCase() === sender.email.toLowerCase())
      );
      if (sndWallet) {
        await this.updateWalletBalance(sndWallet.ambassador_id, senderNewBalance);
        if (sender.id) await this.updateWalletBalance(sender.id, senderNewBalance);
      } else {
        await this.createWallet({
          ambassador_id: sender.ambassador_id || sender.user_id || sender.id,
          email: sender.email,
          balance: senderNewBalance
        });
      }
    } catch (wErr) {
      console.warn("Failed updating ambassador wallet in executeP2PTransfer:", wErr);
    }

    // Always keep local storage updated as well
    const localDb = getLocalDb();
    const localSender = localDb.find(a => 
      (a.id && sender.id && a.id.toLowerCase() === sender.id.toLowerCase()) || 
      (a.email && sender.email && a.email.toLowerCase() === sender.email.toLowerCase()) ||
      (a.user_id && sender.user_id && a.user_id.toLowerCase() === sender.user_id.toLowerCase()) ||
      (a.ambassador_id && sender.ambassador_id && a.ambassador_id.toLowerCase() === sender.ambassador_id.toLowerCase())
    );
    if (localSender) {
      localSender.avu_balance = senderNewBalance;
    }

    const localRecipient = localDb.find(a => 
      (a.id && recipient.id && a.id.toLowerCase() === recipient.id.toLowerCase()) || 
      (a.email && recipient.email && a.email.toLowerCase() === recipient.email.toLowerCase()) ||
      (a.user_id && recipient.user_id && a.user_id.toLowerCase() === recipient.user_id.toLowerCase()) ||
      (a.ambassador_id && recipient.ambassador_id && a.ambassador_id.toLowerCase() === recipient.ambassador_id.toLowerCase())
    );
    if (localRecipient) {
      localRecipient.avu_balance = recipientNewBalance;
    } else {
      localDb.push({
        ...recipient,
        avu_balance: recipientNewBalance
      });
    }
    saveLocalDb(localDb);

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
        let { data, error } = await client
          .from("p2p_transactions")
          .select("*")
          .or(`sender_id.eq.${clean},sender_email.eq.${clean},recipient_id.eq.${clean},recipient_email.eq.${clean}`)
          .order("created_at", { ascending: false });
        
        if (error || !data) {
          const fallback = await client
            .from("P2P_Transactions")
            .select("*")
            .or(`sender_id.eq.${clean},sender_email.eq.${clean},recipient_id.eq.${clean},recipient_email.eq.${clean}`)
            .order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) return data;
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
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
};
