
import React from 'react';

interface QuizResultsProps {
  t: any;
  score: number;
  totalQuestions: number;
  handleReset: () => void;
  setIsReviewing: (val: boolean) => void;
  generatedChallengeCode: string | null;
  handleCopyCode: () => void;
  isCopied: boolean;
}

const QuizResults: React.FC<QuizResultsProps> = ({
  t, score, totalQuestions, handleReset, setIsReviewing, generatedChallengeCode, handleCopyCode, isCopied
}) => {
  return (
    <div className="results-container">
      <h2>{t.completeTitle}</h2>
      <p>
        {t.completeMessage} <strong>{score}</strong> {t.outOf}{' '}
        <strong>{totalQuestions}</strong> {t.questions}.
      </p>
      <div className="results-actions">
        <button onClick={handleReset}>{t.tryAgainButton}</button>
        <button onClick={() => setIsReviewing(true)}>{t.reviewButton}</button>
      </div>
      {generatedChallengeCode && (
         <div className="challenge-code-container">
            <h3>{t.challengeCodeTitle}</h3>
            <div className="challenge-code-box">
                <input type="text" readOnly value={generatedChallengeCode} />
                <button className="copy-btn" onClick={handleCopyCode}>
                    {isCopied ? t.copied : t.copy}
                </button>
            </div>
         </div>
      )}
    </div>
  );
};

export default QuizResults;
