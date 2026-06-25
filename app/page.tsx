'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Users,
  Mail,
  MailOpen,
  MousePointerClick,
  TrendingUp,
  BarChart3,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  Building2,
  Phone,
  User,
  MessageSquare,
  AtSign,
  Settings,
  ExternalLink,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────────
// Singleton Supabase client (module-level to avoid multiple instances)
// ──────────────────────────────────────────────────────────────────────────────
function buildSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    !url || !key ||
    url === 'your_supabase_url' ||
    key === 'your_supabase_anon_key' ||
    !url.startsWith('http')
  ) {
    return null;
  }
  return createClient(url, key);
}

const supabaseClient = buildSupabaseClient();

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  requirement: string;
  category?: string;
  priority?: string;
  email_sent: boolean;
  email_opened: boolean;
  link_clicked: boolean;
  created_at: string;
}

interface Stats {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const PRIORITY_COLORS: Record<string, string> = {
  High: 'var(--priority-high)',
  Medium: 'var(--priority-medium)',
  Low: 'var(--priority-low)',
};

// ──────────────────────────────────────────────────────────────────────────────
// Setup Banner (shown when env vars are missing)
// ──────────────────────────────────────────────────────────────────────────────
function SetupBanner() {
  return (
    <div className="setup-banner">
      <div className="setup-icon">
        <Settings size={32} />
      </div>
      <h2 className="setup-title">Almost there! Configure your API keys</h2>
      <p className="setup-desc">
        Open <code>.env.local</code> in your project root and fill in your credentials:
      </p>
      <div className="setup-code">
        <pre>{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_BASE_URL=http://localhost:3000`}</pre>
      </div>
      <div className="setup-links">
        <a href="https://supabase.com" target="_blank" rel="noreferrer" className="setup-link">
          <ExternalLink size={14} /> Supabase
        </a>
        <a href="https://resend.com" target="_blank" rel="noreferrer" className="setup-link">
          <ExternalLink size={14} /> Resend
        </a>
        <a href="https://platform.openai.com" target="_blank" rel="noreferrer" className="setup-link">
          <ExternalLink size={14} /> OpenAI
        </a>
      </div>
      <p className="setup-sql-title">Then run this SQL in Supabase → SQL Editor:</p>
      <div className="setup-code">
        <pre>{`CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  requirement TEXT,
  category TEXT,
  priority TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_opened BOOLEAN DEFAULT FALSE,
  link_clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}</pre>
      </div>
      <p className="setup-footer">After saving <code>.env.local</code>, restart the dev server with <code>npm run dev</code></p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const supabase = supabaseClient;
  const isConfigured = supabase !== null;

  const [stats, setStats] = useState<Stats>({
    total: 0, sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSubmittedLead, setLastSubmittedLead] = useState<{
    category: string;
    priority: string;
    emailSent?: boolean;
    emailWarning?: string;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const total = data.length;
      const sent = data.filter((d: Lead) => d.email_sent).length;
      const opened = data.filter((d: Lead) => d.email_opened).length;
      const clicked = data.filter((d: Lead) => d.link_clicked).length;
      setStats({
        total, sent, opened, clicked,
        openRate: sent ? Math.round((opened / sent) * 100) : 0,
        clickRate: sent ? Math.round((clicked / sent) * 100) : 0,
      });
      setLeads(data.slice(0, 5));
    }
  }, [supabase]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (!isConfigured) return;
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats, isConfigured]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitStatus('loading');
    setLastSubmittedLead(null);

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Submission failed');

      setSubmitStatus('success');
      setLastSubmittedLead({
        category: result.category,
        priority: result.priority,
        emailSent: result.emailSent,
        emailWarning: result.emailWarning,
      });
      (e.target as HTMLFormElement).reset();
      setTimeout(fetchStats, 2000);
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 4000);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <div className="brand-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="brand-title">LeadManager</h1>
              <p className="brand-subtitle">AI-Powered Lead Intelligence</p>
            </div>
          </div>
          {isConfigured && (
            <button className="refresh-btn" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        {/* Show setup guide if not configured */}
        {!isConfigured ? (
          <SetupBanner />
        ) : (
          <>
            {/* Stats Row */}
            <section className="stats-grid">
              <StatCard icon={<Users size={20} />} label="Total Leads" value={stats.total} color="purple" />
              <StatCard icon={<Mail size={20} />} label="Emails Sent" value={stats.sent} color="blue" />
              <StatCard icon={<MailOpen size={20} />} label="Emails Opened" value={stats.opened} color="cyan" />
              <StatCard icon={<MousePointerClick size={20} />} label="Links Clicked" value={stats.clicked} color="green" />
              <StatCard icon={<TrendingUp size={20} />} label="Open Rate" value={`${stats.openRate}%`} color="amber" isRate />
              <StatCard icon={<BarChart3 size={20} />} label="Click Rate" value={`${stats.clickRate}%`} color="rose" isRate />
            </section>

            {/* Two-column layout */}
            <div className="two-col-layout">
              {/* Lead Submission Form */}
              <div className="card form-card">
                <div className="card-header">
                  <div className="card-title-row">
                    <Send size={18} className="card-icon" />
                    <h2 className="card-title">Submit New Lead</h2>
                  </div>
                  <p className="card-desc">Fill in the details — AI will categorize it automatically.</p>
                </div>

                <form onSubmit={handleSubmit} className="lead-form">
                  <div className="form-row">
                    <FormField icon={<User size={15} />} name="name" placeholder="Full Name" required />
                    <FormField icon={<AtSign size={15} />} name="email" type="email" placeholder="Email Address" required />
                  </div>
                  <div className="form-row">
                    <FormField icon={<Phone size={15} />} name="phone" placeholder="Phone Number" />
                    <FormField icon={<Building2 size={15} />} name="company" placeholder="Company (Optional)" />
                  </div>
                  <div className="form-field-wrapper">
                    <div className="field-icon"><MessageSquare size={15} /></div>
                    <textarea
                      name="requirement"
                      placeholder="Describe your requirement or message..."
                      required
                      rows={4}
                      className="form-textarea"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`submit-btn ${submitStatus === 'loading' ? 'loading' : ''}`}
                    disabled={submitStatus === 'loading'}
                  >
                    {submitStatus === 'loading' ? (
                      <><Loader2 size={18} className="spinning" /><span>Processing with AI...</span></>
                    ) : (
                      <><Send size={18} /><span>Submit Lead</span></>
                    )}
                  </button>

                  {submitStatus === 'success' && (
                    <div className="status-msg success">
                      <CheckCircle size={16} />
                      <div>
                        <strong>Lead saved!</strong>
                        {lastSubmittedLead?.emailSent
                          ? ' Email sent with tracking.'
                          : lastSubmittedLead?.emailWarning
                          ? <span style={{color:'#fbbf24'}}> Lead saved — email not sent (Resend: verify your domain at resend.com).</span>
                          : ' Saved to database.'}
                        {lastSubmittedLead && (
                          <span className="ai-tags">
                            <span className="tag category-tag">{lastSubmittedLead.category}</span>
                            <span
                              className="tag priority-tag"
                              style={{ background: PRIORITY_COLORS[lastSubmittedLead.priority] || 'var(--priority-medium)' }}
                            >
                              {lastSubmittedLead.priority} Priority
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {submitStatus === 'error' && (
                    <div className="status-msg error">
                      <AlertCircle size={16} />
                      <span>Submission failed. Check your API keys and try again.</span>
                    </div>
                  )}
                </form>
              </div>

              {/* Recent Leads Table */}
              <div className="card leads-card">
                <div className="card-header">
                  <div className="card-title-row">
                    <Users size={18} className="card-icon" />
                    <h2 className="card-title">Recent Leads</h2>
                  </div>
                  <p className="card-desc">Last 5 submissions with tracking status.</p>
                </div>

                {leads.length === 0 ? (
                  <div className="empty-state">
                    <Users size={40} className="empty-icon" />
                    <p>No leads yet. Submit your first one!</p>
                  </div>
                ) : (
                  <div className="leads-table-wrapper">
                    <table className="leads-table">
                      <thead>
                        <tr>
                          <th>Lead</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Tracking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead) => (
                          <tr key={lead.id}>
                            <td>
                              <div className="lead-name">{lead.name}</div>
                              <div className="lead-email">{lead.email}</div>
                            </td>
                            <td>
                              <span className="tag category-tag">{lead.category || '—'}</span>
                            </td>
                            <td>
                              <span
                                className="tag priority-tag"
                                style={{ background: PRIORITY_COLORS[lead.priority || ''] || 'var(--priority-medium)' }}
                              >
                                {lead.priority || '—'}
                              </span>
                            </td>
                            <td>
                              <div className="tracking-badges">
                                <TrackBadge active={lead.email_sent} label="Sent" />
                                <TrackBadge active={lead.email_opened} label="Opened" />
                                <TrackBadge active={lead.link_clicked} label="Clicked" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, isRate }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; isRate?: boolean;
}) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon-wrap">{icon}</div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className={`stat-value ${isRate ? 'rate-value' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function FormField({ icon, name, placeholder, type = 'text', required }: {
  icon: React.ReactNode; name: string; placeholder: string; type?: string; required?: boolean;
}) {
  return (
    <div className="form-field-wrapper">
      <div className="field-icon">{icon}</div>
      <input name={name} type={type} placeholder={placeholder} required={required} className="form-input" />
    </div>
  );
}

function TrackBadge({ active, label }: { active: boolean; label: string }) {
  return <span className={`track-badge ${active ? 'active' : 'inactive'}`}>{label}</span>;
}
