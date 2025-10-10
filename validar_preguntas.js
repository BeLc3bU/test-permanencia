const fs = require('fs');
const path = require('path');

// Determinar qué archivo validar basado en los argumentos de la línea de comandos
const args = process.argv.slice(2);
let nombreArchivo = 'preguntas.json'; // Archivo por defecto
if (args.includes('--imprescindibles')) {
    nombreArchivo = 'preguntas_imprescindibles.json';
} else if (args.includes('--examen2022')) {
    nombreArchivo = 'examen_2022.json';
} else if (args.includes('--examen2024')) {
    nombreArchivo = 'examen_2024.json';
} else if (args.length > 0 && !args[0].startsWith('--')) {
    nombreArchivo = args[0];
}

const RUTA_PREGUNTAS = path.join(__dirname, nombreArchivo);
const RUTA_SALIDA = path.join(__dirname, `depurado_${nombreArchivo}`);

console.log(`--- Iniciando validación y depuración de ${nombreArchivo} ---`);

if (!fs.existsSync(RUTA_PREGUNTAS)) {
    console.error(`\x1b[31mError: El archivo ${nombreArchivo} no existe.\x1b[0m`);
    process.exit(1);
}
let errores = [];
let preguntasVistas = new Set();
let preguntasDepuradas = [];
let totalPreguntasOriginal = 0;
let totalPreguntasUnicas = 0;

try {
    // 1. Leer y parsear el archivo JSON
    const contenido = fs.readFileSync(RUTA_PREGUNTAS, 'utf8');
    const preguntas = JSON.parse(contenido);
    totalPreguntasOriginal = preguntas.length;

    if (!Array.isArray(preguntas)) {
        throw new Error('El archivo JSON no contiene un array de preguntas en la raíz.');
    }

    console.log(`Se han encontrado ${totalPreguntasOriginal} preguntas en el archivo. Analizando...`);

    // Depuración: Eliminar duplicados
    const preguntasUnicasMap = new Map();
    preguntas.forEach(p => {
        if (p && p.pregunta) {
            const clave = p.pregunta.trim().toLowerCase();
            if (!preguntasUnicasMap.has(clave)) {
                preguntasUnicasMap.set(clave, p);
            }
        }
    });
    preguntasDepuradas = Array.from(preguntasUnicasMap.values());
    totalPreguntasUnicas = preguntasDepuradas.length;
    
    // 2. Iterar y validar cada pregunta
    preguntasDepuradas.forEach((pregunta, index) => {
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

        // 2.4. Validar campos opcionales
        if (pregunta.hasOwnProperty('imprescindible') && typeof pregunta.imprescindible !== 'boolean') {
            errores.push(`[Pregunta #${numeroPregunta}] El campo "imprescindible" debe ser un booleano (true/false).`);
        }

        if (pregunta.hasOwnProperty('examen') && typeof pregunta.examen !== 'string') {
            errores.push(`[Pregunta #${numeroPregunta}] El campo "examen" debe ser un string (ej: "2024").`);
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
    console.error(`\x1b[31mSe han encontrado ${errores.length} errores en el archivo depurado:\x1b[0m`); // Color rojo para errores
    errores.forEach(e => console.error(`- ${e}`));
    
    // Salir con un código de error para poder usarlo en scripts automáticos (CI/CD)
    process.exit(1); 
} else {
    console.log('\x1b[32m¡Felicidades! El archivo es válido y no contiene errores.\x1b[0m'); // Color verde para éxito
    
    // Guardar el archivo depurado
    fs.writeFileSync(RUTA_SALIDA, JSON.stringify(preguntasDepuradas, null, 2), 'utf8');
    console.log(`\n--- Resumen de la Depuración ---`);
    console.log(`Total de preguntas originales: ${totalPreguntasOriginal}`);
    console.log(`Total de preguntas duplicadas eliminadas: ${totalPreguntasOriginal - totalPreguntasUnicas}`);
    console.log(`\x1b[36mTotal de preguntas únicas: ${totalPreguntasUnicas}\x1b[0m`); // Color cian
    console.log(`\nSe ha creado un archivo limpio llamado \x1b[33m'${path.basename(RUTA_SALIDA)}'\x1b[0m con las preguntas únicas.`);
    console.log(`Puedes usarlo para reemplazar el archivo original si lo deseas.`);
}