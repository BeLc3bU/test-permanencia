window.addEventListener('load', () => {
    // Elementos del DOM
    const inicioMenuEl = document.getElementById('inicio-menu');
    const contadorFallosEl = document.getElementById('contador-fallos');
    const testContentEl = document.getElementById('test-content');
    const iniciarNuevoTestBtn = document.getElementById('iniciar-nuevo-test-btn');
    const iniciarRepasoFallosBtn = document.getElementById('iniciar-repaso-fallos-btn');
    const iniciarTestImprescindibleBtn = document.getElementById('iniciar-test-imprescindible-btn');
    const preguntaEl = document.getElementById('pregunta-actual');
    const opcionesEl = document.getElementById('opciones-respuesta');
    const feedbackEl = document.getElementById('feedback');
    const siguienteBtn = document.getElementById('siguiente-pregunta');
    const reiniciarBtn = document.getElementById('reiniciar-test');
    const repasarFallosBtn = document.getElementById('repasar-fallos-btn');
    const finalizarAhoraBtn = document.getElementById('finalizar-ahora-btn');
    const barraProgresoEl = document.getElementById('barra-progreso');
    const progresoTextoEl = document.getElementById('progreso-texto');
    const revisionFallosEl = document.getElementById('revision-fallos');
    const recordTextoEl = document.getElementById('record-texto');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    // Constantes para claves en localStorage y configuración
    const HIGH_SCORE_KEY = 'testPermanenciaHighScore';
    const UNSEEN_QUESTIONS_KEY = 'testPermanenciaUnseenQuestions';
    const FAILED_QUESTIONS_KEY = 'testPermanenciaFailedQuestions';
    const TEST_STATE_KEY = 'testPermanenciaState';
    const THEME_KEY = 'testPermanenciaTheme';
    const NUMERO_PREGUNTAS_TEST = 20;

    // --- Estado de la aplicación ---
    let todasLasPreguntas = [];
    let preguntasNoVistasIndices = [];

    // Objeto para centralizar el estado del test actual
    let estadoTest = {
        preguntasDelTest: [],
        preguntasFalladas: [],
        preguntaActualIndex: 0,
        puntuacion: 0,
        aciertos: 0,
        fallos: 0,
        haRespondido: false,
    };

    // --- Inicialización de la aplicación ---
    async function inicializarApp() {
        inicializarTema();

        try {
            todasLasPreguntas = await cargarPreguntas();
            if (todasLasPreguntas.length > 0) {
                inicializarPoolPreguntasNoVistas();
            }
        } catch (error) {
            console.error("Fallo crítico al cargar las preguntas principales. Algunas funciones pueden no estar disponibles.", error);
            // Deshabilitar botones que dependen de `todasLasPreguntas`
            iniciarNuevoTestBtn.disabled = true;
            iniciarNuevoTestBtn.title = "No se pudieron cargar las preguntas principales.";
        } finally {
            // Estos se ejecutan siempre, para que el resto de la UI funcione
            actualizarBotonRepaso();
            registrarEventListeners(); // Mover el registro de listeners aquí

            if (localStorage.getItem(TEST_STATE_KEY)) {
                if (confirm('Hemos encontrado un test sin finalizar. ¿Quieres continuar donde lo dejaste?')) {
                    mostrarVistaTest();
                    restaurarSesion();
                } else {
                    limpiarEstado();
                    mostrarVistaInicio();
                }
            } else {
                mostrarVistaInicio();
            }
        }
    }

    // --- Control de Vistas y Tema ---
    const mostrarVistaInicio = () => { inicioMenuEl.classList.remove('oculto'); testContentEl.classList.add('oculto'); };
    const mostrarVistaTest = () => { inicioMenuEl.classList.add('oculto'); testContentEl.classList.remove('oculto'); };

    function inicializarTema() {
        const temaGuardado = localStorage.getItem(THEME_KEY);
        if (temaGuardado === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleBtn.innerHTML = '☀️'; // Icono de sol
        } else {
            themeToggleBtn.innerHTML = '🌙'; // Icono de luna
        }
    }

    function cambiarTema() {
        document.body.classList.toggle('dark-mode');
        const esModoOscuro = document.body.classList.contains('dark-mode');
        localStorage.setItem(THEME_KEY, esModoOscuro ? 'dark' : 'light');
        // Actualizar icono del botón
        themeToggleBtn.innerHTML = esModoOscuro ? '☀️' : '🌙';
    }

    // --- Lógica del Test ---
    function inicializarPoolPreguntasNoVistas() {
        const indicesGuardados = localStorage.getItem(UNSEEN_QUESTIONS_KEY);
        if (indicesGuardados) {
            preguntasNoVistasIndices = JSON.parse(indicesGuardados);
        } else {
            // Si no hay nada guardado, creamos el pool con todas las preguntas
            preguntasNoVistasIndices = todasLasPreguntas.map((_, index) => index);
            barajarArray(preguntasNoVistasIndices);
            localStorage.setItem(UNSEEN_QUESTIONS_KEY, JSON.stringify(preguntasNoVistasIndices));
        }
    }

    function iniciarTest(modo = 'normal', preguntasPersonalizadas = []) {
        mostrarVistaTest();
        // Reiniciar el estado del test
        estadoTest = {
            preguntasDelTest: [],
            preguntasFalladas: [],
            preguntaActualIndex: 0,
            puntuacion: 0,
            aciertos: 0,
            fallos: 0,
            haRespondido: false,
        };

        reiniciarBtn.classList.add('oculto');
        finalizarAhoraBtn.classList.remove('oculto');
        repasarFallosBtn.classList.add('oculto');
        revisionFallosEl.classList.add('oculto');

        if (modo !== 'normal') {
            estadoTest.preguntasDelTest = preguntasPersonalizadas;
            // No barajamos los modos especiales (repaso, imprescindible)
            // para mantener el orden si se desea.
        } else { // modo 'normal'
            // Lógica mejorada para seleccionar preguntas sin repetir
            if (preguntasNoVistasIndices.length === 0) {
                alert('¡Enhorabuena! Has visto todas las preguntas. El ciclo de preguntas se reiniciará.');
                preguntasNoVistasIndices = todasLasPreguntas.map((_, index) => index);
            }

            barajarArray(preguntasNoVistasIndices);
            // Tomar el número de preguntas disponibles, hasta un máximo de NUMERO_PREGUNTAS_TEST
            const numeroDePreguntasParaTest = Math.min(preguntasNoVistasIndices.length, NUMERO_PREGUNTAS_TEST);

            const indicesParaElTest = preguntasNoVistasIndices.slice(0, numeroDePreguntasParaTest);
            estadoTest.preguntasDelTest = indicesParaElTest.map(index => todasLasPreguntas[index]);

            // Actualizamos el pool de preguntas no vistas SOLO para el modo normal
            const nuevosIndicesNoVistos = preguntasNoVistasIndices.filter(index => !indicesParaElTest.includes(index));
            localStorage.setItem(UNSEEN_QUESTIONS_KEY, JSON.stringify(nuevosIndicesNoVistos));
            preguntasNoVistasIndices = nuevosIndicesNoVistos;
        }

        mostrarRecord();
        mostrarPregunta();
    }

    function restaurarSesion() {
        cargarEstado();
        mostrarRecord();
        mostrarPregunta();
        if (estadoTest.haRespondido) {
            restaurarRespuesta();
        }
    }

    /**
     * Carga las preguntas desde el archivo JSON.
     * @returns {Promise<Array>} Una promesa que resuelve con el array de preguntas.
     */
    async function cargarPreguntas() {
        return await cargarArchivoPreguntas('preguntas.json');
    }

    /**
     * Carga las preguntas imprescindibles y elimina duplicados.
     * @returns {Promise<Array>} Una promesa que resuelve con el array de preguntas únicas.
     */
    async function cargarPreguntasImprescindibles() {
        const preguntas = await cargarArchivoPreguntas('preguntas_imprescindibles.json');
        if (!preguntas) return [];

        const preguntasUnicas = new Map();
        preguntas.forEach(p => {
            const clave = p.pregunta.trim().toLowerCase();
            if (!preguntasUnicas.has(clave)) {
                preguntasUnicas.set(clave, p);
            }
        });
        return Array.from(preguntasUnicas.values());
    }

    async function cargarArchivoPreguntas(nombreArchivo) {
        try {
            const response = await fetch(nombreArchivo);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error al cargar el archivo ${nombreArchivo}:`, error);
            // Ya no mostramos el error en la UI aquí, lo propagamos para que sea manejado por quien llama a la función.
            return Promise.reject('Error al cargar preguntas');
        }
    }

    /**
     * Baraja los elementos de un array usando el algoritmo Fisher-Yates.
     * @param {Array} array El array a barajar.
     */
    function barajarArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Función para mostrar una pregunta
    async function mostrarPregunta() {
        // Contenedores para la animación
        const preguntaWrapper = document.getElementById('pregunta-wrapper');

        // Si no es la primera pregunta, aplica animación de salida
        if (estadoTest.preguntaActualIndex > 0) {
            preguntaWrapper.classList.add('fade-out');
            await new Promise(resolve => setTimeout(resolve, 300)); // Espera a que termine la animación
        }

        actualizarBarraProgreso();
        estadoTest.haRespondido = false;
        // Limpiar estado anterior
        feedbackEl.innerHTML = '';
        feedbackEl.classList.remove('visible', 'correcto', 'incorrecto');
        opcionesEl.innerHTML = '';
        siguienteBtn.classList.add('oculto');

        // Reiniciar animación
        preguntaWrapper.classList.remove('fade-out', 'fade-in');

        if (estadoTest.preguntaActualIndex >= estadoTest.preguntasDelTest.length) {
            finalizarTest();
            return;
        }

        // Cargar pregunta y opciones
        const preguntaData = estadoTest.preguntasDelTest[estadoTest.preguntaActualIndex];
        preguntaEl.innerText = `${estadoTest.preguntaActualIndex + 1}. ${preguntaData.pregunta}`;

        // Hacemos la pregunta focusable y movemos el foco a ella
        preguntaEl.setAttribute('tabindex', '-1');
        preguntaEl.focus();

        // Se eliminó el barajado de opciones para mantener la consistencia con respuestas como "A y B son correctas"
        const prefijos = ['a) ', 'b) ', 'c) ', 'd) '];
        preguntaData.opciones.forEach((opcion, index) => {
            const boton = document.createElement('button');
            boton.innerText = prefijos[index] + opcion;
            boton.addEventListener('click', () => seleccionarRespuesta(boton, opcion, preguntaData.respuestaCorrecta));
            opcionesEl.appendChild(boton);
        });

        // Aplica animación de entrada
        preguntaWrapper.classList.add('fade-in');
    }

    // Restaura la UI para una pregunta que ya fue respondida
    function restaurarRespuesta() {
        const preguntaData = estadoTest.preguntasDelTest[estadoTest.preguntaActualIndex];
        const respuestaCorrecta = preguntaData.respuestaCorrecta;
        const ultimaRespuestaFallada = estadoTest.preguntasFalladas.find(p => p.preguntaData.pregunta === preguntaData.pregunta);

        if (ultimaRespuestaFallada) {
            seleccionarRespuesta(null, ultimaRespuestaFallada.respuestaUsuario, respuestaCorrecta);
        } else {
            seleccionarRespuesta(null, respuestaCorrecta, respuestaCorrecta);
        }
    }

    // Función que se ejecuta al hacer clic en una opción
    function seleccionarRespuesta(botonSeleccionado, opcionSeleccionada, respuestaCorrecta) {
        if (estadoTest.haRespondido) return; // Evita múltiples respuestas
        estadoTest.haRespondido = true;

        const esCorrecto = opcionSeleccionada === respuestaCorrecta;
        const preguntaActual = estadoTest.preguntasDelTest[estadoTest.preguntaActualIndex];

        // Mostrar feedback visual
        if (esCorrecto) {
            if (botonSeleccionado) botonSeleccionado.classList.add('correcto');
            estadoTest.puntuacion++;
            estadoTest.aciertos++;
            feedbackEl.innerHTML = `&#10003; ¡Correcto!`;
            feedbackEl.classList.add('visible', 'correcto');
            // Si se acierta una pregunta que estaba en la lista de fallos, se elimina
            eliminarFalloPersistente(preguntaActual);
        } else {
            if (botonSeleccionado) botonSeleccionado.classList.add('incorrecto');
            // Evitar duplicados en preguntasFalladas al restaurar
            if (!estadoTest.preguntasFalladas.some(p => p.preguntaData.pregunta === preguntaActual.pregunta)) {
                estadoTest.preguntasFalladas.push({
                    preguntaData: preguntaActual,
                    respuestaUsuario: opcionSeleccionada
                });
            }

            // Guardar el fallo de forma persistente
            guardarFalloPersistente(preguntaActual);

            estadoTest.fallos++;
            estadoTest.puntuacion = parseFloat((estadoTest.puntuacion - 0.33).toFixed(2));
            feedbackEl.innerHTML = `&#10007; Incorrecto. La respuesta correcta es: <strong>${respuestaCorrecta}</strong>`;
            feedbackEl.classList.add('visible', 'incorrecto');
        }

        // Marcar la respuesta correcta siempre
        Array.from(opcionesEl.children).forEach(btn => {
            // Si estamos restaurando, el botón seleccionado puede ser null.
            // En ese caso, lo buscamos por su texto.
            if (!botonSeleccionado && btn.innerText === opcionSeleccionada) {
                botonSeleccionado = btn;
                botonSeleccionado.classList.add(esCorrecto ? 'correcto' : 'incorrecto');
            }
            if (btn.innerText === respuestaCorrecta) {
                // Solo añade la clase si no es el que ya la tiene
                if (!btn.classList.contains('correcto')) {
                    btn.classList.add('correcto');
                }
                // Añadimos un aria-label para dar contexto al lector de pantalla
                btn.setAttribute('aria-label', btn.innerText + '. Respuesta correcta.');
            }
            btn.disabled = true; // Deshabilitar todos los botones
        });

        // Mostrar el botón de siguiente pregunta
        siguienteBtn.innerText = (estadoTest.preguntaActualIndex < estadoTest.preguntasDelTest.length - 1) ? 'Siguiente Pregunta' : 'Finalizar Test';
        siguienteBtn.classList.remove('oculto');
        siguienteBtn.setAttribute('aria-label', siguienteBtn.innerText); // Mejora de accesibilidad

        // Si es la última pregunta, ocultamos el botón de finalizar de la cabecera para evitar redundancia
        if (estadoTest.preguntaActualIndex === estadoTest.preguntasDelTest.length - 1) {
            finalizarAhoraBtn.classList.add('oculto');
        }

        // Guardar el estado después de cada respuesta
        guardarEstado();
    }

    function finalizarTest() {
        preguntaEl.innerText = '¡Has completado el test!';
        limpiarEstado(); // Limpiamos el estado al finalizar
        opcionesEl.innerHTML = '';
        progresoTextoEl.innerText = 'Test Finalizado';
        feedbackEl.classList.remove('correcto', 'incorrecto');

        // Aseguramos que la puntuación no sea negativa
        const puntuacionFinal = Math.max(0, estadoTest.puntuacion).toFixed(2);

        const recordActual = parseFloat(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
        let mensajePuntuacion = `Tu puntuación final es: <strong>${puntuacionFinal} puntos</strong>.<br>Aciertos: ${estadoTest.aciertos} | Fallos: ${estadoTest.fallos}`;

        if (estadoTest.puntuacion > recordActual) {
            localStorage.setItem(HIGH_SCORE_KEY, estadoTest.puntuacion);
            mensajePuntuacion += `<br>¡Nuevo récord!`;
            mostrarRecord(); // Actualiza el texto del récord visible
        }
        feedbackEl.innerHTML = mensajePuntuacion;
        feedbackEl.classList.add('visible', 'final');
        // Asegurarse de que el foco vaya al mensaje final para accesibilidad
        feedbackEl.setAttribute('tabindex', '-1');
        feedbackEl.focus();

        siguienteBtn.classList.add('oculto');
        actualizarBotonRepaso();

        // Mostrar botones finales
        reiniciarBtn.classList.remove('oculto');
        if (estadoTest.preguntasFalladas.length > 0) {
            repasarFallosBtn.classList.remove('oculto');
            mostrarRevision(); // Llamamos a la función para mostrar los fallos
        }
        finalizarAhoraBtn.classList.add('oculto');
    }

    function actualizarBarraProgreso() {
        const progreso = (estadoTest.preguntaActualIndex) / estadoTest.preguntasDelTest.length;
        barraProgresoEl.style.transform = `scaleX(${progreso})`;
        progresoTextoEl.innerText = `Pregunta ${estadoTest.preguntaActualIndex + 1} de ${estadoTest.preguntasDelTest.length}`;
    }

    function mostrarRecord() {
        // Usamos parseFloat y toFixed para mostrar siempre dos decimales
        const record = parseFloat(localStorage.getItem(HIGH_SCORE_KEY) || 0).toFixed(2);
        recordTextoEl.innerText = `Récord: ${record}`;
    }

    function mostrarRevision() {
        revisionFallosEl.innerHTML = ''; // Limpiar revisión anterior
        if (estadoTest.preguntasFalladas.length === 0) return;

        revisionFallosEl.classList.remove('oculto');
        const titulo = document.createElement('h2');
        titulo.innerText = 'Revisión de fallos';
        revisionFallosEl.appendChild(titulo);

        estadoTest.preguntasFalladas.forEach(item => {
            const divItem = document.createElement('div');
            divItem.classList.add('item-revision');
            divItem.innerHTML = `
                <p><strong>Pregunta:</strong> ${item.preguntaData.pregunta}</p>
                <p style="color: var(--color-incorrecto-texto);"><strong>Tu respuesta:</strong> ${item.respuestaUsuario}</p>
                <p style="color: var(--color-correcto-texto);"><strong>Respuesta correcta:</strong> ${item.preguntaData.respuestaCorrecta}</p>
            `;
            revisionFallosEl.appendChild(divItem);
        });
    }

    // --- Lógica de Repaso de Fallos ---
    function iniciarRepasoFallos(fallosDelTest) {
        let indicesFallos;
        if (fallosDelTest) {
            // Repasar solo los fallos del test actual
            indicesFallos = fallosDelTest.map(item => todasLasPreguntas.findIndex(p => p.pregunta === item.preguntaData.pregunta));
        } else {
            // Repasar todos los fallos guardados
            const fallosGuardados = JSON.parse(localStorage.getItem(FAILED_QUESTIONS_KEY) || '[]');
            indicesFallos = [...new Set(fallosGuardados)]; // Usar Set para eliminar duplicados
        }

        if (indicesFallos.length === 0) {
            alert('¡Felicidades! No tienes preguntas falladas para repasar.');
            return;
        }

        const preguntasParaRepasar = indicesFallos.map(index => todasLasPreguntas[index]);
        iniciarTest('repaso', preguntasParaRepasar);
    }

    function guardarFalloPersistente(preguntaFallada) {
        const indiceGlobal = todasLasPreguntas.findIndex(p => p.pregunta === preguntaFallada.pregunta);
        if (indiceGlobal === -1) return;

        const fallosGuardados = JSON.parse(localStorage.getItem(FAILED_QUESTIONS_KEY) || '[]');
        if (!fallosGuardados.includes(indiceGlobal)) {
            fallosGuardados.push(indiceGlobal);
            localStorage.setItem(FAILED_QUESTIONS_KEY, JSON.stringify(fallosGuardados));
        }
    }

    function eliminarFalloPersistente(preguntaAcertada) {
        const indiceGlobal = todasLasPreguntas.findIndex(p => p.pregunta === preguntaAcertada.pregunta);
        if (indiceGlobal === -1) return;

        let fallosGuardados = JSON.parse(localStorage.getItem(FAILED_QUESTIONS_KEY) || '[]');
        if (fallosGuardados.includes(indiceGlobal)) {
            fallosGuardados = fallosGuardados.filter(i => i !== indiceGlobal);
            localStorage.setItem(FAILED_QUESTIONS_KEY, JSON.stringify(fallosGuardados));
        }
    }

    function actualizarBotonRepaso() {
        const fallosGuardados = JSON.parse(localStorage.getItem(FAILED_QUESTIONS_KEY) || '[]');
        const numFallos = fallosGuardados.length;
        if (numFallos > 0) {
            contadorFallosEl.textContent = numFallos;
            iniciarRepasoFallosBtn.disabled = false;
        } else {
            contadorFallosEl.textContent = '';
            iniciarRepasoFallosBtn.disabled = true;
        }
    }

    // --- Manejo de Estado en localStorage ---

    function guardarEstado() {
        localStorage.setItem(TEST_STATE_KEY, JSON.stringify(estadoTest));
    }

    function cargarEstado() {
        const estadoGuardado = localStorage.getItem(TEST_STATE_KEY);
        if (estadoGuardado) {
            const estado = JSON.parse(estadoGuardado);
            estadoTest = estado;
        }
    }

    function limpiarEstado() {
        localStorage.removeItem(TEST_STATE_KEY);
    }

    // --- Registro de Event Listeners ---
    function registrarEventListeners() {
        // Event listener para el botón de siguiente pregunta
        siguienteBtn.addEventListener('click', () => {
            estadoTest.preguntaActualIndex++;
            mostrarPregunta();
        });

        // Event listener para el botón de reiniciar
        reiniciarBtn.addEventListener('click', () => {
            limpiarEstado(); // Limpia el estado del test en curso
            mostrarVistaInicio(); // Vuelve al menú principal
        });

        // Event listener para el botón de finalizar ahora
        finalizarAhoraBtn.addEventListener('click', finalizarTest);

        // --- Event listeners del menú de inicio ---
        iniciarNuevoTestBtn.addEventListener('click', () => iniciarTest());
        iniciarRepasoFallosBtn.addEventListener('click', () => iniciarRepasoFallos());

        iniciarTestImprescindibleBtn.addEventListener('click', async () => {
            try {
                const preguntasImprescindibles = await cargarPreguntasImprescindibles();
                if (preguntasImprescindibles.length > 0) {
                    iniciarTest('imprescindible', preguntasImprescindibles);
                } else {
                    alert('No se han podido cargar las preguntas imprescindibles. Revisa que el archivo "preguntas_imprescindibles.json" exista y no esté vacío.');
                }
            } catch (error) {
                alert('Error al cargar las preguntas imprescindibles. Revisa la consola (F12) para más detalles.');
            }
        });

        // Event listener para el botón de repasar fallos del test finalizado
        repasarFallosBtn.addEventListener('click', () => {
            // Pasamos las preguntas falladas del test actual para repasarlas inmediatamente
            iniciarRepasoFallos(estadoTest.preguntasFalladas);
        });

        // Event listener para el botón de cambio de tema
        themeToggleBtn.addEventListener('click', cambiarTema);
    }

    // Iniciar la aplicación
    inicializarApp();

    // --- Registro del Service Worker ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js') // Ruta relativa
                .then(registration => {
                    console.log('Service Worker registrado con éxito:', registration);
                })
                .catch(error => {
                    console.log('Error en el registro del Service Worker:', error);
                });
        });
    }
});
