const HIGH_SCORE_KEY = 'testPermanenciaHighScore';
const UNSEEN_QUESTIONS_KEY = 'testPermanenciaUnseenQuestions';
const FAILED_QUESTIONS_KEY = 'testPermanenciaFailedQuestions';
const TEST_STATE_KEY = 'testPermanenciaState';
const EXAMEN_2022_STATE_KEY = 'testExamen2022State';
const EXAMEN_2024_STATE_KEY = 'testExamen2024State';
const IMPRESCINDIBLE_TEST_STATE_KEY = 'testImprescindibleState';
const THEME_KEY = 'testPermanenciaTheme';
const NUMERO_PREGUNTAS_TEST = 20;

let todasLasPreguntas = [];
let preguntasNoVistasIndices = [];

let estadoTest = null;

function resetEstadoTest(modo) {
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
}

function getEstadoKey(modo) {
    if (modo === 'imprescindible') return IMPRESCINDIBLE_TEST_STATE_KEY;
    if (modo === 'examen2024') return EXAMEN_2024_STATE_KEY;
    if (modo === 'examen2022') return EXAMEN_2022_STATE_KEY;
    return TEST_STATE_KEY;
}

async function cargarArchivoPreguntas(nombreArchivo) {
    try {
        const response = await fetch(nombreArchivo);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error al cargar el archivo ${nombreArchivo}:`, error);
        throw new Error(`No se pudo cargar ${nombreArchivo}`);
    }
}

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

function barajarArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export async function cargarTodasLasPreguntas() {
    const [preguntasNormales, preguntasImprescindibles, preguntasExamen2022, preguntasExamen2024] = await Promise.all([
        cargarArchivoPreguntas('preguntas.json'),
        cargarArchivoPreguntas('preguntas_imprescindibles.json'),
        cargarArchivoPreguntas('examen_2022.json'),
        cargarArchivoPreguntas('examen_2024.json')
    ]);
    const preguntasUnificadas = [...preguntasNormales, ...preguntasImprescindibles, ...preguntasExamen2022, ...preguntasExamen2024];
    todasLasPreguntas = unificarYEliminarDuplicados(preguntasUnificadas);

    if (todasLasPreguntas.length === 0) {
        throw new Error("No se cargaron preguntas.");
    }

    const indicesGuardados = localStorage.getItem(UNSEEN_QUESTIONS_KEY);
    if (indicesGuardados) {
        preguntasNoVistasIndices = JSON.parse(indicesGuardados);
    } else {
        preguntasNoVistasIndices = todasLasPreguntas.map((_, index) => index);
        barajarArray(preguntasNoVistasIndices);
        localStorage.setItem(UNSEEN_QUESTIONS_KEY, JSON.stringify(preguntasNoVistasIndices));
    }
}

export function prepararTest(modo, preguntasPersonalizadas = []) {
    // Limpia cualquier sesión anterior del mismo modo antes de empezar una nueva.
    limpiarEstado(modo);

    resetEstadoTest(modo);

    if (modo === 'repaso' || modo === 'examen2024' || modo === 'examen2022') {
        estadoTest.preguntasDelTest = preguntasPersonalizadas;
    } else if (modo === 'imprescindible') {
        barajarArray(preguntasPersonalizadas);
        estadoTest.preguntasDelTest = preguntasPersonalizadas;
    } else { // modo 'normal'
        if (preguntasNoVistasIndices.length === 0) {
            alert('¡Enhorabuena! Has visto todas las preguntas. El ciclo de preguntas se reiniciará.');
            preguntasNoVistasIndices = todasLasPreguntas.map((_, index) => index);
        }

        barajarArray(preguntasNoVistasIndices);
        const numeroDePreguntasParaTest = Math.min(preguntasNoVistasIndices.length, NUMERO_PREGUNTAS_TEST);
        const indicesParaElTest = preguntasNoVistasIndices.slice(0, numeroDePreguntasParaTest);
        estadoTest.preguntasDelTest = indicesParaElTest.map(index => todasLasPreguntas[index]);

        const nuevosIndicesNoVistos = preguntasNoVistasIndices.filter(index => !indicesParaElTest.includes(index));
        localStorage.setItem(UNSEEN_QUESTIONS_KEY, JSON.stringify(nuevosIndicesNoVistos));
        preguntasNoVistasIndices = nuevosIndicesNoVistos;
    }
    return estadoTest;
}

export function procesarRespuesta(opcionSeleccionada) {
    if (estadoTest.haRespondido) return null;
    estadoTest.haRespondido = true;

    const preguntaActual = estadoTest.preguntasDelTest[estadoTest.preguntaActualIndex];
    const esCorrecto = opcionSeleccionada === preguntaActual.respuestaCorrecta;

    if (esCorrecto) {
        estadoTest.puntuacion++;
        estadoTest.aciertos++;
        eliminarFalloPersistente(preguntaActual);
    } else {
        estadoTest.puntuacion = parseFloat((estadoTest.puntuacion - 0.33).toFixed(2));
        estadoTest.fallos++;
        if (!estadoTest.preguntasFalladas.some(p => p.preguntaData.pregunta === preguntaActual.pregunta)) {
            estadoTest.preguntasFalladas.push({
                preguntaData: preguntaActual,
                respuestaUsuario: opcionSeleccionada
            });
        }
        guardarFalloPersistente(preguntaActual);
    }
    // Solo guardamos el estado automáticamente si no es la primera pregunta.
    // Esto evita que un test recién iniciado se guarde como una sesión para "continuar".
    if (estadoTest.preguntaActualIndex > 0) {
        guardarEstado();
    }
    return { esCorrecto, respuestaCorrecta: preguntaActual.respuestaCorrecta };
}

export function avanzarPregunta() {
    if (!estadoTest) return null;
    estadoTest.preguntaActualIndex++;
    estadoTest.haRespondido = false;
    if (estadoTest.preguntaActualIndex >= estadoTest.preguntasDelTest.length) {
        const { resultado } = finalizarTest();
        estadoTest = null; // El estado se destruye aquí, tras finalizar.
        return resultado;
    }
    return { finalizado: false, estado: estadoTest };
}

function finalizarTest() {
    if (!estadoTest) return { resultado: null, estadoFinalizado: null };

    const puntuacionFinal = Math.max(0, estadoTest.puntuacion).toFixed(2);
    const recordActual = parseFloat(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
    let nuevoRecord = false;
    if (estadoTest.puntuacion > recordActual) {
        localStorage.setItem(HIGH_SCORE_KEY, estadoTest.puntuacion);
        nuevoRecord = true;
    }
    const estadoFinalizado = { ...estadoTest }; // Copiamos el estado antes de limpiarlo.
    limpiarEstado(estadoTest.modo);
    const resultado = { finalizado: true, puntuacionFinal, aciertos: estadoFinalizado.aciertos, fallos: estadoFinalizado.fallos, nuevoRecord, preguntasFalladas: estadoFinalizado.preguntasFalladas };
    return { resultado, estadoFinalizado };
}

export function finalizarTestForzado() {
    if (!estadoTest) return null;
    const { resultado } = finalizarTest();
    estadoTest = null; // El estado se destruye aquí, tras finalizar.
    return resultado;
}

export function guardarEstado() {
    if (!estadoTest) return;
    const key = getEstadoKey(estadoTest.modo);
    localStorage.setItem(key, JSON.stringify(estadoTest));
}

export function cargarEstado(modo) {
    const key = getEstadoKey(modo);
    const estadoGuardado = localStorage.getItem(key);
    if (estadoGuardado) {
        estadoTest = JSON.parse(estadoGuardado);
        return estadoTest;
    }
    return null;
}

export function limpiarEstado(modo) {
    const key = getEstadoKey(modo);
    localStorage.removeItem(key);
    if (estadoTest && estadoTest.modo === modo) {
        estadoTest = null;
    }
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

export const storage = {
    getHighScore: () => parseFloat(localStorage.getItem(HIGH_SCORE_KEY) || 0).toFixed(2),
    getFailedQuestionsIndices: () => JSON.parse(localStorage.getItem(FAILED_QUESTIONS_KEY) || '[]'),
    getTheme: () => localStorage.getItem(THEME_KEY),
    setTheme: (theme) => localStorage.setItem(THEME_KEY, theme),
    getSavedSession: (modo) => localStorage.getItem(getEstadoKey(modo)),
    getAllQuestions: () => todasLasPreguntas,
    getTestState: () => estadoTest,
    cargarArchivoPreguntas
};