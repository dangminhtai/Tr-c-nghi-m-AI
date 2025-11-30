
import React from 'react';
import { Difficulty, Language } from '../types';
import FileUploader from './FileUploader';

interface QuizSetupProps {
  inputMode: 'topic' | 'file' | 'challenge';
  setInputMode: (mode: 'topic' | 'file' | 'challenge') => void;
  topic: string;
  setTopic: (t: string) => void;
  numQuestions: number | '';
  setNumQuestions: (n: number | '') => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  model: string;
  setModel: (m: string) => void;
  availableModels: string[];
  files: File[];
  onFilesChange: (files: File[]) => void;
  allowedFileTypes: string[];
  challengeCodeInput: string;
  setChallengeCodeInput: (c: string) => void;
  translations: any;
  onGenerate: () => void;
  onRandomTopic: () => void;
  isGenerating: boolean;
  error: string | null;
}

const QuizSetup: React.FC<QuizSetupProps> = ({
  inputMode, setInputMode,
  topic, setTopic,
  numQuestions, setNumQuestions,
  difficulty, setDifficulty,
  model, setModel, availableModels,
  files, onFilesChange, allowedFileTypes,
  challengeCodeInput, setChallengeCodeInput,
  translations: t,
  onGenerate,
  onRandomTopic,
  isGenerating,
  error
}) => {

  const isGenerateDisabled = isGenerating || 
    (inputMode === 'topic' && (!topic.trim() || !numQuestions)) || 
    (inputMode === 'file' && (files.length === 0 || !numQuestions)) ||
    (inputMode === 'challenge' && !challengeCodeInput.trim());

  return (
    <div className="setup-container fade-in">
      <div className="input-mode-switcher">
        <button className={inputMode === 'topic' ? 'active' : ''} onClick={() => setInputMode('topic')}>{t.enterTopic}</button>
        <button className={inputMode === 'file' ? 'active' : ''} onClick={() => setInputMode('file')}>{t.uploadDocument}</button>
        <button className={inputMode === 'challenge' ? 'active' : ''} onClick={() => setInputMode('challenge')}>{t.challenge}</button>
      </div>

      {inputMode !== 'challenge' && (
        <div className="options-grid">
          <div className="form-group">
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
                } else {
                  setNumQuestions(Math.max(1, Math.min(100, parseInt(val, 10))));
                }
              }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="difficulty">{t.difficultyLabel}</label>
            <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
              {Object.entries(t.difficulties).map(([key, label]) => (
                <option key={key} value={key}>{label as string}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="model">{t.modelLabel}</label>
            <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      )}

      {inputMode === 'topic' && (
        <div className="topic-input-container form-group">
          <label htmlFor="topic-input">{t.topicPlaceholder}</label>
          <textarea
            id="topic-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t.topicPlaceholder}
            rows={5}
          />
        </div>
      )}

      {inputMode === 'file' && (
        <FileUploader 
            files={files} 
            onFilesChange={onFilesChange}
            allowedTypes={allowedFileTypes}
            translations={t}
        />
      )}

      {inputMode === 'challenge' && (
        <div className="challenge-input-container form-group">
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

      {error && <p className="error-message centered">{error}</p>}

      <div className="setup-actions">
        {inputMode === 'topic' && (
          <button onClick={onRandomTopic} className="secondary btn-icon">
            🎲 {t.randomTopicButton}
          </button>
        )}
        <button onClick={onGenerate} disabled={isGenerateDisabled} className={`primary ${isGenerating ? 'loading' : ''}`}>
          {isGenerating ? t.loadingMessage : (inputMode === 'challenge' ? t.startChallengeButton : t.generateButton)}
        </button>
      </div>
    </div>
  );
};

export default QuizSetup;
