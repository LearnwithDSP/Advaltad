import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// LocalStorage Database helper for fallback/demo mode
export interface DbAmbassador {
  id: string;
  name: string;
  city: string;
  field: string;
  email: string;
  phone: string;
  password?: string;
  status: "pending" | "approved" | "disapproved";
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

const LOCAL_STORAGE_KEY = "advaltad_ambassadors_db";
const ADMIN_LOCAL_STORAGE_KEY = "advaltad_admins_db";
const ACTIVITIES_LOCAL_STORAGE_KEY = "advaltad_activities_db";
const BLOGS_LOCAL_STORAGE_KEY = "advaltad_blogs_db";
const WALLETS_LOCAL_STORAGE_KEY = "advaltad_wallets_db";
const AUDIT_LOGS_LOCAL_STORAGE_KEY = "advaltad_audit_logs_db";
const DONATIONS_LOCAL_STORAGE_KEY = "advaltad_donations_db";

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
      content: "Chidi grew up in a vibrant but under-resourced suburb of Enugu, Nigeria, where electricity was scarce and personal computers were a luxury reserved for the few. At 19, after completing secondary school with excellent marks but zero options for self-advancement, he is the perfect target for Advaltad's Tech-Hub Initiative. Here, Chidi was fully sponsored through a rigorous 9-month immersive program in Full-Stack Software Engineering. Empowered with modern hardware and direct tutelage from global industry volunteers, Chidi didn't just learn node and react — he designed ‘FarmSettle’, a localized marketplace app that has since helped standard agricultural cooperatives in his community trade. Today, he works as a remote developer for an international green tech organization, directly funding his younger siblings' secondary education.",
      author: "Advaltad Media Core",
      image: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=1200",
      created_at: "2026-04-14T12:00:00Z"
    },
    {
      id: "story-2",
      tag: "SUSTAINABLE COMMUNITY SHELTER",
      title: "Constructing Safety and Stability for Mama Fatima's Family",
      excerpt: "Displaced by flash floods, Fatima and her four kids survived in temporary high-tension tarpaulins until Advaltad's Humanitarian Housing team stepped in.",
      content: "Our Eco-Adobe Sustainable Shelter project is rooted in the belief that secure housing is a basic human right. Mama Fatima was one of hundreds of climate-displaced citizens living in extreme conditions near standard waterways in coastal regions. In under 18 days, utilizing our innovative compressed earth block system which boasts a zero-carbon production rate, our volunteers constructed a neat 3-room housing unit complete with localized solar lanterns and micro-flush toilet mechanisms. This stable foundation allows Fatima to re-establish her tailoring workspace from home, bringing safety, power, and long-term self-reliance to an entire household.",
      author: "Grace Adebayo",
      image: "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=1200",
      created_at: "2026-03-22T12:00:00Z"
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
  const initialSeed: DbAmbassadorWallet[] = [
    {
      id: "wall-1",
      ambassador_id: "demo-ramon",
      email: "ramon@example.com",
      balance: 1250,
      created_at: new Date().toISOString()
    },
    {
      id: "wall-2",
      ambassador_id: "demo-grace",
      email: "grace@example.com",
      balance: 900,
      created_at: new Date().toISOString()
    }
  ];
  localStorage.setItem(WALLETS_LOCAL_STORAGE_KEY, JSON.stringify(initialSeed));
  return initialSeed;
}

function saveLocalWalletsDb(wallets: DbAmbassadorWallet[]) {
  localStorage.setItem(WALLETS_LOCAL_STORAGE_KEY, JSON.stringify(wallets));
}

