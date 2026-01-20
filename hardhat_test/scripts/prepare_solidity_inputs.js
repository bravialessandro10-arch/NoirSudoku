const fs = require('fs');

const BASE_PATH = '/home/josh/Documents/test/NoirSudoku';

// Read public inputs from binary file
const publicInputsPath = `${BASE_PATH}/aggregator/target/public_inputs`;
const publicInputsRaw = fs.readFileSync(publicInputsPath);

// Parse public inputs (32 bytes per field)
const publicInputs = [];
for (let i = 0; i < publicInputsRaw.length; i += 32) {
    const chunk = publicInputsRaw.subarray(i, i + 32);
    publicInputs.push('0x' + Buffer.from(chunk).toString('hex'));
}

console.log(`Public inputs count: ${publicInputs.length}`);
console.log(`First 5 inputs: ${publicInputs.slice(0, 5).join(', ')}`);
console.log(`Last 5 inputs: ${publicInputs.slice(-5).join(', ')}`);

// Save as JSON array
fs.writeFileSync(`${BASE_PATH}/aggregator/target/public_inputs.json`, JSON.stringify(publicInputs, null, 2));

// Save as Solidity-compatible array string
const pubInputsArray = `[${publicInputs.map(x => `"${x}"`).join(', ')}]`;
fs.writeFileSync(`${BASE_PATH}/aggregator/target/public_inputs_array.txt`, pubInputsArray);

console.log(`\n✅ Files saved to aggregator/target/`);
console.log(`   - public_inputs.json`);
console.log(`   - public_inputs_array.txt`);
