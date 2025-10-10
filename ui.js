export const elements = {
    inicioMenuEl: document.getElementById('inicio-menu'),
    contadorFallosEl: document.getElementById('contador-fallos'),
    testContentEl: document.getElementById('test-content'),
    iniciarNuevoTestBtn: document.getElementById('iniciar-nuevo-test-btn'),
    iniciarRepasoFallosBtn: document.getElementById('iniciar-repaso-fallos-btn'),
    iniciarTestImprescindibleBtn: document.getElementById('iniciar-test-imprescindible-btn'),
    iniciarExamen2024Btn: document.getElementById('iniciar-examen-2024-btn'),
    iniciarExamen2022Btn: document.getElementById('iniciar-examen-2022-btn'),
    seguirMasTardeBtn: document.getElementById('seguir-mas-tarde-btn'),
    preguntaEl: document.getElementById('pregunta-actual'),
    opcionesEl: document.getElementById('opciones-respuesta'),
    feedbackEl: document.getElementById('feedback'),
    reiniciarBtn: document.getElementById('reiniciar-test'),
    finalizarAhoraBtn: document.getElementById('finalizar-ahora-btn'),
    barraProgresoEl: document.getElementById('barra-progreso'),
    progresoTextoEl: document.getElementById('progreso-texto'),
    revisionFallosEl: document.getElementById('revision-fallos'),
    recordTextoEl: document.getElementById('record-texto'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    preguntaWrapper: document.getElementById('pregunta-wrapper'),
    contenedorTest: document.getElementById('contenedor-test'),
};

export function showStartView() {
    elements.inicioMenuEl.classList.remove('oculto');
    elements.testContentEl.classList.add('oculto');
}

export function showTestView() {
    elements.inicioMenuEl.classList.add('oculto');
    elements.testContentEl.classList.remove('oculto');
}

export function initializeTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        elements.themeToggleBtn.innerHTML = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        elements.themeToggleBtn.innerHTML = '🌙';
    }
}

export function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    elements.themeToggleBtn.innerHTML = isDarkMode ? '☀️' : '🌙';
    return isDarkMode ? 'dark' : 'light';
}

export function updateFailedQuestionsButton(count) {
    if (count > 0) {
        elements.contadorFallosEl.textContent = count;
        elements.iniciarRepasoFallosBtn.disabled = false;
    } else {
        elements.contadorFallosEl.textContent = '';
        elements.iniciarRepasoFallosBtn.disabled = true;
    }
}

export function updateRecord(score) {
    elements.recordTextoEl.innerText = `Récord: ${score}`;
}

export function updateProgressBar(currentIndex, totalQuestions) {
    const progreso = (currentIndex) / totalQuestions;
    elements.barraProgresoEl.style.transform = `scaleX(${progreso})`;
    elements.progresoTextoEl.innerText = `Pregunta ${currentIndex + 1} de ${totalQuestions}`;
}

