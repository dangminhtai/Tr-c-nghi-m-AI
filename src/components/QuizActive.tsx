
import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { QuizData } from '../types';

interface QuizActiveProps {
  t: any;
  quizData: QuizData;
  currentQuestionIndex: number;
  userAnswers: (string | null)[];
  handleAnswerSelect: (option: string) => void;
  handleNextQuestion: () => void;
  setShowExitConfirm: (show: boolean) => void;
  setShowShareModal: (show: boolean) => void;
  generatedChallengeCode: string | null;
  inputMode: string;
}

const QuizActive: React.FC<QuizActiveProps> = ({
  t, quizData, currentQuestionIndex, userAnswers, handleAnswerSelect, handleNextQuestion,
  setShowExitConfirm, setShowShareModal, generatedChallengeCode, inputMode
}) => {
  const currentQuestion = quizData[currentQuestionIndex];
  const selectedAnswer = userAnswers[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / quizData.length) * 100;

  return (
    <div className={`quiz-container ${selectedAnswer ? 'answered' : ''}`}>
      <div className="quiz-header no-print">
        <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="header-buttons">
          {generatedChallengeCode && quizData.length > 0 && inputMode !== 'challenge' && (
            <button className="share-btn" onClick={() => setShowShareModal(true)}>{t.shareButton}</button>
          )}
          <button className="exit-btn" onClick={() => setShowExitConfirm(true)}>{t.exitButton}</button>
        </div>
      </div>
      <h2>{t.question} {currentQuestionIndex + 1}:</h2>
      <MarkdownRenderer>{currentQuestion.question}</MarkdownRenderer>

      <ul className="options-list">
        {currentQuestion.options.map((option, index) => {
          const isCorrectAnswer = option === currentQuestion.correctAnswer;
          const isSelected = option === selectedAnswer;
          
          let btnClass = 'option-btn';
          if (selectedAnswer !== null) {
            if (isCorrectAnswer) btnClass += ' correct';
            else if (isSelected) btnClass += ' incorrect';
          }

          return (
            <li key={index}>
              <button
                className={btnClass}
                onClick={() => handleAnswerSelect(option)}
                disabled={selectedAnswer !== null}
                aria-pressed={isSelected}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>
      {selectedAnswer && (
        <div className="explanation">
          <strong>{t.explanation}:</strong> {currentQuestion.explanation}
        </div>
      )}
      <div className="quiz-footer no-print">
        <span>{currentQuestionIndex + 1} / {quizData.length}</span>
        {selectedAnswer && (
          <button onClick={handleNextQuestion}>
            {currentQuestionIndex < quizData.length - 1 ? t.nextButton : t.resultsButton}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizActive;
