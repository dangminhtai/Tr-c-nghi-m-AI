
import React from 'react';
import { useQuizLogic } from './hooks/useQuizLogic';
import QuizSetup from './components/QuizSetup';
import QuizActive from './components/QuizActive';
import QuizReview from './components/QuizReview';
import QuizResults from './components/QuizResults';

const App = () => {
  const {
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
    error,
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
  } = useQuizLogic();

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    handleReset();
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
    
    if (isReviewing && quizData) {
        return (
            <QuizReview 
                t={t} 
                quizData={quizData} 
                userAnswers={userAnswers} 
                setIsReviewing={setIsReviewing} 
            />
        )
    }

    if (isQuizFinished) {
      return (
        <QuizResults 
            t={t} 
            score={score} 
            totalQuestions={quizData?.length || 0} 
            handleReset={handleReset} 
            setIsReviewing={setIsReviewing} 
            generatedChallengeCode={generatedChallengeCode} 
            handleCopyCode={handleCopyCode} 
            isCopied={isCopied} 
        />
      );
    }

    if (quizData) {
      return (
        <QuizActive 
            t={t} 
            quizData={quizData} 
            currentQuestionIndex={currentQuestionIndex} 
            userAnswers={userAnswers} 
            handleAnswerSelect={handleAnswerSelect} 
            handleNextQuestion={handleNextQuestion} 
            setShowExitConfirm={setShowExitConfirm} 
            setShowShareModal={setShowShareModal} 
            generatedChallengeCode={generatedChallengeCode} 
            inputMode={inputMode} 
        />
      );
    }
    
    return null;
  };

  return (
    <>
      {renderLanguageSwitcher()}
      <div className="app-container">
        <h1 className="print-only">{t.title}: {topic}</h1>
        <h1 className="no-print">{t.title}</h1>
        {!quizData && !isLoading && !isQuizFinished && !showResumePrompt && (
           <QuizSetup 
             t={t}
             inputMode={inputMode} setInputMode={setInputMode}
             topic={topic} setTopic={setTopic}
             numQuestions={numQuestions} setNumQuestions={setNumQuestions}
             difficulty={difficulty} setDifficulty={setDifficulty}
             model={model} setModel={setModel}
             uploadedFiles={uploadedFiles}
             fileInputRef={fileInputRef}
             handleFiles={handleFiles}
             removeFile={removeFile}
             challengeCodeInput={challengeCodeInput} setChallengeCodeInput={setChallengeCodeInput}
             error={error}
             isLoading={isLoading}
             handleGenerateQuiz={handleGenerateQuiz}
             handleRandomTopic={handleRandomTopic}
           />
        )}
        {renderContent()}
      </div>

      {showExitConfirm && (
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
      )}

      {showShareModal && (
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
      )}
    </>
  );
};

export default App;
