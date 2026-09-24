/**
 * ADVALTAD Global Database Logger & Trace Utility
 * 
 * This module provides a logging wrapper to transparently intercept and trace
 * all Supabase and local storage database operations, detailing outgoing payloads,
 * response states, and error contexts to assist in troubleshooting registration flows.
 */

interface SupabaseResponse {
  data?: any;
  error?: any;
}

export async function traceDbOperation<T extends SupabaseResponse>(
  operationName: string,
  payload: any,
  operationPromise: Promise<T> | (() => Promise<T>)
): Promise<T> {
  const timestamp = new Date().toISOString();
  console.log(`%c[DB TRACE] [${timestamp}] Starting: ${operationName}`, 'color: #3b82f6; font-weight: bold;');
  console.log('%c[DB TRACE] Outgoing Payload:', 'color: #64748b;', payload);

  try {
    const promise = typeof operationPromise === 'function' ? operationPromise() : operationPromise;
    const response = await promise;

    if (response && response.error) {
      console.error(
        `%c[DB TRACE] [${timestamp}] Failed: ${operationName}`,
        'color: #ef4444; font-weight: bold;',
        {
          error: response.error,
          message: response.error?.message,
          code: response.error?.code,
          details: response.error?.details,
          hint: response.error?.hint,
          payload
        }
      );
    } else {
      console.log(
        `%c[DB TRACE] [${timestamp}] Success: ${operationName}`,
        'color: #10b981; font-weight: bold;',
        response.data
      );
    }

    return response;
  } catch (exception: any) {
    console.error(
      `%c[DB TRACE] [${timestamp}] Exception: ${operationName}`,
      'color: #b91c1c; font-weight: bold;',
      {
        message: exception?.message,
        stack: exception?.stack,
        exception,
        payload
      }
    );
    throw exception;
  }
}

/**
 * Generic wrapper for wrapping a non-Supabase async function with tracking loggers
 */
export async function traceGenericOperation<T>(
  operationName: string,
  payload: any,
  action: () => Promise<T>
): Promise<T> {
  const timestamp = new Date().toISOString();
  console.log(`%c[GENERIC TRACE] [${timestamp}] Starting: ${operationName}`, 'color: #8b5cf6; font-weight: bold;');
  console.log('%c[GENERIC TRACE] Payload:', 'color: #64748b;', payload);

  try {
    const result = await action();
    console.log(`%c[GENERIC TRACE] [${timestamp}] Succeeded: ${operationName}`, 'color: #10b981; font-weight: bold;', result);
    return result;
  } catch (error: any) {
    console.error(`%c[GENERIC TRACE] [${timestamp}] Failed: ${operationName}`, 'color: #ef4444; font-weight: bold;', {
      message: error?.message || error,
      error,
      payload
    });
    throw error;
  }
}

/**
 * Custom formatted DB operation logger
 */
export function logDbOperation(operationName: string, payload: any, error: any): void {
  const timestamp = new Date().toISOString();
  if (error) {
    console.error(
      `%c[DB LOGGER ERROR] [${timestamp}] ${operationName.toUpperCase()} FAILED`,
      'color: #ef4444; font-weight: bold; font-size: 12px; border: 1px solid #ef4444; padding: 2px 6px; border-radius: 4px;',
      {
        operationName,
        timestamp,
        payload,
        error: error?.message || error,
        rawError: error
      }
    );
  } else {
    console.log(
      `%c[DB LOGGER SUCCESS] [${timestamp}] ${operationName.toUpperCase()} COMPLETED`,
      'color: #10b981; font-weight: bold; font-size: 12px; border: 1px solid #10b981; padding: 2px 6px; border-radius: 4px;',
      {
        operationName,
        timestamp,
        payload
      }
    );
  }
}

/**
 * Centralized logging utility to track the lifecycle of ambassador approval requests,
 * recording timestamps, actions, actors, and error states in the browser console for easier troubleshooting.
 */
export interface AmbassadorApprovalLifecycleEvent {
  stage: "INITIATED" | "VALIDATING" | "EMAIL_DISPATCH" | "EMAIL_SUCCESS" | "EMAIL_FAILED" | "DB_UPDATE" | "AUDIT_LOGGED" | "COMPLETED" | "FAILED";
  ambassadorId: string;
  ambassadorName?: string;
  ambassadorEmail?: string;
  adminId?: string;
  adminName?: string;
  action: "approve" | "disapprove" | "bulk_approve" | "bulk_disapprove";
  details?: any;
  error?: any;
}

