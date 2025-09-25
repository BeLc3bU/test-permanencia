# Test de Permanencia - Aplicación de Cuestionarios PWA

Una aplicación web progresiva (PWA) diseñada para ayudar a los usuarios a prepararse para el test de permanencia a través de cuestionarios interactivos. La aplicación es instalable, funciona sin conexión a internet y guarda el progreso del usuario para una experiencia de estudio fluida y continua.

## ✨ Características Principales

- **Modo Test Normal**: Cuestionarios de 20 preguntas seleccionadas aleatoriamente de un pool que no se repite hasta haber visto todas las preguntas.
- **Modo Repaso de Fallos**: Permite realizar un test exclusivamente con las preguntas que se han fallado históricamente, reforzando el aprendizaje.
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
- **JavaScript (ES6+)**: Lógica de la aplicación, manipulación del DOM, asincronía (`async/await`) y manejo del estado.
- **Progressive Web App (PWA)**:
  - **Service Worker**: Para la gestión de la caché, funcionalidad offline y estrategias de actualización de contenido (`Network First` para las preguntas, `Cache First` para el resto de assets).
  - **Web App Manifest (`manifest.json`)**: Para definir los metadatos de la aplicación y permitir su instalación.
- **Node.js**: Utilizado en el entorno de desarrollo para un script de validación (`validar_preguntas.js`) que asegura la integridad y corrección del archivo `preguntas.json`.

## 🔧 Instalación y Uso (Desarrollo)

1.  **Clonar el repositorio**:
    ```bash
    git clone <URL-del-repositorio>
    cd <nombre-del-directorio>
    ```

2.  **Ejecutar la aplicación**:
    - La forma más sencilla es abrir el archivo `index.html` en un navegador web.
    - Para un correcto funcionamiento del Service Worker, se recomienda servir los archivos a través de un servidor local. Una extensión popular para Visual Studio Code es Live Server.

3.  **Validar las preguntas (Opcional)**:
    - Si realizas cambios en `preguntas.json`, puedes verificar su integridad. Asegúrate de tener Node.js instalado.
    - Ejecuta el siguiente comando en la terminal desde la raíz del proyecto:
    ```bash
    node validar_preguntas.js
    ```
    - El script te informará si hay errores de sintaxis, preguntas duplicadas, o si alguna respuesta correcta no coincide con sus opciones.

## 📂 Estructura de Archivos

```
├── 📁 icons/
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── 📜 app.js                # Lógica principal de la aplicación
├── 📜 index.html             # Estructura HTML
├── 📜 manifest.json         # Configuración de la PWA
├── 📜 preguntas.json         # Banco de datos con todas las preguntas del test
├── 📜 README.md               # Este archivo
├── 📜 service-worker.js     # Lógica para la funcionalidad offline y caché
├── 📜 style.css               # Estilos de la aplicación
└── 📜 validar_preguntas.js  # Script de Node.js para validar el JSON de preguntas
```

## 📖 Cómo Usar la Aplicación

1.  **Menú de Inicio**: Al abrir la aplicación, se presentan dos opciones:
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