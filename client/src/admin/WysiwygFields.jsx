import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { uploadImage } from '../lib/blobUpload.js';
import Icon from '../components/Icon.jsx';

// Inline-editable text that visually matches whatever heading/paragraph
// style it sits inside — no border or background until you interact with
// it, so the page reads exactly like the real site until you go looking
// for what's editable. Saves on blur, same pattern as the rest of the CMS.
export function EditableText({ value, onSave, placeholder, className = '', as = 'input', rows }) {
  const [local, setLocal] = useState(value || '');
  const inputRef = useRef(null);

  // Re-sync if the saved value changes from outside (e.g. after the parent
  // reloads), but never while this field is actively focused — that would
  // wipe out what's being typed.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setLocal(value || '');
  }, [value]);

  // A textarea grows with its text, so a long paragraph set in the page's
  // large type is never cut off inside a fixed-height box.
  // Measured again once the web fonts arrive (the serif sets wider than its
  // fallback) and whenever the window is resized.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (as !== 'textarea' || !el) return;
    const fit = () => {
      el.style.height = 'auto';
      // scrollHeight leaves out the borders, which border-box height counts.
      const borders = el.offsetHeight - el.clientHeight;
      el.style.height = `${el.scrollHeight + borders}px`;
    };
    fit();
    let live = true;
    document.fonts?.ready.then(() => live && fit());
    window.addEventListener('resize', fit);
    return () => {
      live = false;
      window.removeEventListener('resize', fit);
    };
  }, [as, local]);

  function handleBlur() {
    if (local !== (value || '')) onSave(local);
  }

  const Tag = as === 'textarea' ? 'textarea' : 'input';

  return (
    <Tag
      ref={inputRef}
      className={`wysiwyg-field ${className}`}
      value={local}
      placeholder={placeholder}
      rows={as === 'textarea' ? rows || 2 : undefined}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
    />
  );
}

// A picture shown the way it will look on the site, with a small camera button
// in its corner to replace it. Only that button is clickable: nothing covers the
// picture, so it can never sit on top of (and block) text next to it.
export function EditableImage({ value, onSave, className = '', dark = false, placeholder = 'Nuk ka foto ende' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImage(file);
      onSave(url);
    } catch (err) {
      setError(err.message || 'Fotoja nuk u ngarkua.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className={`wysiwyg-image ${className} ${dark ? 'wysiwyg-image--dark' : ''}`}>
      {value
        ? <img src={value} alt="" className="wysiwyg-image__img" />
        : <div className="wysiwyg-image__empty">{placeholder}</div>
      }
      <button
        type="button"
        className="wysiwyg-image__edit"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={value ? 'Ndrysho foton' : 'Ngarko foto'}
        title={value ? 'Ndrysho foton' : 'Ngarko foto'}
      >
        {uploading ? <span className="wysiwyg-image__spinner" aria-hidden="true" /> : <Icon name="camera" />}
      </button>
      {error && <p className="wysiwyg-image__error" role="alert">{error}</p>}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleFile} />
    </div>
  );
}
