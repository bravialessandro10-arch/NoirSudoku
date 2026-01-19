// Merkle Tree Membership Proof - Blake2s
// Dimostra appartenenza a whitelist senza rivelare identita

use dep::std;

global TREE_DEPTH: u32 = 12;

fn main(
    // INPUT PRIVATI 
    leaf: Field,                           // Il tuo elemento nella whitelist
    path_indices: [u1; TREE_DEPTH],       // Direzioni: 0=sinistra, 1=destra
    path_elements: [Field; TREE_DEPTH],   // Hash dei nodi sibling
    
    // INPUT PUBBLICO (verificabile da tutti)
    root: pub Field                        // Merkle root della whitelist
) {
    // Calcola la root partendo dalla foglia
    let computed_root = compute_merkle_root(leaf, path_indices, path_elements);
    
    // Verifica che corrisponda alla root pubblica
    assert(computed_root == root);
}

// Funzione per risalire l'albero di Merkle
fn compute_merkle_root(
    leaf: Field,
    path_indices: [u1; TREE_DEPTH],
    path_elements: [Field; TREE_DEPTH]
) -> Field {
    let mut current_hash = leaf;
    
    // Per ogni livello dell'albero
    for i in 0..TREE_DEPTH {
        let sibling = path_elements[i];
        let is_right = path_indices[i];
        
        // Determina l'ordine (left, right)
        let (left, right) = if is_right == 0 {
            (current_hash, sibling)  // Siamo a sinistra
        } else {
            (sibling, current_hash)  // Siamo a destra
        };
        
        // Hash del nodo padre con Blake2s
        current_hash = hash_pair_blake2s(left, right);
    }
    
    current_hash
}

// Hash coppia di Field usando Blake2s 
fn hash_pair_blake2s(left: Field, right: Field) -> Field {
    // Converti Field a bytes (32 bytes ciascuno)
    let left_bytes = field_to_bytes(left);
    let right_bytes = field_to_bytes(right);
    
    // Concatena (64 bytes totali)
    let mut input_bytes: [u8; 64] = [0; 64];
    for i in 0..32 {
        input_bytes[i] = left_bytes[i];
        input_bytes[i + 32] = right_bytes[i];
    }
    
    // Blake2s hash (32 bytes output)
    let hash_bytes_full = std::hash::blake2s(input_bytes);
    
    // IMPORTANTE: Tronca a 31 bytes per stare sotto modulo BN254
    // Il byte piu significativo (hash_bytes_full[0]) viene scartato
    let mut hash_bytes: [u8; 31] = [0; 31];
    for i in 0..31 {
        hash_bytes[i] = hash_bytes_full[i + 1];
    }
    
    // Converti bytes a Field (garantito < modulo)
    bytes_to_field_31(hash_bytes)
}

// Converti Field a 32 bytes (big-endian)
fn field_to_bytes(value: Field) -> [u8; 32] {
    let value_bytes = value.to_be_bytes();
    value_bytes
}



// Converti 31 bytes a Field (garantito < modulo BN254)
fn bytes_to_field_31(bytes: [u8; 31]) -> Field {
    let mut result: Field = 0;
    
    // Processa da sinistra a destra (big-endian)
    for i in 0..31 {
        let byte_val = bytes[i] as Field;
        result = result * 256 + byte_val;
    }
    
    result
}

#[test]
fn test_hash_consistency() {
    // Test che l'hash funzioni
    let left: Field = 10;
    let right: Field = 20;
    let hash = hash_pair_blake2s(left, right);
    
    // L'hash non dovrebbe essere 0
    assert(hash != 0);
}