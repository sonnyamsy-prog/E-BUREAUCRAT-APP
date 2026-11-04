import React from 'react';
import { Play, Sparkles, Shield, ArrowRight, RefreshCw, FileText } from 'lucide-react';

interface HeroSectionProps {
  onSelectScenario: (scenario: 'sheng_kra' | 'swahili_kra' | 'english_ecitizen') => void;
  onResetSession: () => void;
  onViewRPA: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSelectScenario,
  onResetSession,
  onViewRPA,
}) => {
  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 py-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Context & Overview */}
        <div className="lg:col-span-7 space-y-5">
          {/* Unboxed metadata kicker */}
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <span>Republic of Kenya GovTech</span>
            <span aria-hidden="true">·</span>
            <span>WhatsApp Cloud API</span>
            <span aria-hidden="true">·</span>
            <span>Playwright Browser RPA</span>
            <span aria-hidden="true">·</span>
            <span>Data Protection Act 2019 Compliant</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 max-w-2xl text-balance">
            Voice-Native Public Agent for Kenyan Portal Filings
          </h1>

          <p className="text-base text-neutral-600 dark:text-neutral-300 max-w-xl leading-relaxed">
            Citizens speak in <strong className="font-semibold text-neutral-900 dark:text-neutral-100">Swahili</strong>,{' '}
            <strong className="font-semibold text-neutral-900 dark:text-neutral-100">Sheng</strong>, or{' '}
            <strong className="font-semibold text-neutral-900 dark:text-neutral-100">English</strong> via WhatsApp voice notes. 
            Wakili AI interviews conversationally, extracts KRA PINs and credentials, and triggers a headless browser agent that solves math captchas and delivers the official e-Return receipt.
          </p>

          {/* Action triggers and presets */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mr-1">
              Quick Scenarios:
            </span>
            <button
              onClick={() => onSelectScenario('sheng_kra')}
              className="px-3.5 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-emerald-600 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3 h-3 text-emerald-600" />
              Sheng Voice: &ldquo;Niaje nataka ku-file nil return...&rdquo;
            </button>
            <button
              onClick={() => onSelectScenario('swahili_kra')}
              className="px-3.5 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-emerald-600 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3 h-3 text-emerald-600" />
              Swahili Voice: &ldquo;Habari, nahitaji kuwasilisha ushuru...&rdquo;
            </button>
            <button
              onClick={onResetSession}
              className="p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Reset Conversation Session"
              aria-label="Reset Conversation Session"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Hero Visual with Kenya Citizen Photo */}
        <div className="lg:col-span-5 relative">
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm relative group">
            <img
              src="/src/assets/images/citizen_voice_hero_1793786290089.jpg"
              alt="Kenyan citizen sending WhatsApp voice note in Nairobi"
              className="w-full h-64 object-cover object-center group-hover:scale-102 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            {/* Scrim overlay with caption */}
            <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Voice Note In &rarr; Official Filing PDF Out
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Zero smartphone typing required. Automated KRA iTax & eCitizen filings.
                  </p>
                </div>
                <button
                  onClick={onViewRPA}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1 shrink-0"
                >
                  Live RPA View
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
