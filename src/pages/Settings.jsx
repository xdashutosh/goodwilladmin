import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Image as ImageIcon } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { SkeletonForm } from '../components/Skeleton';

const TEXT_FIELDS = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'brand_name', label: 'Brand Name' },
  { key: 'contact_email', label: 'Contact Email', hint: 'Inbox that receives mail — every email link on the site opens this address' },
  { key: 'display_email', label: 'Displayed Email', hint: 'Address shown on the website (e.g. contact@planaday.com). Leave empty to show contact@planaday.com' },
  { key: 'contact_phone', label: 'Contact Phone' },
  { key: 'whatsapp_number', label: 'WhatsApp Number (digits, with country code)', hint: 'e.g. 919810000000' },
  { key: 'map_coordinates', label: 'Map Location (latitude, longitude)', hint: 'Office/factory pin for the maps on the Contact page and footer, e.g. 28.723707,77.163445' },
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings');
        // `banners` is now managed in the Assets page (hero_banners) — drop it here.
        const { banners: _drop, ...rest } = data;
        setForm(rest);
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      await api.put('/settings', form);
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

        <div className="card card-pad" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>Home Banners, Videos & Images</h3>
            <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
              Hero banners, showcase videos, section headers, collection art, gifting images, backgrounds
              and logos are now managed in the <strong>Assets</strong> page.
            </p>
          </div>
          <Link to="/assets" className="btn btn-sm"><ImageIcon size={15} /> Open Assets</Link>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
