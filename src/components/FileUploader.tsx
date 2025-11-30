
import React, { useState, useEffect, useCallback } from 'react';
import { formatFileSize } from '../utils/helpers';

interface FileUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  allowedTypes: string[];
  maxTotalSizeMB?: number;
  translations: any;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  files, 
  onFilesChange, 
  allowedTypes, 
  maxTotalSizeMB = 15,
  translations: t 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTotalSize = (fileList: File[]) => fileList.reduce((acc, file) => acc + file.size, 0);

  const validateAndAddFiles = useCallback((newFiles: File[]) => {
    let validFiles: File[] = [];
    let currentTotalSize = calculateTotalSize(files);
    const maxBytes = maxTotalSizeMB * 1024 * 1024;
    let tempError = null;

    for (const file of newFiles) {
      if (!allowedTypes.includes(file.type)) {
        tempError = t.fileTypeError;
        continue;
      }
      if (currentTotalSize + file.size > maxBytes) {
        tempError = `Tổng dung lượng vượt quá ${maxTotalSizeMB}MB.`;
        continue;
      }
      currentTotalSize += file.size;
      validFiles.push(file);
    }

    if (tempError) setError(tempError);
    else setError(null);

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
  }, [files, allowedTypes, maxTotalSizeMB, onFilesChange, t]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    validateAndAddFiles(droppedFiles);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      e.preventDefault();
      const pastedFiles = Array.from(e.clipboardData.files);
      validateAndAddFiles(pastedFiles);
    }
  }, [validateAndAddFiles]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
    setError(null);
  };

  return (
    <div className="file-upload-wrapper">
      <div 
        className={`file-upload-area ${isDragging ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('hidden-file-input')?.click()}
      >
        <input 
          id="hidden-file-input"
          type="file" 
          multiple 
          onChange={(e) => e.target.files && validateAndAddFiles(Array.from(e.target.files))}
          accept={allowedTypes.join(',')}
          style={{ display: 'none' }}
        />
        <div className="upload-icon">📁</div>
        <p>
          {t.dragDrop} <span>{t.browse}</span>
        </p>
        <p className="sub-text">{t.supportedFiles}</p>
        <p className="sub-text" style={{ marginTop: '0.5rem', color: '#6b7280' }}>
            (Hỗ trợ Ctrl+V để dán ảnh trực tiếp)
        </p>
      </div>

      {error && <div className="error-message-small">{error}</div>}

      {files.length > 0 && (
        <div className="file-list">
            <div className="file-list-header">
                <span>Đã chọn: {files.length} file</span>
                <span>{formatFileSize(calculateTotalSize(files))} / {maxTotalSizeMB}MB</span>
            </div>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="file-item">
              <div className="file-preview">
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt="preview" />
                ) : (
                  <div className="file-type-icon">{file.name.split('.').pop()}</div>
                )}
              </div>
              <div className="file-details">
                <span className="file-name" title={file.name}>{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
              <button className="remove-btn" onClick={() => removeFile(index)}>&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
