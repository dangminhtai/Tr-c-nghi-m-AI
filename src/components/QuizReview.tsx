
import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { QuizData } from '../types';

interface QuizReviewProps {
  t: any;
  quizData: QuizData;
  userAnswers: (string | null)[];
  setIsReviewing: (isReviewing: boolean) => void;
}

const QuizReview: React.FC<QuizReviewProps> = ({ t, quizData, userAnswers, setIsReviewing }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="review-container">
        <div className="review-header no-print">
             <h2>{t.reviewButton}</h2>
             <div>
                <button onClick={() => setIsReviewing(false)} className="secondary">{t.backToResults}</button>
                <button onClick={handlePrint}>{t.printButton}</button>
            </div>
        </div>
        {quizData.map((q, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer === q.correctAnswer;
            return (
                <div key={index} className={`review-card ${isCorrect ? 'correct-border' : 'incorrect-border'}`}>
                    <h3>{t.question} {index + 1}:</h3>
                    <MarkdownRenderer>{q.question}</MarkdownRenderer>
                    <ul className="review-options">
                        {q.options.map((option, optionIndex) => {
                            const isCorrectOption = option === q.correctAnswer;
                            const isUserChoice = option === userAnswer;
                            let optionClass = 'review-option';
                            if (isCorrectOption) {
                                optionClass += ' review-option-correct';
                            } else if (isUserChoice) {
                                optionClass += ' review-option-incorrect';
                            }

                            return (
                                <li key={optionIndex} className={optionClass}>
                                    {option}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="explanation">
                        <strong>{t.explanation}:</strong> {q.explanation}
                    </div>
                </div>
            )
        })}
    </div>
  );
};

export default QuizReview;
