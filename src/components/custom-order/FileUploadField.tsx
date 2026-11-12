'use client';

import { useRef, useState, type DragEvent } from 'react';
import { Camera, Check, File, RefreshCw, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { customOrderConfig, formatFileSize } from '@/config/customOrder';
import type { CustomOrderFile } from '@/types/customOrder';

type Props = {
  items: CustomOrderFile[];
  backendConfigured: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
  onReplace: (localId: string, file: File) => void;
  acceptedExtensions?: readonly string[];
  rulesText?: string;
};

export function FileUploadField({ items, backendConfigured, onAdd, onRemove, onRetry, onReplace, acceptedExtensions, rulesText }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function receive(files: FileList | null) {
    if (!files?.length) return;
    onAdd(Array.from(files));
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    receive(event.dataTransfer.files);
  }

  function replace(localId: string) {
    replaceId.current = localId;
    replaceRef.current?.click();
  }

  function receiveReplacement(files: FileList | null) {
    if (!files?.[0] || !replaceId.current) return;
    onReplace(replaceId.current, files[0]);
    replaceId.current = null;
  }

  const accept = (acceptedExtensions || customOrderConfig.acceptedExtensions).join(',');

  return (
    <div className="co-upload-area">
      <input ref={inputRef} className="visually-hidden" type="file" multiple accept={accept} onChange={(event) => { receive(event.target.files); event.target.value = ''; }} />
      <input ref={cameraRef} className="visually-hidden" type="file" accept="image/jpeg,image/png" capture="environment" onChange={(event) => { receive(event.target.files); event.target.value = ''; }} />
      <input ref={replaceRef} className="visually-hidden" type="file" accept={accept} onChange={(event) => { receiveReplacement(event.target.files); event.target.value = ''; }} />

      <div
        className={`co-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        <UploadCloud size={34} strokeWidth={1.5} />
        <div><strong>Drop files here</strong><span>or choose them from your device</span></div>
        <div className="co-upload-actions">
          <button type="button" className="button button-primary" onClick={() => inputRef.current?.click()}>Choose files</button>
          <button type="button" className="button button-secondary" onClick={() => cameraRef.current?.click()}><Camera size={16} /> Take a photo</button>
        </div>
      </div>

      <p className="co-file-rules">{rulesText || 'STL, 3MF, OBJ, STEP/STP, GLB/glTF, PDF, JPG or PNG · up to 50 MB each · 5 files · 150 MB total. ZIP files are not accepted.'}</p>
      {!backendConfigured && <div className="co-backend-notice"><strong>Secure upload is temporarily unavailable.</strong><span>You can continue reviewing the form, but selected files remain on this device and are not submitted.</span></div>}

      {items.length > 0 && <div className="co-file-list" aria-live="polite">
        {items.map((item) => (
          <article key={item.localId} className={`co-file-row is-${item.state}`}>
            <File size={21} />
            <div className="co-file-copy">
              <strong>{item.file.name}</strong>
              <span>{formatFileSize(item.file.size)} · {item.file.type || 'File type inferred from extension'}</span>
              {item.state === 'uploading' && <div className="co-progress"><span style={{ width: `${item.progress}%` }} /><em>{item.progress}%</em></div>}
              {item.state === 'preparing' && <small>Preparing private upload…</small>}
              {item.state === 'selected' && <small>{backendConfigured ? 'Waiting for secure upload' : 'Selected on this device only'}</small>}
              {item.state === 'ready' && <small className="co-upload-ready"><Check size={13} /> Secure upload ready</small>}
              {item.state === 'error' && <small className="co-upload-error"><XCircle size={13} /> {item.error}</small>}
            </div>
            <div className="co-file-controls">
              {item.state === 'error' && backendConfigured && <button type="button" onClick={() => onRetry(item.localId)}><RefreshCw size={15} /> Retry</button>}
              <button type="button" onClick={() => replace(item.localId)} disabled={item.state === 'uploading' || item.state === 'preparing'}>Replace</button>
              <button type="button" onClick={() => onRemove(item.localId)} disabled={item.state === 'uploading' || item.state === 'preparing'} aria-label={`Remove ${item.file.name}`}><Trash2 size={15} /> Remove</button>
            </div>
          </article>
        ))}
      </div>}
    </div>
  );
}
