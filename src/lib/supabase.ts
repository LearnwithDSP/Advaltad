import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error("CRITICAL ERROR: Supabase environment variables are missing! The platform requires a valid connection.");
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Clean Core Typings
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

// Check for valid UUIDs to safeguard PostgreSQL parameter queries
function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// Explicit Row Mapper
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
    id: row.id || row.user_id || "", 
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

// Pure Live Supabase Pipeline API
export const db = {
  async getAmbassadors(): Promise<DbAmbassador[]> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("ambassadors")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapRowToAmbassador);
  },

  async findAmbassadorByEmail(email: string): Promise<DbAmbassador | null> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const sanitizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from("ambassadors")
      .select("*")
      .ilike("email", sanitizedEmail)
      .maybeSingle();
    
    if (error) throw error;
    return data ? mapRowToAmbassador(data) : null;
  },

  async createAmbassador(newAmbassador: Omit<DbAmbassador, "id" | "avu_balance" | "created_at" | "status"> & { user_id?: string }): Promise<DbAmbassador> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const cleanEmail = newAmbassador.email.trim().toLowerCase();
    
    const rowData = {
      user_id: newAmbassador.user_id,
      professional_name: newAmbassador.name,
      base_city: newAmbassador.city,
      focus_interest: newAmbassador.field,
      email: cleanEmail,
      phone_number: newAmbassador.phone,
      badge_status: "pending",
      avu_balance: 1250
    };
    
    const { data, error } = await supabase
      .from("ambassadors")
      .insert([rowData])
      .select()
      .single();
    
    if (error) throw error;
    return mapRowToAmbassador(data);
  },

  async updateStatus(id: string, status: "pending" | "approved" | "disapproved"): Promise<boolean> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    let query = supabase.from("ambassadors").update({ badge_status: status });
    if (isUuid(id)) {
      query = query.or(`id.eq.${id},user_id.eq.${id}`);
    } else {
      query = query.eq("email", id);
    }
    const { error } = await query;
    if (error) throw error;
    return true;
  },

  async updateAvuBalance(id: string, amount: number): Promise<boolean> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    let query = supabase.from("ambassadors").update({ avu_balance: amount });
    if (isUuid(id)) {
      query = query.or(`id.eq.${id},user_id.eq.${id}`);
    } else {
      query = query.eq("email", id);
    }
    const { error } = await query;
    if (error) throw error;
    return true;
  },

  async updateProfile(id: string, updates: Partial<Omit<DbAmbassador, "id" | "email" | "avu_balance" | "status" | "created_at">>): Promise<boolean> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    let query = supabase.from("ambassadors").update(mapAmbassadorToRow(updates));
    if (isUuid(id)) {
      query = query.or(`id.eq.${id},user_id.eq.${id}`);
    } else {
      query = query.eq("email", id);
    }
    const { error } = await query;
    if (error) throw error;
    return true;
  },

  async deleteAmbassador(id: string): Promise<boolean> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    let query = supabase.from("ambassadors").delete();
    if (isUuid(id)) {
      query = query.or(`id.eq.${id},user_id.eq.${id}`);
    } else {
      query = query.eq("email", id);
    }
    const { error } = await query;
    if (error) throw error;
    return true;
  },

  async getAdmins(): Promise<DbAdmin[]> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.full_name || d.name || "",
      email: d.email,
      user_id: d.user_id,
      role: d.role,
      created_at: d.created_at
    }));
  },

  async findAdminByEmail(email: string): Promise<DbAdmin | null> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .ilike("email", cleanEmail)
      .maybeSingle();
    
    if (error) throw error;
    return data ? {
      id: data.id,
      name: data.full_name || data.name || "",
      email: data.email,
      user_id: data.user_id,
      role: data.role,
      created_at: data.created_at
    } : null;
  },

  async createAdmin(newAdmin: Omit<DbAdmin, "id" | "created_at"> & { user_id?: string, role?: string }): Promise<DbAdmin> {
    if (!supabase) throw new Error("Supabase is not initialized.");
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
    
    if (error) throw error;
    return {
      id: data.id,
      name: data.full_name,
      email: data.email,
      user_id: data.user_id,
      role: data.role,
      created_at: data.created_at
    };
  },

  async getActivities(): Promise<DbActivity[]> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async logActivity(activity: Omit<DbActivity, "id" | "created_at">): Promise<DbActivity> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("activities")
      .insert([activity])
      .select()
      .single();
    
    if (error) throw error;
    return data as DbActivity;
  },

  async getBlogs(): Promise<DbBlog[]> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createBlog(blog: Omit<DbBlog, "id" | "created_at">): Promise<DbBlog> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("blogs")
      .insert([blog])
      .select()
      .single();
    
    if (error) throw error;
    return data as DbBlog;
  },

  async updateBlog(id: string, updates: Partial<Omit<DbBlog, "id" | "created_at">>): Promise<boolean> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { error } = await supabase
      .from("blogs")
      .update(updates)
      .eq("id", id);
    
    if (error) throw error;
    return true;
  },

  async deleteBlog(id: string): Promise<boolean> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { error } = await supabase
      .from("blogs")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    return true;
  },

  async getWallets(): Promise<DbAmbassadorWallet[]> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("ambassador_wallets")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createWallet(wallet: Omit<DbAmbassadorWallet, "id" | "created_at">): Promise<DbAmbassadorWallet> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("ambassador_wallets")
      .insert([wallet])
      .select()
      .single();
    
    if (error) throw error;
    return data as DbAmbassadorWallet;
  },

  async updateWalletBalance(ambassadorId: string, balance: number): Promise<boolean> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { error } = await supabase
      .from("ambassador_wallets")
      .update({ balance })
      .eq("ambassador_id", ambassadorId);
    
    if (error) throw error;
    return true;
  },

  async getAuditLogs(): Promise<DbAuditLog[]> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createAuditLog(log: Omit<DbAuditLog, "id" | "created_at">): Promise<DbAuditLog> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("audit_logs")
      .insert([log])
      .select()
      .single();
    
    if (error) throw error;
    return data as DbAuditLog;
  },

  async getDonations(): Promise<DbDonation[]> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("donations")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createDonation(donation: Omit<DbDonation, "id" | "created_at">): Promise<DbDonation> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("donations")
      .insert([donation])
      .select()
      .single();
    
    if (error) throw error;
    return data as DbDonation;
  },

  async getDeposits(): Promise<DbDeposit[]> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("deposits")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createDeposit(deposit: Omit<DbDeposit, "id" | "created_at">): Promise<DbDeposit> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    const { data, error } = await supabase
      .from("deposits")
      .insert([deposit])
      .select()
      .single();
    
    if (error) throw error;
    return data as DbDeposit;
  },

  async updateDepositStatus(paystack_reference: string, status: "success" | "failed"): Promise<boolean> {
    if (!supabase) throw new Error("Supabase is not initialized.");
    
    const { data: updatedRows, error } = await supabase
      .from("deposits")
      .update({ status })
      .eq("paystack_reference", paystack_reference)
      .select();
    
    if (error || !updatedRows || updatedRows.length === 0) {
      throw error || new Error("Deposit record not found for reference status update.");
    }

    const matched = updatedRows[0] as DbDeposit;
    
    if (status === "success" && matched.ambassador_id && matched.avu_earned > 0) {
      const amb = await this.findAmbassadorByEmail(matched.ambassador_id) || 
                  (await this.getAmbassadors()).find(a => a.id === matched.ambassador_id || a.email === matched.ambassador_id);
      if (amb) {
        await this.updateAvuBalance(amb.id, (amb.avu_balance || 0) + matched.avu_earned);
      }
    }

    return true;
  }
};