import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// Định nghĩa kiểu dữ liệu cho một câu hỏi
interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

// Định nghĩa kiểu dữ liệu cho toàn bộ bài quiz
type QuizData = Question[];

const App = () => {
  const [topic, setTopic] = useState<string>('10 câu hỏi trắc nghiệm về HTML cơ bản');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isQuizFinished, setIsQuizFinished] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setQuizData(null);
    setScore(0);
    setCurrentQuestionIndex(0);
    setIsQuizFinished(false);
    setSelectedAnswer(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Tạo một bài kiểm tra trắc nghiệm về chủ đề sau: "${topic}". Mỗi câu hỏi phải có 4 lựa chọn. Đảm bảo rằng correctAnswer phải là một trong các giá trị trong mảng options.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });
      
      const parsedData = JSON.parse(response.text);
      setQuizData(parsedData);

    } catch (e) {
      console.error(e);
      setError('Không thể tạo câu hỏi. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAnswerSelect = (option: string) => {
    if (selectedAnswer !== null) return; // Đã trả lời rồi thì không cho chọn lại

    setSelectedAnswer(option);
    if (option === quizData![currentQuestionIndex].correctAnswer) {
      setScore(prevScore => prevScore + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData!.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedAnswer(null);
    } else {
      setIsQuizFinished(true);
    }
  };

  const handleReset = () => {
    setQuizData(null);
    setTopic('');
    setIsQuizFinished(false);
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>AI đang soạn câu hỏi, vui lòng chờ...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="error-container">
          <p className="error-message">{error}</p>
        </div>
      );
    }
    
    if (isQuizFinished) {
      return (
        <div className="results-container">
          <h2>Hoàn thành!</h2>
          <p>
            Bạn đã trả lời đúng <strong>{score}</strong> trên{' '}
            <strong>{quizData?.length}</strong> câu.
          </p>
          <button onClick={handleReset}>Làm bài khác</button>
        </div>
      );
    }

    if (quizData) {
      const currentQuestion = quizData[currentQuestionIndex];
      return (
        <div className={`quiz-container ${selectedAnswer ? 'answered' : ''}`}>
          <h2>Câu {currentQuestionIndex + 1}: {currentQuestion.question}</h2>
          <ul className="options-list">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = option === currentQuestion.correctAnswer;
              const isSelected = option === selectedAnswer;
              
              let btnClass = 'option-btn';
              if (selectedAnswer !== null) {
                if (isCorrect) btnClass += ' correct';
                else if (isSelected) btnClass += ' incorrect';
              } else if (isSelected) {
                 btnClass += ' selected'
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
              <strong>Giải thích:</strong> {currentQuestion.explanation}
            </div>
          )}
          <div className="quiz-footer">
            <span>{currentQuestionIndex + 1} / {quizData.length}</span>
            {selectedAnswer && (
              <button onClick={handleNextQuestion}>
                {currentQuestionIndex < quizData.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
              </button>
            )}
          </div>
        </div>
      );
    }
    
    // Màn hình chính
    return null;
  };

  return (
    <div className="app-container">
      <h1>Trắc Nghiệm AI</h1>
      {!quizData && !isLoading && !isQuizFinished &&(
         <div className="input-container">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Nhập chủ đề bạn muốn..."
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateQuiz()}
            />
            <button onClick={handleGenerateQuiz} disabled={isLoading || !topic.trim()}>
              Tạo Đề Thi
            </button>
         </div>
      )}
      {renderContent()}
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
