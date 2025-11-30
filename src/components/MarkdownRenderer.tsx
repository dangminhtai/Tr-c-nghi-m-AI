
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  children: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children }) => {
  return (
    <ReactMarkdown
      components={{
        code(props) {
          const { children, className, node, ...rest } = props;
          // Check if it's an inline code block or a block of code
          // Note: react-markdown types might vary, checking className for language is a common heuristic
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !String(children).includes('\n');
          
          return !isInline ? (
            <div className="code-block-wrapper">
                <pre className={className}>
                    <code {...rest} className={className}>
                        {children}
                    </code>
                </pre>
            </div>
          ) : (
            <code className="inline-code" {...rest}>
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
