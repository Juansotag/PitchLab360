from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import os

# Fix Anaconda Fortran MKL crash on Windows when pressing Ctrl+C
os.environ["FOR_DISABLE_CONSOLE_CTRL_HANDLER"] = "1"

import anthropic
import httpx
# spacy removed - using textstat and pure python for metrics
import textstat
textstat.set_lang('es')
from collections import Counter
import json
import re
from typing import Dict, Any, Optional
import concurrent.futures
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from urllib.parse import urlparse, parse_qs

# Load environment variables
load_dotenv()

# SSL verification: set DISABLE_SSL_VERIFY=true in .env only for corporate proxies
_SSL_VERIFY = os.environ.get('DISABLE_SSL_VERIFY', 'false').lower() != 'true'

app = FastAPI(title="PitchLab360")

# Setup Anthropic Client

# Mount directories for static files and assets
app.mount("/static", StaticFiles(directory="static"), name="static")

# Make sure assets directory is mounted, so we can access images
if os.path.exists("assets"):
    app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content, status_code=200)

# --- MODELS ---
class ExtractRequest(BaseModel):
    url: str
    inicio: str
    fin: str

class CleanRequest(BaseModel):
    texto: str
    api_key: Optional[str] = None

class MetadatosModel(BaseModel):
    candidato: Optional[str] = "No especificado"
    evento: Optional[str] = "No especificado"
    audiencia: Optional[str] = "No especificada"
    medio: Optional[str] = "No especificado"
    fecha: Optional[str] = "No especificada"

class AnalizarRequest(BaseModel):
    texto: str
    metadatos: MetadatosModel
    api_key: Optional[str] = None

# --- FUNCTIONS ---
def mmss_a_segundos(tiempo: str) -> int:
    """Acepta: "3:45", "03:45", "1:03:45"""
    partes = [int(p) for p in tiempo.strip().split(":")]
    if len(partes) == 2:
        return partes[0] * 60 + partes[1]
    elif len(partes) == 3:
        return partes[0] * 3600 + partes[1] * 60 + partes[2]
    else:
        raise ValueError(f"Formato inválido: {tiempo}")

def extraer_id(url: str) -> str:
    parsed = urlparse(url)
    if parsed.hostname in ("youtu.be",):
        return parsed.path[1:]
    return parse_qs(parsed.query).get("v", [None])[0]

def extraer_fragmento(url: str, inicio: int, fin: int) -> str:
    video_id = extraer_id(url)
    if not video_id:
        raise ValueError("URL de YouTube inválida")
        
    api = YouTubeTranscriptApi()
    transcript = api.fetch(
        video_id,
        languages=["es", "es-419", "es-CO", "es-MX", "es-AR"]
    )
    fragmento = [
        entry.text for entry in transcript
        if entry.start >= inicio and entry.start <= fin
    ]
    return " ".join(fragmento)

# --- ENDPOINTS ---
@app.post("/extraer-subtitulos")
def extraer_subtitulos(req: ExtractRequest):
    try:
        inicio_seg = mmss_a_segundos(req.inicio)
        fin_seg = mmss_a_segundos(req.fin)
        if fin_seg <= inicio_seg:
            return {"error": "El tiempo final debe ser mayor al inicial"}
            
        texto = extraer_fragmento(req.url, inicio_seg, fin_seg)
        return {"texto": texto, "fuente": "youtube_transcript"}
        
    except ValueError as e:
        return {"error": str(e)}
    except (TranscriptsDisabled, NoTranscriptFound):
        return {"error": "El video no contiene subtítulos en español utilizables."}
    except Exception as e:
        return {"error": str(e), "texto": None}

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

def chunk_text_for_cleaning(texto: str, word_chunk=1000) -> list:
    words = texto.split()
    return [" ".join(words[i:i+word_chunk]) for i in range(0, len(words), word_chunk)]

@app.post("/limpiar-texto")
def limpiar_texto(req: CleanRequest):
    # Use key from request (UI) or fall back to .env
    key = req.api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return {"error": "API Key de Anthropic no configurada. Ingrésala en el panel de YouTube o en el archivo .env."}
        
    http_client = httpx.Client(verify=_SSL_VERIFY, timeout=60.0)
    client = anthropic.Anthropic(api_key=key, http_client=http_client)
    
    
    def clean_chunk(chunk: str) -> str:
        prompt = PROMPT_LIMPIEZA.format(texto=chunk)
        res = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        return res.content[0].text.strip()
        
    try:
        chunks = chunk_text_for_cleaning(req.texto, word_chunk=800)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(clean_chunk, ch) for ch in chunks]
            cleaned_chunks = [f.result() for f in futures]
            
        texto_limpio = " ".join(cleaned_chunks)
        return {"texto_limpio": texto_limpio}
    except Exception as e:
        return {"error": str(e)}

