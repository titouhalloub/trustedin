import { JobWithProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, MapPin, DollarSign, Clock } from 'lucide-react';

const Section = ({ title, content }: { title: string; content: string | null | undefined }) => {
  if (!content) return null;
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {/* The 'whitespace-pre-wrap' class is key to respecting newlines */}
      <p className="text-muted-foreground text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
};

const JobDetails = ({ job }: { job: JobWithProfile }) => {
  const formatSalary = () => {
    if (!job.salary_min && !job.salary_max) return null;
    const min = job.salary_min ? `$${(job.salary_min / 1000)}k` : '';
    const max = job.salary_max ? `$${(job.salary_max / 1000)}k` : '';
    const range = [min, max].filter(Boolean).join(' - ');
    return `${range} ${job.salary_currency?.toUpperCase() || ''} ${job.salary_type || ''}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl">{job.title}</CardTitle>
        <CardDescription>
          Posted by {job.profiles?.full_name || 'A Recruiter'} on {new Date(job.created_at).toLocaleDateString()}
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {job.location && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {job.location}
            </Badge>
          )}
          {job.employment_type && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> {job.employment_type}
            </Badge>
          )}
          {job.seniority_level && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {job.seniority_level}
            </Badge>
          )}
          {formatSalary() && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> {formatSalary()}
            </Badge>
          )}
          {job.application_deadline && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Apply by {new Date(job.application_deadline).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Button className="w-full md:w-auto">Apply Now</Button>
        </div>
        
        <Section title="Job Description" content={job.description} />
        <Section title="Responsibilities" content={job.responsibilities} />
        <Section title="Requirements" content={job.requirements} />
        <Section title="Benefits" content={job.benefits} />

      </CardContent>
    </Card>
  );
};

export default JobDetails;