# Agent Development Plan: Test de Permanencia PWA

Este documento detalla el proceso de pensamiento, la planificación y la estrategia de ejecución que un agente de IA (Gemini Code Assist) seguiría para desarrollar la aplicación "Test de Permanencia".

## 1. Objetivo Principal (Mission Statement)

Crear una Progressive Web App (PWA) robusta, intuitiva y funcional para ayudar a los usuarios a prepararse para el "test de permanencia". La aplicación debe ser instalable, funcionar offline, persistir el progreso del usuario y ofrecer diferentes modos de estudio para maximizar la eficacia del aprendizaje. La calidad del código, la mantenibilidad y una excelente experiencia de usuario son prioridades clave.

## 2. Persona del Agente

**Gemini Code Assist**: Un asistente de ingeniería de software de clase mundial con amplia experiencia en desarrollo web front-end, PWAs, JavaScript moderno (ES6+), y diseño de arquitecturas de software limpias y escalables. El enfoque se centra en la claridad, la eficiencia y las mejores prácticas.

## 3. Análisis de Requisitos y Desglose de Características

A partir del `README.md` y la estructura del proyecto, se identifican las siguientes características clave, que se desglosan en tareas de desarrollo:

| Característica Clave | Tareas de Desarrollo | Archivos Implicados |
| :--- | :--- | :--- |
| **PWA & Offline** | 1. Crear `manifest.json` con metadatos, iconos y atajos. <br> 2. Implementar `service-worker.js`. <br> 3. Definir estrategias de caché: `Cache First` para assets estáticos y `Network First` para los JSON de preguntas. <br> 4. Gestionar el ciclo de vida del SW (instalación, activación, limpieza de caché antigua, actualización con prompt). | `manifest.json`, `service-worker.js`, `app.js` |
| **Estructura de Datos** | 1. Definir un formato JSON estándar para las preguntas (`pregunta`, `opciones`, `respuestaCorrecta`). <br> 2. Separar las preguntas en `preguntas.json` (banco general) y `preguntas_imprescindibles.json` (subconjunto clave). | `preguntas.json`, `preguntas_imprescindibles.json` |
| **Lógica del Test** | 1. Cargar y parsear los archivos JSON de forma asíncrona. <br> 2. Implementar la lógica para los 3 modos: **Normal** (aleatorio sin repetición), **Repaso de Fallos** y **Test Imprescindible**. <br> 3. Gestionar el estado del test: pregunta actual, puntuación, aciertos, fallos. <br> 4. Implementar el sistema de puntuación (+1 acierto, -0.33 fallo). | `app.js` |
| **Persistencia de Datos** | 1. Usar `localStorage` para almacenar: <br>   - Récord de puntuación (`HIGH_SCORE_KEY`). <br>   - Índices de preguntas no vistas (`UNSEEN_QUESTIONS_KEY`). <br>   - Índices de preguntas falladas (`FAILED_QUESTIONS_KEY`). <br>   - Estado de un test en curso para poder continuarlo (`TEST_STATE_KEY`). <br>   - Preferencia de tema (`THEME_KEY`). | `app.js` |
| **Interfaz de Usuario (UI)** | 1. Diseñar una estructura HTML semántica (`index.html`). <br> 2. Crear dos vistas principales: menú de inicio y vista de test. <br> 3. Implementar una barra de progreso. <br> 4. Mostrar feedback visual inmediato (correcto/incorrecto). <br> 5. Al finalizar, mostrar un resumen y una revisión detallada de los fallos. | `index.html`, `style.css`, `app.js` |
| **Experiencia de Usuario (UX)** | 1. Implementar un tema claro/oscuro con persistencia. <br> 2. Asegurar un diseño responsive (`mobile-first`). <br> 3. Añadir transiciones y animaciones sutiles para una experiencia fluida. <br> 4. Implementar atajos de teclado (a, b, c, d) para responder. <br> 5. Gestionar la restauración de sesiones no finalizadas. | `style.css`, `app.js` |
| **Herramientas de Desarrollo** | 1. Crear un script en Node.js (`validar_preguntas.js`) para: <br>   - Validar la estructura del JSON. <br>   - Comprobar que la respuesta correcta existe en las opciones. <br>   - Detectar y eliminar preguntas duplicadas, generando un archivo limpio. | `validar_preguntas.js` |

## 4. Plan de Ejecución Secuencial (Paso a Paso)

El desarrollo se abordaría de forma incremental, construyendo sobre una base sólida.

### Fase 1: El Esqueleto Funcional (MVP)

