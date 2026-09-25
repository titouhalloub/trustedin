import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface Experience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  description?: string;
}

// The data passed to onSave will not have an id yet
type ExperienceFormData = Omit<Experience, 'id'>;

interface ExperienceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExperienceFormData) => Promise<void>;
  experience?: Experience | null;
}

export function ExperienceFormModal({ isOpen, onClose, onSave, experience }: ExperienceFormModalProps) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (experience) {
      setTitle(experience.title);
      setCompany(experience.company);
      setStartDate(experience.start_date.split('T')[0]); // Format for date input
      setEndDate(experience.end_date?.split('T')[0] || '');
      setIsCurrent(experience.is_current);
      setDescription(experience.description || '');
    } else {
      // Reset form for new entry
      setTitle('');
      setCompany('');
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
      setDescription('');
    }
  }, [experience, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !company || !startDate) {
      toast({
        title: "Missing fields",
        description: "Please fill out Title, Company, and Start Date.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    await onSave({
      title,
      company,
      start_date: startDate,
      end_date: isCurrent ? null : endDate || null,
      is_current: isCurrent,
      description,
    });
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{experience ? 'Edit' : 'Add'} Experience</DialogTitle>
            <DialogDescription>
              {experience ? 'Update your' : 'Add a new'} work experience to your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label htmlFor="title">Title *</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="company">Company *</Label><Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="start_date">Start Date *</Label><Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
            <div className="flex items-center space-x-2"><Checkbox id="is_current" checked={isCurrent} onCheckedChange={(checked) => setIsCurrent(!!checked)} /><Label htmlFor="is_current" className="font-normal">I am currently working in this role</Label></div>
            {!isCurrent && (<div className="space-y-2"><Label htmlFor="end_date">End Date</Label><Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>)}
            <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}