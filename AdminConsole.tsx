import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  LogOut,
  RefreshCw,
  Inbox,
  FileCheck2,
  Users,
  ScrollText,
  Check,
  X,
  Eye,
  Lock,
} from 'lucide-react';

interface AdminOverview {
  sessions: number;
  filings: number;
  requests: number;
  requestsByStatus: Record<string, number>;
  auditEvents: number;
  geminiActive: boolean;
  uptimeSeconds: number;
  node: string;
  storage: string;
  adminEmail: string;
}

interface AdminRequest {
  reference: string;
  serviceId: string;
  serviceName: string;
  applicant: string;
  phone: string;
  status: 'submitted' | 'in_review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  decisionNote: string;
}

interface AdminFiling {
  id: string;
  pin: string;
  year: string;
  ackNumber: string;
  status: string;
  createdAt: string;
  channel: string;
}

interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

const REQUEST_BADGES: Record<string, string> = {
  submitted: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
  in_review: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
};

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export const AdminConsole: React.FC = () => {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [filings, setFilings] = useState<AdminFiling[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [decisionNote, setDecisionNote] = useState('');
  const [dataError, setDataError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busyRef, setBusyRef] = useState('');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setDataError('');
    try {
      const [overviewRes, requestsRes, filingsRes, auditRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/requests'),
        fetch('/api/admin/filings'),
        fetch('/api/admin/audit'),
      ]);

      if (overviewRes.status === 401) {
        setAuthenticated(false);
        return;
      }
      const [overviewData, requestsData, filingsData, auditData] = await Promise.all([
        overviewRes.json(),
        requestsRes.json(),
        filingsRes.json(),
        auditRes.json(),
      ]);

      setOverview(overviewData.overview);
      setRequests(requestsData.requests || []);
      setFilings(filingsData.filings || []);
      setEvents(auditData.events || []);
    } catch (err: any) {
      setDataError(err.message || 'Could not load console data');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(Boolean(data.authenticated));
        setEmail(data.email || '');
        if (data.authenticated) loadData();
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingSession(false));
  }, [loadData]);

  useEffect(() => {
    if (!authenticated) return;
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, [authenticated, loadData]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setSigningIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sign-in failed');
      setAuthenticated(true);
      setEmail(data.email);
      setPassword('');
      loadData();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    setOverview(null);
    setRequests([]);
    setFilings([]);
    setEvents([]);
  };

  const decide = async (reference: string, status: 'in_review' | 'approved' | 'rejected') => {
    setBusyRef(reference);
    setDataError('');
    try {
      const res = await fetch(`/api/admin/requests/${reference}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: decisionNote }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Decision failed');
      setDecisionNote('');
      await loadData();
    } catch (err: any) {
      setDataError(err.message);
    } finally {
      setBusyRef('');
    }
  };

  if (checkingSession) {
    return <p className="text-sm text-neutral-500">Checking admin session…</p>;
  }

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto">
        <form
          onSubmit={signIn}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center">
              <Lock className="w-4 h-4 text-white dark:text-neutral-900" />
            </div>
            <div>
              <h2 className="text-base font-bold">Admin console</h2>
              <p className="text-[11px] text-neutral-500">Officer sign-in required</p>
            </div>
          </div>

          <label className="block text-xs font-medium">
            Email
            <input
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              required
              autoComplete="username"
              placeholder="admin@ebureaucrat.local"
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
            />
          </label>

          {loginError && <p className="text-xs text-rose-600 dark:text-rose-400">{loginError}</p>}

          <button
            type="submit"
            disabled={signingIn}
            className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {signingIn ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-3">
            Sessions expire after 2 hours. Five failed attempts from one address locks sign-in for
            15 minutes. In production the console stays disabled until ADMIN_PASSWORD_HASH is set.
          </p>
        </form>
      </div>
    );
  }

  const counts = overview?.requestsByStatus || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <div>
            <h2 className="text-lg font-bold">Officer console</h2>
            <p className="text-[11px] text-neutral-500">
              Signed in as {email}
              {overview ? ` · up ${formatDuration(overview.uptimeSeconds)} · ${overview.node}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={signOut}
            className="text-xs font-medium rounded-lg bg-neutral-900 text-white px-3 py-1.5 flex items-center gap-1.5 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>

      {dataError && (
        <p className="text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-lg px-3 py-2">
          {dataError}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Live sessions', value: overview?.sessions ?? 0, icon: Users },
          { label: 'Simulated filings', value: overview?.filings ?? 0, icon: FileCheck2 },
          { label: 'Service requests', value: overview?.requests ?? 0, icon: Inbox },
          { label: 'Audit events', value: overview?.auditEvents ?? 0, icon: ScrollText },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4"
          >
            <card.icon className="w-4 h-4 text-neutral-500 mb-2" />
            <p className="text-2xl font-bold leading-none">{card.value}</p>
            <p className="text-[11px] text-neutral-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-neutral-200 dark:border-neutral-800 px-2.5 py-1 text-neutral-600 dark:text-neutral-400">
          Queue: {counts.submitted ?? 0} submitted · {counts.in_review ?? 0} in review · {counts.approved ?? 0} approved · {counts.rejected ?? 0} rejected
        </span>
        <span className="rounded-full border border-neutral-200 dark:border-neutral-800 px-2.5 py-1 text-neutral-600 dark:text-neutral-400">
          Gemini: {overview?.geminiActive ? 'connected' : 'offline fallback'}
        </span>
        <span className="rounded-full border border-neutral-200 dark:border-neutral-800 px-2.5 py-1 text-neutral-600 dark:text-neutral-400">
          Storage: {overview?.storage ?? 'json-file'}
        </span>
      </div>

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-sm font-bold">Service request queue</h3>
            <p className="text-[11px] text-neutral-500">Newest first. Decisions are written to the audit log.</p>
          </div>
          <input
            value={decisionNote}
            onChange={(event) => setDecisionNote(event.target.value)}
            placeholder="Decision note (optional)"
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-xs w-56"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-neutral-500 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-5 py-2.5 font-semibold">Reference</th>
                <th className="px-3 py-2.5 font-semibold">Service</th>
                <th className="px-3 py-2.5 font-semibold">Applicant</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Created</th>
                <th className="px-5 py-2.5 font-semibold text-right">Decision</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-neutral-500">
                    No requests yet. Submit one from the eCitizen Services tab.
                  </td>
                </tr>
              )}
              {requests.map((request) => (
                <tr key={request.reference} className="border-b border-neutral-100 dark:border-neutral-800/60 last:border-0">
                  <td className="px-5 py-3 font-mono font-bold whitespace-nowrap">{request.reference}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{request.serviceName}</p>
                    <p className="text-[11px] text-neutral-500">{request.serviceId}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{request.applicant}</p>
                    <p className="text-[11px] text-neutral-500 font-mono">{request.phone}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 uppercase ${REQUEST_BADGES[request.status]}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                    {request.decisionNote && (
                      <p className="text-[11px] text-neutral-500 mt-1 max-w-[16rem]">{request.decisionNote}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-neutral-500 whitespace-nowrap">
                    {new Date(request.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => decide(request.reference, 'in_review')}
                        disabled={busyRef === request.reference || request.status === 'in_review'}
                        title="Mark in review"
                        className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => decide(request.reference, 'approved')}
                        disabled={busyRef === request.reference || request.status === 'approved'}
                        title="Approve"
                        className="p-1.5 rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => decide(request.reference, 'rejected')}
                        disabled={busyRef === request.reference || request.status === 'rejected'}
                        title="Reject"
                        className="p-1.5 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-40 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-bold">Simulated filings</h3>
            <p className="text-[11px] text-neutral-500">KRA PINs are masked at the API boundary.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-5 py-2.5 font-semibold">Acknowledgment</th>
                  <th className="px-3 py-2.5 font-semibold">PIN</th>
                  <th className="px-3 py-2.5 font-semibold">Year</th>
                  <th className="px-5 py-2.5 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {filings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-neutral-500">
                      No simulated filings yet.
                    </td>
                  </tr>
                )}
                {filings.map((filing) => (
                  <tr key={filing.id} className="border-b border-neutral-100 dark:border-neutral-800/60 last:border-0">
                    <td className="px-5 py-3 font-mono">{filing.ackNumber}</td>
                    <td className="px-3 py-3 font-mono">{filing.pin}</td>
                    <td className="px-3 py-3">{filing.year}</td>
                    <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">
                      {new Date(filing.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-bold">Audit log</h3>
            <p className="text-[11px] text-neutral-500">Sign-ins, intake and decisions, newest first.</p>
          </div>
          <ul className="max-h-[22rem] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {events.length === 0 && <li className="px-5 py-8 text-center text-xs text-neutral-500">No events yet.</li>}
            {events.map((event) => (
              <li key={event.id} className="px-5 py-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] font-semibold">{event.action}</span>
                  <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                    {new Date(event.at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {event.actor} · {event.target}
                  {event.detail ? ` · ${event.detail}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
