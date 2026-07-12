export function convertNairaToAvu(nairaAmount: number): number {
  const computed = (nairaAmount / 1000) * 1.002;
  return Number(computed.toFixed(3));
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
      key: "pk_live_e7fddb22eb7063991306bc82bd907a0be7a1a3fb",
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
export function processPayment(amountNaira: number, email: string, metadata?: any): Promise<{ reference: string; status: string }> {
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
        key: "pk_live_e7fddb22eb7063991306bc82bd907a0be7a1a3fb",
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
export function initializePayment(amountNaira: number, email: string, metadata?: any): Promise<{ reference: string; status: string; avuEarned: number }> {
  const avuEarned = convertNairaToAvu(amountNaira);
  const reference = `WAL-${Date.now()}`;
  
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
        key: "pk_live_e7fddb22eb7063991306bc82bd907a0be7a1a3fb",
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


