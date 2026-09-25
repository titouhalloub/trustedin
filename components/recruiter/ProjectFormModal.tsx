import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'completed';
}

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh the project list
  project?: Project | null;
}

export const ProjectFormModal = ({ isOpen, onClose, onSave, project }: ProjectFormModalProps) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'archived' | 'completed'>('active');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setStatus(project.status);
    } else {
      // Reset for new project
      setName('');
      setDescription('');
      setStatus('active');
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    const projectData = { name, description, status, recruiter_id: user.id };
    let error;

    if (project) {
      // Update existing project
      ({ error } = await supabase.from('recruiter_projects').update(projectData).eq('id', project.id));
    } else {
      // Create new project
      ({ error } = await supabase.from('recruiter_projects').insert(projectData));
    }

    setIsLoading(false);

    if (error) {
      toast({ title: 'Error saving project', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Project ${project ? 'updated' : 'created'} successfully!` });
      onSave();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
            <DialogDescription>Organize your jobs and candidates into projects.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label htmlFor="name">Project Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="description">Description (Optional)</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} /></div>
            <div className="space-y-2"><Label htmlFor="status">Status</Label><Select value={status} onValueChange={(value: 'active' | 'archived' | 'completed') => setStatus(value)}><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{project ? 'Save Changes' : 'Create Project'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};