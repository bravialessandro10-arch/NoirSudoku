const { UltraHonkBackend, deflattenFields } = require('@aztec/bb.js');
const fs = require('fs');

async function generateRecursiveInputs(name, circuitPath, witnessPath, numPublicInputs) {
    console.log(`\n[${name}]`);
    
    try {
        // 1. Leggi circuito
        const circuit = JSON.parse(fs.readFileSync(circuitPath, 'utf8'));
        
        // 2. ⭐ Crea backend con flag RECURSIVE!
        const backend = new UltraHonkBackend(
            circuit.bytecode,
            { threads: 8 },
            { recursive: true }  // ⭐ QUESTO ERA IL PROBLEMA!
        );
        
        console.log('   ✅ Backend created (recursive mode)');
        
        // 3. Genera proof
        const witness = fs.readFileSync(witnessPath);
        const { proof, publicInputs } = await backend.generateProof(witness);
        
        console.log(`   ✅ Proof: ${proof.length} bytes`);
        console.log(`   ✅ Public inputs: ${publicInputs.length} values`);
        
        // 4. ⭐ Ottieni VK e converti con deflattenFields
        const vk = await backend.getVerificationKey();
        const vkAsFields = deflattenFields(vk);
        const proofAsFields = deflattenFields(proof);
        
        console.log(`   ✅ vkAsFields: ${vkAsFields.length} fields`);
        console.log(`   ✅ proofAsFields: ${proofAsFields.length} fields`);
        
        // 5. ⭐ Genera artifacts SOLO per vkHash
        const artifacts = await backend.generateRecursiveProofArtifacts(proof, numPublicInputs);
        const vkHash = artifacts.vkHash;
        
        console.log(`   ✅ vkHash: ${vkHash.substring(0, 20)}...`);
        
        await backend.destroy();
        
        return {
            vkAsFields,
            proofAsFields,
            vkHash,
            publicInputs
        };
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        throw error;
    }
}

async function main() {
    console.log('🔄 Generazione Recursive Inputs (METODO CORRETTO)');
    console.log('==================================================\n');
    
    try {
        // Sudoku 4×4
        const artifacts4x4 = await generateRecursiveInputs(
            'Sudoku 4×4',
            '../Sudoku44/target/Sudoku44.json',
            '../Sudoku44/target/Sudoku44.gz',
            16
        );
        
        // Sudoku 9×9
        const artifacts9x9 = await generateRecursiveInputs(
            'Sudoku 9×9',
            '../Sudoku99/target/Sudoku99.json',
            '../Sudoku99/target/Sudoku99.gz',
            81
        );
        
        // Genera Prover.toml
        console.log('\n[Generazione Prover.toml]');
        
        const proverToml = `# Generated with correct recursive method

vk_4x4 = [
${artifacts4x4.vkAsFields.map(f => `  "${f}"`).join(',\n')}
]

proof_4x4 = [
${artifacts4x4.proofAsFields.map(f => `  "${f}"`).join(',\n')}
]

public_inputs_4x4 = [
${artifacts4x4.publicInputs.map(f => `  "${f}"`).join(',\n')}
]

key_hash_4x4 = "${artifacts4x4.vkHash}"

vk_9x9 = [
${artifacts9x9.vkAsFields.map(f => `  "${f}"`).join(',\n')}
]

proof_9x9 = [
${artifacts9x9.proofAsFields.map(f => `  "${f}"`).join(',\n')}
]

public_inputs_9x9 = [
${artifacts9x9.publicInputs.map(f => `  "${f}"`).join(',\n')}
]

key_hash_9x9 = "${artifacts9x9.vkHash}"
`;
        
        fs.writeFileSync('Prover.toml', proverToml);
        
        console.log('   ✅ Prover.toml written');
        console.log('\n✅ COMPLETATO!');
        console.log(`\n📊 4×4: VK=${artifacts4x4.vkAsFields.length}, Proof=${artifacts4x4.proofAsFields.length}`);
        console.log(`📊 9×9: VK=${artifacts9x9.vkAsFields.length}, Proof=${artifacts9x9.proofAsFields.length}`);
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

main();