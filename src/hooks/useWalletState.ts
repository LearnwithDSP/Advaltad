/**
 * Re-export useWalletState and related types from useWalletBalance
 * Prevents missing module errors across environments.
 */
export {
  useWalletState,
  type UseWalletStateOptions,
  type UseWalletStateResult
} from "./useWalletBalance";
