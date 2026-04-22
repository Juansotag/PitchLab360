document.addEventListener('DOMContentLoaded', () => {

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
    const btnExportPdf = document.getElementById('btn-export-pdf');

    function showResultsInSidebar() {
        sidebarModulesView.style.display = 'none';
        sidebarResultsView.style.display = 'block';
        btnExportPdf.style.display = '';
        // Open intro section by default
        const introSection = document.getElementById('res-intro');
        if (introSection && !introSection.classList.contains('open')) {
            introSection.classList.add('open');
        }
        sidebarResultsView.scrollTop = 0;
    }



    btnExportPdf.addEventListener('click', () => {
        const printView = document.getElementById('print-view');
        const candidato = document.getElementById('meta-candidato')?.value || 'Análisis PitchLab360';
        const fecha = document.getElementById('meta-fecha')?.value || new Date().toLocaleDateString('es-CO');

        // Collect all result sections from sidebar
        const sections = document.querySelectorAll('#sidebar-results-view .res-section-sb');
        let sectionsHTML = '';
        sections.forEach(sec => {
            const hdr = sec.querySelector('.res-section-hdr span')?.textContent || '';
            // Clone the body content (open or not)
            const bodyEl = sec.querySelector('.res-section-body-sb');
            const bodyHTML = bodyEl ? bodyEl.innerHTML : '';
            if (!bodyHTML.trim()) return; // skip empty sections
            sectionsHTML += `
                <div class="pv-section">
                    <div class="pv-section-hdr">${hdr}</div>
                    <div class="pv-section-body">${bodyHTML}</div>
                </div>`;
        });

        if (!sectionsHTML) {
            showToast('Primero realiza un análisis antes de exportar.', 'warning');
            return;
        }

        printView.innerHTML = `
            <div class="pv-header-logos">
                <img src="/assets/PitchLab360.jpg" class="pv-logo-main">
                <div class="pv-logos-secondary">
                    <img src="/assets/Universidad de la Sabana.png" class="pv-logo-sub">
                    <img src="/assets/Govlab.png" class="pv-logo-sub">
                </div>
            </div>
            <h1>Informe de Análisis de Discurso: ${candidato}</h1>
            <div class="pv-meta">PitchLab360 · Laboratorio de Gobierno (GovLab) · Universidad de La Sabana · ${fecha}</div>
            ${sectionsHTML}
            <div class="pv-disclaimer">
                <strong>Nota de exención de responsabilidad:</strong> Este análisis es un ejercicio académico generado mediante herramientas de inteligencia artificial y procesamiento de lenguaje natural. Los resultados aquí presentados no representan la posición oficial de la Universidad de La Sabana, el Laboratorio de Gobierno (GovLab), ni de sus trabajadores, estudiantes o personal administrativo.
            </div>`;

        setTimeout(() => {
            window.print();
            // Clean up after print dialog closes
            setTimeout(() => { printView.innerHTML = ''; }, 1000);
        }, 150);
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
            alert('Por favor introduce algún texto para analizar.');
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
                const errData = await response.json();
                alert(`Error en el servidor: ${errData.detail || 'Error desconocido'}`);
                throw new Error('Server Error');
            }

            const data = await response.json();
            console.log('Análisis Completado:', data);

            btnAnalyze.innerHTML = originalText;
            btnAnalyze.style.backgroundColor = 'var(--c-red)';
            badges.forEach(b => {
                b.textContent = 'Completado';
                b.className = 'status-badge completed';
                b.style.backgroundColor = '#e8edf7';
                b.style.color = '#1e3a6e';
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
    function gaugeCircle(score, max = 10) {
        const pct = Math.round((score / max) * 100);
        return `<div class="gauge-circle" style="--pct:${pct}%"><span class="gauge-val">${score}</span></div>`;
    }

    // ── SECCIÓN 0: Introducción ──────────────────────────────────
    function renderIntro(meta) {
        const body = document.getElementById('body-intro');
        const candidato = meta.candidato || 'el candidato';
        body.innerHTML = `
            <div class="result-card intro-catchy-card">
                <p style="font-size:0.92rem;color:var(--c-blue-dark);line-height:1.6;margin:0">
                    <strong>PitchLab360</strong> analiza el discurso político de <strong>${candidato}</strong> usando inteligencia artificial y lingüística computacional, para ayudarle a tomar decisiones de comunicación más informadas, eficaces y estratégicas durante su campaña.
                </p>
            </div>
            <div class="result-card">
                <div class="result-card-title">Sobre este Informe</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6">
                    <p>Este informe combina <strong>análisis computacional</strong> (métricas objetivas del lenguaje) con <strong>análisis cualitativo mediante LLM</strong> (Claude de Anthropic). Está organizado en tres secciones:</p>
                    <ul style="margin:0.5rem 0 0 1.2rem;display:flex;flex-direction:column;gap:0.3rem">
                        <li><strong>Sección 1 — Perfil Comunicativo:</strong> Estilo, formalidad y tipo de discurso.</li>
                        <li><strong>Sección 2 — Análisis Emocional:</strong> Índice de sentimiento, unidades de sentido, potencial digital y encuadres emocionales.</li>
                        <li><strong>Sección 3 — Análisis Semántico:</strong> Palabras frecuentes, complejidad lingüística e identificación de stakeholders.</li>
                    </ul>
                </div>
            </div>
            <div class="result-card" style="text-align:center">
                <div class="result-card-title">Demo en Video</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">El siguiente código QR lleva al video tutorial que muestra todas las funcionalidades disponibles de la herramienta.</div>
                <div class="qr-placeholder">
                    <i class="fa-solid fa-qrcode" style="font-size:3rem;color:var(--c-blue-dark);opacity:0.3"></i>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem">QR · Video Tutorial PitchLab360</div>
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
                <div class="result-card-title">a. Perfil Comunicativo</div>
                <div style="font-size:0.9rem;color:var(--c-blue-dark);line-height:1.6">${d.perfil_comunicativo || ''}</div>
            </div>
            <div class="result-card">
                <div class="result-card-title">b. Nivel de Formalidad</div>
                <div class="score-gauge">
                    ${gaugeCircle(d.formalidad?.score || 0)}
                    <div class="gauge-text">${d.formalidad?.justificacion || ''}</div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-card-title">c. Tipo de Discurso</div>
                <div style="display:flex;flex-direction:column;gap:0.6rem">
                    ${cats.map(c => {
                        const nombre = typeof c === 'object' ? c.nombre : c;
                        const just   = typeof c === 'object' ? c.justificacion : '';
                        const isDom  = nombre === d.tipo_discurso?.categoria_dominante;
                        return `<div class="discourse-type-tag ${isDom ? 'dominant' : ''}">
                            <span class="tag tag-purple">${nombre}${isDom ? ' ★' : ''}</span>
                            ${just ? `<div class="discourse-type-just">${just}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
    }

    // ── SECCIÓN 2: Análisis Emocional del Discurso ───────────────
    function renderAnalisisEmocional(frases, digital, marcos) {
        const body = document.getElementById('body-analisis-emocional');
        let html = '';

        // a. Índice de Sentimiento
        if (frases?.ok) {
            const d = frases.data;
            const score = d.tono?.score ?? 0;
            const pct = Math.round(((score + 1) / 2) * 100);
            html += `
            <div class="result-card">
                <div class="result-card-title">a. Índice de Sentimiento</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">
                    El Índice de Sentimiento mide la carga emocional global del discurso en una escala de −1 (muy negativo/hostil) a +1 (muy positivo/esperanzador), asignada por el modelo de IA al analizar el tono general de las expresiones.
                </div>
                <div class="tone-bar-container">
                    <div class="tone-track"><div class="tone-thumb" style="left:${pct}%"></div></div>
                    <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted)">
                        <span>Negativo (−1)</span>
                        <span style="font-weight:600;color:var(--c-blue-dark)">Puntaje: ${score.toFixed(2)} — ${d.tono?.descripcion || ''}</span>
                        <span>Positivo (+1)</span>
                    </div>
                </div>
            </div>`;

            // b. Unidades de Sentido Significativas
            html += `
            <div class="result-card">
                <div class="result-card-title">b. Unidades de Sentido Significativas</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">
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
                <div class="result-card-title">c. Mensajes con Alto Potencial de Viralización</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">
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
                <div class="result-card-title">d. Encuadres Emocionales</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">
                    Los encuadres emocionales son los marcos interpretativos que el discurso activa en la audiencia. Se asignan a partir de una lista predefinida de emociones políticas reconocidas (esperanza, miedo, indignación, orgullo, etc.) y se explica por qué cada una está presente.
                </div>
                <div class="emotion-list">
                    ${(d.emociones || []).sort((a,b) => b.porcentaje - a.porcentaje).map(e => `
                        <div class="emotion-row">
                            <div class="emotion-header">
                                <span class="emotion-name">${e.nombre}</span>
                                <span class="emotion-pct">${e.porcentaje}%</span>
                            </div>
                            <div class="emotion-track"><div class="emotion-fill" style="width:${e.porcentaje}%"></div></div>
                            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.15rem">${e.interpretacion || ''}</div>
                        </div>`).join('')}
                </div>
            </div>`;
        } else { html += errBlock(marcos?.error || 'Sin datos de encuadres'); }

        body.innerHTML = html;
    }

    // ── SECCIÓN 3: Análisis Semántico del Discurso ───────────────
    function renderAnalisisSematico(metricas, marcos, stakeholders) {
        const body = document.getElementById('body-analisis-semantico');
        let html = '';

        // a. Palabras más frecuentes del discurso
        if (metricas) {
            const topWords = (metricas.palabras_frecuentes || []).slice(0, 20);
            html += `
            <div class="result-card">
                <div class="result-card-title">a. Palabras Más Frecuentes del Discurso</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">
                    Listado de los términos con mayor frecuencia de aparición en el discurso. Se excluyen automáticamente pronombres, artículos, preposiciones y conjunciones para resaltar el vocabulario conceptual del candidato.
                </div>
                <div class="word-freq-chips">
                    ${topWords.length ? topWords.map(([w,n]) => `<span class="word-freq-chip">${w} <b>(${n})</b></span>`).join('') : '<em style="font-size:0.8rem;color:#94a3b8">No se identificaron términos recurrentes.</em>'}
                </div>
            </div>`;
        }

        // b. Nivel de Complejidad Discursiva (gauge 1-10 desde LLM)
        if (marcos?.ok) {
            const comp = marcos.data?.complejidad_lenguaje;
            html += `
            <div class="result-card">
                <div class="result-card-title">b. Nivel de Complejidad Discursiva</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">
                    Calificación de 1 a 10 sobre la sofisticación del lenguaje utilizado, considerando el TTR (riqueza léxica), el promedio de palabras por oración y el Índice de Legibilidad de Flesch-Kincaid. 1 = muy simple y accesible, 10 = muy técnico y complejo.
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
            const relTextColor = { positiva: '#1e3a6e', negativa: '#991b1b', neutra: '#475569' };
            const PALETTE = ['#003b8f','#762372','#d51437','#3277c3','#fb6f1a','#f8a719','#2563a8','#a855f7','#0891b2','#be185d','#65a30d','#92400e'];

            // Helper: build SVG pie chart from [{label, value, color}] array
            function svgPie(items, size = 160) {
                if (!items.length) return '';
                const total = items.reduce((s, x) => s + x.value, 0) || 1;
                const cx = size / 2, cy = size / 2, r = size / 2 - 4;
                let angle = -Math.PI / 2;
                const slices = items.map((item) => {
                    const sweep = (item.value / total) * 2 * Math.PI;
                    const x1 = cx + r * Math.cos(angle);
                    const y1 = cy + r * Math.sin(angle);
                    angle += sweep;
                    const x2 = cx + r * Math.cos(angle);
                    const y2 = cy + r * Math.sin(angle);
                    const large = sweep > Math.PI ? 1 : 0;
                    return `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${item.color}" stroke="white" stroke-width="2"/>`;
                });
                return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${slices.join('')}</svg>`;
            }

            // Color map por tipo_relacion
            const relChartColor = { positiva: '#2563a8', negativa: '#d51437', neutra: '#94a3b8' };

            // Helpers: hex ↔ RGB, weighted RGB blend
            function hexToRgb(hex) {
                const h = hex.replace('#','');
                return [ parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16) ];
            }
            function rgbToHex([r,g,b]) {
                return '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
            }
            function blendRelationColors(pos, neg, neu) {
                const total = pos + neg + neu || 1;
                const wPos = pos / total, wNeg = neg / total, wNeu = neu / total;
                const cPos = hexToRgb(relChartColor.positiva);
                const cNeg = hexToRgb(relChartColor.negativa);
                const cNeu = hexToRgb(relChartColor.neutra);
                const blended = [0,1,2].map(i => cPos[i]*wPos + cNeg[i]*wNeg + cNeu[i]*wNeu);
                return rgbToHex(blended);
            }

            // Torta 1: por stakeholder individual (color = su relación)
            const stakeholderItems = list
                .sort((a,b) => b.porcentaje_discurso - a.porcentaje_discurso)
                .map(s => ({ label: s.nombre, value: s.porcentaje_discurso || 0, color: relChartColor[s.tipo_relacion] || '#94a3b8', rel: s.tipo_relacion }));

            // Torta 2: por categoría (color = promedio RGB ponderado por % de discurso)
            const byCategoryRaw = {};
            list.forEach(s => {
                if (!byCategoryRaw[s.categoria]) byCategoryRaw[s.categoria] = { total: 0, pos: 0, neg: 0, neu: 0 };
                const pct = s.porcentaje_discurso || 0;
                byCategoryRaw[s.categoria].total += pct;
                if (s.tipo_relacion === 'positiva') byCategoryRaw[s.categoria].pos += pct;
                else if (s.tipo_relacion === 'negativa') byCategoryRaw[s.categoria].neg += pct;
                else byCategoryRaw[s.categoria].neu += pct;
            });
            const categoryItems = Object.entries(byCategoryRaw)
                .sort((a,b) => b[1].total - a[1].total)
                .map(([label, v]) => ({
                    label,
                    value: v.total,
                    color: blendRelationColors(v.pos, v.neg, v.neu)
                }));



            html += `
            <div class="result-card">
                <div class="result-card-title">c. Identificación de Stakeholders</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem">
                    Se identifican los actores, instituciones y grupos sobre los que <em>habla</em> el candidato en el discurso. Para cada uno se estima el porcentaje del discurso dedicado a ese actor y se clasifica la relación que el candidato proyecta hacia él.
                </div>

                <!-- Gráficos de torta -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem">
                        <div class="result-card-title" style="text-align:center">Por Stakeholder</div>
                        ${svgPie(stakeholderItems)}
                        <div style="display:flex;flex-direction:column;gap:0.25rem;width:100%">
                            ${stakeholderItems.map(it => `
                            <div style="display:flex;align-items:center;gap:0.4rem;font-size:0.72rem">
                                <span style="width:10px;height:10px;border-radius:2px;flex-shrink:0;background:${it.color}"></span>
                                <span style="flex:1;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${it.label}">${it.label}</span>
                                <span style="font-weight:700;color:var(--c-blue-dark)">${it.value}%</span>
                            </div>`).join('')}
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem">
                        <div class="result-card-title" style="text-align:center">Por Categoría</div>
                        ${svgPie(categoryItems)}
                        <div style="display:flex;flex-direction:column;gap:0.25rem;width:100%">
                            ${categoryItems.map(it => `
                            <div style="display:flex;align-items:center;gap:0.4rem;font-size:0.72rem">
                                <span style="width:10px;height:10px;border-radius:2px;flex-shrink:0;background:${it.color}"></span>
                                <span style="flex:1;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${it.label}">${it.label}</span>
                                <span style="font-weight:700;color:var(--c-blue-dark)">${it.value.toFixed(1)}%</span>
                            </div>`).join('')}
                        </div>
                    </div>
                </div>


                <!-- Lista detallada -->
                <div style="display:flex;flex-direction:column;gap:0.6rem">
                    ${list.sort((a,b) => b.porcentaje_discurso - a.porcentaje_discurso).map(s => `
                        <div class="stakeholder-item">
                            <div class="stakeholder-header">
                                <span class="stakeholder-name">${s.nombre}</span>
                                <span class="stakeholder-pct">${s.porcentaje_discurso}% del discurso</span>
                            </div>
                            <div class="stakeholder-meta">
                                <span class="stakeholder-category">${s.categoria}</span>
                                <span class="stakeholder-relation" style="background:${relColor[s.tipo_relacion]||'#f1f5f9'};color:${relTextColor[s.tipo_relacion]||'#475569'}">
                                    ${s.subcategoria_relacion} (${s.tipo_relacion})
                                </span>
                            </div>
                            <div class="stakeholder-track">
                                <div class="stakeholder-fill" style="width:${Math.min(s.porcentaje_discurso*3,100)}%;background:${relColor[s.tipo_relacion]||'#e2e8f0'};border:1px solid ${relTextColor[s.tipo_relacion]||'#94a3b8'}"></div>
                            </div>
                            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem;font-style:italic">"${s.evidencia}"</div>
                        </div>`).join('')}
                </div>
            </div>`;
        } else { html += errBlock(stakeholders?.error || 'Sin datos de stakeholders'); }

        body.innerHTML = html;
    }


    /* ---------- Main render entry point ---------- */
    function renderResults(data, meta) {
        renderIntro(meta);
        renderPerfilComunicativo(data.estilo);
        renderAnalisisEmocional(data.frases_clave, data.potencial_digital, data.marcos_narrativos);
        renderAnalisisSematico(data.metricas, data.marcos_narrativos, data.stakeholders);
        showResultsInSidebar();
        showToast('Análisis completado. Revise los resultados en el panel lateral.', 'success', 5000);
    }

    /* ============================================================
       DEMO — cargado desde /static/config/demo_data.json
     ============================================================ */
    document.getElementById('btn-demo').addEventListener('click', async () => {
        try {
            const res = await fetch('/static/config/demo_data.json');
            const demoData = await res.json();
            const { meta = {}, ...data } = demoData;

            const badges = document.querySelectorAll('.status-badge');
            badges.forEach(b => {
                b.textContent = 'Demo';
                b.className = 'status-badge completed';
                b.style.backgroundColor = '#e0e7ff';
                b.style.color = '#3730a3';
            });
            renderResults(data, meta);
            showToast('Datos de prueba cargados desde demo_data.json', 'info', 4000);
        } catch (e) {
            showToast('Error cargando demo_data.json: ' + e.message, 'error');
            console.error(e);
        }
    });

});

