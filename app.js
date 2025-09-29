window.addEventListener('load', () => {
    // Elementos del DOM
    const inicioMenuEl = document.getElementById('inicio-menu');
    const contadorFallosEl = document.getElementById('contador-fallos');
    const testContentEl = document.getElementById('test-content');
    const iniciarNuevoTestBtn = document.getElementById('iniciar-nuevo-test-btn');
    const iniciarRepasoFallosBtn = document.getElementById('iniciar-repaso-fallos-btn');
    const iniciarTestImprescindibleBtn = document.getElementById('iniciar-test-imprescindible-btn');
    const seguirMasTardeBtn = document.getElementById('seguir-mas-tarde-btn');
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
    const IMPRESCINDIBLE_TEST_STATE_KEY = 'testImprescindibleState';
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
        modo: 'normal', // Añadimos el modo al estado
    };

    // --- Inicialización de la aplicación ---
    async function inicializarApp() {
        inicializarTema();
        // Manejar acciones de atajos (shortcuts)
        manejarAccionesDeAtajos();

        try {
            // Unificamos todas las preguntas (normales e imprescindibles) en un solo array
            const preguntasNormales = await cargarArchivoPreguntas('preguntas.json');
            const preguntasImprescindibles = await cargarArchivoPreguntas('preguntas_imprescindibles.json');
            
            // Combinamos y eliminamos duplicados, dando prioridad a las normales si hay alguna igual.
            const preguntasUnificadas = [...preguntasNormales, ...preguntasImprescindibles];
            todasLasPreguntas = unificarYEliminarDuplicados(preguntasUnificadas);

            if (todasLasPreguntas.length > 0) { 
                inicializarPoolPreguntasNoVistas();
            }
        } catch (error) {
            console.error("Fallo crítico al cargar las preguntas principales. Algunas funciones pueden no estar disponibles.", error);
            // Deshabilitar botones que dependen de `todasLasPreguntas`
            iniciarNuevoTestBtn.disabled = true;
            iniciarTestImprescindibleBtn.disabled = true;
            iniciarRepasoFallosBtn.disabled = true;
            iniciarNuevoTestBtn.title = "Error al cargar preguntas.";
            iniciarTestImprescindibleBtn.title = "Error al cargar preguntas.";
            iniciarRepasoFallosBtn.title = "Error al cargar preguntas.";
        } finally {
            // Estos se ejecutan siempre, para que el resto de la UI funcione
            actualizarBotonRepaso();
            registrarEventListeners(); // Mover el registro de listeners aquí
            
            // Lógica unificada para restaurar sesión
            const sesionNormalGuardada = localStorage.getItem(TEST_STATE_KEY);
            const sesionImprescindibleGuardada = localStorage.getItem(IMPRESCINDIBLE_TEST_STATE_KEY);

            if (sesionNormalGuardada) {
                if (confirm('Hemos encontrado un test normal sin finalizar. ¿Quieres continuar donde lo dejaste?')) {
                    mostrarVistaTest();
                    restaurarSesion('normal');
                } else {
                    limpiarEstado('normal');
                    mostrarVistaInicio();
                }
            } else if (sesionImprescindibleGuardada) {
                if (confirm('Hemos encontrado un test imprescindible sin finalizar. ¿Quieres continuar donde lo dejaste?')) {
                    mostrarVistaTest();
                    restaurarSesion('imprescindible');
                } else {
                    limpiarEstado('imprescindible');
                    mostrarVistaInicio();
                }
            } else {
                mostrarVistaInicio();
            }
        }
    }

    /**
     * Comprueba si la app se ha abierto desde un atajo y ejecuta la acción correspondiente.
     */
    async function manejarAccionesDeAtajos() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');

        if (!action) return;

        // Espera a que la inicialización principal termine
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));

        // Simula el clic en el botón correspondiente
        document.querySelector(`[data-action="${action}"]`)?.click();
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
            modo: modo,
        };

        reiniciarBtn.classList.add('oculto');
        finalizarAhoraBtn.classList.remove('oculto');
        repasarFallosBtn.classList.add('oculto');
        revisionFallosEl.classList.add('oculto');

        seguirMasTardeBtn.classList.remove('oculto'); // Habilitado para todos los modos

        if (modo !== 'normal') {
            if (modo === 'imprescindible') {
                barajarArray(preguntasPersonalizadas); // Barajamos las preguntas imprescindibles
            }
            // Para el modo 'repaso', mantenemos el orden.
            estadoTest.preguntasDelTest = preguntasPersonalizadas;
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

    function restaurarSesion(modo) {
        cargarEstado(modo);
        mostrarRecord();
        mostrarPregunta();
        if (estadoTest.haRespondido) {
            restaurarRespuesta();
        }
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
     * Combina un array de preguntas y elimina duplicados basándose en el texto de la pregunta.
     * @param {Array} preguntas - Array de objetos de pregunta.
     * @returns {Array} Un nuevo array sin preguntas duplicadas.
     */
    function unificarYEliminarDuplicados(preguntas) {
        const preguntasUnicas = new Map();
        preguntas.forEach(p => {
            const clave = p.pregunta.trim().toLowerCase();
            if (!preguntasUnicas.has(clave)) {
                preguntasUnicas.set(clave, p);
            }
        });
        return Array.from(preguntasUnicas.values());
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
            // Quitar la animación de "shake" si existiera de la pregunta anterior
            const contenedorTestEl = document.getElementById('contenedor-test');
            if (contenedorTestEl.classList.contains('shake')) {
                contenedorTestEl.classList.remove('shake');
            }
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
            boton.addEventListener('click', () => seleccionarRespuesta(opcion, preguntaData.respuestaCorrecta));
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
            seleccionarRespuesta(ultimaRespuestaFallada.respuestaUsuario, respuestaCorrecta, false); // No auto-avanzar al restaurar
        } else {
            seleccionarRespuesta(respuestaCorrecta, respuestaCorrecta, false); // No auto-avanzar al restaurar
        }
    }

    // Función que se ejecuta al hacer clic en una opción
    function seleccionarRespuesta(opcionSeleccionada, respuestaCorrecta, autoAvanzar = true) {
        if (estadoTest.haRespondido) return; // Evita múltiples respuestas
        estadoTest.haRespondido = true;

        const esCorrecto = opcionSeleccionada === respuestaCorrecta;
        const preguntaActual = estadoTest.preguntasDelTest[estadoTest.preguntaActualIndex];

        // Encontrar el botón que el usuario ha seleccionado (o que corresponde a la opción)
        const botonSeleccionado = Array.from(opcionesEl.children).find(btn => btn.innerText.endsWith(opcionSeleccionada));


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
            // Animación de "shake" para el error
            document.getElementById('contenedor-test').classList.add('shake');
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
            if (btn.innerText.endsWith(respuestaCorrecta)) {
                // Solo añade la clase si no es el que ya la tiene
                if (!btn.classList.contains('correcto')) {
                    btn.classList.add('correcto');
                }
                // Añadimos un aria-label para dar contexto al lector de pantalla
                btn.setAttribute('aria-label', btn.innerText + '. Respuesta correcta.');
            }
            btn.disabled = true; // Deshabilitar todos los botones
        });

        // Guardar el estado después de cada respuesta
        guardarEstado();

        // Avance automático
        if (autoAvanzar) {
            setTimeout(() => {
                estadoTest.preguntaActualIndex++;
                mostrarPregunta();
            }, esCorrecto ? 1000 : 2000); // Más tiempo para leer la corrección si se falla
        } else {
            // Si no hay auto-avance (al restaurar), mostramos el botón de siguiente
            siguienteBtn.innerText = (estadoTest.preguntaActualIndex < estadoTest.preguntasDelTest.length - 1) ? 'Siguiente Pregunta' : 'Finalizar Test';
            siguienteBtn.classList.remove('oculto');
            siguienteBtn.setAttribute('aria-label', siguienteBtn.innerText);

            if (estadoTest.preguntaActualIndex === estadoTest.preguntasDelTest.length - 1) {
                finalizarAhoraBtn.classList.add('oculto');
            }
        }
    }

    function finalizarTest() {
        preguntaEl.innerText = '¡Has completado el test!';
        limpiarEstado(estadoTest.modo); // Limpiamos el estado del modo correspondiente
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
        seguirMasTardeBtn.classList.add('oculto');
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
        const key = estadoTest.modo === 'imprescindible' ? IMPRESCINDIBLE_TEST_STATE_KEY : TEST_STATE_KEY;
        localStorage.setItem(key, JSON.stringify(estadoTest));
    }

    function cargarEstado(modo) {
        const key = modo === 'imprescindible' ? IMPRESCINDIBLE_TEST_STATE_KEY : TEST_STATE_KEY;
        const estadoGuardado = localStorage.getItem(key);
        if (estadoGuardado) {
            const estado = JSON.parse(estadoGuardado);
            estadoTest = estado;
        }
    }

    function limpiarEstado(modo) {
        const key = modo === 'imprescindible' ? IMPRESCINDIBLE_TEST_STATE_KEY : TEST_STATE_KEY;
        localStorage.removeItem(key);
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
            // El estado ya se limpia al finalizar, aquí solo volvemos al inicio
            mostrarVistaInicio(); // Vuelve al menú principal
        });

        // Event listener para el botón de finalizar ahora
        finalizarAhoraBtn.addEventListener('click', finalizarTest);

        // --- Event listeners del menú de inicio ---
        iniciarNuevoTestBtn.addEventListener('click', () => iniciarTest());
        iniciarRepasoFallosBtn.addEventListener('click', () => iniciarRepasoFallos());

        iniciarTestImprescindibleBtn.addEventListener('click', async () => {
            // La lógica de restauración ya se maneja al inicio. Este botón ahora siempre inicia un nuevo test.
            const preguntasImprescindibles = todasLasPreguntas.filter(p => p.imprescindible);
            if (preguntasImprescindibles.length > 0) {
                iniciarTest('imprescindible', preguntasImprescindibles);
            } else {
                alert('No se encontraron preguntas imprescindibles. Asegúrate de que estén correctamente marcadas en el archivo JSON.');
            }
        });

        // Event listener para el botón de repasar fallos del test finalizado
        repasarFallosBtn.addEventListener('click', () => {
            // Pasamos las preguntas falladas del test actual para repasarlas inmediatamente
            iniciarRepasoFallos(estadoTest.preguntasFalladas);
        });

        // Event listener para el botón de seguir más tarde
        seguirMasTardeBtn.addEventListener('click', () => {
            guardarEstado();
            mostrarVistaInicio();
        });

        // Event listener para el botón de cambio de tema
        themeToggleBtn.addEventListener('click', cambiarTema);

        // Event listener para atajos de teclado
        document.addEventListener('keydown', (e) => {
            // Solo actuar si el test está visible
            if (testContentEl.classList.contains('oculto') || estadoTest.haRespondido) {
                return;
            }

            const preguntaActual = estadoTest.preguntasDelTest[estadoTest.preguntaActualIndex];
            let opcionSeleccionada = null;

            switch (e.key.toLowerCase()) {
                case 'a':
                case '1':
                    opcionSeleccionada = preguntaActual.opciones[0];
                    break;
                case 'b':
                case '2':
                    opcionSeleccionada = preguntaActual.opciones[1];
                    break;
                case 'c':
                case '3':
                    opcionSeleccionada = preguntaActual.opciones[2];
                    break;
                case 'd':
                case '4':
                    opcionSeleccionada = preguntaActual.opciones[3];
                    break;
            }

            if (opcionSeleccionada) {
                seleccionarRespuesta(opcionSeleccionada, preguntaActual.respuestaCorrecta);
            }
        });
    }

    // Iniciar la aplicación
    inicializarApp();

    // --- Registro del Service Worker ---
    function registrarServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('Service Worker no es soportado por este navegador.');
            return;
        }

        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration);

                // Esta lógica se encarga de detectar si hay un nuevo SW esperando.
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('Nueva versión del Service Worker encontrada, instalando...', newWorker);

                    newWorker.addEventListener('statechange', () => {
                        // Si el estado es 'installed', el nuevo SW está listo y esperando para activarse.
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('Nueva versión lista para ser activada.');
                            mostrarBannerActualizacion(newWorker);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Error en el registro del Service Worker:', error);
            });

        // Lógica para la sincronización periódica en segundo plano
        async function registrarSincronizacionPeriodica() {
            if ('periodicSync' in registration) {
                try {
                    // Pedir permiso al usuario
                    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
                    if (status.state === 'granted') {
                        // Si el permiso está concedido, registramos la sincronización.
                        await registration.periodicSync.register('get-latest-questions', {
                            minInterval: 24 * 60 * 60 * 1000, // Mínimo 1 día
                        });
                        console.log('Sincronización periódica registrada.');
                    }
                } catch (error) {
                    console.error('No se pudo registrar la sincronización periódica:', error);
                }
            }
        }
        registrarSincronizacionPeriodica();
    }

    function mostrarBannerActualizacion(worker) {
        const banner = document.createElement('div');
        banner.id = 'update-banner';
        banner.innerHTML = `
            <span>Hay una nueva versión disponible.</span>
            <button id="update-now-btn">Actualizar</button>
        `;
        document.body.appendChild(banner);

        document.getElementById('update-now-btn').addEventListener('click', () => {
            // Enviamos un mensaje al nuevo SW para que se active.
            worker.postMessage({ type: 'SKIP_WAITING' });
            // Ocultamos el banner y recargamos la página para que el nuevo SW tome el control.
            banner.style.display = 'none';
            window.location.reload();
        });
    }

    registrarServiceWorker();
});
