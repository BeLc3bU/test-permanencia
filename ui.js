export class UI {
    constructor() {
        this.elements = {
            inicioMenuEl: document.getElementById('inicio-menu'),
            contadorFallosEl: document.getElementById('contador-fallos'),
            testContentEl: document.getElementById('test-content'),
            iniciarNuevoTestBtn: document.getElementById('iniciar-nuevo-test-btn'),
            iniciarRepasoFallosBtn: document.getElementById('iniciar-repaso-fallos-btn'),
            iniciarTestImprescindibleBtn: document.getElementById('iniciar-test-imprescindible-btn'),
            iniciarExamen2024Btn: document.getElementById('iniciar-examen-2024-btn'),
            iniciarExamen2022Btn: document.getElementById('iniciar-examen-2022-btn'),
            iniciarExamen2025ETBtn: document.getElementById('iniciar-examen-2025ET-btn'),
            iniciarSimulacro1Btn: document.getElementById('iniciar-simulacro-1-btn'),
            iniciarSimulacro2Btn: document.getElementById('iniciar-simulacro-2-btn'),
            iniciarSimulacro3Btn: document.getElementById('iniciar-simulacro-3-btn'),
            numPreguntasSelect: document.getElementById('num-preguntas-select'),
            configTestNormal: document.querySelector('.config-test-normal'),
            soundToggleBtn: document.getElementById('sound-toggle-btn'),
            reiniciarProgresoBtn: document.getElementById('reiniciar-progreso-btn'),
            seguirMasTardeBtn: document.getElementById('seguir-mas-tarde-btn'),
            preguntaEl: document.getElementById('pregunta-actual'),
            opcionesEl: document.getElementById('opciones-respuesta'),
            feedbackEl: document.getElementById('feedback'),
            reiniciarBtn: document.getElementById('reiniciar-test'),
            barraProgresoContenedor: document.querySelector('.barra-progreso-contenedor'),
            finalizarAhoraBtn: document.getElementById('finalizar-ahora-btn'),
            barraProgresoEl: document.getElementById('barra-progreso'),
            progresoTextoEl: document.getElementById('progreso-texto'),
            revisionFallosEl: document.getElementById('revision-fallos'),
            recordTextoEl: document.getElementById('record-texto'),
            themeToggleBtn: document.getElementById('theme-toggle-btn'),
            preguntaWrapper: document.getElementById('pregunta-wrapper'),
            contenedorTest: document.getElementById('contenedor-test'),
            // Elementos del Modal
            veredictoEl: document.getElementById('veredicto'),
            modalOverlay: document.getElementById('modal-overlay'),
            modalTitle: document.getElementById('modal-title'),
            modalMessage: document.getElementById('modal-message'),
            modalConfirmBtn: document.getElementById('modal-confirm-btn'),
            modalCancelBtn: document.getElementById('modal-cancel-btn'),
        };
        this.sounds = {
            correct: new Audio('sounds/correct.mp3'),
            incorrect: new Audio('sounds/incorrect.mp3')
        };
        this.isMuted = false;
    }

    showStartView() {
        this.elements.inicioMenuEl.classList.remove('oculto');
        this.elements.testContentEl.classList.add('oculto');
    }

    showTestView() {
        this.elements.inicioMenuEl.classList.add('oculto');
        this.elements.testContentEl.classList.remove('oculto');
    }

    initializeTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            this.elements.themeToggleBtn.innerHTML = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            this.elements.themeToggleBtn.innerHTML = '🌙';
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        this.elements.themeToggleBtn.innerHTML = isDarkMode ? '☀️' : '🌙';
        return isDarkMode ? 'dark' : 'light';
    }

    initializeMuteState(isMuted) {
        this.isMuted = isMuted;
        this.updateSoundButton();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateSoundButton();
        return this.isMuted;
    }

    updateSoundButton() {
        this.elements.soundToggleBtn.innerHTML = this.isMuted ? '🔇' : '🔊';
        this.elements.soundToggleBtn.setAttribute('aria-label', this.isMuted ? 'Activar sonidos' : 'Silenciar sonidos');
    }

    initializeNumPreguntas(num) {
        this.elements.numPreguntasSelect.value = num;
    }

    updateFailedQuestionsButton(count) {
        if (count > 0) {
            this.elements.contadorFallosEl.textContent = count;
            this.elements.iniciarRepasoFallosBtn.disabled = false;
        } else {
            this.elements.contadorFallosEl.textContent = '';
            this.elements.iniciarRepasoFallosBtn.disabled = true;
        }
    }

    updateRecord(score) {
        this.elements.recordTextoEl.innerText = `Récord: ${score}`;
    }

    updateProgressBar(currentIndex, totalQuestions) {
        const porcentaje = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
        this.elements.barraProgresoEl.style.width = `${porcentaje}%`;
        
        // Actualizar atributos ARIA para lectores de pantalla
        this.elements.barraProgresoContenedor.setAttribute('aria-valuenow', Math.round(porcentaje));
        this.elements.progresoTextoEl.innerText = `Pregunta ${currentIndex + 1} de ${totalQuestions}`;
    }

    async renderQuestion(questionData, currentIndex, totalQuestions, onAnswer) {
        if (currentIndex > 0) {
            this.elements.preguntaWrapper.classList.add('fade-out');
            if (this.elements.contenedorTest.classList.contains('shake')) {
                this.elements.contenedorTest.classList.remove('shake');
            }
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        this.updateProgressBar(currentIndex, totalQuestions);
        this.elements.feedbackEl.innerHTML = '';
        this.elements.feedbackEl.className = 'feedback';
        this.elements.opcionesEl.innerHTML = '';
        this.elements.preguntaWrapper.classList.remove('fade-out', 'fade-in');

        this.elements.preguntaEl.innerText = `${currentIndex + 1}. ${questionData.pregunta}`;
        this.elements.preguntaEl.setAttribute('tabindex', '-1');
        this.elements.preguntaEl.focus();

        const prefijos = ['a) ', 'b) ', 'c) ', 'd) '];
        questionData.opciones.forEach((opcion, index) => {
            const boton = document.createElement('button');
            boton.innerText = prefijos[index] + opcion;
            boton.addEventListener('click', () => onAnswer(opcion));
            this.elements.opcionesEl.appendChild(boton);
        });

        this.elements.preguntaWrapper.classList.add('fade-in');
    }

    triggerHapticFeedback(type) {
        if ('vibrate' in navigator && !this.isMuted) {
            if (type === 'success') {
                navigator.vibrate(100); // Vibración corta para acierto
            } else if (type === 'error') {
                navigator.vibrate([200, 50, 200]); // Patrón de vibración para error
            }
        }
    }

    showAnswerFeedback(opcionSeleccionada, esCorrecto, respuestaCorrecta) {
        const botonSeleccionado = Array.from(this.elements.opcionesEl.children).find(btn => btn.innerText.endsWith(opcionSeleccionada));

        if (esCorrecto) {
            if (botonSeleccionado) botonSeleccionado.classList.add('correcto');
            if (!this.isMuted) {
                this.sounds.correct.play();
                this.triggerHapticFeedback('success');
            }
            this.elements.feedbackEl.innerHTML = `&#10003; ¡Correcto!`;
            this.elements.feedbackEl.className = 'feedback visible correcto';
        } else {
            this.elements.contenedorTest.classList.add('shake');
            if (!this.isMuted) {
                this.sounds.incorrect.play();
                this.triggerHapticFeedback('error');
            }
            if (botonSeleccionado) botonSeleccionado.classList.add('incorrecto');
            
            // Usar textContent para evitar XSS
            this.elements.feedbackEl.innerHTML = '&#10007; Incorrecto. La respuesta correcta es: ';
            const strongElement = document.createElement('strong');
            strongElement.textContent = respuestaCorrecta;
            this.elements.feedbackEl.appendChild(strongElement);
            
            this.elements.feedbackEl.className = 'feedback visible incorrecto';
        }

        Array.from(this.elements.opcionesEl.children).forEach(btn => {
            if (btn.innerText.endsWith(respuestaCorrecta)) {
                if (!btn.classList.contains('correcto')) {
                    btn.classList.add('correcto');
                }
                btn.setAttribute('aria-label', btn.innerText + '. Respuesta correcta.');
            }
            btn.disabled = true;
        });
    }

    showTestResults(resultado, modo, onRepasarFallos, onVolverMenu) {
        this.elements.preguntaEl.innerText = '¡Has completado el test!';
        this.elements.opcionesEl.innerHTML = '';
        this.elements.progresoTextoEl.innerText = 'Test Finalizado';
        this.elements.feedbackEl.classList.remove('correcto', 'incorrecto');
        this.elements.veredictoEl.classList.add('oculto'); // Ocultar por defecto

        let mensajePuntuacion = '';

        if (modo && modo.startsWith('simulacro')) {
            const nota = parseFloat(resultado.puntuacionFinal);
            const esApto = nota >= 50;
            const totalPreguntas = resultado.aciertos + resultado.fallos; // Asumiendo que se responden todas
            const noContestadas = 100 - totalPreguntas;

            this.elements.veredictoEl.textContent = esApto ? 'APTO' : 'NO APTO';
            this.elements.veredictoEl.className = `veredicto ${esApto ? 'apto' : 'no-apto'}`;
            this.elements.veredictoEl.classList.remove('oculto');

            mensajePuntuacion = `Nota Final: <strong>${nota.toFixed(2)} / 100</strong><br>Aciertos: ${resultado.aciertos} | Fallos: ${resultado.fallos} | No contestadas: ${noContestadas}`;
        } else {
            mensajePuntuacion = `Tu puntuación final es: <strong>${resultado.puntuacionFinal} puntos</strong>.<br>Aciertos: ${resultado.aciertos} | Fallos: ${resultado.fallos}`;
            if (resultado.nuevoRecord) {
                mensajePuntuacion += `<br>¡Nuevo récord!`;
                this.updateRecord(resultado.puntuacionFinal);
            }
        }

        this.elements.feedbackEl.innerHTML = mensajePuntuacion;
        this.elements.feedbackEl.className = 'feedback visible final';
        this.elements.feedbackEl.setAttribute('tabindex', '-1');
        // Mover el foco al feedback para que los lectores de pantalla lo anuncien.
        this.elements.feedbackEl.focus();

        // Ocultar botones de acción del test, ya que ha finalizado.
        this.elements.finalizarAhoraBtn.classList.add('oculto');
        this.elements.seguirMasTardeBtn.classList.add('oculto');
        this.elements.reiniciarBtn.classList.remove('oculto');
        this.elements.reiniciarBtn.onclick = onVolverMenu;

        if (resultado.preguntasFalladas.length > 0) {
            this.renderFailedQuestions(resultado.preguntasFalladas);
        }
    }

    renderFailedQuestions(preguntasFalladas) {
        this.elements.revisionFallosEl.innerHTML = '';
        if (preguntasFalladas.length === 0) {
            this.elements.revisionFallosEl.classList.add('oculto');
            return;
        }

        this.elements.revisionFallosEl.classList.remove('oculto');
        const titulo = document.createElement('h2');
        titulo.textContent = 'Revisión de fallos';
        this.elements.revisionFallosEl.appendChild(titulo);

        preguntasFalladas.forEach(item => {
            const divItem = document.createElement('div');
            divItem.classList.add('item-revision');
            
            // Usar textContent en lugar de innerHTML para evitar XSS
            const preguntaP = document.createElement('p');
            const preguntaStrong = document.createElement('strong');
            preguntaStrong.textContent = 'Pregunta: ';
            preguntaP.appendChild(preguntaStrong);
            preguntaP.appendChild(document.createTextNode(item.preguntaData.pregunta));
            
            const respuestaP = document.createElement('p');
            respuestaP.style.color = 'var(--color-incorrecto-texto)';
            const respuestaStrong = document.createElement('strong');
            respuestaStrong.textContent = 'Tu respuesta: ';
            respuestaP.appendChild(respuestaStrong);
            respuestaP.appendChild(document.createTextNode(item.respuestaUsuario));
            
            const correctaP = document.createElement('p');
            correctaP.style.color = 'var(--color-correcto-texto)';
            const correctaStrong = document.createElement('strong');
            correctaStrong.textContent = 'Respuesta correcta: ';
            correctaP.appendChild(correctaStrong);
            correctaP.appendChild(document.createTextNode(item.preguntaData.respuestaCorrecta));
            
            divItem.appendChild(preguntaP);
            divItem.appendChild(respuestaP);
            divItem.appendChild(correctaP);
            
            this.elements.revisionFallosEl.appendChild(divItem);
        });
    }

    resetTestUI(estadoActual) {
        this.elements.reiniciarBtn.classList.add('oculto');
        this.elements.finalizarAhoraBtn.classList.remove('oculto');
        this.elements.revisionFallosEl.classList.add('oculto');
        // Ocultar "Seguir más tarde" solo en modos de examen para fomentar que se completen en una sesión.
        const esModoExamen = estadoActual.modo.startsWith('examen');
        this.elements.seguirMasTardeBtn.classList.toggle('oculto', esModoExamen);
        this.elements.soundToggleBtn.classList.remove('oculto');
    }

    showConfirmationModal({ title, message, onConfirm, onCancel = () => {} }) {
        this.elements.modalTitle.innerText = title;
        this.elements.modalMessage.innerText = message;

        this.elements.modalOverlay.classList.remove('oculto');

        // Usamos .cloneNode(true) para limpiar listeners antiguos de forma segura
        const newConfirmBtn = this.elements.modalConfirmBtn.cloneNode(true);
        this.elements.modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, this.elements.modalConfirmBtn);
        this.elements.modalConfirmBtn = newConfirmBtn;

        const newCancelBtn = this.elements.modalCancelBtn.cloneNode(true);
        this.elements.modalCancelBtn.parentNode.replaceChild(newCancelBtn, this.elements.modalCancelBtn);
        this.elements.modalCancelBtn = newCancelBtn;

        const confirmHandler = () => {
            this.hideConfirmationModal();
            onConfirm();
        };

        const cancelHandler = () => {
            this.hideConfirmationModal();
            onCancel();
        };

        this.elements.modalConfirmBtn.addEventListener('click', confirmHandler);
        this.elements.modalCancelBtn.addEventListener('click', cancelHandler);
    }

    hideConfirmationModal() {
        this.elements.modalOverlay.classList.add('oculto');
    }
}