# --- CAPA 1: Métricas (Pure Python + Textstat) ---
# spaCy dependency removed to avoid installation issues

STOPWORDS_EXTRA = {
    "entonces", "bueno", "bien",
    "señor", "señora", "hoy", "día", "año", "vez", "hacer"
    # Note: "si", "así", "aquí", "allí", "ser" are already in STOPWORDS_BASIC
}

NOSOTROS = {"nosotros", "nuestro", "nuestra", "nuestros", "nuestras"}
ELLOS = {"ellos", "ellas", "su", "sus", "ese", "esa", "esos", "esas"}
NEGACIONES = {"no", "nunca", "jamás", "tampoco", "ningún", "ninguna", "ni"}

def calcular_metricas(texto: str) -> dict:
    # Tokenización simple: minúsculas y quitar puntuación
    texto_limpio = re.sub(r'[^\w\s]', '', texto.lower())
    tokens = texto_limpio.split()
    
    # Filtro de stopwords manual (básico y efectivo)
    STOPWORDS_BASIC = {
        "de", "la", "que", "el", "en", "y", "a", "los", "del", "se", "las", "por", "un", "para", "con", "no", "una", "su", "al", "lo", "como", "más", "pero", "sus", "le", "ya", "o", "este", "sí", "porque", "esta", "entre", "cuando", "muy", "sin", "sobre", "también", "me", "hasta", "hay", "donde", "quien", "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra", "otros", "ese", "eso", "ante", "ellos", "e", "esto", "mí", "antes", "algunos", "qué", "unos", "yo", "otro", "otras", "otra", "él", "tanto", "esa", "estos", "mucho", "quienes", "nada", "si", "así", "aquí", "allí", "está", "están", "fue", "ha", "han", "ser", "son", "era", "esta", "esto"
    }
    
    palabras = [
        w for w in tokens 
        if w not in STOPWORDS_BASIC 
        and w not in STOPWORDS_EXTRA
        and len(w) > 3 # Filtra palabras cortas y nombres propios comunes
        and not w.isdigit()
    ]
    
    total_tokens = len(tokens)
    # textstat para oraciones y legibilidad (con manejo de errores por NLTK)
    try:
        n_oraciones = textstat.sentence_count(texto) or 1
        legibilidad = textstat.flesch_reading_ease(texto)
    except Exception:
        # Fallback si textstat falla por falta de datos NLTK
        n_oraciones = max(1, texto.count('.') + texto.count('?') + texto.count('!'))
        legibilidad = 0
    
    n_nos = sum(1 for t in tokens if t in NOSOTROS)
    n_ell = sum(1 for t in tokens if t in ELLOS)
    n_neg = sum(1 for t in tokens if t in NEGACIONES)

    return {
        "TTR": round(len(set(palabras)) / len(palabras), 3) if palabras else 0,
        "legibilidad_flesch": round(legibilidad, 2),
        "longitud_promedio_oracion": round(total_tokens / n_oraciones, 1) if n_oraciones > 0 else 0,
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

# --- CAPA 2: LLM Prompts & Execution ---
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
tipo es uno de: Denuncia, Propuesta, Llamado a la acción, Contraste (nosotros vs. ellos),
Promesa, Declaración de identidad, Apelación emocional, Eslogan, Dato o cifra clave, Metáfora política.
Identifica entre 3 y 8 frases memorables. Para cada una, elige el tipo más preciso y escribe
una justificacion breve (1-2 frases) sobre por qué esa frase tiene potencial de impacto.
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
    "estilo": """
{base}
Estructura requerida:
{{
  "formalidad": {{
    "score": int (1-10),
    "justificacion": str
  }},
  "tipo_discurso": {{
    "categorias": [
      {{
        "nombre": str,
        "justificacion": str
      }}
    ],
    "categoria_dominante": str
  }},
  "perfil_comunicativo": str
}}
nombre de cada categoria es uno de:
conversacional, combativo, pedagógico, tecnocrático, inspirador, emocional.
Incluye una justificacion breve (1-2 frases) explicando por qué ese tipo aplica al discurso.
""",
    "potencial_digital": """
{base}
Estructura requerida:
{{
  "tiene_potencial": bool,
  "fragmentos": [
    {{
      "texto": str,
      "plataformas": [str],
      "razon": str
    }}
  ]
}}
plataformas es un subconjunto de estas opciones:
"Tweet/X", "Post en Facebook", "Reel de Instagram", "Short de YouTube", "TikTok", "Titular para medios tradicionales", "Historia de Instagram".
Elige las plataformas más adecuadas para cada fragmento según su naturaleza (longitud, tono, formato).
""",
    "stakeholders": """
{base}
Analiza el discurso e identifica los stakeholders sobre los que SE HABLA (actores, entidades, instituciones, grupos mencionados).

Categorías de stakeholders disponibles (elige la más apropiada):
- Funcionarios públicos de nivel bajo
- Funcionarios públicos de nivel medio  
- Funcionarios públicos de nivel alto
- Funcionarios electos del nivel municipal
- Funcionarios electos del nivel regional
- Funcionarios electos del nivel nacional
- Líderes de opinión
- Medios de comunicación
- Ciudadanía en general
- Sector privado
- Organizaciones no gubernamentales
- Organismos internacionales
- Partidos políticos
- Fuerzas de seguridad
- Sistema judicial
- Grupos armados
- Crimen organizado
- Economía informal
- Economía formal

Relaciones negativas (subcategorías): Bloqueador/Conspirador, Atacante, Actor apático, Actor ilegítimo, Actor incompetente, Actor deshonesto.
Relaciones positivas (subcategorías): Aliado potencial, Aliado estratégico, Inspiración, Ejemplo.
Relaciones neutras (subcategorías): Referencia neutral, Actor contextual.

Estructura requerida:
{{
  "stakeholders": [
    {{
      "nombre": str,
      "categoria": str,
      "porcentaje_discurso": float,
      "tipo_relacion": "positiva" | "negativa" | "neutra",
      "subcategoria_relacion": str,
      "evidencia": str
    }}
  ]
}}
Los porcentajes no tienen que sumar 100% (un stakeholder puede aparecer en distintos momentos del discurso).
Solo incluye stakeholders mencionados de forma explícita o clara en el texto.
""",
    "marco_teorico": """
{base}
Tu tarea es seleccionar y justificar los marcos teóricos más pertinentes para analizar
ESTE discurso específico, basándote en sus metadatos y métricas computadas.

Los siguientes dos marcos son OBLIGATORIOS y siempre deben incluirse en el output, independientemente del discurso:
1. Teoría de Encuadres / Framing (Entman, 1993)
2. Análisis de Stakeholders Políticos (Freeman, 1984 / adaptación política)

Selecciona además entre 1 y 2 marcos adicionales de esta lista canónica:
- Retórica Aristotélica (ethos, pathos, logos) — para evaluar estrategias de persuasión clásicas
- Lingüística Cognitiva / Metáfora Conceptual (Lakoff & Johnson, 1980) — cuando predominan metáforas estructurantes

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
"""
}

