import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_URL : "") || 
  (typeof process !== "undefined" ? process.env?.SUPABASE_URL : "") || 
  "";

const supabaseAnonKey = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_ANON_KEY : "") || 
  (typeof process !== "undefined" ? process.env?.SUPABASE_ANON_KEY : "") || 
  "";

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
const ADMIN_LOCAL_STORAGE_KEY = "advaltad_admins_db";
const ACTIVITIES_LOCAL_STORAGE_KEY = "advaltad_activities_db";
const BLOGS_LOCAL_STORAGE_KEY = "advaltad_blogs_db";
const WALLETS_LOCAL_STORAGE_KEY = "advaltad_wallets_db";
const AUDIT_LOGS_LOCAL_STORAGE_KEY = "advaltad_audit_logs_db";
const DONATIONS_LOCAL_STORAGE_KEY = "advaltad_donations_db";
const DEPOSITS_LOCAL_STORAGE_KEY = "advaltad_deposits_db";

function getLocalDepositsDb(): DbDeposit[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(DEPOSITS_LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return [];
}

function saveLocalDepositsDb(deposits: DbDeposit[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEPOSITS_LOCAL_STORAGE_KEY, JSON.stringify(deposits));
}

function getLocalDonationsDb(): DbDonation[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(DONATIONS_LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return [];
}

function saveLocalDonationsDb(donations: DbDonation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DONATIONS_LOCAL_STORAGE_KEY, JSON.stringify(donations));
}

function getLocalAuditLogsDb(): DbAuditLog[] {
  const data = localStorage.getItem(AUDIT_LOGS_LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return [];
}

function saveLocalAuditLogsDb(logs: DbAuditLog[]) {
  localStorage.setItem(AUDIT_LOGS_LOCAL_STORAGE_KEY, JSON.stringify(logs));
}

function getLocalBlogsDb(): DbBlog[] {
  const data = localStorage.getItem(BLOGS_LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  const initialSeed: DbBlog[] = [
    {
      id: "story-1",
      tag: "EDUCATION & TECH EXCELLENCE",
      title: "From Code-Block to Career: Chidi’s Path to Global Innovation",
      excerpt: "Growing up in Enugu, Chidi had no access to a computer. At 19, he discovered the Advaltad TechHub Accelerator, changing his trajectory forever.",
      content: "Chidi grew up in a vibrant but under-resourced suburb of Enugu, Nigeria...",
      author: "Advaltad Media Core",
      image: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=1200",
      created_at: "2026-04-14T12:00:00Z"
    }
  ];
  localStorage.setItem(BLOGS_LOCAL_STORAGE_KEY, JSON.stringify(initialSeed));
  return initialSeed;
}

function saveLocalBlogsDb(blogs: DbBlog[]) {
  localStorage.setItem(BLOGS_LOCAL_STORAGE_KEY, JSON.stringify(blogs));
}

function getLocalWalletsDb(): DbAmbassadorWallet[] {
  const data = localStorage.getItem(WALLETS_LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return [];
}

function saveLocalWalletsDb(wallets: DbAmbassadorWallet[]) {
  localStorage.setItem(WALLETS_LOCAL_STORAGE_KEY, JSON.stringify(wallets));
}

function getLocalAdminsDb(): DbAdmin[] {
  const data = localStorage.getItem(ADMIN_LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return [];
}

function saveLocalAdminsDb(db: DbAdmin[]) {
  localStorage.setItem(ADMIN_LOCAL_STORAGE_KEY, JSON.stringify(db));
}

function getLocalActivitiesDb(): DbActivity[] {
  const data = localStorage.getItem(ACTIVITIES_LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return [];
}

function saveLocalActivitiesDb(db: DbActivity[]) {
  localStorage.setItem(ACTIVITIES_LOCAL_STORAGE_KEY, JSON.stringify(db));
}

function getLocalDb(): DbAmbassador[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return [];
}

function saveLocalDb(db: DbAmbassador[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
}

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// Map database fields tightly to prevent errors
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
    avu_balance: typeof row.avu_balance === "number" ? row.avu_balance : 0,
    created_at: row.created_at || new Date().toISOString()
  };
}

function mapAmbassadorToRow(ambassador: Partial<DbAmbassador>) {
  const row: any = {};
  if (ambassador.user_id !== undefined) row.user_id = ambassador.user_id;
  if (ambassador.professional_name !== undefined) row.professional_name = ambassador.professional_name;
  else if (ambassador.name !== undefined) row.professional_name = ambassador.name;
  if (ambassador.base_city !== undefined) row.base_city = ambassador.base_city;
  else if (ambassador.city !== undefined) row.base_city = ambassador.city;
  if (ambassador.focus_interest !== undefined) row.focus_interest = ambassador.focus_interest;
  else if (ambassador.field !== undefined) row.focus_interest = ambassador.field;
  if (ambassador.email !== undefined) row.email = ambassador.email;
  if (ambassador.phone_number !== undefined) row.phone_number = ambassador.phone_number;
  else if (ambassador.phone !== undefined) row.phone_number = ambassador.phone;
  if (ambassador.badge_status !== undefined) row.badge_status = ambassador.badge_status;
  else if (ambassador.status !== undefined) row.badge_status = ambassador.status;
  if (ambassador.avu_balance !== undefined) row.avu_balance = ambassador.avu_balance;
  return row;
}

export const db = {
  async getAmbassadors(): Promise<DbAmbassador[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase
          .from("ambassadors")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) {
          const fallbackRes = await supabase
            .from("Ambassadors")
            .select("*")
            .order("created_at", { ascending: false });
          if (!fallbackRes.error && fallbackRes.data) {
            data = fallbackRes.data;
            error = null;
          } else {
            console.error("Supabase fetch failed on both tables:", error);
            throw new Error(error?.message || "Failed to fetch from Supabase");
          }
        }
        
        const localList = getLocalDb();
        const liveList = data ? data.map(mapRowToAmbassador) : [];
        
        const mergedMap = new Map<string, DbAmbassador>();
        localList.forEach(item => {
          if (item && item.email) {
            mergedMap.set(item.email.trim().toLowerCase(), item);
          }
        });
        liveList.forEach(item => {
          if (item && item.email) {
            mergedMap.set(item.email.trim().toLowerCase(), item);
          }
        });
        
        const merged = Array.from(mergedMap.values()).sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        
        // Cache the full merged list in localStorage
        saveLocalDb(merged);
        
        return merged;
      } catch (err) {
        console.error("Supabase fetch exception, falling back to local DB:", err);
        return getLocalDb();
      }
    } else {
      return getLocalDb();
    }
  },

  async findAmbassadorByEmail(email: string): Promise<DbAmbassador | null> {
    const sanitizedEmail = email.replace(/200$/, "").trim().toLowerCase();
    
    if (isSupabaseConfigured && supabase) {
      try {
        let { data, error } = await supabase
          .from("ambassadors")
          .select("*")
          .eq("email", sanitizedEmail)
          .maybeSingle();
        
        if (error || !data) {
          const fallbackRes = await supabase
            .from("Ambassadors")
            .select("*")
            .eq("email", sanitizedEmail)
            .maybeSingle();
          if (!fallbackRes.error && fallbackRes.data) {
            data = fallbackRes.data;
            error = null;
          }
        }

        if (data) {
          const matched = mapRowToAmbassador(data);
          // Mirror to local DB
          const localDb = getLocalDb();
          const idx = localDb.findIndex(a => a.email.trim().toLowerCase() === sanitizedEmail);
          if (idx !== -1) {
            localDb[idx] = matched;
          } else {
            localDb.push(matched);
          }
          saveLocalDb(localDb);
          return matched;
        }
        
        // Fallback to local DB if not found in Supabase
        const localDb = getLocalDb();
        return localDb.find(a => a.email.trim().toLowerCase() === sanitizedEmail) || null;
      } catch (err) {
        console.warn("Supabase profile lookup exception, falling back to local DB:", err);
        const localDb = getLocalDb();
        return localDb.find(a => a.email.trim().toLowerCase() === sanitizedEmail) || null;
      }
    } else {
      const localDb = getLocalDb();
      return localDb.find(a => a.email.trim().toLowerCase() === sanitizedEmail) || null;
    }
  },

  async createAmbassador(newAmbassador: Omit<DbAmbassador, "id" | "avu_balance" | "created_at" | "status"> & { user_id?: string }): Promise<DbAmbassador> {
    const cleanEmail = newAmbassador.email.trim().toLowerCase();
    const fresh: DbAmbassador = {
      id: newAmbassador.user_id || "AV-" + Math.floor(Math.random() * 89999 + 10000),
      ...newAmbassador,
      email: cleanEmail,
      avu_balance: 0,
      status: "pending", 
      created_at: new Date().toISOString()
    };

    // Save to local storage cache/fallback first
    try {
      const localDb = getLocalDb();
      const existingIdx = localDb.findIndex(a => a.email.trim().toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        fresh.password = fresh.password || localDb[existingIdx].password;
        fresh.status = localDb[existingIdx].status;
        localDb[existingIdx] = fresh;
      } else {
        localDb.push(fresh);
      }
      saveLocalDb(localDb);
    } catch (localErr) {
      console.warn("Local cache save error in createAmbassador:", localErr);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const rowData = {
          user_id: newAmbassador.user_id,
          professional_name: fresh.name,
          base_city: fresh.city,
          focus_interest: fresh.field,
          email: fresh.email,
          phone_number: fresh.phone,
          badge_status: "pending", 
          avu_balance: fresh.avu_balance
        };
        
        let { data, error } = await supabase
          .from("ambassadors")
          .upsert(rowData, { onConflict: "email" })
          .select()
          .single();
        
        if (error) {
          const fallbackRes = await supabase
            .from("Ambassadors")
            .upsert(rowData, { onConflict: "email" })
            .select()
            .single();
          if (!fallbackRes.error && fallbackRes.data) {
            data = fallbackRes.data;
            error = null;
          } else {
            error = fallbackRes.error;
          }
        }

        if (!error && data) {
          const matched = mapRowToAmbassador(data);
          const localDb = getLocalDb();
          const existingIdx = localDb.findIndex(a => a.email.trim().toLowerCase() === cleanEmail);
          if (existingIdx !== -1) {
            localDb[existingIdx] = matched;
          } else {
            localDb.push(matched);
          }
          saveLocalDb(localDb);
          return matched;
        }
        
        console.warn("Supabase row upsert failed, continuing with local registration:", error);
        return fresh;
      } catch (err) {
        console.error("Supabase insert structural exception:", err);
        return fresh;
      }
    } else {
      return fresh;
    }
  },

  async updateStatus(id: string, status: "pending" | "approved" | "disapproved"): Promise<boolean> {
    try {
      const localDb = getLocalDb();
      const index = localDb.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
      if (index !== -1) {
        localDb[index].status = status;
        saveLocalDb(localDb);
      }
    } catch (localErr) {
      console.warn("Local status update warning:", localErr);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("ambassadors").update({ badge_status: status });
        query = isUuid(id) ? query.or(`id.eq.${id},user_id.eq.${id}`) : query.eq("email", id);
        let { error } = await query;
        
        if (error) {
          let fallbackQuery = supabase.from("Ambassadors").update({ badge_status: status });
          fallbackQuery = isUuid(id) ? fallbackQuery.or(`id.eq.${id},user_id.eq.${id}`) : fallbackQuery.eq("email", id);
          const fallbackRes = await fallbackQuery;
          error = fallbackRes.error;
        }
        if (!error) return true;
        console.warn("Failed to update status on Supabase, but status is synced locally:", error);
        return true;
      } catch (err) {
        console.warn("Supabase update status exception:", err);
        return true;
      }
    } else {
      return true;
    }
  },

  async updateAvuBalance(id: string, amount: number): Promise<boolean> {
    try {
      const localDb = getLocalDb();
      const index = localDb.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
      if (index !== -1) {
        localDb[index].avu_balance = amount;
        saveLocalDb(localDb);
      }
    } catch (localErr) {
      console.warn("Local balance update warning:", localErr);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("ambassadors").update({ avu_balance: amount });
        query = isUuid(id) ? query.or(`id.eq.${id},user_id.eq.${id}`) : query.eq("email", id);
        let { error } = await query;
        
        if (error) {
          let fallbackQuery = supabase.from("Ambassadors").update({ avu_balance: amount });
          fallbackQuery = isUuid(id) ? fallbackQuery.or(`id.eq.${id},user_id.eq.${id}`) : fallbackQuery.eq("email", id);
          const fallbackRes = await fallbackQuery;
          error = fallbackRes.error;
        }
        if (!error) return true;
        console.warn("Failed to update balance on Supabase, but balance is synced locally:", error);
        return true;
      } catch (err) {
        console.warn("Supabase balance shift exception:", err);
        return true;
      }
    } else {
      return true;
    }
  },

  async updateProfile(id: string, updates: Partial<Omit<DbAmbassador, "id" | "email" | "avu_balance" | "status" | "created_at">>): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("ambassadors").update(mapAmbassadorToRow(updates));
        query = isUuid(id) ? query.or(`id.eq.${id},user_id.eq.${id}`) : query.eq("email", id);
        let { error } = await query;
        
        if (error) {
          let fallbackQuery = supabase.from("Ambassadors").update(mapAmbassadorToRow(updates));
          fallbackQuery = isUuid(id) ? fallbackQuery.or(`id.eq.${id},user_id.eq.${id}`) : fallbackQuery.eq("email", id);
          const fallbackRes = await fallbackQuery;
          error = fallbackRes.error;
        }
        if (!error) return true;
        throw new Error(error?.message || "Failed to update profile on Supabase");
      } catch (err) {
        console.warn("Supabase update profile exception:", err);
        throw err;
      }
    } else {
      const localDb = getLocalDb();
      const index = localDb.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
      if (index !== -1) {
        localDb[index] = { ...localDb[index], ...updates };
        saveLocalDb(localDb);
        return true;
      }
      return false;
    }
  },

  async deleteAmbassador(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("ambassadors").delete();
        query = isUuid(id) ? query.or(`id.eq.${id},user_id.eq.${id}`) : query.eq("email", id);
        let { error } = await query;
        
        if (error) {
          let fallbackQuery = supabase.from("Ambassadors").delete();
          fallbackQuery = isUuid(id) ? fallbackQuery.or(`id.eq.${id},user_id.eq.${id}`) : fallbackQuery.eq("email", id);
          const fallbackRes = await fallbackQuery;
          error = fallbackRes.error;
        }
        if (!error) return true;
        throw new Error(error?.message || "Failed to delete ambassador on Supabase");
      } catch (err) {
        console.warn("Supabase deletion sequence exception:", err);
        throw err;
      }
    } else {
      const localDb = getLocalDb();
      const filtered = localDb.filter(a => a.id !== id && a.email.toLowerCase() !== id.toLowerCase());
      if (filtered.length !== localDb.length) {
        saveLocalDb(filtered);
        return true;
      }
      return false;
    }
  },

  async getAdmins(): Promise<DbAdmin[]> {
    const local = getLocalAdminsDb();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("admins")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (!error && data) {
          return data.map((d: any) => ({
            id: d.id,
            name: d.full_name || d.name || "",
            email: d.email,
            user_id: d.user_id,
            role: d.role,
            created_at: d.created_at
          }));
        }
      } catch (err) {
        console.warn("Supabase fetch admins exception:", err);
      }
    }
    return local;
  },

  async findAdminByEmail(email: string): Promise<DbAdmin | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("admins")
          .select("*")
          .ilike("email", cleanEmail)
          .maybeSingle();
        
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
        console.warn("Supabase admin query exception:", err);
      }
    }
    const localDb = getLocalAdminsDb();
    return localDb.find(a => a.email.trim().toLowerCase() === cleanEmail) || null;
  },

  async createAdmin(newAdmin: Omit<DbAdmin, "id" | "created_at"> & { user_id?: string, role?: string }): Promise<DbAdmin> {
    const fresh: DbAdmin = {
      id: "ADM-" + Math.floor(Math.random() * 89999 + 10000),
      ...newAdmin,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("admins")
          .insert([{
            user_id: newAdmin.user_id,
            full_name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role || "admin"
          }])
          .select()
          .single();
        
        if (!error && data) {
          return {
            id: data.id,
            name: data.full_name,
            email: data.email,
            user_id: data.user_id,
            role: data.role,
            created_at: data.created_at
          };
        }
      } catch (err) {
        console.warn("Supabase admin row setup exception:", err);
      }
    }

    const localDb = getLocalAdminsDb();
    localDb.push(fresh);
    saveLocalAdminsDb(localDb);
    return fresh;
  },

  async getActivities(): Promise<DbActivity[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("activities")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) {
          console.error("Supabase activities track error:", error);
          throw new Error(error.message);
        }
        if (data) {
          const remote = data as DbActivity[];
          return remote.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        return [];
      } catch (err) {
        console.error("Supabase activities track exception:", err);
        throw err;
      }
    } else {
      const local = getLocalActivitiesDb();
      return local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async logActivity(activity: Omit<DbActivity, "id" | "created_at">): Promise<DbActivity> {
    const fresh: DbActivity = {
      id: "act-" + Math.floor(Math.random() * 899999 + 100000),
      ...activity,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("activities")
          .insert([fresh])
          .select()
          .single();
        
        if (error) {
          console.error("Supabase active logging error:", error);
          throw new Error(error.message);
        }
        if (data) return data as DbActivity;
        throw new Error("Log activity returned no data");
      } catch (err) {
        console.error("Supabase active logging exception:", err);
        throw err;
      }
    } else {
      const localDb = getLocalActivitiesDb();
      localDb.push(fresh);
      saveLocalActivitiesDb(localDb);
      return fresh;
    }
  },

  async getBlogs(): Promise<DbBlog[]> {
    const local = getLocalBlogsDb();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("blogs")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) return data as DbBlog[];
      } catch (err) {
        console.warn("Supabase content retrieval exception:", err);
      }
    }
    return local;
  },

  async createBlog(blog: Omit<DbBlog, "id" | "created_at">): Promise<DbBlog> {
    const fresh: DbBlog = {
      id: "blog-" + Math.floor(Math.random() * 89999 + 10000),
      ...blog,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("blogs")
          .insert([blog])
          .select()
          .single();
        if (!error && data) return data as DbBlog;
      } catch (err) {
        console.warn("Supabase production blog create exception:", err);
      }
    }
    const localDb = getLocalBlogsDb();
    localDb.unshift(fresh);
    saveLocalBlogsDb(localDb);
    return fresh;
  },

  async updateBlog(id: string, updates: Partial<Omit<DbBlog, "id" | "created_at">>): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from("blogs")
          .update(updates)
          .eq("id", id);
        if (!error) return true;
      } catch (err) {
        console.warn("Supabase modification blog exception:", err);
      }
    }
    const localDb = getLocalBlogsDb();
    const index = localDb.findIndex(b => b.id === id);
    if (index !== -1) {
      localDb[index] = { ...localDb[index], ...updates };
      saveLocalBlogsDb(localDb);
      return true;
    }
    return false;
  },

  async deleteBlog(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from("blogs")
          .delete()
          .eq("id", id);
        if (!error) return true;
      } catch (err) {
        console.warn("Supabase elimination blog exception:", err);
      }
    }
    const localDb = getLocalBlogsDb();
    const filtered = localDb.filter(b => b.id !== id);
    if (filtered.length !== localDb.length) {
      saveLocalBlogsDb(filtered);
      return true;
    }
    return false;
  },

  async getWallets(): Promise<DbAmbassadorWallet[]> {
    const local = getLocalWalletsDb();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("ambassador_wallets")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) return data as DbAmbassadorWallet[];
      } catch (err) {
        console.warn("Supabase ledger sync exception:", err);
      }
    }
    return local;
  },

  async createWallet(wallet: Omit<DbAmbassadorWallet, "id" | "created_at">): Promise<DbAmbassadorWallet> {
    const fresh: DbAmbassadorWallet = {
      id: "wall-" + Math.floor(Math.random() * 89999 + 10000),
      ...wallet,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      try {
        let resolvedId = wallet.ambassador_id;
        if (isUuid(wallet.ambassador_id)) {
          let { data, error } = await supabase
            .from("ambassadors")
            .select("id")
            .or(`id.eq.${wallet.ambassador_id},user_id.eq.${wallet.ambassador_id}`)
            .maybeSingle();
          
          if (error || !data) {
            const fallbackRes = await supabase
              .from("Ambassadors")
              .select("id")
              .or(`id.eq.${wallet.ambassador_id},user_id.eq.${wallet.ambassador_id}`)
              .maybeSingle();
            if (!fallbackRes.error && fallbackRes.data) data = fallbackRes.data;
          }
          if (data) resolvedId = data.id;
        }

        const { data, error } = await supabase
          .from("ambassador_wallets")
          .insert([{ ...wallet, ambassador_id: resolvedId }])
          .select()
          .single();
        if (!error && data) return data as DbAmbassadorWallet;
      } catch (err) {
        console.warn("Supabase setup ledger element exception:", err);
      }
    }
    const localDb = getLocalWalletsDb();
    localDb.unshift(fresh);
    saveLocalWalletsDb(localDb);
    return fresh;
  },

  async updateWalletBalance(ambassadorId: string, balance: number): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let resolvedId = ambassadorId;
        if (isUuid(ambassadorId)) {
          let { data, error } = await supabase
            .from("ambassadors")
            .select("id")
            .or(`id.eq.${ambassadorId},user_id.eq.${ambassadorId}`)
            .maybeSingle();
          
          if (error || !data) {
            const fallbackRes = await supabase
              .from("Ambassadors")
              .select("id")
              .or(`id.eq.${ambassadorId},user_id.eq.${ambassadorId}`)
              .maybeSingle();
            if (!fallbackRes.error && fallbackRes.data) data = fallbackRes.data;
          }
          if (data) resolvedId = data.id;
        }

        const { error } = await supabase
          .from("ambassador_wallets")
          .update({ balance })
          .eq("ambassador_id", resolvedId);
        if (!error) return true;
      } catch (err) {
        console.warn("Supabase ledger adjust exception:", err);
      }
    }
    const localDb = getLocalWalletsDb();
    const index = localDb.findIndex(w => w.ambassador_id === ambassadorId);
    if (index !== -1) {
      localDb[index].balance = balance;
      saveLocalWalletsDb(localDb);
      return true;
    }
    return false;
  },

  async getAuditLogs(): Promise<DbAuditLog[]> {
    const local = getLocalAuditLogsDb();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (!error && data) {
          const remote = data.map((d: any) => ({
            id: d.id,
            admin_id: d.admin_id,
            admin_name: d.admin_name,
            admin_email: d.admin_email,
            ambassador_id: d.ambassador_id,
            ambassador_name: d.ambassador_name,
            action: d.action,
            created_at: d.created_at
          }));
          return remote.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (err) {
        console.warn("Supabase log array pull exception:", err);
      }
    }
    return local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createAuditLog(log: Omit<DbAuditLog, "id" | "created_at">): Promise<DbAuditLog> {
    const fresh: DbAuditLog = {
      id: "aud-" + Math.floor(Math.random() * 899999 + 100000),
      ...log,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .insert([fresh])
          .select()
          .single();
        
        if (!error && data) {
          return {
            id: data.id,
            admin_id: data.admin_id,
            admin_name: data.admin_name,
            admin_email: data.admin_email,
            ambassador_id: data.ambassador_id,
            ambassador_name: data.ambassador_name,
            action: data.action,
            created_at: data.created_at
          };
        }
      } catch (err) {
        console.warn("Supabase administrative log write exception:", err);
      }
    }

    const localDb = getLocalAuditLogsDb();
    localDb.unshift(fresh);
    saveLocalAuditLogsDb(localDb);
    return fresh;
  },

  async getDonations(): Promise<DbDonation[]> {
    const local = getLocalDonationsDb();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("donations")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (!error && data) return data as DbDonation[];
      } catch (err) {
        console.warn("Supabase donation sync retrieval exception:", err);
      }
    }
    return local;
  },

  async createDonation(donation: Omit<DbDonation, "id" | "created_at">): Promise<DbDonation> {
    const fresh: DbDonation = {
      id: "don-" + Math.floor(Math.random() * 899999 + 100000),
      ...donation,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("donations")
          .insert([fresh])
          .select()
          .single();
        
        if (!error && data) return data as DbDonation;
      } catch (err) {
        console.warn("Supabase external transaction track exception:", err);
      }
    }

    const localDb = getLocalDonationsDb();
    localDb.unshift(fresh);
    saveLocalDonationsDb(localDb);
    return fresh;
  },

  async getDeposits(): Promise<DbDeposit[]> {
    const local = getLocalDepositsDb();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("deposits")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (!error && data) return data as DbDeposit[];
      } catch (err) {
        console.warn("Supabase balance log load exception:", err);
      }
    }
    return local;
  },

  async createDeposit(deposit: Omit<DbDeposit, "id" | "created_at">): Promise<DbDeposit> {
    const fresh: DbDeposit = {
      id: "dep-" + Math.floor(Math.random() * 899999 + 100000),
      ...deposit,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("deposits")
          .insert([fresh])
          .select()
          .single();
        
        if (!error && data) return data as DbDeposit;
      } catch (err) {
        console.warn("Supabase collection element update exception:", err);
      }
    }

    const localDb = getLocalDepositsDb();
    localDb.unshift(fresh);
    saveLocalDepositsDb(localDb);
    return fresh;
  },

  async updateDepositStatus(paystack_reference: string, status: "success" | "failed"): Promise<boolean> {
    let success = false;
    let ambassador_id = "";
    let avu_earned = 0;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: updatedRows, error } = await supabase
          .from("deposits")
          .update({ status })
          .eq("paystack_reference", paystack_reference)
          .select();
        
        if (!error && updatedRows && updatedRows.length > 0) {
          success = true;
          const matched = updatedRows[0] as DbDeposit;
          ambassador_id = matched.ambassador_id;
          avu_earned = matched.avu_earned;
        }
      } catch (err) {
        console.warn("Supabase merchant ref verification exception:", err);
      }
    }

    const localDb = getLocalDepositsDb();
    const index = localDb.findIndex(d => d.paystack_reference === paystack_reference);
    if (index !== -1) {
      localDb[index].status = status;
      saveLocalDepositsDb(localDb);
      if (!success) {
        success = true;
        ambassador_id = localDb[index].ambassador_id;
        avu_earned = localDb[index].avu_earned;
      }
    }

    if (status === "success" && success && ambassador_id && avu_earned > 0) {
      try {
        const amb = await this.findAmbassadorByEmail(ambassador_id) || 
                    (await this.getAmbassadors()).find(a => a.id === ambassador_id || a.email === ambassador_id);
        if (amb) {
          const currentBalance = amb.avu_balance || 0;
          await this.updateAvuBalance(amb.id, currentBalance + avu_earned);
        }
      } catch (err) {
        console.error("Token distribution tracking error:", err);
      }
    }

    return success;
  }
};