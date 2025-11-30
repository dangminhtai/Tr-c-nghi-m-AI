
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { QuizData } from '../types';

interface QuizResultsProps {
  quizData: QuizData;
  userAnswers: (string | null)[];
  score: number;
  isReviewing: boolean;
  setIsReviewing: (b: boolean) => void;
  onReset: () => void;
  onPrint: () => void;
  generatedChallengeCode: string | null;
  onCopyCode: () => void;
  isCopied: boolean;
  translations: any;
}

// Define components outside to prevent recreation on every render
const MarkdownComponents = {
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
};

const QuizResults: React.FC<QuizResultsProps> = ({
  quizData,
  userAnswers,
  score,
  isReviewing,
  setIsReviewing,
  onReset,
  onPrint,
  generatedChallengeCode,
  onCopyCode,
  isCopied,
  translations: t
}) => {
  if (isReviewing) {
    return (
      <div className="review-container fade-in">
        <div className="review-header no-print">
          <h2>{t.reviewButton}</h2>
          <div className="actions">
            <button onClick={() => setIsReviewing(false)} className="secondary">← {t.backToResults}</button>
            <button onClick={onPrint} className="secondary">🖨 {t.printButton}</button>
          </div>
        </div>
        {quizData.map((q, index) => {
          const userAnswer = userAnswers[index];
          const isCorrect = userAnswer === q.correctAnswer;
          return (
            <div key={index} className={`review-card ${isCorrect ? 'correct-border' : 'incorrect-border'}`}>
              <div className="review-question-header">
                <span className="q-num">#{index + 1}</span>
                <span className={`status-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
                    {isCorrect ? 'Đúng' : 'Sai'}
                </span>
              </div>
              <ReactMarkdown components={MarkdownComponents}>
                {q.question}
              </ReactMarkdown>

              <div className="review-options">
                {q.options.map((option, optionIndex) => {
                  const isCorrectOption = option === q.correctAnswer;
                  const isUserChoice = option === userAnswer;
                  let optionClass = 'review-option';
                  if (isCorrectOption) optionClass += ' review-option-correct';
                  else if (isUserChoice) optionClass += ' review-option-incorrect';

                  return (
                    <div key={optionIndex} className={optionClass}>
                      {option}
                    </div>
                  );
                })}
              </div>
              <div className="explanation">
                <strong>{t.explanation}:</strong> {q.explanation}
              </div>
            </div>
          )
        })}
      </div>
    );
  }

  const percentage = Math.round((score / quizData.length) * 100);
  let emoji = '😐';
  if (percentage === 100) emoji = '🏆';
  else if (percentage >= 80) emoji = '🔥';
  else if (percentage >= 50) emoji = '👍';
  else if (percentage < 30) emoji = '📚';

  return (
    <div className="results-container fade-in">
      <div className="score-circle">
        <span className="emoji">{emoji}</span>
        <span className="score">{score}/{quizData.length}</span>
      </div>
      <h2>{t.completeTitle}</h2>
      <p>
        {t.completeMessage} <strong>{score}</strong> {t.outOf} <strong>{quizData.length}</strong> {t.questions}.
      </p>
      
      <div className="results-actions">
        <button onClick={onReset} className="primary">{t.tryAgainButton}</button>
        <button onClick={() => setIsReviewing(true)} className="secondary">{t.reviewButton}</button>
      </div>

      {generatedChallengeCode && (
        <div className="challenge-code-container">
          <h3>{t.challengeCodeTitle}</h3>
          <div className="challenge-code-box">
            <input type="text" readOnly value={generatedChallengeCode} />
            <button className="copy-btn" onClick={onCopyCode}>
              {isCopied ? t.copied : t.copy}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizResults;
