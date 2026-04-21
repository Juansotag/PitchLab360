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
    const btnBack = document.getElementById('btn-back-to-modules');
    const btnExportPdf = document.getElementById('btn-export-pdf');

    function showResultsInSidebar() {
        sidebarModulesView.style.display = 'none';
        sidebarResultsView.style.display = 'block';
        btnExportPdf.style.display = '';
        // Open first section by default
        const firstSection = sidebarResultsView.querySelector('.res-section-sb');
        if (firstSection && !firstSection.classList.contains('open')) {
            firstSection.classList.add('open');
        }
        sidebarResultsView.scrollTop = 0;
    }

    btnBack.addEventListener('click', () => {
        sidebarResultsView.style.display = 'none';
        sidebarModulesView.style.display = 'block';
    });

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
            <h1>📊 ${candidato}</h1>
            <div class="pv-meta">PitchLab360 · GovLab Universidad de La Sabana · ${fecha}</div>
            ${sectionsHTML}`;

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
        hdr.addEventListener('click', () => {
            hdr.closest('.res-section-sb').classList.toggle('open');
        });
    });

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
        const newWidth = Math.min(480, Math.max(200, e.clientX));
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
                b.style.backgroundColor = '#dcfce7';
                b.style.color = '#166534';
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
       RESULTS RENDERING ENGINE
     ============================================================ */

    function h(tag, cls, inner = '') {
        return `<${tag} class="${cls}">${inner}</${tag}>`;
    }
    function errBlock(msg) {
        return `<div class="error-block"><i class="fa-solid fa-circle-exclamation"></i> ${msg}</div>`;
    }
    function tags(arr, color = 'blue') {
        return `<div class="tag-list">${arr.map(t => `<span class="tag tag-${color}">${t}</span>`).join('')}</div>`;
    }
    function gaugeCircle(score, max = 10) {
        const pct = Math.round((score / max) * 100);
        return `<div class="gauge-circle" style="--pct:${pct}%"><span class="gauge-val">${score}</span></div>`;
    }

    /* ---------- Section renderers ---------- */

    function renderMetricas(m) {
        const grid = document.getElementById('metrics-grid');
        const extra = document.getElementById('metrics-extra');
        // Ensure parent section is open
        const sec = document.getElementById('res-metricas');
        if (sec) sec.classList.add('open');

        if (!m) { grid.innerHTML = errBlock('Sin datos de métricas.'); return; }

        // Main stat cards (grid)
        grid.innerHTML = [
            { val: m.TTR, label: 'TTR', title: 'Type-Token Ratio (riqueza léxica)' },
            { val: m.legibilidad_flesch, label: 'Legibilidad (Flesch)', title: 'Mayor = más fácil de leer' },
            { val: m.longitud_promedio_oracion, label: 'Palabras / oración', title: '' },
            { val: m.negaciones?.count ?? 0, label: 'Negaciones', title: '' },
            { val: `${m.negaciones?.densidad_pct ?? 0}%`, label: 'Densidad neg.', title: '' },
        ].map(s => `
            <div class="metric-stat-card" title="${s.title}">
                <div class="stat-val">${s.val}</div>
                <div class="stat-label">${s.label}</div>
            </div>
        `).join('');

        // Nosotros/Ellos bar
        const nos = m.nosotros_ellos?.nosotros || 0;
        const ell = m.nosotros_ellos?.ellos || 0;
        const total = nos + ell || 1;
        const nosPct = Math.round((nos / total) * 100);
        const ellPct = 100 - nosPct;

        // Word frequency chips
        const topWords = (m.palabras_frecuentes || []).slice(0, 20);

        extra.innerHTML = `
            <div class="nos-ell-bar">
                <div class="bar-label">Nosotros (${nos}) vs. Ellos (${ell}) &mdash; ratio: ${m.nosotros_ellos?.ratio ?? 'N/A'}</div>
                <div class="bar-track">
                    <div class="bar-fill-nos" style="width:${nosPct}%"></div>
                    <div class="bar-fill-ell" style="width:${ellPct}%"></div>
                </div>
            </div>
            <div>
                <div class="result-card-title">Palabras más frecuentes</div>
                <div class="word-freq-chips">
                    ${topWords.length ? topWords.map(([w, n]) => `<span class="word-freq-chip">${w} <b>(${n})</b></span>`).join('') : '<em style="font-size:0.8rem;color:#94a3b8">No se identificaron palabras frecuentes.</em>'}
                </div>
            </div>
        `;
    }


    function renderFrases(mod) {
        const body = document.getElementById('body-frases');
        if (!mod?.ok) { body.innerHTML = errBlock(mod?.error || 'Sin datos'); return; }
        const d = mod.data;
        const score = d.tono?.score ?? 0;
        const pct = Math.round(((score + 1) / 2) * 100); // -1..1 → 0..100%
        body.innerHTML = `
            <div class="result-card">
                <div class="result-card-title">Tono general</div>
                <div class="tone-bar-container">
                    <div class="tone-track">
                        <div class="tone-thumb" style="left:${pct}%"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted)">
                        <span>Negativo −1</span>
                        <span style="font-weight:600;color:var(--c-blue-dark)">${score.toFixed(2)} — ${d.tono?.descripcion || ''}</span>
                        <span>Positivo +1</span>
                    </div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-card-title">Frases memorables</div>
                <div class="phrase-list">
                    ${(d.frases_memorables || []).map(f => `
                        <div class="phrase-item">
                            <div class="phrase-type">${f.tipo}</div>
                            <div>"${f.frase}"</div>
                            <div class="phrase-just">${f.justificacion}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderMarcos(mod) {
        const body = document.getElementById('body-marcos');
        if (!mod?.ok) { body.innerHTML = errBlock(mod?.error || 'Sin datos'); return; }
        const d = mod.data;
        body.innerHTML = `
            <div class="result-card">
                <div class="result-card-title">Mapa emocional del discurso</div>
                <div class="emotion-list">
                    ${(d.emociones || []).sort((a,b) => b.porcentaje - a.porcentaje).map(e => `
                        <div class="emotion-row">
                            <div class="emotion-header">
                                <span class="emotion-name">${e.nombre}</span>
                                <span class="emotion-pct">${e.porcentaje}%</span>
                            </div>
                            <div class="emotion-track">
                                <div class="emotion-fill" style="width:${e.porcentaje}%"></div>
                            </div>
                            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.15rem">${e.interpretacion || ''}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="result-card">
                <div class="result-card-title">Complejidad del lenguaje</div>
                <div class="score-gauge">
                    ${gaugeCircle(d.complejidad_lenguaje?.score || 0)}
                    <div class="gauge-text">${d.complejidad_lenguaje?.justificacion || ''}</div>
                </div>
            </div>
            ${d.advertencia_metodologica ? `<div class="result-card"><div class="result-card-title">⚠ Advertencia metodológica</div><div style="font-size:0.85rem;color:var(--text-secondary)">${d.advertencia_metodologica}</div></div>` : ''}
        `;
    }

    function renderPublicos(mod) {
        const body = document.getElementById('body-publicos');
        if (!mod?.ok) { body.innerHTML = errBlock(mod?.error || 'Sin datos'); return; }
        const d = mod.data;
        body.innerHTML = `
            <div class="result-card">
                <div class="result-card-title">Públicos identificados</div>
                ${tags(d.publicos_generales || [], 'blue')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;flex-wrap:wrap">
                <div class="result-card">
                    <div class="result-card-title">Perfil "Nosotros"</div>
                    <div style="display:flex;flex-direction:column;gap:0.35rem">
                        ${(d.perfil_nosotros?.caracteristicas || []).map(c => `<div style="font-size:0.85rem">• ${c}</div>`).join('')}
                    </div>
                    <div style="margin-top:0.5rem">
                        ${(d.perfil_nosotros?.frases_asociadas || []).map(f => `<div class="phrase-item" style="margin-top:0.3rem">"${f}"</div>`).join('')}
                    </div>
                </div>
                <div class="result-card">
                    <div class="result-card-title">Perfil "Ellos"</div>
                    <div style="display:flex;flex-direction:column;gap:0.35rem">
                        ${(d.perfil_ellos?.caracteristicas || []).map(c => `<div style="font-size:0.85rem">• ${c}</div>`).join('')}
                    </div>
                    <div style="margin-top:0.5rem">
                        ${(d.perfil_ellos?.frases_asociadas || []).map(f => `<div class="phrase-item" style="margin-top:0.3rem;border-color:var(--c-red)">"${f}"</div>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function renderEstilo(mod) {
        const body = document.getElementById('body-estilo');
        if (!mod?.ok) { body.innerHTML = errBlock(mod?.error || 'Sin datos'); return; }
        const d = mod.data;
        body.innerHTML = `
            <div class="result-card">
                <div class="result-card-title">Formalidad</div>
                <div class="score-gauge">
                    ${gaugeCircle(d.formalidad?.score || 0)}
                    <div class="gauge-text">${d.formalidad?.justificacion || ''}</div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-card-title">Tipo de discurso</div>
                ${tags(d.tipo_discurso?.categorias || [], 'purple')}
                <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-secondary)">Dominante: <strong>${d.tipo_discurso?.categoria_dominante || ''}</strong></div>
            </div>
            <div class="result-card">
                <div class="result-card-title">Perfil comunicativo</div>
                <div style="font-size:0.9rem;color:var(--c-blue-dark);line-height:1.5">${d.perfil_comunicativo || ''}</div>
            </div>
        `;
    }

    function renderDigital(mod) {
        const body = document.getElementById('body-digital');
        if (!mod?.ok) { body.innerHTML = errBlock(mod?.error || 'Sin datos'); return; }
        const d = mod.data;
        const hasPotential = d.tiene_potencial;
        body.innerHTML = `
            <div class="result-card">
                <div class="result-card-title">Evaluación de potencial</div>
                <div style="display:flex;align-items:center;gap:0.5rem">
                    <i class="fa-solid ${hasPotential ? 'fa-circle-check' : 'fa-circle-xmark'}" style="color:${hasPotential ? '#22c55e' : '#ef4444'};font-size:1.5rem"></i>
                    <span style="font-size:1rem;font-weight:600;color:var(--c-blue-dark)">${hasPotential ? 'Tiene alto potencial digital' : 'Potencial digital limitado'}</span>
                </div>
            </div>
            ${(d.fragmentos || []).map(f => `
                <div class="digital-item">
                    <div class="digital-format">${f.formato_sugerido}</div>
                    <div class="digital-text">"${f.texto}"</div>
                    <div class="digital-reason">${f.razon}</div>
                </div>
            `).join('')}
        `;
    }

    function renderAutenticidad(mod) {
        const body = document.getElementById('body-autenticidad');
        if (!mod?.ok) { body.innerHTML = errBlock(mod?.error || 'Sin datos'); return; }
        const d = mod.data;
        body.innerHTML = `
            <div class="result-card">
                <div class="result-card-title">Score de autenticidad</div>
                <div class="score-gauge">
                    ${gaugeCircle(d.score_autenticidad || 0)}
                    <div class="gauge-text">${d.justificacion_general || ''}</div>
                </div>
            </div>
            ${(d.momentos_fabricados || []).length ? `
            <div class="result-card">
                <div class="result-card-title">Momentos poco auténticos</div>
                <div class="phrase-list">
                    ${d.momentos_fabricados.map(m => `
                        <div class="phrase-item" style="border-color:var(--c-red)">
                            <div>"${m.fragmento}"</div>
                            <div class="phrase-just">${m.razon}</div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}
            ${d.advertencia_metodologica ? `<div class="result-card"><div class="result-card-title">⚠ Advertencia</div><div style="font-size:0.85rem;color:var(--text-secondary)">${d.advertencia_metodologica}</div></div>` : ''}
        `;
    }

    function renderRiesgos(mod) {
        const body = document.getElementById('body-riesgos');
        if (!mod?.ok) { body.innerHTML = errBlock(mod?.error || 'Sin datos'); return; }
        const d = mod.data;
        const sorted = (d.riesgos || []).sort((a, b) => {
            const order = { alta: 0, media: 1, baja: 2 };
            return (order[a.severidad] ?? 2) - (order[b.severidad] ?? 2);
        });
        body.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:0.6rem">
                ${sorted.map(r => `
                    <div class="risk-item ${r.severidad}">
                        <div class="risk-type">${r.tipo} · ${r.severidad?.toUpperCase()}</div>
                        <div class="risk-frag">"${r.fragmento}"</div>
                        <div class="risk-desc">${r.descripcion}</div>
                    </div>
                `).join('')}
            </div>
            ${(d.vulnerabilidades_factcheck || []).length ? `
            <div class="result-card">
                <div class="result-card-title">Afirmaciones verificables</div>
                <div style="display:flex;flex-direction:column;gap:0.5rem">
                    ${d.vulnerabilidades_factcheck.map(v => `
                        <div class="factcheck-item">
                            <div class="fc-claim">${v.afirmacion}</div>
                            <div class="fc-reason">${v.razon}</div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}
        `;
    }

    function renderEficacia(mod) {
        const body = document.getElementById('body-eficacia');
        if (!mod?.ok) { body.innerHTML = errBlock(mod?.error || 'Sin datos'); return; }
        const d = mod.data;
        body.innerHTML = `
            <div class="result-card">
                <div class="result-card-title">Score de eficacia</div>
                <div class="score-gauge">
                    ${gaugeCircle(d.score_eficacia || 0)}
                    <div class="gauge-text">${d.justificacion_score || ''}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                <div class="result-card">
                    <div class="result-card-title">Fortalezas</div>
                    ${d.fortalezas?.map(f => `<div style="font-size:0.85rem;padding:0.2rem 0;border-left:3px solid #22c55e;padding-left:0.5rem;margin-bottom:0.3rem">✓ ${f}</div>`).join('') || ''}
                </div>
                <div class="result-card">
                    <div class="result-card-title">Debilidades</div>
                    ${d.debilidades?.map(f => `<div style="font-size:0.85rem;padding:0.2rem 0;border-left:3px solid var(--c-red);padding-left:0.5rem;margin-bottom:0.3rem">✗ ${f}</div>`).join('') || ''}
                </div>
            </div>
            <div class="result-card">
                <div class="result-card-title">Funciones cumplidas</div>
                ${tags(d.funciones_cumplidas || [], 'green')}
            </div>
            <div class="result-card">
                <div class="result-card-title">Impacto en la opinión pública</div>
                <div style="font-size:0.9rem;line-height:1.5;color:var(--c-blue-dark)">${d.impacto_opinion_publica || ''}</div>
            </div>
        `;
    }

    /* ---------- Main render entry point ---------- */
    function renderResults(data, meta) {
        renderMetricas(data.metricas);
        renderFrases(data.frases_clave);
        renderMarcos(data.marcos_narrativos);
        renderPublicos(data.publicos);
        renderEstilo(data.estilo);
        renderDigital(data.potencial_digital);
        renderAutenticidad(data.autenticidad);
        renderRiesgos(data.riesgos);
        renderEficacia(data.eficacia);

        showResultsInSidebar();
        showToast('¡Análisis completado! Revisa los resultados en el menú lateral.', 'success', 5000);
    }

});
