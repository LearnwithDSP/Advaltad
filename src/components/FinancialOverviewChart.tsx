import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { DbAmbassador, DbAmbassadorWallet } from "../lib/supabase";
import { Icon } from "./Icon";

interface FinancialOverviewChartProps {
  ambassadors: DbAmbassador[];
  wallets: DbAmbassadorWallet[];
}

interface ChartDataItem {
  name: string;
  email: string;
  balance: number;
}

export const FinancialOverviewChart: React.FC<FinancialOverviewChartProps> = ({
  ambassadors,
  wallets,
}) => {
  const barChartRef = useRef<SVGSVGElement | null>(null);
  const donutChartRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: string;
  }>({ show: false, x: 0, y: 0, content: "" });

  // Prepare chart data
  const chartData: ChartDataItem[] = ambassadors.map((amb) => {
    const wallet = wallets.find(
      (w) =>
        w.ambassador_id === amb.id ||
        (w.email || "").toLowerCase() === (amb.email || "").toLowerCase()
    );
    return {
      name: amb.name,
      email: amb.email,
      balance: wallet ? wallet.balance : amb.avu_balance,
    };
  }).sort((a, b) => b.balance - a.balance);

  // Financial statistics
  const totalBalance = d3.sum(chartData, (d) => d.balance);
  const maxBalance = chartData.length > 0 ? d3.max(chartData, (d) => d.balance) || 0 : 0;
  const avgBalance = chartData.length > 0 ? totalBalance / chartData.length : 0;

  useEffect(() => {
    if (chartData.length === 0) return;

    // ==========================================
    // 1. HORIZONTAL BAR CHART (Balances)
    // ==========================================
    const svgBar = d3.select(barChartRef.current);
    svgBar.selectAll("*").remove();

    const marginBar = { top: 30, right: 40, bottom: 20, left: 110 };
    const widthBar = 460;
    const heightBar = Math.max(200, chartData.length * 40 + marginBar.top + marginBar.bottom);

    svgBar.attr("viewBox", `0 0 ${widthBar} ${heightBar}`);

    const gBar = svgBar
      .append("g")
      .attr("transform", `translate(${marginBar.left},${marginBar.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, (d) => d.balance) || 100])
      .range([0, widthBar - marginBar.left - marginBar.right]);

    const yScale = d3
      .scaleBand()
      .domain(chartData.map((d) => d.name))
      .range([0, heightBar - marginBar.top - marginBar.bottom])
      .padding(0.25);

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(5).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).tickSize(0);

    gBar
      .append("g")
      .attr("transform", `translate(0,${heightBar - marginBar.top - marginBar.bottom})`)
      .call(xAxis)
      .attr("class", "text-[9px] font-mono text-slate-400")
      .call((g) => g.select(".domain").attr("stroke", "#e2e8f0"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#f1f5f9"));

    gBar
      .append("g")
      .call(yAxis)
      .attr("class", "text-[10px] font-semibold text-slate-700")
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .attr("dx", "-10px")
      .call((t) => {
        t.each(function () {
          const self = d3.select(this);
          const text = self.text();
          if (text.length > 13) {
            self.text(text.substring(0, 11) + "...");
          }
        });
      });

    // Draw grid lines
    gBar
      .append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(xScale.ticks(5))
      .enter()
      .append("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", heightBar - marginBar.top - marginBar.bottom)
      .attr("stroke", "#f8fafc")
      .attr("stroke-width", 1);

    // Draw bars
    const bars = gBar
      .selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", (d) => yScale(d.name) || 0)
      .attr("x", 0)
      .attr("height", yScale.bandwidth())
      .attr("fill", "url(#bar-gradient)")
      .attr("rx", 4)
      .attr("cursor", "pointer")
      // Animated entrance
      .attr("width", 0);

    bars
      .transition()
      .duration(800)
      .delay((_, i) => i * 100)
      .attr("width", (d) => xScale(d.balance));

    // Define bar gradient
    const defsBar = svgBar.append("defs");
    const barGradient = defsBar
      .append("linearGradient")
      .attr("id", "bar-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    barGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#059669"); // emerald-600

    barGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#34d399"); // emerald-400

    // Add value labels next to bars
    gBar
      .selectAll(".label")
      .data(chartData)
      .enter()
      .append("text")
      .attr("class", "label text-[9px] font-mono font-bold fill-slate-700")
      .attr("y", (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 3)
      .attr("x", 0)
      .text((d) => `${d.balance} AVU`)
      .transition()
      .duration(800)
      .delay((_, i) => i * 100)
      .attr("x", (d) => xScale(d.balance) + 5);

    // Tooltip event bindings
    bars
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill", "#047857"); // Darker emerald hover
        
        setTooltip({
          show: true,
          x: event.clientX,
          y: event.clientY - 40,
          content: `<strong>${d.name}</strong><br/>${d.email}<br/>Balance: <strong>${d.balance} AVU</strong>`,
        });
      })
      .on("mousemove", function (event) {
        setTooltip((prev) => ({
          ...prev,
          x: event.clientX,
          y: event.clientY - 40,
        }));
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill", "url(#bar-gradient)");
        setTooltip((prev) => ({ ...prev, show: false }));
      });


    // ==========================================
    // 2. DONUT DISTRIBUTION CHART
    // ==========================================
    const svgDonut = d3.select(donutChartRef.current);
    svgDonut.selectAll("*").remove();

    const widthDonut = 280;
    const heightDonut = 280;
    const radius = Math.min(widthDonut, heightDonut) / 2;

    svgDonut.attr("viewBox", `0 0 ${widthDonut} ${heightDonut}`);

    const gDonut = svgDonut
      .append("g")
      .attr("transform", `translate(${widthDonut / 2},${heightDonut / 2})`);

    // Colors
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(chartData.map((d) => d.name))
      .range(["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#1e293b", "#475569"]);

    const pie = d3
      .pie<ChartDataItem>()
      .value((d) => d.balance)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<ChartDataItem>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius * 0.9);

    const arcHover = d3
      .arc<d3.PieArcDatum<ChartDataItem>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius * 0.96);

    // Draw donut arcs
    const arcs = gDonut
      .selectAll(".arc")
      .data(pie(chartData))
      .enter()
      .append("g")
      .attr("class", "arc");

    const paths = arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => colorScale(d.data.name))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2.5)
      .attr("cursor", "pointer")
      // Transition entrance
      .each(function (d) {
        (this as any)._current = d;
      });

    paths
      .transition()
      .duration(1000)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(interpolate(t)) || "";
        };
      });

    // Donut Center Text showing Total Sum
    gDonut
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-5px")
      .attr("class", "text-[10px] font-extrabold fill-slate-400 uppercase tracking-widest")
      .text("Total Pool");

    gDonut
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "18px")
      .attr("class", "text-lg font-black fill-slate-800 font-mono")
      .text(`${totalBalance} AVU`);

    // Hover actions for Donut
    paths
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", arcHover);

        const share = ((d.data.balance / totalBalance) * 100).toFixed(1);
        
        setTooltip({
          show: true,
          x: event.clientX,
          y: event.clientY - 40,
          content: `<strong>${d.data.name}</strong><br/>Share: <strong>${share}%</strong> (${d.data.balance} AVU)`,
        });
      })
      .on("mousemove", function (event) {
        setTooltip((prev) => ({
          ...prev,
          x: event.clientX,
          y: event.clientY - 40,
        }));
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", arc);
        setTooltip((prev) => ({ ...prev, show: false }));
      });

  }, [ambassadors, wallets]);

  if (chartData.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs" id="no-financial-data-state">
        <Icon name="Coins" size={32} className="mx-auto mb-3 text-slate-300" />
        Insufficient transaction and allocation ledger history to compile charts.
      </div>
    );
  }

  return (
    <div id="financial-overview-chart-panel" className="space-y-6">
      {/* 3 Bento-Grid Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-5">
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl text-white shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Icon name="Coins" size={18} />
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Total Circulating Pool</span>
            <p className="text-xl font-black font-mono mt-0.5">{totalBalance} AVU</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
            <Icon name="TrendingUp" size={18} />
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Peak Account Reserve</span>
            <p className="text-xl font-black font-mono mt-0.5 text-slate-800">{maxBalance} AVU</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <Icon name="Compass" size={18} />
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Average Wallet Hold</span>
            <p className="text-xl font-black font-mono mt-0.5 text-slate-800">
              {avgBalance.toFixed(0)} <span className="text-xs font-bold text-slate-500">AVU</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Dual Charts Container */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left chart: Horizontal Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
            <div>
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Icon name="BarChart3" size={12} className="text-slate-400" />
                Reserve Quantities by Ambassador
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Absolute token balance listed chronologically.</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-extrabold font-mono uppercase tracking-wider">
              D3 Active Layer
            </span>
          </div>

          <div className="relative overflow-x-auto">
            <svg ref={barChartRef} className="w-full max-h-[400px]"></svg>
          </div>
        </div>

        {/* Right chart: Donut Chart Distribution */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4 pb-3 border-b border-slate-50">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Icon name="PieChart" size={12} className="text-slate-400" />
              Sovereign Pool Distribution
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Wallet shares depicted as overall pool ratios.</p>
          </div>

          <div className="flex justify-center items-center py-4 relative">
            <svg ref={donutChartRef} className="max-w-[240px] max-h-[240px]"></svg>
          </div>

          {/* Mini Legend List */}
          <div className="border-t border-slate-50 pt-4 mt-2 space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {chartData.map((d, idx) => {
              const color = d3.schemeCategory10[idx % 10]; // simple fallback
              const percent = totalBalance > 0 ? ((d.balance / totalBalance) * 100).toFixed(1) : "0";
              const colors = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#1e293b", "#475569"];
              const finalColor = colors[idx % colors.length];

              return (
                <div key={d.name} className="flex items-center justify-between text-[10px] font-medium text-slate-600">
                  <div className="flex items-center gap-2 truncate max-w-[160px]">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: finalColor }} />
                    <span className="truncate font-semibold">{d.name}</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-400 font-bold">
                    {percent}% ({d.balance} AVU)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Dynamic Tooltip Portal */}
      {tooltip.show && (
        <div
          id="d3-charts-tooltip-portal"
          className="fixed pointer-events-none z-50 p-2.5 bg-slate-900 border border-slate-800 text-white text-[10px] rounded-xl shadow-lg leading-relaxed max-w-xs"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y}px`,
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};
