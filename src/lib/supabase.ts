import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Unified Database interface matching your exact table schema columns
export interface DbAmbassador {
  id: string;
  user_id?: string;
  db_id?: string;
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

const LOCAL_STORAGE_KEY = "advaltad_ambassadors_db";
const ACTIVITIES_LOCAL_STORAGE_KEY = "advaltad_activities_db";
const BLOGS_LOCAL_STORAGE_KEY = "advaltad_blogs_db";
const WALLETS_LOCAL_STORAGE_KEY = "advaltad_wallets_db";
const ADMIN_LOCAL_STORAGE_KEY = "advaltad_admins_db";
const AUDIT_LOGS_LOCAL_STORAGE_KEY = "advaltad_audit_logs_db";
const DONATIONS_LOCAL_STORAGE_KEY = "advaltad_donations_db";
const DEPOSITS_LOCAL_STORAGE_KEY = "advaltad_deposits_db";

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
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
    avu_balance: typeof row.avu_balance === "number" ? row.avu_balance : 1250,
    created_at: row.created_at || new Date().toISOString()
  };
}

export const db = {
  async getAmbassadors(): Promise<DbAmbassador[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase
          .from("ambassadors")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error || !data) {
          const fallback = await supabase
            .from("Ambassadors")
            .select("*")
            .order("created_at", { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) {
          return data.map(mapRowToAmbassador);
        }
      } catch (err) {
        console.error("Supabase fetch exception:", err);
      }
    }
    return getLocalDb();
  },

  async findAmbassadorByEmail(email: string): Promise<DbAmbassador | null> {
    const sanitizedEmail = email.replace(/200$/, "").trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase
          .from("ambassadors")
          .select("*")
          .ilike("email", sanitizedEmail)
          .maybeSingle();

        if (error || !data) {
          const fallback = await supabase
            .from("Ambassadors")
            .select("*")
            .ilike("email", sanitizedEmail)
            .maybeSingle();
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) return mapRowToAmbassador(data);
      } catch (err) {
        console.warn("Supabase lookup exception:", err);
      }
    }
    return getLocalDb().find(a => a.email.trim().toLowerCase() === sanitizedEmail) || null;
  },

  async createAmbassador(newAmbassador: Omit<DbAmbassador, "id" | "avu_balance" | "created_at" | "status"> & { user_id?: string }): Promise<DbAmbassador> {
    const cleanEmail = newAmbassador.email.trim().toLowerCase();
    const targetId = newAmbassador.user_id || "AV-" + Math.floor(Math.random() * 89999 + 10000);

    const fresh: DbAmbassador = {
      id: targetId,
      ...newAmbassador,
      email: cleanEmail,
      avu_balance: 1250,
      status: "pending",
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const rowData = {
          user_id: newAmbassador.user_id || null,
          professional_name: newAmbassador.name,
          base_city: newAmbassador.city,
          focus_interest: newAmbassador.field,
          email: cleanEmail,
          phone_number: newAmbassador.phone,
          badge_status: "pending", 
          avu_balance: 1250
        };
        
        let { data, error } = await supabase.from("ambassadors").insert([rowData]).select().single();
        if (error) {
          const fallback = await supabase.from("Ambassadors").insert([rowData]).select().single();
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
    if (isSupabaseConfigured && supabase) {
      try {
        let tableName = "ambassadors";
        let query = supabase.from(tableName).update({ badge_status: status });
        
        if (isUuid(id)) {
          query = query.or(`id.eq.${id},user_id.eq.${id}`);
        } else {
          query = query.eq("email", id.trim().toLowerCase());
        }

        let { error } = await query;
        if (error) {
          tableName = "Ambassadors";
          let fallbackQuery = supabase.from(tableName).update({ badge_status: status });
          if (isUuid(id)) {
            fallbackQuery = fallbackQuery.or(`id.eq.${id},user_id.eq.${id}`);
          } else {
            fallbackQuery = fallbackQuery.eq("email", id.trim().toLowerCase());
          }
          const res = await fallbackQuery;
          error = res.error;
        }
        if (!error) return true;
      } catch (err) {
        console.warn("Status change update exception:", err);
      }
    }
    const localDb = getLocalDb();
    const index = localDb.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
    if (index !== -1) {
      localDb[index].status = status;
      localDb[index].badge_status = status;
      saveLocalDb(localDb);
      return true;
    }
    return false;
  }
};