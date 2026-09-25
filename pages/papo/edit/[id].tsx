import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import 'react-quill/dist/quill.snow.css';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const EditPapoPage = () => {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const { id } = router.query;
  const [papo, setPapo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    const fetchPapo = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('papo')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPapo(data);
        setEditedContent(data.edited_content || data.ai_generated_content || '');
      } catch (error) {
        console.error('Error fetching papo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPapo();
  }, [id, supabase]);

  const handleSave = async () => {
    if (!papo) return;
    try {
      const { error } = await supabase
        .from('papo')
        .update({ edited_content: editedContent })
        .eq('id', papo.id);

      if (error) throw error;
      // Add user feedback for successful save
      alert('Saved!');
    } catch (error) {
      console.error('Error saving papo:', error);
      alert('Failed to save.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!papo) {
    return <div>Papo not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Papo</h1>
      <h2 className="text-xl mb-2">{papo.title}</h2>
      <p className="mb-4">Prompt: {papo.prompt_used}</p>
      
      <ReactQuill
        theme="snow"
        value={editedContent}
        onChange={setEditedContent}
        style={{ height: '400px', marginBottom: '50px' }}
      />
      
      <button
        className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        onClick={handleSave}
      >
        Save
      </button>
    </div>
  );
};

export default EditPapoPage;
