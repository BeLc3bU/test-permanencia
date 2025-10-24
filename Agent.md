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
| **Modos de Test** | 1. Implementar modo **Normal** (aleatorio, configurable), **Repaso de Fallos** y **Test Imprescindible**. <br> 2. Añadir modos de **Examen 2022** y **Examen 2024**. <br> 3. Permitir al usuario seleccionar el número de preguntas para el test normal. | `index.html`, `app.js`, `state.js`, `ui.js` |
| **Estructura de Datos** | 1. Definir un formato JSON estándar para las preguntas (`pregunta`, `opciones`, `respuestaCorrecta`). <br> 2. Separar las preguntas en `preguntas.json` (banco general) y `preguntas_imprescindibles.json` (subconjunto clave). | `preguntas.json`, `preguntas_imprescindibles.json` |
| **Lógica del Test** | 1. Cargar y unificar los archivos JSON de forma asíncrona. <br> 2. Gestionar el estado del test: pregunta actual, puntuación, aciertos, fallos. <br> 3. Implementar el sistema de puntuación (+1 acierto, -0.33 fallo). | `app.js`, `state.js`, `questionManager.js` |
| **Persistencia de Datos** | 1. Usar `localStorage` para almacenar: Récord, preguntas no vistas, fallos, estado de sesión, tema, y preferencias de usuario (nº preguntas, silencio). | `storage.js` |
| **Interfaz de Usuario (UI)** | 1. Diseñar una estructura HTML semántica. <br> 2. Crear vistas para menú, test y resultados. <br> 3. Implementar barra de progreso y feedback visual inmediato. <br> 4. Mostrar resumen y revisión de fallos. <br> 5. Implementar un modal de confirmación reutilizable. | `index.html`, `style.css`, `ui.js` |
| **Experiencia de Usuario (UX)** | 1. Implementar tema claro/oscuro con persistencia. <br> 2. Asegurar diseño responsive (`mobile-first`). <br> 3. Añadir animaciones y transiciones suaves. <br> 4. Implementar atajos de teclado. <br> 5. Gestionar la restauración de sesiones. <br> 6. Añadir feedback auditivo (sonidos) y háptico (vibración) con control de silencio. | `style.css`, `app.js`, `ui.js` |
| **Arquitectura y Refactorización** | 1. Modularizar el código JavaScript. <br> 2. Separar la lógica de estado (`state.js`), almacenamiento (`storage.js`), gestión de preguntas (`questionManager.js`) y UI (`ui.js`). <br> 3. Convertir la lógica de UI en una clase para una mejor encapsulación. | `app.js`, `ui.js`, `state.js`, `storage.js`, `questionManager.js` |
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
    -   **Test Imprescindible**: Modificar la carga inicial para unificar `preguntas.json` y `preguntas_imprescindibles.json`. La función `iniciarTest('imprescindible', ...)` filtrará las preguntas que tengan la propiedad `"imprescindible": true`. **(Funcionalidad eliminada, se fusionó todo en `preguntas.json`)**

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

### Fase 4: Refactorización y Mejoras de UX

9.  **Modularización del Código**:
    *   Refactorizar la lógica de `localStorage` a un módulo `storage.js`.
    *   Refactorizar la carga y gestión de preguntas a un módulo `questionManager.js`.
    *   Convertir la lógica de la UI en una clase `UI` en `ui.js` para encapsular estado y comportamiento.
10. **Mejoras de Interfaz y Experiencia**:
    *   Implementar un modal de confirmación reutilizable para acciones críticas.
    *   Añadir feedback auditivo (sonidos) y háptico (vibración) con un control de silencio persistente.
    *   Permitir al usuario seleccionar el número de preguntas para los tests normales.

### Fase 5: Robustez y Mantenimiento
11. **Script de Validación**:
    *   Desarrollar el script `validar_preguntas.js` con Node.js y el módulo `fs`.
    *   El script debe leer el archivo, parsearlo, y sistemáticamente comprobar cada regla de validación.
    *   Debe eliminar duplicados (basado en el texto de la pregunta) y escribir un archivo `depurado_*.json`.
    *   El script debe finalizar con un código de salida `1` si hay errores, para facilitar su integración en flujos de CI/CD.

12. **Revisión Final y Depuración**:
    *   Revisar todo el código en `app.js` para asegurar que la lógica es clara y las funciones tienen una única responsabilidad.
    *   Centralizar el estado del test en un único objeto (`estadoTest`) para facilitar su gestión y persistencia.
    *   Añadir comentarios donde la lógica sea compleja.
    *   Verificar la accesibilidad (uso de `aria-label`, `aria-live`, etc.).

Este plan estructurado garantiza que se construya la aplicación de manera lógica, empezando por el núcleo funcional y añadiendo capas de complejidad progresivamente, lo que facilita la depuración y asegura un producto final de alta calidad.