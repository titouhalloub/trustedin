import { useEffect, useMemo, useState } from 'react';
import { useSessionContext, useUser } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, Github, BriefcaseBusiness, GraduationCap, BadgeCheck, Clock3, FileText } from 'lucide-react';

type EvidenceStatus = 'approved' | 'pending' | 'declined' | 'rejected' | 'unknown';

interface DossierData {
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    headline: string | null;
    trust_score: number | null;
    badge_level: string | null;
    verification_level: string | null;
    created_at: string | null;
    followers_count: number | null;
    following_count: number | null;
    github_username: string | null;
  };
  github: { username: string; followers: number | null; public_repos: number | null; synced_at: string | null } | null;
  experiences: Array<{ id: string; title: string; company: string; start_date: string; end_date: string | null; is_current: boolean | null; description: string | null }>;
  education: Array<{ id: string; school: string; degree: string; field_of_study: string | null; start_date: string; end_date: string | null }>;
  skills: Array<{ id: string; name: string; created_at: string | null }>;
  verificationSubmissions: Array<{ id: string; verification_type: string; status: string; created_at: string; reviewed_at: string | null }>;
  professionalVerifications: Array<{ id: string; verifier_id: string; candidate_id: string; related_entity_id: string | null; status: string; created_at: string }>;
  scoreHistory: Array<{ delta: number; reason: string; created_at: string; new_score: number }>;
  scoreExplanation: { storedScore: number | null; scoreFromCurrentInputs: number; maxScore: number; formula: string; isStale: boolean };
}

function labelStatus(status?: string | null) {
  const value = (status || 'unknown').toLowerCase();
  if (value === 'approved' || value === 'verified') return 'Confirmed';
  if (value === 'pending' || value === 'in_review' || value === 'in review') return 'Pending review';
  if (value === 'declined' || value === 'rejected') return 'Not approved';
  return 'Not verified';
}

function StatusPill({ status }: { status?: string | null }) {
  const value = (status || '').toLowerCase();
  const style = value === 'approved' || value === 'verified'
    ? 'bg-emerald-100 text-emerald-800'
    : value === 'pending' || value === 'in_review' || value === 'in review'
      ? 'bg-amber-100 text-amber-800'
      : value === 'declined' || value === 'rejected'
        ? 'bg-rose-100 text-rose-800'
        : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{labelStatus(status)}</span>;
}

function dateLabel(value?: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
}