export async function renderQuestion(questionData, currentIndex, totalQuestions, onAnswer) {
    if (currentIndex > 0) {
        elements.preguntaWrapper.classList.add('fade-out');
        if (elements.contenedorTest.classList.contains('shake')) {
            elements.contenedorTest.classList.remove('shake');
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    updateProgressBar(currentIndex, totalQuestions);
    elements.feedbackEl.innerHTML = '';
    elements.feedbackEl.className = 'feedback';
    elements.opcionesEl.innerHTML = '';
    elements.preguntaWrapper.classList.remove('fade-out', 'fade-in');

    elements.preguntaEl.innerText = `${currentIndex + 1}. ${questionData.pregunta}`;
    elements.preguntaEl.setAttribute('tabindex', '-1');
    elements.preguntaEl.focus();

    const prefijos = ['a) ', 'b) ', 'c) ', 'd) '];
    questionData.opciones.forEach((opcion, index) => {
        const boton = document.createElement('button');
        boton.innerText = prefijos[index] + opcion;
        boton.addEventListener('click', () => onAnswer(opcion));
        elements.opcionesEl.appendChild(boton);
    });

    elements.preguntaWrapper.classList.add('fade-in');
}

export function showAnswerFeedback(opcionSeleccionada, esCorrecto, respuestaCorrecta) {
    const botonSeleccionado = Array.from(elements.opcionesEl.children).find(btn => btn.innerText.endsWith(opcionSeleccionada));

    if (esCorrecto) {
        if (botonSeleccionado) botonSeleccionado.classList.add('correcto');
        elements.feedbackEl.innerHTML = `&#10003; ¡Correcto!`;
        elements.feedbackEl.className = 'feedback visible correcto';
    } else {
        elements.contenedorTest.classList.add('shake');
        if (botonSeleccionado) botonSeleccionado.classList.add('incorrecto');
        elements.feedbackEl.innerHTML = `&#10007; Incorrecto. La respuesta correcta es: <strong>${respuestaCorrecta}</strong>`;
        elements.feedbackEl.className = 'feedback visible incorrecto';
    }

    Array.from(elements.opcionesEl.children).forEach(btn => {
        if (btn.innerText.endsWith(respuestaCorrecta)) {
            if (!btn.classList.contains('correcto')) {
                btn.classList.add('correcto');
            }
            btn.setAttribute('aria-label', btn.innerText + '. Respuesta correcta.');
        }
        btn.disabled = true;
    });
}

export function showTestResults(resultado, onRepasarFallos, onVolverMenu) {
    elements.preguntaEl.innerText = '¡Has completado el test!';
    elements.opcionesEl.innerHTML = '';
    elements.progresoTextoEl.innerText = 'Test Finalizado';
    elements.feedbackEl.classList.remove('correcto', 'incorrecto');

    let mensajePuntuacion = `Tu puntuación final es: <strong>${resultado.puntuacionFinal} puntos</strong>.<br>Aciertos: ${resultado.aciertos} | Fallos: ${resultado.fallos}`;
    if (resultado.nuevoRecord) {
        mensajePuntuacion += `<br>¡Nuevo récord!`;
        updateRecord(resultado.puntuacionFinal);
    }
    elements.feedbackEl.innerHTML = mensajePuntuacion;
    elements.feedbackEl.className = 'feedback visible final';
    elements.feedbackEl.setAttribute('tabindex', '-1');
    elements.feedbackEl.focus();

    // Ocultar botones de acción del test, ya que ha finalizado.
    elements.finalizarAhoraBtn.classList.add('oculto');
    elements.seguirMasTardeBtn.classList.add('oculto');
    elements.reiniciarBtn.classList.remove('oculto');
    elements.reiniciarBtn.onclick = onVolverMenu;

    if (resultado.preguntasFalladas.length > 0) {
        renderFailedQuestions(resultado.preguntasFalladas);
    }
}

function renderFailedQuestions(preguntasFalladas) {
    elements.revisionFallosEl.innerHTML = '';
    if (preguntasFalladas.length === 0) {
        elements.revisionFallosEl.classList.add('oculto');
        return;
    }

    elements.revisionFallosEl.classList.remove('oculto');
    const titulo = document.createElement('h2');
    titulo.innerText = 'Revisión de fallos';
    elements.revisionFallosEl.appendChild(titulo);

    preguntasFalladas.forEach(item => {
        const divItem = document.createElement('div');
        divItem.classList.add('item-revision');
        divItem.innerHTML = `
            <p><strong>Pregunta:</strong> ${item.preguntaData.pregunta}</p>
            <p style="color: var(--color-incorrecto-texto);"><strong>Tu respuesta:</strong> ${item.respuestaUsuario}</p>
            <p style="color: var(--color-correcto-texto);"><strong>Respuesta correcta:</strong> ${item.preguntaData.respuestaCorrecta}</p>
        `;
        elements.revisionFallosEl.appendChild(divItem);
    });
}

export function resetTestUI() {
    elements.reiniciarBtn.classList.add('oculto');
    elements.finalizarAhoraBtn.classList.remove('oculto');
    elements.revisionFallosEl.classList.add('oculto');
    elements.seguirMasTardeBtn.classList.remove('oculto');
}