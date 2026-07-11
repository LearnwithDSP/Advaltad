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

