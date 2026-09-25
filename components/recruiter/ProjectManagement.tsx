import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Loader2, PlusCircle, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ProjectFormModal } from './ProjectFormModal';

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'completed';
  created_at: string;
}

export const ProjectManagement = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recruiter_projects')
        .select('*')
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({ title: 'Error fetching projects', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const getStatusVariant = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  // Paginated projects
  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentProjects = projects.slice(firstItemIndex, lastItemIndex);
  const totalPages = Math.ceil(projects.length / itemsPerPage);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recruiter Projects</CardTitle>
          <CardDescription>Organize your hiring efforts into projects.</CardDescription>
        </div>
        <Button onClick={handleCreateProject}><PlusCircle className="mr-2 h-4 w-4" /> Create Project</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>You haven't created any projects yet.</p>
            <Button variant="link" className="mt-2" onClick={handleCreateProject}>Create your first project</Button>
          </div>
        ) : (<>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(project.status)}>{project.status}</Badge></TableCell>
                    <TableCell>{new Date(project.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditProject(project)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                    {[...Array(totalPages).keys()].map(num => (
                      <PaginationItem key={num}>
                        <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(num + 1); }} isActive={currentPage === num + 1}>
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
          </>)}
      </CardContent>
      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchProjects}
        project={editingProject}
      />
    </Card>
  );
};