# Picht360 - Plan de implementación: prueba de concepto en Jupyther Notebook

## Objetivo

Implementar un pipeline exploratorio que, dado el texto de un discurso político colombiano,
extraiga automáticamente estructuras discursivas: significantes vacíos, cadenas de
equivalencia y frames conceptuales. El pipeline se basa en embeddings contextuales de BETO
y un LLM como intérprete final.

---

## Marco teórico aplicado

### Ernesto Laclau — *On Populist Reason* (2005)

Laclau describe cómo los discursos populistas construyen identidades políticas a través de
dos mecanismos complementarios:

**Significante vacío**: palabra o expresión tan amplia semánticamente que distintos grupos
sociales pueden proyectar en ella sus propios deseos. No tiene contenido fijo — su poder
está en la amplitud. Ejemplos: "El Pueblo", "La Patria", "El Cambio". En el espacio
vectorial, un significante vacío se manifiesta como una palabra con alta dispersión
contextual (sus representaciones en distintas oraciones están muy separadas entre sí) y
alta centralidad dentro de su campo semántico (está cerca de muchas otras palabras).

**Cadena de equivalencia**: conjunto de términos que el discurso trata como intercambiables,
creando un sistema donde un concepto arrastra a todos los demás. Ejemplo: `El Pueblo =
Los Trabajadores = Los Oprimidos`. En el espacio vectorial, los
miembros de una cadena tienen perfiles de vecindario similares — están rodeados de las
mismas palabras.

### George Lakoff — *Metaphors We Live By* (1980) y *Don't Think of an Elephant* (2004)

Lakoff describe el **framing** como el acto de comunicar de tal manera que el lenguaje
activa asociaciones no dichas explícitamente. Estas asociaciones forman marcos conceptuales
estructurales que determinan cómo se interpreta la realidad.

Un frame no es una palabra sino un sistema completo. Cuando un candidato dice "seguridad",
puede estar activando el frame SEGURIDAD-COMO-CUIDADO (vecinos: comunidad, barrio, familia)
o el frame SEGURIDAD-COMO-CONTROL (vecinos: orden, autoridad, fuerza). El mismo término,
dos sistemas de significado completamente distintos.

En el espacio vectorial, un frame se detecta como un cluster semántico donde una o más
palabras tienen una relación no obvia con las demás — la anomalía señala que el candidato
está forzando una asociación que no es lingüísticamente natural sino ideológicamente
construida.

---

## Arquitectura del pipeline

```
Texto del discurso
        ↓
Paso 1 — Preprocesamiento
        ↓
Paso 2 — Extracción de embeddings contextuales (BETO)
        ↓
Paso 3 — Cálculo de vector promedio y dispersión por palabra
        ↓
Paso 4 — Clusterización del vocabulario
        ↓
  Por cada cluster:
  ├── Paso 5 — Identificación de significante vacío
  ├── Paso 6 — Identificación de cadenas de equivalencia
  └── Paso 7 — Detección de frames (LLM)
        ↓
Paso 8 — Visualización con t-SNE / UMAP
        ↓
Paso 9 — Síntesis del perfil discursivo (LLM)
```

---

## Implementación paso a paso

Cada paso va en un code block específico separado de subtítulo y una explicación de lo que se está haciendo. 

### Paso 1 — Preprocesamiento

**Objetivo**: limpiar el texto y preparar el corpus de trabajo.

**Operaciones**:
- Cargar el texto del discurso (puede ser un `.txt` con la transcripción corregida)
- Segmentar en oraciones usando `spaCy` con el modelo `es_core_news_lg`
- Tokenizar y eliminar stopwords (artículos, pronombres, preposiciones)
- Construir el vocabulario de trabajo: lista de palabras únicas con su frecuencia
- Imprimir la lista de frecuencia de las palabras

**Librerías**: `spacy`, `pandas`

```python
import spacy
import pandas as pd

nlp = spacy.load("es_core_news_lg")

def preprocesar(texto):
    doc = nlp(texto)
    oraciones = [sent.text.strip() for sent in doc.sents]
    return oraciones

def es_relevante(token):
    return (
        not token.is_stop and
        not token.is_punct and
        not token.is_space and
        token.pos_ in ["NOUN", "VERB", "ADJ", "PROPN"]
    )
```

