# PitchLab360 — Plataforma de Análisis Discursivo

PitchLab360 es una mesa de trabajo avanzada para analistas de comunicación política que combina métricas cuantitativas reproducibles con interpretaciones cualitativas asistidas por Inteligencia Artificial (Claude 3.5 Sonnet).

## Estado Actual del Proyecto: **MVP Funcional**

El proyecto se encuentra en una fase operativa completa, con una interfaz profesional optimizada para el entorno académico y de consultoría.

### Características Implementadas:
- **Ingesta de Datos**: Importación directa desde URLs de YouTube (con extracción de subtítulos por tramos de tiempo) o pegado manual de texto.
- **Limpieza con IA**: Módulo de corrección gramatical y de puntuación para transcripciones automáticas.
- **Análisis de Capa 1 (Cuantitativo)**:
    - Índice de Riqueza Léxica (TTR).
    - Legibilidad (Escala Flesch).
    - Dicotomía Discursiva (Nosotros vs. Ellos).
    - Densidad de Negaciones y Longitud Media de Oración.
- **Análisis de Capa 2 (Cualitativo/IA)**:
    - Análisis de Tono y Mensajes Clave.
    - Encuadres (Frames) y Emociones Predominantes.
    - Segmentación de Audiencias (Endogrupo/Exogrupo).
    - Perfil y Estilo de Comunicación.
    - Proyección en Canales Digitales (Shorts, Reels, etc.).
    - Evaluación de Autenticidad y Riesgos.
- **Reportes Profesionales**: Generación de informes en PDF con branding de la Universidad de La Sabana y el GovLab.
- **Interfaz de Usuario**: Sidebar interactiva y redimensionable, diseño minimalista y profesional sin distractores visuales (emojis).

---

## Stack Tecnológico
- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6)
- **Motor de IA**: Anthropic API (Claude 3.5 Sonnet)
- **Métricas NLP**: Textstat (Análisis puramente computacional)
- **Utilidades**: `youtube-transcript-api` para extracción de datos.

---

## Instalación y Ejecución

1. **Clonar el repositorio** e ingresar al directorio:
   ```bash
   git clone <url-del-repositorio>
   cd PitchLab360
   ```

2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz con tu clave de Anthropic:
   ```env
   ANTHROPIC_API_KEY=tu_clave_aqui
   ```

4. **Ejecutar el servidor**:
   ```bash
   python main.py
   ```
   La aplicación estará disponible en `http://127.0.0.1:8000`.

---

## Notas Metodológicas
- **Reproducibilidad**: Los indicadores de Capa 1 son fijos y reproducibles.
- **Interpretación**: Los análisis de Capa 2 son generados por modelos de lenguaje y deben ser validados por un analista humano.
- **Privacidad**: El sistema procesa los discursos en tiempo real; no se almacenan textos de forma persistente en la versión actual (MVP).

## Créditos
Este proyecto es un ejercicio académico desarrollado para el **Laboratorio de Gobierno (GovLab)** de la **Universidad de La Sabana**. No representa la posición oficial de la Universidad o sus colaboradores.