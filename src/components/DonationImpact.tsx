import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from "recharts";
import { Icon } from "./Icon";
import { db } from "../lib/supabase";

// NGO Programs consistent with DonationPanel
const IMPACT_PROGRAMS = [
  {
    id: "youth-empowerment",
    label: "Enriching African Youth Initiative",
    category: "YOUTH EMPOWERMENT",
    allocation: 28, // 28% of total funds
    color: "#10B981", // Emerald Primary
    icon: "GraduationCap",
    metrics: {
      reached: "12,450+ Youth Trained",
      spent: "₦142,500,000",
      activeSites: "14 Tech Labs & Hubs",
      deliverable: "sponsors code bootcamps, high-speed internet, and software developer licensing."
    },
    items: [
      { cost: 15, text: "1 student software engineering license for 3 months" },
      { cost: 120, text: "1 fully equipped dual-core laptop for hands-on tech training" },
      { cost: 300, text: "Full vocational coding scholarship & career placement support" }
    ]
  },
  {
    id: "schools-stem",
    label: "Schools (STEM & Robotic Education)",
    category: "EDUCATION & TECHNOLOGY",
    allocation: 22,
    color: "#3B82F6", // Blue
    icon: "Laptop",
    metrics: {
      reached: "8,200+ Students Educated",
      spent: "₦110,000,000",
      activeSites: "36 Robotic Clubs Set up",
      deliverable: "funds Arduino microcontrollers, hardware parts, and training teachers."
    },
    items: [
      { cost: 25, text: "1 complete STEM robotic starter kit for junior students" },
      { cost: 75, text: "Comprehensive teacher-training manual and certified trainer hours" },
      { cost: 200, text: "Equips a public secondary school classroom with robotic kits & tools" }
    ]
  },
  {
    id: "green-agri",
    label: "Green / Agriculture Program",
    category: "AGRICULTURE & ENVIRONMENT",
    allocation: 15,
    color: "#84CC16", // Lime Green
    icon: "Sprout",
    metrics: {
      reached: "320+ Smallholder Farmers Supported",
      spent: "₦74,000,000",
      activeSites: "8 Irrigation Projects",
      deliverable: "supplies climate-resilient organic seeds and clean solar drip pumps."
    },
    items: [
      { cost: 35, text: "Sacks of climate-resilient grain seeds and organic fertilizers" },
      { cost: 100, text: "1 portable solar-powered water irrigation pump kit" },
      { cost: 250, text: "Sets up a cooperative clean green greenhouse nursery system" }
    ]
  },
  {
    id: "housing",
    label: "Humanitarian Housing Scheme",
    category: "HUMANITARIAN HOUSING",
    allocation: 12,
    color: "#F59E0B", // Amber
    icon: "Home",
    metrics: {
      reached: "45 Sustainable Shelters Built",
      spent: "₦65,000,000",
      activeSites: "3 Displaced Communities Rehomed",
      deliverable: "builds highly durable eco-adobe interlocking blocks for local shelters."
    },
    items: [
      { cost: 50, text: "100 compressed soil-stabilized structural interlocking eco-bricks" },
      { cost: 150, text: "Premium corrugated heavy-duty weathering roofing sheet kits" },
      { cost: 500, text: "Builds a complete, hygienic two-room family starter home" }
    ]
  },
  {
    id: "relief",
    label: "Emergency Relief & Support",
    category: "EMERGENCY RELIEF",
    allocation: 10,
    color: "#EF4444", // Red
    icon: "Heart",
    metrics: {
      reached: "24,000+ Hot Meals Delivered",
      spent: "₦48,000,000",
      activeSites: "6 Refugee Camps Supplied",
      deliverable: "distributes immediate dry rations, water storage, and hygiene packs."
    },
    items: [
      { cost: 10, text: "2 weeks of wholesome dry food rations for a family" },
      { cost: 40, text: "1 heavy-duty medical first aid kit & diagnostic device" },
      { cost: 150, text: "1,000 liters clean drinking water tanker delivery & water filters" }
    ]
  },
  {
    id: "aged-care",
    label: "Care for the Aged & Seniors",
    category: "SENIOR WELFARE",
    allocation: 8,
    color: "#8B5CF6", // Purple
    icon: "UserCheck",
    metrics: {
      reached: "1,150+ Seniors Managed",
      spent: "₦41,000,000",
      activeSites: "4 Welfare Outposts",
      deliverable: "funds medicine delivery, free health screenings, and wellness caretakers."
    },
    items: [
      { cost: 20, text: "Monthly supply of prescription diabetic & blood pressure medicines" },
      { cost: 60, text: "Welfare nurse diagnostics and health checkups at senior centers" },
      { cost: 180, text: "Community senior gathering center nutritional support for 1 month" }
    ]
  },
  {
    id: "teen-club",
    label: "Teen Club & Community Labs",
    category: "COMMUNITY & TEENS",
    allocation: 5,
    color: "#06B6D4", // Cyan
    icon: "Users",
    metrics: {
      reached: "3,800+ Teens Mentored",
      spent: "₦26,000,000",
      activeSites: "12 Community Safe Spaces",
      deliverable: "drives youth character development, mental health counseling, and sports."
    },
    items: [
      { cost: 15, text: "Teen mental wellness counselor guidance hours & handbook kits" },
      { cost: 50, text: "Sports equipment, soccer balls, and field training gear" },
      { cost: 120, text: "Host a community youth mentorship sports championship" }
    ]
  }
];