**Output esperado**: lista de oraciones limpias + vocabulario con frecuencias.

---

### Paso 2 — Extracción de embeddings contextuales con BETO

**Objetivo**: obtener una representación vectorial de 768 dimensiones para cada ocurrencia
de cada palabra en su contexto específico.

**Modelo**: `dccuchile/bert-base-spanish-wwm-cased` (BETO, publicado por la Universidad
de Chile). Se descarga automáticamente desde Hugging Face la primera vez.

**Decisión técnica**: se extrae el vector de la última capa oculta (`last_hidden_state`)
para cada token. Para palabras tokenizadas en múltiples subwords (ej. "trabajadores" →
["trabajo", "##dores"]), se promedia el vector de todos los subwords.

```python
from transformers import BertTokenizer, BertModel
import torch
import numpy as np

tokenizer = BertTokenizer.from_pretrained("dccuchile/bert-base-spanish-wwm-cased")
model = BertModel.from_pretrained("dccuchile/bert-base-spanish-wwm-cased")
model.eval()

def extraer_embeddings_oracion(oracion):
    inputs = tokenizer(oracion, return_tensors="pt",
                       truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
    # last_hidden_state: [1, num_tokens, 768]
    return inputs, outputs.last_hidden_state.squeeze(0)
```

**Output esperado**: diccionario `{palabra: [vector_ocurrencia_1, vector_ocurrencia_2, ...]}`
donde cada vector tiene 768 dimensiones.

**Nota de rendimiento**: en Google Colab con GPU T4, procesar un discurso de 5.000 palabras
tarda aproximadamente 2-3 minutos. Se recomienda activar GPU en Runtime > Change runtime type.

---

### Paso 3 — Vector promedio y dispersión contextual por palabra

**Objetivo**: para cada palabra del vocabulario, calcular su representación promedio y
su nivel de dispersión contextual.

**El vector promedio** representa el "significado típico" de la palabra en el discurso
del candidato — el centro de gravedad de todas sus ocurrencias.

**La dispersión contextual** mide qué tan variables son los contextos en los que aparece
la palabra. Se calcula como el radio promedio: distancia coseno media de cada ocurrencia
al centroide. Una dispersión alta indica que la palabra se usa en contextos muy distintos.

```python
from sklearn.metrics.pairwise import cosine_distances

def calcular_stats_palabra(vectores_ocurrencias):
    vectores = np.array(vectores_ocurrencias)  # [n_ocurrencias, 768]

    # Vector promedio
    centroide = np.mean(vectores, axis=0)

    # Dispersión: radio promedio al centroide
    if len(vectores) > 1:
        distancias = cosine_distances(vectores, centroide.reshape(1, -1))
        dispersion = float(np.mean(distancias))
    else:
        dispersion = 0.0

    return centroide, dispersion
```

**Output esperado**: dataframe con columnas `[palabra, frecuencia, vector_promedio, dispersion]`.

---

### Paso 4 — Clusterización del vocabulario

**Objetivo**: agrupar el vocabulario en campos semánticos para que los análisis
posteriores se realicen dentro de cada campo, no sobre el vocabulario completo.

**Algoritmo recomendado**: HDBSCAN. A diferencia de K-means, no requiere definir el número
de clusters de antemano y maneja bien clusters de densidad variable. Palabras que no
pertenecen a ningún cluster quedan etiquetadas como ruido.

**Alternativa más simple**: K-means con K determinado por el método del codo. Más fácil
de depurar en una primera prueba.

```python
import hdbscan
from sklearn.preprocessing import normalize

# Normalizar vectores antes de clusterizar
vectores_promedio = np.array([stats[palabra]["centroide"]
                               for palabra in vocabulario])
vectores_norm = normalize(vectores_promedio)

# Clusterización
clusterer = hdbscan.HDBSCAN(min_cluster_size=5,
                              metric="euclidean")
etiquetas = clusterer.fit_predict(vectores_norm)

# Organizar palabras por cluster
clusters = {}
for palabra, etiqueta in zip(vocabulario, etiquetas):
    if etiqueta not in clusters:
        clusters[etiqueta] = []
    clusters[etiqueta].append(palabra)
```

**Output esperado**: diccionario `{cluster_id: [lista_de_palabras]}`.

