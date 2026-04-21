# PitchLab360 — Especificación técnica

## Qué es

Mesa de trabajo para analistas de comunicación política. Combina métricas computables reproducibles con lecturas asistidas por LLM sobre discursos políticos. Permite ingresar texto manualmente o extraerlo de YouTube, y exportar el análisis completo.

---

## Stack

- **Backend**: FastAPI + Python
- **NLP**: spaCy (`es_core_news_sm`) + textstat
- **Subtítulos**: youtube-transcript-api
- **LLM**: Anthropic API (`claude-sonnet-4-20250514`)
- **Frontend**: a definir por el desarrollador
- **Despliegue**: Railway
- **Base de datos**: opcional en v1 — estado en memoria por sesión

```bash
pip install fastapi uvicorn spacy textstat youtube-transcript-api anthropic
python -m spacy download es_core_news_sm
```

---

## Arquitectura general

```
Fuente A: texto pegado
Fuente B: URL YouTube + mm:ss inicio + mm:ss fin → extracción → limpieza LLM
                        ↓
              [campo de texto editable]
                        ↓
         métricas computables (capa 1)
                        ↓
         lecturas LLM por módulo (capa 2)
                        ↓
                  exportación
```

---

## Estructura de sesión (estado en memoria)

```python
sesion = {
    "texto": str,
    "metadatos": {
        "candidato": str,
        "evento": str,
        "audiencia": str,
        "medio": str,
        "fecha": str
    },
    "metricas": dict,       # outputs capa 1
    "cualitativo": dict     # outputs LLM por módulo
}
```

---

## Módulo de ingesta de texto

### Conversión de tiempo mm:ss a segundos

```python
def mmss_a_segundos(tiempo: str) -> int:
    """
    Acepta: "3:45", "03:45", "1:03:45"
    """
    partes = [int(p) for p in tiempo.strip().split(":")]
    if len(partes) == 2:
        return partes[0] * 60 + partes[1]
    elif len(partes) == 3:
        return partes[0] * 3600 + partes[1] * 60 + partes[2]
    else:
        raise ValueError(f"Formato inválido: {tiempo}")
```

### Extracción de subtítulos

```python
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs

def extraer_id(url: str) -> str:
    parsed = urlparse(url)
    if parsed.hostname in ("youtu.be",):
        return parsed.path[1:]
    return parse_qs(parsed.query).get("v", [None])[0]

def extraer_fragmento(url: str, inicio: int, fin: int) -> str:
    video_id = extraer_id(url)
    transcript = YouTubeTranscriptApi.get_transcript(
        video_id,
        languages=["es", "es-419", "es-CO", "es-MX", "es-AR"]
    )
    fragmento = [
        entry["text"] for entry in transcript
        if entry["start"] >= inicio and entry["start"] <= fin
    ]
    return " ".join(fragmento)
```

### Casos de error a manejar

| Caso | Respuesta al frontend |
|---|---|
| Video sin subtítulos en español | Intentar con lista de variantes antes de fallar |
| Video sin subtítulos de ningún tipo | Mensaje claro + ofrecer campo manual |
| Subtítulos auto-generados | Sin puntuación — ofrecer botón "Limpiar texto" |
| Tiempo fin <= tiempo inicio | Error de validación |
| URL inválida | Error de validación |

### Endpoint de extracción

```python
@app.post("/extraer-subtitulos")
def extraer_subtitulos(url: str, inicio: str, fin: str):
    try:
        inicio_seg = mmss_a_segundos(inicio)
        fin_seg = mmss_a_segundos(fin)
        if fin_seg <= inicio_seg:
            return {"error": "El tiempo final debe ser mayor al inicial"}
        texto = extraer_fragmento(url, inicio_seg, fin_seg)
        return {"texto": texto, "fuente": "youtube_transcript"}
    except ValueError as e:
        return {"error": f"Formato de tiempo inválido: {e}"}
    except Exception as e:
        return {"error": str(e), "texto": None}
```

### Limpieza de texto con LLM

