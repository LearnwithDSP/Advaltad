import { useState, useEffect, useCallback } from "react";
import { supabase, DbAmbassador } from "../lib/supabase";

export const useAmbassadors = () => {
  const [ambassadors, setAmbassadors] = useState<DbAmbassador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Diagnostic Read check to isolate RLS issues
  const runRlsDiagnosticCheck = async () => {
    console.group("🛡️ Supabase RLS Policy Isolation Check");
    try {
      // Run an explicit metadata headcount query to evaluate baseline visibility
      const { data, error, count, status } = await supabase
        .from("Ambassadors")
        .select("*", { count: "exact", head: false });

      console.log("Response Status Code:", status);
      
      if (error) {
        console.error("❌ Database query failure:", error.message);
        console.error("Detailed Context Error Object:", error);
      } else {
        console.log(`📊 Visibility metrics verified. Row count visible to client: ${count ?? data?.length}`);
        if ((data?.length ?? 0) === 0) {
          console.warn(
            "⚠️ WARNING: Query returned successfully but with ZERO records. If data exists in your dashboard table, your active RLS policies are blocking public/authenticated read access permissions."
          );
        } else {
          console.log("✅ Diagnostic records parsed cleanly:", data);
        }
      }
    } catch (catchErr) {
      console.error("💥 Critical network breakdown running diagnostic pipeline:", catchErr);
    }
    console.groupEnd();
  };

  // 2. Primary core fetching channel 
  const fetchAmbassadors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Trigger evaluation loop
      await runRlsDiagnosticCheck();

      const { data, error } = await supabase
        .from("Ambassadors")
        .select("*");

      if (error) {
        console.error("🚨 Explicit Error fetching from 'Ambassadors' table:", error.message);
        setError(error.message);
      } else {
        setAmbassadors((data as DbAmbassador[]) || []);
      }
    } catch (err: any) {
      const fallbackMsg = err?.message || "Unknown anomaly reading registry records.";
      console.error("🚨 Critical operational failure in useAmbassadors hook hook loop:", err);
      setError(fallbackMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAmbassadors();
  }, [fetchAmbassadors]);

  return { ambassadors, loading, error, refetch: fetchAmbassadors };
};
