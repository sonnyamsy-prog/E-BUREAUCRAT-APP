import React, { useEffect, useMemo, useState } from 'react';
import {
  Landmark,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Send,
  Search,
  FileText,
  ArrowRight,
} from 'lucide-react';

interface ServiceDefinition {
  id: string;
  name: string;
  agency: string;
  category: string;
  status: 'simulated' | 'catalog' | 'not-offered';
  description: string;
  fee: string;
  turnaround: string;
  channels: string[];
}

interface ParityRow {
  capability: string;
  ecitizen: string;
  demo: string;
  note: string;
}

interface TrackedRequest {
  reference: string;
  serviceName: string;
  applicant: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  decisionNote: string;
}

const STATUS_STYLES: Record<string, string> = {
  simulated: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  catalog: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  'not-offered': 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
};

const STATUS_LABELS: Record<string, string> = {
  simulated: 'End-to-end demo',
  catalog: 'Intake + review',
  'not-offered': 'Not in demo',
};

const REQUEST_STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-sky-50 text-sky-800 border-sky-200',
  in_review: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

export const ServiceCatalog: React.FC = () => {
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [parity, setParity] = useState<ParityRow[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loadError, setLoadError] = useState('');

  const [serviceId, setServiceId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+254');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdRef, setCreatedRef] = useState('');

  const [trackRef, setTrackRef] = useState('');
  const [tracked, setTracked] = useState<TrackedRequest | null>(null);
  const [trackError, setTrackError] = useState('');
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'Could not load services');
        setServices(data.services);
        setParity(data.parity || []);
        setDisclaimer(data.disclaimer);
        const first = (data.services as ServiceDefinition[]).find((s) => s.status !== 'not-offered');
        if (first) setServiceId(first.id);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  const selectable = useMemo(
    () => services.filter((service) => service.status !== 'not-offered'),
    [services]
  );

  const selected = services.find((service) => service.id === serviceId) || null;

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setCreatedRef('');
    try {
      const res = await fetch('/api/services/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, fullName, phone, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
      setCreatedRef(data.request.reference);
      setTrackRef(data.request.reference);
      setNotes('');
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const trackRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setTracking(true);
    setTrackError('');
    setTracked(null);
    try {
      const res = await fetch(`/api/services/track/${encodeURIComponent(trackRef.trim().toUpperCase())}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Reference not found');
      setTracked(data.request);
    } catch (err: any) {
      setTrackError(err.message);
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-px" />
        <span>{disclaimer || 'Demo catalogue. Not affiliated with eCitizen or any government agency.'}</span>
      </div>

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Landmark className="w-4 h-4 text-neutral-500" />
          <h2 className="text-lg font-bold">eCitizen parity</h2>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
          What the national portal advertises, and what this prototype actually implements.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 uppercase tracking-wider">
                <th className="py-2 pr-4 font-semibold">Capability</th>
                <th className="py-2 pr-4 font-semibold">eCitizen</th>
                <th className="py-2 pr-4 font-semibold">This demo</th>
                <th className="py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {parity.map((row) => (
                <tr key={row.capability} className="border-b border-neutral-100 dark:border-neutral-800/60 last:border-0 align-top">
                  <td className="py-2.5 pr-4 font-medium text-neutral-900 dark:text-neutral-100">{row.capability}</td>
                  <td className="py-2.5 pr-4 text-neutral-600 dark:text-neutral-400">{row.ecitizen}</td>
                  <td className="py-2.5 pr-4">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{row.demo}</span>
                  </td>
                  <td className="py-2.5 text-neutral-500 dark:text-neutral-400">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Service directory</h2>
          <span className="text-xs text-neutral-500">{selectable.length} requestable of {services.length}</span>
        </div>

        {loadError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{loadError}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{service.name}</h3>
                  <p className="text-[11px] text-neutral-500">{service.agency} · {service.category}</p>
                </div>
                <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 whitespace-nowrap ${STATUS_STYLES[service.status]}`}>
                  {STATUS_LABELS[service.status]}
                </span>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 flex-1">{service.description}</p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                <span>Fee: <span className="text-neutral-800 dark:text-neutral-200">{service.fee}</span></span>
                <span className="text-right">{service.turnaround}</span>
              </div>

              <button
                type="button"
                disabled={service.status === 'not-offered'}
                onClick={() => {
                  setServiceId(service.id);
                  document.getElementById('service-request')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`text-xs font-semibold rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                  service.status === 'not-offered'
                    ? 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200'
                }`}
              >
                {service.status === 'not-offered' ? 'Not available' : 'Start request'}
                {service.status !== 'not-offered' && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section
          id="service-request"
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-neutral-500" />
            <h2 className="text-lg font-bold">Request a service</h2>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
            The request is stored, shown in the admin queue, and reviewed by an officer. No agency receives it.
          </p>

          <form onSubmit={submitRequest} className="space-y-3">
            <label className="block text-xs font-medium">
              Service
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
              >
                {selectable.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — {service.agency}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                minLength={2}
                maxLength={80}
                placeholder="Wanjiku Kamau"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs font-medium">
              Phone
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                placeholder="+254712345678"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs font-medium">
              Details (optional)
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Anything the reviewing officer should know"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm resize-none"
              />
            </label>

            {selected && (
              <p className="text-[11px] text-neutral-500">
                Fee: {selected.fee} · Turnaround: {selected.turnaround}
              </p>
            )}
            {formError && <p className="text-xs text-rose-600 dark:text-rose-400">{formError}</p>}

            <button
              type="submit"
              disabled={submitting || !serviceId}
              className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>

          {createdRef && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-3">
              <p className="text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Request received. Reference:
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-emerald-900 dark:text-emerald-100">{createdRef}</p>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-4 h-4 text-neutral-500" />
            <h2 className="text-lg font-bold">Track a request</h2>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
            Enter the reference you received. Status changes when an officer acts on it.
          </p>

          <form onSubmit={trackRequest} className="flex gap-2">
            <input
              value={trackRef}
              onChange={(event) => setTrackRef(event.target.value)}
              placeholder="EB-XXXXXXXX"
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm font-mono uppercase"
            />
            <button
              type="submit"
              disabled={tracking || trackRef.trim().length < 4}
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {tracking ? 'Checking…' : 'Check'}
            </button>
          </form>

          {trackError && <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{trackError}</p>}

          {tracked && (
            <div className="mt-4 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold">{tracked.reference}</span>
                <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 uppercase ${REQUEST_STATUS_STYLES[tracked.status] || ''}`}>
                  {tracked.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300">{tracked.serviceName}</p>
              <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {new Date(tracked.updatedAt).toLocaleString()}
              </p>
              {tracked.decisionNote && (
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                  Officer note: {tracked.decisionNote}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
