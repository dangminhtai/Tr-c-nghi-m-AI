import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { QuizData, SavedState, Language, Difficulty } from './types';
import { translations } from './translations';

const App = () => {
  const [language, setLanguage] = useState<Language>('vi');
  const [topic, setTopic] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [score, setScore] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isQuizFinished, setIsQuizFinished] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const t = useMemo(() => translations[language], [language]);

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem('quizProgress');
      if (savedStateJSON) {
        setShowResumePrompt(true);
      } else {
        setTopic(language === 'vi' ? 'Câu hỏi trắc nghiệm về HTML cơ bản' : 'Multiple-choice questions about basic HTML');
      }
    } catch (e) {
      console.error("Could not access localStorage:", e);
    }
  }, []);
  
  useEffect(() => {
    try {
      if (quizData && !isQuizFinished) {
        const stateToSave: SavedState = {
          quizData, currentQuestionIndex, userAnswers, score, topic, language
        };
        localStorage.setItem('quizProgress', JSON.stringify(stateToSave));
      } else {
        localStorage.removeItem('quizProgress');
      }
    } catch (e) {
      console.error("Could not access localStorage:", e);
    }
  }, [quizData, currentQuestionIndex, userAnswers, score, isQuizFinished, topic, language]);

  const handleResume = (resume: boolean) => {
    setShowResumePrompt(false);
    if (resume) {
      try {
        const savedStateJSON = localStorage.getItem('quizProgress');
        if (savedStateJSON) {
          const savedState: SavedState = JSON.parse(savedStateJSON);
          setLanguage(savedState.language);
          setTopic(savedState.topic);
          setQuizData(savedState.quizData);
          setCurrentQuestionIndex(savedState.currentQuestionIndex);
          setUserAnswers(savedState.userAnswers);
          setScore(savedState.score);
        }
      } catch (e) {
         console.error("Failed to parse saved state:", e);
         localStorage.removeItem('quizProgress');
      }
    } else {
      localStorage.removeItem('quizProgress');
      setTopic(language === 'vi' ? 'Câu hỏi trắc nghiệm về HTML cơ bản' : 'Multiple-choice questions about basic HTML');
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setQuizData(null);
    setScore(0);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setIsQuizFinished(false);
    setIsReviewing(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ['question', 'options', 'correctAnswer', 'explanation'],
        },
      };

      const prompt = t.promptTemplate(topic, numQuestions, t.difficulties[difficulty]);

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });
      
      const parsedData: QuizData = JSON.parse(response.text);
      
      setQuizData(parsedData);
      setUserAnswers(new Array(parsedData.length).fill(null));

    } catch (e) {
      console.error(e);
      setError(t.errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAnswerSelect = (option: string) => {
    if (userAnswers[currentQuestionIndex] !== null) return;

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = option;
    setUserAnswers(newAnswers);

    if (option === quizData![currentQuestionIndex].correctAnswer) {
      setScore(prevScore => prevScore + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData!.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setIsQuizFinished(true);
    }
  };

  const handleReset = () => {
    setQuizData(null);
    setTopic(language === 'vi' ? 'Câu hỏi trắc nghiệm về HTML cơ bản' : 'Multiple-choice questions about basic HTML');
    setIsQuizFinished(false);
    setIsReviewing(false);
    localStorage.removeItem('quizProgress');
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    handleReset();
  };

  const handlePrint = () => {
      window.print();
  };
  
  const renderLanguageSwitcher = () => (
    <div className="language-switcher no-print">
      <button onClick={() => setLanguage('vi')} className={language === 'vi' ? 'active' : ''}>VI</button>
      <button onClick={() => setLanguage('en')} className={language === 'en' ? 'active' : ''}>EN</button>
    </div>
  );

  const renderContent = () => {
    if (showResumePrompt) {
        return (
            <div className="resume-prompt">
                <p>{t.resumePrompt}</p>
                <button onClick={() => handleResume(true)}>{t.resumeYes}</button>
                <button onClick={() => handleResume(false)} className="secondary">{t.resumeNo}</button>
            </div>
        )
    }

    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t.loadingMessage}</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={handleReset}>{t.tryAgainButton}</button>
        </div>
      );
    }
    
    if (isReviewing) {
        return (
            <div className="review-container">
                <div className="review-header no-print">
                     <h2>{t.reviewButton}</h2>
                     <div>
                        <button onClick={() => setIsReviewing(false)} className="secondary">{t.backToResults}</button>
                        <button onClick={handlePrint}>{t.printButton}</button>
                    </div>
                </div>
                {quizData?.map((q, index) => {
                    const userAnswer = userAnswers[index];
                    const isCorrect = userAnswer === q.correctAnswer;
                    return (
                        <div key={index} className={`review-card ${isCorrect ? 'correct-border' : 'incorrect-border'}`}>
                            <h3>{t.question} {index + 1}: {q.question}</h3>
                            <p><strong>{t.yourAnswer}</strong> <span className={isCorrect ? 'correct-text' : 'incorrect-text'}>{userAnswer}</span></p>
                            {!isCorrect && <p><strong>{t.correctAnswer}</strong> <span className="correct-text">{q.correctAnswer}</span></p>}
                            <div className="explanation">
                                <strong>{t.explanation}:</strong> {q.explanation}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (isQuizFinished) {
      return (
        <div className="results-container">
          <h2>{t.completeTitle}</h2>
          <p>
            {t.completeMessage} <strong>{score}</strong> {t.outOf}{' '}
            <strong>{quizData?.length}</strong> {t.questions}.
          </p>
          <div className="results-actions">
            <button onClick={handleReset}>{t.tryAgainButton}</button>
            <button onClick={() => setIsReviewing(true)}>{t.reviewButton}</button>
          </div>
        </div>
      );
    }

    if (quizData) {
      const currentQuestion = quizData[currentQuestionIndex];
      const selectedAnswer = userAnswers[currentQuestionIndex];
      const progress = ((currentQuestionIndex) / quizData.length) * 100;

      return (
        <div className={`quiz-container ${selectedAnswer ? 'answered' : ''}`}>
          <div className="quiz-header no-print">
            <div className="progress-bar">
                <div className="progress" style={{ width: `${progress}%` }}></div>
            </div>
            <button className="exit-btn" onClick={() => setShowExitConfirm(true)}>{t.exitButton}</button>
          </div>
          <h2>{t.question} {currentQuestionIndex + 1}: {currentQuestion.question}</h2>
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
    }
    
    return null;
  };

  const renderExitConfirmation = () => {
    if (!showExitConfirm) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{t.exitConfirmTitle}</h2>
                <p>{t.exitConfirmMessage}</p>
                <div className="modal-actions">
                    <button onClick={() => setShowExitConfirm(false)} className="secondary">{t.cancelExit}</button>
                    <button onClick={handleConfirmExit} className="danger">{t.confirmExit}</button>
                </div>
            </div>
        </div>
    )
  }

  return (
    <>
      {renderLanguageSwitcher()}
      <div className="app-container">
        <h1 className="print-only">{t.title}: {topic}</h1>
        <h1 className="no-print">{t.title}</h1>
        {!quizData && !isLoading && !isQuizFinished && !showResumePrompt && (
           <div className="setup-container">
              <div className="options-grid">
                <div>
                  <label htmlFor="numQuestions">{t.numQuestionsLabel}</label>
                  <select id="numQuestions" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="difficulty">{t.difficultyLabel}</label>
                  <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
                    <option value="easy">{t.difficulties.easy}</option>
                    <option value="medium">{t.difficulties.medium}</option>
                    <option value="hard">{t.difficulties.hard}</option>
                  </select>
                </div>
              </div>
              <div className="input-container">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t.topicPlaceholder}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateQuiz()}
                  />
                  <button onClick={handleGenerateQuiz} disabled={isLoading || !topic.trim()}>
                    {t.generateButton}
                  </button>
              </div>
           </div>
        )}
        {renderContent()}
      </div>
      {renderExitConfirmation()}
    </>
  );
};

export default App;
