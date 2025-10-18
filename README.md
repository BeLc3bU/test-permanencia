# Test de Permanencia - Aplicación de Cuestionarios PWA

Una aplicación web progresiva (PWA) diseñada para ayudar a los usuarios a prepararse para el test de permanencia a través de cuestionarios interactivos. La aplicación es instalable, funciona offline y guarda el progreso del usuario para una experiencia de estudio fluida y continua.

## ✨ Características

- **3 Modos de Test**: Normal (aleatorio), Repaso de Fallos (persistente) y Test Imprescindible (con preguntas clave).
- **Modo Test Normal Configurable**: Cuestionarios con un número de preguntas seleccionable por el usuario (10, 20, 30, 50) de un pool que no se repite hasta haber visto todas las preguntas.
- **Modo Repaso de Fallos**: Permite realizar un test exclusivamente con las preguntas que se han fallado históricamente, reforzando el aprendizaje.
- **Feedback Interactivo**:
  - **Sonidos y Vibración**: Efectos de sonido y feedback háptico (vibración en móviles) para respuestas correctas e incorrectas.
  - **Control de Silencio**: Un botón permite al usuario silenciar tanto los sonidos como la vibración, guardando su preferencia.
- **Modales de Confirmación**: Diálogos de confirmación para acciones críticas como finalizar un test o reiniciar el progreso, previniendo acciones accidentales.
- **Revisión Post-Test**: Al finalizar un test, se muestra un resumen detallado de las preguntas falladas en esa sesión específica.
- **Puntuación y Récord**: Sistema de puntuación (+1 por acierto, -0.33 por fallo) y guardado del récord personal en el dispositivo del usuario.
- **Funcionalidad Offline**: Gracias al uso de un **Service Worker**, la aplicación puede ser utilizada sin conexión a internet una vez que ha sido cargada por primera vez.
- **Instalable (PWA)**: Los usuarios pueden "instalar" la aplicación en su escritorio o en la pantalla de inicio de su móvil para un acceso rápido y una experiencia similar a una app nativa.
- **Persistencia de Datos**:
  - Guarda el estado de un test no finalizado para poder continuarlo más tarde.
  - Mantiene un registro de las preguntas ya vistas y las falladas.
  - Almacena el récord y la preferencia de tema (claro/oscuro).
- **Tema Claro y Oscuro**: Incluye un selector de tema que se adapta a las preferencias del usuario y mejora la comodidad visual.
- **Diseño Responsivo**: Interfaz optimizada para una correcta visualización tanto en dispositivos de escritorio como en móviles.

## 🚀 Tecnologías Utilizadas

- **HTML5**: Estructura semántica y accesible.
- **CSS3**: Estilos modernos con variables (para theming), Flexbox, animaciones y diseño responsivo (media queries).
- **JavaScript (ES6+ Modules)**: Lógica de la aplicación modularizada, asincronía (`async/await`), clases y manejo del estado.
- **Progressive Web App (PWA)**:
  - **Service Worker**: Para la gestión de la caché, funcionalidad offline y estrategia de actualización `Stale-While-Revalidate`.
  - **Web App Manifest (`manifest.json`)**: Para definir los metadatos de la aplicación y permitir su instalación.
- **Node.js**: Utilizado en el entorno de desarrollo para un script de validación (`validar_preguntas.js`) que asegura la integridad y corrección del archivo `preguntas.json`.

## 🔧 Instalación y Uso (Desarrollo)

1.  **Clonar el repositorio**:
    ```bash
    git clone <URL-del-repositorio>
    cd <nombre-del-directorio>
    ```

2.  **Ejecutar la aplicación (¡Importante!)**:
    - **No abras el archivo `index.html` directamente en el navegador.** Debido a las políticas de seguridad (CORS) de los navegadores modernos, la aplicación debe ser servida a través de un servidor web local para que pueda cargar los archivos de preguntas (`.json`).
    - **La forma más sencilla es usar la extensión `Live Server` en Visual Studio Code:**
        1. Instala la extensión "Live Server" de Ritwick Dey desde el marketplace de VS Code.
        2. Haz clic derecho sobre el archivo `index.html`.
        3. Selecciona "Open with Live Server".
    - Esto abrirá la aplicación en tu navegador en una dirección como `http://127.0.0.1:5500`, lo que permitirá que todo funcione correctamente.

3.  **Validar las preguntas (Opcional)**:
    - Si realizas cambios en `preguntas.json` o `preguntas_imprescindibles.json`, puedes verificar su integridad. Asegúrate de tener Node.js instalado.
    - Ejecuta el siguiente comando en la terminal desde la raíz del proyecto:
    
    ```bash
    # Para validar el archivo principal
    ```bash
    node validar_preguntas.js
    ```
    # Para validar las preguntas imprescindibles
    node validar_preguntas.js --imprescindibles
    ```
    - El script te informará si hay errores, eliminará duplicados y creará un archivo `depurado_...json` limpio.

## 📂 Estructura de Archivos

```
├── 📁 icons/
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── 📜 app.js                # Lógica principal de la aplicación
├── 📜 index.html             # Estructura HTML
├── 📜 manifest.json         # Configuración de la PWA
├── 📜 preguntas_imprescindibles.json # Banco de preguntas clave
├── 📜 preguntas.json         # Banco de datos con todas las preguntas del test
├── 📜 README.md               # Este archivo
├── 📜 service-worker.js     # Lógica para la funcionalidad offline y caché
├── 📜 style.css               # Estilos de la aplicación
└── 📜 validar_preguntas.js  # Script de Node.js para validar el JSON de preguntas
```

## 📖 Cómo Usar la Aplicación