El botón "Limpiar texto" llama a este prompt. Es opcional y explícito — el usuario decide si lo necesita.

```python
PROMPT_LIMPIEZA = """
El siguiente texto son subtítulos extraídos automáticamente de YouTube.
Corrígelo ÚNICAMENTE en:
- Puntuación
- Mayúsculas
- Eliminar repeticiones de frases consecutivas

NO cambies palabras, NO parafrasees, NO agregues ni quites contenido.
Devuelve SOLO el texto corregido, sin comentarios.

Texto: {texto}
"""
```

---

## Capa 1 — Métricas computables

Estas métricas son reproducibles y no dependen del LLM. Se calculan siempre antes de correr los módulos cualitativos y se pasan como contexto al LLM.

```python
import spacy
import textstat
from collections import Counter

nlp = spacy.load("es_core_news_sm")

STOPWORDS_EXTRA = {
    "si", "así", "aquí", "allí", "entonces", "bueno", "bien",
    "señor", "señora", "hoy", "día", "año", "vez", "ser", "hacer"
}

NOSOTROS = {"nosotros", "nuestro", "nuestra", "nuestros", "nuestras"}
ELLOS = {"ellos", "ellas", "su", "sus", "ese", "esa", "esos", "esas"}
NEGACIONES = {"no", "nunca", "jamás", "tampoco", "ningún", "ninguna", "ni"}

def calcular_metricas(texto: str) -> dict:
    doc = nlp(texto)
    tokens = [t for t in doc if not t.is_stop and not t.is_punct]
    palabras = [
        t.text.lower() for t in tokens
        if t.pos_ not in ["PROPN", "NUM"]
        and t.text.lower() not in STOPWORDS_EXTRA
    ]
    oraciones = list(doc.sents)
    total_tokens = len([t for t in doc if not t.is_punct])
    tokens_lower = [t.text.lower() for t in doc]

    n_nos = sum(1 for t in tokens_lower if t in NOSOTROS)
    n_ell = sum(1 for t in tokens_lower if t in ELLOS)
    n_neg = sum(1 for t in tokens_lower if t in NEGACIONES)

    return {
        "TTR": round(len(set(palabras)) / len(palabras), 3) if palabras else 0,
        "legibilidad_flesch": textstat.flesch_reading_ease(texto),
        "longitud_promedio_oracion": round(total_tokens / len(oraciones), 1) if oraciones else 0,
        "palabras_frecuentes": Counter(palabras).most_common(20),
        "nosotros_ellos": {
            "nosotros": n_nos,
            "ellos": n_ell,
            "ratio": round(n_nos / n_ell, 2) if n_ell > 0 else None
        },
        "negaciones": {
            "count": n_neg,
            "densidad_pct": round(n_neg / total_tokens * 100, 2) if total_tokens > 0 else 0
        }
    }
```

### Interpretaciones de referencia para mostrar en UI

| Métrica | Umbral | Interpretación |
|---|---|---|
| TTR > 0.7 | alto | Vocabulario variado, discurso elaborado |
| TTR < 0.4 | bajo | Vocabulario repetitivo — puede ser intencional |
| Flesch > 60 | alto | Lenguaje accesible |
| Flesch < 30 | bajo | Lenguaje técnico o denso |
| Oraciones > 25 palabras | largo | Estilo formal o burocrático |
| Oraciones < 12 palabras | corto | Estilo combativo o directo |
| Ratio nosotros/ellos > 2 | alto | Discurso de comunidad |
| Ratio nosotros/ellos < 0.5 | bajo | Discurso confrontacional |
| Densidad negaciones > 5% | alta | Tono predominantemente crítico |

### Endpoint

```python
@app.post("/analizar/metrico")
def analizar_metrico(texto: str):
    return calcular_metricas(texto)
```

---

## Capa 2 — Módulos cualitativos LLM

### Base compartida

Todos los prompts reciben este contexto base. Las métricas computadas se pasan para que el LLM no las contradiga.

