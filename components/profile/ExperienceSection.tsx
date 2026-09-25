import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import RequestVerificationButton from '@/components/profile/RequestVerificationButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Calendar, Loader2 } from 'lucide-react';

interface Experience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
}

interface ExperienceSectionProps {
  userId: string;
}

export default function ExperienceSection({ userId }: ExperienceSectionProps) {
  const supabase = useSupabaseClient();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperiences = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching experiences:', error);
      } else {
        setExperiences(data || []);
      }
      setLoading(false);
    };

    if (userId) fetchExperiences();
  }, [supabase, userId]);

  if (loading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Briefcase className="mr-2 h-5 w-5" /> Experience</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {experiences.length > 0 ? experiences.map((exp) => (
            <li key={exp.id} className="flex space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="font-bold">{exp.title}</p>
                <p className="text-sm">{exp.company}</p>
                <p className="text-xs text-muted-foreground">{new Date(exp.start_date).toLocaleDateString()} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}</p>
                <div className="mt-2"><RequestVerificationButton relatedEntityId={exp.id} /></div>
              </div>
            </li>
          )) : <p className="text-muted-foreground">No work experience has been added yet.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}