import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api, { apiError } from '../lib/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const emptyContent = () => ({ intro: '', highlights: [], specifications: [], useCases: [], faqs: [] });

// Coerce whatever is stored (possibly null / partial) into the full editable shape.
const normalizeContent = (c) => ({
  intro: c?.intro || '',
  highlights: Array.isArray(c?.highlights) ? [...c.highlights] : [],
  specifications: Array.isArray(c?.specifications)
    ? c.specifications.map((s) => ({ label: s?.label || '', value: s?.value || '' }))
    : [],
  useCases: Array.isArray(c?.useCases) ? [...c.useCases] : [],
  faqs: Array.isArray(c?.faqs) ? c.faqs.map((f) => ({ q: f?.q || '', a: f?.a || '' })) : [],
});

const EMPTY = {
  section_id: '', name: '', slug: '', description: '',
  size_label: '', type_label: '', image_url: '',
  meta_title: '', meta_description: '', meta_keywords: '',
  sort_order: 0, is_active: true,
  content: emptyContent(),
};

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => ({ ...EMPTY, content: emptyContent() }));
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cats, secs] = await Promise.all([
        api.get('/categories/admin/all'),
        api.get('/sections/admin/all'),
      ]);
      setRows(cats.data);
      setSections(secs.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, content: emptyContent(), section_id: sections[0]?.id || '' });
    setSlugTouched(false); setError(''); setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...EMPTY, ...row, section_id: row.section_id, content: normalizeContent(row.content) });
    setSlugTouched(true); setError(''); setModalOpen(true);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const onNameChange = (value) =>
    setForm((f) => ({ ...f, name: value, slug: slugTouched ? f.slug : slugify(value) }));

  // ----- content (JSONB) editing helpers -----
  const setContentField = (key, value) =>
    setForm((f) => ({ ...f, content: { ...f.content, [key]: value } }));
  const addItem = (key, empty) =>
    setForm((f) => ({ ...f, content: { ...f.content, [key]: [...f.content[key], empty] } }));
  const removeItem = (key, i) =>
    setForm((f) => ({ ...f, content: { ...f.content, [key]: f.content[key].filter((_, idx) => idx !== i) } }));
  const updateStr = (key, i, val) =>
    setForm((f) => ({ ...f, content: { ...f.content, [key]: f.content[key].map((x, idx) => (idx === i ? val : x)) } }));
  const updatePair = (key, i, field, val) =>
    setForm((f) => ({ ...f, content: { ...f.content, [key]: f.content[key].map((x, idx) => (idx === i ? { ...x, [field]: val } : x)) } }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.section_id) { setError('Please choose a section'); return; }
    setSaving(true); setError('');
    try {
      const c = form.content;
      const cleanContent = {
        intro: (c.intro || '').trim(),
        highlights: c.highlights.map((s) => s.trim()).filter(Boolean),
        specifications: c.specifications
          .map((s) => ({ label: (s.label || '').trim(), value: (s.value || '').trim() }))
          .filter((s) => s.label || s.value),
        useCases: c.useCases.map((s) => s.trim()).filter(Boolean),
        faqs: c.faqs
          .map((f) => ({ q: (f.q || '').trim(), a: (f.a || '').trim() }))
          .filter((f) => f.q || f.a),
      };
      const payload = {
        ...form,
        section_id: Number(form.section_id),
        sort_order: Number(form.sort_order) || 0,
        size_label: form.size_label || null,
        type_label: form.type_label || null,
        content: cleanContent,
      };
      if (editing) await api.put(`/categories/${editing.id}`, payload);
      else await api.post('/categories', payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete category "${row.name}"? Products in it will also be removed.`)) return;
    try {
      await api.delete(`/categories/${row.id}`);
      await load();
    } catch (err) {
      alert(apiError(err));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Categories</h1>
        <button className="btn btn-primary" onClick={openCreate} disabled={sections.length === 0}>
          <Plus size={16} /> New Category
        </button>
      </div>

      {sections.length === 0 && !loading && (
        <div className="alert alert-error">Create a section first before adding categories.</div>
      )}
      {error && !modalOpen && <div className="alert alert-error">{error}</div>}

      <div className="card table-wrap">
        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <div className="empty-state">No categories yet.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Section</th>
                <th>Size</th>
                <th>Type</th>
                <th>Content</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const c = row.content || {};
                const blocks = (c.intro ? 1 : 0) + (c.highlights?.length ? 1 : 0) + (c.specifications?.length ? 1 : 0) + (c.useCases?.length ? 1 : 0) + (c.faqs?.length ? 1 : 0);
                return (
                  <tr key={row.id}>
                    <td><strong>{row.name}</strong><div className="muted" style={{ fontSize: '0.78rem' }}>{row.slug}</div></td>
                    <td>{row.section_name}</td>
                    <td>{row.size_label || '—'}</td>
                    <td>{row.type_label || '—'}</td>
                    <td>
                      {blocks > 0
                        ? <span className="badge badge-blue">{blocks} block{blocks > 1 ? 's' : ''}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td><span className={`badge ${row.is_active ? 'badge-green' : 'badge-gray'}`}>{row.is_active ? 'Active' : 'Hidden'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-icon" onClick={() => openEdit(row)} title="Edit"><Pencil size={15} /></button>
                        <button className="btn btn-sm btn-icon btn-danger" onClick={() => remove(row)} title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Edit Category' : 'New Category'}
          wide
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" form="cat-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          {error && <div className="alert alert-error">{error}</div>}
          <form id="cat-form" onSubmit={save}>
            <div className="form-group">
              <label className="field-label">Section *</label>
              <select value={form.section_id} onChange={(e) => setField('section_id', e.target.value)} required>
                <option value="">Select section…</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Name *</label>
                <input type="text" required value={form.name} onChange={(e) => onNameChange(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="field-label">Slug *</label>
                <input type="text" required value={form.slug} onChange={(e) => { setSlugTouched(true); setField('slug', e.target.value); }} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Size Label</label>
                <input type="text" value={form.size_label || ''} onChange={(e) => setField('size_label', e.target.value)} placeholder="e.g. A5" />
              </div>
              <div className="form-group">
                <label className="field-label">Type Label</label>
                <input type="text" value={form.type_label || ''} onChange={(e) => setField('type_label', e.target.value)} placeholder="e.g. Daily" />
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">Description</label>
              <textarea value={form.description || ''} onChange={(e) => setField('description', e.target.value)} placeholder="Short summary shown in the category hero and on section-page cards." />
            </div>

            {/* ---- SEO ---- */}
            <div className="form-section-head">SEO</div>
            <div className="form-group">
              <label className="field-label">Meta Title</label>
              <input type="text" value={form.meta_title || ''} onChange={(e) => setField('meta_title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="field-label">Meta Description</label>
              <textarea value={form.meta_description || ''} onChange={(e) => setField('meta_description', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="field-label">Meta Keywords</label>
              <input type="text" value={form.meta_keywords || ''} onChange={(e) => setField('meta_keywords', e.target.value)} placeholder="comma, separated, keywords" />
            </div>

            {/* ---- Website content breakdown ---- */}
            <div className="form-section-head">Website Content Breakdown</div>
            <p className="field-hint" style={{ marginTop: '-0.35rem', marginBottom: '1rem' }}>
              These render in the rich “About” section on the category page (highlights, specs table and FAQs).
            </p>

            <div className="form-group">
              <label className="field-label">Intro</label>
              <textarea
                value={form.content.intro}
                onChange={(e) => setContentField('intro', e.target.value)}
                placeholder="One or two short paragraphs. Separate paragraphs with a blank line."
                style={{ minHeight: 110 }}
              />
            </div>

            {/* Highlights */}
            <div className="form-group">
              <label className="field-label">Key Highlights</label>
              {form.content.highlights.map((h, i) => (
                <div key={i} className="list-row">
                  <input type="text" value={h} onChange={(e) => updateStr('highlights', i, e.target.value)} placeholder={`Highlight ${i + 1}`} />
                  <button type="button" className="btn btn-sm btn-icon btn-danger" onClick={() => removeItem('highlights', i)} title="Remove"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" onClick={() => addItem('highlights', '')}><Plus size={14} /> Add highlight</button>
            </div>

            {/* Specifications */}
            <div className="form-group">
              <label className="field-label">Specifications</label>
              {form.content.specifications.map((s, i) => (
                <div key={i} className="list-row">
                  <input type="text" value={s.label} onChange={(e) => updatePair('specifications', i, 'label', e.target.value)} placeholder="Label (e.g. Dimensions)" style={{ flex: '0 0 38%' }} />
                  <input type="text" value={s.value} onChange={(e) => updatePair('specifications', i, 'value', e.target.value)} placeholder="Value (e.g. 148 × 210 mm)" />
                  <button type="button" className="btn btn-sm btn-icon btn-danger" onClick={() => removeItem('specifications', i)} title="Remove"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" onClick={() => addItem('specifications', { label: '', value: '' })}><Plus size={14} /> Add specification</button>
            </div>

            {/* Use cases */}
            <div className="form-group">
              <label className="field-label">Ideal For (use cases)</label>
              {form.content.useCases.map((u, i) => (
                <div key={i} className="list-row">
                  <input type="text" value={u} onChange={(e) => updateStr('useCases', i, e.target.value)} placeholder={`Use case ${i + 1}`} />
                  <button type="button" className="btn btn-sm btn-icon btn-danger" onClick={() => removeItem('useCases', i)} title="Remove"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" onClick={() => addItem('useCases', '')}><Plus size={14} /> Add use case</button>
            </div>

            {/* FAQs */}
            <div className="form-group">
              <label className="field-label">FAQs</label>
              {form.content.faqs.map((f, i) => (
                <div key={i} className="faq-row">
                  <div className="list-row">
                    <input type="text" value={f.q} onChange={(e) => updatePair('faqs', i, 'q', e.target.value)} placeholder={`Question ${i + 1}`} />
                    <button type="button" className="btn btn-sm btn-icon btn-danger" onClick={() => removeItem('faqs', i)} title="Remove"><Trash2 size={14} /></button>
                  </div>
                  <textarea value={f.a} onChange={(e) => updatePair('faqs', i, 'a', e.target.value)} placeholder="Answer" style={{ minHeight: 70, marginTop: '0.4rem' }} />
                </div>
              ))}
              <button type="button" className="btn btn-sm" onClick={() => addItem('faqs', { q: '', a: '' })}><Plus size={14} /> Add FAQ</button>
            </div>

            {/* ---- Settings ---- */}
            <div className="form-section-head">Settings</div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={(e) => setField('sort_order', e.target.value)} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label className="checkbox-row">
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
                  <span>Active (visible on website)</span>
                </label>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
