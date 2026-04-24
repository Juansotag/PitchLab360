document.addEventListener('DOMContentLoaded', () => {

    /* ── Pie chart tooltip (global, event delegation) ──────────── */
    function initPieTooltips() {
        if (document.getElementById('pie-tooltip')) return; // single instance
        const tip = document.createElement('div');
        tip.id = 'pie-tooltip';
        document.body.appendChild(tip);

        document.addEventListener('mousemove', e => {
            const slice = e.target.closest('.pie-slice');
            if (slice) {
                tip.textContent = `${slice.dataset.label}  ·  ${slice.dataset.value}`;
                tip.style.display = 'block';
                tip.style.left = (e.clientX + 14) + 'px';
                tip.style.top = (e.clientY - 36) + 'px';
            } else {
                tip.style.display = 'none';
            }
        });
        document.addEventListener('mouseleave', () => { tip.style.display = 'none'; }, true);
    }

    /* --- GLOBAL DOM REFS --- */
    const discourseTextarea = document.getElementById('discourse-text');
    const wordCountDisplay = document.getElementById('word-count');

    /* --- TOAST HELPER --- */
    function showToast(msg, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const icons = { success: 'circle-check', error: 'circle-xmark', warning: 'triangle-exclamation', info: 'circle-info' };
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fa-solid fa-${icons[type] || 'circle-info'}"></i> ${msg}`;
        container.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, duration);
    }

    /* --- SIDEBAR VIEW SWITCHING --- */
    const sidebarModulesView = document.getElementById('sidebar-modules-view');
    const sidebarResultsView = document.getElementById('sidebar-results-view');
    const btnExportPdf  = document.getElementById('btn-export-pdf');
    const btnExportHtml = document.getElementById('btn-export-html');

    function showResultsInSidebar() {
        sidebarModulesView.style.display = 'none';
        sidebarResultsView.style.display = 'block';
        btnExportPdf.style.display  = '';
        btnExportHtml.style.display = '';
        // Open intro section by default
        const introSection = document.getElementById('res-intro');
        if (introSection && !introSection.classList.contains('open')) {
            introSection.classList.add('open');
        }
        sidebarResultsView.scrollTop = 0;
    }




    /* ── Genera el HTML completo del informe (compartido por PDF y descarga HTML) ── */
    function generateReportHTML() {
        const candidato = document.getElementById('meta-candidato')?.value || '';
        const evento    = document.getElementById('meta-evento')?.value    || '';
        const fecha     = document.getElementById('meta-fecha')?.value     || '';

        const sections = document.querySelectorAll('#sidebar-results-view .res-section-sb');
        let sectionsHTML = '';
        sections.forEach(sec => {
            const hdr    = sec.querySelector('.res-section-hdr span')?.textContent || '';
            const bodyEl = sec.querySelector('.res-section-body-sb');
            const bodyHTML = bodyEl ? bodyEl.innerHTML : '';
            if (!bodyHTML.trim()) return;
            sectionsHTML += `
                <div class="pv-section">
                    <div class="pv-section-hdr">${hdr}</div>
                    <div class="pv-section-body">${bodyHTML}</div>
                </div>`;
        });

        if (!sectionsHTML) return null;

        // Eliminar guiones largos del HTML de secciones (por si quedaron en alguna renderización)
        sectionsHTML = sectionsHTML.replace(/—/g, '-');

        const base = window.location.origin;

        return { html: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe PitchLab360 — ${candidato}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Libre+Franklin:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="${base}/static/style.css">
<style>
  :root {
    --fs-sm:  0.72rem;
    --fs-md:  0.875rem;
    --fs-lg:  1.15rem;
    --lh:     1.75;
    --font-display: 'Publico Banner', 'Playfair Display', serif;
    --font-main:    'Libre Franklin', sans-serif;
    --font-label:   'Cabinet Grotesk', sans-serif;
    --c-blue-dark:  #00205B;
    --c-blue-light: #00387D;
    --c-blue-soft:  #93AAC9;
    --c-blue-tint:  #D9E1EF;
    --text-primary:   #00205B;
    --text-secondary: #374151;
    --text-muted:     #64748b;
    --border-color:   #D9E1EF;
  }
  html { font-size: 13pt; }
  html, body {
    background: #fff !important;
    color: #00205B !important;
    font-family: 'Libre Franklin', sans-serif !important;
    font-size: var(--fs-md) !important;
    line-height: var(--lh) !important;
    text-align: justify !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
    height: auto !important;
  }
  @page {
    size: A4;
    margin: 0; /* 0 elimina URL/fecha/hora del navegador */
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  /* Tabla que genera márgenes consistentes en cada página (thead/tfoot se repiten) */
  #pv-margin-table { width: 100%; border-collapse: collapse; border-spacing: 0; }
  #pv-margin-top, #pv-margin-bottom { height: 1.8cm; }
  #pv-root { display: block; padding: 0 2.5cm; max-width: 100%; }
  .pv-header-logos {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 2px solid #00205B; padding-bottom: 0.8rem; margin-bottom: 1.4rem;
  }
  .pv-logo-main  { height: 52px; width: auto; }
  .pv-logos-secondary { display: flex; gap: 1rem; align-items: center; }
  .pv-logo-sub   { height: 36px; width: auto; }
  #pv-root h1 {
    font-size: 18pt;
    font-family: 'Publico Banner', 'Playfair Display', serif;
    font-style: italic;
    font-weight: 800;
    color: #00205B;
    margin-bottom: 0.2rem;
  }
  .pv-meta { font-size: var(--fs-sm); color: #64748b; margin-bottom: 1.6rem; line-height: var(--lh); font-family: 'Libre Franklin', sans-serif; }
  .pv-section { margin-bottom: 1.4rem; padding-top: 0.6cm; border: none !important; border-radius: 0; overflow: visible; break-inside: auto; }
  .pv-section-hdr {
    background: none !important; padding: 0.25rem 0;
    font-family: 'Cabinet Grotesk', sans-serif;
    font-weight: 700; font-size: var(--fs-lg) !important; color: #00205B;
    border: none !important; border-bottom: 1.5px solid #00205B !important;
    text-transform: uppercase; margin-bottom: 0.6rem; break-after: avoid;
  }
  .pv-section-body { padding: 0.3rem 0 0 0; line-height: var(--lh); text-align: justify; }
  /* Elementos que no deben justificarse */
  .pv-header-logos, .pv-meta,
  .phrase-type, .phrase-just,
  .word-freq-chips, .word-freq-chip,
  .platform-badge, .emotion-header,
  .stakeholder-header, .stakeholder-meta,
  .gauge-circle, .gauge-val, .tone-bar-container,
  .discourse-type-tag, .tag { text-align: left !important; }
  /* Titulo de tarjeta (item) - Cabinet Grotesk, tamano lg, color UniSabana */
  .result-card-title {
    font-size: var(--fs-lg) !important;
    font-family: 'Cabinet Grotesk', sans-serif !important;
    font-weight: 700 !important;
    color: #00205B !important;
    text-align: left !important;
    margin-bottom: 0.4rem !important;
  }
  /* Contenido en tarjetas - tamano md (excluye titulos) */
  .result-card > div:not(.result-card-title), .result-card > p,
  .gauge-text, .phrase-item, .digital-text,
  .emotion-name, .factcheck-item, .risk-item .risk-frag,
  .pv-section-body > p { font-size: var(--fs-md) !important; line-height: var(--lh) !important; }
  /* Etiquetas, notas - tamano sm */
  .phrase-type, .phrase-just, .digital-reason,
  .emotion-pct, .fc-reason, .risk-desc,
  .stakeholder-pct, .stakeholder-category,
  .discourse-type-just, .stat-label { font-size: var(--fs-sm) !important; }
  .result-card {
    break-inside: avoid; page-break-inside: avoid;
    margin-bottom: 0.4rem;
    border: none !important; background: none !important;
    padding: 0.15rem 0 !important;
    border-bottom: 0.5px solid #e2e8f0 !important;
    border-radius: 0 !important;
  }
  .result-card:last-child { border-bottom: none !important; }
  /* La tarjeta de frases memorables sí puede cortarse entre páginas;
     cada recuadro individual permanece indivisible */
  .result-card:has(.phrase-list) { break-inside: auto !important; page-break-inside: auto !important; }
  .result-card:has(.phrase-list) .phrase-list { break-inside: auto !important; }
  .phrase-item { break-inside: avoid !important; page-break-inside: avoid !important; }
  /* Lo mismo para mensajes con potencial de viralización */
  .result-card:has(.digital-item) { break-inside: auto !important; page-break-inside: auto !important; }
  .digital-item { break-inside: avoid !important; page-break-inside: avoid !important; }
  /* Lo mismo para encuadres emocionales */
  .result-card:has(.emotion-list) { break-inside: auto !important; page-break-inside: auto !important; }
  .result-card:has(.emotion-list) .emotion-list { break-inside: auto !important; }
  .emotion-row { break-inside: avoid !important; page-break-inside: avoid !important; }
  /* Análisis Semántico — stakeholders y palabras frecuentes */
  .result-card:has(.stakeholder-item) { break-inside: auto !important; page-break-inside: auto !important; }
  .stakeholder-item { break-inside: avoid !important; page-break-inside: avoid !important; }
  .result-card:has(.word-freq-chips) { break-inside: auto !important; page-break-inside: auto !important; }
  .gauge-circle, .gauge-row, .tone-bar-container, .tone-track,
  .bar-row, .bar-track, .emotion-track, .stakeholder-item,
  .phrase-item, .digital-item, .word-freq-chips,
  .mini-marco-card, .nota-metodologica { break-inside: avoid; page-break-inside: avoid; }
  .pv-section-hdr, .result-card-title { break-after: avoid; page-break-after: avoid; }
  .tone-track {
    background: linear-gradient(to right, #d51437, #e2e8f0, #00205B) !important;
    border-radius: 99px; height: 12px; width: 100%; position: relative;
  }
  .tone-thumb {
    position: absolute; width: 18px; height: 18px; border-radius: 50%;
    background: white !important; border: 3px solid #00205B !important;
    top: 50%; transform: translate(-50%, -50%);
  }
  .stakeholder-track {
    display: block !important; background: #f1f5f9 !important;
    border-radius: 999px; height: 6px; overflow: hidden; margin-top: 0.3rem;
  }
  .stakeholder-fill { height: 100%; border-radius: 999px; }
  .platform-badge { display: inline-block; font-size: 9pt; border-radius: 999px; padding: 0.15rem 0.55rem; margin: 0.1rem; }
  .metrics-help-box, .res-toggle, button { display: none !important; }
  .pv-disclaimer {
    margin-top: 2rem; padding-top: 0.8rem; border-top: 1px solid #e2e8f0;
    font-size: 9.5pt; color: #64748b; line-height: 1.65; text-align: justify;
  }
  /* === Armonización tipográfica ===
     Normaliza los tamaños rem del sidebar a pt coherentes en impresión.
     También unifica los colores de texto secundario. */
  /* Colores unificados */
  *[style*="text-muted"]    { color: #64748b !important; }
  *[style*="text-secondary"]{ color: #475569 !important; }
  *[style*="c-blue-dark"]   { color: #00205B !important; }
  /* Texto generado por LLM: interlineado consistente */
  .result-card > div[style] { line-height: var(--lh) !important; }
</style>
</head>
<body>
<table id="pv-margin-table">
  <thead><tr><td id="pv-margin-top"></td></tr></thead>
  <tfoot><tr><td id="pv-margin-bottom"></td></tr></tfoot>
  <tbody><tr><td>
<div id="pv-root">
  <div class="pv-header-logos">
    <img src="${base}/assets/PitchLab360.jpg" class="pv-logo-main" onerror="this.style.display='none'">
    <div class="pv-logos-secondary">
      <img src="${base}/assets/Universidad de la Sabana.png" class="pv-logo-sub" onerror="this.style.display='none'">
      <img src="${base}/assets/Govlab.png" class="pv-logo-sub" onerror="this.style.display='none'">
    </div>
  </div>
  <h1>Informe de Análisis de Discurso: ${candidato}</h1>
  <div class="pv-meta">${evento ? evento + ' · ' : ''}${fecha}</div>
  ${sectionsHTML}
  <div class="pv-disclaimer">
    <strong>Alcance metodológico del análisis:</strong> Este informe es un ejercicio de
    <strong>análisis de discurso</strong>, no de verificación de hechos (<em>fact-checking</em>).
    La herramienta evalúa cómo está construido el mensaje, su estructura, tono, complejidad y
    estrategia comunicativa, pero <strong>no determina la veracidad o falsedad de ninguna afirmación</strong>.
    Asimismo, los resultados corresponden exclusivamente al discurso analizado y no representan
    ni resumen la totalidad de la campaña o trayectoria comunicativa del candidato.
    Los resultados no representan la posición oficial de la Universidad de La Sabana
    ni del Laboratorio de Gobierno (GovLab).
  </div>
</div>
  </td></tr></tbody>
</table>
</body>
</html>`, candidato, fecha };
    }

    /* ── Exportar PDF ── */
    btnExportPdf.addEventListener('click', () => {
        const result = generateReportHTML();
        if (!result) { showToast('Primero realiza un análisis antes de exportar.', 'warning'); return; }
        const { html: printHTML } = result;

        let iframe = document.getElementById('_pitchlab-print-frame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = '_pitchlab-print-frame';
            iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;pointer-events:none;';
            document.body.appendChild(iframe);
        }
        iframe.onload = () => {
            setTimeout(() => {
                try { iframe.contentWindow.print(); }
                catch(e) {
                    const w = window.open('', '_blank');
                    if (w) { w.document.write(printHTML); w.document.close(); }
                }
            }, 800);
        };
        iframe.srcdoc = printHTML;
    });

    /* ── Exportar HTML ── */
    document.getElementById('btn-export-html').addEventListener('click', () => {
        const result = generateReportHTML();
        if (!result) { showToast('Primero realiza un análisis antes de exportar.', 'warning'); return; }
        const { html, candidato, fecha } = result;
        const slug = (candidato || 'informe').replace(/\s+/g, '_').replace(/[^\w_]/g, '');
        const filename = `Informe_PitchLab360_${slug}_${fecha || 'sin_fecha'}.html`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast(`HTML descargado: ${filename}`, 'success', 5000);
    });


    // Module card navigation: click → show results & scroll to section
    document.querySelectorAll('.module-card[data-target]').forEach(card => {
        card.addEventListener('click', () => {
            if (sidebarResultsView.style.display === 'none' || !sidebarResultsView.style.display) return;
            const target = document.getElementById(card.dataset.target);
            if (target) {
                target.classList.add('open');
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Accordion toggle for result section headers
    document.querySelectorAll('.res-section-hdr').forEach(hdr => {
        hdr.addEventListener('click', (e) => {
            // If clicking help button, don't toggle accordion
            if (e.target.closest('.btn-help-metrics')) return;
            hdr.closest('.res-section-sb').classList.toggle('open');
        });
    });

    // Metrics help box toggle
    const btnHelpMetrics = document.getElementById('btn-help-metrics');
    const metricsHelpBox = document.getElementById('metrics-help-box');
    const btnCloseHelpBox = document.getElementById('close-help-box');

    if (btnHelpMetrics) {
        btnHelpMetrics.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent accordion from toggling
            metricsHelpBox.classList.toggle('hidden');
        });
    }

    if (btnCloseHelpBox) {
        btnCloseHelpBox.addEventListener('click', () => {
            metricsHelpBox.classList.add('hidden');
        });
    }

    /* --- SIDEBAR RESIZE LOGIC --- */
    const sidebar = document.getElementById('sidebar');
    const handle = document.getElementById('drag-handle');
    let dragging = false;

    handle.addEventListener('mousedown', () => {
        dragging = true;
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;

        // Disable text selection while dragging
        document.body.style.userSelect = 'none';

        // Calculate and apply new width (Constraints: 200px - 480px as per README)
        const maxWidth = window.innerWidth * 0.85;
        const newWidth = Math.min(maxWidth, Math.max(200, e.clientX));
        sidebar.style.width = newWidth + 'px';
        sidebar.style.minWidth = newWidth + 'px'; // Ensure flexbox doesn't shrink it
    });

    document.addEventListener('mouseup', () => {
        if (dragging) {
            dragging = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
    });

    /* --- TOGGLE YOUTUBE PANEL --- */
    const btnToggleYT = document.getElementById('toggle-yt-btn');
    const ytPanel = document.getElementById('youtube-panel');

    btnToggleYT.addEventListener('click', () => {
        ytPanel.classList.toggle('hidden');
        if (ytPanel.classList.contains('hidden')) {
            btnToggleYT.innerHTML = '<i class="fa-brands fa-youtube" style="color:red"></i> Importar de YouTube';
        } else {
            btnToggleYT.innerHTML = '<i class="fa-solid fa-xmark"></i> Ocultar panel YouTube';
        }
    });

    /* --- API KEY ACCORDION --- */
    const apiKeyToggle = document.getElementById('api-key-toggle');
    const apiKeyBody = document.getElementById('api-key-body');
    const apiKeyChevron = document.getElementById('api-key-chevron');
    const apiKeyInput = document.getElementById('anthropic-api-key');
    const toggleApiVisibility = document.getElementById('toggle-api-visibility');
    const apiEyeIcon = document.getElementById('api-eye-icon');

    apiKeyToggle.addEventListener('click', () => {
        apiKeyBody.classList.toggle('hidden');
        apiKeyChevron.classList.toggle('open');
    });

    toggleApiVisibility.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        apiEyeIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });

    function getApiKey() {
        return apiKeyInput.value.trim();
    }

    /* --- YOUTUBE PREVIEW LOGIC --- */
    const ytUrlInput = document.getElementById('yt-url');
    const ytPreview = document.getElementById('yt-preview');

    function extractVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    ytUrlInput.addEventListener('input', () => {
        const url = ytUrlInput.value.trim();
        const videoId = extractVideoId(url);

        if (videoId) {
            ytPreview.innerHTML = `<iframe width="100%" height="250" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px;"></iframe>`;
            ytPreview.style.padding = '0';
        } else {
            ytPreview.innerHTML = '<em>Vista previa del video aparecerá aquí tras ingresar una URL válida.</em>';
            ytPreview.style.padding = '2rem';
        }
    });

    /* --- BACKEND CONNECTION: EXTRACTION --- */
    const btnExtract = document.querySelector('.btn-yt-extract');
    const btnClean = document.querySelector('.btn-yt-clean');
    const startInput = document.getElementById('yt-start');
    const endInput = document.getElementById('yt-end');

    function mmssToSeconds(t) {
        const parts = t.trim().split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    }

    btnExtract.addEventListener('click', async () => {
        const url = ytUrlInput.value.trim();
        const inicio = startInput.value.trim();
        const fin = endInput.value.trim();

        if (!url || !inicio || !fin) {
            showToast('Por favor, completa la URL, el tiempo de inicio y fin.', 'warning');
            return;
        }

        // Start playing the video from the specified second IMMEDIATELY
        const videoId = extractVideoId(url);
        if (videoId) {
            const startSecs = mmssToSeconds(inicio);
            ytPreview.innerHTML = `<iframe width="100%" height="250" src="https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startSecs}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px;"></iframe>`;
            ytPreview.style.padding = '0';
        }

        const originalText = btnExtract.innerHTML;
        btnExtract.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Extrayendo...';
        btnExtract.disabled = true;

        try {
            const response = await fetch('/extraer-subtitulos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, inicio, fin })
            });
            const data = await response.json();

            if (data.error) {
                showToast(`Error en extracción: ${data.error}`, 'error', 6000);
            } else if (data.texto) {
                discourseTextarea.value = data.texto;
                discourseTextarea.dispatchEvent(new Event('input'));
                showToast('Subtítulos extraídos con éxito.', 'success');
            }
        } catch (e) {
            showToast('Error de conexión con el backend.', 'error');
            console.error(e);
        } finally {
            btnExtract.innerHTML = originalText;
            btnExtract.disabled = false;
        }
    });

    /* --- BACKEND CONNECTION: TEXT CLEANING --- */
    btnClean.addEventListener('click', async () => {
        const textToClean = discourseTextarea.value.trim();
        if (!textToClean) {
            showToast('No hay texto para limpiar. Pega o extráelo primero.', 'warning');
            return;
        }

        const originalText = btnClean.innerHTML;
        btnClean.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Limpiando...';
        btnClean.disabled = true;

        try {
            const apiKey = getApiKey();
            const response = await fetch('/limpiar-texto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: textToClean, api_key: apiKey || undefined })
            });

            const data = await response.json();
            if (data.error) {
                showToast(`Error: ${data.error}`, 'error', 7000);
            } else if (data.texto_limpio) {
                discourseTextarea.value = data.texto_limpio;
                discourseTextarea.dispatchEvent(new Event('input'));
                showToast('¡Texto limpiado con IA exitosamente!', 'success');
            }
        } catch (e) {
            showToast('Error de conexión con IA / Backend.', 'error');
        } finally {
            btnClean.innerHTML = originalText;
            btnClean.disabled = false;
        }
    });


    /* --- WORD COUNT LOGIC --- */
    discourseTextarea.addEventListener('input', () => {
        const text = discourseTextarea.value.trim();
        // Match non-space word characters
        const words = text ? text.split(/\s+/).length : 0;

        let label = words === 1 ? 'palabra' : 'palabras';
        wordCountDisplay.textContent = `${words} ${label}`;
    });

    /* --- EXECUTE BUTTON: MÓDULOS DE ANÁLISIS --- */
    const btnAnalyze = document.getElementById('btn-analyze');

    btnAnalyze.addEventListener('click', async () => {
        const text = discourseTextarea.value.trim();
        if (text.length === 0) {
            showToast('Por favor introduce algún texto para analizar.', 'warning');
            return;
        }

        const candidato = document.getElementById('meta-candidato').value.trim() || undefined;
        const evento = document.getElementById('meta-evento').value.trim() || undefined;
        const audiencia = document.getElementById('meta-audiencia').value.trim() || undefined;
        const medio = document.getElementById('meta-medio').value.trim() || undefined;
        const fecha = document.getElementById('meta-fecha').value.trim() || undefined;

        const originalText = btnAnalyze.innerHTML;
        btnAnalyze.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PROCESANDO...';
        btnAnalyze.style.backgroundColor = 'var(--c-blue-dark)';
        btnAnalyze.disabled = true;

        const badges = document.querySelectorAll('.status-badge');
        badges.forEach(b => {
            b.textContent = 'Procesando...';
            b.style.backgroundColor = '#fef08a';
            b.style.color = '#854d0e';
        });

        const metaObj = {};
        if (candidato) metaObj.candidato = candidato;
        if (evento) metaObj.evento = evento;
        if (audiencia) metaObj.audiencia = audiencia;
        if (medio) metaObj.medio = medio;
        if (fecha) metaObj.fecha = fecha;

        try {
            const apiKey = getApiKey();
            const response = await fetch('/analizar/todo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: text, metadatos: metaObj, api_key: apiKey || undefined })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                showToast(`Error en el servidor: ${errData.detail || 'Error desconocido'}`, 'error', 6000);
                throw new Error('Server Error');
            }

            const data = await response.json();

            btnAnalyze.innerHTML = originalText;
            btnAnalyze.style.backgroundColor = 'var(--c-red)';
            badges.forEach(b => {
                b.textContent = 'Completado';
                b.className = 'status-badge completed';
                b.style.backgroundColor = '#e8edf7';
                b.style.color = '#00205B';
            });

            renderResults(data, metaObj);

        } catch (err) {
            console.error(err);
            showToast('Error al procesar el análisis.', 'error', 6000);
            btnAnalyze.innerHTML = originalText;
            btnAnalyze.style.backgroundColor = '';
            badges.forEach(b => {
                b.textContent = 'Pendiente';
                b.style.backgroundColor = '#f3f4f6';
                b.style.color = '#374151';
            });
        } finally {
            btnAnalyze.disabled = false;
        }
    });

    /* ============================================================
       RESULTS RENDERING ENGINE — 4 Macrosecciones
     ============================================================ */

    function h(tag, cls, inner = '') { return `<${tag} class="${cls}">${inner}</${tag}>`; }
    function errBlock(msg) { return `<div class="error-block"><i class="fa-solid fa-circle-exclamation"></i> ${msg}</div>`; }
    function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : str; }
    function gaugeCircle(score, max = 10) {
        const pct = Math.round((score / max) * 100);
        return `<div class="gauge-circle" style="--pct:${pct}%"><span class="gauge-val">${score}</span></div>`;
    }

    // ── SECCIÓN 0: Introducción ──────────────────────────────────
    function renderIntro(meta) {
        const body = document.getElementById('body-intro');
        const candidato = meta.candidato || 'el candidato';
        const evento = meta.evento || '';
        body.innerHTML = `
            <div class="result-card intro-catchy-card">
                <p style="font-size:var(--fs-md);color:var(--c-blue-dark);line-height:var(--lh);margin:0">
                    <strong> PitchLab360 </strong>es una herramienta tecnológica de análisis de lenguaje que utiliza técnicas de procesamiento de lenguaje natural (<em>NLP</em>) para evaluar discursos, textos o intervenciones de exponentes y candidatos como <strong>${candidato}</strong> en <strong>${evento}</strong>. Su función principal es convertir el contenido verbal en indicadores medibles, como claridad, complejidad, estructura y tono del mensaje. A partir de esto, permite entender cómo está construido un discurso y qué tan efectivo puede ser para una audiencia. En términos más amplios, PitchLab no analiza si un mensaje es verdadero o falso, sino cómo está formulado, ofreciendo una base objetiva para diagnosticar y mejorar la comunicación, especialmente en contextos políticos, institucionales o estratégicos.
                </p>
            </div>
            <div class="result-card">
                <div class="result-card-title">Contenido del informe</div>
                <div style="font-size:var(--fs-md);color:var(--text-secondary);line-height:var(--lh)">
                    <p>Este informe combina <strong>análisis computacional</strong> (métricas objetivas del lenguaje) con <strong>análisis cualitativo mediante <em>LLM</em></strong>. Está organizado en tres secciones:</p>
                    <ul style="margin:0.5rem 0 0 1.2rem;display:flex;flex-direction:column;gap:0.3rem">
                        <li><strong>Sección 1: Perfil comunicativo:</strong> Estilo, formalidad y tipo de discurso.</li>
                        <li><strong>Sección 2: Análisis emocional:</strong> Índice de sentimiento, unidades de sentido, potencial digital y encuadres emocionales.</li>
                        <li><strong>Sección 3: Análisis semántico:</strong> Palabras frecuentes, complejidad lingüística e identificación de <em>stakeholders</em>.</li>
                    </ul>
                </div>
            </div>
            <div class="result-card" style="text-align:center">
                <div class="result-card-title">Demo en video</div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:0.75rem">El siguiente código QR lleva al video tutorial que muestra todas las funcionalidades disponibles de la herramienta.</div>
                <div class="qr-placeholder">
                    <img src="${window.location.origin}/assets/QR.png" alt="QR Video Tutorial PitchLab360" style="width:140px;height:140px;object-fit:contain" onerror="this.style.display='none'">
                </div>
            </div>
            <div class="result-card">
                <div class="result-card-title">Glosario</div>
                <div style="font-size:var(--fs-md);color:var(--text-secondary);line-height:var(--lh);display:flex;flex-direction:column;gap:0.75rem">
                    <div>
                        <strong style="color:var(--c-blue-dark)">TTR &mdash; Type-Token Ratio</strong><br>
                        Razón entre el número de palabras únicas (<em>types</em>) y el total de palabras del discurso (<em>tokens</em>). Un TTR alto indica mayor riqueza léxica y variedad de vocabulario; un TTR bajo sugiere mayor repetición terminológica.
                    </div>
                    <div>
                        <strong style="color:var(--c-blue-dark)">Palabras por oración</strong><br>
                        Promedio del número de palabras por cada oración del discurso. Oraciones largas tienden a asociarse con registros más formales o técnicos; oraciones cortas, con un estilo más directo y accesible.
                    </div>
                    <div>
                        <strong style="color:var(--c-blue-dark)">Índice de Legibilidad de Flesch-Kincaid</strong><br>
                        Métrica que estima qué tan fácil es leer un texto. Valores altos indican mayor accesibilidad; valores bajos corresponden a textos de mayor complejidad y formalidad.
                    </div>
                </div>
            </div>`;
    }

    // ── SECCIÓN 1: Perfil Comunicativo del Candidato ─────────────
    function renderPerfilComunicativo(estilo) {
        const body = document.getElementById('body-perfil-comunicativo');
        if (!estilo?.ok) { body.innerHTML = errBlock(estilo?.error || 'Sin datos'); return; }
        const d = estilo.data;
        const cats = d.tipo_discurso?.categorias || [];
        body.innerHTML = `
            <div class="result-card">
                <div class="result-card-title">a. Perfil comunicativo</div>
                <div style="font-size:var(--fs-md);color:var(--c-blue-dark);line-height:var(--lh)">${d.perfil_comunicativo || ''}</div>
            </div>
            <div class="result-card">
                <div class="result-card-title">b. Nivel de formalidad</div>
                <div class="score-gauge">
                    ${gaugeCircle(d.formalidad?.score || 0)}
                    <div class="gauge-text">${d.formalidad?.justificacion || ''}</div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-card-title">c. Tipo de discurso</div>
                <div style="display:flex;flex-direction:column;gap:0.6rem">
                    ${cats.map(c => {
            const nombre = typeof c === 'object' ? c.nombre : c;
            const just = typeof c === 'object' ? c.justificacion : '';
            const isDom = nombre === d.tipo_discurso?.categoria_dominante;
            return `<div class="discourse-type-tag ${isDom ? 'dominant' : ''}">
                            <span class="tag tag-purple">${cap(nombre)}${isDom ? ' ★' : ''}</span>
                            ${just ? `<div class="discourse-type-just">${just}</div>` : ''}
                        </div>`;
        }).join('')}
                </div>
            </div>`;
    }

    // ── SECCIÓN 2: Análisis Emocional del Discurso ───────────────
    function renderAnalisisEmocional(frases, digital, marcos, marcoTeorico) {
        const body = document.getElementById('body-analisis-emocional');
        let html = '';

        // a. Índice de Sentimiento
        if (frases?.ok) {
            const d = frases.data;
            const score = d.tono?.score ?? 0;
            const pct = Math.round(((score + 1) / 2) * 100);
            html += `
            <div class="result-card">
                <div class="result-card-title">a. Índice de sentimiento</div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:0.75rem">
                    El Índice de sentimiento mide la carga emocional global del discurso en una escala de −1 (muy negativo/hostil) a +1 (muy positivo/esperanzador), asignada por el modelo de IA al analizar el tono general de las expresiones.
                </div>
                <div class="tone-bar-container">
                    <div class="tone-track"><div class="tone-thumb" style="left:${pct}%"></div></div>
                    <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-top:0.3rem">
                        <span>Negativo (−1)</span>
                        <span>Positivo (+1)</span>
                    </div>
                    <div style="text-align:center;margin-top:0.5rem;font-size:var(--fs-md);font-weight:600;color:var(--c-blue-dark)">
                        Puntaje: ${score.toFixed(2)} — <span style="font-weight:400;color:var(--text-secondary)">${d.tono?.descripcion || ''}</span>
                    </div>
                </div>
            </div>`;

            // b. Unidades de Sentido Significativas
            html += `
            ${marcoTeorico?.data?.nota_metodologica ? `
            <div style="display:flex;align-items:flex-start;gap:0.5rem;padding:0.6rem 0.85rem;background:var(--c-blue-tint);border-left:2px solid var(--c-blue-dark);border-radius:0 6px 6px 0;margin-bottom:0.5rem">
                <i class="fa-solid fa-circle-info" style="color:var(--c-blue-dark);font-size:var(--fs-sm);margin-top:0.15rem;flex-shrink:0"></i>
                <div>
                    <span style="font-size:var(--fs-sm);font-weight:700;color:var(--c-blue-dark);text-transform:uppercase;letter-spacing:0.04em">Nota metodológica</span>
                    <p style="font-size:var(--fs-sm);color:var(--text-secondary);line-height:var(--lh);margin:0.15rem 0 0">${marcoTeorico.data.nota_metodologica}</p>
                </div>
            </div>` : ''}
            <div class="result-card">
                <div class="result-card-title">b. Unidades de sentido significativas</div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:0.75rem">
                    Las unidades de sentido significativas son frases o párrafos cortos que comunican la posición del candidato de forma autónoma, sin necesitar el contexto completo del discurso. Se clasifican por su función retórica a partir de una lista predefinida de categorías.
                </div>
                <div class="phrase-list">
                    ${(d.frases_memorables || []).map(f => `
                        <div class="phrase-item">
                            <div class="phrase-type">Categoría: ${f.tipo}</div>
                            <div>"${f.frase}"</div>
                            <div class="phrase-just">${f.justificacion}</div>
                        </div>`).join('')}
                </div>
            </div>`;
        } else { html += errBlock(frases?.error || 'Sin datos de mensajes clave'); }

        // c. Mensajes con Alto Potencial de Viralización
        if (digital?.ok) {
            const d = digital.data;
            html += `
            <div class="result-card">
                <div class="result-card-title">c. Mensajes con alto potencial de viralización</div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:0.75rem">
                    Son fragmentos del discurso con alta probabilidad de resonar en redes sociales por su carga emocional, brevedad o impacto narrativo. Para cada uno se sugieren las plataformas más adecuadas según su naturaleza.
                </div>
                ${(d.fragmentos || []).map(f => {
                const plats = Array.isArray(f.plataformas) ? f.plataformas : [f.plataformas || f.formato_sugerido];
                return `<div class="digital-item">
                        <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.4rem">
                            ${plats.map(p => `<span class="platform-badge">${p}</span>`).join('')}
                        </div>
                        <div class="digital-text">"${f.texto}"</div>
                        <div class="digital-reason">Criterio: ${f.razon}</div>
                    </div>`;
            }).join('')}
            </div>`;
        } else { html += errBlock(digital?.error || 'Sin datos de potencial digital'); }

        // d. Encuadres Emocionales
        if (marcos?.ok) {
            const d = marcos.data;
            html += `
            <div class="result-card">
                <div class="result-card-title">d. Encuadres emocionales</div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:0.75rem">
                    Los encuadres emocionales son los marcos interpretativos que el discurso activa en la audiencia. Se identifican a partir de una lista predefinida de emociones políticas reconocidas (como esperanza, miedo, indignación u orgullo) y culminan en una síntesis interpretativa del encuadre emocional, que permite comprender la función de ese marco dentro del discurso.
                </div>
                <div class="emotion-list">
                    ${(d.emociones || []).sort((a, b) => b.porcentaje - a.porcentaje).map(e => `
                        <div class="emotion-row">
                            <div class="emotion-header">
                                <span class="emotion-name">${cap(e.nombre)}</span>
                                <span class="emotion-pct">${e.porcentaje}%</span>
                            </div>
                            <div class="emotion-track"><div class="emotion-fill" style="width:${e.porcentaje}%"></div></div>
                            <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-top:0.15rem">${e.interpretacion || ''}</div>
                        </div>`).join('')}
                </div>
            </div>`;
        } else { html += errBlock(marcos?.error || 'Sin datos de encuadres'); }

        body.innerHTML = html;
    }

    // ── SECCIÓN 3: Análisis Semántico del Discurso ───────────────
    function renderAnalisisSematico(metricas, marcos, stakeholders, marcoTeorico) {
        const body = document.getElementById('body-analisis-semantico');
        let html = '';

        // Helper: render a mini framework card from marco_teorico data
        function miniMarco(nombre) {
            const lista = marcoTeorico?.data?.marcos || [];
            const m = lista.find(x => `${x.nombre} ${x.autor_anio}`.toLowerCase().includes(nombre.toLowerCase()));
            if (!m) return '';
            return `<div class="result-card" style="border-left:3px solid var(--c-blue-dark);background:var(--c-blue-tint)">
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem">
                    <i class="fa-solid fa-book-open" style="color:var(--c-blue-dark);font-size:0.8rem"></i>
                    <span style="font-size:0.75rem;font-weight:700;color:var(--c-blue-dark)">${m.nombre}</span>
                    <span style="font-size:0.7rem;color:var(--text-muted);margin-left:auto">${m.autor_anio}</span>
                </div>
                <p style="font-size:var(--fs-md);color:var(--text-secondary);line-height:var(--lh);margin:0 0 0.4rem">${m.justificacion}</p>
                <div style="display:flex;flex-wrap:wrap;gap:0.3rem">
                    ${(m.indicadores_que_lo_activan || []).map(ind => `<span style="font-size:0.69rem;background:#e8edf7;color:var(--c-blue-dark);padding:0.15rem 0.5rem;border-radius:999px">${ind}</span>`).join('')}
                </div>
            </div>`;
        }

        // Entman framework — shown at top of section 3
        html += miniMarco('Entman');

        // a. Palabras más frecuentes del discurso
        if (metricas) {
            const topWords = (metricas.palabras_frecuentes || []).slice(0, 20);
            html += `
            <div class="result-card">
                <div class="result-card-title">a. Palabras más frecuentes del discurso</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">
                    Listado de los términos con mayor frecuencia de aparición en el discurso. Se excluyen automáticamente pronombres, artículos, preposiciones y conjunciones para resaltar el vocabulario conceptual del candidato.
                </div>
                <div class="word-freq-chips">
                    ${topWords.length ? topWords.map(([w, n]) => `<span class="word-freq-chip">${cap(w)} <b>(${n})</b></span>`).join('') : '<em style="font-size:0.8rem;color:#94a3b8">No se identificaron términos recurrentes.</em>'}
                </div>
            </div>`;
        }

        // b. Nivel de Complejidad Discursiva (gauge 1-10 desde LLM)
        if (marcos?.ok) {
            const comp = marcos.data?.complejidad_lenguaje;
            html += `
            <div class="result-card">
                <div class="result-card-title">b. Nivel de complejidad discursiva</div>
                <div style="font-size:var(--fs-sm);color:var(--text-muted);margin-bottom:0.75rem">
                    Calificación de 1 a 10 sobre la sofisticación del lenguaje (TTR, palabras por oración e índice Flesch-Kincaid). 1 = muy simple, 10 = muy técnico.
                </div>
                <div class="score-gauge">
                    ${gaugeCircle(comp?.score || 0)}
                    <div class="gauge-text">${comp?.justificacion || ''}</div>
                </div>
            </div>`;
        }

        // c. Identificación de Stakeholders
        if (stakeholders?.ok) {
            const list = stakeholders.data?.stakeholders || [];
            const relColor = { positiva: '#e8edf7', negativa: '#fee2e2', neutra: '#f1f5f9' };
            const relTextColor = { positiva: '#00205B', negativa: '#991b1b', neutra: '#374151' };

            html += `
            <div class="result-card">
                <div class="result-card-title">c. Identificación de <em>stakeholders</em></div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">
                    Se identifican los actores, instituciones y grupos sobre los que <em>habla</em> el candidato en el discurso. Para cada uno se estima el porcentaje del discurso dedicado a ese actor y se clasifica la relación que el candidato proyecta hacia él.
                </div>
                ${miniMarco('Freeman')}

                <div style="display:flex;flex-direction:column;gap:0.6rem">
                    ${list.sort((a, b) => b.porcentaje_discurso - a.porcentaje_discurso).map(s => `
                        <div class="stakeholder-item">
                            <div class="stakeholder-header">
                                <span class="stakeholder-name">${s.nombre}</span>
                                <span class="stakeholder-pct">${s.porcentaje_discurso}% del discurso</span>
                            </div>
                            <div class="stakeholder-meta">
                                <span class="stakeholder-category">Categoría: ${s.categoria}</span>
                                <span class="stakeholder-relation" style="background:${relColor[s.tipo_relacion] || '#f1f5f9'};color:${relTextColor[s.tipo_relacion] || '#475569'}">
                                    Relación: ${s.subcategoria_relacion} (${s.tipo_relacion})
                                </span>
                            </div>
                            <div class="stakeholder-track">
                                <div class="stakeholder-fill" style="width:${Math.min(s.porcentaje_discurso * 3, 100)}%;background:${relColor[s.tipo_relacion] || '#e2e8f0'};border:1px solid ${relTextColor[s.tipo_relacion] || '#94a3b8'}"></div>
                            </div>
                            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem;font-style:italic">"${s.evidencia}"</div>
                        </div>`).join('')}
                </div>
            </div>`;
        } else { html += errBlock(stakeholders?.error || 'Sin datos de stakeholders'); }

        body.innerHTML = html;
        initPieTooltips();
    }


    /* ---------- Main render entry point ---------- */


    function renderResults(data, meta, silent = false) {
        renderIntro(meta);
        renderPerfilComunicativo(data.estilo);
        renderAnalisisEmocional(data.frases_clave, data.potencial_digital, data.marcos_narrativos, data.marco_teorico);
        renderAnalisisSematico(data.metricas, data.marcos_narrativos, data.stakeholders, data.marco_teorico);
        // Elimina guiones largos “—” del contenido renderizado (LLM y estático)
        sanitizeEmdashes(document.getElementById('sidebar-results-view'));
        showResultsInSidebar();
        if (!silent) showToast('Análisis completado. Revise los resultados en el panel lateral.', 'success', 5000);
    }

    /* Reemplaza guiones largos en nodos de texto del DOM */
    function sanitizeEmdashes(rootEl) {
        if (!rootEl) return;
        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue.includes('—')) {
                node.nodeValue = node.nodeValue.replace(/—/g, '-');
            }
        }
    }


    /* ============================================================
       DEMO — atajo secreto Ctrl+M (sin botón visible)
     ============================================================ */
    document.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            try {
                const res = await fetch('/static/config/demo_data.json?v=' + Date.now());
                const demoData = await res.json();
                const { meta = {}, ...data } = demoData;

                const badges = document.querySelectorAll('.status-badge');
                badges.forEach(b => {
                    b.textContent = 'Demo';
                    b.className = 'status-badge completed';
                    b.style.backgroundColor = 'var(--c-blue-tint)';
                    b.style.color = 'var(--c-blue-dark)';
                });
                // Populate metadata fields from demo JSON
                if (meta.candidato) document.getElementById('meta-candidato').value = meta.candidato;
                if (meta.evento)    document.getElementById('meta-evento').value    = meta.evento;
                if (meta.medio)     document.getElementById('meta-medio').value     = meta.medio;
                if (meta.fecha)     document.getElementById('meta-fecha').value     = meta.fecha;

                renderResults(data, meta, true);
                showToast('Modo demo activado', 'info', 3000);
            } catch (e) {
                showToast('Error cargando demo_data.json: ' + e.message, 'error');
                console.error(e);
            }
        }
    });

});