1.  **Estructura Base**:
    *   Crear `index.html` con los contenedores para el menú y el test.
    *   Crear `style.css` con variables CSS para colores y un layout básico con Flexbox.
    *   Crear `app.js` y enlazarlo.

2.  **Carga de Datos y Test Normal**:
    *   Implementar la función `cargarArchivoPreguntas` en `app.js` usando `fetch` y `async/await`.
    *   Implementar la lógica para el **"Nuevo Test"**:
        *   Al iniciar, cargar `preguntas.json`.
        *   Seleccionar `N` preguntas aleatorias.
        *   Implementar la función `mostrarPregunta` para renderizar la pregunta y las opciones.
        *   Implementar `seleccionarRespuesta` para gestionar la lógica de acierto/fallo, actualizar puntuación y dar feedback.
        *   Avanzar a la siguiente pregunta o finalizar el test.

### Fase 2: Persistencia y Modos Adicionales

3.  **Gestión de Preguntas Vistas y Falladas**:
    *   Introducir el concepto de `preguntasNoVistasIndices` en `localStorage`. Al iniciar un test normal, se consumen preguntas de este pool. Si se vacía, se regenera.
    *   Implementar la lógica para `guardarFalloPersistente` y `eliminarFalloPersistente` en `localStorage`, almacenando los índices de las preguntas.

4.  **Implementar Modos de Repaso e Imprescindible**:
    *   **Repaso de Fallos**: Crear un botón que lea los índices de `FAILED_QUESTIONS_KEY`, construya un array de preguntas y lo pase a la función `iniciarTest('repaso', ...)`.
    *   **Test Imprescindible**: Modificar la carga inicial para unificar `preguntas.json` y `preguntas_imprescindibles.json`. La función `iniciarTest('imprescindible', ...)` filtrará las preguntas que tengan la propiedad `"imprescindible": true`.

5.  **Persistencia de Sesión y Récord**:
    *   Implementar `guardarEstado` para serializar el objeto `estadoTest` a `localStorage` después de cada respuesta o al pulsar "Seguir más tarde".
    *   Al cargar la app, comprobar si existe un estado guardado y preguntar al usuario si desea continuar.
    *   Guardar y mostrar el récord de puntuación.

### Fase 3: PWA y Experiencia de Usuario

6.  **Implementación del Service Worker**:
    *   Crear `service-worker.js` y registrarlo.
    *   Definir el array `urlsToCache` con los assets críticos.
    *   Implementar los listeners `install`, `activate` y `fetch` con las estrategias de caché definidas.

7.  **Manifiesto y Mejoras PWA**:
    *   Crear `manifest.json` detallado, incluyendo `short_name`, `description`, `icons` (con `maskable` y `monochrome`), `start_url`, `display`, y `shortcuts` para un acceso rápido a los modos de test.
    *   Añadir `screenshots` para mejorar la experiencia de instalación.

8.  **Mejoras de UI/UX**:
    *   Implementar el **tema claro/oscuro** usando una clase en el `<body>` y variables CSS. Guardar la preferencia en `localStorage`.
    *   Refinar `style.css` para que sea completamente responsive (`@media` queries).
    *   Añadir animaciones (`fade-in`/`fade-out` para preguntas, `shake` para error) para una navegación más agradable.
    *   Implementar atajos de teclado para una mayor accesibilidad y rapidez.

### Fase 4: Robustez y Mantenimiento

9.  **Script de Validación**:
    *   Desarrollar el script `validar_preguntas.js` con Node.js y el módulo `fs`.
    *   El script debe leer el archivo, parsearlo, y sistemáticamente comprobar cada regla de validación.
    *   Debe eliminar duplicados (basado en el texto de la pregunta) y escribir un archivo `depurado_*.json`.
    *   El script debe finalizar con un código de salida `1` si hay errores, para facilitar su integración en flujos de CI/CD.

10. **Revisión Final y Refactorización**:
    *   Revisar todo el código en `app.js` para asegurar que la lógica es clara y las funciones tienen una única responsabilidad.
    *   Centralizar el estado del test en un único objeto (`estadoTest`) para facilitar su gestión y persistencia.
    *   Añadir comentarios donde la lógica sea compleja.
    *   Verificar la accesibilidad (uso de `aria-label`, `aria-live`, etc.).

Este plan estructurado garantiza que se construya la aplicación de manera lógica, empezando por el núcleo funcional y añadiendo capas de complejidad progresivamente, lo que facilita la depuración y asegura un producto final de alta calidad.