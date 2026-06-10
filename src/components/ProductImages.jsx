import { useEffect, useState, useRef, useCallback } from 'react';
import { UploadCloud, Trash2, Star, Save, ArrowUp, ArrowDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { SkeletonImageGrid } from './Skeleton';

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB
const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.tif,.tiff,.bmp,.avif,image/*';

const isImage = (file) =>
  (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|tiff?|bmp|avif)$/i.test(file.name);

export default function ProductImages({ productId }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploads, setUploads] = useState([]); // {uid, name, progress, status, error}
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const uidRef = useRef(0);
  const inputRef = useRef(null);

  const fetchImages = useCallback(async () => {
    try {
      const { data } = await api.get(`/products/admin/${productId}`);
      const imgs = (data.images || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setImages(imgs);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList);
    const accepted = [];
    const rejected = [];
    for (const f of files) {
      if (!isImage(f)) rejected.push(`${f.name}: not an image`);
      else if (f.size > MAX_BYTES) rejected.push(`${f.name}: exceeds 30 MB`);
      else accepted.push(f);
    }
    setError(rejected.join(' · '));
    if (accepted.length === 0) return;

    for (const file of accepted) {
      const uid = ++uidRef.current;
      setUploads((u) => [...u, { uid, name: file.name, progress: 0, status: 'uploading' }]);
      try {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('product_id', productId);
        await api.post('/images/upload', fd, {
          onUploadProgress: (e) => {
            const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            setUploads((u) => u.map((x) => (x.uid === uid ? { ...x, progress: pct } : x)));
          },
        });
        setUploads((u) => u.map((x) => (x.uid === uid ? { ...x, status: 'done', progress: 100 } : x)));
      } catch (err) {
        setUploads((u) => u.map((x) => (x.uid === uid ? { ...x, status: 'error', error: apiError(err, 'Upload failed') } : x)));
      }
    }
    await fetchImages();
    // Clear the successful rows shortly after, keep failed ones visible
    setTimeout(() => setUploads((u) => u.filter((x) => x.status === 'error')), 1500);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const patchLocal = (id, patch) => setImages((imgs) => imgs.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const setPrimary = async (img) => {
    if (img.is_primary) return;
    setBusyId(img.id);
    try {
      await api.put(`/images/${img.id}`, { is_primary: true });
      await fetchImages();
    } catch (err) { setError(apiError(err)); } finally { setBusyId(null); }
  };

  const saveMeta = async (img) => {
    setBusyId(img.id);
    try {
      await api.put(`/images/${img.id}`, {
        alt_text: img.alt_text || '',
        color: img.color || null,
        color_hex: img.color_hex || null,
      });
      setError('');
    } catch (err) { setError(apiError(err)); } finally { setBusyId(null); }
  };

  const remove = async (img) => {
    if (!window.confirm('Delete this image from storage? This cannot be undone.')) return;
    setBusyId(img.id);
    try {
      await api.delete(`/images/${img.id}`);
      setImages((imgs) => imgs.filter((i) => i.id !== img.id));
    } catch (err) { setError(apiError(err)); } finally { setBusyId(null); }
  };

  const move = async (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[index], next[j]] = [next[j], next[index]];
    setImages(next); // optimistic
    try {
      await Promise.all(next.map((img, i) => (img.sort_order === i ? null : api.put(`/images/${img.id}`, { sort_order: i }))).filter(Boolean));
      await fetchImages();
    } catch (err) { setError(apiError(err)); await fetchImages(); }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Dropzone */}
      <div
        className={`dropzone ${dragOver ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <UploadCloud size={28} />
        <div className="dz-title">Drag &amp; drop images here, or click to browse</div>
        <div className="dz-sub">JPG, PNG, WebP, GIF or TIFF · up to 30 MB each · multiple files supported</div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <div className="upload-list">
          {uploads.map((u) => (
            <div key={u.uid} className="upload-item">
              <span className="upload-status">
                {u.status === 'uploading' && <Loader2 size={15} className="spin" />}
                {u.status === 'done' && <CheckCircle2 size={15} color="var(--success)" />}
                {u.status === 'error' && <AlertCircle size={15} color="var(--danger)" />}
              </span>
              <span className="upload-name" title={u.name}>{u.name}</span>
              <div className="progress"><i style={{ width: `${u.progress}%`, background: u.status === 'error' ? 'var(--danger)' : 'var(--gold)' }} /></div>
              <span className="upload-pct">{u.status === 'error' ? (u.error || 'Failed') : `${u.progress}%`}</span>
            </div>
          ))}
        </div>
      )}

      {/* Image grid */}
      {loading ? (
        <SkeletonImageGrid count={6} />
      ) : images.length === 0 ? (
        <p className="muted" style={{ marginTop: '1rem' }}>No images yet. Upload some above.</p>
      ) : (
        <div className="image-grid" style={{ marginTop: '1.25rem' }}>
          {images.map((img, idx) => (
            <div key={img.id} className={`image-tile ${img.is_primary ? 'is-primary' : ''}`}>
              <div className="image-tile-preview">
                <img src={img.thumbnail_url || img.image_url} alt={img.alt_text || ''} />
                {img.is_primary && <span className="primary-flag"><Star size={11} fill="currentColor" /> Primary</span>}
              </div>
              <div className="image-tile-body">
                <div className="image-tile-actions">
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button type="button" className="btn btn-sm btn-icon" title="Move up" disabled={idx === 0} onClick={() => move(idx, -1)}><ArrowUp size={14} /></button>
                    <button type="button" className="btn btn-sm btn-icon" title="Move down" disabled={idx === images.length - 1} onClick={() => move(idx, 1)}><ArrowDown size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button type="button" className={`btn btn-sm btn-icon ${img.is_primary ? 'btn-primary' : ''}`} title={img.is_primary ? 'Primary image' : 'Set as primary'} disabled={busyId === img.id} onClick={() => setPrimary(img)}>
                      <Star size={14} fill={img.is_primary ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" className="btn btn-sm btn-icon btn-danger" title="Delete" disabled={busyId === img.id} onClick={() => remove(img)}><Trash2 size={14} /></button>
                  </div>
                </div>

                <input type="text" placeholder="Alt text" value={img.alt_text || ''} onChange={(e) => patchLocal(img.id, { alt_text: e.target.value })} style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }} />
                <input type="text" placeholder="Colour name" value={img.color || ''} onChange={(e) => patchLocal(img.id, { color: e.target.value })} style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }} />
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <input type="text" placeholder="#hex" value={img.color_hex || ''} onChange={(e) => patchLocal(img.id, { color_hex: e.target.value })} style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }} />
                  {img.color_hex && <span className="swatch-dot" style={{ background: img.color_hex }} />}
                </div>
                <button type="button" className="btn btn-sm" disabled={busyId === img.id} onClick={() => saveMeta(img)}>
                  <Save size={13} /> Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
