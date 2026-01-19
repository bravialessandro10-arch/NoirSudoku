// scripts/convert_bb_proofs_to_toml.js
const { UltraHonkBackend, deflattenFields } = require('@aztec/bb.js');
const fs = require('fs');

async function main() {
    console.log('🔄 Converting bb CLI proofs to Prover.toml\n');
    
    // Backend SOLO per utility functions (non per generare proof!)
    const circuit4x4 = JSON.parse(fs.readFileSync('../Sudoku44/target/Sudoku44.json', 'utf8'));
    const circuit9x9 = JSON.parse(fs.readFileSync('../Sudoku99/target/Sudoku99.json', 'utf8'));
    
    const backend4x4 = new UltraHonkBackend(circuit4x4.bytecode);
    const backend9x9 = new UltraHonkBackend(circuit9x9.bytecode);
    
    // ⭐ Leggi proof generate DA bb CLI
    console.log('[1] Reading bb CLI outputs...');
    const proof4x4 = fs.readFileSync('../Sudoku44/target/proof');
    const vk4x4 = fs.readFileSync('../Sudoku44/target/vk');
    const proof9x9 = fs.readFileSync('../Sudoku99/target/proof');
    const vk9x9 = fs.readFileSync('../Sudoku99/target/vk');
    
    console.log(`   4×4: proof=${proof4x4.length}B, vk=${vk4x4.length}B`);
    console.log(`   9×9: proof=${proof9x9.length}B, vk=${vk9x9.length}B`);
    
    // ⭐ Converti con deflattenFields (solo utility!)
    console.log('\n[2] Converting to Field arrays...');
    const vk4x4Fields = deflattenFields(vk4x4);
    const proof4x4Fields = deflattenFields(proof4x4);
    const vk9x9Fields = deflattenFields(vk9x9);
    const proof9x9Fields = deflattenFields(proof9x9);
    
    console.log(`   VK 4×4: ${vk4x4Fields.length} fields`);
    console.log(`   Proof 4×4: ${proof4x4Fields.length} fields`);
    
    // Leggi public inputs dai Prover.toml originali
    console.log('\n[3] Reading public inputs...');
    const toml4x4 = fs.readFileSync('../Sudoku44/Prover.toml', 'utf8');
    const toml9x9 = fs.readFileSync('../Sudoku99/Prover.toml', 'utf8');
    
    const prob4x4Match = toml4x4.match(/problema\s*=\s*(\[[\s\S]*?\]\s*\])/);
    const prob9x9Match = toml9x9.match(/problema\s*=\s*(\[[\s\S]*?\]\s*\])/);
    
    const pub4x4 = JSON.parse(prob4x4Match[1]).flat();
    const pub9x9 = JSON.parse(prob9x9Match[1]).flat();
    
    console.log(`   Public inputs 4×4: ${pub4x4.length}`);
    console.log(`   Public inputs 9×9: ${pub9x9.length}`);
    
    // ⭐ Genera key_hash (solo utility!)
    console.log('\n[4] Generating key hashes...');
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
    
    console.log(`   key_hash 4×4: ${artifacts4x4.vkHash.substring(0, 30)}...`);
    console.log(`   key_hash 9×9: ${artifacts9x9.vkHash.substring(0, 30)}...`);
    
    // Crea Prover.toml
    const proverToml = `# Generated from bb CLI proofs
# Date: ${new Date().toISOString()}

vk_4x4 = ${JSON.stringify(vk4x4Fields.map(f => f.toString()))}

proof_4x4 = ${JSON.stringify(proof4x4Fields.map(f => f.toString()))}

public_inputs_4x4 = ${JSON.stringify(pub4x4)}

key_hash_4x4 = "${artifacts4x4.vkHash}"

vk_9x9 = ${JSON.stringify(vk9x9Fields.map(f => f.toString()))}

proof_9x9 = ${JSON.stringify(proof9x9Fields.map(f => f.toString()))}

public_inputs_9x9 = ${JSON.stringify(pub9x9)}

key_hash_9x9 = "${artifacts9x9.vkHash}"
`;
    
    fs.writeFileSync('./Prover.toml', proverToml);
    console.log('\n💾 Prover.toml saved');
    
    await backend4x4.destroy();
    await backend9x9.destroy();
    
    console.log('\n✅ Conversion complete!');
    console.log('\nNext: nargo execute && bb prove');
}

main().catch(console.error);