
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { QuizData, SavedState, Language, Difficulty, QuizConfig, FileContent } from './types';
import { translations } from './translations';
import { TOPICS } from './topics';
import { unicodeToBase64, base64ToUnicode, readFileAsBase64 } from './utils/helpers';
import QuizSetup from './components/QuizSetup';
import ActiveQuiz from './components/ActiveQuiz';
import QuizResults from './components/QuizResults';

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

const App = () => {
  // Config State
  const [language, setLanguage] = useState<Language>('vi');
  const [topic, setTopic] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number | ''>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [model, setModel] = useState<string>(AVAILABLE_MODELS[0]);
  const [inputMode, setInputMode] = useState<'topic' | 'file' | 'challenge'>('topic');
  
  // File State
  const [files, setFiles] = useState<File[]>([]);

  // Challenge State
  const [challengeCodeInput, setChallengeCodeInput] = useState<string>('');
  const [generatedChallengeCode, setGeneratedChallengeCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Quiz Runtime State
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [score, setScore] = useState<number>(0);
  
  // UI Flow State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isQuizFinished, setIsQuizFinished] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const t = useMemo(() => translations[language], [language]);

  // Load Saved State
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
      console.error("Storage error:", e);
      setTopic(TOPICS['vi'][0]);
    }
  }, []);
  
  // Save State Persistence
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
      console.error("Save error:", e);
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
         localStorage.removeItem('quizProgress');
      }
    } else {
      localStorage.removeItem('quizProgress');
      handleRandomTopic();
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
    let finalTopic = topic;
    
    // --- MODE: CHALLENGE ---
    if (inputMode === 'challenge') {
        try {
            const decodedString = base64ToUnicode(challengeCodeInput.trim());
            const decodedConfig = JSON.parse(decodedString);

            if (decodedConfig.v !== 1 || !decodedConfig.topic || !decodedConfig.numQuestions || !decodedConfig.difficulty) {
                throw new Error("Invalid structure");
            }
            quizConfig = decodedConfig;
            
            // Sync state
            setLanguage(quizConfig!.language);
            setTopic(quizConfig!.topic);
            setNumQuestions(quizConfig!.numQuestions);
            setDifficulty(quizConfig!.difficulty);
            setModel(quizConfig!.model);
            setGeneratedChallengeCode(challengeCodeInput.trim());
            finalTopic = quizConfig!.topic;

        } catch (e) {
            setError(t.invalidChallengeCode);
            setIsLoading(false);
            return;
        }
    } else {
        // --- MODE: TOPIC & FILE ---
        const isReady = (inputMode === 'topic' && topic.trim() && numQuestions) || 
                        (inputMode === 'file' && files.length > 0 && numQuestions);
        
        if (!isReady) {
            setIsLoading(false);
            return;
        }
        
        const seed = Math.floor(Math.random() * 1000000);

        if (inputMode === 'topic') {
            quizConfig = { v: 1, topic, numQuestions: Number(numQuestions), difficulty, language, model, seed, mode: 'topic' };
            setGeneratedChallengeCode(unicodeToBase64(JSON.stringify(quizConfig)));
        } else { 
            // Process Multiple Files
            try {
                const processedFiles: FileContent[] = await Promise.all(
                  files.map(async (file) => ({
                    name: file.name,
                    mimeType: file.type,
                    data: await readFileAsBase64(file)
                  }))
                );
                
                finalTopic = processedFiles.map(f => f.name).join(', ') || t.uploadedFile;
                
                quizConfig = { 
                    v: 1, 
                    topic: finalTopic, 
                    numQuestions: Number(numQuestions), 
                    difficulty, 
                    language, 
                    model, 
                    mode: 'file', 
                    fileContents: processedFiles // New structure
                };
            } catch (err) {
                setError("Error reading files.");
                setIsLoading(false);
                return;
            }
        }
        setTopic(finalTopic);
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
      
      // Build Prompt
      if (quizConfig.mode === 'file' && quizConfig.fileContents) {
        // Multi-part content
        const fileParts = quizConfig.fileContents.map(f => ({
            inlineData: { data: f.data, mimeType: f.mimeType }
        }));
        const textPart = { 
            text: t.filePromptTemplate(quizConfig.numQuestions, t.difficulties[quizConfig.difficulty]) 
        };
        contents = { parts: [textPart, ...fileParts] };
      } else {
        contents = t.promptTemplate(quizConfig.topic, quizConfig.numQuestions, t.difficulties[quizConfig.difficulty]);
      }
      
      const apiConfig: any = {
        responseMimeType: 'application/json',
        responseSchema,
        seed: quizConfig.seed
      };

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: quizConfig.model,
        contents,
        config: apiConfig,
      });
      
      const parsedData: QuizData = JSON.parse(response.text);
      if (!Array.isArray(parsedData) || parsedData.length === 0) throw new Error("Empty response");

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
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData!.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsQuizFinished(true);
    }
  };

  const handleReset = () => {
    setQuizData(null);
    handleRandomTopic();
    setIsQuizFinished(false);
    setIsReviewing(false);
    setInputMode('topic');
    setFiles([]); // Reset files
    setError(null);
    setChallengeCodeInput('');
    setGeneratedChallengeCode(null);
    localStorage.removeItem('quizProgress');
  };

  const handleCopyCode = () => {
    if (generatedChallengeCode) {
        navigator.clipboard.writeText(generatedChallengeCode).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    }
  };

  // --- Render Functions ---

  const renderLanguageSwitcher = () => (
    <div className="language-switcher no-print">
      <button onClick={() => setLanguage('vi')} className={language === 'vi' ? 'active' : ''}>VI</button>
      <button onClick={() => setLanguage('en')} className={language === 'en' ? 'active' : ''}>EN</button>
    </div>
  );

  const renderExitConfirmation = () => showExitConfirm && (
    <div className="modal-overlay">
        <div className="modal-content">
            <h2>{t.exitConfirmTitle}</h2>
            <p>{t.exitConfirmMessage}</p>
            <div className="modal-actions">
                <button onClick={() => setShowExitConfirm(false)} className="secondary">{t.cancelExit}</button>
                <button onClick={() => { setShowExitConfirm(false); handleReset(); }} className="danger">{t.confirmExit}</button>
            </div>
        </div>
    </div>
  );

  const renderShareModal = () => showShareModal && (
    <div className="modal-overlay">
        <div className="modal-content share-modal-content">
            <h2>{t.shareModalTitle}</h2>
            <p>{t.shareModalInstruction}</p>
             <div className="challenge-code-box">
                <input type="text" readOnly value={generatedChallengeCode || ''} />
                <button className="copy-btn" onClick={handleCopyCode}>
                    {isCopied ? t.copied : t.copy}
                </button>
            </div>
            <div className="modal-actions">
                <button onClick={() => setShowShareModal(false)}>{t.closeButton}</button>
            </div>
        </div>
    </div>
  );

  // --- Main Render Logic ---

  return (
    <>
      {renderLanguageSwitcher()}
      <div className="app-container">
        <h1 className="print-only">{t.title}: {topic}</h1>
        <h1 className="no-print gradient-text">{t.title}</h1>
        
        {/* Resume Prompt */}
        {showResumePrompt && (
            <div className="resume-prompt card">
                <p>{t.resumePrompt}</p>
                <div className="actions">
                    <button onClick={() => handleResume(true)} className="primary">{t.resumeYes}</button>
                    <button onClick={() => handleResume(false)} className="secondary">{t.resumeNo}</button>
                </div>
            </div>
        )}

        {/* Loading */}
        {!showResumePrompt && isLoading && (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>{t.loadingMessage}</p>
            </div>
        )}

        {/* Setup Screen */}
        {!showResumePrompt && !isLoading && !quizData && !isQuizFinished && (
            <QuizSetup 
                inputMode={inputMode}
                setInputMode={setInputMode}
                topic={topic}
                setTopic={setTopic}
                numQuestions={numQuestions}
                setNumQuestions={setNumQuestions}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                model={model}
                setModel={setModel}
                availableModels={AVAILABLE_MODELS}
                files={files}
                onFilesChange={setFiles}
                allowedFileTypes={ALLOWED_FILE_TYPES}
                challengeCodeInput={challengeCodeInput}
                setChallengeCodeInput={setChallengeCodeInput}
                translations={t}
                onGenerate={handleGenerateQuiz}
                onRandomTopic={handleRandomTopic}
                isGenerating={isLoading}
                error={error}
            />
        )}

        {/* Quiz & Results */}
        {!showResumePrompt && !isLoading && (
            <>
                {isQuizFinished ? (
                    <QuizResults 
                        quizData={quizData || []}
                        userAnswers={userAnswers}
                        score={score}
                        isReviewing={isReviewing}
                        setIsReviewing={setIsReviewing}
                        onReset={handleReset}
                        onPrint={() => window.print()}
                        generatedChallengeCode={generatedChallengeCode}
                        onCopyCode={handleCopyCode}
                        isCopied={isCopied}
                        translations={t}
                    />
                ) : quizData && (
                    <ActiveQuiz 
                        quizData={quizData}
                        currentQuestionIndex={currentQuestionIndex}
                        userAnswers={userAnswers}
                        onAnswerSelect={handleAnswerSelect}
                        onNext={handleNextQuestion}
                        onExit={() => setShowExitConfirm(true)}
                        onShare={() => setShowShareModal(true)}
                        showShareButton={!!generatedChallengeCode && inputMode !== 'challenge'}
                        translations={t}
                    />
                )}
            </>
        )}
      </div>
      {renderExitConfirmation()}
      {renderShareModal()}
    </>
  );
};

export default App;
