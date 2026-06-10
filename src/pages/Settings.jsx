import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, UploadCloud } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { SkeletonForm } from '../components/Skeleton';

const TEXT_FIELDS = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'brand_name', label: 'Brand Name' },
  { key: 'contact_email', label: 'Contact Email' },
  { key: 'contact_phone', label: 'Contact Phone' },
  { key: 'whatsapp_number', label: 'WhatsApp Number (digits, with country code)', hint: 'e.g. 919810000000' },
];

const TEXTAREA_FIELDS = [
  { key: 'contact_address', label: 'Contact Address' },
  { key: 'hero_title', label: 'Home Hero Title' },
  { key: 'hero_subtitle', label: 'Home Hero Subtitle' },
  { key: 'about_intro', label: 'About Page Intro' },
];

const SOCIAL_FIELDS = [
  { key: 'facebook_url', label: 'Facebook URL', hint: 'https://facebook.com/yourpage' },
  { key: 'instagram_url', label: 'Instagram URL', hint: 'https://instagram.com/yourhandle' },
  { key: 'twitter_url', label: 'X (Twitter) URL', hint: 'https://x.com/yourhandle' },
  { key: 'linkedin_url', label: 'LinkedIn URL', hint: 'https://linkedin.com/company/yourcompany' },
];

export default function Settings() {
  const [form, setForm] = useState({});
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings');
        const { banners: b, ...rest } = data;
        setForm(rest);
        setBanners(Array.isArray(b) ? b : []);
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const [bannerUploading, setBannerUploading] = useState(null); // index currently uploading

  const addBanner = () => setBanners((b) => [...b, { image_url: '', title: '', link: '' }]);
  const setBanner = (i, key, value) => setBanners((b) => b.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));

  const uploadBannerImage = async (i, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file'); return; }
    setError('');
    setBannerUploading(i);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('folder', 'banners');
      const { data } = await api.post('/images/upload-asset', fd);
      setBanners((b) => b.map((row, idx) => (idx === i ? { ...row, image_url: data.image_url } : row)));
    } catch (err) {
      setError(apiError(err, 'Banner upload failed'));
    } finally {
      setBannerUploading(null);
    }
  };

  const removeBanner = async (i) => {
    const target = banners[i];
    setBanners((b) => b.filter((_, idx) => idx !== i));
    // Best-effort: remove the image from S3 so it doesn't linger
    if (target?.image_url) {
      try {
        await api.delete('/images/asset', { params: { url: target.image_url } });
      } catch {
        /* non-blocking */
      }
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      await api.put('/settings', {
        ...form,
        banners: banners.filter((b) => b.image_url),
      });
      setNotice('Settings saved.');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-head"><h1>Settings</h1></div>
        <SkeletonForm fields={5} />
        <SkeletonForm fields={4} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <form onSubmit={save}>
        <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Company & Contact</h3>
          <div className="form-row">
            {TEXT_FIELDS.map((f) => (
              <div className="form-group" key={f.key}>
                <label className="field-label">{f.label}</label>
                <input type="text" value={form[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} />
                {f.hint && <div className="field-hint">{f.hint}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Social Links</h3>
          <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
            Add your profile URLs. The icons show in the header bar and footer; leave a field blank and that icon stays inactive.
          </p>
          <div className="form-row">
            {SOCIAL_FIELDS.map((f) => (
              <div className="form-group" key={f.key}>
                <label className="field-label">{f.label}</label>
                <input
                  type="url"
                  value={form[f.key] || ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.hint}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Website Content</h3>
          {TEXTAREA_FIELDS.map((f) => (
            <div className="form-group" key={f.key}>
              <label className="field-label">{f.label}</label>
              <textarea value={form[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} />
            </div>
          ))}
        </div>

        <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <h3>Home Banners</h3>
            <button type="button" className="btn btn-sm" onClick={addBanner}><Plus size={15} /> Add Banner</button>
          </div>
          <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
            Upload your own wide landscape banner images (recommended ~1600×710, roughly 2.25:1). The full image is
            shown on the home page without cropping — off-ratio images are framed with a soft blurred fill of the
            image itself, so they still look full. Changes appear on the live site within a few seconds of saving —
            no redeploy needed.
          </p>
          {banners.length === 0 ? (
            <p className="muted">No banners yet — add one and upload an image.</p>
          ) : (
            banners.map((b, i) => (
              <div key={i} className="card-pad" style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ width: 240, flexShrink: 0 }}>
                    <label className="field-label">Banner image</label>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#f4f7fc', aspectRatio: '1600 / 560', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {b.image_url ? (
                        <img src={b.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span className="muted" style={{ fontSize: '0.78rem' }}>No image</span>
                      )}
                    </div>
                    <label className="btn btn-sm" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                      <UploadCloud size={14} /> {bannerUploading === i ? 'Uploading…' : b.image_url ? 'Replace image' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={bannerUploading === i}
                        onChange={(e) => { uploadBannerImage(i, e.target.files?.[0]); e.target.value = ''; }}
                      />
                    </label>
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div className="form-group">
                      <label className="field-label">Title</label>
                      <input type="text" value={b.title || ''} onChange={(e) => setBanner(i, 'title', e.target.value)} placeholder="Banner heading / alt text" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="field-label">Link (optional)</label>
                      <input type="text" value={b.link || ''} onChange={(e) => setBanner(i, 'link', e.target.value)} placeholder="/products" />
                    </div>
                    <div style={{ marginTop: '0.75rem' }}>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => removeBanner(i)}><Trash2 size={15} /> Remove banner</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
