import React from 'react';
import { ShieldCheck, Moon, Sun } from 'lucide-react';

interface TopNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onLaunchFiling: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  onLaunchFiling,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur sticky top-0 z-50">
      {/* Zone 1: Brand wordmark */}
      <a
        href="#simulator"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('simulator');
        }}
        className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap shrink-0 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500 inline-block"></span>
        e-Bureaucrat
      </a>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'simulator'
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          WhatsApp Agent
        </button>
        <button
          onClick={() => setActiveTab('rpa')}
          className={`transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'rpa'
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          RPA Browser Execution
        </button>
        <button
          onClick={() => setActiveTab('receipt')}
          className={`transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'receipt'
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          KRA Receipt
        </button>
        <button
          onClick={() => setActiveTab('webhook')}
          className={`transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'webhook'
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          Webhook & API
        </button>
        <button
          onClick={() => setActiveTab('source')}
          className={`transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'source'
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          Python Blueprint
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action & theme toggle */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle dark mode"
          className="p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={onLaunchFiling}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm flex items-center gap-2"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Test KRA Nil Return
        </button>
      </div>
    </header>
  );
};
