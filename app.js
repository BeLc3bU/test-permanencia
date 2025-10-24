import { storage, questionBank, cargarTodasLasPreguntas, prepararTest, procesarRespuesta, avanzarPregunta, finalizarTestForzado, guardarEstado, cargarEstado, limpiarEstado, getTestState } from './state.js';
import { UI } from './ui.js';

let isProcessing = false; // Variable de bloqueo para evitar dobles clics y race conditions
const ui = new UI(); // Instancia única de la clase UI
window.appUI = ui; // Hacer UI disponible globalmente para manejo de errores

// Manejo de errores globales
window.addEventListener('error', (event) => {
    console.error('Error global capturado:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
    
    // Mostrar mensaje amigable al usuario para errores no críticos
    if (event.error && event.error.name !== 'ValidationError') {
        const ui = window.appUI; // UI disponible globalmente
        if (ui && ui.showConfirmationModal) {
            ui.showConfirmationModal({
                title: 'Error Inesperado',
                message: 'Ha ocurrido un error inesperado. Por favor, recarga la página.',
                onConfirm: () => window.location.reload(),
                onCancel: () => {}
            });
        }
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada no manejada:', event.reason);
    event.preventDefault(); // Prevenir que aparezca en consola
});

window.addEventListener('load', () => {
    // --- Inicialización de la aplicación ---
    async function inicializarApp() {
        ui.initializeTheme(storage.getTheme());
        ui.initializeMuteState(storage.getMuteState());
        ui.initializeNumPreguntas(storage.getNumPreguntas());
        registrarEventListeners();
        try {
            await cargarTodasLasPreguntas(); // Ahora carga todos los exámenes
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
            { nombre: 'examen 2022', clave: 'examen2022' },
            { nombre: 'examen 2025ET', clave: 'examen2025ET' },
            { nombre: 'imprescindible', clave: 'imprescindible' },
            { nombre: 'simulacro 1', clave: 'simulacro1' },
            { nombre: 'simulacro 2', clave: 'simulacro2' },
            { nombre: 'simulacro 3', clave: 'simulacro3' }
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
                ui.resetTestUI(estadoGuardado);
            ui.updateRecord(storage.getHighScore());
                mostrarPreguntaActual(estadoGuardado);
            if (estadoGuardado.haRespondido) {
                    const preguntaData = estadoGuardado.preguntasDelTest[estadoGuardado.preguntaActualIndex] || {};
                    const ultimaRespuestaFallada = estadoGuardado.preguntasFalladas.find(p => p.preguntaData.pregunta === preguntaData?.pregunta);
                const opcionSeleccionada = ultimaRespuestaFallada ? ultimaRespuestaFallada.respuestaUsuario : preguntaData.respuestaCorrecta;
                const esCorrecto = !ultimaRespuestaFallada;
                ui.showAnswerFeedback(opcionSeleccionada, esCorrecto, preguntaData.respuestaCorrecta);
            }
        }
    }

    async function manejarAccionesDeAtajos() {
        const action = new URLSearchParams(window.location.search).get('action');
        if (action) {
            const button = document.querySelector(`[data-action="${action}"]`);
            if (button) {
                button.click();
            } else {
                console.warn(`No se encontró botón para la acción: ${action}`);
            }
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
        if (estadoActual.preguntasDelTest.length > 0) {
            ui.showTestView();
            ui.resetTestUI(estadoActual);
            ui.updateRecord(storage.getHighScore());
            mostrarPreguntaActual(estadoActual);
        } else {
            alert(`No hay preguntas disponibles para el modo "${modo}".`);
            ui.showStartView();
        }
    }

    function iniciarTestNormal() {
        const numPreguntas = ui.elements.numPreguntasSelect.value === 'Infinity' ? Infinity : parseInt(ui.elements.numPreguntasSelect.value, 10);
        iniciarNuevoTest('normal', { numPreguntas });
    }

    function iniciarRepasoFallos(preguntasFalladasTest) {
        let indicesFallos;
        // Si se llama desde la pantalla de resultados, se pasan las preguntas falladas de esa sesión.
        if (preguntasFalladasTest) {
            // Usamos el questionBank optimizado para obtener los índices globales de forma eficiente.
            indicesFallos = preguntasFalladasTest.map(item => {
                // Usamos el índice global que ya guardamos en el estado del test.
                const index = item.preguntaData.indiceGlobal;
                return index !== undefined ? index : -1;
            }).filter(index => index !== -1);
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
    
    function iniciarTestImprescindible() {
        const preguntasImprescindibles = questionBank.getAll().filter(p => p.imprescindible === true);
        iniciarNuevoTest('imprescindible', { preguntasPersonalizadas: preguntasImprescindibles });
    }

    function iniciarTestExamen(examenId) {
        const preguntasExamen = questionBank.getQuestionsByExam(examenId);
        if (preguntasExamen.length > 0) {
            iniciarNuevoTest(examenId.toString(), { preguntasPersonalizadas: preguntasExamen });
        } else {
            alert(`No se encontraron preguntas para el Examen ${examenId}. El archivo podría estar vacío o mal configurado.`);
        }
    }

    function mostrarPreguntaActual(estadoActual) {
        if (!estadoActual) return;
        const preguntaData = estadoActual.preguntasDelTest[estadoActual.preguntaActualIndex];
        ui.renderQuestion(preguntaData, estadoActual.preguntaActualIndex, estadoActual.preguntasDelTest.length, (opcion) => manejarSeleccionRespuesta(opcion, estadoActual));
    }

    async function manejarSeleccionRespuesta(opcionSeleccionada, estadoActual) {
        if (isProcessing) return;
        isProcessing = true;

        const resultadoRespuesta = procesarRespuesta(opcionSeleccionada, estadoActual);
        if (!resultadoRespuesta) {
            isProcessing = false;
            return;
        }

        ui.showAnswerFeedback(opcionSeleccionada, resultadoRespuesta.esCorrecto, resultadoRespuesta.respuestaCorrecta);
        actualizarContadoresUI();

        const delay = resultadoRespuesta.esCorrecto ? 1000 : 2000;
        setTimeout(() => {
            const { nuevoEstado, resultadoFinal } = avanzarPregunta(estadoActual);
            if (resultadoFinal) {
                ui.showTestResults(resultadoFinal, estadoActual.modo, iniciarRepasoFallos, () => { ui.showStartView(); });
                actualizarContadoresUI();
            } else {
                mostrarPreguntaActual(nuevoEstado);
            }
            isProcessing = false;
        }, delay);
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
        ui.elements.iniciarTestImprescindibleBtn.addEventListener('click', iniciarTestImprescindible);
        ui.elements.iniciarExamen2022Btn.addEventListener('click', () => iniciarTestExamen(2022));
        ui.elements.iniciarExamen2025ETBtn.addEventListener('click', () => iniciarTestExamen('2025ET'));
        ui.elements.iniciarSimulacro1Btn.addEventListener('click', () => iniciarTestExamen('simulacro1'));
        ui.elements.iniciarSimulacro2Btn.addEventListener('click', () => iniciarTestExamen('simulacro2'));
        ui.elements.iniciarSimulacro3Btn.addEventListener('click', () => iniciarTestExamen('simulacro3'));

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
            const estado = getTestState();
            if (!estado || estado.haRespondido) return;

            const preguntaActual = estado.preguntasDelTest[estado.preguntaActualIndex];
            let opcionSeleccionada = null;

            const keyMap = { 'a': 0, '1': 0, 'b': 1, '2': 1, 'c': 2, '3': 2, 'd': 3, '4': 3 };
            const index = keyMap[e.key.toLowerCase()];

            if (index !== undefined && preguntaActual.opciones[index]) {
                manejarSeleccionRespuesta(preguntaActual.opciones[index], estado);
            }
        });
    }

    function manejarFinalizarTestForzado() {
        if (isProcessing) return;
        isProcessing = true;
        const resultadoAvance = finalizarTestForzado();
        if (resultadoAvance) {
            ui.showTestResults(resultadoAvance, getTestState().modo, iniciarRepasoFallos, () => { ui.showStartView(); });
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
