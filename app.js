import { storage, questionBank, cargarTodasLasPreguntas, prepararTest, procesarRespuesta, avanzarPregunta, finalizarTestForzado, guardarEstado, cargarEstado, limpiarEstado, getTestState } from './state.js';
import { UI } from './ui.js';

let isProcessing = false; // Variable de bloqueo para evitar dobles clics y race conditions
const ui = new UI(); // Instancia única de la clase UI

window.addEventListener('load', () => {
    // --- Inicialización de la aplicación ---
    async function inicializarApp() {
        ui.initializeTheme(storage.getTheme());
        ui.initializeMuteState(storage.getMuteState());
        ui.initializeNumPreguntas(storage.getNumPreguntas());
        registrarEventListeners();
        try {
            await cargarTodasLasPreguntas();
            actualizarContadoresUI();
            await manejarAccionesDeAtajos();
            intentarRestaurarSesion();
        } catch (error) {
            console.error("Fallo crítico al cargar las preguntas. Los tests no estarán disponibles.", error);
            [ui.elements.iniciarNuevoTestBtn, ui.elements.iniciarRepasoFallosBtn, ui.elements.iniciarExamen2024Btn, ui.elements.iniciarExamen2022Btn].forEach(btn => {
            if (btn) { // Comprobación de seguridad
                    btn.disabled = true;
                    btn.title = "Error al cargar preguntas.";
                }
            });
        }
    }

    function intentarRestaurarSesion() {
        const modosPosibles = [
            { nombre: 'normal', clave: 'normal' },
            { nombre: 'examen 2024', clave: 'examen2024' },
            { nombre: 'examen 2022', clave: 'examen2022' }
        ];

        for (const modo of modosPosibles) {
            if (storage.getSession(modo.clave)) {
                ui.showConfirmationModal({
                    title: 'Test sin finalizar',
                    message: `Hemos encontrado un test de "${modo.nombre}" sin finalizar. ¿Quieres continuar donde lo dejaste?`,
                    onConfirm: () => restaurarSesion(modo.clave),
                    onCancel: () => {
                        limpiarEstado(modo.clave);
                        ui.showStartView();
                    }
                });
                return; // Salimos del bucle para mostrar solo un modal a la vez
            }
        }
        ui.showStartView();
    }

    function restaurarSesion(modo) {
        const estadoGuardado = cargarEstado(modo);
        if (estadoGuardado) {
            ui.showTestView();
            ui.resetTestUI();
            ui.updateRecord(storage.getHighScore());
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
        ui.updateFailedQuestionsButton(storage.getFailedQuestionsIndices().length);
        ui.updateRecord(storage.getHighScore());
    }

    // --- Lógica del Flujo del Test ---
    function iniciarNuevoTest(modo, opciones) {
        limpiarEstado(modo); // Asegura que no haya sesiones previas conflictivas.
        const estadoActual = prepararTest(modo, opciones);
        ui.showTestView();
        ui.resetTestUI();
        ui.updateRecord(storage.getHighScore());
        mostrarPreguntaActual(estadoActual);
    }

    function mostrarPreguntaActual() {
        const estadoActual = getTestState(); // Corregido: Usar la función importada
        if (!estadoActual) return;

        const preguntaData = estadoActual.preguntasDelTest[estadoActual.preguntaActualIndex];
        ui.renderQuestion(preguntaData, estadoActual.preguntaActualIndex, estadoActual.preguntasDelTest.length, manejarSeleccionRespuesta);
    }

    function iniciarTestNormal() {
        const numPreguntas = ui.elements.numPreguntasSelect.value === 'Infinity' ? Infinity : parseInt(ui.elements.numPreguntasSelect.value, 10);
        iniciarNuevoTest('normal', { numPreguntas });
    }

    function iniciarTestExamen(anio) {
        const preguntasExamen = questionBank.getAll().filter(p => p.examen === anio.toString());
        if (preguntasExamen.length > 0) {
            iniciarNuevoTest(`examen${anio}`, { preguntasPersonalizadas: preguntasExamen });
        } else {
            alert(`No se encontraron preguntas para el Examen ${anio}. El archivo podría estar vacío o mal configurado.`);
        }
    }

    async function manejarSeleccionRespuesta(opcionSeleccionada) {
        if (isProcessing) return; // Evitar procesamiento múltiple
        isProcessing = true;

        const resultadoRespuesta = procesarRespuesta(opcionSeleccionada);
        if (!resultadoRespuesta) {
            isProcessing = false;
            return;
        }

        ui.showAnswerFeedback(opcionSeleccionada, resultadoRespuesta.esCorrecto, resultadoRespuesta.respuestaCorrecta);
        actualizarContadoresUI();

        const delay = resultadoRespuesta.esCorrecto ? 1000 : 2000;
        setTimeout(() => {
            const resultadoAvance = avanzarPregunta();
            if (resultadoAvance.finalizado) {
                ui.showTestResults(resultadoAvance, iniciarRepasoFallos, () => { ui.showStartView(); });
                actualizarContadoresUI();
                isProcessing = false; // Desbloquear al finalizar el test
            } else {
                mostrarPreguntaActual(); // Avanza a la siguiente pregunta automáticamente
            }
            // Se desbloquea después de que la siguiente pregunta se renderice o el test finalice
            if (!resultadoAvance.finalizado) isProcessing = false;
        }, delay);
    }

    function iniciarRepasoFallos(preguntasFalladasTest) {
        let indicesFallos;
        if (preguntasFalladasTest) {
            indicesFallos = preguntasFalladasTest.map(item => questionBank.getAll().findIndex(p => p.pregunta === item.preguntaData.pregunta));
        } else {
            indicesFallos = storage.getFailedQuestionsIndices();
        }

        if (indicesFallos.length === 0) {
            alert('¡Felicidades! No tienes preguntas falladas para repasar.');
            return;
        }

        const preguntasParaRepasar = indicesFallos.map(index => questionBank.getAll()[index]).filter(Boolean);
        iniciarNuevoTest('repaso', { preguntasPersonalizadas: preguntasParaRepasar });
    }

    function reiniciarProgresoCompleto() {
        questionBank.resetUnseen();
        storage.setFailedQuestionsIndices([]); // También limpiamos los fallos
        actualizarContadoresUI();
        alert('Tu progreso ha sido reiniciado.');
    }
    // --- Registro de Event Listeners ---
    function registrarEventListeners() {
        ui.elements.iniciarNuevoTestBtn.addEventListener('click', iniciarTestNormal);
        ui.elements.iniciarRepasoFallosBtn.addEventListener('click', () => iniciarRepasoFallos());
        ui.elements.iniciarExamen2024Btn.addEventListener('click', () => iniciarTestExamen(2024));
        ui.elements.iniciarExamen2022Btn.addEventListener('click', () => iniciarTestExamen(2022));

        ui.elements.numPreguntasSelect.addEventListener('change', (e) => {
            const num = e.target.value === 'Infinity' ? Infinity : parseInt(e.target.value, 10);
            storage.setNumPreguntas(num);
        });

        ui.elements.reiniciarProgresoBtn.addEventListener('click', () => {
            ui.showConfirmationModal({
                title: '¿Reiniciar Progreso?',
                message: 'Esta acción borrará tu historial de preguntas falladas y reiniciará el ciclo de preguntas no vistas. ¿Estás seguro?',
                onConfirm: () => {
                    reiniciarProgresoCompleto();
                }
            });
        });

        ui.elements.seguirMasTardeBtn.addEventListener('click', () => {
            guardarEstado();
            ui.showStartView();
        });

        ui.elements.finalizarAhoraBtn.addEventListener('click', () => {
            ui.showConfirmationModal({
                title: '¿Finalizar Test?',
                message: 'Tu progreso en este test se perderá. ¿Estás seguro de que quieres finalizar ahora?',
                onConfirm: manejarFinalizarTestForzado
            });
        });

        ui.elements.themeToggleBtn.addEventListener('click', () => {
            const nuevoTema = ui.toggleTheme();
            storage.setTheme(nuevoTema);
        });

        ui.elements.soundToggleBtn.addEventListener('click', () => {
            const isMuted = ui.toggleMute();
            storage.setMuteState(isMuted);
        });

        document.addEventListener('keydown', (e) => {
            const estadoActual = getTestState();
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

    function manejarFinalizarTestForzado() {
        if (isProcessing) return;
        isProcessing = true;
        const resultadoAvance = finalizarTestForzado();
        if (resultadoAvance && resultadoAvance.finalizado) {
            ui.showTestResults(resultadoAvance, iniciarRepasoFallos, () => { ui.showStartView(); });
            actualizarContadoresUI();
        }
        isProcessing = false;
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
    const banner = document.getElementById('update-banner');
    if (!banner) return;

    banner.classList.remove('oculto');

    document.getElementById('update-now-btn').addEventListener('click', () => {
        worker.postMessage({ type: 'SKIP_WAITING' });
        banner.classList.add('oculto');
        window.location.reload();
    });
}
