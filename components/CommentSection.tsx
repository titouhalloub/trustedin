import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: {
    username: string;
    full_name?: string | null;
    avatar_url: string | null;
  };
}

interface CommentSectionProps {
  papoId: string;
}

export const CommentSection = ({ papoId }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      if (!papoId) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/papo/${papoId}/comments`);
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        const data = await response.json();
        setComments(data);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [papoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/papo/${papoId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const data = await response.json();
      setComments([...comments, ...data]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Comments</h2>
      <div>
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start space-x-4 mb-4">
            {comment.author.avatar_url ? (
              <img
                src={comment.author.avatar_url}
                alt={comment.author.full_name || comment.author.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {(comment.author.full_name?.[0] || comment.author.username?.[0] || '?').toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold">{comment.author.username}</p>
              <p>{comment.content}</p>
              <p className="text-sm text-gray-500">
                {new Date(comment.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-4">
        <textarea
          className="w-full p-2 border rounded"
          rows={3}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
        />
        <button
          type="submit"
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </form>
    </div>
  );
};
