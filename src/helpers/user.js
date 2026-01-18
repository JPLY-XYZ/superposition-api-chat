import crypto from 'crypto';

export const generateUserCode = (userId) => {
  // 1. Creamos un hash SHA-256 del ID (siempre dará el mismo resultado para el mismo ID)
  const hash = crypto.createHash('sha256').update(userId).digest('hex');

  // El hash es una cadena larga tipo: "a3f12c90..."
  
  // --- PARTE 1: Los 4 Números (1111) ---
  // Tomamos los primeros 6 caracteres hex y los convertimos a número
  const numHex = hash.substring(0, 6);
  const numVal = parseInt(numHex, 16);
  // Hacemos módulo 10000 para que quede entre 0 y 9999, y rellenamos con ceros
  const numberPart = (numVal % 10000).toString().padStart(4, '0');

  // --- PARTE 2: Las 4 Letras (AAAA) ---
  let letterPart = '';
  // Iteramos 4 veces para sacar 4 letras
  for (let i = 0; i < 4; i++) {
    // Tomamos pares de caracteres hex (offset de 6 porque ya usamos los primeros para el número)
    const start = 6 + (i * 2); 
    const chunk = hash.substring(start, start + 2);
    const val = parseInt(chunk, 16);
    // Módulo 26 (letras del abecedario) + 65 (código ASCII de la 'A')
    const charCode = 65 + (val % 26);
    letterPart += String.fromCharCode(charCode);
  }

  // --- PARTE 3: La Letra Final (A) ---
  const lastChunk = hash.substring(14, 16);
  const lastVal = parseInt(lastChunk, 16);
  const lastChar = String.fromCharCode(65 + (lastVal % 26));

  // Resultado final: Ej. "8291-XJKA-P"
  return `${numberPart}-${letterPart}-${lastChar}`;
};