export const DonationImpact: React.FC = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState(IMPACT_PROGRAMS[0].id);
  const [activeTab, setActiveTab] = useState<"allocation" | "simulator">("allocation");
  const [simulatorAmount, setSimulatorAmount] = useState<number>(100); // Standard USD-equivalent simulator amount

  useEffect(() => {
    let active = true;
    const fetchDonations = async () => {
      try {
        const list = await db.getDonations();
        if (active) {
          setDonations(list);
        }
      } catch (err) {
        console.error("Error fetching donations in impact page:", err);
      }
    };
    fetchDonations();
    const interval = setInterval(fetchDonations, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const CURRENCY_RATES: Record<string, number> = {
    NGN: 1500,
    USD: 1,
    GHS: 15,
    KES: 130
  };

  const dynamicPrograms = IMPACT_PROGRAMS.map((prog) => {
    // 1. Get direct successful donations for this program
    const directDonations = donations.filter(
      (d) => d.program_id === prog.id && d.status === "success"
    );
    
    // 2. Get indirect successful donations (e.g. sponsorship, general, or empty program_id)
    const validProgramIds = IMPACT_PROGRAMS.map((p) => p.id);
    const indirectDonations = donations.filter(
      (d) => !validProgramIds.includes(d.program_id) && d.status === "success"
    );

    // Calculate sum of direct NGN equivalents
    const directNGN = directDonations.reduce((sum, d) => {
      const rate = CURRENCY_RATES[d.currency] || 1;
      return sum + (d.amount / rate) * 1500;
    }, 0);

    // Calculate sum of indirect NGN equivalents distributed by allocation percentage
    const indirectNGN = indirectDonations.reduce((sum, d) => {
      const rate = CURRENCY_RATES[d.currency] || 1;
      const amountInNGN = (d.amount / rate) * 1500;
      return sum + (amountInNGN * prog.allocation) / 100;
    }, 0);

    const totalNGN = directNGN + indirectNGN;
    const totalUSD = totalNGN / 1500;

    // Calculate dynamic metric strings based on totalUSD and totalNGN
    let reached = "0 Reached";
    let activeSites = "0 Active Sites";

    if (prog.id === "youth-empowerment") {
      const count = Math.floor(totalUSD / 15);
      reached = `${count.toLocaleString()}+ Youth Trained`;
      const sites = Math.floor(totalUSD / 150);
      activeSites = `${sites.toLocaleString()} Tech Labs Active`;
    } else if (prog.id === "schools-stem") {
      const count = Math.floor(totalUSD / 10);
      reached = `${count.toLocaleString()}+ Students Educated`;
      const sites = Math.floor(totalUSD / 100);
      activeSites = `${sites.toLocaleString()} Robotic Clubs Set up`;
    } else if (prog.id === "green-agri") {
      const count = Math.floor(totalUSD / 25);
      reached = `${count.toLocaleString()}+ Smallholder Farmers Supported`;
      const sites = Math.floor(totalUSD / 250);
      activeSites = `${sites.toLocaleString()} Irrigation Projects`;
    } else if (prog.id === "housing") {
      const count = Math.floor(totalUSD / 150);
      reached = `${count.toLocaleString()}+ Sustainable Shelters Built`;
      const sites = Math.floor(totalUSD / 500);
      activeSites = `${sites.toLocaleString()} Communities Rehomed`;
    } else if (prog.id === "relief") {
      const count = Math.floor(totalUSD / 2);
      reached = `${count.toLocaleString()}+ Hot Meals Delivered`;
      const sites = Math.floor(totalUSD / 200);
      activeSites = `${sites.toLocaleString()} Refugee Camps Supplied`;
    } else if (prog.id === "aged-care") {
      const count = Math.floor(totalUSD / 20);
      reached = `${count.toLocaleString()}+ Seniors Managed`;
      const sites = Math.floor(totalUSD / 100);
      activeSites = `${sites.toLocaleString()} Welfare Outposts`;
    } else if (prog.id === "teen-club") {
      const count = Math.floor(totalUSD / 8);
      reached = `${count.toLocaleString()}+ Teens Mentored`;
      const sites = Math.floor(totalUSD / 150);
      activeSites = `${sites.toLocaleString()} Community Safe Spaces`;
    }

    const spent = `₦${Math.round(totalNGN).toLocaleString()}`;

    return {
      ...prog,
      metrics: {
        reached,
        spent,
        activeSites,
        deliverable: prog.metrics.deliverable
      }
    };
  });

  const selectedProgram = dynamicPrograms.find((p) => p.id === selectedProgramId) || dynamicPrograms[0];

  const handleProgramSelect = (prog: any) => {
    setSelectedProgramId(prog.id);
  };

  // Safe representation for Recharts Pie Chart tooltip styling
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 text-white px-3 py-2.5 rounded-xl text-xs font-sans space-y-1 shadow-xl">
          <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">{data.category}</p>
          <p className="font-black text-white">{data.name}</p>
          <p className="font-semibold text-emerald-400">
            Allocation: <span className="font-mono">{data.value}%</span> of total budget
          </p>
        </div>
      );
    }
    return null;
  };

  const chartData = dynamicPrograms.map((p) => ({
    name: p.label,
    value: p.allocation,
    color: p.color,
    category: p.category,
    ...p
  }));

  return (
    <section id="impact" className="py-24 bg-white relative overflow-hidden border-t border-slate-100">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="max-w-2xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              REAL-TIME IMPACT MAP
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-brand-charcoal tracking-tight">
            How Contributions Reach Specific Programs
          </h2>
          <p className="text-slate-500 font-sans text-base max-w-[550px] mx-auto">
            Explore our audited regional allocation structure and visualize how your contributions convert directly into tangible deliverables on the ground.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-12 max-w-sm mx-auto border border-slate-100">
          <button
            onClick={() => setActiveTab("allocation")}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "allocation" 
                ? "bg-brand-primary text-white shadow-sm" 
                : "text-slate-400 hover:text-brand-charcoal"
            }`}
          >
            <Icon name="PieChart" size={14} />
            Regional Allocation
          </button>
          <button
            onClick={() => setActiveTab("simulator")}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "simulator" 
                ? "bg-brand-primary text-white shadow-sm" 
                : "text-slate-400 hover:text-brand-charcoal"
            }`}
          >
            <Icon name="Activity" size={14} />
            Impact Simulator
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "allocation" ? (
            <motion.div
              key="allocation"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
            >
              {/* Visual Chart Column */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full h-[320px] sm:h-[360px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={135}
                        paddingAngle={4}
                        dataKey="value"
                        className="focus:outline-none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            style={{ 
                              filter: selectedProgram.id === entry.id ? "drop-shadow(0 8px 16px rgba(16,185,129,0.15))" : "none",
                              opacity: selectedProgram.id === entry.id ? 1 : 0.75,
                              cursor: "pointer"
                            }}
                            onClick={() => handleProgramSelect(entry)}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={customTooltip} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Total Indicator */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">AUDITED</p>
                    <p className="text-3xl font-display font-black text-brand-charcoal">100%</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">DIRECT GIVING</p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-sans italic text-center max-w-[320px] mt-2 leading-normal">
                  💡 Hint: Hover or click sectors on the pie chart to drill down into real audits and deliverables below.
                </p>
              </div>

              {/* Program Details drill down Column */}
              <div className="lg:col-span-7 text-left space-y-6">
                
                {/* Program Selector Pills */}
                <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                  {dynamicPrograms.map((prog) => {
                    const isActive = selectedProgram.id === prog.id;
                    return (
                      <button
                        key={prog.id}
                        onClick={() => handleProgramSelect(prog)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                          isActive
                            ? "bg-brand-secondary/35 border-brand-primary text-brand-primary shadow-sm"
                            : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100/70"
                        }`}
                      >
                        {prog.category}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Program Showcase */}
                <motion.div
                  key={selectedProgram.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 text-brand-primary" style={{ color: selectedProgram.color }}>
                      <Icon name={selectedProgram.icon === "GraduationCap" ? "GraduationCap" : selectedProgram.icon === "Laptop" ? "Laptop" : selectedProgram.icon === "Sprout" ? "Sprout" : selectedProgram.icon === "Home" ? "Home" : selectedProgram.icon === "Heart" ? "Heart" : selectedProgram.icon === "UserCheck" ? "UserCheck" : "Users"} size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold tracking-wider uppercase" style={{ color: selectedProgram.color }}>
                        {selectedProgram.category} — {selectedProgram.allocation}% ALLOCATION
                      </p>
                      <h3 className="text-xl font-display font-black text-brand-charcoal mt-0.5">
                        {selectedProgram.label}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 font-sans leading-relaxed">
                    This department {selectedProgram.metrics.deliverable} We execute direct operations bypassing commercial middlemen. All allocations undergo comprehensive audit pipelines.
                  </p>

                  {/* Audit Performance Highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Tangible Impact</p>
                      <p className="text-base font-display font-black text-brand-charcoal mt-1 truncate">
                        {selectedProgram.metrics.reached}
                      </p>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Total Audited Deploy</p>
                      <p className="text-base font-display font-black text-emerald-600 mt-1 truncate">
                        {selectedProgram.metrics.spent}
                      </p>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Operational footprint</p>
                      <p className="text-base font-display font-black text-brand-charcoal mt-1 truncate">
                        {selectedProgram.metrics.activeSites}
                      </p>
                    </div>
                  </div>

                  {/* Tangible Products Preview */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">What your specific contribution yields here:</p>
                    <div className="space-y-2">
                      {selectedProgram.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-100 text-xs text-brand-charcoal">
                          <span className="font-display font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                            ${it.cost} USD
                          </span>
                          <span className="font-semibold text-slate-600 leading-relaxed font-sans">{it.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </motion.div>

              </div>
            </motion.div>
          ) : (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto bg-slate-50/50 p-8 sm:p-12 rounded-[32px] border border-slate-100 text-left space-y-10"
            >
              
              <div className="text-center max-w-lg mx-auto space-y-2">
                <h3 className="text-xl font-display font-black text-brand-charcoal">Pre-Gifting Resource Simulator</h3>
                <p className="text-xs text-slate-400 font-sans">
                  Slide or enter any simulated gift value in USD to evaluate how our regional divisions translate your contribution directly into physical deliverables.
                </p>
              </div>

              {/* Slider Controls */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Simulated Gift Value</label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-display font-black text-slate-400">$</span>
                      <input
                        type="number"
                        value={simulatorAmount}
                        onChange={(e) => setSimulatorAmount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="text-4xl font-display font-black text-brand-primary w-32 bg-transparent focus:outline-none border-b border-slate-200 focus:border-brand-primary focus:ring-0"
                      />
                      <span className="text-base font-extrabold text-slate-400 font-sans">USD EQUIVALENT</span>
                    </div>
                  </div>

                  {/* Quick Value Presets */}
                  <div className="flex items-center gap-2">
                    {[25, 50, 100, 250, 500].map((v) => (
                      <button
                        key={v}
                        onClick={() => setSimulatorAmount(v)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          simulatorAmount === v 
                            ? "bg-brand-primary text-white" 
                            : "bg-white hover:bg-slate-100 text-slate-500 border border-slate-100"
                        }`}
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative pt-4">
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={simulatorAmount}
                    onChange={(e) => setSimulatorAmount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2 font-bold uppercase tracking-wider">
                    <span>$10 USD (Basic rations)</span>
                    <span>$500 USD (Community Infrastructure)</span>
                    <span>$1,000 USD (Major Facility)</span>
                  </div>
                </div>
              </div>

              {/* Result Bar Visualizer representing proportional allocation */}
              <div className="space-y-4">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Proportional resource allocation breakdown:</p>
                
                <div className="h-6 w-full rounded-xl overflow-hidden flex shadow-inner">
                  {dynamicPrograms.map((prog) => {
                    const allocatedVal = (simulatorAmount * prog.allocation) / 100;
                    if (allocatedVal <= 0) return null;
                    return (
                      <div
                        key={prog.id}
                        style={{ width: `${prog.allocation}%`, backgroundColor: prog.color }}
                        className="h-full transition-all duration-300 hover:opacity-90 relative group cursor-pointer"
                        title={`${prog.label}: $${allocatedVal.toFixed(2)} USD`}
                      />
                    );
                  })}
                </div>

                {/* Simulated Outcomes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dynamicPrograms.map((prog) => {
                    const allocatedVal = (simulatorAmount * prog.allocation) / 100;
                    
                    // Simple programmatic builder of outcomes based on allocated amount
                    const getSimulatedOutcomeText = (val: number) => {
                      if (val <= 0) return "Sparsely allocated";
                      if (prog.id === "youth-empowerment") {
                        const students = Math.max(1, Math.floor(val / 15));
                        return `Funds robust vocational internet access & software licenses for ${students} student${students > 1 ? "s" : ""} next quarter.`;
                      }
                      if (prog.id === "schools-stem") {
                        const kits = Math.max(1, Math.floor(val / 25));
                        return `Supplies ${kits} interactive STEM robotic parts kits & guides for schools.`;
                      }
                      if (prog.id === "green-agri") {
                        if (val >= 100) {
                          const pumps = Math.floor(val / 100);
                          return `Equips cooperatives with ${pumps} clean solar-powered water irrigation pump kit${pumps > 1 ? "s" : ""}.`;
                        }
                        return `Provides dynamic organic seed sacks and compost fertilizers for farm families.`;
                      }
                      if (prog.id === "housing") {
                        const bricks = Math.floor(val * 2);
                        return `Supplies approximately ${bricks} high-grade soil interlocking bricks for safe community housing.`;
                      }
                      if (prog.id === "relief") {
                        const packs = Math.max(1, Math.floor(val / 10));
                        return `Supplies ${packs} complete two-week organic dry food rations to crisis-affected camps.`;
                      }
                      if (prog.id === "aged-care") {
                        const seniors = Math.max(1, Math.floor(val / 20));
                        return `Covers prescription diabetic/blood pressure medicines & nursing logs for ${seniors} senior citizens.`;
                      }
                      // teen-club
                      const counselorHours = Math.max(1, Math.floor(val / 15));
                      return `Supports ${counselorHours} hours of dedicated teen mental-health mentorship & counseling sessions.`;
                    };

                    return (
                      <div key={prog.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-start gap-4 hover:shadow-md hover:shadow-slate-150/10 transition-all">
                        <div className="p-2.5 rounded-xl text-white flex-shrink-0" style={{ backgroundColor: prog.color }}>
                          <Icon name={prog.icon === "GraduationCap" ? "GraduationCap" : prog.icon === "Laptop" ? "Laptop" : prog.icon === "Sprout" ? "Sprout" : prog.icon === "Home" ? "Home" : prog.icon === "Heart" ? "Heart" : prog.icon === "UserCheck" ? "UserCheck" : "Users"} size={16} />
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-brand-charcoal">{prog.category}</span>
                            <span className="font-mono font-black text-brand-primary" style={{ color: prog.color }}>
                              ${allocatedVal.toFixed(2)} USD
                            </span>
                          </div>
                          <p className="text-slate-500 font-sans leading-relaxed text-[11px] font-semibold">
                            {getSimulatedOutcomeText(allocatedVal)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 text-center">
                  <a
                    href="#donate"
                    className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-xl bg-brand-primary hover:bg-[#0A4233] text-white font-display font-black text-xs uppercase tracking-widest shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Icon name="Heart" size={14} />
                    Make a Gift of ${simulatorAmount.toLocaleString()} Now
                  </a>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
};
