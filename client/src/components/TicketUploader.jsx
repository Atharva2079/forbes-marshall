import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Camera, Type, X, Loader, CheckCircle2, AlertCircle, Trash2, ScanLine } from 'lucide-react';
import axios from 'axios';

const TABS = [
  { id: 'text',   icon: Type,     label: 'Text Input' },
  { id: 'upload', icon: Upload,   label: 'Upload File' },
  { id: 'camera', icon: Camera,   label: 'Scan' },
];

export default function TicketUploader({ onResults, onClose }) {
  const [activeTab,   setActiveTab]   = useState('text');
  const [textInput,   setTextInput]   = useState('');
  const [dragOver,    setDragOver]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [fileName,    setFileName]    = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [scanActive,  setScanActive]  = useState(false);
  const [scannedCodes, setScannedCodes] = useState([]);
  const fileInputRef = useRef(null);
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const scanInterval = useRef(null);

  // ─── TEXT INPUT ───────────────────────────────────
  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/parse-ticket-text', { text: textInput });
      onResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse text');
    }
    setLoading(false);
  }, [textInput, onResults]);

  // ─── FILE UPLOAD ─────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setPreview(null);

    // Show image preview for image files
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }

    try {
      const formData = new FormData();
      formData.append('ticket', file);

      const res = await axios.post('/api/upload-ticket', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.results?.length > 0 || res.data.notFound?.length > 0) {
        onResults(res.data);
      } else {
        setError(res.data.message || 'No item codes could be extracted from this file');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process file');
    }
    setLoading(false);
  }, [onResults]);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  // ─── CAMERA/BARCODE SCANNER ──────────────────────
  const startScanner = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setScanActive(true);

      // Use BarcodeDetector if available, otherwise poll with regex
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13', 'qr_code'] });
        scanInterval.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            barcodes.forEach(bc => {
              const val = bc.rawValue;
              if (val && !scannedCodes.includes(val)) {
                setScannedCodes(prev => [...prev, val]);
              }
            });
          } catch { /* silent */ }
        }, 500);
      }
    } catch (err) {
      setError('Camera access denied or unavailable. Try uploading a file instead.');
    }
  }, [scannedCodes]);

  const stopScanner = useCallback(() => {
    if (scanInterval.current) clearInterval(scanInterval.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanActive(false);
  }, []);

  const submitScannedCodes = useCallback(async () => {
    if (scannedCodes.length === 0) return;
    stopScanner();
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/batch-locate', { codes: scannedCodes });
      onResults({ ...res.data, ticketNo: null, itemCodes: scannedCodes, locatorCodes: [] });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to locate items');
    }
    setLoading(false);
  }, [scannedCodes, onResults, stopScanner]);

  const removeScannedCode = useCallback((code) => {
    setScannedCodes(prev => prev.filter(c => c !== code));
  }, []);

  // Assign video stream when camera becomes active
  React.useEffect(() => {
    if (scanActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
  }, [scanActive]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="ticket-uploader">
      {/* Header */}
      <div className="ticket-header">
        <div className="ticket-header-title">
          <FileText size={14} />
          <span>Ticket Scanner</span>
        </div>
        <button className="panel-close" onClick={onClose} title="Close">
          <X size={14} />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="ticket-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`ticket-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setError(null); }}
          >
            <tab.icon size={12} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="ticket-content">

        {/* ─── TEXT INPUT TAB ─── */}
        {activeTab === 'text' && (
          <div className="ticket-text-tab">
            <textarea
              className="ticket-textarea"
              placeholder={"Paste item codes or locator codes here...\n\nExamples:\n25-121-1114846\nD01-E22-B1\nP04-P05-B1, V03-V31-B1\n\nOr paste the entire ticket text content."}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              rows={8}
            />
            <div className="ticket-text-actions">
              <span className="ticket-hint">
                Comma, space, or newline separated
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || loading}
              >
                {loading ? <Loader size={12} className="spin" /> : <ScanLine size={12} />}
                Locate Items
              </button>
            </div>
          </div>
        )}

        {/* ─── FILE UPLOAD TAB ─── */}
        {activeTab === 'upload' && (
          <div className="ticket-upload-tab">
            <div
              className={`ticket-dropzone ${dragOver ? 'drag-over' : ''} ${fileName ? 'has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? (
                <div className="dropzone-loading">
                  <Loader size={28} className="spin" />
                  <span>Processing ticket...</span>
                  <span className="ticket-hint">Extracting item codes from {fileName}</span>
                </div>
              ) : fileName ? (
                <div className="dropzone-success">
                  <CheckCircle2 size={28} />
                  <span>{fileName}</span>
                  <span className="ticket-hint">Click to upload another file</span>
                </div>
              ) : (
                <div className="dropzone-empty">
                  <Upload size={28} />
                  <span>Drop ticket PDF or image here</span>
                  <span className="ticket-hint">or click to browse · PDF, PNG, JPG</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.bmp,.webp"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            {preview && (
              <div className="ticket-preview">
                <img src={preview} alt="Ticket preview" />
              </div>
            )}
          </div>
        )}

        {/* ─── CAMERA SCANNER TAB ─── */}
        {activeTab === 'camera' && (
          <div className="ticket-camera-tab">
            {!scanActive ? (
              <div className="camera-start">
                <Camera size={32} style={{ color: 'var(--accent)', opacity: 0.5 }} />
                <span>Open camera to scan barcodes</span>
                <button className="btn btn-primary btn-sm" onClick={startScanner}>
                  <Camera size={12} /> Start Scanner
                </button>
                <span className="ticket-hint">Requires camera access · HTTPS or localhost</span>
              </div>
            ) : (
              <div className="camera-active">
                <div className="camera-viewport">
                  <video ref={videoRef} className="camera-video" playsInline muted />
                  <div className="camera-overlay">
                    <div className="scan-frame" />
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={stopScanner}>
                  <X size={12} /> Stop Scanner
                </button>
              </div>
            )}

            {/* Scanned Codes List */}
            {scannedCodes.length > 0 && (
              <div className="scanned-codes">
                <div className="scanned-codes-header">
                  <span>{scannedCodes.length} code(s) scanned</span>
                  <button className="btn btn-primary btn-sm" onClick={submitScannedCodes} disabled={loading}>
                    {loading ? <Loader size={12} className="spin" /> : <ScanLine size={12} />}
                    Locate All
                  </button>
                </div>
                <div className="scanned-codes-list">
                  {scannedCodes.map((code, i) => (
                    <div key={i} className="scanned-code-item">
                      <span className="scanned-code-text">{code}</span>
                      <button className="scanned-code-remove" onClick={() => removeScannedCode(code)}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="ticket-error">
            <AlertCircle size={12} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
