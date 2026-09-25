import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DocumentUploadProps {
  bucketName: string;
  userId: string;
}

const DocumentUpload = ({ bucketName, userId }: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }
    setUploading(true);
    // This is a mock upload. In a real app, you would use Supabase storage client.
    await new Promise((res) => setTimeout(res, 1500));
    alert(`File "${file.name}" uploaded for user ${userId} to bucket ${bucketName}.`);
    setUploading(false);
    setFile(null);
  };

  return (
    <div className="space-y-2 mt-3">
      <Label htmlFor="document-upload">Select document</Label>
      <Input id="document-upload" type="file" onChange={handleFileChange} disabled={uploading} />
      <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
        {uploading ? 'Uploading...' : 'Upload'}
      </Button>
    </div>
  );
};

export default DocumentUpload;