```python
BASE_CONTEXTO = """
Eres un analista experto en comunicación política latinoamericana.
Estás analizando el siguiente discurso.

METADATOS:
- Candidato/Exponente: {candidato}
- Evento: {evento}
- Audiencia: {audiencia}
- Medio/Plataforma: {medio}
- Fecha: {fecha}

MÉTRICAS COMPUTADAS (ya calculadas, úsalas como contexto):
{metricas}

TEXTO DEL DISCURSO:
{texto}

Devuelve ÚNICAMENTE JSON válido con la estructura indicada.
Sin texto adicional, sin markdown, sin explicaciones fuera del JSON.
"""
```

### Prompts por módulo

```python
PROMPTS = {

"frases_clave": """
{base}
Estructura requerida:
{{
  "tono": {{
    "score": float (-1 a 1),
    "descripcion": str
  }},
  "frases_memorables": [
    {{
      "frase": str,
      "tipo": str,
      "justificacion": str
    }}
  ]
}}
tipo es uno de: eslogan, titular, clip_redes, eje_narrativo.
""",

"marcos_narrativos": """
{base}
Estructura requerida:
{{
  "emociones": [
    {{
      "nombre": str,
      "porcentaje": float,
      "frases_ejemplo": [str, str],
      "interpretacion": str
    }}
  ],
  "complejidad_lenguaje": {{
    "score": int (1-10),
    "justificacion": str
  }},
  "advertencia_metodologica": str
}}
Las emociones deben sumar 100%.
nombres posibles: esperanza, miedo, indignación, orgullo, orden, cambio,
seguridad, estabilidad, antiélite, cercanía, futuro.
""",

"publicos": """
{base}
Estructura requerida:
{{
  "publicos_generales": [str],
  "perfil_nosotros": {{
    "caracteristicas": [str],
    "frases_asociadas": [str]
  }},
  "perfil_ellos": {{
    "caracteristicas": [str],
    "frases_asociadas": [str]
  }},
  "momentos_por_publico": [
    {{
      "publico": str,
      "fragmento": str
    }}
  ]
}}
""",

"estilo": """
{base}
Estructura requerida:
{{
  "formalidad": {{
    "score": int (1-10),
    "justificacion": str
  }},
  "tipo_discurso": {{
    "categorias": [str],
    "categoria_dominante": str
  }},
  "perfil_comunicativo": str
}}
categorias es subset de:
conversacional, combativo, pedagógico, tecnocrático, inspirador, emocional.
""",

"potencial_digital": """
{base}
Estructura requerida:
{{
  "tiene_potencial": bool,
  "fragmentos": [
    {{
      "texto": str,
      "formato_sugerido": str,
      "razon": str
    }}
  ]
}}
formato_sugerido es uno de: short, reel, clip, titular, eslogan.
""",

"autenticidad": """
{base}
Estructura requerida:
{{
  "score_autenticidad": int (1-10),
  "momentos_fabricados": [
    {{
      "fragmento": str,
      "razon": str
    }}
  ],
  "justificacion_general": str,
  "advertencia_metodologica": str
}}
""",

"riesgos": """
{base}
Estructura requerida:
{{
  "riesgos": [
    {{
      "tipo": str,
      "fragmento": str,
      "descripcion": str,
      "severidad": "alta" | "media" | "baja"
    }}
  ],
  "vulnerabilidades_factcheck": [
    {{
      "afirmacion": str,
      "razon": str
    }}
  ]
}}
""",

"eficacia": """
{base}
Estructura requerida:
{{
  "funciones_cumplidas": [str],
  "fortalezas": [str],
  "debilidades": [str],
  "impacto_opinion_publica": str,
  "score_eficacia": int (1-10),
  "justificacion_score": str
}}
funciones_cumplidas es subset de:
moviliza, persuade, emociona, ordena conversación,
instala agenda, fortalece liderazgo, informa.
"""

}
```

### Executor modular

