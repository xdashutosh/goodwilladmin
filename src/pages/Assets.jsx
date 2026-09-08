import { useEffect, useState, useRef, useCallback } from 'react';
import {
  UploadCloud, Trash2, Save, ArrowUp, ArrowDown, Plus, Loader2, RefreshCw, ImageIcon, Film,
} from 'lucide-react';
import api, { apiError } from '../lib/api';
import { SkeletonForm } from '../components/Skeleton';

const IMG_ACCEPT = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.avif';
const VID_ACCEPT = 'video/*,.mp4,.webm,.mov,.m4v';

// Fixed (keyed) slots — always shown, even before a file is uploaded.
const KEYED = {
  section_headers: {
    label: 'Section Header Banners',
    hint: 'Wide banner shown full-width at the top of each section page.',
    accept: IMG_ACCEPT,
    slots: [
      { slot: 'diaries', label: 'Diaries' },
      { slot: 'notebooks', label: 'Notebooks' },
      { slot: 'organizers', label: 'Organizers' },
      { slot: 'corporate-gifts', label: 'Corporate Gifts' },
    ],
  },
  collection_cards: {
    label: 'Collection Card Artwork',
    hint: 'Square-ish artwork on the home “Our Collections” cards.',
    accept: IMG_ACCEPT,
    slots: [
      { slot: 'diaries', label: 'Diaries' },
      { slot: 'notebooks', label: 'Notebooks' },
      { slot: 'organizers', label: 'Organizers' },
      { slot: 'corporate-gifts', label: 'Corporate Gifts' },
      { slot: 'default', label: 'Default / fallback' },
      { slot: 'travel-kit', label: 'Travel Kit' },
    ],
  },
  backgrounds: {
    label: 'Backgrounds & Posters',
    hint: 'Full-bleed background images and the home 2027 poster.',
    accept: IMG_ACCEPT,
    slots: [
      { slot: 'poster_2027', label: '2027 Collection poster (home)' },
      { slot: 'cta_bg', label: 'Home closing-CTA background' },
      { slot: 'contact_bg', label: 'Contact page background' },
    ],
  },
  brand: {
    label: 'Brand Logos',
    hint: 'Header / login logo and footer logo. Use a transparent PNG.',
    accept: IMG_ACCEPT,
    slots: [
      { slot: 'logo_primary', label: 'Primary logo (header & login)' },
      { slot: 'logo_footer', label: 'Footer logo' },
    ],
  },
};

// List (add / remove / reorder) collections.
const LISTS = {
  hero_banners: {
    label: 'Hero Banners',
    hint: 'The rotating banner carousel at the very top of the home page. Wide landscape images (~1600×710) work best.',
    accept: IMG_ACCEPT,
    kind: 'image',
    fields: [
      { key: 'title', label: 'Title / alt text' },
      { key: 'link', label: 'Link (optional)', placeholder: '/products' },
    ],
  },
  showcase_videos: {
    label: 'Showcase Videos',
    hint: 'The auto-playing video reel on the home page. Upload MP4 clips; a poster image shows before each clip loads.',
    accept: VID_ACCEPT,
    kind: 'video',
    hasPoster: true,
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'subtitle', label: 'Tagline' },
      { key: 'link', label: 'Link', placeholder: '/diaries' },
    ],
  },
  gifting: {
    label: 'Home Gifting Range',
    hint: 'The corporate-gifting cards below the 2027 poster. The first item is the large hero piece; the rest are the supporting cards. Each can have a hover image.',
    accept: IMG_ACCEPT,
    kind: 'image',
    hasHover: true,
    fields: [
      { key: 'title', label: 'Name' },
      { key: 'subtitle', label: 'Description' },
      { key: 'link', label: 'Link', placeholder: '/product/...' },
    ],
  },
};

// ---------------------------------------------------------------------------

function Preview({ asset, accept }) {
  const isVideo = asset?.kind === 'video';
  const src = isVideo ? asset.thumbnail_url || asset.url : asset?.thumbnail_url || asset?.url;
  return (
    <div className="asset-preview">
      {!asset || !asset.url ? (
        <span className="muted" style={{ fontSize: '0.75rem' }}>
          {accept === VID_ACCEPT ? <Film size={18} /> : <ImageIcon size={18} />} No file
        </span>
      ) : isVideo ? (
        <video src={asset.url} poster={asset.thumbnail_url || undefined} muted loop playsInline
          onMouseOver={(e) => e.currentTarget.play()} onMouseOut={(e) => e.currentTarget.pause()} />
      ) : (
        <img src={src} alt="" />
      )}
    </div>
  );
}