**Parámetro clave**: `min_cluster_size` controla el tamaño mínimo de un cluster. Con
discursos cortos (< 2.000 palabras) usar 3-4. Con discursos largos usar 5-8.

---

### Paso 5 — Identificación de significante vacío por cluster

**Objetivo**: dentro de cada cluster, identificar si existe un significante vacío — la
palabra que funciona como nodo central con alta variabilidad semántica.

**Criterios combinados** (ambos deben cumplirse, si no se cumplen ambos para la misma palabra, se toma la que tenga la dispersión contextual más alta):

1. **Alta dispersión contextual**: la palabra tiene un radio promedio alto dentro del cluster.
   Indica que se usa en contextos muy distintos — su significado es inestable.

2. **Alta centralidad dentro del cluster**: la distancia coseno promedio de esta palabra
   a todas las demás palabras del cluster es la más baja del cluster.
   Indica que está cerca de todo el campo semántico — es el nodo que agrupa.

```python
def identificar_significante_vacio(cluster_palabras, stats):
    scores = []
    vectores_cluster = np.array([stats[p]["centroide"]
                                  for p in cluster_palabras])

    for i, palabra in enumerate(cluster_palabras):
        # Criterio 1: dispersión contextual (normalizada en el cluster)
        dispersion = stats[palabra]["dispersion"]

        # Criterio 2: centralidad (distancia promedio al resto del cluster)
        distancias = cosine_distances(
            stats[palabra]["centroide"].reshape(1, -1),
            vectores_cluster
        )
        centralidad = 1 - float(np.mean(distancias))  # invertir: mayor = más central

        # Score combinado (pesos ajustables)
        score = 0.5 * dispersion + 0.5 * centralidad
        scores.append((palabra, score, dispersion, centralidad))

    scores.sort(key=lambda x: x[1], reverse=True)

    # Solo reportar como significante vacío si el score supera un umbral mínimo
    if scores[0][1] > UMBRAL_SIGNIFICANTE_VACIO:
        return scores[0][0]
    return None
```

**Señal adicional**: si una palabra aparece como nodo central en más de un cluster,
es un significante vacío de primer orden — el más importante del discurso.

**Output esperado**: `{cluster_id: palabra_significante_vacio | None}`

---

### Paso 6 — Identificación de cadenas de equivalencia por cluster

**Objetivo**: dentro de cada cluster, encontrar subgrupos de palabras que tienen el
mismo perfil de vecindario — es decir, que el candidato usa de forma intercambiable.

**Método**: similitud de segundo orden.

La similitud de segundo orden entre dos palabras A y B se calcula comparando sus vectores
de similitud con todo el vocabulario — no los vectores de las palabras en sí, sino los
vectores que describen cómo se relacionan con todos los demás.

```python
def similitud_segundo_orden(palabra_a, palabra_b, todos_vectores, vocabulario):
    # Perfil de A: similitud de A con cada palabra del vocabulario
    perfil_a = cosine_similarity(
        stats[palabra_a]["centroide"].reshape(1, -1),
        todos_vectores
    )[0]

    # Perfil de B: similitud de B con cada palabra del vocabulario
    perfil_b = cosine_similarity(
        stats[palabra_b]["centroide"].reshape(1, -1),
        todos_vectores
    )[0]

    # Similitud entre perfiles
    return cosine_similarity(perfil_a.reshape(1, -1),
                              perfil_b.reshape(1, -1))[0][0]

def identificar_cadenas(cluster_palabras, stats, todos_vectores,
                         significante_vacio, umbral=0.75):
    # Si hay significante vacío, usarlo como ancla
    if significante_vacio:
        scores = []
        for palabra in cluster_palabras:
            if palabra == significante_vacio:
                continue
            sim = similitud_segundo_orden(significante_vacio, palabra,
                                           todos_vectores, cluster_palabras)
            scores.append((palabra, sim))

        # Candidatas a la cadena: similitud alta con el significante vacío
        candidatas = [p for p, s in scores if s > umbral]

        # Verificar cohesión interna
        cadena = [significante_vacio] + candidatas
        return [cadena]

    # Sin significante vacío: clustering interno sobre similitudes de segundo orden
    # (implementación simplificada para la prueba de concepto)
    return []
```

