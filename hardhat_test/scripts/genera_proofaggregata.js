const { UltraHonkBackend, Barretenberg, Crs } = require('@aztec/bb.js');
const { Noir } = require('@noir-lang/noir_js');
const fs = require('fs');

// Helper function per convertire proof a fields
function proofToFields(proof) {
  const fields = [];
  for (let i = 0; i < proof.length; i += 32) {
    const chunk = proof.slice(i, i + 32);
    fields.push('0x' + Buffer.from(chunk).toString('hex'));
  }
  return fields;
}

// Helper per convertire VK a fields
function vkToFields(vk) {
  const fields = [];
  for (let i = 0; i < vk.length; i += 32) {
    const chunk = vk.slice(i, i + 32);
    fields.push('0x' + Buffer.from(chunk).toString('hex'));
  }
  return fields;
}

async function main() {
  console.log('🔄 Generazione Proof Aggregata \n');

  // ============================================================
  // ⭐ CRS ESPLICITO (2^22) - FIX DEFINITIVO
  // ============================================================
  const CRS_SIZE = 1 << 22;
  console.log(`[0] Creazione CRS esplicito (size = 2^22)...`);
  const crs = await Crs.new(CRS_SIZE);

  // ============================================================
  // ⭐ Inizializzazione Barretenberg API (INNER)
  // ============================================================
  console.log('[1] Inizializzazione Barretenberg API (inner)...');
  const api = await Barretenberg.new({ crs, threads: 1 });

  // ============================================================
  // 2. Carica circuiti
  // ============================================================
  const circuit4x4 = JSON.parse(fs.readFileSync('../Sudoku44/target/Sudoku44.json', 'utf8'));
  const circuit9x9 = JSON.parse(fs.readFileSync('../Sudoku99/target/Sudoku99.json', 'utf8'));
  const aggregatorCircuit = JSON.parse(fs.readFileSync('../aggregator/target/aggregator.json', 'utf8'));

  // ============================================================
  // 3. Backend INNER
  // ============================================================
  console.log('[2] Setup inner backends...');
  const backend4x4 = new UltraHonkBackend(circuit4x4.bytecode, api);
  const backend9x9 = new UltraHonkBackend(circuit9x9.bytecode, api);

  // ============================================================
  // 4. Genera proof INNER
  // ============================================================
  console.log('[3] Generating inner proofs...');
  const witness4x4 = fs.readFileSync('../Sudoku44/target/Sudoku44.gz');
  const witness9x9 = fs.readFileSync('../Sudoku99/target/Sudoku99.gz');

  const { proof: proof4x4, publicInputs: pub4x4 } =
    await backend4x4.generateProof(witness4x4, {
      verifierTarget: 'noir-recursive-no-zk',
    });

  const { proof: proof9x9, publicInputs: pub9x9 } =
    await backend9x9.generateProof(witness9x9, {
      verifierTarget: 'noir-recursive-no-zk',
    });

  console.log('✅ Inner proofs generated');
  console.log(`   4x4 proof size: ${proof4x4.length} bytes`);
  console.log(`   9x9 proof size: ${proof9x9.length} bytes`);

  // ============================================================
  // 5. Artifacts ricorsivi
  // ============================================================
  console.log('[4] Generating recursive proof artifacts...');
  const artifacts4x4 =
    await backend4x4.generateRecursiveProofArtifacts(
      proof4x4,
      pub4x4.length,
      { verifierTarget: 'noir-recursive-no-zk' }
    );

  const artifacts9x9 =
    await backend9x9.generateRecursiveProofArtifacts(
      proof9x9,
      pub9x9.length,
      { verifierTarget: 'noir-recursive-no-zk' }
    );

  // ============================================================
  // 6. Conversione VK / Proof in fields
  // ============================================================
  console.log('[5] Converting to fields...');
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

  console.log(`   key_hash 4x4: ${artifacts4x4.vkHash.substring(0, 20)}...`);
  console.log(`   key_hash 9x9: ${artifacts9x9.vkHash.substring(0, 20)}...`);

  // ============================================================
  // 7. Inputs per aggregator
  // ============================================================
  const aggregatorInputs = {
    vk_4x4: vk4x4Fields,
    proof_4x4: proof4x4Fields,
    public_inputs_4x4: pub4x4,
    key_hash_4x4: artifacts4x4.vkHash,

    vk_9x9: vk9x9Fields,
    proof_9x9: proof9x9Fields,
    public_inputs_9x9: pub9x9,
    key_hash_9x9: artifacts9x9.vkHash,
  };

  // ============================================================
  // 8. Backend AGGREGATOR (USA LO STESSO CRS)
  // ============================================================
  console.log('[6] Setup aggregator backend...');
  const aggregatorApi = await Barretenberg.new({ crs, threads: 8 });
  const aggregatorBackend =
    new UltraHonkBackend(aggregatorCircuit.bytecode, aggregatorApi);

  // ============================================================
  // 9. Witness aggregator
  // ============================================================
  console.log('[7] Generating aggregator witness...');
  const aggregatorNoir = new Noir(aggregatorCircuit);
  const { witness: aggWitness } =
    await aggregatorNoir.execute(aggregatorInputs);
  console.log('✅ Witness generated');

  // ============================================================
  // 10. Proof aggregata
  // ============================================================
  console.log('[8] Generating aggregated proof...');
  const { proof: aggProof, publicInputs: aggPub } =
    await aggregatorBackend.generateProof(
      aggWitness,
      { verifierTarget: 'evm' }
    );

  console.log('✅ Aggregated proof generated');
  console.log(`   Proof size: ${aggProof.length} bytes ⭐`);

  // ============================================================
  // 11. Verifica locale
  // ============================================================
  console.log('\n[9] Verifying locally...');
  const verified =
    await aggregatorBackend.verifyProof(
      { proof: aggProof, publicInputs: aggPub },
      { verifierTarget: 'evm' }
    );

  console.log(`   Result: ${verified ? '✅ VERIFIED' : '❌ FAILED'}`);
  if (!verified) {
    process.exit(1);
  }

  // ============================================================
  // 12. Salvataggio file
  // ============================================================
  console.log('\n[10] Saving files...');
  fs.writeFileSync('../aggregator/target/proof', aggProof);

  const proofHex = '0x' + Buffer.from(aggProof).toString('hex');
  fs.writeFileSync('../aggregator/target/proof_hex.txt', proofHex);
  fs.writeFileSync('../aggregator/target/public_inputs.json', JSON.stringify(aggPub));

  const pubInputsArray =
    `[${aggPub.map(x => `"${x}"`).join(', ')}]`;
  fs.writeFileSync('../aggregator/target/public_inputs_array.txt', pubInputsArray);

  console.log('💾 Files salvati');

  // Cleanup
  await backend4x4.destroy();
  await backend9x9.destroy();
  await aggregatorBackend.destroy();

  console.log('\n✅ PROOF AGGREGATA GENERATA CON SUCCESSO!');
  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Errore:', error.message);
  console.error(error.stack);
  process.exit(1);
});