function UploadButton({ label = 'Upload', busy, accept, onPick, variant }) {
  const ref = useRef(null);
  return (
    <>
      <button type="button" className="btn btn-sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 size={14} className="spin" /> : <UploadCloud size={14} />} {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onPick(f, variant);
        }}
      />
    </>
  );
}

// ---- Keyed singleton slot -------------------------------------------------
function SlotCard({ collection, def, asset, accept, onUpload, onPatch }) {
  const [busy, setBusy] = useState(false);
  const [alt, setAlt] = useState(asset?.alt_text || '');
  useEffect(() => setAlt(asset?.alt_text || ''), [asset?.alt_text]);

  const upload = async (file) => {
    setBusy(true);
    try { await onUpload({ collection, slot: def.slot, file }); }
    finally { setBusy(false); }
  };

  return (
    <div className="asset-tile">
      <Preview asset={asset} accept={accept} />
      <div className="asset-tile-body">
        <strong style={{ fontSize: '0.9rem' }}>{def.label}</strong>
        <input
          type="text"
          placeholder="Alt text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => asset && alt !== (asset.alt_text || '') && onPatch(asset.id, { alt_text: alt })}
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <UploadButton label={asset?.url ? 'Replace' : 'Upload'} busy={busy} accept={accept} onPick={upload} />
        </div>
      </div>
    </div>
  );
}