**Output esperado**: `{cluster_id: [[cadena_1], [cadena_2]]}`

---

### Paso 7 — Detección de frames con LLM

**Objetivo**: dentro de cada cluster, detectar si existe un frame — una asociación
conceptual no lingüísticamente obvia que el candidato construye deliberadamente.

**Método**: pasar las palabras del cluster a Claude (vía API de Anthropic) y pedirle
que identifique anomalías semánticas — palabras que no deberían estar ahí por razones
puramente lingüísticas.

La anomalía es la señal del frame: si "seguridad" y "familia" conviven en el mismo
cluster junto a "orden" y "prosperidad", el LLM puede señalar que "familia" es la
anomalía que fuerza una asociación ideológica no lingüística.

```python
import anthropic

client = anthropic.Anthropic()

def detectar_frame(cluster_id, palabras_cluster, significante_vacio, cadenas):
    prompt = f"""Eres un experto en análisis del discurso político colombiano.

Te presento un conjunto de palabras que aparecen en el mismo campo semántico en el discurso
de un candidato político. Estas palabras fueron extraídas automáticamente mediante clustering
de embeddings contextuales (BETO).

Palabras del cluster: {', '.join(palabras_cluster)}
Significante vacío identificado: {significante_vacio or 'ninguno'}
Cadenas de equivalencia identificadas: {cadenas}

Tu tarea:
1. Analiza si hay palabras en este cluster que no tienen una relación lingüística obvia
   con las demás (anomalías semánticas).
2. Si encuentras anomalías, describe qué marco conceptual (frame) podría estar construyendo
   el candidato al asociar esas palabras con las demás.
3. Nombra el frame de forma concisa (ej: SEGURIDAD-COMO-CONTROL, ECONOMÍA-COMO-FAMILIA).
4. Si no encuentras frames, responde "sin frame identificado".

Responde en formato JSON:
{{
  "anomalias": ["palabra1", "palabra2"],
  "frame": "NOMBRE-DEL-FRAME",
  "descripcion": "explicación breve del frame",
  "confianza": "alta | media | baja"
}}"""

    mensaje = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    return mensaje.content[0].text

```

**Output esperado**: `{cluster_id: {anomalias, frame, descripcion, confianza}}`

---

### Paso 8 — Visualización con t-SNE

**Objetivo**: reducir los embeddings de 768 dimensiones a 2D para visualización
interpretable del mapa semántico del candidato.

**Se generan dos visualizaciones**:

1. **Mapa general**: todos los tokens del discurso coloreados por cluster.
2. **Mapa analítico**: palabras clave coloreadas por categoría teórica
   (significante vacío, cadena de equivalencia, frame, vocabulario general).

```python
from sklearn.manifold import TSNE
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

def visualizar_mapa_semantico(vectores, palabras, etiquetas_cluster,
                               categorias_teoricas):
    # Reducción dimensional
    tsne = TSNE(n_components=2, random_state=42,
                perplexity=min(30, len(vectores) - 1))
    coords = tsne.fit_transform(vectores)

    fig, ax = plt.subplots(figsize=(14, 10))

    colores_categoria = {
        "significante_vacio": "#E85D24",
        "cadena_equivalencia": "#1D9E75",
        "frame": "#534AB7",
        "vocabulario": "#888780"
    }

    for i, palabra in enumerate(palabras):
        categoria = categorias_teoricas.get(palabra, "vocabulario")
        color = colores_categoria[categoria]
        size = 80 if categoria != "vocabulario" else 20
        ax.scatter(coords[i, 0], coords[i, 1],
                   c=color, s=size, alpha=0.7, zorder=2)
        if categoria != "vocabulario":
            ax.annotate(palabra, (coords[i, 0], coords[i, 1]),
                        fontsize=9, ha="left", va="bottom")

    # Leyenda
    handles = [mpatches.Patch(color=c, label=l)
               for l, c in colores_categoria.items()]
    ax.legend(handles=handles, loc="upper right")
    ax.set_title("Mapa semántico del discurso", fontsize=14)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig("mapa_semantico.png", dpi=150, bbox_inches="tight")
    plt.show()
```

**Alternativa más moderna**: UMAP produce mejores visualizaciones que t-SNE y es más
rápido. Instalar con `pip install umap-learn`.

---

