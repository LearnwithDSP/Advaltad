import React, { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, AlertCircle, Users, Wallet, LogOut } from "lucide-react";

// --- Types ---
interface Ambassador {
  id: string;
  professional_name: string;
  email: string;
  phone_number: string;
  badge_status: "pending" | "approved" | "disapproved";
  avu_balance: number;
}

interface AdminPortalProps {
  onLogout?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout }) => {
  // --- State Hooks ---
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "disapproved">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Mock/Supabase Data ---
  useEffect(() => {
    async function fetchAmbassadors() {
      try {
        setLoading(true);
        // TODO: Replace with your actual Supabase / API call:
        // const { data, error } = await supabase.from('ambassadors').select('*');
        
        // Mock data to ensure interface rendering is verified
        const mockData: Ambassador[] = [
          { id: "1", professional_name: "John Doe", email: "john@example.com", phone_number: "+123456789", badge_status: "pending", avu_balance: 150 },
          { id: "2", professional_name: "Jane Smith", email: "jane@example.com", phone_number: "+987654321", badge_status: "approved", avu_balance: 420 },
        ];
        
        setAmbassadors(mockData);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to load ambassadors");
      } finally {
        setLoading(false);
      }
    }
    fetchAmbassadors();
  }, []);

  // --- Action Handlers ---
  const handleUpdateStatus = async (id: string, newStatus: "approved" | "disapproved") => {
    try {
      // Optimistic state update to keep the UI blazing fast
      setAmbassadors((prev) =>
        prev.map((amb) => (amb.id === id ? { ...amb, badge_status: newStatus } : amb))
      );

      // TODO: Add your backend database mutation logic here:
      // await supabase.from('ambassadors').update({ badge_status: newStatus }).eq('id', id);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  // --- Calculations & Filtering ---
  const filteredAmbassadors = ambassadors.filter((amb) => {
    if (!amb) return false;
    const name = (amb.professional_name || "").toLowerCase();
    const email = (amb.email || "").toLowerCase();
    const phone = (amb.phone_number || "").toLowerCase();
    const search = searchQuery.toLowerCase();

    const matchesSearch = name.includes(search) || email.includes(search) || phone.includes(search);
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && amb.badge_status === statusFilter;
  });

  const totalAVU = ambassadors.reduce((acc, curr) => acc + (curr.avu_balance || 0), 0);
  const pendingCount = ambassadors.filter((a) => a.badge_status === "pending").length;
  const approvedCount = ambassadors.filter((a) => a.badge_status === "approved").length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-['Roboto',sans-serif] text-slate-800 antialiased">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Admin Control Center</h1>
            <p className="text-sm text-slate-500">Manage global foundations, ambassador verifications, and financial balances.</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          )}
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card: Total Ambassadors */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Ambassadors</span>
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight">{ambassadors.length}</span>
            </div>
          </div>

          {/* Card: Pending Approval */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Review</span>
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-amber-600">{pendingCount}</span>
            </div>
          </div>

          {/* Card: Approved */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Badge</span>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-emerald-600">{approvedCount}</span>
            </div>
          </div>

          {/* Card: Total AVU Issued */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total AVU Allocated</span>
              <Wallet className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-blue-600">{totalAVU}</span>
              <span className="text-xs font-semibold text-slate-400">AVU</span>
            </div>
          </div>
        </div>

        {/* Filters & Dynamic Search Bar */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg self-start md:self-auto">
            {(["all", "pending", "approved", "disapproved"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-md px-4 py-1.5 text-xs font-bold capitalize transition-all ${
                  statusFilter === filter
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Data Presentation Node */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm font-medium text-slate-500">
              Loading foundation records...
            </div>
          ) : error ? (
            <div className="flex h-48 items-center justify-center text-sm font-medium text-red-500">
              Error: {error}
            </div>
          ) : filteredAmbassadors.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-sm text-slate-400 space-y-2">
              <Users className="h-8 w-8 text-slate-300" />
              <p>No matching ambassadors discovered.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Ambassador Profile</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Status Tag</th>
                    <th className="px-6 py-4 text-right">AVU Balance</th>
                    <th className="px-6 py-4 text-center">Verification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAmbassadors.map((ambassador) => (
                    <tr key={ambassador.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-semibold text-slate-900">{ambassador.professional_name || "N/A"}</div>
                        <div className="text-xs text-slate-400">ID: {ambassador.id}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 space-y-0.5">
                        <div className="text-slate-600">{ambassador.email}</div>
                        <div className="text-xs text-slate-400">{ambassador.phone_number || "No Phone"}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                            ambassador.badge_status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : ambassador.badge_status === "disapproved"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            ambassador.badge_status === "approved" ? "bg-emerald-500" : ambassador.badge_status === "disapproved" ? "bg-rose-500" : "bg-amber-500"
                          }`} />
                          {ambassador.badge_status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-mono font-bold text-slate-700">
                        {ambassador.avu_balance?.toLocaleString() || 0}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(ambassador.id, "approved")}
                            disabled={ambassador.badge_status === "approved"}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-600 shadow-sm transition-all hover:bg-emerald-50 disabled:opacity-40 disabled:hover:bg-white"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(ambassador.id, "disapproved")}
                            disabled={ambassador.badge_status === "disapproved"}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-white"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}