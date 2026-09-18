import React from 'react';
import { Danger, Refresh2 } from 'iconsax-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Admin Panel Uncaught Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="bg-vsp-surface border border-red-500/30 rounded-2xl p-8 max-w-lg w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <Danger className="w-8 h-8" variant="Outline" />
            </div>
            <h2 className="text-lg font-bold text-white">حدث خطأ أثناء تحميل هذه الشاشة</h2>
            <p className="text-xs text-vsp-textSecondary leading-relaxed">
              واجه النظام مشكلة أثناء معالجة بيانات هذه الصفحة. يمكنك محاولة إعادة التحميل أو الانتقال لصفحة أخرى من القائمة الجانبية.
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-left font-mono text-[11px] text-red-400 break-all overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="pt-2 flex justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-vsp-accent hover:bg-vsp-accentHover text-black font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
              >
                <Refresh2 className="w-4 h-4" variant="Outline" />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