def ejecutar_modulo(modulo: str, texto: str, metadatos: dict, metricas: dict, api_key: str = None) -> dict:
    key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return {"ok": False, "error": "API Key de Anthropic no configurada. Ingrésala en el panel de YouTube o en el archivo .env."}
        
    http_client = httpx.Client(verify=_SSL_VERIFY, timeout=60.0)
    client = anthropic.Anthropic(api_key=key, http_client=http_client)

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
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        try:
            return {"ok": True, "data": json.loads(raw)}
        except json.JSONDecodeError:
            clean = raw.replace("```json", "").replace("```", "").strip()
            return {"ok": True, "data": json.loads(clean)}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.post("/analizar/metrico")
def analizar_metrico(req: AnalizarRequest):
    return {"metricas": calcular_metricas(req.texto)}

@app.post("/analizar/todo")
def analizar_todo(req: AnalizarRequest):
    metricas = calcular_metricas(req.texto)
    resultados = {"metricas": metricas}
    metadatos_dict = req.metadatos.model_dump()
    
    # Ejecutar consultas a Claude en PARALELO para ahorrar tiempo.
    # max_workers=3 para evitar 429 Rate Limit en cuentas tier 1.
    # Módulos activos: frases_clave, marcos_narrativos, estilo, potencial_digital, stakeholders, marco_teorico.
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        f2m = {
            executor.submit(ejecutar_modulo, modulo, req.texto, metadatos_dict, metricas, req.api_key): modulo
            for modulo in PROMPTS
        }
        for future in concurrent.futures.as_completed(f2m):
            modulo = f2m[future]
            resultados[modulo] = future.result()
            
    return resultados

@app.post("/analizar/{modulo}")
def analizar_modulo(modulo: str, req: AnalizarRequest):
    if modulo not in PROMPTS:
        return {"error": f"Módulo '{modulo}' no existe"}
    metricas = calcular_metricas(req.texto)
    return ejecutar_modulo(modulo, req.texto, req.metadatos.model_dump(), metricas, api_key=req.api_key)

if __name__ == "__main__":
    import uvicorn
    # En Railway se usa la variable de entorno PORT
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)