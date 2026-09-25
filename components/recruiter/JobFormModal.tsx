import { useState, useEffect, use } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface Project {
  id: number;
  name: string;
}

interface Job {
  id: number;
  title: string;
  description: string;
  location: string | null;
  status: 'draft' | 'open' | 'closed' | 'archived';
  employment_type?: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
  seniority_level?: 'junior' | 'mid-level' | 'senior' | 'lead' | 'director';
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_type?: 'annual' | 'monthly' | 'hourly';
  responsibilities?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  application_deadline?: string | null;
  application_method?: 'url' | 'email' | 'platform';
  application_contact?: string | null;
  project_id?: number | null;
}

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh the job list
  job?: Job | null;
}

export const JobFormModal = ({ isOpen, onClose, onSave, job }: JobFormModalProps) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'draft' | 'open' | 'closed' | 'archived'>('open');
  const [employmentType, setEmploymentType] = useState<Job['employment_type']>('full-time');
  const [seniorityLevel, setSeniorityLevel] = useState<Job['seniority_level']>('mid-level');
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [salaryMax, setSalaryMax] = useState<number | ''>('');
  const [salaryCurrency, setSalaryCurrency] = useState('USD');
  const [salaryType, setSalaryType] = useState<Job['salary_type']>('annual');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');
  const [applicationMethod, setApplicationMethod] = useState<Job['application_method']>('platform');
  const [applicationContact, setApplicationContact] = useState('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);


  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('recruiter_projects')
        .select('id, name')
        .eq('recruiter_id', user.id)
        .eq('status', 'active');

      if (data) setProjects(data);
    };

    if (isOpen) {
      fetchProjects();
    }

    if (job) {
      setTitle(job.title);
      setDescription(job.description);
      setLocation(job.location || '');
      setStatus(job.status);
      setEmploymentType(job.employment_type || 'full-time');
      setSeniorityLevel(job.seniority_level || 'mid-level');
      setSalaryMin(job.salary_min || '');
      setSalaryMax(job.salary_max || '');
      setSalaryCurrency(job.salary_currency || 'USD');
      setSalaryType(job.salary_type || 'annual');
      setResponsibilities(job.responsibilities || '');
      setRequirements(job.requirements || '');
      setBenefits(job.benefits || '');
      setApplicationMethod(job.application_method || 'platform');
      setApplicationContact(job.application_contact || '');
      setProjectId(job.project_id || '');
    } else {
      // Reset for new job
      setTitle('');
      setDescription('');
      setLocation('');
      setStatus('open');
      setEmploymentType('full-time');
      setSeniorityLevel('mid-level');
      setSalaryMin('');
      setSalaryMax('');
      setSalaryCurrency('USD');
      setSalaryType('annual');
      setResponsibilities('');
      setRequirements('');
      setBenefits('');
      setApplicationMethod('platform');
      setApplicationContact('');
      setProjectId('');
    }
  }, [job, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    const jobData = { title, description, location, status, recruiter_id: user.id, employment_type: employmentType, seniority_level: seniorityLevel, salary_min: salaryMin || null, salary_max: salaryMax || null, salary_currency: salaryCurrency, salary_type: salaryType, responsibilities, requirements, benefits, application_method: applicationMethod, application_contact: applicationContact, project_id: projectId || null };
    let error;

    if (job) {
      // Update existing job
      const { error: updateError } = await supabase.from('jobs').update(jobData).eq('id', job.id);
      error = updateError;
    } else {
      // Create new job
      const { error: insertError } = await supabase.from('jobs').insert(jobData);
      error = insertError;
    }

    setIsLoading(false);

    if (error) {
      toast({ title: 'Error saving job', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Job ${job ? 'updated' : 'created'} successfully!` });
      onSave(); // Trigger refresh
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{job ? 'Edit Job' : 'Create New Job'}</DialogTitle>
            <DialogDescription>Fill in the details for your job posting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader><CardTitle>Core Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2"><Label htmlFor="projectId">Project (Optional)</Label>
                  <Select value={projectId?.toString()} onValueChange={(v) => setProjectId(v === 'none' ? '' : (v ? Number(v) : ''))}>
                    <SelectTrigger><SelectValue placeholder="Assign to a project" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label htmlFor="title">Job Title</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="location">Location</Label><Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., San Francisco, CA or Remote" /></div>
                <div className="space-y-2"><Label htmlFor="employmentType">Employment Type</Label>
                  <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as Job['employment_type'])}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label htmlFor="seniorityLevel">Seniority Level</Label>
                  <Select value={seniorityLevel} onValueChange={(v) => setSeniorityLevel(v as Job['seniority_level'])}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="mid-level">Mid-level</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="director">Director / Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Compensation</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label htmlFor="salaryMin">Min Salary</Label><Input id="salaryMin" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 80000" /></div>
                <div className="space-y-2"><Label htmlFor="salaryMax">Max Salary</Label><Input id="salaryMax" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 120000" /></div>
                <div className="space-y-2"><Label htmlFor="salaryCurrency">Currency</Label><Input id="salaryCurrency" value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value)} placeholder="e.g., USD" /></div>
                <div className="space-y-2"><Label htmlFor="salaryType">Salary Type</Label>
                  <Select value={salaryType} onValueChange={(v) => setSalaryType(v as Job['salary_type'])}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Job Content</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="description">Job Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={6} placeholder="Provide a general overview of the role." /></div>
                <div className="space-y-2"><Label htmlFor="responsibilities">Responsibilities</Label><Textarea id="responsibilities" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} rows={4} placeholder="List key responsibilities..." /></div>
                <div className="space-y-2"><Label htmlFor="requirements">Requirements / Qualifications</Label><Textarea id="requirements" value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={4} placeholder="List necessary qualifications..." /></div>
                <div className="space-y-2"><Label htmlFor="benefits">Benefits / Perks</Label><Textarea id="benefits" value={benefits} onChange={(e) => setBenefits(e.target.value)} rows={3} placeholder="What do you offer?" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Application & Settings</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="applicationMethod">Application Method</Label>
                  <Select value={applicationMethod} onValueChange={(v) => setApplicationMethod(v as Job['application_method'])}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">Apply on Trustedin</SelectItem>
                      <SelectItem value="url">External URL</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {applicationMethod !== 'platform' && <div className="space-y-2"><Label htmlFor="applicationContact">Application URL or Email</Label><Input id="applicationContact" value={applicationContact} onChange={(e) => setApplicationContact(e.target.value)} placeholder="https://... or jobs@..." /></div>}
              </CardContent>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2"><Label htmlFor="status">Job Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as 'draft' | 'open' | 'closed' | 'archived')}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open (Visible to candidates)</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {job ? 'Save Changes' : 'Create Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};