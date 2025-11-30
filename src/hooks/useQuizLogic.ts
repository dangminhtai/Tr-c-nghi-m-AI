
import { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { QuizData, SavedState, Language, Difficulty, QuizConfig } from '../types';
import { translations } from '../translations';
import { TOPICS } from '../topics';
import { unicodeToBase64, base64ToUnicode, MAX_TOTAL_SIZE_BYTES, AVAILABLE_MODELS, ALLOWED_FILE_TYPES } from '../utils/helpers';

export const useQuizLogic = () => {
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
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Feature states
  const [inputMode, setInputMode] = useState<'topic' | 'file' | 'challenge'>('topic');
  
  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<{data: string; mimeType: string}[]>([]);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
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
  
  const handleFiles = (newFiles: File[]) => {
    const validFiles: File[] = [];
    let hasInvalidType = false;

    newFiles.forEach(file => {
        if (ALLOWED_FILE_TYPES.includes(file.type)) {
            validFiles.push(file);
        } else {
            hasInvalidType = true;
        }
    });

    if (hasInvalidType) {
        setError(t.fileTypeError);
    } else {
        setError(null);
    }

    if (validFiles.length === 0) return;

    const currentTotalSize = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
    const newFilesTotalSize = validFiles.reduce((acc, f) => acc + f.size, 0);

    if (currentTotalSize + newFilesTotalSize > MAX_TOTAL_SIZE_BYTES) {
        setError(t.fileSizeError);
        return;
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            setFileContents(prev => [...prev, { data: base64String, mimeType: file.type }]);
        };
        reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileContents(prev => prev.filter((_, i) => i !== index));
    setError(null);
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

            if (decodedConfig.v !== 1 || !decodedConfig.topic || !decodedConfig.numQuestions || !decodedConfig.difficulty) {
                throw new Error("Invalid challenge code structure");
            }
            quizConfig = decodedConfig;
            
            setLanguage(quizConfig!.language);
            setTopic(quizConfig!.topic);
            setNumQuestions(quizConfig!.numQuestions);
            setDifficulty(quizConfig!.difficulty);
            setModel(quizConfig!.model);
            setGeneratedChallengeCode(challengeCodeInput.trim());

        } catch (e) {
            console.error(e);
            setError(t.invalidChallengeCode);
            setIsLoading(false);
            return;
        }
    } else {
        const isReady = (inputMode === 'topic' && topic.trim() && numQuestions) || (inputMode === 'file' && uploadedFiles.length > 0 && numQuestions);
        if (!isReady) {
            setIsLoading(false);
            return;
        }
        
        let quizTopic = topic;
        
        if (inputMode === 'topic') {
            const seed = Math.floor(Math.random() * 1000000);
            quizConfig = { v: 1, topic, numQuestions: Number(numQuestions), difficulty, language, model, seed, mode: 'topic' };
            setGeneratedChallengeCode(unicodeToBase64(JSON.stringify(quizConfig)));
        } else {
            quizTopic = uploadedFiles.map(f => f.name).join(', ').substring(0, 50) + (uploadedFiles.length > 1 ? '...' : '');
            quizConfig = { v: 1, topic: quizTopic, numQuestions: Number(numQuestions), difficulty, language, model, mode: 'file', fileContents };
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
      
      if (quizConfig.mode === 'file' && quizConfig.fileContents) {
        const fileParts = quizConfig.fileContents.map(content => ({
            inlineData: content
        }));
        const textPart = { text: t.filePromptTemplate(quizConfig.numQuestions, t.difficulties[quizConfig.difficulty]) };
        contents = { parts: [textPart, ...fileParts] };
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
    if (quizData && currentQuestionIndex < quizData.length - 1) {
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
    setUploadedFiles([]);
    setFileContents([]);
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

  return {
    language, setLanguage,
    topic, setTopic,
    numQuestions, setNumQuestions,
    difficulty, setDifficulty,
    model, setModel,
    quizData,
    currentQuestionIndex,
    userAnswers,
    score,
    isLoading,
    isQuizFinished,
    isReviewing, setIsReviewing,
    error, setError,
    showResumePrompt,
    showExitConfirm, setShowExitConfirm,
    showShareModal, setShowShareModal,
    inputMode, setInputMode,
    uploadedFiles,
    fileInputRef,
    challengeCodeInput, setChallengeCodeInput,
    generatedChallengeCode,
    isCopied,
    t,
    handleResume,
    handleRandomTopic,
    handleFiles,
    removeFile,
    handleGenerateQuiz,
    handleAnswerSelect,
    handleNextQuestion,
    handleReset,
    handleCopyCode
  };
};
