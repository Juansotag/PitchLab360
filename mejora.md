# PitchLab360 — Instrucciones para el Agente: Módulo de Marco Teórico-Metodológico

## Objetivo

Añadir una nueva sección **"0. Marco Teórico-Metodológico"** al sidebar de resultados que se genera dinámicamente a partir de los metadatos y métricas ya calculadas del discurso. El módulo selecciona y justifica los marcos teóricos académicos pertinentes para cada análisis específico.

**Principio de intervención mínima:** no modificar ninguna lógica existente. Solo añadir.

---

## Archivo 1: `main.py`

### Cambio 1A — Añadir el prompt al diccionario `PROMPTS`

**Ubicación:** dentro del diccionario `PROMPTS = { ... }`, después de la entrada `"eficacia"` y antes del cierre `}`.

**Añadir esta entrada:**

```python
    "marco_teorico": """
{base}
Tu tarea es seleccionar y justificar los marcos teóricos más pertinentes para analizar
ESTE discurso específico, basándote en sus metadatos y métricas computadas.

Selecciona entre 3 y 5 marcos de esta lista canónica:
- Análisis Crítico del Discurso (Fairclough, 1995) — para discursos con alta densidad de poder institucional
- Teoría de Encuadres / Framing (Entman, 1993) — cuando hay construcción deliberada de problemas y soluciones
- Lógica Populista / Dicotomía Nosotros-Ellos (Laclau & Mouffe, 1985) — cuando el ratio nosotros/ellos < 0.5
- Retórica Aristotélica (ethos, pathos, logos) — para evaluar estrategias de persuasión clásicas
- Teoría de la Agenda-Setting (McCombs & Shaw, 1972) — cuando el discurso instala temas en el debate público
- Análisis de Stakeholders Políticos (Freeman, 1984 / adaptación política) — cuando hay múltiples actores explícitos
- Lingüística Cognitiva / Metáfora Conceptual (Lakoff & Johnson, 1980) — cuando predominan metáforas estructurantes
- Teoría del Discurso Político (Van Dijk, 2008) — para análisis de ideología y representación de grupos sociales
- Comunicación Política Electoral (Norris, 2000) — para discursos en contexto de campaña

Para cada marco seleccionado, justifica por qué aplica a ESTE discurso citando métricas concretas
(TTR, ratio nosotros/ellos, densidad negativa, legibilidad Flesch) o rasgos del contexto (audiencia, evento, fecha).

Estructura requerida:
{{
  "marcos": [
    {{
      "nombre": str,
      "autor_anio": str,
      "justificacion": str,
      "indicadores_que_lo_activan": [str]
    }}
  ],
  "nota_metodologica": str,
  "limitaciones": [str]
}}

En "justificacion": 2-3 frases que conecten el marco con los datos reales del discurso.
En "indicadores_que_lo_activan": lista de 2-4 métricas o rasgos contextuales concretos.
En "nota_metodologica": párrafo breve sobre cómo leer los resultados bajo estos marcos.
En "limitaciones": 2-3 limitaciones honestas del análisis computacional para este discurso específico.
""",
```

### Cambio 1B — Registrar el módulo en el endpoint `/analizar/todo`

El endpoint `/analizar/todo` ya itera sobre todos los keys de `PROMPTS` usando `for modulo in PROMPTS`. Al añadir `"marco_teorico"` al diccionario en el Cambio 1A, este endpoint lo ejecutará automáticamente en paralelo **sin ningún cambio adicional**.

> ✅ No se requiere ninguna modificación en `/analizar/todo` ni en `ejecutar_modulo()`.

---

## Archivo 2: `static/app.js`

### Cambio 2A — Añadir función `renderMarcoTeorico()`

**Ubicación:** justo antes del comentario `/* ---------- Main render entry point ---------- */` (línea ~738).

**Añadir esta función:**

