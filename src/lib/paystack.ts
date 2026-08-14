export const DEFAULT_PAYSTACK_PUBLIC_KEY = "pk_live_e7fddb22eb7063991306bc82bd907a0be7a1a3fb";

/**
 * Dynamically retrieves the active Paystack Public Key from local config or environment.
 */
export function getPaystackPublicKey(): string {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("PAYSTACK_PUBLIC_KEY") || localStorage.getItem("VITE_PAYSTACK_PUBLIC_KEY");
    if (local && local.trim()) return local.trim();
  }
  const envKey = (import.meta as any)?.env?.VITE_PAYSTACK_PUBLIC_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim()) return envKey.trim();
  return DEFAULT_PAYSTACK_PUBLIC_KEY;
}

/**
 * Saves a custom Paystack public key to localStorage.
 */
export function setPaystackPublicKey(key: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("PAYSTACK_PUBLIC_KEY", key.trim());
  }
}

export const PAYSTACK_PUBLIC_KEY: string = getPaystackPublicKey();

/**
 * Ensures the Paystack inline popup JS library is loaded into the window DOM.
 * Guaranteed never to hang or reject.
 */
export function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).PaystackPop) {
      resolve(true);
      return;
    }

    const existing = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existing) {
      let checks = 0;
      const interval = setInterval(() => {
        if ((window as any).PaystackPop) {
          clearInterval(interval);
          resolve(true);
        } else if (++checks > 30) {
          clearInterval(interval);
          resolve(Boolean((window as any).PaystackPop));
        }
      }, 100);
      existing.addEventListener("load", () => {
        clearInterval(interval);
        resolve(true);
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Could not load Paystack inline JS from CDN.");
      resolve(false);
    };
    document.head.appendChild(script);

    // Timeout safety fallback
    setTimeout(() => {
      resolve(Boolean((window as any).PaystackPop));
    }, 3500);
  });
}

export function convertNairaToAvu(nairaAmount: number): number {
  const computed = (nairaAmount / 1000) * 1.002;
  return Number(computed.toFixed(3));
}

export function convertAvuToNaira(avuAmount: number): number {
  if (!avuAmount || avuAmount <= 0) return 0;
  const computed = (avuAmount / 1.002) * 1000;
  return Number(computed.toFixed(2));
}

export interface PaystackTransactionConfig {
  email: string;
  amountNaira: number;
  reference: string;
  metadata?: any;
  onSuccess: (response: { reference: string; status: string }) => void | Promise<void>;
  onClose: () => void | Promise<void>;
}

/**
 * Initializes a Paystack transaction using the inline iframe checkout.
 * Replicates the script injection loading architecture securely.
 */
export function initializePaystackTransaction(config: PaystackTransactionConfig): boolean {
  if (typeof window === "undefined") return false;

  const paystackPop = (window as any).PaystackPop;
  if (!paystackPop) {
    console.warn("Paystack Inline script (PaystackPop) is not loaded on window.");
    return false;
  }

  try {
    const handler = paystackPop.setup({
      key: getPaystackPublicKey(),
      email: config.email,
      amount: Math.round(config.amountNaira * 100), // convert to Kobo
      ref: config.reference,
      metadata: config.metadata,
      callback: (response: any) => {
        config.onSuccess({
          reference: response.reference || config.reference,
          status: "success"
        });
      },
      onClose: () => {
        config.onClose();
      }
    });

    handler.openIframe();
    return true;
  } catch (error) {
    console.error("Paystack popup setup failed:", error);
    return false;
  }
}

/**
 * Processes a Paystack payment by returning a Promise that resolves upon successful transaction setup/completion
 * or rejects when the modal is closed or fails.
 */
export async function processPayment(amountNaira: number, email: string, metadata?: any): Promise<{ reference: string; status: string }> {
  await loadPaystackScript();

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Cannot process payment outside window context"));
      return;
    }

    const paystackPop = (window as any).PaystackPop;
    if (!paystackPop) {
      reject(new Error("Paystack SDK not loaded"));
      return;
    }

    const reference = `WAL-${Date.now()}`;

    try {
      const handler = paystackPop.setup({
        key: getPaystackPublicKey(),
        email: email,
        amount: Math.round(amountNaira * 100), // convert to Kobo
        ref: reference,
        metadata: metadata,
        callback: (response: any) => {
          resolve({
            reference: response.reference || reference,
            status: "success"
          });
        },
        onClose: () => {
          reject(new Error("Payment cancelled by user."));
        }
      });

      handler.openIframe();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Initializes a Paystack transaction with currency-to-AVU conversion and reference generation.
 */
export async function initializePayment(amountNaira: number, email: string, metadata?: any, customRef?: string): Promise<{ reference: string; status: string; avuEarned: number }> {
  await loadPaystackScript();

  const avuEarned = convertNairaToAvu(amountNaira);
  const reference = customRef || `WAL-${Date.now()}`;
  
  const mergedMetadata = {
    ...metadata,
    custom_fields: [
      ...(metadata?.custom_fields || []),
      {
        display_name: "AVU Earned",
        variable_name: "avu_earned",
        value: avuEarned,
      }
    ]
  };

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Cannot process payment outside window context"));
      return;
    }

    const paystackPop = (window as any).PaystackPop;
    if (!paystackPop) {
      reject(new Error("Paystack SDK not loaded"));
      return;
    }

    try {
      const handler = paystackPop.setup({
        key: getPaystackPublicKey(),
        email: email,
        amount: Math.round(amountNaira * 100), // convert to Kobo
        ref: reference,
        metadata: mergedMetadata,
        callback: (response: any) => {
          resolve({
            reference: response.reference || reference,
            status: "success",
            avuEarned
          });
        },
        onClose: () => {
          reject(new Error("Payment cancelled by user."));
        }
      });

      handler.openIframe();
    } catch (err) {
      reject(err);
    }
  });
}