function getLocalAdminsDb(): DbAdmin[] {
  const data = localStorage.getItem(ADMIN_LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  const initialSeed: DbAdmin[] = [
    {
      id: "ADM-99381",
      name: "Sovereign Supervisor",
      email: "admin@advaltad.org",
      password: "password123",
      created_at: new Date().toISOString()
    }
  ];
  localStorage.setItem(ADMIN_LOCAL_STORAGE_KEY, JSON.stringify(initialSeed));
  return initialSeed;
}

function saveLocalAdminsDb(db: DbAdmin[]) {
  localStorage.setItem(ADMIN_LOCAL_STORAGE_KEY, JSON.stringify(db));
}

function getLocalActivitiesDb(): DbActivity[] {
  const data = localStorage.getItem(ACTIVITIES_LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  const initialSeed: DbActivity[] = [
    {
      id: "act-1",
      ambassador_id: "demo-ramon",
      ambassador_name: "Ramon Bisola",
      type: "registration",
      desc: "Registered new professional portfolio and aligned with 'Enriching African youths initiative' division",
      created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      id: "act-2",
      ambassador_id: "demo-grace",
      ambassador_name: "Grace Adebayo",
      type: "registration",
      desc: "Registered new professional portfolio and aligned with 'Humanitarian housing scheme' division",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: "act-3",
      ambassador_id: "demo-ramon",
      ambassador_name: "Ramon Bisola",
      type: "avu_transfer",
      desc: "Transferred 150 AVU tokens to Grace Adebayo for peer project assistance",
      amount: "150 AVU",
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ];
  localStorage.setItem(ACTIVITIES_LOCAL_STORAGE_KEY, JSON.stringify(initialSeed));
  return initialSeed;
}

function saveLocalActivitiesDb(db: DbActivity[]) {
  localStorage.setItem(ACTIVITIES_LOCAL_STORAGE_KEY, JSON.stringify(db));
}

// Helper to seed initial demo accounts if empty
function getLocalDb(): DbAmbassador[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  }
  
  // Initial seed data
  const initialSeed: DbAmbassador[] = [
    {
      id: "demo-ramon",
      name: "Ramon Bisola",
      city: "Lagos, Nigeria",
      field: "Enriching African youths initiative",
      email: "ramon@example.com",
      phone: "+234 801 234 5678",
      password: "password123",
      status: "approved",
      avu_balance: 1250,
      created_at: new Date().toISOString()
    },
    {
      id: "demo-grace",
      name: "Grace Adebayo",
      city: "Mombasa, Kenya",
      field: "Humanitarian housing scheme",
      email: "grace@example.com",
      phone: "+254 712 345 678",
      password: "password123",
      status: "approved",
      avu_balance: 900,
      created_at: new Date().toISOString()
    }
  ];
  
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialSeed));
  return initialSeed;
}