export function logAmbassadorApprovalLifecycle(event: AmbassadorApprovalLifecycleEvent): void {
  const timestamp = new Date().toISOString();
  const isError = Boolean(event.error) || event.stage === "FAILED" || event.stage === "EMAIL_FAILED";
  const badgeColor = isError ? "#ef4444" : event.stage === "COMPLETED" ? "#10b981" : "#3b82f6";

  if (isError) {
    console.error(
      `%c[AMBASSADOR APPROVAL LIFECYCLE: ${event.stage}]%c [${timestamp}] Ambassador: ${event.ambassadorName || event.ambassadorId} (${event.action.toUpperCase()})`,
      `background: ${badgeColor}; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 4px;`,
      "color: #ef4444; font-weight: bold;",
      {
        stage: event.stage,
        timestamp,
        ambassadorId: event.ambassadorId,
        ambassadorName: event.ambassadorName,
        ambassadorEmail: event.ambassadorEmail,
        adminId: event.adminId,
        adminName: event.adminName,
        action: event.action,
        details: event.details,
        error: event.error?.message || event.error,
        rawError: event.error
      }
    );
  } else {
    console.log(
      `%c[AMBASSADOR APPROVAL LIFECYCLE: ${event.stage}]%c [${timestamp}] Ambassador: ${event.ambassadorName || event.ambassadorId} (${event.action.toUpperCase()})`,
      `background: ${badgeColor}; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 4px;`,
      "color: #10b981; font-weight: bold;",
      {
        stage: event.stage,
        timestamp,
        ambassadorId: event.ambassadorId,
        ambassadorName: event.ambassadorName,
        ambassadorEmail: event.ambassadorEmail,
        adminId: event.adminId,
        adminName: event.adminName,
        action: event.action,
        details: event.details
      }
    );
  }
}

/**
 * Unified debugging function for logging the specific 'ambassador_id' being used during
 * the 'avu_withdrawals' fetch call to verify that queries correctly filter and join the data.
 */
export interface WithdrawalFetchTraceParams {
  caller: "AdminPortal" | "AmbassadorDashboard" | "PendingWithdrawalsTable" | "db.getAvuWithdrawals";
  targetAmbassadorId?: string | string[];
  filterStatus?: string;
  tableQueried?: string;
  matchedCount?: number;
  totalCount?: number;
  sampleIds?: string[];
  error?: any;
}

export function logWithdrawalFetchTrace(params: WithdrawalFetchTraceParams): void {
  const timestamp = new Date().toISOString();
  const callerColor = params.caller === "AdminPortal" ? "#f59e0b" : params.caller === "AmbassadorDashboard" ? "#10b981" : "#8b5cf6";

  if (params.error) {
    console.error(
      `%c[WITHDRAWAL FETCH TRACE: ${params.caller}]%c [${timestamp}] Error during avu_withdrawals fetch`,
      `background: ${callerColor}; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px;`,
      "color: #ef4444; font-weight: bold;",
      {
        timestamp,
        caller: params.caller,
        targetAmbassadorId: params.targetAmbassadorId,
        filterStatus: params.filterStatus,
        tableQueried: params.tableQueried,
        error: params.error?.message || params.error
      }
    );
  } else {
    console.log(
      `%c[WITHDRAWAL FETCH TRACE: ${params.caller}]%c [${timestamp}] Target ID: ${JSON.stringify(params.targetAmbassadorId || "ALL")} | Matched: ${params.matchedCount ?? 0}/${params.totalCount ?? 0}`,
      `background: ${callerColor}; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px;`,
      "color: #0284c7; font-weight: bold;",
      {
        timestamp,
        caller: params.caller,
        targetAmbassadorId: params.targetAmbassadorId,
        filterStatus: params.filterStatus,
        tableQueried: params.tableQueried || "avu_withdrawals",
        matchedCount: params.matchedCount,
        totalCount: params.totalCount,
        sampleIds: params.sampleIds
      }
    );
  }
}

export default {
  traceDbOperation,
  traceGenericOperation,
  logDbOperation,
  logAmbassadorApprovalLifecycle,
  logWithdrawalFetchTrace
};



