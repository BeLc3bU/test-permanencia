import { storage } from './storage.js';
import { questionBank, loadAllQuestions as loadQuestions } from './questionManager.js';

let currentTestSession = null;

export const cargarTodasLasPreguntas = loadQuestions;

export function prepararTest(modo, opciones = {}) {
    limpiarEstado(modo);

    currentTestSession = {
        preguntasDelTest: [],
        preguntasFalladas: [],
        preguntaActualIndex: 0,
        puntuacion: 0,
        aciertos: 0,
        fallos: 0,
        haRespondido: false,
        modo: modo,
    };

    const { preguntasPersonalizadas = [], numPreguntas = 20 } = opciones;

    if (['repaso', 'examen2024', 'examen2022'].includes(modo)) {
        currentTestSession.preguntasDelTest = preguntasPersonalizadas;
    } else { // modo 'normal'
        let preguntasNoVistasIndices = questionBank.getUnseenIndices();
        if (preguntasNoVistasIndices.length === 0) {
            alert('¡Enhorabuena! Has visto todas las preguntas. El ciclo de preguntas se reiniciará.');
            questionBank.resetUnseen();
            questionBank.shuffle(questionBank.getUnseenIndices()); // Barajar tras reiniciar
            preguntasNoVistasIndices = questionBank.getUnseenIndices();
        }

        questionBank.shuffle(preguntasNoVistasIndices);
        const numeroDePreguntasParaTest = Math.min(preguntasNoVistasIndices.length, numPreguntas);
        const indicesParaElTest = preguntasNoVistasIndices.slice(0, numeroDePreguntasParaTest);
        currentTestSession.preguntasDelTest = indicesParaElTest.map(index => questionBank.getAll()[index]);

        const nuevosIndicesNoVistos = preguntasNoVistasIndices.filter(index => !indicesParaElTest.includes(index));
        questionBank.setUnseenIndices(nuevosIndicesNoVistos);
    }
    return currentTestSession;
}

export function procesarRespuesta(opcionSeleccionada) {
    if (!currentTestSession || currentTestSession.haRespondido) return null;
    currentTestSession.haRespondido = true;

    const preguntaActual = currentTestSession.preguntasDelTest[currentTestSession.preguntaActualIndex];
    if (!preguntaActual) {
        console.error('Pregunta actual no encontrada');
        return null;
    }

    const esCorrecto = opcionSeleccionada === preguntaActual.respuestaCorrecta;
    const indiceGlobal = questionBank.getAll().findIndex(p => p.pregunta === preguntaActual.pregunta);
    
    if (indiceGlobal === -1) {
        console.warn('Pregunta no encontrada en el banco global');
        return null;
    }

    if (esCorrecto) {
        currentTestSession.puntuacion++;
        currentTestSession.aciertos++;
        storage.removeFailedQuestion(indiceGlobal);
    } else {
        currentTestSession.puntuacion = parseFloat((currentTestSession.puntuacion - 0.33).toFixed(2));
        currentTestSession.fallos++;
        if (!currentTestSession.preguntasFalladas.some(p => p.preguntaData.pregunta === preguntaActual.pregunta)) {
            currentTestSession.preguntasFalladas.push({
                preguntaData: preguntaActual,
                respuestaUsuario: opcionSeleccionada
            });
        }
        storage.addFailedQuestion(indiceGlobal);
    }
    if (currentTestSession.preguntaActualIndex > 0) {
        guardarEstado();
    }
    return { esCorrecto, respuestaCorrecta: preguntaActual.respuestaCorrecta };
}

export function avanzarPregunta() {
    if (!currentTestSession) return null;
    currentTestSession.preguntaActualIndex++;
    currentTestSession.haRespondido = false;
    if (currentTestSession.preguntaActualIndex >= currentTestSession.preguntasDelTest.length) {
        const { resultado } = finalizarTest();
        currentTestSession = null;
        return resultado;
    }
    return { finalizado: false, estado: currentTestSession };
}

function finalizarTest() {
    if (!currentTestSession) return { resultado: null, estadoFinalizado: null };

    const puntuacionFinal = Math.max(0, currentTestSession.puntuacion).toFixed(2);
    const recordActual = storage.getHighScore();
    let nuevoRecord = false;
    if (currentTestSession.puntuacion > recordActual) {
        storage.setHighScore(currentTestSession.puntuacion);
        nuevoRecord = true;
    }
    const estadoFinalizado = { ...currentTestSession };
    limpiarEstado(currentTestSession.modo);
    const resultado = { finalizado: true, puntuacionFinal, aciertos: estadoFinalizado.aciertos, fallos: estadoFinalizado.fallos, nuevoRecord, preguntasFalladas: estadoFinalizado.preguntasFalladas };
    return { resultado, estadoFinalizado };
}

export function finalizarTestForzado() {
    if (!currentTestSession) return null;
    const { resultado } = finalizarTest();
    currentTestSession = null;
    return resultado;
}

export function guardarEstado() {
    if (!currentTestSession) return;
    storage.setSession(currentTestSession.modo, currentTestSession);
}

export function cargarEstado(modo) {
    const estadoGuardado = storage.getSession(modo);
    if (estadoGuardado) {
        currentTestSession = estadoGuardado;
        return currentTestSession;
    }
    return null;
}

export function limpiarEstado(modo) {
    storage.removeSession(modo);
    if (currentTestSession && currentTestSession.modo === modo) {
        currentTestSession = null;
    }
}

// Exportamos el objeto storage para que app.js pueda seguir accediendo a él
// y el questionBank para obtener las preguntas.
export { storage, questionBank, getTestState };

function getTestState() { return currentTestSession; }