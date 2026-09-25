import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Loader2, PlusCircle, Edit, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { JobFormModal } from './JobFormModal';
import { ViewApplicantsModal } from './ViewApplicantsModal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// We'll define the Job type based on your DB schema
interface Job {
  id: number;
  title: string;
  location: string | null;
  description: string;
  status: 'draft' | 'open' | 'closed' | 'archived';
  created_at: string;
  job_applications: [{ count: number }]; // For applicant count
  project_id: number | null;
  recruiter_projects: {
    id: number;
    name: string;
  } | null;
}

const PaginatedJobTable = ({ jobs }: { jobs: Job[] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentJobs = jobs.slice(firstItemIndex, lastItemIndex);
  const totalPages = Math.ceil(jobs.length / itemsPerPage);

  const getStatusVariant = (status: Job['status']) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'closed':
        return 'destructive';
      case 'draft':
      default:
        return 'secondary';
    }
  };

  return null; // This component is not used in the final implementation, but the logic is moved inside JobPostings
};

export const JobPostings = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // State for modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [viewingApplicantsFor, setViewingApplicantsFor] = useState<{ id: number; title: string } | null>(null);
  const [paginationState, setPaginationState] = useState<Record<string, number>>({});

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, job_applications(count), recruiter_projects(id, name)')
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching jobs',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCreateJob = () => {
    setEditingJob(null);
    setIsFormModalOpen(true);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setIsFormModalOpen(true);
  };

  const jobsByProject = jobs.reduce((acc, job) => {
    const projectId = job.project_id || 'unassigned';
    if (!acc[projectId]) acc[projectId] = { name: job.recruiter_projects?.name || 'Unassigned Jobs', jobs: [] };
    acc[projectId].jobs.push(job);
    return acc;
  }, {} as Record<string | number, { name: string; jobs: Job[] }>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Job Postings</CardTitle>
          <CardDescription>Manage your company's job listings.</CardDescription>
        </div>
        <Button onClick={handleCreateJob}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Job
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>You haven't created any job postings yet.</p>
            <Button variant="link" className="mt-2" onClick={handleCreateJob}>Create your first job</Button>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(jobsByProject)} className="w-full">
            {Object.entries(jobsByProject).map(([projectId, projectData]) => {
              const itemsPerPage = 5;
              const currentPage = paginationState[projectId] || 1;
              const totalPages = Math.ceil(projectData.jobs.length / itemsPerPage);
              const currentJobs = projectData.jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

              const handlePageChange = (page: number) => {
                setPaginationState(prev => ({ ...prev, [projectId]: page }));
              };

              const getStatusVariant = (status: Job['status']) => {
                switch (status) {
                  case 'open': return 'default';
                  case 'closed': return 'destructive';
                  case 'draft': default: return 'secondary';
                }
              };

              return (
                <AccordionItem value={projectId.toString()} key={projectId}>
                  <AccordionTrigger className="text-lg font-semibold">{projectData.name} ({projectData.jobs.length})</AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Applicants</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium">{job.title}</TableCell>
                            <TableCell><Badge variant={getStatusVariant(job.status)}>{job.status}</Badge></TableCell>
                            <TableCell>{job.job_applications[0]?.count || 0}</TableCell>
                            <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => { setViewingApplicantsFor({ id: job.id, title: job.title }); setIsApplicantsModalOpen(true); }}><Users className="mr-2 h-4 w-4" /> Applicants</Button>
                                <Button variant="outline" size="sm" onClick={() => handleEditJob(job)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {totalPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(Math.max(1, currentPage - 1)); }} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
                            {[...Array(totalPages).keys()].map(num => (
                              <PaginationItem key={num}>
                                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(num + 1); }} isActive={currentPage === num + 1}>
                                  {num + 1}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(Math.min(totalPages, currentPage + 1)); }} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
      <JobFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={fetchJobs}
        job={editingJob}
      />
      <ViewApplicantsModal
        isOpen={isApplicantsModalOpen}
        onClose={() => setIsApplicantsModalOpen(false)}
        jobId={viewingApplicantsFor?.id || null}
        jobTitle={viewingApplicantsFor?.title || null}
      />
    </Card>
  );
};

export default JobPostings;