1.  **Menú de Inicio**: Al abrir la aplicación, se presentan tres opciones:
    - **Test Imprescindible**: Comienza un test con una selección de preguntas clave.
    - **Nuevo Test**: Comienza un cuestionario con preguntas que no has visto antes.
    - **Repasar Fallos**: Inicia un test con todas las preguntas que has fallado en sesiones anteriores. El contador muestra cuántas tienes pendientes.

2.  **Durante el Test**:
    - Responde a cada pregunta seleccionando una de las opciones.
    - Recibirás feedback inmediato (correcto/incorrecto).
    - Usa el botón "Siguiente Pregunta" para avanzar.
    - Puedes usar el botón "Finalizar" en la cabecera para terminar el test en cualquier momento.

3.  **Final del Test**:
    - Verás tu puntuación final, el número de aciertos y fallos.
    - Si has superado tu récord, se te notificará.
    - Se mostrará una revisión detallada de las preguntas que fallaste en esa sesión.
    - Tendrás la opción de "Repasar Fallos del Test" o volver al "Menú Principal".

4.  **Cambio de Tema**:
    - Usa el botón con el icono de luna (🌙) o sol (☀️) en la esquina inferior derecha para cambiar entre el tema claro y oscuro.

---

*Proyecto desarrollado con el objetivo de facilitar el estudio y la preparación para el examen de permanencia.*

---

## 🗺️ Hoja de Ruta (Roadmap) Futuro

Esta sección describe la visión a futuro para la aplicación, transformándola de una herramienta de estudio personal a una plataforma de aprendizaje completa y profesional.

### Corto Plazo (Próximas Mejoras)

-   **📚 Tests por Temas:**
    -   Añadir una propiedad `"tema"` a cada pregunta en los archivos JSON.
    -   Modificar la interfaz de inicio para permitir al usuario seleccionar uno o varios temas específicos para su test.
    -   Crear una vista de estadísticas que muestre el rendimiento por tema.

-   **📊 Estadísticas Avanzadas:**
    -   Crear un perfil de usuario (local) donde se visualicen gráficos de progreso.
    -   Mostrar estadísticas como: porcentaje de aciertos por tema, tiempo medio de respuesta, y evolución del récord.

-   **✨ Mejoras de UX/UI:**
    -   Implementar un modo "Flashcards" para un repaso rápido de preguntas y respuestas.
    -   Añadir más animaciones y micro-interacciones para una experiencia más fluida.

### Medio Plazo (Profesionalización)

-   **🔑 Sistema de Cuentas de Usuario (Backend):**
    -   Desarrollar un backend (usando Node.js, Python, etc.) con una base de datos (PostgreSQL, MongoDB).
    -   Implementar registro de usuarios, inicio de sesión (con email/contraseña y proveedores como Google).
    -   Sincronizar todo el progreso (fallos, récord, tests a medias) en la nube, permitiendo una experiencia multidispositivo.

-   **💰 Modelo de Suscripción (Freemium):**
    -   **Modo Prueba:** Los usuarios no registrados o gratuitos tendrán acceso a un número limitado de preguntas o a un "Test de Diagnóstico".
    -   **Modo Premium:** Los usuarios de pago tendrán acceso ilimitado a todo el banco de preguntas, tests por temas, estadísticas avanzadas y futuras funcionalidades exclusivas.

-   **📱 Publicación en Google Play Store:**
    -   Utilizar **TWA (Trusted Web Activity)** para empaquetar la PWA y publicarla en la Google Play Store, aprovechando el código existente.
    -   Integrar APIs nativas si es necesario (ej. compras dentro de la app para la suscripción).

-   **📝 Sistema de Reporte de Preguntas:**
    -   Añadir un botón en cada pregunta para que los usuarios puedan reportar errores.
    -   Implementar un formulario sencillo donde el usuario pueda categorizar el error (ej. "Respuesta incorrecta", "Error de tipeo") y añadir un comentario.
    -   Los reportes se enviarán al backend para que un administrador pueda revisarlos y corregir el banco de preguntas, mejorando la calidad del contenido de forma colaborativa.

### Largo Plazo (Expansión y Automatización)

-   **🤖 Panel de Administración con IA:**
    -   Crear una aplicación web interna (panel de administrador) para gestionar la plataforma.
    -   **Asistente de IA para Contenido:** Integrar un modelo de lenguaje (como la API de Gemini) para:
        -   **Generar nuevas preguntas:** Un administrador podría pegar texto de un temario y la IA generaría preguntas en el formato JSON correcto.
        -   **Clasificar temas:** La IA podría sugerir automáticamente el tema de nuevas preguntas.
        -   **Validar y corregir:** La IA podría revisar la gramática y coherencia de las preguntas existentes.

-   **🏆 Gamificación y Comunidad:**
    -   **Rankings y Ligas:** Tablas de clasificación semanales/mensuales para fomentar la competitividad sana.
    -   **Logros y Medallas:** Desbloquear logros por hitos (ej. "100 preguntas correctas seguidas", "Experto en Tema X").
    -   **Foro de Discusión:** Integrar un pequeño foro o sección de comentarios por pregunta para que los usuarios puedan discutir y ayudarse mutuamente.

-   **🎯 Simulacros de Examen Reales:**
    -   Crear un modo "Simulacro Oficial" que imite fielmente las condiciones del examen real: número exacto de preguntas, distribución de temas y límite de tiempo estricto.

-   **🔔 Notificaciones Push Inteligentes:**
    -   Enviar recordatorios de estudio personalizados ("¡Hace 3 días que no repasas tus fallos!").
    -   Notificar sobre la adición de nuevo contenido o el inicio de una nueva "liga" semanal.

---