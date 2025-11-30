
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  children: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children }) => {
  return (
    <ReactMarkdown
      components={{
        // Using 'any' for props to avoid TypeScript errors with 'inline' property
        // which might not be present in strict types of newer react-markdown versions
        code(props: any) {
          const { inline, className, children, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={oneDark as any}
              language={match[1]}
              PreTag="div"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...rest}>
              {children}
            </code>
          );
        }
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
