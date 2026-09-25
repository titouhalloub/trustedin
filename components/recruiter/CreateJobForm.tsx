import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import 'react-quill/dist/quill.snow.css'; // Import editor styles

// Dynamically import ReactQuill to avoid SSR issues, as it relies on browser APIs.
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export const CreateJobForm = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Configuration for the rich text editor toolbar
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ],
  }), []);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike', 'blockquote', 'list', 'bullet', 'indent', 'link', 'image'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/recruiter/jobs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description, location }),
      });

      if (response.ok) {
        router.push('/recruiter/jobs');
      } else {
        console.error('Error creating job');
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <ReactQuill
            theme="snow"
            value={description}
            onChange={setDescription}
            modules={modules}
            formats={formats}
            placeholder="Job Description (add styles, links, and images...)"
          />
          <Input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Job'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
