import { storage } from './storage.js';
import { questionBank, loadAllQuestions as loadQuestions } from './questionManager.js';

let currentTestSession = null;

export const cargarTodasLasPreguntas = loadQuestions;

/**
 * Prepara las preguntas para un test en modo 'normal'.
 * Selecciona preguntas no vistas de forma aleatoria.
 * @param {object} opciones - Opciones para el test, como numPreguntas.
 * @returns {Array<object>} - Un array de preguntas para el test.
 */
function prepararTestNormal(opciones) {
    const { numPreguntas = 20 } = opciones;
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

    const nuevosIndicesNoVistos = preguntasNoVistasIndices.filter(index => !indicesParaElTest.includes(index));
    questionBank.setUnseenIndices(nuevosIndicesNoVistos);

    return indicesParaElTest.map(index => questionBank.getAll()[index]);
}

/**
 * Prepara las preguntas para un test que usa una lista predefinida (repaso, examen).
 * @param {object} opciones - Opciones para el test, incluyendo preguntasPersonalizadas.
 * @returns {Array<object>} - Un array de preguntas para el test.
 */
function prepararTestPersonalizado(opciones) {
    const { preguntasPersonalizadas = [] } = opciones;
    return preguntasPersonalizadas;
}

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

    // Estrategias de preparación de test según el modo
    const preparadoresDeTest = {
        normal: prepararTestNormal,
        repaso: prepararTestPersonalizado,
        examen2022: prepararTestPersonalizado,
        examen2024: prepararTestPersonalizado,
        imprescindible: prepararTestPersonalizado,
        examen2025ET: prepararTestPersonalizado,
        simulacro1: prepararTestPersonalizado,
        simulacro2: prepararTestPersonalizado,
        simulacro3: prepararTestPersonalizado,
        // Se pueden añadir más modos aquí fácilmente
    };

    const preparador = preparadoresDeTest[modo] || preparadoresDeTest.normal;
    const preguntasSeleccionadas = preparador(opciones);

    currentTestSession.preguntasDelTest = preguntasSeleccionadas.map(p => ({
        ...p,
        indiceGlobal: questionBank.getIndex(p.pregunta)
    }));

    // Barajamos las preguntas para los modos que no son 'normal', ya que vienen en orden.
    if (modo !== 'normal') {
        questionBank.shuffle(currentTestSession.preguntasDelTest);
    }

    return currentTestSession;
}

export function procesarRespuesta(opcionSeleccionada, estadoActual) {
    if (!estadoActual || estadoActual.haRespondido) return null;
    estadoActual.haRespondido = true;

    const preguntaActual = estadoActual.preguntasDelTest[estadoActual.preguntaActualIndex];
    if (!preguntaActual) {
        console.error('Pregunta actual no encontrada');
        return null;
    }

    const esCorrecto = opcionSeleccionada === preguntaActual.respuestaCorrecta;    
    const { indiceGlobal } = preguntaActual;

    if (esCorrecto) {
        estadoActual.puntuacion++;
        estadoActual.aciertos++;
        storage.removeFailedQuestion(indiceGlobal);
    } else {
        estadoActual.puntuacion = parseFloat((estadoActual.puntuacion - 0.33).toFixed(2));
        estadoActual.fallos++;
        if (!estadoActual.preguntasFalladas.some(p => p.preguntaData.pregunta === preguntaActual.pregunta)) {
            estadoActual.preguntasFalladas.push({
                preguntaData: preguntaActual,
                respuestaUsuario: opcionSeleccionada
            });
        }
        storage.addFailedQuestion(indiceGlobal);
    }
    if (estadoActual.preguntaActualIndex > 0) {
        guardarEstado(estadoActual);
    }
    return { esCorrecto, respuestaCorrecta: preguntaActual.respuestaCorrecta };
}

export function avanzarPregunta(estadoActual) {
    if (!estadoActual) return { nuevoEstado: null, resultadoFinal: null };
    estadoActual.preguntaActualIndex++;
    estadoActual.haRespondido = false;
    if (estadoActual.preguntaActualIndex >= estadoActual.preguntasDelTest.length) {
        const resultadoFinal = finalizarTest(estadoActual);
        return { nuevoEstado: null, resultadoFinal };
    }
    return { nuevoEstado: estadoActual, resultadoFinal: null };
}

function finalizarTest(estadoAFinalizar) {
    if (!estadoAFinalizar) return null;

    const puntuacionFinal = Math.max(0, estadoAFinalizar.puntuacion).toFixed(2);
    const recordActual = storage.getHighScore();
    let nuevoRecord = false;
    if (estadoAFinalizar.puntuacion > recordActual) {
        storage.setHighScore(estadoAFinalizar.puntuacion);
        nuevoRecord = true;
    }
    const estadoFinalizado = { ...estadoAFinalizar };
    limpiarEstado(estadoAFinalizar.modo);
    const resultado = { finalizado: true, puntuacionFinal, aciertos: estadoFinalizado.aciertos, fallos: estadoFinalizado.fallos, nuevoRecord, preguntasFalladas: estadoFinalizado.preguntasFalladas };
    return resultado;
}

export function finalizarTestForzado() {
    const estadoActual = getTestState();
    if (!estadoActual) return null;
    const resultado = finalizarTest(estadoActual);
    currentTestSession = null;
    return resultado;
}

export function guardarEstado(estado) {
    if (estado) storage.setSession(estado.modo, estado);
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