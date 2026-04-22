/**
 * NKSW Virtual Try-On Widget v2
 * Self-contained — sem dependências externas, CSS injetado automaticamente.
 */

(function () {
  'use strict';

  const MAX_PX = 1200;
  const JPEG_QUALITY = 0.88;
  const POLL_INTERVAL_MS = 2000;
  const POLL_MAX_ATTEMPTS = 35;

  // ─── CSS ───────────────────────────────────────────────────────────────────
  const CSS = `
    .nksw-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.72);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: nksw-fade-in 0.2s ease;
    }
    @keyframes nksw-fade-in { from { opacity: 0 } to { opacity: 1 } }

    .nksw-modal {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 480px;
      max-height: 90dvh;
      overflow-y: auto;
      box-shadow: 0 24px 64px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
    }

    .nksw-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #f0f0f0;
    }
    .nksw-title { font-family: inherit; font-size: 17px; font-weight: 700; color: #111; margin: 0; }
    .nksw-close {
      background: none; border: none; cursor: pointer;
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #666; font-size: 20px; transition: background 0.15s;
    }
    .nksw-close:hover { background: #f5f5f5; }

    .nksw-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

    .nksw-upload-zone {
      border: 2px dashed #d1d1d1; border-radius: 12px;
      padding: 32px 16px; text-align: center; cursor: pointer;
      transition: border-color 0.2s, background 0.2s; position: relative;
    }
    .nksw-upload-zone:hover, .nksw-upload-zone.drag-over { border-color: #1a1a1a; background: #fafafa; }
    .nksw-upload-zone input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .nksw-upload-icon { font-size: 36px; margin-bottom: 8px; }
    .nksw-upload-text { font-size: 14px; color: #444; margin: 0; line-height: 1.5; }
    .nksw-upload-hint { font-size: 12px; color: #999; margin: 6px 0 0; }

    .nksw-preview-wrap { display: none; flex-direction: column; align-items: center; gap: 10px; }
    .nksw-preview-wrap.visible { display: flex; }
    .nksw-preview-img { width: 100%; max-height: 260px; object-fit: contain; border-radius: 10px; border: 1px solid #eee; }
    .nksw-change-btn {
      background: none; border: 1px solid #ccc; border-radius: 8px;
      padding: 6px 14px; font-size: 13px; cursor: pointer; color: #555; transition: border-color 0.15s;
    }
    .nksw-change-btn:hover { border-color: #888; }

    .nksw-generate-btn {
      width: 100%; padding: 14px; background: #111; color: #fff;
      border: none; border-radius: 12px; font-size: 15px; font-weight: 700;
      cursor: pointer; transition: background 0.2s, opacity 0.2s; letter-spacing: 1px;
      text-transform: uppercase;
    }
    .nksw-generate-btn:hover:not(:disabled) { background: #333; }
    .nksw-generate-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .nksw-loading { display: none; flex-direction: column; align-items: center; gap: 16px; padding: 8px 0; }
    .nksw-loading.visible { display: flex; }
    .nksw-spinner {
      width: 40px; height: 40px; border: 3px solid #eee;
      border-top-color: #111; border-radius: 50%;
      animation: nksw-spin 0.7s linear infinite;
    }
    @keyframes nksw-spin { to { transform: rotate(360deg) } }
    .nksw-loading-text { font-size: 14px; color: #555; text-align: center; line-height: 1.6; }

    .nksw-progress {
      width: 100%; height: 4px; background: #eee; border-radius: 2px; overflow: hidden;
    }
    .nksw-progress-bar {
      height: 100%; background: #111; border-radius: 2px;
      transition: width 1.8s ease; width: 0%;
    }

    /* ── Lead form ── */
    .nksw-lead {
      width: 100%; background: #f9f9f9; border-radius: 12px;
      padding: 16px; display: flex; flex-direction: column; gap: 10px;
    }
    .nksw-lead-title {
      font-size: 14px; font-weight: 700; color: #111; margin: 0; text-align: center;
    }
    .nksw-lead-sub {
      font-size: 12px; color: #666; margin: 0; text-align: center; line-height: 1.5;
    }
    .nksw-lead input {
      width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px; font-family: inherit; box-sizing: border-box; outline: none;
      transition: border-color 0.2s;
    }
    .nksw-lead input:focus { border-color: #111; }
    .nksw-lead-submit {
      width: 100%; padding: 11px; background: #111; color: #fff;
      border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    .nksw-lead-submit:hover { background: #333; }
    .nksw-lead-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .nksw-lead-skip {
      background: none; border: none; font-size: 12px; color: #aaa;
      cursor: pointer; text-decoration: underline; align-self: center;
      padding: 0;
    }
    .nksw-lead-skip:hover { color: #666; }
    .nksw-lead-sent {
      font-size: 13px; color: #2a7a2a; text-align: center;
      display: none; font-weight: 600;
    }
    .nksw-lead-sent.visible { display: block; }

    .nksw-result-wrap { display: none; flex-direction: column; gap: 14px; }
    .nksw-result-wrap.visible { display: flex; }
    .nksw-result-img { width: 100%; border-radius: 12px; border: 1px solid #eee; }
    .nksw-result-actions { display: flex; gap: 10px; }
    .nksw-retry-btn {
      flex: 1; padding: 12px; background: none; border: 1.5px solid #111;
      border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s;
    }
    .nksw-retry-btn:hover { background: #f5f5f5; }
    .nksw-save-btn {
      flex: 1; padding: 12px; background: #111; color: #fff;
      border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    .nksw-save-btn:hover { background: #333; }

    .nksw-error {
      display: none; background: #fff3f3; border: 1px solid #ffc0c0;
      border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #c00; text-align: center;
    }
    .nksw-error.visible { display: block; }

    .nksw-disclaimer { font-size: 11px; color: #bbb; text-align: center; line-height: 1.5; padding: 0 8px 4px; }

    @media (max-width: 480px) {
      .nksw-modal { max-height: 100dvh; border-radius: 16px 16px 0 0; }
      .nksw-overlay { align-items: flex-end; padding: 0; }
    }
  `;

  function injectStyles() {
    if (document.getElementById('nksw-tryon-styles')) return;
    const s = document.createElement('style');
    s.id = 'nksw-tryon-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function processImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > MAX_PX || height > MAX_PX) {
          const r = Math.min(MAX_PX / width, MAX_PX / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        if (!dataUrl || dataUrl === 'data:,') return reject(new Error('Falha ao processar imagem'));
        resolve(dataUrl);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
      img.src = url;
    });
  }

  function buildModal() {
    const overlay = document.createElement('div');
    overlay.className = 'nksw-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Provador Virtual');
    overlay.innerHTML = `
      <div class="nksw-modal">
        <div class="nksw-header">
          <h2 class="nksw-title">👙 Provador Virtual</h2>
          <button class="nksw-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="nksw-body">

          <div class="nksw-upload-zone" id="nksw-drop-zone" tabindex="0" role="button" aria-label="Enviar sua foto">
            <input type="file" id="nksw-file-input" accept="image/jpeg,image/png,image/webp" />
            <div class="nksw-upload-icon">📸</div>
            <p class="nksw-upload-text">Clique ou arraste sua foto aqui</p>
            <p class="nksw-upload-hint">JPG, PNG ou WEBP · foto de corpo inteiro · boa iluminação</p>
          </div>

          <div class="nksw-preview-wrap" id="nksw-preview-wrap">
            <img class="nksw-preview-img" id="nksw-preview-img" alt="Sua foto" />
            <button class="nksw-change-btn" id="nksw-change-btn">Trocar foto</button>
          </div>

          <div class="nksw-error" id="nksw-error"></div>

          <button class="nksw-generate-btn" id="nksw-generate-btn" disabled>
            EXPERIMENTAR VIRTUALMENTE
          </button>

          <div class="nksw-loading" id="nksw-loading">
            <div class="nksw-spinner"></div>
            <p class="nksw-loading-text" id="nksw-loading-text">
              Gerando seu look...<br><small>Aguarde alguns segundos</small>
            </p>
            <div class="nksw-progress">
              <div class="nksw-progress-bar" id="nksw-progress-bar"></div>
            </div>

            <div class="nksw-lead" id="nksw-lead">
              <p class="nksw-lead-title">✨ Enquanto sua foto é gerada…</p>
              <p class="nksw-lead-sub">Cadastre-se e receba as novidades da Naked SW em primeira mão!</p>
              <input id="nksw-lead-name"  type="text"  placeholder="Seu nome"       autocomplete="name" />
              <input id="nksw-lead-phone" type="tel"   placeholder="WhatsApp"       autocomplete="tel" />
              <input id="nksw-lead-email" type="email" placeholder="Seu e-mail"     autocomplete="email" />
              <button class="nksw-lead-submit" id="nksw-lead-submit">Quero receber novidades</button>
              <button class="nksw-lead-skip"   id="nksw-lead-skip">Pular</button>
              <p class="nksw-lead-sent" id="nksw-lead-sent">✅ Cadastro realizado! Fique de olho na sua caixa de entrada.</p>
            </div>
          </div>

          <div class="nksw-result-wrap" id="nksw-result-wrap">
            <img class="nksw-result-img" id="nksw-result-img" alt="Resultado do provador virtual" />
            <div class="nksw-result-actions">
              <button class="nksw-retry-btn" id="nksw-retry-btn">🔄 Tentar novamente</button>
              <button class="nksw-save-btn" id="nksw-save-btn">💾 Salvar foto</button>
            </div>
          </div>

          <p class="nksw-disclaimer">
            Sua foto é processada em tempo real e não é armazenada em nenhum servidor.
          </p>
        </div>
      </div>
    `;
    return overlay;
  }

  function toAbsoluteUrl(url) {
    if (!url) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (!url.startsWith('http')) return 'https://' + url;
    return url;
  }

  function initModal(btn) {
    const apiBase    = btn.dataset.apiUrl;
    const garmentUrl = toAbsoluteUrl(btn.dataset.garmentUrl);
    const category   = btn.dataset.category || 'auto';

    if (!apiBase || !garmentUrl) {
      console.error('[NKSW TryOn] Atributos data-api-url e data-garment-url são obrigatórios.');
      return;
    }

    const overlay = buildModal();
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const fileInput    = overlay.querySelector('#nksw-file-input');
    const dropZone     = overlay.querySelector('#nksw-drop-zone');
    const previewWrap  = overlay.querySelector('#nksw-preview-wrap');
    const previewImg   = overlay.querySelector('#nksw-preview-img');
    const changeBtn    = overlay.querySelector('#nksw-change-btn');
    const generateBtn  = overlay.querySelector('#nksw-generate-btn');
    const loading      = overlay.querySelector('#nksw-loading');
    const loadingText  = overlay.querySelector('#nksw-loading-text');
    const progressBar  = overlay.querySelector('#nksw-progress-bar');
    const resultWrap   = overlay.querySelector('#nksw-result-wrap');
    const resultImg    = overlay.querySelector('#nksw-result-img');
    const retryBtn     = overlay.querySelector('#nksw-retry-btn');
    const saveBtn      = overlay.querySelector('#nksw-save-btn');
    const errorDiv     = overlay.querySelector('#nksw-error');
    const closeBtn     = overlay.querySelector('.nksw-close');
    const leadForm     = overlay.querySelector('#nksw-lead');
    const leadName     = overlay.querySelector('#nksw-lead-name');
    const leadPhone    = overlay.querySelector('#nksw-lead-phone');
    const leadEmail    = overlay.querySelector('#nksw-lead-email');
    const leadSubmit   = overlay.querySelector('#nksw-lead-submit');
    const leadSkip     = overlay.querySelector('#nksw-lead-skip');
    const leadSent     = overlay.querySelector('#nksw-lead-sent');

    let selectedDataUrl = null;
    let pollTimer = null;
    let leadDone = false;

    function showError(msg) { errorDiv.textContent = msg; errorDiv.classList.add('visible'); }
    function clearError()   { errorDiv.classList.remove('visible'); }
    function setProgress(pct) { progressBar.style.width = `${pct}%`; }

    function hideLead() {
      leadForm.style.display = 'none';
      leadDone = true;
    }

    // ── Lead form ────────────────────────────────────────────────────────────
    leadSkip.addEventListener('click', hideLead);

    leadSubmit.addEventListener('click', async () => {
      const email = leadEmail.value.trim();
      if (!email || !email.includes('@')) {
        leadEmail.focus();
        return;
      }
      leadSubmit.disabled = true;
      leadSubmit.textContent = 'Enviando...';

      try {
        await fetch(`${apiBase}/api/lead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:  leadName.value.trim(),
            phone: leadPhone.value.trim(),
            email,
          }),
        });
      } catch (_) { /* falha silenciosa */ }

      leadName.style.display  = 'none';
      leadPhone.style.display = 'none';
      leadEmail.style.display = 'none';
      leadSubmit.style.display = 'none';
      leadSkip.style.display   = 'none';
      leadSent.classList.add('visible');
      leadDone = true;
    });

    // ── Upload ──────────────────────────────────────────────────────────────
    function setFile(file) {
      const objectUrl = URL.createObjectURL(file);
      previewImg.src = objectUrl;
      previewImg.onload = () => URL.revokeObjectURL(objectUrl);
      dropZone.style.display = 'none';
      previewWrap.classList.add('visible');
      resultWrap.classList.remove('visible');
      clearError();
      generateBtn.disabled = false;
      processImage(file).then(dataUrl => { selectedDataUrl = dataUrl; }).catch(() => {});
    }

    function resetToUpload() {
      clearInterval(pollTimer);
      selectedDataUrl = null;
      fileInput.value = '';
      previewImg.src = '';
      previewWrap.classList.remove('visible');
      resultWrap.classList.remove('visible');
      loading.classList.remove('visible');
      dropZone.style.display = '';
      generateBtn.disabled = true;
      setProgress(0);
      clearError();
      // Restaura lead form para próxima tentativa se ainda não enviou
      if (!leadDone) {
        leadForm.style.display = '';
      }
    }

    function closeModal() {
      clearInterval(pollTimer);
      resultImg.src = '';
      previewImg.src = '';
      overlay.remove();
      document.body.style.overflow = '';
    }

    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    closeBtn.addEventListener('click', closeModal);
    const onKey = e => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);

    fileInput.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) setFile(f); });
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith('image/')) setFile(f);
    });

    changeBtn.addEventListener('click', resetToUpload);
    retryBtn.addEventListener('click', resetToUpload);
    saveBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = resultImg.src;
      a.download = 'meu-look-nksw.jpg';
      a.click();
    });

    // ── Fluxo principal ──────────────────────────────────────────────────────
    generateBtn.addEventListener('click', async () => {
      if (!selectedDataUrl) {
        showError('Aguarde o processamento da foto.');
        return;
      }
      clearError();
      generateBtn.disabled = true;
      loading.classList.add('visible');
      previewWrap.classList.remove('visible');
      resultWrap.classList.remove('visible');
      if (!leadDone) leadForm.style.display = '';
      loadingText.innerHTML = 'Gerando seu look...<br><small>Aguarde alguns segundos</small>';
      setProgress(10);

      try {
        const submitRes = await fetch(`${apiBase}/api/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_image: selectedDataUrl,
            garment_image: garmentUrl,
            category,
          }),
        });

        const submitData = await submitRes.json();
        if (!submitRes.ok || (!submitData.jobId && !submitData.output)) {
          throw new Error(submitData.error || 'Falha ao enviar para processamento');
        }

        if (submitData.output) {
          setProgress(100);
          resultImg.src = submitData.output;
          resultWrap.classList.add('visible');
          return;
        }

        loadingText.innerHTML = 'Gerando seu look...<br><small>Isso leva cerca de 10–20 segundos</small>';
        setProgress(25);

        const { jobId } = submitData;
        let attempts = 0;

        await new Promise((resolve, reject) => {
          pollTimer = setInterval(async () => {
            attempts++;
            setProgress(Math.min(25 + (attempts / POLL_MAX_ATTEMPTS) * 65, 90));

            if (attempts > POLL_MAX_ATTEMPTS) {
              clearInterval(pollTimer);
              return reject(new Error('Timeout: o processamento demorou mais que o esperado. Tente novamente.'));
            }

            try {
              const pollRes = await fetch(`${apiBase}/api/result?jobId=${encodeURIComponent(jobId)}`);
              const pollData = await pollRes.json();

              if (pollData.status === 'completed' && pollData.output) {
                clearInterval(pollTimer);
                setProgress(100);
                resultImg.src = pollData.output;
                resolve();
              } else if (pollData.status === 'failed') {
                clearInterval(pollTimer);
                reject(new Error(pollData.error || 'Falha no processamento da imagem'));
              }
            } catch (e) {
              console.warn('[NKSW TryOn] Erro de polling (continuando):', e.message);
            }
          }, POLL_INTERVAL_MS);
        });

        resultWrap.classList.add('visible');

      } catch (err) {
        const msg = err?.message
          ? err.message
          : (typeof err === 'string' ? err : JSON.stringify(err));
        showError(msg || 'Erro inesperado. Tente novamente.');
        previewWrap.classList.add('visible');
        generateBtn.disabled = false;
        setProgress(0);
      } finally {
        loading.classList.remove('visible');
      }
    });
  }

  function init() {
    injectStyles();
    document.querySelectorAll('.nksw-tryon-btn').forEach(btn => {
      if (!btn.dataset.apiUrl && btn.dataset.workerUrl) {
        btn.dataset.apiUrl = btn.dataset.workerUrl;
      }
      btn.addEventListener('click', () => initModal(btn));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
