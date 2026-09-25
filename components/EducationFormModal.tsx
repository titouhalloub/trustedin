import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface Education {
  id: string;
  school: string;
  degree: string;
  field_of_study?: string | null;
  start_date: string;
  end_date?: string | null;
}

// The data passed to onSave will not have an id yet
type EducationFormData = Omit<Education, 'id'>;

interface EducationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EducationFormData) => Promise<void>;
  education?: Education | null;
}

export function EducationFormModal({ isOpen, onClose, onSave, education }: EducationFormModalProps) {
  const [school, setSchool] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (education) {
      setSchool(education.school);
      setDegree(education.degree);
      setFieldOfStudy(education.field_of_study || '');
      setStartDate(education.start_date.split('T')[0]); // Format for date input
      setEndDate(education.end_date?.split('T')[0] || '');
    } else {
      // Reset form for new entry
      setSchool('');
      setDegree('');
      setFieldOfStudy('');
      setStartDate('');
      setEndDate('');
    }
  }, [education, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !degree || !startDate) {
      toast({
        title: "Missing fields",
        description: "Please fill out School, Degree, and Start Date.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    await onSave({
      school,
      degree,
      field_of_study: fieldOfStudy || null,
      start_date: startDate,
      end_date: endDate || null,
    });
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{education ? 'Edit' : 'Add'} Education</DialogTitle>
            <DialogDescription>
              {education ? 'Update your' : 'Add a new'} education entry to your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label htmlFor="school">School *</Label><Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="degree">Degree *</Label><Input id="degree" value={degree} onChange={(e) => setDegree(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="field_of_study">Field of Study</Label><Input id="field_of_study" value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="start_date">Start Date *</Label><Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="end_date">End Date</Label><Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
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