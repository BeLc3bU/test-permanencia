const KEYS = {
    HIGH_SCORE: 'testPermanenciaHighScore',
    UNSEEN_QUESTIONS: 'testPermanenciaUnseenQuestions',
    FAILED_QUESTIONS: 'testPermanenciaFailedQuestions',
    THEME: 'testPermanenciaTheme',
    SESSION_NORMAL: 'testPermanenciaState',
    SESSION_IMPRESCINDIBLE: 'testImprescindibleState',
    SESSION_EXAMEN_2022: 'testExamen2022State',
    SESSION_EXAMEN_2024: 'testExamen2024State',
    SOUND_MUTED: 'testPermanenciaSoundMuted',
    NUM_PREGUNTAS: 'testPermanenciaNumPreguntas',
};

function getSessionKey(modo) {
    switch (modo) {
        case 'imprescindible': return KEYS.SESSION_IMPRESCINDIBLE;
        case 'examen2024': return KEYS.SESSION_EXAMEN_2024;
        case 'examen2022': return KEYS.SESSION_EXAMEN_2022;
        default: return KEYS.SESSION_NORMAL;
    }
}

function get(key) {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
}

function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function remove(key) {
    localStorage.removeItem(key);
}

export const storage = {
    getHighScore: () => get(KEYS.HIGH_SCORE) || 0,
    setHighScore: (score) => set(KEYS.HIGH_SCORE, score),

    getUnseenQuestionIndices: () => get(KEYS.UNSEEN_QUESTIONS),
    setUnseenQuestionIndices: (indices) => set(KEYS.UNSEEN_QUESTIONS, indices),

    getFailedQuestionsIndices: () => get(KEYS.FAILED_QUESTIONS) || [],
    setFailedQuestionsIndices: (indices) => set(KEYS.FAILED_QUESTIONS, indices),

    getTheme: () => localStorage.getItem(KEYS.THEME), // Theme is stored as a raw string
    setTheme: (theme) => localStorage.setItem(KEYS.THEME, theme),

    getMuteState: () => get(KEYS.SOUND_MUTED) === true, // Devuelve booleano
    setMuteState: (isMuted) => set(KEYS.SOUND_MUTED, isMuted),

    getNumPreguntas: () => get(KEYS.NUM_PREGUNTAS) || 20, // Valor por defecto 20
    setNumPreguntas: (num) => set(KEYS.NUM_PREGUNTAS, num),

    getSession: (modo) => get(getSessionKey(modo)),
    setSession: (modo, estado) => set(getSessionKey(modo), estado),
    removeSession: (modo) => remove(getSessionKey(modo)),

    addFailedQuestion: (indiceGlobal) => {
        if (indiceGlobal === -1) return;
        const fallos = storage.getFailedQuestionsIndices();
        if (!fallos.includes(indiceGlobal)) {
            fallos.push(indiceGlobal);
            storage.setFailedQuestionsIndices(fallos);
        }
    },

    removeFailedQuestion: (indiceGlobal) => {
        if (indiceGlobal === -1) return;
        let fallos = storage.getFailedQuestionsIndices();
        if (fallos.includes(indiceGlobal)) {
            fallos = fallos.filter(i => i !== indiceGlobal);
            storage.setFailedQuestionsIndices(fallos);
        }
    },

    // Para compatibilidad con la refactorización de app.js
    getSavedSession: (modo) => localStorage.getItem(getSessionKey(modo)),
};