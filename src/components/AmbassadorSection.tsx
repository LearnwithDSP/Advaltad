import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { db, supabase, isSupabaseConfigured } from "../lib/supabase";
import logoUrl from "../assets/images/Advaltad Logo.jpeg";

export const AmbassadorSection: React.FC = () => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [field, setField] = useState("Enriching African youths initiative");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Ambassador Login states
  const [isLogin, setIsLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setLoginError("");
    setIsLoggingIn(true);
    try {
      const user = await db.findAmbassadorByEmail(loginEmail);
      if (!user) {
        setLoginError("This email is not registered in our Ambassador database. Please register first!");
        setIsLoggingIn(false);
        return;
      }
      
      if (user.password && user.password !== loginPassword) {
        setLoginError("Incorrect password. Please verify your credentials and try again.");
        setIsLoggingIn(false);
        return;
      }

      // If Supabase is configured, sign in via Supabase Auth as well
      if (isSupabaseConfigured && supabase) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword
        });
        if (authError) {
          setLoginError("Authentication failed: " + authError.message);
          setIsLoggingIn(false);
          return;
        }
      }

      // Store active session email in localStorage
      localStorage.setItem("advaltad_session_email", loginEmail);
      
      // Redirect to dashboard (this will trigger state check in App.tsx and show dashboard)
      window.location.hash = "#/ambassador/dashboard";
    } catch (err: any) {
      setLoginError(err?.message || "An error occurred during authentication. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadApprovedDemo = async () => {
    try {
      const email = "ramon@example.com";
      const password = "password123";

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signUp({ email, password });
        } catch (_) {}
        await supabase.auth.signInWithPassword({ email, password });
      }

      const existing = await db.findAmbassadorByEmail(email);
      if (!existing) {
        await db.createAmbassador({
          name: "Ramon Bisola",
          city: "Lagos, Nigeria",
          field: "Enriching African youths initiative",
          email: email,
          phone: "+234 801 234 5678",
          password: password
        });
        const ramon = await db.findAmbassadorByEmail(email);
        if (ramon) {
          await db.updateStatus(ramon.id, "approved");
        }
      } else {
        await db.updateStatus(existing.id, "approved");
      }
      localStorage.setItem("advaltad_session_email", email);
      window.location.hash = "#/ambassador/dashboard";
    } catch (e) {
      localStorage.setItem("advaltad_session_email", "ramon@example.com");
      window.location.hash = "#/ambassador/dashboard";
    }
  };

  const loadPendingDemo = async () => {
    const pendingEmail = "pending_demo@advaltad.org";
    const password = "password123";
    try {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signUp({ email: pendingEmail, password });
        } catch (_) {}
        await supabase.auth.signInWithPassword({ email: pendingEmail, password });
      }

      const existing = await db.findAmbassadorByEmail(pendingEmail);
      if (!existing) {
        await db.createAmbassador({
          name: "Chidi Okafor",
          city: "Enugu, Nigeria",
          field: "Schools (Stem and Robotic education)",
          email: pendingEmail,
          phone: "+234 902 345 6789",
          password: password
        });
      } else {
        await db.updateStatus(existing.id, "pending");
      }
      localStorage.setItem("advaltad_session_email", pendingEmail);
      window.location.hash = "#/ambassador/dashboard";
    } catch (e) {
      localStorage.setItem("advaltad_session_email", pendingEmail);
      window.location.hash = "#/ambassador/dashboard";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // STEP 1: Validate all required fields
    if (!name || !city || !field || !email || !phone || !password) {
      setErrorMessage("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      let newlyCreatedId = "";
      let newlyCreatedName = name;

      if (isSupabaseConfigured && supabase) {
        // STEP 2: Create the user account using Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) {
          console.error("Supabase Auth signUp failed:", authError);
          if (authError.message.includes("already registered") || authError.status === 422) {
            setErrorMessage("An ambassador with this email address is already registered.");
          } else if (authError.message.toLowerCase().includes("password")) {
            setErrorMessage("Password is too weak. Please choose a stronger password (at least 6 characters).");
          } else {
            setErrorMessage("Authentication failed: " + authError.message);
          }
          setIsSubmitting(false);
          return;
        }

        const userId = authData.user?.id;
        if (!userId) {
          setErrorMessage("Failed to retrieve authentication reference. Please try again.");
          setIsSubmitting(false);
          return;
        }

        newlyCreatedId = userId;

        // STEP 3: Insert the ambassador profile into the Supabase table
        try {
          const newlyCreated = await db.createAmbassador({
            name,
            city,
            field,
            email,
            phone,
            password,
            user_id: userId
          });
          newlyCreatedId = newlyCreated.id;
          newlyCreatedName = newlyCreated.name;
        } catch (dbError: any) {
          console.error("Supabase Database insertion failed:", dbError);
          setErrorMessage("Failed to save your ambassador profile in the database. Please try again.");
          setIsSubmitting(false);
          return;
        }
      } else {
        // Fallback local DB mode
        const existing = await db.findAmbassadorByEmail(email);
        if (existing) {
          setErrorMessage("An ambassador with this email address is already registered.");
          setIsSubmitting(false);
          return;
        }

        const newlyCreated = await db.createAmbassador({
          name,
          city,
          field,
          email,
          phone,
          password
        });
        newlyCreatedId = newlyCreated.id;
        newlyCreatedName = newlyCreated.name;
      }

      // Log registration activity
      try {
        await db.logActivity({
          ambassador_id: newlyCreatedId,
          ambassador_name: newlyCreatedName,
          type: "registration",
          desc: `Submitted registration for professional portfolio in ${city} (${field})`
        });
      } catch (logErr) {
        console.warn("Could not log registration activity:", logErr);
      }

      // Save user session email in localStorage to auto-login
      localStorage.setItem("advaltad_session_email", email);

      setIsSubmitting(false);
      setIsRegistered(true);

      // Automatically redirect to the Growth Ambassador Dashboard after 2.5s
      setTimeout(() => {
        window.location.hash = "#/ambassador/dashboard";
      }, 2500);
    } catch (error: any) {
      console.error("Signup flow error:", error);
      setErrorMessage("Registration failed. Please check your network or try again.");
      setIsSubmitting(false);
    }
  };


  const BENEFITS = [
    {
      title: "1. Dynamic credentials",
      desc: "instant cryptographic certified badges"
    },
    {
      title: "2. P2P Value Exchange",
      desc: "Swap project materials using AVU"
    },
    {
      title: "3. Audited Pipelines",
      desc: "100% trace ratios directed on-field."
    }
  ];

  return (
    <section id="ambassador" className="py-24 sm:py-32 bg-white relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Left Column: Benefits Listing */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
                  Advaltad Global Networks
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
                Advaltad Global Networks
              </h2>
              <p className="text-slate-500 font-sans text-base leading-relaxed">
                Access the exclusive digital corridor of certified ambassadors overseeing real on-field regional development schemens
              </p>
            </div>

            {/* Benefits Block List with check icons */}
            <div className="space-y-6 pt-4">
              {BENEFITS.map((b, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#DDEBE5] text-brand-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Icon name="Check" size={12} className="stroke-2" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-sm text-[#1E293B]">
                      {b.title}
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-sans max-w-[480px]">
                      {b.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Beautiful Membership registry card */}
          <div className="lg:col-span-6">
            <AnimatePresence mode="wait">
              {!isRegistered ? (
                isLogin ? (
                  <motion.div
                    key="login-panel"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-[#F7F8FA] rounded-[32px] p-8 sm:p-10 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] text-left"
                  >
                    <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-display font-black text-brand-charcoal">Ambassador Login</h3>
                        <p className="text-xs text-slate-400 mt-1">Sign in to access your custom peer dashboard.</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setIsLogin(false);
                          }}
                          className="text-xs font-bold text-brand-primary hover:underline cursor-pointer focus:outline-none flex items-center gap-1"
                        >
                          <Icon name="UserPlus" size={12} />
                          Create Badge
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-4 pt-6 font-sans">
                      {loginError && (
                        <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-800 rounded-xl flex items-start gap-2 text-left animate-shake">
                          <Icon name="AlertCircle" size={14} className="mt-0.5 flex-shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Registered Email</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. ramon@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoggingIn || !loginEmail || !loginPassword}
                        className="w-full py-4 mt-2 rounded-xl bg-brand-primary hover:bg-[#0A4233] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-display font-black tracking-widest text-white shadow-lg shadow-brand-primary/10 transition-colors uppercase cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isLoggingIn ? "Signing In..." : "Sign In to Corridor"}
                      </button>

                      {/* Fast-Tracks inside embedded login */}
                      <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Fast-Track Interactive Prototypes</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={loadApprovedDemo}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-[10px] font-bold text-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Icon name="CheckCircle" size={11} />
                            Ramon (Approved)
                          </button>
                          <button
                            type="button"
                            onClick={loadPendingDemo}
                            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-xl text-[10px] font-bold text-amber-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Icon name="Clock" size={11} />
                            Demo (Pending)
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 text-center">
                        <p className="text-xs text-slate-500">
                          Need an account?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setIsLogin(false);
                            }}
                            className="font-bold text-brand-primary hover:underline cursor-pointer focus:outline-none"
                          >
                            Register here
                          </button>
                        </p>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form-panel"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-[#F7F8FA] rounded-[32px] p-8 sm:p-10 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] text-left"
                  >
                    <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-display font-black text-brand-charcoal">Enrollment Registry</h3>
                        <p className="text-xs text-slate-400 mt-1">Create your digital badge to access ambassador portals.</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setIsLogin(true);
                          }}
                          className="text-xs font-bold text-brand-primary hover:underline cursor-pointer focus:outline-none flex items-center gap-1"
                        >
                          <Icon name="Lock" size={12} />
                          Ambassador Login
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-6 font-sans">
                      {errorMessage && (
                        <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-800 rounded-xl flex items-start gap-2 text-left">
                          <Icon name="AlertCircle" size={14} className="mt-0.5 flex-shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Your Professional Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramon Bisola"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Your Base City</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Lagos, Nigeria"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Focus Interest</label>
                          <select
                            value={field}
                            onChange={(e) => setField(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                          >
                            <option>Enriching African youths initiative</option>
                            <option>Schools (Stem and Robotic education)</option>
                            <option>Green/Agriculture</option>
                            <option>Humanitarian housing scheme</option>
                            <option>Teen club</option>
                            <option>Sponsorship</option>
                            <option>Emergency relief</option>
                            <option>Care for the aged</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Your Email</label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. ramon@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +234 801 234 5678"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Create Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !name || !city || !email || !phone || !password}
                        className="w-full py-4 mt-2 rounded-xl bg-brand-primary hover:bg-[#0A4233] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-display font-black tracking-widest text-white shadow-lg shadow-brand-primary/10 transition-colors uppercase cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? "Becoming an Ambassador..." : "Become an Ambassador."}
                      </button>

                      <div className="pt-4 text-center border-t border-slate-200 mt-4">
                        <p className="text-xs text-slate-500">
                          Already registered?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setIsLogin(true);
                            }}
                            className="font-bold text-brand-primary hover:underline cursor-pointer focus:outline-none"
                          >
                            Login to Dashboard
                          </button>
                        </p>
                      </div>
                    </form>
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="badge-panel"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-brand-charcoal text-white rounded-[32px] p-8 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-6"
                >
                  {/* Subtle vector grid */}
                  <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px]" />

                  {/* Success Announcement Callout */}
                  <div className="relative z-10 w-full p-4 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-start gap-2.5 text-left shadow-inner animate-fade-in">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="CheckCircle" size={13} className="text-emerald-400" />
                    </div>
                    <span className="leading-relaxed font-sans font-medium text-emerald-200">
                      Congratulations! Your Ambassador profile has been created. Your badge is pending approval.
                    </span>
                  </div>

                  <div className="relative z-10 w-full">
                    {/* Header bar of credential */}
                    <div className="flex justify-between items-center w-full border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-white border border-slate-700/30 flex items-center justify-center shadow-sm">
                          <img
                            src={logoUrl}
                            alt="Advaltad Foundation Logo"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black tracking-wider text-white uppercase leading-none">Advaltad Foundation</span>
                          <span className="text-[8px] font-semibold text-slate-400 mt-0.5 leading-none">Adding Value to Africa's Development</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-md">ID: {Math.floor(Math.random() * 899999 + 100000)}</span>
                    </div>

                    {/* Principal details */}
                    <div className="py-8 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary text-brand-primary flex items-center justify-center mb-4 shadow-lg shadow-brand-primary/20">
                        <Icon name="Award" size={28} className="animate-pulse" />
                      </div>
                      
                      <h4 className="text-xl font-display font-black tracking-tight">{name}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Icon name="MapPin" size={10} className="text-brand-primary" />
                        <span>{city}</span>
                      </p>

                      <div className="mt-4 px-4 py-1 bg-white/5 border border-white/10 text-[10px] font-display font-extrabold text-brand-accent rounded-full">
                        {field} Advocate
                      </div>
                    </div>

                    {/* Commission Stamps */}
                    <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[10px] text-slate-500 font-display">
                      <div className="space-y-0.5 text-left">
                        <p className="text-[9px] font-extrabold tracking-widest uppercase">COMMISSION DATE</p>
                        <p className="font-mono text-white text-[10px]">MAY 27, 2026</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-[9px] font-extrabold tracking-widest uppercase">AMBASSADOR STATUS</p>
                        <p className="font-mono text-emerald-400 text-[10px] uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ACTIVE
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full relative z-10 space-y-3.5">
                    <button
                      onClick={() => {
                        window.location.hash = "#/ambassador/dashboard";
                      }}
                      className="w-full py-4.5 rounded-xl bg-brand-primary hover:bg-[#0A4233] text-white font-display font-bold text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Icon name="Compass" size={14} className="animate-spin-slow" />
                      ACCESS PEER DEPLOYMENT DASHBOARD
                    </button>

                    <button
                      onClick={() => setIsRegistered(false)}
                      className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer font-sans"
                    >
                      Register New Member
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
};
