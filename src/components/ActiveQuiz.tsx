
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { QuizData } from '../types';

interface ActiveQuizProps {
  quizData: QuizData;
  currentQuestionIndex: number;
  userAnswers: (string | null)[];
  onAnswerSelect: (option: string) => void;
  onNext: () => void;
  onExit: () => void;
  onShare: () => void;
  showShareButton: boolean;
  translations: any;
}

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

const ActiveQuiz: React.FC<ActiveQuizProps> = ({
  quizData,
  currentQuestionIndex,
  userAnswers,
  onAnswerSelect,
  onNext,
  onExit,
  onShare,
  showShareButton,
  translations: t
}) => {
  const currentQuestion = quizData[currentQuestionIndex];
  const selectedAnswer = userAnswers[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / quizData.length) * 100;

  return (
    <div className={`quiz-container fade-in ${selectedAnswer ? 'answered' : ''}`}>
      <div className="quiz-header no-print">
        <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="header-buttons">
          {showShareButton && (
            <button className="share-btn" onClick={onShare} title={t.shareButton}>
                 🔗
            </button>
          )}
          <button className="exit-btn" onClick={onExit} title={t.exitButton}>
             ✕
          </button>
        </div>
      </div>

      <div className="question-content">
        <span className="question-number">{t.question} {currentQuestionIndex + 1}</span>
        <ReactMarkdown components={MarkdownComponents}>
          {currentQuestion.question}
        </ReactMarkdown>
      </div>

      <div className="options-list">
        {currentQuestion.options.map((option, index) => {
          const isCorrectAnswer = option === currentQuestion.correctAnswer;
          const isSelected = option === selectedAnswer;
          
          let btnClass = 'option-btn';
          if (selectedAnswer !== null) {
            if (isCorrectAnswer) btnClass += ' correct';
            else if (isSelected) btnClass += ' incorrect';
          }

          return (
            <button
              key={index}
              className={btnClass}
              onClick={() => onAnswerSelect(option)}
              disabled={selectedAnswer !== null}
            >
              <span className="option-marker">{String.fromCharCode(65 + index)}</span>
              <span className="option-text">{option}</span>
            </button>
          );
        })}
      </div>

      {selectedAnswer && (
        <div className="explanation fade-in">
          <div className="explanation-title">💡 {t.explanation}</div>
          <div className="explanation-content">{currentQuestion.explanation}</div>
        </div>
      )}

      <div className="quiz-footer no-print">
        <span className="counter">{currentQuestionIndex + 1} / {quizData.length}</span>
        {selectedAnswer && (
          <button className="next-btn primary" onClick={onNext}>
            {currentQuestionIndex < quizData.length - 1 ? t.nextButton : t.resultsButton} →
          </button>
        )}
      </div>
    </div>
  );
};

export default ActiveQuiz;