```python
import anthropic
import json

client = anthropic.Anthropic()

def ejecutar_modulo(modulo: str, texto: str, metadatos: dict, metricas: dict) -> dict:
    base = BASE_CONTEXTO.format(
        candidato=metadatos.get("candidato", "No especificado"),
        evento=metadatos.get("evento", "No especificado"),
        audiencia=metadatos.get("audiencia", "No especificada"),
        medio=metadatos.get("medio", "No especificado"),
        fecha=metadatos.get("fecha", "No especificada"),
        metricas=json.dumps(metricas, ensure_ascii=False, indent=2),
        texto=texto
    )

    prompt = PROMPTS[modulo].format(base=base)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()

    try:
        return {"ok": True, "data": json.loads(raw)}
    except json.JSONDecodeError:
        clean = raw.replace("```json", "").replace("```", "").strip()
        try:
            return {"ok": True, "data": json.loads(clean)}
        except Exception as e:
            return {"ok": False, "raw": raw, "error": str(e)}
```

### Endpoints

```python
@app.post("/analizar/{modulo}")
def analizar_modulo(modulo: str, texto: str, metadatos: dict, metricas: dict):
    if modulo not in PROMPTS:
        return {"error": f"Módulo '{modulo}' no existe"}
    return ejecutar_modulo(modulo, texto, metadatos, metricas)

@app.post("/analizar/todo")
def analizar_todo(texto: str, metadatos: dict):
    metricas = calcular_metricas(texto)
    resultados = {"metricas": metricas}
    for modulo in PROMPTS:
        resultados[modulo] = ejecutar_modulo(modulo, texto, metadatos, metricas)
    return resultados
```

---

## UI — Estructura y comportamiento

### Layout general

Dos paneles horizontales dentro de una sola página:

```
┌─────────────────────────┬──────────────────────────────────────────┐
│   Sidebar (redimensio-  │           Panel central                  │
│   nable con drag)       │                                          │
│                         │  [Panel YouTube — ocultable]             │
│   Módulo 0              │  URL + preview + mm:ss inicio/fin        │
│   Módulo 1              │  [Extraer subtítulos] [Limpiar texto]    │
│   Módulo 2              │                                          │
│   ...                   │  [Campo de texto editable]               │
│   Módulo 8              │                                          │
│                         │  [Metadatos: candidato, evento,          │
│   [Exportar análisis]   │   audiencia, medio, fecha]               │
│                         │                                          │
│                         │  [HACER ANÁLISIS]                        │
└─────────────────────────┴──────────────────────────────────────────┘
```

### Sidebar

- Ancho inicial: 280px. Mínimo: 200px. Máximo: 480px.
- Redimensionable con drag en el borde derecho del sidebar.
- Cada módulo es un acordeón colapsable.
- Cada módulo muestra su estado: pendiente / procesando / completado.
- Cuando está completado aparecen dos botones: "Re-correr" y "Ver →".
- "Ver →" abre la vista expandida en página nueva (ruta `/modulo/{nombre}`).
- Botón "Exportar análisis" fijo en el footer del sidebar.

### Implementación del drag

```javascript
const sidebar = document.getElementById('sidebar');
const handle = document.getElementById('drag-handle');
let dragging = false;

handle.addEventListener('mousedown', () => dragging = true);
document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const newWidth = Math.min(480, Math.max(200, e.clientX));
    sidebar.style.width = newWidth + 'px';
});
document.addEventListener('mouseup', () => dragging = false);
```

El handle es una franja de 4px en el borde derecho del sidebar con cursor `col-resize`.

### Panel central

Elementos en orden vertical:

1. **Panel YouTube** (ocultable con botón en header)
   - Input URL
   - Preview embed de YouTube
   - Inputs mm:ss inicio y fin
   - Botón "Extraer subtítulos"
   - Botón "Limpiar texto" (llama al LLM de limpieza)

2. **Campo de texto editable**
   - Se llena desde extracción o desde paste manual
   - Siempre editable antes de analizar
   - Contador de palabras en tiempo real

3. **Metadatos**
   - Candidato / exponente
   - Evento
   - Audiencia
   - Medio / plataforma
   - Fecha