export default function TrustReport() {
  const user = useUser();
  const { isLoading: sessionLoading } = useSessionContext();
  const [data, setData] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Do not treat a temporarily unresolved user as signed out.
    if (sessionLoading) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setData(null);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    // Clear the previous user's dossier and any prior error before fetching.
    setLoading(true);
    setData(null);
    setError(null);

    (async () => {
      try {
        const response = await fetch(`/api/trust-report/${encodeURIComponent(user.id)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not load Trust Dossier.');
        if (!cancelled) setData(payload as DossierData);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load Trust Dossier.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, sessionLoading]);

  const latestSubmission = data?.verificationSubmissions[0];
  const confirmedSubmissions = useMemo(
    () => data?.verificationSubmissions.filter((item) => item.status?.toLowerCase() === 'approved') ?? [],
    [data?.verificationSubmissions]
  );

  if (loading) return <main className="min-h-screen p-8 flex items-center justify-center"><p>Loading Trust Dossier…</p></main>;
  if (!user) return <main className="min-h-screen p-8 flex items-center justify-center"><Card className="max-w-lg w-full"><CardHeader><CardTitle>Sign in to view your Trust Dossier</CardTitle></CardHeader></Card></main>;
  if (error || !data) return <main className="min-h-screen p-8 flex items-center justify-center"><Card className="max-w-lg w-full"><CardHeader><CardTitle>Trust Dossier unavailable</CardTitle></CardHeader><CardContent>{error || 'No dossier data was returned.'}</CardContent></Card></main>;

  const profile = data.profile;
  const score = Math.max(0, Math.min(1000, Number(data.scoreExplanation.storedScore ?? 0)));
  const confirmedDidit = confirmedSubmissions.some((item) => item.verification_type?.toLowerCase().includes('didit'));

  const itemVerificationStatus = (entityId: string) => {
    const related = data.professionalVerifications.filter((item) => item.related_entity_id === entityId);
    if (related.some((item) => item.status?.toLowerCase() === 'approved')) return 'approved';
    if (related.some((item) => item.status?.toLowerCase() === 'pending')) return 'pending';
    return 'self-reported';
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-700">TrustedIn · Evidence dossier</p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{profile.full_name || profile.username || 'Your Trust Dossier'}</h1>
          {profile.headline && <p className="text-lg text-slate-600">{profile.headline}</p>}
          {profile.bio && <p className="max-w-3xl text-slate-600">{profile.bio}</p>}
          <p className="text-sm text-slate-500">A transparent view of available evidence. A claim is not independently confirmed unless a verification record says so.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-indigo-700" />
              <div><CardTitle>Stored trust score</CardTitle><p className="text-sm text-slate-500">Scale: 0–1000, not a percentage</p></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-2"><span className="text-5xl font-bold text-indigo-800">{data.scoreExplanation.storedScore ?? '—'}</span><span className="pb-1 text-slate-500">/ {data.scoreExplanation.maxScore}</span></div>
              <Progress value={score / 10} className="h-3" />
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{profile.badge_level || 'No badge recorded'}</span>{data.scoreExplanation.isStale && <StatusPill status="pending" />}</div>
              <p className="text-sm text-slate-600">{data.scoreExplanation.isStale ? `The stored score differs from the score implied by current GitHub inputs (${data.scoreExplanation.scoreFromCurrentInputs}). Recalculation is needed.` : `Current inputs imply ${data.scoreExplanation.scoreFromCurrentInputs} points under the production formula.`}</p>
              <details className="text-sm text-slate-600"><summary className="cursor-pointer font-medium">How this score is currently calculated</summary><p className="mt-2">{data.scoreExplanation.formula}. This is the existing production formula, not a holistic measure of trustworthiness.</p></details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Identity verification</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <StatusPill status={confirmedSubmissions.length ? 'approved' : latestSubmission?.status} />
              <p className="text-sm text-slate-600">{confirmedDidit ? 'A Didit verification submission is marked approved.' : confirmedSubmissions.length ? 'At least one submitted verification is marked approved.' : 'No approved identity evidence was found in the available verification records.'}</p>
              {latestSubmission && <p className="text-xs text-slate-500">Latest submission: {latestSubmission.verification_type} · {dateLabel(latestSubmission.created_at)}</p>}
              {profile.verification_level === 'verified' && !confirmedSubmissions.length && <p className="text-xs text-amber-700">The profile has a legacy verified flag, but no matching approved submission was found. It is not treated as independent evidence here.</p>}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3"><Github className="h-5 w-5" /><CardTitle>Connected accounts</CardTitle></CardHeader>
            <CardContent>
              {data.github ? <div className="space-y-2">
                <div className="flex items-center justify-between gap-2"><a className="font-semibold text-indigo-700 underline" href={`https://github.com/${encodeURIComponent(data.github.username)}`} target="_blank" rel="noreferrer">@{data.github.username}</a><StatusPill status="approved" /></div>
                <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Followers</p><p className="text-xl font-semibold">{data.github.followers ?? 0}</p></div><div><p className="text-slate-500">Public repositories</p><p className="text-xl font-semibold">{data.github.public_repos ?? 0}</p></div></div>
                <p className="text-xs text-slate-500">Last synced: {dateLabel(data.github.synced_at)}. Metrics are provider-reported; they do not independently prove skill or code quality.</p>
              </div> : <p className="text-sm text-slate-600">No connected GitHub account record found.</p>}
              <div className="mt-3 border-t pt-3 text-sm text-slate-600">LinkedIn: no connected-account evidence is available in the inspected live schema, so no LinkedIn score is shown.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3"><BadgeCheck className="h-5 w-5" /><CardTitle>Verification history</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.verificationSubmissions.length ? data.verificationSubmissions.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
                <div><p className="font-medium">{item.verification_type || 'Verification submission'}</p><p className="text-xs text-slate-500">Submitted {dateLabel(item.created_at)}{item.reviewed_at ? ` · Reviewed ${dateLabel(item.reviewed_at)}` : ''}</p></div><StatusPill status={item.status} />
              </div>) : <p className="text-sm text-slate-600">No verification submissions recorded.</p>}
              {data.professionalVerifications.length > 0 && <div className="pt-2"><p className="mb-2 text-sm font-semibold">Professional verification requests</p>{data.professionalVerifications.map((item) => <div key={item.id} className="flex justify-between gap-3 py-1 text-sm"><span>{item.candidate_id === user.id ? 'Received' : 'Sent'} · {dateLabel(item.created_at)}</span><StatusPill status={item.status} /></div>)}</div>}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3"><BriefcaseBusiness className="h-5 w-5" /><CardTitle>Professional experience</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {data.experiences.length ? data.experiences.map((item) => <article key={item.id} className="border-b pb-4 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{item.title}</h3><p className="text-sm text-slate-600">{item.company}</p></div><StatusPill status={itemVerificationStatus(item.id)} /></div>
                <p className="mt-1 text-xs text-slate-500">{dateLabel(item.start_date)} – {item.is_current ? 'Present' : dateLabel(item.end_date)}</p>
                {item.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.description}</p>}
              </article>) : <p className="text-sm text-slate-600">No experience records found.</p>}
              <p className="text-xs text-slate-500">Items without an approved related verification remain self-reported.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3"><GraduationCap className="h-5 w-5" /><CardTitle>Education</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {data.education.length ? data.education.map((item) => <article key={item.id} className="border-b pb-4 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{item.degree}</h3><p className="text-sm text-slate-600">{item.school}</p>{item.field_of_study && <p className="text-sm text-slate-500">{item.field_of_study}</p>}</div><StatusPill status={itemVerificationStatus(item.id)} /></div>
                <p className="mt-1 text-xs text-slate-500">{dateLabel(item.start_date)} – {dateLabel(item.end_date)}</p>
              </article>) : <p className="text-sm text-slate-600">No education records found.</p>}
              <p className="text-xs text-slate-500">Items without an approved related verification remain self-reported.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3"><FileText className="h-5 w-5" /><CardTitle>Skills</CardTitle></CardHeader>
            <CardContent>
              {data.skills.length ? <div className="flex flex-wrap gap-2">{data.skills.map((skill) => <span key={skill.id} className="rounded-full border bg-white px-3 py-1 text-sm">{skill.name} <span className="text-xs text-slate-400">· self-reported</span></span>)}</div> : <p className="text-sm text-slate-600">No skills listed.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-3"><Clock3 className="h-5 w-5" /><CardTitle>Score history</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.scoreHistory.length ? data.scoreHistory.map((item, index) => <div key={`${item.created_at}-${index}`} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
                <div><p className="text-sm font-medium">{item.reason || 'Score update'}</p><p className="text-xs text-slate-500">{dateLabel(item.created_at)}</p></div>
                <div className="text-right"><p className={`font-semibold ${item.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{item.delta > 0 ? '+' : ''}{item.delta}</p><p className="text-xs text-slate-500">New score: {item.new_score}</p></div>
              </div>) : <p className="text-sm text-slate-600">No score history recorded.</p>}
            </CardContent>
          </Card>
        </section>

        <footer className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <strong>Evidence standard:</strong> connected-account metrics are provider-reported; experience, education and skills are self-reported unless a matching approved professional verification exists; identity confirmation is shown only when an approved verification submission exists. No LinkedIn score, invented endorsement total, or fabricated activity score is included.
        </footer>
      </div>
    </main>
  );
}
