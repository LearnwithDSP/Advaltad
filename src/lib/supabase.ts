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
  status: "pending" | "approved";
  avu_balance: number;
  created_at: string;
}

export interface DbAdmin {
  id: string;
  name: string;
  email: string;
  password?: string;
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

const LOCAL_STORAGE_KEY = "advaltad_ambassadors_db";
const ADMIN_LOCAL_STORAGE_KEY = "advaltad_admins_db";
const ACTIVITIES_LOCAL_STORAGE_KEY = "advaltad_activities_db";

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

// Global Database API (Unified interface for both Supabase and LocalStorage fallback)
export const db = {
  async getAmbassadors(): Promise<DbAmbassador[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("ambassadors")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        return data as DbAmbassador[];
      }
      console.warn("Supabase fetch failed, falling back to local DB:", error);
    }
    
    return getLocalDb();
  },

  async findAmbassadorByEmail(email: string): Promise<DbAmbassador | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("ambassadors")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      
      if (!error && data) {
        return data as DbAmbassador;
      }
      if (error) {
        console.warn("Supabase query failed, falling back to local DB:", error);
      }
    }
    
    const localDb = getLocalDb();
    return localDb.find(a => a.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async createAmbassador(newAmbassador: Omit<DbAmbassador, "id" | "avu_balance" | "created_at" | "status">): Promise<DbAmbassador> {
    const fresh: DbAmbassador = {
      id: "AV-" + Math.floor(Math.random() * 89999 + 10000),
      ...newAmbassador,
      avu_balance: 1250,
      status: "pending",
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("ambassadors")
        .insert([{
          name: fresh.name,
          city: fresh.city,
          field: fresh.field,
          email: fresh.email,
          phone: fresh.phone,
          password: fresh.password,
          status: fresh.status,
          avu_balance: fresh.avu_balance
        }])
        .select()
        .single();
      
      if (!error && data) {
        return data as DbAmbassador;
      }
      console.error("Supabase insert failed, using local DB fallback:", error);
    }

    const localDb = getLocalDb();
    localDb.push(fresh);
    saveLocalDb(localDb);
    return fresh;
  },

  async updateStatus(id: string, status: "pending" | "approved"): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("ambassadors")
        .update({ status })
        .eq("id", id);
      
      if (!error) return true;
      console.error("Supabase update status failed:", error);
    }

    const localDb = getLocalDb();
    const index = localDb.findIndex(a => a.id === id);
    if (index !== -1) {
      localDb[index].status = status;
      saveLocalDb(localDb);
      return true;
    }
    return false;
  },

  async updateAvuBalance(id: string, amount: number): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("ambassadors")
        .update({ avu_balance: amount })
        .eq("id", id);
      
      if (!error) return true;
      console.error("Supabase update balance failed:", error);
    }

    const localDb = getLocalDb();
    const index = localDb.findIndex(a => a.id === id);
    if (index !== -1) {
      localDb[index].avu_balance = amount;
      saveLocalDb(localDb);
      return true;
    }
    return false;
  },

  async updateProfile(id: string, updates: Partial<Omit<DbAmbassador, "id" | "email" | "avu_balance" | "status" | "created_at">>): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("ambassadors")
        .update(updates)
        .eq("id", id);
      
      if (!error) return true;
      console.error("Supabase update profile failed:", error);
    }

    const localDb = getLocalDb();
    const index = localDb.findIndex(a => a.id === id);
    if (index !== -1) {
      localDb[index] = { ...localDb[index], ...updates };
      saveLocalDb(localDb);
      return true;
    }
    return false;
  },

  async deleteAmbassador(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("ambassadors")
        .delete()
        .eq("id", id);
      
      if (!error) return true;
      console.error("Supabase delete failed:", error);
    }

    const localDb = getLocalDb();
    const filtered = localDb.filter(a => a.id !== id);
    if (filtered.length !== localDb.length) {
      saveLocalDb(filtered);
      return true;
    }
    return false;
  },

  async getAdmins(): Promise<DbAdmin[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("admins")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && data) return data as DbAdmin[];
    }
    return getLocalAdminsDb();
  },

  async findAdminByEmail(email: string): Promise<DbAdmin | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("admins")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      
      if (!error && data) return data as DbAdmin;
    }
    const localDb = getLocalAdminsDb();
    return localDb.find(a => a.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async createAdmin(newAdmin: Omit<DbAdmin, "id" | "created_at">): Promise<DbAdmin> {
    const fresh: DbAdmin = {
      id: "ADM-" + Math.floor(Math.random() * 89999 + 10000),
      ...newAdmin,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("admins")
        .insert([{
          name: fresh.name,
          email: fresh.email,
          password: fresh.password
        }])
        .select()
        .single();
      
      if (!error && data) return data as DbAdmin;
    }

    const localDb = getLocalAdminsDb();
    localDb.push(fresh);
    saveLocalAdminsDb(localDb);
    return fresh;
  },

  async getActivities(): Promise<DbActivity[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && data) return data as DbActivity[];
    }
    return getLocalActivitiesDb().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async logActivity(activity: Omit<DbActivity, "id" | "created_at">): Promise<DbActivity> {
    const fresh: DbActivity = {
      id: "act-" + Math.floor(Math.random() * 899999 + 100000),
      ...activity,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("activities")
        .insert([fresh])
        .select()
        .single();
      
      if (!error && data) return data as DbActivity;
    }

    const localDb = getLocalActivitiesDb();
    localDb.push(fresh);
    saveLocalActivitiesDb(localDb);
    return fresh;
  }
};