### Paso 9 — Síntesis del perfil discursivo con LLM

**Objetivo**: integrar todos los outputs anteriores en un perfil discursivo coherente
del candidato, articulando las categorías teóricas de Laclau y Lakoff.

```python
def sintetizar_perfil(candidato, significantes_vacios, cadenas_equivalencia, frames):
    prompt = f"""Eres un experto en análisis del discurso político colombiano con formación
en las teorías de Ernesto Laclau y George Lakoff.

A continuación te presento los resultados del análisis computacional del discurso de
{candidato}. Estos resultados fueron extraídos automáticamente mediante embeddings
contextuales de BETO y clustering semántico.

SIGNIFICANTES VACÍOS IDENTIFICADOS:
{significantes_vacios}

CADENAS DE EQUIVALENCIA IDENTIFICADAS:
{cadenas_equivalencia}

FRAMES CONCEPTUALES IDENTIFICADOS:
{frames}

Tu tarea es sintetizar estos hallazgos en un perfil discursivo que responda:
1. ¿Cuál es la identidad política que este candidato construye a través del lenguaje?
2. ¿Qué grupos sociales incluye en su "nosotros" y cómo los vincula?
3. ¿Qué marcos conceptuales usa para definir los problemas del país?
4. ¿Qué estrategias retóricas son más características de su discurso?

El perfil debe ser analítico, no valorativo. Cita fragmentos específicos cuando sea posible.
Extensión: 300-400 palabras."""

    mensaje = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    return mensaje.content[0].text
```

---

## Estructura del notebook

```
picht360_prueba.ipynb
│
├── 0. Setup y dependencias
│   └── pip install transformers torch spacy hdbscan umap-learn anthropic
│
├── 1. Carga del texto
│   └── Discurso de prueba: intervención en foro / debate
│
├── 2. Preprocesamiento
│
├── 3. Extracción de embeddings (BETO)
│   └── ⚠️ Tarda 2-3 min con GPU activada
│
├── 4. Stats por palabra (promedio + dispersión)
│
├── 5. Clusterización (HDBSCAN)
│   └── Visualización rápida de clusters
│
├── 6. Por cada cluster:
│   ├── 6a. Significante vacío
│   ├── 6b. Cadenas de equivalencia
│   └── 6c. Frame (llamada a Claude API)
│
├── 7. Visualización t-SNE / UMAP
│
└── 8. Perfil discursivo (llamada a Claude API)
```

---

## Dependencias

```bash
pip install transformers torch spacy hdbscan umap-learn anthropic scikit-learn \
            matplotlib pandas numpy
python -m spacy download es_core_news_lg
```

Variables de entorno necesarias:

```python
import os
os.environ["ANTHROPIC_API_KEY"] = "tu_api_key_aquí"
```

---

## Texto de prueba recomendado

Para la primera prueba se recomienda usar una intervención corta y temáticamente densa
(10-20 minutos de discurso transcrito, aproximadamente 1.500-3.000 palabras). Dejar el documento vacío para que lo llene el usuario. 

El texto debe estar corregido (sin muletillas, sin fragmentos inaudibles) antes de
ingresar al pipeline. La corrección puede hacerse con un LLM pasándole el texto crudo
de los subtítulos de YouTube.

---

## Parámetros ajustables

| Parámetro | Valor inicial | Qué controla |
|---|---|---|
| `min_cluster_size` | 2 | Tamaño mínimo de cluster en HDBSCAN |
| `umbral_significante_vacio` | 0.6 | Score mínimo para reportar SV |
| `umbral_cadena` | 0.75 | Similitud de segundo orden mínima |
| `perplexity` (t-SNE) | 30 | Balance local/global en visualización |
| `n_neighbors` (UMAP) | 15 | Tamaño del vecindario local |

---

## Limitaciones de esta prueba de concepto

- Un solo discurso produce corpus pequeño — los clusters pueden ser inestables.
- BETO fue entrenado en español estándar, no en español oral colombiano. Términos
  específicos del contexto político colombiano pueden tener representaciones subóptimas.
- La detección de frames vía LLM es exploratoria y no reproducible al 100%.
- El pipeline no incluye aún los análisis de Van Dijk (Nosotros/Ellos) ni Fairclough
  (axiomas inamovibles) — se implementarán en una segunda iteración.