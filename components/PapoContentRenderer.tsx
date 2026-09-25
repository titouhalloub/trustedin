
import React from 'react';

interface Node {
  type: string;
  content?: Node[];
  text?: string;
  attrs?: {
    level?: number;
    src?: string;
    alt?: string;
    title?: string;
  };
}

interface PapoContentRendererProps {
  content: any;
}

const renderNode = (node: Node, key: number): React.ReactNode => {
  if (node.type === 'text') {
    return node.text;
  }

  const children = node.content?.map(renderNode);

  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{children}</p>;
    case 'heading':
      const level = node.attrs?.level || 1;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return <Tag key={key}>{children}</Tag>;
    case 'doc':
      return <div key={key}>{children}</div>;
    default:
      console.warn('Unhandled node type:', node.type);
      return null;
  }
};

const PapoContentRenderer: React.FC<PapoContentRendererProps> = ({ content }) => {
  if (!content || !content.type || content.type !== 'doc') {
    // Handle plain text content for backward compatibility
    if (typeof content === 'string') {
        return <p>{content}</p>;
    }
    if (content && content.text && typeof content.text === 'string') {
        return <p>{content.text}</p>;
    }
    return <p>Invalid content format.</p>;
  }

  return <div>{content.content?.map(renderNode)}</div>;
};

export default PapoContentRenderer;