```javascript
// ── SECCIÓN 0: Marco Teórico-Metodológico ───────────────────
function renderMarcoTeorico(marcoTeorico) {
    const body = document.getElementById('body-marco-teorico');
    if (!marcoTeorico?.ok) {
        body.innerHTML = errBlock(marcoTeorico?.error || 'Marco teórico no disponible');
        return;
    }
    const d = marcoTeorico.data;
    const marcos = d.marcos || [];

    const marcosHTML = marcos.map(m => `
        <div class="result-card" style="margin-bottom:0.75rem">
            <div class="result-card-title" style="display:flex;align-items:center;gap:0.5rem">
                <i class="fa-solid fa-book-open" style="color:var(--c-blue-light);font-size:0.85rem"></i>
                ${m.nombre}
                <span style="font-size:0.75rem;font-weight:400;color:var(--text-muted);margin-left:auto">${m.autor_anio}</span>
            </div>
            <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;margin:0.5rem 0">
                ${m.justificacion}
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.5rem">
                ${(m.indicadores_que_lo_activan || []).map(ind =>
                    `<span style="font-size:0.72rem;background:#e8edf7;color:var(--c-blue-dark);padding:0.2rem 0.6rem;border-radius:999px;font-weight:500">${ind}</span>`
                ).join('')}
            </div>
        </div>
    `).join('');

    const limitacionesHTML = (d.limitaciones || []).map(l =>
        `<li style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.3rem">${l}</li>`
    ).join('');

    body.innerHTML = `
        ${marcosHTML}
        ${d.nota_metodologica ? `
        <div class="result-card" style="background:#f8fafc;border-left:3px solid var(--c-blue-light)">
            <div class="result-card-title">Nota Metodológica</div>
            <p style="font-size:0.83rem;color:var(--text-secondary);line-height:1.6;margin:0">${d.nota_metodologica}</p>
        </div>` : ''}
        ${limitacionesHTML ? `
        <div class="result-card">
            <div class="result-card-title">Limitaciones del Análisis</div>
            <ul style="margin:0.25rem 0 0 1rem;padding:0">${limitacionesHTML}</ul>
        </div>` : ''}
    `;
}
```

### Cambio 2B — Llamar a `renderMarcoTeorico()` desde `renderResults()`

**Ubicación:** función `renderResults()` (~línea 739). Añadir una línea al inicio del bloque.

**Antes:**
```javascript
function renderResults(data, meta) {
    renderIntro(meta);
    renderPerfilComunicativo(data.estilo);
```

**Después:**
```javascript
function renderResults(data, meta) {
    renderIntro(meta);
    renderMarcoTeorico(data.marco_teorico);
    renderPerfilComunicativo(data.estilo);
```

---

## Archivo 3: `static/index.html`

### Cambio 3A — Añadir tarjeta de navegación en `sidebar-modules-view`

**Ubicación:** dentro de `<div class="modules-container">`, después de la tarjeta `0. Introducción` y antes de la tarjeta `1. Perfil Comunicativo`.

**Añadir:**
```html
<div class="module-card metrics-card" data-target="res-marco-teorico">
    <div class="module-header">
        <div class="module-title-wrapper">
            <i class="fa-solid fa-book-open metric-icon"></i>
            <span>0b. Marco Teórico-Metodológico</span>
        </div>
        <span class="status-badge pending">Pendiente</span>
    </div>
</div>
```

### Cambio 3B — Añadir sección de resultados en `sidebar-results-view`

**Ubicación:** dentro de `<div id="sidebar-results-view">`, después de `<section ... id="res-intro">` y antes de `<section ... id="res-perfil-comunicativo">`.

**Añadir:**
```html
<!-- SECCIÓN 0b: Marco Teórico-Metodológico -->
<section class="res-section-sb" id="res-marco-teorico">
    <div class="res-section-hdr metrics-header">
        <i class="fa-solid fa-book-open"></i>
        <span>0b. Marco Teórico-Metodológico</span>
        <i class="fa-solid fa-chevron-down res-toggle"></i>
    </div>
    <div class="res-section-body-sb" id="body-marco-teorico"></div>
</section>
```

---

## Resumen de cambios

| Archivo | Tipo de cambio | Líneas aprox. |
|---|---|---|
| `main.py` | Añadir entrada al diccionario `PROMPTS` | +45 líneas |
| `static/app.js` | Añadir función + 1 línea en `renderResults` | +48 líneas |
| `static/index.html` | Añadir 2 bloques HTML en el sidebar | +16 líneas |

**Archivos que NO se tocan:** `style.css`, `requirements.txt`, `Procfile`, todos los JSONs de config.

---

## Comportamiento esperado

1. El usuario pega un discurso y presiona **Iniciar Análisis Completo**.
2. El endpoint `/analizar/todo` ejecuta `marco_teorico` en paralelo junto con los demás módulos — sin costo de tiempo adicional.
3. Al renderizar resultados, aparece la sección **"0b. Marco Teórico-Metodológico"** con:
   - 3 a 5 marcos teóricos seleccionados dinámicamente según los datos reales del discurso.
   - Justificación de cada marco con métricas concretas (e.g., "El ratio nosotros/ellos de 0.13 activa la lógica populista de Laclau").
   - Nota metodológica sobre cómo leer el análisis.
   - Limitaciones honestas del análisis computacional.
4. La sección se exporta automáticamente al PDF sin ningún cambio adicional.

---

## Validación

Después de los cambios, verificar:

- [ ] `GET /` carga sin errores.
- [ ] `POST /analizar/todo` devuelve un key `marco_teorico` con `ok: true` en el JSON.
- [ ] La sección aparece en el sidebar antes de "Perfil Comunicativo".
- [ ] El botón "Datos de Prueba" no rompe nada (el demo_data.json no tiene `marco_teorico`, la función debe manejar `undefined` con el bloque `errBlock`).
- [ ] El PDF exportado incluye la sección.