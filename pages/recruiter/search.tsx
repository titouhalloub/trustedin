
import { useEffect, useState } from 'react';
import RecruiterDashboardLayout from './RecruiterDashboardLayout';
import { CandidateCard } from '@/components/marketplace/CandidateCard'; // ✅ FIXED
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Input } from '@/components/ui/input'; // ✅ FIXED
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, SlidersHorizontal, X } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useDebounce } from 'use-debounce';
import { useToast } from '@/components/ui/use-toast';

interface Project {
  id: number;
  name: string;
}

interface SavedSearch {
  id: number;
  name: string;
  query_params: {
    searchQuery: string;
    skills: string;
    sortBy: string;
    // Add other filter properties as needed
    [key: string]: any;
  };
}
interface Candidate {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  trust_score: number;
  reputation_points: number;
}

interface SearchFilters {
  searchQuery: string;
  skills: string;
  jobTitle: string;
  company: string;
  school: string;
  location: string;
  industry: string;
  languages: string;
  minExperience: string;
  maxExperience: string;
  graduationYear: string;
  isVeteran: '' | 'true' | 'false' | 'any';
  openToWork: '' | 'on-site' | 'remote' | 'hybrid' | 'any';
}

const CandidateSearchPage = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { toast } = useToast();

  // Project and Saved Search State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Search and Filter State
  const initialFilters: SearchFilters = {
    searchQuery: '',
    skills: '',
    jobTitle: '',
    company: '',
    school: '',
    location: '',
    industry: '',
    languages: '',
    minExperience: '',
    maxExperience: '',
    graduationYear: '',
    isVeteran: '',
    openToWork: '',
  };
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [debouncedFilters] = useDebounce(filters, 500);

  // Results State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'score_desc', 'score_asc'
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const candidatesPerPage = 12;


  // Fetch recruiter's projects
  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('recruiter_projects')
        .select('id, name')
        .eq('recruiter_id', user.id)
        .eq('status', 'active');
      setProjects(data || []);
    };
    fetchProjects();
  }, [user, supabase]);

  // Fetch saved searches when a project is selected
  useEffect(() => {
    if (!selectedProjectId) {
      setSavedSearches([]);
      return;
    }
    const fetchSavedSearches = async () => {
      const { data } = await supabase.from('saved_searches').select('*').eq('project_id', selectedProjectId);
      setSavedSearches(data || []);
    };
    fetchSavedSearches();
  }, [selectedProjectId, supabase]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters, sortBy]);

  useEffect(() => {
    if (!supabase) return;

    const runSearch = async () => {
      setLoading(true);

      console.log('[DEBUG] Debounced Filters:', debouncedFilters);

      // Prepare params for the RPC
      const searchParams = {
        p_query: debouncedFilters.searchQuery.trim() || '',
        p_skills: debouncedFilters.skills.trim()
          ? debouncedFilters.skills
              .split(',')
              .map(s => s.trim())
              .filter(s => s)
          : [],
        p_job_title: debouncedFilters.jobTitle.trim() || '',
        p_company: debouncedFilters.company.trim() || '',
        p_school: debouncedFilters.school.trim() || '',
        p_location: debouncedFilters.location.trim() || '',
        p_industry: debouncedFilters.industry.trim() || '',
        p_languages: debouncedFilters.languages.trim()
          ? debouncedFilters.languages.split(',').map(s => s.trim()).filter(s => s)
          : [],
        p_min_experience: debouncedFilters.minExperience ? parseInt(debouncedFilters.minExperience, 10) : null,
        p_max_experience: debouncedFilters.maxExperience ? parseInt(debouncedFilters.maxExperience, 10) : null,
        p_graduation_year: debouncedFilters.graduationYear ? parseInt(debouncedFilters.graduationYear, 10) : null,
        p_is_veteran: debouncedFilters.isVeteran === '' || debouncedFilters.isVeteran === 'any' ? null : debouncedFilters.isVeteran === 'true',
        p_open_to_work: debouncedFilters.openToWork === '' || debouncedFilters.openToWork === 'any' ? null : debouncedFilters.openToWork,
        p_limit: candidatesPerPage,
        p_offset: (currentPage - 1) * candidatesPerPage,
      };

      console.log('[DEBUG] RPC Parameters:', searchParams);

      let query = supabase.rpc('search_candidates_advanced', searchParams);

      // --- NEW SORTING LOGIC ---
      if (sortBy === 'score_desc') {
        query = query.order('trust_score', { ascending: false });
      } else if (sortBy === 'score_asc') {
        query = query.order('trust_score', { ascending: true });
      }
      // --- END OF NEW SORTING LOGIC ---

      const { data, error, count } = await query.range((currentPage - 1) * candidatesPerPage, currentPage * candidatesPerPage - 1);

      console.log('[DEBUG] RPC Response:', { data, error });

      if (error) {
        console.error('Error fetching candidates:', error);
        setCandidates([]);
        setTotalCandidates(0);
      } else {
        setCandidates(data || []);
        // The count from RPC with range might not be total. A separate count query is better.
        const { count: totalCount } = await supabase.rpc('search_candidates_advanced', searchParams, { count: 'exact', head: true });
        setTotalCandidates(totalCount || 0);
      }
      setLoading(false);
    };

    // Only run search if there's some filter criteria
    if (Object.values(debouncedFilters).some(v => v && v !== 'any')) {
      runSearch();
    } else {
      setCandidates([]); // Clear results if no filters
    }
  }, [debouncedFilters, supabase, sortBy, currentPage]);

  const totalPages = Math.ceil(totalCandidates / candidatesPerPage);

  const handleSaveSearch = async () => {
    if (!selectedProjectId || !Object.values(filters).some(v => v.trim() !== '')) {
      toast({
        title: 'Cannot Save Search',
        description: 'Please select a project and enter a search query.',
        variant: 'destructive',
      });
      return;
    }

    const searchName = prompt('Enter a name for this search:');
    if (!searchName || !searchName.trim()) return;

    const { error } = await supabase.from('saved_searches').insert({
      name: searchName,
      project_id: selectedProjectId,
      recruiter_id: user?.id,
      query_params: { ...filters, sortBy }, // Save all filters
    });

    if (error) {
      toast({ title: 'Error saving search', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Search Saved!', description: `"${searchName}" has been saved to your project.` });
      // Refetch saved searches for the project
      const { data } = await supabase.from('saved_searches').select('*').eq('project_id', selectedProjectId);
      setSavedSearches(data || []);
    }
  };

  const handleLoadSearch = (searchId: string) => {
    const searchToLoad = savedSearches.find(s => s.id.toString() === searchId);
    if (searchToLoad) {
      const { sortBy, ...loadedFilters } = searchToLoad.query_params as any;
      // Reset all filters then apply the loaded ones
      setFilters({ ...initialFilters, ...loadedFilters });
      setSortBy(searchToLoad.query_params.sortBy);
    }
  };

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <RecruiterDashboardLayout>
      <h1 className="text-2xl font-bold mb-4">Search Candidates</h1>

      <div className="space-y-4 mb-6 p-4 border rounded-lg bg-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger><SelectValue placeholder="Select a project to work on" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Saved Searches</Label>
            <Select onValueChange={handleLoadSearch} disabled={!selectedProjectId || savedSearches.length === 0}>
              <SelectTrigger><SelectValue placeholder="Load a saved search" /></SelectTrigger>
              <SelectContent>
                {savedSearches.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow space-y-2">
            <Label htmlFor="main-search">Keyword Search (Supports AND, OR, &)</Label>
            <Input
              id="main-search"
              placeholder="e.g., 'React' & ('Node' | 'NestJS') & !'Angular'"
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => setFilters(initialFilters)} variant="outline">Clear All</Button>
            <Button onClick={handleSaveSearch} disabled={!selectedProjectId}><Save className="mr-2 h-4 w-4" /> Save</Button>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="advanced-filters">
            <AccordionTrigger>
              <span className="flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4" /> Advanced Search Filters</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 pt-4">
                <div className="space-y-2"><Label>Skills (comma-separated)</Label><Input placeholder="React, Node.js, Python" value={filters.skills} onChange={e => handleFilterChange('skills', e.target.value)} /></div>
                <div className="space-y-2"><Label>Job Title</Label><Input placeholder="Software Engineer" value={filters.jobTitle} onChange={e => handleFilterChange('jobTitle', e.target.value)} /></div>
                <div className="space-y-2"><Label>Company</Label><Input placeholder="Acme Inc." value={filters.company} onChange={e => handleFilterChange('company', e.target.value)} /></div>
                <div className="space-y-2"><Label>School</Label><Input placeholder="MIT" value={filters.school} onChange={e => handleFilterChange('school', e.target.value)} /></div>
                <div className="space-y-2"><Label>Location</Label><Input placeholder="New York, NY" value={filters.location} onChange={e => handleFilterChange('location', e.target.value)} /></div>
                <div className="space-y-2"><Label>Industry</Label><Input placeholder="SaaS, Fintech" value={filters.industry} onChange={e => handleFilterChange('industry', e.target.value)} /></div>
                <div className="space-y-2"><Label>Languages (comma-separated)</Label><Input placeholder="English, Spanish" value={filters.languages} onChange={e => handleFilterChange('languages', e.target.value)} /></div>
                <div className="space-y-2"><Label>Min Years Experience</Label><Input type="number" placeholder="e.g., 5" value={filters.minExperience} onChange={e => handleFilterChange('minExperience', e.target.value)} /></div>
                <div className="space-y-2"><Label>Max Years Experience</Label><Input type="number" placeholder="e.g., 10" value={filters.maxExperience} onChange={e => handleFilterChange('maxExperience', e.target.value)} /></div>
                <div className="space-y-2"><Label>Graduation Year</Label><Input type="number" placeholder="e.g., 2020" value={filters.graduationYear} onChange={e => handleFilterChange('graduationYear', e.target.value)} /></div>
                <div className="space-y-2"><Label>Open to Work</Label>
                  <Select value={filters.openToWork} onValueChange={(v) => handleFilterChange('openToWork', v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger> 
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="on-site">On-site</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Military Veteran</Label>
                  <Select value={filters.isVeteran} onValueChange={(v) => handleFilterChange('isVeteran', v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="score_desc">Score: High to Low</SelectItem>
                      <SelectItem value="score_asc">Score: Low to High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : candidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      ) : Object.values(debouncedFilters).some(v => typeof v === 'string' && v.length > 0) ? (
        <p>No candidates found.</p>
      ) : (
        <p>Start typing to search candidates.</p>
      )}
    </RecruiterDashboardLayout>
  );
};

export default CandidateSearchPage;
