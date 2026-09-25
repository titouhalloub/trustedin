import { useState, useEffect, useMemo } from 'react';
import { Briefcase, Search } from 'lucide-react';
import JobListItem from '@/components/JobListItem';
import JobDetails from '@/components/JobDetails';
import { Job, JobWithProfile } from '@/lib/types';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';



const JobsPage = () => {
  const [jobs, setJobs] = useState<JobWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobWithProfile | null>(null);
  // State for filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 8;

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch('/api/jobs');
        if (response.ok) {
          const data = await response.json();
          setJobs(data);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const filteredAndSortedJobs = useMemo(() => {
    return jobs
      .filter(job => {
        const titleMatch = job.title.toLowerCase().includes(searchQuery.toLowerCase());
        const locationMatch = !locationFilter || (job.location && job.location.toLowerCase().includes(locationFilter.toLowerCase()));
        return titleMatch && locationMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'salary_high':
            return (b.salary_max || 0) - (a.salary_max || 0);
          case 'salary_low':
            return (a.salary_min || 0) - (b.salary_min || 0);
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'newest':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  }, [jobs, searchQuery, locationFilter, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, locationFilter, sortBy]);

  // Paginated jobs
  const lastJobIndex = currentPage * jobsPerPage;
  const firstJobIndex = lastJobIndex - jobsPerPage;
  const currentJobs = filteredAndSortedJobs.slice(firstJobIndex, lastJobIndex);
  const totalPages = Math.ceil(filteredAndSortedJobs.length / jobsPerPage);

  useEffect(() => {
    // If there are jobs but no job is selected, select the first one.
    if (!selectedJob && currentJobs.length > 0) {
      setSelectedJob(currentJobs[0]);
    }
    // If a job is selected but it's no longer in the filtered list, select the new first one.
    else if (selectedJob && !currentJobs.find(j => j.id === selectedJob.id)) {
      setSelectedJob(currentJobs.length > 0 ? currentJobs[0] : null);
    }
  }, [currentJobs, selectedJob]);

  const handleJobSelect = (job: JobWithProfile) => {
    setSelectedJob(job);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Briefcase className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Job Listings</h1>
        </div>

        <Card className="mb-8">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Filter by title..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="relative flex-grow w-full">
              <Input placeholder="Filter by location..." value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
            </div>
            <div className="flex-grow w-full md:w-auto md:min-w-[200px]">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="salary_high">Salary: High to Low</SelectItem>
                  <SelectItem value="salary_low">Salary: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Job List */}
          <div className="lg:col-span-5 xl:col-span-4">
            {loading ? (
              <div className="text-center py-10">Loading jobs...</div>
            ) : (
              <div className="space-y-4">
                {currentJobs.length > 0 ? (
                  currentJobs.map((job) => <JobListItem key={job.id} job={job} onSelect={handleJobSelect} isSelected={selectedJob?.id === job.id} />)
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    No jobs match your criteria.
                  </div>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                    {[...Array(totalPages).keys()].map(num => (
                      <PaginationItem key={num}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(num + 1);
                          }}
                          isActive={currentPage === num + 1}
                        >
                          {num + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>

          {/* Right Column: Job Details */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="sticky top-24">
              {selectedJob ? <JobDetails job={selectedJob} /> : <div className="text-center text-muted-foreground p-10 border rounded-lg">Select a job to see the details.</div>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default JobsPage;
