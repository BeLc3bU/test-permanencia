import * as state from './state.js';
import * as ui from './ui.js';

let isProcessing = false; // Variable de bloqueo para evitar dobles clics y race conditions

window.addEventListener('load', () => {
    // --- Inicialización de la aplicación ---
    async function inicializarApp() {
        ui.initializeTheme(state.storage.getTheme());
        registrarEventListeners();
        
        try {
            await state.cargarTodasLasPreguntas();
            actualizarContadoresUI();
            await manejarAccionesDeAtajos();
            intentarRestaurarSesion();
        } catch (error) {
            console.error("Fallo crítico al cargar las preguntas. Los tests no estarán disponibles.", error);
            [ui.elements.iniciarNuevoTestBtn, ui.elements.iniciarTestImprescindibleBtn, ui.elements.iniciarRepasoFallosBtn].forEach(btn => {
                btn.disabled = true;
                btn.title = "Error al cargar preguntas.";
            });
        }
    }

    function intentarRestaurarSesion() {
        const modosPosibles = [
            { nombre: 'normal', clave: 'normal' },
            { nombre: 'imprescindible', clave: 'imprescindible' },
            { nombre: 'examen 2024', clave: 'examen2024' },
            { nombre: 'examen 2022', clave: 'examen2022' }
        ];

        for (const modo of modosPosibles) {
            if (state.storage.getSavedSession(modo.clave)) {
                if (confirm(`Hemos encontrado un test ${modo.nombre} sin finalizar. ¿Quieres continuar donde lo dejaste?`)) {
                    restaurarSesion(modo.clave);
                    return;
                } else {
                    state.limpiarEstado(modo.clave);
                }
            }
        }
        ui.showStartView();
    }

    function restaurarSesion(modo) {
        const estadoGuardado = state.cargarEstado(modo);
        if (estadoGuardado) {
            ui.showTestView();
            ui.resetTestUI();
            ui.updateRecord(state.storage.getHighScore());
            mostrarPreguntaActual();
            if (estadoGuardado.haRespondido) {
                const preguntaData = estadoGuardado.preguntasDelTest[estadoGuardado.preguntaActualIndex];
                const ultimaRespuestaFallada = estadoGuardado.preguntasFalladas.find(p => p.preguntaData.pregunta === preguntaData.pregunta);
                const opcionSeleccionada = ultimaRespuestaFallada ? ultimaRespuestaFallada.respuestaUsuario : preguntaData.respuestaCorrecta;
                const esCorrecto = !ultimaRespuestaFallada;
                ui.showAnswerFeedback(opcionSeleccionada, esCorrecto, preguntaData.respuestaCorrecta);
            }
        }
    }

    async function manejarAccionesDeAtajos() {
        const action = new URLSearchParams(window.location.search).get('action');
        if (action) {
            document.querySelector(`[data-action="${action}"]`)?.click();
        }
    }

    function actualizarContadoresUI() {
        ui.updateFailedQuestionsButton(state.storage.getFailedQuestionsIndices().length);
        ui.updateRecord(state.storage.getHighScore());
    }

    // --- Lógica del Flujo del Test ---
    function iniciarNuevoTest(modo, preguntasPersonalizadas = []) {
        const estadoActual = state.prepararTest(modo, preguntasPersonalizadas);
        ui.showTestView();
        ui.resetTestUI();
        ui.updateRecord(state.storage.getHighScore());
        mostrarPreguntaActual(estadoActual);
    }

    function mostrarPreguntaActual() {
        const estadoActual = state.storage.getTestState();
        if (!estadoActual) return;

        const preguntaData = estadoActual.preguntasDelTest[estadoActual.preguntaActualIndex];
        ui.renderQuestion(preguntaData, estadoActual.preguntaActualIndex, estadoActual.preguntasDelTest.length, manejarSeleccionRespuesta);
    }

    async function manejarSeleccionRespuesta(opcionSeleccionada) {
        if (isProcessing) return; // Evitar procesamiento múltiple
        isProcessing = true;

        const resultadoRespuesta = state.procesarRespuesta(opcionSeleccionada);
        if (!resultadoRespuesta) {
            isProcessing = false;
            return;
        }

        ui.showAnswerFeedback(opcionSeleccionada, resultadoRespuesta.esCorrecto, resultadoRespuesta.respuestaCorrecta);
        actualizarContadoresUI();

        const delay = resultadoRespuesta.esCorrecto ? 1000 : 2000;
        setTimeout(() => {
            const resultadoAvance = state.avanzarPregunta();
            if (resultadoAvance.finalizado) {
                ui.showTestResults(resultadoAvance, iniciarRepasoFallos, () => { ui.showStartView(); isProcessing = false; });
                actualizarContadoresUI();
            } else {
                mostrarPreguntaActual(); // Avanza a la siguiente pregunta automáticamente
                isProcessing = false; // Desbloquear después de renderizar la siguiente pregunta
            }
        }, delay);
    }

    function iniciarRepasoFallos(preguntasFalladasTest) {
        let indicesFallos;
        if (preguntasFalladasTest) {
            indicesFallos = preguntasFalladasTest.map(item => state.storage.getAllQuestions().findIndex(p => p.pregunta === item.preguntaData.pregunta));
        } else {
            indicesFallos = state.storage.getFailedQuestionsIndices();
        }

        if (indicesFallos.length === 0) {
            alert('¡Felicidades! No tienes preguntas falladas para repasar.');
            return;
        }

        const preguntasParaRepasar = indicesFallos.map(index => state.storage.getAllQuestions()[index]).filter(Boolean);
        iniciarNuevoTest('repaso', preguntasParaRepasar);
    }

    // --- Registro de Event Listeners ---
    function registrarEventListeners() {
        ui.elements.iniciarNuevoTestBtn.addEventListener('click', () => iniciarNuevoTest('normal'));
        ui.elements.iniciarRepasoFallosBtn.addEventListener('click', () => iniciarRepasoFallos());
        ui.elements.iniciarTestImprescindibleBtn.addEventListener('click', () => {
            const preguntasImprescindibles = state.storage.getAllQuestions().filter(p => p.imprescindible);
            if (preguntasImprescindibles.length > 0) {
                iniciarNuevoTest('imprescindible', preguntasImprescindibles);
            } else {
                alert('No se encontraron preguntas imprescindibles. Asegúrate de que estén correctamente marcadas en el archivo JSON.');
            }
        });

        ui.elements.iniciarExamen2024Btn.addEventListener('click', () => {
            const preguntasExamen = state.storage.getAllQuestions().filter(p => p.examen === '2024');
            if (preguntasExamen.length > 0) {
                iniciarNuevoTest('examen2024', preguntasExamen);
            } else {
                alert('No se encontraron preguntas para el Examen 2024. El archivo podría estar vacío o mal configurado.');
            }
        });

        ui.elements.iniciarExamen2022Btn.addEventListener('click', () => {
            const preguntasExamen = state.storage.getAllQuestions().filter(p => p.examen === '2022');
            if (preguntasExamen.length > 0) {
                iniciarNuevoTest('examen2022', preguntasExamen);
            } else {
                alert('No se encontraron preguntas para el Examen 2022. El archivo podría estar vacío o mal configurado.');
            }
        });

        ui.elements.seguirMasTardeBtn.addEventListener('click', () => {
            state.guardarEstado();
            ui.showStartView();
        });

        ui.elements.finalizarAhoraBtn.addEventListener('click', () => {
            if (isProcessing) return; // Evitar finalización múltiple
            isProcessing = true;

            const resultadoAvance = state.finalizarTestForzado();
            if (resultadoAvance && resultadoAvance.finalizado) {
                ui.showTestResults(resultadoAvance, iniciarRepasoFallos, () => { ui.showStartView(); isProcessing = false; });
                actualizarContadoresUI();
            }
        });

        ui.elements.themeToggleBtn.addEventListener('click', () => {
            const nuevoTema = ui.toggleTheme();
            state.storage.setTheme(nuevoTema);
        });

        document.addEventListener('keydown', (e) => {
            const estadoActual = state.storage.getTestState();
            if (!estadoActual || estadoActual.haRespondido) return;

            const preguntaActual = estadoActual.preguntasDelTest[estadoActual.preguntaActualIndex];
            let opcionSeleccionada = null;

            switch (e.key.toLowerCase()) {
                case 'a': case '1': opcionSeleccionada = preguntaActual.opciones[0]; break;
                case 'b': case '2': opcionSeleccionada = preguntaActual.opciones[1]; break;
                case 'c': case '3': opcionSeleccionada = preguntaActual.opciones[2]; break;
                case 'd': case '4': opcionSeleccionada = preguntaActual.opciones[3]; break;
            }

            if (opcionSeleccionada) manejarSeleccionRespuesta(opcionSeleccionada);
        });
    }

    inicializarApp();
    registrarServiceWorker();
});

// --- Registro del Service Worker (se mantiene fuera del flujo principal de la app) ---
function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker no es soportado por este navegador.');
        return;
    }

    navigator.serviceWorker.register('service-worker.js')
        .then(registration => {
            console.log('Service Worker registrado con éxito:', registration);

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('Nueva versión del Service Worker encontrada, instalando...', newWorker);

                newWorker.addEventListener('statechange', () => {
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
        worker.postMessage({ type: 'SKIP_WAITING' });
        banner.style.display = 'none';
        window.location.reload();
    });
}
