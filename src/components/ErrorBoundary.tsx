import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    const inst = this as any;
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Something went wrong</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unforeseen error occurred while rendering this section. You can refresh or reload the dashboard below.
              </p>
              {this.state.error?.message && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-[11px] font-mono text-slate-300 text-left overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                inst.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              Reload View
            </button>
          </div>
        </div>
      );
    }

    return inst.props.children;
  }
}
