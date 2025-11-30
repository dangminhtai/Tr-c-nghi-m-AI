
import React from 'react';
import { AVAILABLE_MODELS } from '../utils/helpers';
import { Difficulty } from '../types';

interface QuizSetupProps {
  t: any;
  inputMode: 'topic' | 'file' | 'challenge';
  setInputMode: (mode: 'topic' | 'file' | 'challenge') => void;
  topic: string;
  setTopic: (topic: string) => void;
  numQuestions: number | '';
  setNumQuestions: (num: number | '') => void;
  difficulty: Difficulty;
  setDifficulty: (diff: Difficulty) => void;
  model: string;
  setModel: (model: string) => void;
  uploadedFiles: File[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  challengeCodeInput: string;
  setChallengeCodeInput: (code: string) => void;
  error: string | null;
  isLoading: boolean;
  handleGenerateQuiz: () => void;
  handleRandomTopic: () => void;
}

const QuizSetup: React.FC<QuizSetupProps> = ({
  t, inputMode, setInputMode, topic, setTopic, numQuestions, setNumQuestions,
  difficulty, setDifficulty, model, setModel, uploadedFiles, fileInputRef,
  handleFiles, removeFile, challengeCodeInput, setChallengeCodeInput,
  error, isLoading, handleGenerateQuiz, handleRandomTopic
}) => {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        handleFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (inputMode !== 'file') return;
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            const file = items[i].getAsFile();
            if (file) pastedFiles.push(file);
        }
    }
    if (pastedFiles.length > 0) {
        e.preventDefault();
        handleFiles(pastedFiles);
    }
  };

  const isGenerateDisabled = isLoading || (inputMode === 'topic' && (!topic.trim() || !numQuestions)) || 
    (inputMode === 'file' && (uploadedFiles.length === 0 || !numQuestions)) ||
    (inputMode === 'challenge' && !challengeCodeInput.trim());
  
  const totalSizeMB = (uploadedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2);

  return (
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
                if (val === '') { setNumQuestions(''); return; }
                const num = parseInt(val, 10);
                if (!isNaN(num)) setNumQuestions(Math.max(1, Math.min(100, num)));
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
        <div className="file-upload-container" onPaste={handlePaste}>
            <input 
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp,.heic,.heif"
            />
            <div 
                className="file-upload-area"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files));
                }}
            >
                <p>{t.dragDrop} <span>{t.browse}</span></p>
                <p style={{fontSize: '0.75rem'}}>({t.supportedFiles})</p>
            </div>
            {uploadedFiles.length > 0 && (
                <div className="file-list-container">
                     <div className="file-stats">
                         Total size: {totalSizeMB} MB / 15 MB
                     </div>
                     <div className="file-list">
                        {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="file-item">
                                <div className="file-icon">📄</div>
                                <span className="file-name" title={file.name}>{file.name}</span>
                                <button className="remove-file-btn" onClick={() => removeFile(idx)}>&times;</button>
                            </div>
                        ))}
                     </div>
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
  );
};

export default QuizSetup;
