const { UltraHonkBackend, Barretenberg } = require('@aztec/bb.js');
const fs = require('fs');

const BASE_PATH = '/home/josh/Documents/test/NoirSudoku';

// Helper function to convert proof to fields
function proofToFields(proof) {
  const fields = [];
  for (let i = 0; i < proof.length; i += 32) {
    const chunk = proof.slice(i, i + 32);
    fields.push('0x' + Buffer.from(chunk).toString('hex'));
  }
  return fields;
}

// Helper function to convert VK to fields
function vkToFields(vk) {
  const fields = [];
  for (let i = 0; i < vk.length; i += 32) {
    const chunk = vk.slice(i, i + 32);
    fields.push('0x' + Buffer.from(chunk).toString('hex'));
  }
  return fields;
}

async function main() {
    console.log('🔄 Generating Aggregator Inputs for Prover.toml\n');

    // Initialize Barretenberg API
    console.log('[0] Initializing Barretenberg API...');
    const api = await Barretenberg.new({ threads: 1 });

    // 1. Load circuits
    const circuit4x4 = JSON.parse(fs.readFileSync(`${BASE_PATH}/Sudoku44/target/Sudoku44.json`, 'utf8'));
    const circuit9x9 = JSON.parse(fs.readFileSync(`${BASE_PATH}/Sudoku99/target/Sudoku99.json`, 'utf8'));

    // 2. Setup inner backends
    console.log('[1] Setup inner backends...');
    const backend4x4 = new UltraHonkBackend(circuit4x4.bytecode, api);
    const backend9x9 = new UltraHonkBackend(circuit9x9.bytecode, api);

    // 3. Generate inner proofs with verifierTarget
    console.log('[2] Generating inner proofs...');
    const witness4x4 = fs.readFileSync(`${BASE_PATH}/Sudoku44/target/Sudoku44.gz`);
    const witness9x9 = fs.readFileSync(`${BASE_PATH}/Sudoku99/target/Sudoku99.gz`);

    // Specify verifierTarget: 'noir-recursive' (ZK variant)
    const { proof: proof4x4, publicInputs: pub4x4 } = await backend4x4.generateProof(
        witness4x4,
        { verifierTarget: 'noir-recursive' }
    );
    const { proof: proof9x9, publicInputs: pub9x9 } = await backend9x9.generateProof(
        witness9x9,
        { verifierTarget: 'noir-recursive' }
    );

    console.log('✅ Inner proofs generated');
    console.log(`   4x4 proof size: ${proof4x4.length} bytes, public inputs: ${pub4x4.length}`);
    console.log(`   9x9 proof size: ${proof9x9.length} bytes, public inputs: ${pub9x9.length}`);

    // 4. Generate recursive proof artifacts
    console.log('[3] Generating recursive proof artifacts...');
    const artifacts4x4 = await backend4x4.generateRecursiveProofArtifacts(
        proof4x4,
        pub4x4.length,
        { verifierTarget: 'noir-recursive' }
    );
    const artifacts9x9 = await backend9x9.generateRecursiveProofArtifacts(
        proof9x9,
        pub9x9.length,
        { verifierTarget: 'noir-recursive' }
    );

    // 5. Convert VK and proof to fields
    console.log('[4] Converting to fields...');
    const vk4x4 = await backend4x4.getVerificationKey();
    const vk9x9 = await backend9x9.getVerificationKey();

    const vk4x4Fields = vkToFields(vk4x4);
    const vk9x9Fields = vkToFields(vk9x9);

    const proof4x4Fields = proofToFields(proof4x4);
    const proof9x9Fields = proofToFields(proof9x9);

    console.log(`   VK 4x4 size: ${vk4x4Fields.length} fields`);
    console.log(`   Proof 4x4 size: ${proof4x4Fields.length} fields`);
    console.log(`   VK 9x9 size: ${vk9x9Fields.length} fields`);
    console.log(`   Proof 9x9 size: ${proof9x9Fields.length} fields`);

    console.log(`   key_hash 4x4: ${artifacts4x4.vkHash}`);
    console.log(`   key_hash 9x9: ${artifacts9x9.vkHash}`);

    // 6. Generate Prover.toml content
    console.log('[5] Generating Prover.toml...');

    // Format arrays for TOML
    const formatArray = (arr) => `[${arr.map(x => `"${x}"`).join(', ')}]`;

    const proverToml = `# Auto-generated Prover.toml for aggregator circuit

# Sudoku 4x4 inputs
vk_4x4 = ${formatArray(vk4x4Fields)}
proof_4x4 = ${formatArray(proof4x4Fields)}
public_inputs_4x4 = ${formatArray(pub4x4)}
key_hash_4x4 = "${artifacts4x4.vkHash}"

# Sudoku 9x9 inputs
vk_9x9 = ${formatArray(vk9x9Fields)}
proof_9x9 = ${formatArray(proof9x9Fields)}
public_inputs_9x9 = ${formatArray(pub9x9)}
key_hash_9x9 = "${artifacts9x9.vkHash}"
`;

    const proverTomlPath = `${BASE_PATH}/aggregator/Prover.toml`;
    fs.writeFileSync(proverTomlPath, proverToml);
    console.log(`✅ Prover.toml saved to ${proverTomlPath}`);

    console.log('\n✅ AGGREGATOR INPUTS GENERATED SUCCESSFULLY!');
    console.log('\nNext steps:');
    console.log('1. cd /home/josh/Documents/test/NoirSudoku/aggregator');
    console.log('2. nargo execute');
    console.log('3. bb prove --scheme ultra_honk --verifier_target evm -b ./target/aggregator.json -w ./target/aggregator.gz -o ./target/proof');

    process.exit(0);
}

main().catch(error => {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
});
