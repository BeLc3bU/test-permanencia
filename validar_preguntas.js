const fs = require('fs');
const path = require('path');

const RUTA_PREGUNTAS = path.join(__dirname, 'preguntas.json');

console.log('--- Iniciando validación de preguntas.json ---');

let errores = [];
let preguntasVistas = new Set();

try {
    // 1. Leer y parsear el archivo JSON
    const contenido = fs.readFileSync(RUTA_PREGUNTAS, 'utf8');
    const preguntas = JSON.parse(contenido);

    if (!Array.isArray(preguntas)) {
        throw new Error('El archivo JSON no contiene un array de preguntas en la raíz.');
    }

    console.log(`Se han encontrado ${preguntas.length} preguntas. Analizando...`);

    // 2. Iterar y validar cada pregunta
    preguntas.forEach((pregunta, index) => {
        const numeroPregunta = index + 1;

        // 2.1. Validar campos requeridos
        if (!pregunta.pregunta || typeof pregunta.pregunta !== 'string' || pregunta.pregunta.trim() === '') {
            errores.push(`[Pregunta #${numeroPregunta}] Falta el campo "pregunta" o está vacío.`);
        }

        if (!pregunta.opciones || !Array.isArray(pregunta.opciones)) {
            errores.push(`[Pregunta #${numeroPregunta}] El campo "opciones" no existe o no es un array.`);
        } else if (pregunta.opciones.length < 2) {
            errores.push(`[Pregunta #${numeroPregunta}] Debe haber al menos 2 opciones.`);
        } else {
            // 2.2. Validar opciones duplicadas dentro de la misma pregunta
            const opcionesUnicas = new Set(pregunta.opciones);
            if (opcionesUnicas.size !== pregunta.opciones.length) {
                errores.push(`[Pregunta #${numeroPregunta}] Contiene opciones duplicadas.`);
            }
        }

        if (!pregunta.respuestaCorrecta || typeof pregunta.respuestaCorrecta !== 'string' || pregunta.respuestaCorrecta.trim() === '') {
            errores.push(`[Pregunta #${numeroPregunta}] Falta el campo "respuestaCorrecta" o está vacío.`);
        }

        // 2.3. Validar que la respuesta correcta esté en las opciones (si las opciones son válidas)
        if (pregunta.opciones && Array.isArray(pregunta.opciones) && pregunta.respuestaCorrecta) {
            if (!pregunta.opciones.includes(pregunta.respuestaCorrecta)) {
                errores.push(`[Pregunta #${numeroPregunta}] La "respuestaCorrecta" no se encuentra en las "opciones".\n   Respuesta: "${pregunta.respuestaCorrecta}"`);
            }
        }

        // 2.4. Validar preguntas duplicadas
        if (pregunta.pregunta) {
            const preguntaNormalizada = pregunta.pregunta.trim().toLowerCase();
            if (preguntasVistas.has(preguntaNormalizada)) {
                errores.push(`[Pregunta #${numeroPregunta}] El texto de la pregunta está DUPLICADO: "${pregunta.pregunta}"`);
            } else {
                preguntasVistas.add(preguntaNormalizada);
            }
        }
    });

} catch (error) {
    if (error instanceof SyntaxError) {
        errores.push(`Error de sintaxis en el archivo JSON: ${error.message}`);
    } else {
        errores.push(`Error al leer o procesar el archivo: ${error.message}`);
    }
}

// 3. Mostrar el resultado
console.log('--- Validación finalizada ---');

if (errores.length > 0) {
    console.error(`\x1b[31mSe han encontrado ${errores.length} errores:\x1b[0m`); // Color rojo para errores
    errores.forEach(e => console.error(`- ${e}`));
    
    // Salir con un código de error para poder usarlo en scripts automáticos (CI/CD)
    process.exit(1); 
} else {
    console.log('\x1b[32m¡Felicidades! El archivo preguntas.json es válido y no contiene errores.\x1b[0m'); // Color verde para éxito
}