import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { Skill } from '@/lib/types';

interface SkillsSectionProps {
  skills?: Skill[];
}

export const SkillsSection = ({ skills }: SkillsSectionProps) => {
  if (!skills || skills.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Star className="mr-2 h-5 w-5" /> Skills</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {skills.map(skill => <div key={skill.id} className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm">{skill.name}</div>)}
        </div>
      </CardContent>
    </Card>
  );
};