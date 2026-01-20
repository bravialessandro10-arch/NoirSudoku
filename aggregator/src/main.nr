use bb_proof_verification::{UltraHonkZKProof, UltraHonkVerificationKey, verify_honk_proof};

fn main(
    // Sudoku 4x4
    vk_4x4: UltraHonkVerificationKey,
    proof_4x4: UltraHonkZKProof,
    public_inputs_4x4: pub [Field; 16],
    key_hash_4x4: Field,

    // Sudoku 9x9
    vk_9x9: UltraHonkVerificationKey,
    proof_9x9: UltraHonkZKProof,
    public_inputs_9x9: pub [Field; 81],
    key_hash_9x9: Field
) {
    // Verify 4x4 proof recursively (ZK)
    verify_honk_proof(vk_4x4, proof_4x4, public_inputs_4x4, key_hash_4x4);

    // Verify 9x9 proof recursively (ZK)
    verify_honk_proof(vk_9x9, proof_9x9, public_inputs_9x9, key_hash_9x9);
}