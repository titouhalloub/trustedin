import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { Education } from '@/lib/types';
import RequestVerificationButton from '@/components/profile/RequestVerificationButton';


interface EducationSectionProps {
  education?: Education[];
}

export const EducationSection = ({ education }: EducationSectionProps) => {
  if (!education || education.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><GraduationCap className="mr-2 h-5 w-5" /> Education</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {education.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()).map((edu: Education) => (
            <li key={edu.id} className="flex space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="font-bold">{edu.school}</p>
                <p className="text-sm">{edu.degree}{edu.field_of_study ? `, ${edu.field_of_study}` : ''}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(edu.start_date).toLocaleDateString()} - {edu.end_date ? new Date(edu.end_date).toLocaleDateString() : 'N/A'}
                </p>
                <div className="mt-2">
                  <RequestVerificationButton relatedEntityId={edu.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};