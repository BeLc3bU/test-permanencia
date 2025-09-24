window.addEventListener('load', () => {
    // Elementos del DOM
    const preguntaEl = document.getElementById('pregunta-actual');
    const opcionesEl = document.getElementById('opciones-respuesta');
    const feedbackEl = document.getElementById('feedback');
    const siguienteBtn = document.getElementById('siguiente-pregunta');
    const reiniciarBtn = document.getElementById('reiniciar-test');
    const finalizarAhoraBtn = document.getElementById('finalizar-ahora-btn');
    const barraProgresoEl = document.getElementById('barra-progreso');
    const progresoTextoEl = document.getElementById('progreso-texto');
    const revisionFallosEl = document.getElementById('revision-fallos');
    const recordTextoEl = document.getElementById('record-texto');

    // Constante para la clave en localStorage
    const HIGH_SCORE_KEY = 'testPermanenciaHighScore';
    const TEST_STATE_KEY = 'testPermanenciaState';
    const NUMERO_PREGUNTAS_TEST = 20;

    let todasLasPreguntas = [];
    let preguntasDelTestActual = [];
    let preguntasFalladas = [];
    let preguntaActualIndex = 0;
    let haRespondido = false;
    let puntuacion = 0;
    let aciertos = 0;
    let fallos = 0;

    // Función para iniciar o reiniciar el test
    async function inicializarApp() {
        // 1. Cargar las preguntas y mantener el cargador visible
        todasLasPreguntas = await cargarPreguntas();

        // 2. Una vez cargadas, decidir si restaurar o empezar de nuevo
        if (localStorage.getItem(TEST_STATE_KEY)) {
            if (confirm('Hemos encontrado un test sin finalizar. ¿Quieres continuar donde lo dejaste?')) {
                restaurarSesion();
            } else {
                limpiarEstado(); // El usuario quiere empezar de nuevo
                nuevoTest();
            }
        } else {
            // Si no hay estado guardado, empieza un test nuevo.
            nuevoTest();
        }
    }

    function nuevoTest() {
        preguntaActualIndex = 0;
        puntuacion = 0;
        preguntasFalladas = [];
        aciertos = 0;
        fallos = 0;
        haRespondido = false;
        reiniciarBtn.classList.add('oculto');
        finalizarAhoraBtn.classList.remove('oculto');
        revisionFallosEl.classList.add('oculto'); // Ocultar revisión al inicio

        // Barajamos todas las preguntas y seleccionamos las primeras 20
        const preguntasBarajadas = [...todasLasPreguntas];
        barajarArray(preguntasBarajadas);
        preguntasDelTestActual = preguntasBarajadas.slice(0, NUMERO_PREGUNTAS_TEST);

        mostrarRecord();
        mostrarPregunta();
    }

    function restaurarSesion() {
        cargarEstado();
        mostrarRecord();
        // Si el usuario ya había respondido la pregunta antes de cerrar, mostramos la pregunta con la respuesta ya marcada.
        // Si no, simplemente mostramos la pregunta.
        mostrarPregunta();
        if (haRespondido) {
            restaurarRespuesta();
        }
    }

    /**
     * Carga las preguntas desde el archivo JSON.
     * @returns {Promise<Array>} Una promesa que resuelve con el array de preguntas.
     */
    async function cargarPreguntas() {
        try {
            const response = await fetch('preguntas.json');
            return await response.json();
        } catch (error) {
            console.error('Error al cargar las preguntas:', error);
            // Si hay un error, lo mostramos en el contenedor principal y detenemos la carga.
            preguntaEl.innerHTML = `<p style="color: var(--color-incorrecto-texto); text-align: center; font-size: 1.2rem;"><b>Error Crítico:</b> No se pudieron cargar las preguntas. Revisa la consola para más detalles (F12).</p>`;
            // Devolvemos una promesa que nunca se resuelve para detener la ejecución.
            return new Promise(() => {});
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
    function mostrarPregunta() {
        actualizarBarraProgreso();
        haRespondido = false;
        // Limpiar estado anterior
        feedbackEl.innerHTML = '';
        feedbackEl.classList.remove('visible', 'correcto', 'incorrecto');
        opcionesEl.innerHTML = '';
        siguienteBtn.classList.add('oculto');

        if (preguntaActualIndex >= preguntasDelTestActual.length) {
            // Asegurarse de que el foco vaya al mensaje final
            feedbackEl.setAttribute('tabindex', '-1');
            feedbackEl.focus();
            finalizarTest();
            return;
        }

        // Cargar pregunta y opciones
        const preguntaData = preguntasDelTestActual[preguntaActualIndex];
        preguntaEl.innerText = `${preguntaActualIndex + 1}. ${preguntaData.pregunta}`;
        
        // Hacemos la pregunta focusable y movemos el foco a ella
        preguntaEl.setAttribute('tabindex', '-1');
        preguntaEl.focus();

        // Creamos una copia de las opciones y las barajamos
        const opcionesBarajadas = [...preguntaData.opciones];
        barajarArray(opcionesBarajadas);

        opcionesBarajadas.forEach(opcion => {
            const boton = document.createElement('button');
            boton.innerText = opcion;
            boton.addEventListener('click', () => seleccionarRespuesta(boton, opcion, preguntaData.respuestaCorrecta));
            opcionesEl.appendChild(boton);
        });
    }

    // Restaura la UI para una pregunta que ya fue respondida
    function restaurarRespuesta() {
        const preguntaData = preguntasDelTestActual[preguntaActualIndex];
        const respuestaCorrecta = preguntaData.respuestaCorrecta;
        const ultimaRespuestaFallada = preguntasFalladas.find(p => p.preguntaData.pregunta === preguntaData.pregunta);

        if (ultimaRespuestaFallada) {
            seleccionarRespuesta(null, ultimaRespuestaFallada.respuestaUsuario, respuestaCorrecta);
        } else {
            seleccionarRespuesta(null, respuestaCorrecta, respuestaCorrecta);
        }
    }
    // Función que se ejecuta al hacer clic en una opción
    function seleccionarRespuesta(botonSeleccionado, opcionSeleccionada, respuestaCorrecta) {
        if (haRespondido) return; // Evita múltiples respuestas
        haRespondido = true;

        const esCorrecto = opcionSeleccionada === respuestaCorrecta;

        // Mostrar feedback visual
        if (esCorrecto) {
            if (botonSeleccionado) botonSeleccionado.classList.add('correcto');
            puntuacion++;
            aciertos++;
            feedbackEl.innerHTML = `&#10003; ¡Correcto!`;
            feedbackEl.classList.add('visible', 'correcto');
        } else {
            if (botonSeleccionado) botonSeleccionado.classList.add('incorrecto');
            // Evitar duplicados en preguntasFalladas al restaurar
            if (!preguntasFalladas.some(p => p.preguntaData.pregunta === preguntasDelTestActual[preguntaActualIndex].pregunta)) {
                preguntasFalladas.push({
                    preguntaData: preguntasDelTestActual[preguntaActualIndex],
                    respuestaUsuario: opcionSeleccionada
                });
            }
            fallos++;
            puntuacion -= 0.33;
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
        siguienteBtn.innerText = (preguntaActualIndex < preguntasDelTestActual.length - 1) ? 'Siguiente Pregunta' : 'Finalizar Test';
        siguienteBtn.classList.remove('oculto');

        // Si es la última pregunta, ocultamos el botón de finalizar de la cabecera para evitar redundancia
        if (preguntaActualIndex === preguntasDelTestActual.length - 1) {
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
        const puntuacionFinal = Math.max(0, puntuacion).toFixed(2);

        const recordActual = parseFloat(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
        let mensajePuntuacion = `Tu puntuación final es: <strong>${puntuacionFinal} puntos</strong>.<br>Aciertos: ${aciertos} | Fallos: ${fallos}`;

        if (puntuacion > recordActual) {
            localStorage.setItem(HIGH_SCORE_KEY, puntuacion);
            mensajePuntuacion += `<br>¡Nuevo récord!`;
            mostrarRecord(); // Actualiza el texto del récord visible
        }
        feedbackEl.innerHTML = mensajePuntuacion;
        feedbackEl.classList.add('visible', 'final');
        siguienteBtn.classList.add('oculto');

        mostrarRevision(); // Llamamos a la función para mostrar los fallos
        reiniciarBtn.classList.remove('oculto');
        finalizarAhoraBtn.classList.add('oculto');
    }

    function actualizarBarraProgreso() {
        const progreso = (preguntaActualIndex) / preguntasDelTestActual.length;
        barraProgresoEl.style.transform = `scaleX(${progreso})`;
        progresoTextoEl.innerText = `Pregunta ${preguntaActualIndex + 1} de ${preguntasDelTestActual.length}`;
    }

    function mostrarRecord() {
        // Usamos parseFloat y toFixed para mostrar siempre dos decimales
        const record = parseFloat(localStorage.getItem(HIGH_SCORE_KEY) || 0).toFixed(2);
        recordTextoEl.innerText = `Récord: ${record}`;
    }

    function mostrarRevision() {
        revisionFallosEl.innerHTML = ''; // Limpiar revisión anterior
        if (preguntasFalladas.length === 0) return;

        revisionFallosEl.classList.remove('oculto');
        const titulo = document.createElement('h2');
        titulo.innerText = 'Revisión de fallos';
        revisionFallosEl.appendChild(titulo);

        preguntasFalladas.forEach(item => {
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

    // --- Funciones para manejar el estado en localStorage ---

    function guardarEstado() {
        const estado = {
            preguntasDelTestActual,
            preguntaActualIndex,
            puntuacion,
            aciertos,
            fallos,
            preguntasFalladas,
            haRespondido
        };
        localStorage.setItem(TEST_STATE_KEY, JSON.stringify(estado));
    }

    function cargarEstado() {
        const estadoGuardado = localStorage.getItem(TEST_STATE_KEY);
        if (estadoGuardado) {
            const estado = JSON.parse(estadoGuardado);
            preguntasDelTestActual = estado.preguntasDelTestActual;
            preguntaActualIndex = estado.preguntaActualIndex;
            puntuacion = estado.puntuacion;
            aciertos = estado.aciertos;
            fallos = estado.fallos;
            preguntasFalladas = estado.preguntasFalladas;
            haRespondido = estado.haRespondido;
        }
    }

    function limpiarEstado() {
        localStorage.removeItem(TEST_STATE_KEY);
    }

    // Event listener para el botón de siguiente pregunta
    siguienteBtn.addEventListener('click', () => {
        preguntaActualIndex++;
        mostrarPregunta();
    });

    // Event listener para el botón de reiniciar
    reiniciarBtn.addEventListener('click', () => {
        limpiarEstado();
        nuevoTest();
    });

    // Event listener para el botón de finalizar ahora
    finalizarAhoraBtn.addEventListener('click', finalizarTest);

    // Iniciar el test
    inicializarApp();
});
