import { storage } from './storage.js';

let allQuestions = [];
let questionIndexMap = new Map();
let unseenQuestionIndices = [];

async function loadQuestionFile(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error al cargar el archivo ${fileName}:`, error);
        throw new Error(`No se pudo cargar ${fileName}`);
    }
}

function unifyAndDeduplicate(questions) {
    const uniqueQuestions = new Map();
    questions.forEach(q => {
        const key = q.pregunta.trim().toLowerCase();
        if (!uniqueQuestions.has(key)) {
            uniqueQuestions.set(key, q);
        }
    });
    return Array.from(uniqueQuestions.values());
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export async function loadAllQuestions() {
    // Carga todos los archivos de preguntas al inicio para que estén disponibles para todos los modos.
    const filesToLoad = ['preguntas.json', 'examen_2022.json', 'examen_2024.json', 'examen_2025ET.json', 'simulacro_1.json', 'simulacro_2.json', 'simulacro_3.json'];

    const questionSets = await Promise.all(
        filesToLoad.map(file => loadQuestionFile(file))
    );

    const unifiedQuestions = questionSets.flat();
    allQuestions = unifyAndDeduplicate(unifiedQuestions);

    // Crear un mapa para búsqueda de índices O(1)
    allQuestions.forEach((q, index) => {
        questionIndexMap.set(q.pregunta, index);
    });

    if (allQuestions.length === 0) {
        throw new Error("No se cargaron preguntas.");
    }

    const savedIndices = storage.getUnseenQuestionIndices();
    if (savedIndices) {
        unseenQuestionIndices = savedIndices;
    } else {
        unseenQuestionIndices = allQuestions.map((_, index) => index);
        shuffleArray(unseenQuestionIndices);
        storage.setUnseenQuestionIndices(unseenQuestionIndices);
    }
}

export const questionBank = {
    getAll: () => allQuestions,
    getQuestionsByExam: (examId) => allQuestions.filter(p => p.examen === examId.toString()),
    getIndex: (preguntaTexto) => questionIndexMap.get(preguntaTexto),
    getUnseenIndices: () => unseenQuestionIndices,
    setUnseenIndices: (indices) => {
        unseenQuestionIndices = indices;
        storage.setUnseenQuestionIndices(indices);
    },
    shuffle: shuffleArray,
    resetUnseen: () => {
        const allIndices = allQuestions.map((_, index) => index);
        shuffleArray(allIndices);
        questionBank.setUnseenIndices(allIndices);
        console.log('Progreso de preguntas no vistas reiniciado.');
    }
};