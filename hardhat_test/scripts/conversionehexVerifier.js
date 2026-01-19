// convert_for_verifier.js
const fs = require('fs');

console.log('=== PREPARO PROOF AGGREGATA ===\n');

// 1. Converti proof in hex
console.log('[1] Converting proof to hex...');
const proof = fs.readFileSync('../aggregator/target/proof');
const proofHex = '0x' + proof.toString('hex');
console.log(`    Proof size: ${proof.length} bytes\n`);

// 2. Leggi public inputs JSON
console.log('[2] Processing public inputs...');
const publicInputsJson = fs.readFileSync('../aggregator/target/public_inputs.json', 'utf8');
const publicInputs = JSON.parse(publicInputsJson);

console.log(`    Raw JSON: ${publicInputsJson}`);
console.log(`    Found ${publicInputs.length} public inputs\n`);

// 3. Converti ogni input in bytes32 hex
const publicInputsHex = publicInputs.map((input, i) => {
    // Converti string/number in BigInt
    const num = BigInt(input);
    
    // Converti in hex a 32 bytes (64 caratteri)
    const hex = '0x' + num.toString(16).padStart(64, '0');
    
    console.log(`    Input ${i}: ${hex}`);
    
    return hex;
});

const publicInputsArray = JSON.stringify(publicInputsHex);

// 4. Output parametri
console.log('\n=== PARAMETRI PER VERIFIER SOLIDITY ===\n');
console.log('Function: verify(bytes calldata _proof, bytes32[] calldata _publicInputs)\n');
console.log('Parameter 1 - _proof:');
console.log(proofHex);
console.log('\nParameter 2 - _publicInputs:');
console.log(publicInputsArray);

// 5. Salva
fs.writeFileSync('../aggregator/target/proof_hex.txt', proofHex);
fs.writeFileSync('../aggregator/target/public_inputs_array.txt', publicInputsArray);

console.log('\n✅ Files salvati:');
console.log('  - target/proof_hex.txt');
console.log('  - target/public_inputs_array.txt\n');