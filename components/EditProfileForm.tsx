import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

// UI Components
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Loader2, Github, Plus, Trash2, Edit, Building, GraduationCap, Star, Lightbulb } from "lucide-react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { ExperienceFormModal } from "./ExperienceFormModal";
import { EducationFormModal } from "./EducationFormModal";
import { Profile, Experience, Education, Skill } from "@/lib/types";

interface EditProfileFormProps {
  profile: Profile;
}

export function EditProfileForm({ profile }: EditProfileFormProps) {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [headline, setHeadline] = useState(profile.headline || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [location, setLocation] = useState(profile.location || "");
  const [experiences, setExperiences] = useState<Experience[]>(profile.experiences || []);
  const [education, setEducation] = useState<Education[]>(profile.education || []);
  const [skills, setSkills] = useState<Skill[]>(profile.skills || []);
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');

  // Modal states
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [loading, setLoading] = useState(false);

  // GitHub connection state
  const [isGitHubConnected, setIsGitHubConnected] = useState(
    !!profile.github_username
  );

  // Update GitHub status if URL has gh_connected query
  useEffect(() => {
    if (router.query.gh_connected === "1") {
      setIsGitHubConnected(true);
      toast({
        title: "GitHub Connected!",
        description: "You can now fetch GitHub data for scoring.",
      });
      router.replace(router.pathname, undefined, { shallow: true });
    }
  }, [router, toast]);

  // Save profile changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ 
        full_name: fullName, 
        headline: headline,
        bio: bio,
        location: location,
        interests: interests, // Save the interests array directly
      })
      .eq("id", user?.id);

    if (error) {
      toast({ title: "Error", description: error.message });
    } else {
      toast({ title: "Profile updated!" });
    }

    setLoading(false);
  };

  const handleSaveExperience = async (experienceData: Omit<Experience, 'id'>) => {
    if (!user || !supabase) return;

    if (editingExperience) {
      // Update existing experience
      const { data, error } = await supabase
        .from('experiences')
        .update(experienceData)
        .eq('id', editingExperience.id)
        .select()
        .single();
      if (error) {
        toast({ title: "Error updating experience", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Experience updated!" });
        setExperiences(experiences.map(exp => exp.id === editingExperience.id ? data : exp));
      }
    } else {
      // Add new experience
      const { data, error } = await supabase
        .from('experiences')
        .insert([{ ...experienceData, user_id: user.id }])
        .select()
        .single();
      if (error) {
        toast({ title: "Error saving experience", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Experience added!" });
        setExperiences([...experiences, data]);
      }
    }
    setIsExperienceModalOpen(false);
    setEditingExperience(null);
  };

  const handleDeleteExperience = async (experienceId: string) => {
    if (!supabase || !window.confirm("Are you sure you want to delete this experience?")) return;
    const { error } = await supabase.from('experiences').delete().eq('id', experienceId);
    if (error) {
      toast({ title: "Error deleting experience", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Experience deleted." });
      setExperiences(experiences.filter(exp => exp.id !== experienceId));
    }
  };

  const handleSaveEducation = async (educationData: Omit<Education, 'id'>) => {
    if (!user || !supabase) return;

    if (editingEducation) {
      // Update existing education
      const { data, error } = await supabase
        .from('education')
        .update(educationData)
        .eq('id', editingEducation.id)
        .select()
        .single();
      if (error) {
        toast({ title: "Error updating education", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Education updated!" });
        setEducation(education.map(edu => edu.id === editingEducation.id ? data : edu));
      }
    } else {
      // Add new education
      const { data, error } = await supabase
        .from('education')
        .insert([{ ...educationData, user_id: user.id }])
        .select()
        .single();
      if (error) {
        toast({ title: "Error saving education", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Education added!" });
        setEducation([...education, data]);
      }
    }
    setIsEducationModalOpen(false);
    setEditingEducation(null);
  };

  const handleDeleteEducation = async (educationId: string) => {
    if (!supabase || !window.confirm("Are you sure you want to delete this education entry?")) return;
    const { error } = await supabase.from('education').delete().eq('id', educationId);
    if (error) {
      toast({ title: "Error deleting education", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Education deleted." });
      setEducation(education.filter(edu => edu.id !== educationId));
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim() || !user || !supabase) return;
    const { data, error } = await supabase
      .from('skills')
      .insert({ name: newSkill.trim(), user_id: user.id })
      .select()
      .single();
    if (error) {
      toast({ title: "Error adding skill", description: "This skill might already exist.", variant: "destructive" });
    } else {
      setSkills([...skills, data]);
      setNewSkill("");
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('skills').delete().eq('id', skillId);
    if (error) {
      toast({ title: "Error deleting skill", description: error.message, variant: "destructive" });
    } else {
      setSkills(skills.filter(s => s.id !== skillId));
    }
  };

  const handleAddInterest = () => {
    const trimmedInterest = newInterest.trim();
    if (!trimmedInterest) return;
    if (interests.includes(trimmedInterest)) {
      toast({ title: "Interest already exists.", variant: "destructive" });
      return;
    }
    setInterests([...interests, trimmedInterest]);
    setNewInterest("");
  };

  const handleDeleteInterest = (interestToDelete: string) => {
    setInterests(interests.filter((interest) => interest !== interestToDelete));
  };




  return (
    <div className="space-y-6">
      {/* GitHub Connection Section */}
      <CardContent className="pt-6">
        <div className="space-y-2">
          <Label>Connected Accounts</Label>
          <div className="flex items-center justify-between mt-2 p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              <span className="font-medium">GitHub</span>
            </div>
            {isGitHubConnected ? (
              <form action="/api/github/disconnect" method="POST">
                <Button variant="destructive" size="sm">Disconnect</Button>
              </form>
            ) : (
              <Link href="/api/github/start" passHref>
                <Button type="button" variant="secondary" size="sm">Connect</Button>
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Connect your GitHub account to include repository data in your trust score.</p>
        </div>
      </CardContent>
      <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Update your public profile information.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g., Senior Software Engineer at Acme Inc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., San Francisco, CA"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </form>
      </Card>

      {/* Experience Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center"><Building className="mr-2 h-5 w-5" /> Experience</CardTitle>
            <CardDescription>Manage your work experience.</CardDescription>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => { setEditingExperience(null); setIsExperienceModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Experience
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {experiences.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()).map((exp) => (
              <li key={exp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div>
                  <p className="font-bold">{exp.title}</p>
                  <p className="text-sm">{exp.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(exp.start_date).toLocaleDateString()} - {exp.is_current ? 'Present' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'N/A')}
                  </p>
                </div>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingExperience(exp); setIsExperienceModalOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteExperience(exp.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
          {experiences.length === 0 && 
            <p className="text-sm text-muted-foreground text-center py-4">Your work experiences will be listed here.</p>}
        </CardContent>
      </Card>

      {/* Education Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center"><GraduationCap className="mr-2 h-5 w-5" /> Education</CardTitle>
            <CardDescription>Manage your education history.</CardDescription>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => { setEditingEducation(null); setIsEducationModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Education
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {education.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()).map((edu) => (
              <li key={edu.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div>
                  <p className="font-bold">{edu.school}</p>
                  <p className="text-sm">{edu.degree}{edu.field_of_study ? `, ${edu.field_of_study}` : ''}</p>
                  <p className="text-xs text-muted-foreground">{new Date(edu.start_date).toLocaleDateString()} - {edu.end_date ? new Date(edu.end_date).toLocaleDateString() : 'Present'}</p>
                </div>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingEducation(edu); setIsEducationModalOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteEducation(edu.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
          {education.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Your education history will be listed here.</p>
          )}
        </CardContent>
      </Card>

      {/* Skills Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center"><Star className="mr-2 h-5 w-5" /> Skills</CardTitle>
            <CardDescription>Showcase your expertise.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input placeholder="Add a new skill" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()} />
            <Button type="button" onClick={handleAddSkill}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <div key={skill.id} className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {skill.name}
                <button type="button" onClick={() => handleDeleteSkill(skill.id)} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {skills.length === 0 && 
              <p className="text-sm text-muted-foreground text-center py-4">Add your skills to be listed here.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Interests Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-5 w-5" /> Interests</CardTitle>
          <CardDescription>What are you passionate about?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add an interest"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
            />
            <Button type="button" onClick={handleAddInterest}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest, index) => (
              <div key={index} className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {interest}
                <button type="button" onClick={() => handleDeleteInterest(interest)} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {interests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Add your interests to be listed here.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <ExperienceFormModal
        isOpen={isExperienceModalOpen}
        onClose={() => { setIsExperienceModalOpen(false); setEditingExperience(null); }}
        onSave={handleSaveExperience}
        experience={editingExperience}
      />

      <EducationFormModal
        isOpen={isEducationModalOpen}
        onClose={() => { setIsEducationModalOpen(false); setEditingEducation(null); }}
        onSave={handleSaveEducation}
        education={editingEducation}
      />
    </div>
  );
}