// ---- List collection ----------------------------------------------------
function ListSection({ collection, def, rows, onUpload, onPatch, onDelete, onReorder }) {
  const [busyId, setBusyId] = useState(null);
  const [addBusy, setAddBusy] = useState(false);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    const d = {};
    for (const r of rows) d[r.id] = { title: r.title || '', subtitle: r.subtitle || '', link: r.link || '' };
    setDraft(d);
  }, [rows]);

  const add = async (file) => {
    setAddBusy(true);
    try { await onUpload({ collection, file }); }
    finally { setAddBusy(false); }
  };

  const replace = async (row, file, variant) => {
    setBusyId(row.id);
    try { await onUpload({ collection, id: row.id, file, variant }); }
    finally { setBusyId(null); }
  };

  const saveMeta = (row) => {
    const d = draft[row.id] || {};
    const patch = {};
    for (const f of def.fields) if ((d[f.key] || '') !== (row[f.key] || '')) patch[f.key] = d[f.key] || '';
    if (Object.keys(patch).length) onPatch(row.id, patch);
  };

  return (
    <div className="card card-pad asset-group">
      <div className="asset-group-head">
        <div>
          <h3>{def.label}</h3>
          <p className="field-hint">{def.hint}</p>
        </div>
        <UploadButton label={addBusy ? 'Uploading…' : `Add ${def.kind === 'video' ? 'video' : 'image'}`} busy={addBusy} accept={def.accept} onPick={add} />
      </div>

      {rows.length === 0 ? (
        <p className="muted">Nothing yet — use “Add”.</p>
      ) : (
        <div className="asset-list">
          {rows.map((row, idx) => (
            <div key={row.id} className="asset-row">
              <Preview asset={row} accept={def.accept} />
              <div className="asset-row-body">
                {def.fields.map((f) => (
                  <div key={f.key} className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label className="field-label">{f.label}</label>
                    {f.key === 'subtitle' ? (
                      <textarea
                        rows={2}
                        value={draft[row.id]?.[f.key] ?? ''}
                        placeholder={f.placeholder}
                        onChange={(e) => setDraft((d) => ({ ...d, [row.id]: { ...d[row.id], [f.key]: e.target.value } }))}
                        onBlur={() => saveMeta(row)}
                      />
                    ) : (
                      <input
                        type="text"
                        value={draft[row.id]?.[f.key] ?? ''}
                        placeholder={f.placeholder}
                        onChange={(e) => setDraft((d) => ({ ...d, [row.id]: { ...d[row.id], [f.key]: e.target.value } }))}
                        onBlur={() => saveMeta(row)}
                      />
                    )}
                  </div>
                ))}
                <div className="asset-row-actions">
                  <button className="btn btn-sm btn-icon" title="Move up" disabled={idx === 0} onClick={() => onReorder(collection, idx, -1)}><ArrowUp size={14} /></button>
                  <button className="btn btn-sm btn-icon" title="Move down" disabled={idx === rows.length - 1} onClick={() => onReorder(collection, idx, 1)}><ArrowDown size={14} /></button>
                  <UploadButton label={busyId === row.id ? '…' : 'Replace media'} busy={busyId === row.id} accept={def.accept} onPick={(f) => replace(row, f, 'main')} />
                  {def.hasHover && (
                    <UploadButton label="Hover image" busy={busyId === row.id} accept={IMG_ACCEPT} onPick={(f) => replace(row, f, 'hover')} />
                  )}
                  {def.hasPoster && (
                    <UploadButton label="Poster image" busy={busyId === row.id} accept={IMG_ACCEPT} onPick={(f) => replace(row, f, 'poster')} />
                  )}
                  <label className="checkbox-row" style={{ fontSize: '0.8rem' }}>
                    <input type="checkbox" checked={row.is_active} onChange={(e) => onPatch(row.id, { is_active: e.target.checked })} /> Active
                  </label>
                  <button className="btn btn-sm btn-icon btn-danger" title="Delete" onClick={() => onDelete(row)}><Trash2 size={14} /></button>
                </div>
                {def.hasHover && row.hover_url && (
                  <div className="muted" style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>Hover image set ✓</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function Assets() {
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/assets/admin/all');
      setGroups(data || {});
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => { setNotice(msg); setError(''); setTimeout(() => setNotice(''), 2500); };

  const doUpload = async ({ collection, slot, id, file, variant }) => {
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('collection', collection);
    if (slot) fd.append('slot', slot);
    if (id) fd.append('id', id);
    if (variant) fd.append('variant', variant);
    try {
      await api.post('/assets/upload', fd);
      await load();
      flash('Saved.');
    } catch (err) {
      setError(apiError(err, 'Upload failed'));
    }
  };

  const doPatch = async (id, fields) => {
    // optimistic
    setGroups((g) => {
      const next = { ...g };
      for (const k of Object.keys(next)) next[k] = next[k].map((r) => (r.id === id ? { ...r, ...fields } : r));
      return next;
    });
    try {
      await api.put(`/assets/${id}`, fields);
    } catch (err) {
      setError(apiError(err));
      load();
    }
  };

  const doDelete = async (row) => {
    if (!window.confirm(`Delete this asset${row.title ? ` (“${row.title}”)` : ''}? The file is removed from storage.`)) return;
    try {
      await api.delete(`/assets/${row.id}`);
      await load();
      flash('Deleted.');
    } catch (err) {
      setError(apiError(err));
    }
  };

  const doReorder = async (collection, index, dir) => {
    const list = (groups[collection] || []).slice();
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    setGroups((g) => ({ ...g, [collection]: list })); // optimistic
    try {
      await api.post('/assets/reorder', { collection, ids: list.map((r) => r.id) });
    } catch (err) {
      setError(apiError(err));
      load();
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-head"><h1>Assets</h1></div>
        <SkeletonForm fields={6} />
      </div>
    );
  }

  const bySlot = (collection) => {
    const map = {};
    for (const r of groups[collection] || []) map[r.slot] = r;
    return map;
  };

  return (
    <div>
      <div className="page-head">
        <h1>Assets</h1>
        <button className="btn btn-sm" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>
      <p className="muted" style={{ marginTop: '-0.5rem', marginBottom: '1.25rem', maxWidth: 720 }}>
        Every banner, showcase video and showcase image on the public website. Files are optimised
        (JPEG/PNG + WebP + thumbnail) and stored on S3; changes appear on the live site within a minute.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {/* List collections */}
      {Object.entries(LISTS).map(([collection, def]) => (
        <ListSection
          key={collection}
          collection={collection}
          def={def}
          rows={groups[collection] || []}
          onUpload={doUpload}
          onPatch={doPatch}
          onDelete={doDelete}
          onReorder={doReorder}
        />
      ))}

      {/* Keyed collections */}
      {Object.entries(KEYED).map(([collection, def]) => {
        const map = bySlot(collection);
        return (
          <div key={collection} className="card card-pad asset-group">
            <div className="asset-group-head">
              <div>
                <h3>{def.label}</h3>
                <p className="field-hint">{def.hint}</p>
              </div>
            </div>
            <div className="asset-grid">
              {def.slots.map((s) => (
                <SlotCard
                  key={s.slot}
                  collection={collection}
                  def={s}
                  asset={map[s.slot] || null}
                  accept={def.accept}
                  onUpload={doUpload}
                  onPatch={doPatch}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
