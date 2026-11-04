import React, { useState } from 'react';
import {
  Globe,
  RefreshCw,
  Lock,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  Shield,
  Download,
  Terminal,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { RPAStep, KRAReceipt } from '../types';

interface RPABrowserVisualizerProps {
  steps: RPAStep[];
  currentStepIndex: number;
  isRunning: boolean;
  onRunAutomation: () => void;
  onReset: () => void;
  receipt: KRAReceipt | null;
  kraPin: string;
  year: string;
  onViewReceipt: () => void;
}

export const RPABrowserVisualizer: React.FC<RPABrowserVisualizerProps> = ({
  steps,
  currentStepIndex,
  isRunning,
  onRunAutomation,
  onReset,
  receipt,
  kraPin,
  year,
  onViewReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'browser' | 'logs'>('browser');

  const activeStep = steps[currentStepIndex] || steps[0];

  return (
    <div className="space-y-6">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            <span>Playwright Headless Browser Worker</span>
            <span aria-hidden="true">·</span>
            <span>Target: KRA iTax System</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-emerald-700 dark:text-emerald-400">itax.kra.go.ke</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Autonomous Portal Execution Engine
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            Demonstrates real-time headless browser automation, arithmetic captcha OCR solver, and Nil Return submission.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onReset}
            disabled={isRunning}
            className="px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset State
          </button>
          <button
            onClick={onRunAutomation}
            disabled={isRunning}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 ${
              isRunning
                ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
            }`}
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Executing Automation...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Playwright Worker
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Virtual Browser View & Execution Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Virtual Headless Browser Container */}
        <div className="lg:col-span-8 bg-neutral-900 rounded-xl border border-neutral-700 overflow-hidden shadow-xl flex flex-col">
          {/* Browser Window Bar */}
          <div className="bg-neutral-800 px-4 py-2.5 flex items-center justify-between border-b border-neutral-700 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 ml-2 hidden sm:inline">
                Chromium (Headless Playwright Context)
              </span>
            </div>

            {/* Simulated Address Bar */}
            <div className="flex-1 max-w-md mx-3 bg-neutral-950/80 text-neutral-300 px-3 py-1 rounded-md text-xs font-mono flex items-center gap-2 border border-neutral-700/60">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">
                {currentStepIndex >= 5
                  ? 'https://itax.kra.go.ke/KRA-Portal/fileNilReturn.htm'
                  : currentStepIndex >= 4
                  ? 'https://itax.kra.go.ke/KRA-Portal/home.htm'
                  : 'https://itax.kra.go.ke/KRA-Portal/'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-neutral-400">
              <span className="text-[10px] bg-neutral-700 px-1.5 py-0.5 rounded font-mono">
                1440x900
              </span>
            </div>
          </div>

          {/* Virtual Browser Content Area */}
          <div className="bg-neutral-100 dark:bg-neutral-950 p-6 min-h-[460px] flex flex-col justify-between text-neutral-900 dark:text-neutral-100">
            {/* KRA iTax Top Navigation Bar */}
            <div className="bg-[#ba0c2f] text-white p-3 rounded-t-lg shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-white p-1 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#ba0c2f]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">KENYA REVENUE AUTHORITY</h3>
                  <p className="text-[10px] text-red-100">iTax Integrated Tax Management System</p>
                </div>
              </div>
              <div className="text-right text-[11px] font-mono text-white/90">
                <span>REPUBLIC OF KENYA</span>
                <span className="block text-[9px] text-white/70">ISO 9001:2015 CERTIFIED</span>
              </div>
            </div>

            {/* Portal Body Screen Transition based on current step */}
            <div className="flex-1 bg-white dark:bg-neutral-900 border-x border-b border-neutral-300 dark:border-neutral-800 p-6 rounded-b-lg space-y-5">
              {currentStepIndex < 4 ? (
                /* Stage 1: Login & Arithmetic Captcha */
                <div className="max-w-md mx-auto space-y-4 py-4">
                  <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Login to iTax Portal
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Enter your KRA PIN and password to access the tax filing system.
                    </p>
                  </div>

                  {/* KRA PIN Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                      <span>Enter PIN / User ID:</span>
                      <span className="font-mono text-[10px] text-neutral-400">#logEid</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={currentStepIndex >= 2 ? kraPin : ''}
                      placeholder="e.g. A012345678Z"
                      className={`w-full text-xs font-mono p-2.5 rounded border ${
                        currentStepIndex === 2
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800'
                      }`}
                    />
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                      <span>Enter Password:</span>
                      <span className="font-mono text-[10px] text-neutral-400">#password</span>
                    </label>
                    <input
                      type="password"
                      readOnly
                      value={currentStepIndex >= 3 ? '••••••••••••' : ''}
                      placeholder="Portal password"
                      className={`w-full text-xs font-mono p-2.5 rounded border ${
                        currentStepIndex === 3
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800'
                      }`}
                    />
                  </div>

                  {/* Arithmetic Captcha Solver Visualizer */}
                  <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                      <span>Security Arithmetic Captcha:</span>
                      <span className="font-mono text-[10px] text-neutral-400">#captCode</span>
                    </label>

                    <div className="flex items-center gap-3">
                      {/* Math Captcha Image Box */}
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-md font-mono text-sm font-bold tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <span className="select-none line-through decoration-amber-400">
                          48 + 12 = ?
                        </span>
                      </div>

                      {/* OCR Solution Result */}
                      <div className="flex-1">
                        <input
                          type="text"
                          readOnly
                          value={currentStepIndex >= 4 ? '60' : ''}
                          placeholder="Answer"
                          className={`w-full text-xs font-mono p-2.5 rounded border text-center font-bold ${
                            currentStepIndex === 4
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                              : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800'
                          }`}
                        />
                      </div>
                    </div>

                    {currentStepIndex >= 4 && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>OCR solved arithmetic captcha: &ldquo;48 + 12&rdquo; &rarr; 60 (Tesseract / Vision Model)</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : currentStepIndex < 7 ? (
                /* Stage 2: Navigation to Returns -> File Nil Return */
                <div className="space-y-4">
                  <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-neutral-500">Taxpayer:</span>
                      <p className="text-xs font-bold font-mono text-neutral-900 dark:text-neutral-100">
                        {kraPin} (INDIVIDUAL RESIDENT)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-neutral-500">Status:</span>
                      <p className="text-xs font-bold text-emerald-600">Active Taxpayer</p>
                    </div>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Returns &gt; File Nil Return
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                          Tax Obligation:
                        </label>
                        <div className="p-2.5 rounded border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                          Income Tax - Resident Individual
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                          Return Period:
                        </label>
                        <div className="p-2.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono text-neutral-800 dark:text-neutral-200">
                          01/01/{year} to 31/12/{year}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-xs text-neutral-600 dark:text-neutral-400">
                      Nil declaration: &ldquo;I hereby certify that I had no taxable income for the period specified above.&rdquo;
                    </div>
                  </div>
                </div>
              ) : (
                /* Stage 3: Acknowledgment & Receipt Ready */
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      KRA Nil Return Successfully Submitted!
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      Acknowledgment Receipt: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{receipt?.ackNumber || `KRA${year}8941029`}</strong>
                    </p>
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={onViewReceipt}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      View Official KRA Receipt
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Browser Status Bar */}
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-2 border-t border-neutral-800">
              <span>Selector Target: {activeStep.action.split(' ')[0]}</span>
              <span>Execution Time: {steps.reduce((acc, s) => acc + s.durationMs, 0)}ms</span>
            </div>
          </div>
        </div>

        {/* Right: Step-by-Step Execution Log */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600" />
              Playwright Step Timeline
            </h3>
            <span className="text-xs font-mono text-neutral-500">
              {currentStepIndex + 1}/{steps.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFuture = idx > currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-lg border text-xs transition-all ${
                    isCurrent
                      ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium'
                      : isPast
                      ? 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300'
                      : 'border-transparent bg-neutral-50 dark:bg-neutral-900 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      {isPast ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0"></span>
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      )}
                      {step.name}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400 tabular-nums">
                      {step.durationMs}ms
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 pl-5">
                    {step.action}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
