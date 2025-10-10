// Định nghĩa kiểu dữ liệu cho một câu hỏi
export interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

// Định nghĩa kiểu dữ liệu cho toàn bộ bài quiz
export type QuizData = Question[];

// Định nghĩa kiểu dữ liệu cho trạng thái được lưu
export interface SavedState {
  quizData: QuizData;
  currentQuestionIndex: number;
  userAnswers: (string | null)[];
  score: number;
  topic: string;
  language: 'vi' | 'en';
}

export type Language = 'vi' | 'en';
export type Difficulty = 
  'very_easy' | 
  'easy' | 
  'medium' | 
  'hard' | 
  'very_hard' | 
  'extreme';
