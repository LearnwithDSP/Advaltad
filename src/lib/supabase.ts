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
    if (isSupabaseConfigured && supabase) {
      try {
        const rowData: any = {};
        if (updates.name !== undefined) rowData.professional_name = updates.name;
        if (updates.city !== undefined) rowData.base_city = updates.city;
        if (updates.field !== undefined) rowData.focus_interest = updates.field;
        if (updates.phone !== undefined) rowData.phone_number = updates.phone;
        if (updates.password !== undefined) rowData.password = updates.password;

        let tableName = "ambassadors";
        let query = supabase.from(tableName).update(rowData);
        if (isUuid(id)) {
          query = query.or(`id.eq.${id},user_id.eq.${id}`);
        } else {
          query = query.eq("email", id.trim().toLowerCase());
        }
        let { error } = await query;
        if (error) {
          tableName = "Ambassadors";
          let fallbackQuery = supabase.from(tableName).update(rowData);
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
        console.warn("updateProfile error:", err);
      }
    }
    const list = getLocalDb();
    const idx = list.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      saveLocalDb(list);
      return true;
    }
    return false;
  },

  async updateAvuBalance(id: string, newBalance: number): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let tableName = "ambassadors";
        let query = supabase.from(tableName).update({ avu_balance: newBalance });
        if (isUuid(id)) {
          query = query.or(`id.eq.${id},user_id.eq.${id}`);
        } else {
          query = query.eq("email", id.trim().toLowerCase());
        }
        let { error } = await query;
        if (error) {
          tableName = "Ambassadors";
          let fallbackQuery = supabase.from(tableName).update({ avu_balance: newBalance });
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
        console.warn("updateAvuBalance error:", err);
      }
    }
    const list = getLocalDb();
    const idx = list.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
    if (idx !== -1) {
      list[idx].avu_balance = newBalance;
      saveLocalDb(list);
      return true;
    }
    return false;
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
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("wallets").select("*").order("created_at", { ascending: false });
        if (error || !data) {
          const fallback = await supabase.from("Wallets").select("*").order("created_at", { ascending: false });
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
    if (isSupabaseConfigured && supabase) {
      try {
        let tableName = "ambassadors";
        let query = supabase.from(tableName).delete();
        if (isUuid(id)) {
          query = query.or(`id.eq.${id},user_id.eq.${id}`);
        } else {
          query = query.eq("email", id.trim().toLowerCase());
        }
        let { error } = await query;
        if (error) {
          tableName = "Ambassadors";
          let fallbackQuery = supabase.from(tableName).delete();
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
        console.warn("deleteAmbassador error:", err);
      }
    }
    const list = getLocalDb();
    const idx = list.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
    if (idx !== -1) {
      list.splice(idx, 1);
      saveLocalDb(list);
      return true;
    }
    return false;
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
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase.from("wallets").insert([wallet]).select().single();
        if (error) {
          const fallback = await supabase.from("Wallets").insert([wallet]).select().single();
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
    if (isSupabaseConfigured && supabase) {
      try {
        let tableName = "wallets";
        let { error } = await supabase.from(tableName).update({ balance: newBalance }).eq("ambassador_id", ambassadorId);
        if (error) {
          tableName = "Wallets";
          const res = await supabase.from(tableName).update({ balance: newBalance }).eq("ambassador_id", ambassadorId);
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
  }
};