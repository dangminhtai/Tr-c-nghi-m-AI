import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { QuizData, SavedState, Language, Difficulty, QuizConfig } from './types';
import { translations } from './translations';
import { TOPICS } from './topics';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';


const AVAILABLE_MODELS = [
 'gemini-2.5-flash',
 'gemini-2.5-pro',
 'gemini-2.5-flash-lite',
 'gemini-2.0-flash',
];

const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif'
];

// Helper function to encode a UTF-8 string to Base64, correctly handling Unicode characters.
// This is necessary because btoa() does not support multi-byte characters.
function unicodeToBase64(str: string): string {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(_match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        }));
}

// Helper function to decode a Base64 string to UTF-8, correctly handling Unicode characters.
function base64ToUnicode(str: string): string {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}


const App = () => {
  const [language, setLanguage] = useState<Language>('vi');
  const [topic, setTopic] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number | ''>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [model, setModel] = useState<string>(AVAILABLE_MODELS[0]);
  
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

  // Feature states
  const [inputMode, setInputMode] = useState<'topic' | 'file' | 'challenge'>('topic');
  
  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<{data: string; mimeType: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Challenge mode states
  const [challengeCodeInput, setChallengeCodeInput] = useState<string>('');
  const [generatedChallengeCode, setGeneratedChallengeCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);


  const t = useMemo(() => translations[language], [language]);

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem('quizProgress');
      if (savedStateJSON) {
        setShowResumePrompt(true);
      } else {
        const randomTopicIndex = Math.floor(Math.random() * TOPICS[language].length);
        setTopic(TOPICS[language][randomTopicIndex]);
      }
    } catch (e) {
      console.error("Could not access localStorage:", e);
      const randomTopicIndex = Math.floor(Math.random() * TOPICS['vi'].length);
      setTopic(TOPICS['vi'][randomTopicIndex]);
    }
  }, []);
  
  useEffect(() => {
    try {
      if (quizData && !isQuizFinished) {
        const stateToSave: SavedState = {
          quizData, currentQuestionIndex, userAnswers, score, topic, language, generatedChallengeCode
        };
        localStorage.setItem('quizProgress', JSON.stringify(stateToSave));
      } else {
        localStorage.removeItem('quizProgress');
      }
    } catch (e) {
      console.error("Could not access localStorage:", e);
    }
  }, [quizData, currentQuestionIndex, userAnswers, score, isQuizFinished, topic, language, generatedChallengeCode]);

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
          setGeneratedChallengeCode(savedState.generatedChallengeCode);
        }
      } catch (e) {
         console.error("Failed to parse saved state:", e);
         localStorage.removeItem('quizProgress');
      }
    } else {
      localStorage.removeItem('quizProgress');
      const randomTopicIndex = Math.floor(Math.random() * TOPICS[language].length);
      setTopic(TOPICS[language][randomTopicIndex]);
    }
  };

  const handleRandomTopic = () => {
    const currentTopics = TOPICS[language];
    let newTopic = topic;
    if (currentTopics.length > 1) {
      do {
        const randomIndex = Math.floor(Math.random() * currentTopics.length);
        newTopic = currentTopics[randomIndex];
      } while (newTopic === topic);
    } else if (currentTopics.length === 1) {
      newTopic = currentTopics[0];
    }
    setTopic(newTopic);
  };
  
  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setError(t.fileTypeError);
        return;
    }
    
    setError(null);
    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setFileContent({ data: base64String, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    setError(null);
    setQuizData(null);
    setScore(0);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setIsQuizFinished(false);
    setIsReviewing(false);
    setGeneratedChallengeCode(null);

    let quizConfig: QuizConfig | null = null;
    
    if (inputMode === 'challenge') {
        try {
            const decodedString = base64ToUnicode(challengeCodeInput.trim());
            const decodedConfig = JSON.parse(decodedString);

            if (decodedConfig.v !== 1 || !decodedConfig.topic || !decodedConfig.numQuestions || !decodedConfig.difficulty || typeof decodedConfig.seed === 'undefined') {
                throw new Error("Invalid challenge code structure");
            }
            quizConfig = decodedConfig;
            
            // Sync app state with challenge code settings
            setLanguage(quizConfig.language);
            setTopic(quizConfig.topic);
            setNumQuestions(quizConfig.numQuestions);
            setDifficulty(quizConfig.difficulty);
            setModel(quizConfig.model);
            setGeneratedChallengeCode(challengeCodeInput.trim());

        } catch (e) {
            console.error(e);
            setError(t.invalidChallengeCode);
            setIsLoading(false);
            return;
        }
    } else {
        const isReady = (inputMode === 'topic' && topic.trim() && numQuestions) || (inputMode === 'file' && uploadedFile && numQuestions);
        if (!isReady) {
            setIsLoading(false);
            return;
        }
        
        let quizTopic = topic;
        
        if (inputMode === 'topic') {
            const seed = Math.floor(Math.random() * 1000000);
            quizConfig = { v: 1, topic, numQuestions: Number(numQuestions), difficulty, language, model, seed, mode: 'topic' };
            setGeneratedChallengeCode(unicodeToBase64(JSON.stringify(quizConfig)));
        } else { // File mode
            quizTopic = uploadedFile?.name || t.uploadedFile;
            quizConfig = { v: 1, topic: quizTopic, numQuestions: Number(numQuestions), difficulty, language, model, mode: 'file', fileContent };
        }
        setTopic(quizTopic);
    }
    
    if (!quizConfig) {
      setError(t.errorMessage);
      setIsLoading(false);
      return;
    }

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

      let contents;
      
      if (quizConfig.mode === 'file' && quizConfig.fileContent) {
        const filePart = { inlineData: quizConfig.fileContent };
        const textPart = { text: t.filePromptTemplate(quizConfig.numQuestions, t.difficulties[quizConfig.difficulty]) };
        contents = { parts: [textPart, filePart] };
      } else {
        contents = t.promptTemplate(quizConfig.topic, quizConfig.numQuestions, t.difficulties[quizConfig.difficulty]);
      }
      
      const apiConfig: { responseMimeType: string, responseSchema: object, seed?: number } = {
        responseMimeType: 'application/json',
        responseSchema,
      };

      if (typeof quizConfig.seed !== 'undefined') {
        apiConfig.seed = quizConfig.seed;
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: quizConfig.model,
        contents,
        config: apiConfig,
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
    const randomTopicIndex = Math.floor(Math.random() * TOPICS[language].length);
    setTopic(TOPICS[language][randomTopicIndex]);
    setIsQuizFinished(false);
    setIsReviewing(false);
    setInputMode('topic');
    setUploadedFile(null);
    setFileContent(null);
    setError(null);
    setChallengeCodeInput('');
    setGeneratedChallengeCode(null);
    localStorage.removeItem('quizProgress');
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    handleReset();
  };

  const handlePrint = () => {
      window.print();
  };

  const handleCopyCode = () => {
    if (generatedChallengeCode) {
        navigator.clipboard.writeText(generatedChallengeCode).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    }
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
    
    if (error && !quizData) {
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
                            <h3>{t.question} {index + 1}:</h3>
                          <ReactMarkdown
                      components={{
                        // FIX: Destructure `node` prop to help TypeScript correctly infer types for `react-markdown` custom components.
                        // This resolves the error on the `inline` property.
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              // FIX: Cast `oneDark` style to `any` to work around a type incompatibility issue
                              // in `@types/react-syntax-highlighter`. Also, removed `{...props}` which are not
                              // valid for this component and could pass invalid attributes like `inline`.
                              style={oneDark as any}
                              language={match[1]}
                              PreTag="div"
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {q.question}
                    </ReactMarkdown>

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
          <h2>{t.question} {currentQuestionIndex + 1}:</h2>
<ReactMarkdown
  components={{
    // FIX: Destructure `node` prop to help TypeScript correctly infer types for `react-markdown` custom components.
    // This resolves the error on the `inline` property.
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          // FIX: Cast `oneDark` style to `any` to work around a type incompatibility issue
          // in `@types/react-syntax-highlighter`. Also, removed `{...props}` which are not
          // valid for this component and could pass invalid attributes like `inline`.
          style={oneDark as any}
          language={match[1]}
          PreTag="div"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  }}
>
  {currentQuestion.question}
</ReactMarkdown>


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
  
  const isGenerateDisabled = isLoading || (inputMode === 'topic' && (!topic.trim() || !numQuestions)) || 
    (inputMode === 'file' && (!uploadedFile || !numQuestions)) ||
    (inputMode === 'challenge' && !challengeCodeInput.trim());

  return (
    <>
      {renderLanguageSwitcher()}
      <div className="app-container">
        <h1 className="print-only">{t.title}: {topic}</h1>
        <h1 className="no-print">{t.title}</h1>
        {!quizData && !isLoading && !isQuizFinished && !showResumePrompt && (
           <div className="setup-container">
            <div className="input-mode-switcher">
                <button className={inputMode === 'topic' ? 'active' : ''} onClick={() => setInputMode('topic')}>{t.enterTopic}</button>
                <button className={inputMode === 'file' ? 'active' : ''} onClick={() => setInputMode('file')}>{t.uploadDocument}</button>
                <button className={inputMode === 'challenge' ? 'active' : ''} onClick={() => setInputMode('challenge')}>{t.challenge}</button>
            </div>

            {inputMode !== 'challenge' && (
              <div className="options-grid">
                <div>
                  <label htmlFor="numQuestions">{t.numQuestionsLabel}</label>
                  <input
                    type="number"
                    id="numQuestions"
                    min="1"
                    max="100"
                    value={numQuestions}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setNumQuestions('');
                        return;
                      }
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) {
                        setNumQuestions(Math.max(1, Math.min(100, num)));
                      }
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="difficulty">{t.difficultyLabel}</label>
                  <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
                    <option value="very_easy">{t.difficulties.very_easy}</option>
                    <option value="easy">{t.difficulties.easy}</option>
                    <option value="medium">{t.difficulties.medium}</option>
                    <option value="hard">{t.difficulties.hard}</option>
                    <option value="very_hard">{t.difficulties.very_hard}</option>
                    <option value="extreme">{t.difficulties.extreme}</option>
                  </select>
                </div>
                 <div>
                  <label htmlFor="model">{t.modelLabel}</label>
                  <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
                    {AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            )}
              
              {inputMode === 'topic' && (
                <div className="topic-input-container">
                  <label htmlFor="topic-input">{t.topicPlaceholder}</label>
                  <textarea
                    id="topic-input"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t.topicPlaceholder}
                    rows={6}
                  />
                </div>
              )}

              {inputMode === 'file' && (
                <div>
                    <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                        style={{ display: 'none' }}
                        accept={ALLOWED_FILE_TYPES.join(',')}
                    />
                    <div 
                        className="file-upload-area"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                        onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('drag-over');
                            handleFileChange(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
                        }}
                    >
                        <p>{t.dragDrop} <span>{t.browse}</span></p>
                        <p style={{fontSize: '0.75rem'}}>({t.supportedFiles})</p>
                    </div>
                    {uploadedFile && (
                        <div className="file-info">
                            <span>{uploadedFile.name}</span>
                            <button className="remove-file-btn" onClick={() => { setUploadedFile(null); setFileContent(null); }}>&times;</button>
                        </div>
                    )}
                </div>
              )}

              {inputMode === 'challenge' && (
                 <div className="challenge-input-container">
                    <label htmlFor="challenge-code-input">{t.challengeCodeInputLabel}</label>
                    <input 
                        type="text"
                        id="challenge-code-input"
                        value={challengeCodeInput}
                        onChange={(e) => setChallengeCodeInput(e.target.value)}
                        placeholder={t.challengeCodePlaceholder}
                    />
                 </div>
              )}

               {error && <p className="error-message" style={{textAlign: 'center'}}>{error}</p>}
              <div className="setup-actions">
                {inputMode === 'topic' && (
                  <button onClick={handleRandomTopic} className="secondary">
                    🎲 {t.randomTopicButton}
                  </button>
                )}
                <button onClick={handleGenerateQuiz} disabled={isGenerateDisabled}>
                  {inputMode === 'challenge' ? t.startChallengeButton : t.generateButton}
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
