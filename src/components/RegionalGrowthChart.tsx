import React from "react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell
} from "recharts";
import { DbAmbassador } from "../lib/supabase";
import { MapPin, Users, TrendingUp } from "lucide-react";

interface RegionalGrowthChartProps {
  ambassadors: DbAmbassador[];
}

interface CityData {
  city: string;
  count: number;
}

export const RegionalGrowthChart: React.FC<RegionalGrowthChartProps> = ({ ambassadors }) => {
  // Aggregate ambassadors by base_city/city
  const regionalData = ambassadors.reduce((acc, amb) => {
    const rawCity = amb.base_city || amb.city || "Unknown Location";
    // Standardize naming
    const city = rawCity.trim().split(",")[0].trim();
    if (city) {
      acc[city] = (acc[city] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Format and sort the data for Recharts
  const chartData: CityData[] = Object.entries(regionalData)
    .map(([city, count]): CityData => ({ city, count: Number(count) }))
    .sort((a: CityData, b: CityData) => b.count - a.count);

  const colors = [
    "#10B981", // Emerald
    "#3B82F6", // Blue
    "#84CC16", // Lime
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#06B6D4", // Cyan
    "#EF4444", // Red
    "#EC4899", // Pink
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs text-left">
          <p className="font-extrabold flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-emerald-400">
            <MapPin size={12} /> {payload[0].payload.city}
          </p>
          <p className="font-sans font-medium text-slate-300">
            Registered: <span className="text-white font-black">{payload[0].value}</span> {payload[0].value === 1 ? "Ambassador" : "Ambassadors"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="regional-growth-chart-card" className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-50">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
            <TrendingUp size={16} className="text-emerald-500" />
            Regional Growth Footprint
          </h3>
          <p className="text-xs text-slate-400">Distribution of registered grassroots fellows mapped by regional base city.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-100 self-start sm:self-auto">
          <Users size={12} />
          <span>{chartData.length} Active Hubs</span>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-xs">
          <MapPin size={24} className="mb-2 text-slate-300" />
          No regional data available.
        </div>
      ) : (
        <div className="h-[300px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="city" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc", radius: 8 }} />
              <Bar 
                dataKey="count" 
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