4. **Botón HACER ANÁLISIS**
   - Corre métricas computables + todos los módulos LLM
   - Actualiza estados del sidebar en tiempo real a medida que cada módulo termina

---

## Vista expandida por módulo

Ruta: `/modulo/{nombre}`

### Estructura

```
[← Volver]    Módulo: Marcos narrativos
─────────────────────────────────────────────────────

MÉTRICAS COMPUTABLES                    (siempre visibles como contexto)
TTR: 0.61  |  Flesch: 48  |  Oraciones: 18.3 palabras  |  Negaciones: 3.2%

─────────────────────────────────────────────────────

MÓDULO DESTACADO: Marcos narrativos     (expandido, prominente)
[contenido completo del módulo]

─────────────────────────────────────────────────────

RESTO DE MÓDULOS                        (colapsados, expandibles)
▶ Frases clave
▶ Públicos
▶ Estilo
▶ ...
```

### Comportamiento

- El módulo destacado aparece expandido y con borde de color.
- El resto de módulos aparecen colapsados pero accesibles.
- Las métricas computables siempre visibles en la parte superior como contexto.
- El botón "← Volver" regresa al panel principal sin perder el estado.

---

## Distinción visual capa 1 vs capa 2

En toda la UI — tanto en el sidebar como en la vista expandida — las dos capas se distinguen visualmente:

| Elemento | Capa 1 — Métricas | Capa 2 — Lecturas |
|---|---|---|
| Ícono | calculadora | lupa |
| Color de borde | neutro (gris) | color del módulo |
| Label | "Medido" | "Interpretado" |
| Tooltip | "Calculado directamente del texto" | "Lectura asistida por IA — resultado interpretativo" |

---

## Exportación

### Endpoint

```python
@app.get("/exportar/{formato}")
def exportar(formato: str, sesion: dict):
    if formato == "markdown":
        return exportar_markdown(sesion)
    elif formato == "json":
        return sesion
    else:
        return {"error": "Formato no soportado. Usa 'markdown' o 'json'"}
```

### Estructura del markdown exportado

```markdown
# PitchLab360 — Análisis de discurso

## Metadatos
- Candidato: ...
- Evento: ...
- Audiencia: ...
- Medio: ...
- Fecha: ...

## Texto analizado
[texto completo]

---

## Métricas computables
[tabla con TTR, Flesch, longitud de oración, nosotros/ellos, negaciones]

---

## Módulo 1 — Frases clave
[contenido]

## Módulo 2 — Marcos narrativos
> Nota metodológica: [advertencia_metodologica del JSON]
[contenido]

...y así para cada módulo
```

### Librerías para exportación

```bash
pip install markdown2 reportlab  # si se quiere PDF además de markdown
```

---

## Orden de construcción sugerido

| Día | Qué construir |
|---|---|
| 1 | Pipeline de texto: extracción YouTube + paste + limpieza LLM |
| 2 | Endpoint de métricas computables (capa 1) |
| 3 | Sistema de prompts + endpoint `/analizar/todo` (capa 2) |
| 4 | UI: panel central + sidebar con estados |
| 5 | Vista expandida por módulo + drag del sidebar |
| 6 | Exportación markdown/JSON |

---

## Decisiones metodológicas explícitas

Estas decisiones deben estar documentadas en la UI (tooltip o sección "Acerca del análisis"):

1. **Las métricas computables son reproducibles**. Dado el mismo texto, producen siempre el mismo resultado.

2. **Las lecturas LLM son interpretativas**. Dos corridas del mismo módulo pueden producir resultados distintos. Se presentan como hipótesis de análisis, no como mediciones.

3. **Los scores numéricos de los módulos LLM** (formalidad, autenticidad, eficacia) no tienen corpus de referencia. Su valor es relativo al discurso analizado, no absoluto.

4. **El módulo de autenticidad y marcos narrativos** incluyen una advertencia metodológica explícita en el JSON que debe mostrarse siempre en la UI.

5. **El perfil del candidato** en el módulo 0 se construye desde los metadatos ingresados por el usuario, no desde el LLM, para evitar sesgos de entrenamiento.