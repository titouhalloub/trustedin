import { JobWithProfile } from '@/lib/types';
import { Briefcase, MapPin, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobListItemProps {
  job: JobWithProfile;
  onSelect: (job: JobWithProfile) => void;
  isSelected: boolean;
}

const JobListItem = ({ job, onSelect, isSelected }: JobListItemProps) => {
  return (
    <button
      onClick={() => onSelect(job)}
      className={cn("w-full text-left bg-background border rounded-lg p-6 shadow-sm hover:bg-muted/50 transition-all", isSelected && "ring-2 ring-primary bg-muted/50")}
    >
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-primary">{job.title}</h2>
          <p className="text-muted-foreground text-sm">
            Posted by {job.profiles?.full_name || 'A Recruiter'}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date(job.created_at).toLocaleDateString()}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span>{job.employment_type} - {job.seniority_level}</span>
        </div>
        {job.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{job.location}</span>
          </div>
        )}
        {(job.salary_min && job.salary_max) && (
            <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{job.salary_min} - {job.salary_max} {job.salary_currency} {job.salary_type}</span>
            </div>
        )}
      </div>
    </button>
  );
};

export default JobListItem;