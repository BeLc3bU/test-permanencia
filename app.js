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
    const NUMERO_PREGUNTAS_TEST = 20;

    let preguntasDelTestActual = [];
    let preguntasFalladas = [];
    let preguntaActualIndex = 0;
    let haRespondido = false;
    let puntuacion = 0;
    let aciertos = 0;
    let fallos = 0;

    // Función para iniciar o reiniciar el test
    function iniciarTest() {
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
        const preguntasBarajadas = [...preguntas];
        barajarArray(preguntasBarajadas);
        preguntasDelTestActual = preguntasBarajadas.slice(0, NUMERO_PREGUNTAS_TEST);

        mostrarRecord();
        mostrarPregunta();
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
            finalizarTest();
            return;
        }

        // Cargar pregunta y opciones
        const preguntaData = preguntasDelTestActual[preguntaActualIndex];
        preguntaEl.innerText = `${preguntaActualIndex + 1}. ${preguntaData.pregunta}`;

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

    // Función que se ejecuta al hacer clic en una opción
    function seleccionarRespuesta(botonSeleccionado, opcionSeleccionada, respuestaCorrecta) {
        if (haRespondido) return; // Evita múltiples respuestas
        haRespondido = true;

        const esCorrecto = opcionSeleccionada === respuestaCorrecta;

        // Mostrar feedback visual
        if (esCorrecto) {
            botonSeleccionado.classList.add('correcto');
            puntuacion++;
            aciertos++;
            feedbackEl.innerHTML = `&#10003; ¡Correcto!`;
            feedbackEl.classList.add('visible', 'correcto');
        } else {
            botonSeleccionado.classList.add('incorrecto');
            fallos++;
            preguntasFalladas.push({
                preguntaData: preguntasDelTestActual[preguntaActualIndex],
                respuestaUsuario: opcionSeleccionada
            });
            puntuacion -= 0.33;
            feedbackEl.innerHTML = `&#10007; Incorrecto. La respuesta correcta es: <strong>${respuestaCorrecta}</strong>`;
            feedbackEl.classList.add('visible', 'incorrecto');
        }

        // Marcar la respuesta correcta siempre
        Array.from(opcionesEl.children).forEach(btn => {
            if (btn.innerText === respuestaCorrecta) {
                btn.classList.add('correcto');
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
    }

    function finalizarTest() {
        preguntaEl.innerText = '¡Has completado el test!';
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
        const progreso = ((preguntaActualIndex) / preguntasDelTestActual.length) * 100;
        barraProgresoEl.style.width = `${progreso}%`;
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

    // Event listener para el botón de siguiente pregunta
    siguienteBtn.addEventListener('click', () => {
        preguntaActualIndex++;
        mostrarPregunta();
    });

    // Event listener para el botón de reiniciar
    reiniciarBtn.addEventListener('click', iniciarTest);

    // Event listener para el botón de finalizar ahora
    finalizarAhoraBtn.addEventListener('click', finalizarTest);

    // Iniciar el test
    iniciarTest();
});
