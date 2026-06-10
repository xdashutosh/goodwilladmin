import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api, { apiError } from '../lib/api';
import ProductImages from '../components/ProductImages';
import { SkeletonForm } from '../components/Skeleton';

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const EMPTY = {
  category_id: '', name: '', slug: '', short_description: '', description: '',
  cover_style: '', available_sizes: '', is_featured: false, is_active: true,
  sort_order: 0, meta_title: '', meta_description: '', meta_keywords: '',
};

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    api.get('/categories/admin/all').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const loadProduct = async () => {
    try {
      const { data } = await api.get(`/products/admin/${id}`);
      setForm({
        ...EMPTY,
        ...data,
        available_sizes: Array.isArray(data.available_sizes) ? data.available_sizes.join(', ') : '',
      });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isNew) loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const onNameChange = (value) =>
    setForm((f) => ({ ...f, name: value, slug: slugTouched ? f.slug : slugify(value) }));

  const buildPayload = () => ({
    ...form,
    category_id: Number(form.category_id),
    sort_order: Number(form.sort_order) || 0,
    available_sizes: form.available_sizes
      ? form.available_sizes.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  });

  const saveProduct = async (e) => {
    e.preventDefault();
    if (!form.category_id) { setError('Please choose a category'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      if (isNew) {
        const { data } = await api.post('/products', buildPayload());
        navigate(`/products/${data.id}`, { replace: true });
      } else {
        await api.put(`/products/${id}`, buildPayload());
        setNotice('Product saved.');
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-head"><h1>Edit Product</h1></div>
        <SkeletonForm fields={7} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>
          <Link to="/products" className="icon-btn" style={{ verticalAlign: 'middle' }}><ArrowLeft size={20} /></Link>{' '}
          {isNew ? 'New Product' : 'Edit Product'}
        </h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <form id="product-form" onSubmit={saveProduct}>
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
              <label className="field-label">Category *</label>
              <select value={form.category_id} onChange={(e) => setField('category_id', e.target.value)} required>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.section_name ? `${c.section_name} › ${c.name}` : c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="field-label">Cover Style</label>
              <input type="text" value={form.cover_style || ''} onChange={(e) => setField('cover_style', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="field-label">Short Description</label>
            <input type="text" value={form.short_description || ''} onChange={(e) => setField('short_description', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="field-label">Description</label>
            <textarea rows={4} value={form.description || ''} onChange={(e) => setField('description', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="field-label">Available Sizes</label>
            <input type="text" value={form.available_sizes} onChange={(e) => setField('available_sizes', e.target.value)} placeholder="A4, A5, B5" />
            <div className="field-hint">Comma-separated list of sizes available for this design.</div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="field-label">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => setField('sort_order', e.target.value)} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
              <label className="checkbox-row">
                <input type="checkbox" checked={!!form.is_featured} onChange={(e) => setField('is_featured', e.target.checked)} />
                <span>Featured</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={!!form.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
                <span>Active</span>
              </label>
            </div>
          </div>

          <details style={{ marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '0.75rem' }}>SEO settings</summary>
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
              <input type="text" value={form.meta_keywords || ''} onChange={(e) => setField('meta_keywords', e.target.value)} />
            </div>
          </details>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Images — only after the product exists */}
      <div className="card card-pad">
        <h3 style={{ marginBottom: '0.25rem' }}>Product Images &amp; Colour Variants</h3>
        <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
          Images are optimised (JPEG + WebP + thumbnail) and stored on S3 automatically.
        </p>

        {isNew ? (
          <p className="muted">Save the product first, then you can upload images and colour variants.</p>
        ) : (
          <ProductImages productId={id} />
        )}
      </div>
    </div>
  );
}
