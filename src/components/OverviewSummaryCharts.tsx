import React, { useMemo } from "react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { Users, CheckCircle, Clock, XCircle, Coins, Award } from "lucide-react";
import { DbAmbassador, DbAvuWithdrawal } from "../lib/supabase";

interface OverviewSummaryChartsProps {
  ambassadors: DbAmbassador[];
  withdrawals?: DbAvuWithdrawal[];
}

export const OverviewSummaryCharts: React.FC<OverviewSummaryChartsProps> = ({
  ambassadors = [],
  withdrawals = []
}) => {
  const stats = useMemo(() => {
    const list = Array.isArray(ambassadors) ? ambassadors : [];
    const total = list.length;
    let approved = 0;
    let pending = 0;
    let disapproved = 0;
    let totalAvuBalance = 0;

    for (const amb of list) {
      const st = (amb?.status || "").toLowerCase().trim();
      const isApp = amb?.is_approved || st === "approved";
      if (isApp) {
        approved++;
      } else if (st === "disapproved" || st === "rejected") {
        disapproved++;
      } else {
        pending++;
      }

      const bal = Number(amb?.avu_balance ?? amb?.ledger_balance ?? 0);
      if (!isNaN(bal) && bal > 0) {
        totalAvuBalance += bal;
      }
    }

    // Calculate disbursed / liquidated AVU from approved withdrawals
    const wList = Array.isArray(withdrawals) ? withdrawals : [];
    let disbursedAvu = 0;
    let pendingAvu = 0;
    for (const w of wList) {
      const wSt = (w.status || "").toLowerCase().trim();
      const amt = Number(w.requested_avu ?? w.avu_amount ?? w.amount ?? 0);
      if (wSt === "approved") {
        disbursedAvu += amt;
      } else if (wSt === "pending") {
        pendingAvu += amt;
      }
    }

    return {
      total,
      approved,
      pending,
      disapproved,
      totalAvuBalance,
      disbursedAvu,
      pendingAvu
    };
  }, [ambassadors, withdrawals]);

  // Account status breakdown data for Donut Chart
  const statusPieData = useMemo(() => [
    { name: "Approved / Certified", value: stats.approved, color: "#10b981" },
    { name: "Pending Verification", value: stats.pending, color: "#f59e0b" },
    { name: "Disapproved", value: stats.disapproved, color: "#ef4444" }
  ], [stats]);

  // AVU distribution bar data
  const avuBarData = useMemo(() => [
    { category: "Disbursed / Liquidated", amount: Math.round(stats.disbursedAvu), fill: "#10b981" },
    { category: "Active In Wallets", amount: Math.round(stats.totalAvuBalance), fill: "#3b82f6" },
    { category: "Pending Claims", amount: Math.round(stats.pendingAvu), fill: "#f59e0b" }
  ], [stats]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = stats.total > 0 ? Math.round((data.value / stats.total) * 100) : 0;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs text-left">
          <p className="font-extrabold flex items-center gap-1.5 mb-1" style={{ color: data.payload.color }}>
            {data.name}
          </p>
          <p className="text-white font-mono font-bold text-sm">
            {data.value} Accounts ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs text-left">
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
            {data.category}
          </p>
          <p className="text-emerald-400 font-mono font-black text-sm">
            {data.amount.toLocaleString()} AVU
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 text-left">
      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Registered</span>
            <Users size={14} className="text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{stats.total}</p>
          <p className="text-[10px] text-slate-400 font-medium">All registered fellows</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Approved</span>
            <CheckCircle size={14} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-950 font-mono">{stats.approved}</p>
          <p className="text-[10px] text-emerald-700 font-medium">
            {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% verification rate
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Pending</span>
            <Clock size={14} className="text-amber-600 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-950 font-mono">{stats.pending}</p>
          <p className="text-[10px] text-amber-700 font-medium">Awaiting audit</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 text-white border border-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Total Disbursed</span>
            <Coins size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{stats.disbursedAvu.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-medium">Liquidated AVU tokens</p>
        </div>
      </div>

      {/* Visual Analytics Grid: 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Donut Chart - Approved vs Pending Accounts */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-left flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Award size={14} className="text-emerald-600" />
                <span>Account Verification Status</span>
              </h4>
              <p className="text-[11px] text-slate-400">Approved certified fellows versus pending credentials</p>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-mono font-bold text-slate-700">
              {stats.total} Total
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {stats.total === 0 ? (
              <div className="text-center text-slate-400 text-xs">No ambassador account data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-[11px] font-semibold text-slate-700">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block">Approved</span>
              <span className="font-mono font-black text-emerald-900 text-sm">{stats.approved}</span>
            </div>
            <div className="p-2 bg-amber-50/50 rounded-xl border border-amber-100">
              <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider block">Pending</span>
              <span className="font-mono font-black text-amber-900 text-sm">{stats.pending}</span>
            </div>
            <div className="p-2 bg-rose-50/50 rounded-xl border border-rose-100">
              <span className="text-[9px] font-black text-rose-700 uppercase tracking-wider block">Disapproved</span>
              <span className="font-mono font-black text-rose-900 text-sm">{stats.disapproved}</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Bar Chart - AVU Disbursed vs Wallet Reserves */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-left flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Coins size={14} className="text-amber-500" />
                <span>AVU Token Circulation & Disbursals</span>
              </h4>
              <p className="text-[11px] text-slate-400">Total liquidated, active balances, and pending liquidation claims</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[10px] font-mono font-bold">
              ₦1,000 / AVU
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={avuBarData}
                margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {avuBarData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Disbursed</span>
              <span className="font-mono font-black text-slate-900 text-xs">
                {stats.disbursedAvu.toLocaleString()} AVU
              </span>
            </div>
            <div className="p-2 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-[9px] font-black text-blue-700 uppercase tracking-wider block">In Wallets</span>
              <span className="font-mono font-black text-blue-900 text-xs">
                {stats.totalAvuBalance.toLocaleString()} AVU
              </span>
            </div>
            <div className="p-2 bg-amber-50/50 rounded-xl border border-amber-100">
              <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider block">Pending</span>
              <span className="font-mono font-black text-amber-900 text-xs">
                {stats.pendingAvu.toLocaleString()} AVU
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