function saveLocalDb(db: DbAmbassador[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
}

// Helper to validate if a string is a valid UUID to prevent Postgres type errors
function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// Helper to map DB row to DbAmbassador
function mapRowToAmbassador(row: any): DbAmbassador {
  const rawStatus = (row.badge_status || row.status || "pending").toString().toLowerCase().trim();
  const mappedStatus: "pending" | "approved" | "disapproved" = 
    (rawStatus === "approved" || rawStatus === "active" || rawStatus === "verified") ? "approved" : 
    (rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended") ? "disapproved" : "pending";

  return {
    id: row.user_id || row.id || "",
    name: row.professional_name || row.name || "",
    city: row.base_city || row.city || "",
    field: row.focus_interest || row.field || "",
    email: row.email || "",
    phone: row.phone_number || row.phone || "",
    status: mappedStatus,
    avu_balance: typeof row.avu_balance === "number" ? row.avu_balance : 1250,
    created_at: row.created_at || new Date().toISOString()
  };
}

// Helper to map DbAmbassador properties to DB keys
function mapAmbassadorToRow(ambassador: Partial<DbAmbassador & { user_id?: string }>) {
  const row: any = {};
  if (ambassador.user_id !== undefined) row.user_id = ambassador.user_id;
  if (ambassador.name !== undefined) row.professional_name = ambassador.name;
  if (ambassador.city !== undefined) row.base_city = ambassador.city;
  if (ambassador.field !== undefined) row.focus_interest = ambassador.field;
  if (ambassador.email !== undefined) row.email = ambassador.email;
  if (ambassador.phone !== undefined) row.phone_number = ambassador.phone;
  if (ambassador.status !== undefined) row.badge_status = ambassador.status;
  if (ambassador.avu_balance !== undefined) row.avu_balance = ambassador.avu_balance;
  return row;
}

// Global Database API (Unified interface for both Supabase and LocalStorage fallback)
export const db = {
  async getAmbassadors(): Promise<DbAmbassador[]> {
    const local = getLocalDb();
    if (isSupabaseConfigured && supabase) {
      try {
        // Validate session state to ensure headers are correctly established for RLS contexts
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          console.log("Supabase active session verified for Admin DB fetch:", sessionData.session.user.email);
        }

        // Try lowercase "ambassadors" first
        let { data, error } = await supabase
          .from("ambassadors")
          .select("*")
          .order("created_at", { ascending: false });
        
        // If lowercase table failed, try uppercase table "Ambassadors" as fallback
        if (error || !data) {
          console.warn("Lowercase 'ambassadors' table query unsuccessful, trying fallback capitalized 'Ambassadors' table...", error);
          const fallbackRes = await supabase
            .from("Ambassadors")
            .select("*")
            .order("created_at", { ascending: false });
          
          if (!fallbackRes.error && fallbackRes.data) {
            data = fallbackRes.data;
            error = null;
          } else if (fallbackRes.error) {
            console.error("Both 'ambassadors' and 'Ambassadors' query routes failed in Supabase:", fallbackRes.error);
          }
        }
        
        if (!error && data) {
          const remote = data.map(mapRowToAmbassador);
          return remote; // ONLY return Supabase data when connected, no local/demo merge!
        }
        console.warn("Supabase fetch failed, falling back to local DB:", error);
      } catch (err) {
        console.warn("Supabase fetch failed with exception:", err);
      }
    }
    return local;
  },

  async findAmbassadorByEmail(email: string): Promise<DbAmbassador | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("ambassadors")
          .select("*")
          .eq("email", email)
          .maybeSingle();
        
        if (!error && data) {
          return mapRowToAmbassador(data);
        }
        if (error) {
          console.warn("Supabase query failed, falling back to local DB:", error);
        }
      } catch (err) {
        console.warn("Supabase query failed with exception:", err);
      }
    }
    
    const localDb = getLocalDb();
    return localDb.find(a => a.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async createAmbassador(newAmbassador: Omit<DbAmbassador, "id" | "avu_balance" | "created_at" | "status"> & { user_id?: string }): Promise<DbAmbassador> {
    const fresh: DbAmbassador = {
      id: newAmbassador.user_id || "AV-" + Math.floor(Math.random() * 89999 + 10000),
      ...newAmbassador,
      avu_balance: 1250,
      status: "pending",
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const rowData = {
          user_id: newAmbassador.user_id,
          professional_name: fresh.name,
          base_city: fresh.city,
          focus_interest: fresh.field,
          email: fresh.email,
          phone_number: fresh.phone,
          badge_status: fresh.status,
          avu_balance: fresh.avu_balance
        };
        const { data, error } = await supabase
          .from("ambassadors")
          .insert([rowData])
          .select()
          .single();
        
        if (!error && data) {
          return mapRowToAmbassador(data);
        }
        console.warn("Supabase insert failed, using local DB fallback:", error);
      } catch (err) {
        console.warn("Supabase insert exception, using local DB fallback:", err);
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
        let query = supabase.from("ambassadors").update({ badge_status: status });
        if (isUuid(id)) {
          query = query.or(`id.eq.${id},user_id.eq.${id}`);
        } else {
          query = query.eq("email", id);
        }
        const { error } = await query;
        if (!error) return true;
        console.warn("Supabase update status failed:", error);
      } catch (err) {
        console.warn("Supabase update status exception:", err);
      }
    }

    const localDb = getLocalDb();
    const index = localDb.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
    if (index !== -1) {
      localDb[index].status = status;
      saveLocalDb(localDb);
      return true;
    }
    return false;
  },

  async updateAvuBalance(id: string, amount: number): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("ambassadors").update({ avu_balance: amount });
        if (isUuid(id)) {
          query = query.or(`id.eq.${id},user_id.eq.${id}`);
        } else {
          query = query.eq("email", id);
        }
        const { error } = await query;
        if (!error) return true;
        console.warn("Supabase update balance failed:", error);
      } catch (err) {
        console.warn("Supabase update balance exception:", err);
      }
    }

    const localDb = getLocalDb();
    const index = localDb.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
    if (index !== -1) {
      localDb[index].avu_balance = amount;
      saveLocalDb(localDb);
      return true;
    }
    return false;
  },

  async updateProfile(id: string, updates: Partial<Omit<DbAmbassador, "id" | "email" | "avu_balance" | "status" | "created_at">>): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("ambassadors").update(mapAmbassadorToRow(updates));
        if (isUuid(id)) {
          query = query.or(`id.eq.${id},user_id.eq.${id}`);
        } else {
          query = query.eq("email", id);
        }
        const { error } = await query;
        if (!error) return true;
        console.warn("Supabase update profile failed:", error);
      } catch (err) {
        console.warn("Supabase update profile exception:", err);
      }
    }

    const localDb = getLocalDb();
    const index = localDb.findIndex(a => a.id === id || a.email.toLowerCase() === id.toLowerCase());
    if (index !== -1) {
      localDb[index] = { ...localDb[index], ...updates };
      saveLocalDb(localDb);
      return true;
    }
    return false;
  },

  async deleteAmbassador(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("ambassadors").delete();
        if (isUuid(id)) {
          query = query.or(`id.eq.${id},user_id.eq.${id}`);
        } else {
          query = query.eq("email", id);
        }
        const { error } = await query;
        if (!error) return true;
        console.warn("Supabase delete failed:", error);
      } catch (err) {
        console.warn("Supabase delete exception:", err);
      }
    }

    const localDb = getLocalDb();
    const filtered = localDb.filter(a => a.id !== id && a.email.toLowerCase() !== id.toLowerCase());
    if (filtered.length !== localDb.length) {
      saveLocalDb(filtered);
      return true;
    }
    return false;
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
          const remote: DbAdmin[] = data.map((d: any) => ({
            id: d.id,
            name: d.full_name || d.name || "",
            email: d.email,
            user_id: d.user_id,
            role: d.role,
            created_at: d.created_at
          }));
          return remote; // ONLY return Supabase data when connected, no local/demo merge!
        }
        console.warn("Supabase fetch admins failed:", error);
      } catch (err) {
        console.warn("Supabase fetch admins exception:", err);
      }
    }
    return local;
  },

  async findAdminByEmail(email: string): Promise<DbAdmin | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("admins")
          .select("*")
          .eq("email", email)
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
        if (error) {
          console.warn("Supabase query admin failed:", error);
        }
      } catch (err) {
        console.warn("Supabase query admin exception:", err);
      }
    }
    const localDb = getLocalAdminsDb();
    return localDb.find(a => a.email.toLowerCase() === email.toLowerCase()) || null;
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
        if (error) {
          console.warn("Supabase insert admin failed:", error);
        }
      } catch (err) {
        console.warn("Supabase insert admin exception:", err);
      }
    }

    const localDb = getLocalAdminsDb();
    localDb.push(fresh);
    saveLocalAdminsDb(localDb);
    return fresh;
  },

  async getActivities(): Promise<DbActivity[]> {
    const local = getLocalActivitiesDb();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("activities")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (!error && data) {
          const remote = data as DbActivity[];
          return remote.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        console.warn("Supabase fetch activities failed:", error);
      } catch (err) {
        console.warn("Supabase fetch activities exception:", err);
      }
    }
    return local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
        
        if (!error && data) return data as DbActivity;
        console.warn("Supabase insert activity failed:", error);
      } catch (err) {
        console.warn("Supabase insert activity exception:", err);
      }
    }

    const localDb = getLocalActivitiesDb();
    localDb.push(fresh);
    saveLocalActivitiesDb(localDb);
    return fresh;
  },

  async getBlogs(): Promise<DbBlog[]> {
    const local = getLocalBlogsDb();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("blogs")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) {
          const remote = data as DbBlog[];
          return remote;
        }
        console.warn("Supabase fetch blogs failed:", error);
      } catch (err) {
        console.warn("Supabase fetch blogs exception:", err);
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
        console.warn("Supabase create blog failed:", error);
      } catch (err) {
        console.warn("Supabase create blog exception:", err);
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
        console.warn("Supabase update blog failed:", error);
      } catch (err) {
        console.warn("Supabase update blog exception:", err);
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
        console.warn("Supabase delete blog failed:", error);
      } catch (err) {
        console.warn("Supabase delete blog exception:", err);
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
        if (!error && data) {
          const remote = data as DbAmbassadorWallet[];
          return remote;
        }
        console.warn("Supabase fetch wallets failed:", error);
      } catch (err) {
        console.warn("Supabase fetch wallets exception:", err);
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
        const { data, error } = await supabase
          .from("ambassador_wallets")
          .insert([wallet])
          .select()
          .single();
        if (!error && data) return data as DbAmbassadorWallet;
        console.warn("Supabase insert wallet failed:", error);
      } catch (err) {
        console.warn("Supabase insert wallet exception:", err);
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
        const { error } = await supabase
          .from("ambassador_wallets")
          .update({ balance })
          .eq("ambassador_id", ambassadorId);
        if (!error) return true;
        console.warn("Supabase update wallet balance failed:", error);
      } catch (err) {
        console.warn("Supabase update wallet balance exception:", err);
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
        console.warn("Supabase fetch audit logs error, falling back to local:", error);
      } catch (err) {
        console.warn("Supabase fetch audit logs failed/table missing, falling back to local:", err);
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
        console.warn("Supabase insert audit log error:", error);
      } catch (err) {
        console.warn("Supabase insert audit log failed/table missing:", err);
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
        
        if (!error && data) {
          const remote = data as DbDonation[];
          return remote;
        }
        console.warn("Supabase fetch donations error, falling back to local:", error);
      } catch (err) {
        console.warn("Supabase fetch donations failed, falling back to local:", err);
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
        
        if (!error && data) {
          return data as DbDonation;
        }
        console.warn("Supabase insert donation error, saving to local only:", error);
      } catch (err) {
        console.warn("Supabase insert donation failed, saving to local only:", err);
      }
    }

    const localDb = getLocalDonationsDb();
    localDb.unshift(fresh);
    saveLocalDonationsDb(localDb);
    return fresh;
  }
};
