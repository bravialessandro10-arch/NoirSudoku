const blake = require('blake2');
const fs = require('fs');
const path = require('path');

const TREE_DEPTH = parseInt(process.argv[2]);
const OUTPUT_DIR = process.argv[3] || '.';

if (!TREE_DEPTH) {
    console.error('Usage: node generate_inputs_blake2s.js <depth> [output_dir]');
    process.exit(1);
}

const WHITELIST_SIZE = Math.pow(2, TREE_DEPTH);
const YOUR_INDEX = 42;

console.log(` Generando Merkle tree con Blake2s`);
console.log(`   Depth: ${TREE_DEPTH}`);
console.log(`   Whitelist size: ${WHITELIST_SIZE}`);

// Converti BigInt a 32-byte hex string
function toHex32(value) {
    return BigInt(value).toString(16).padStart(64, '0');
}

// Converti hex a BigInt
function fromHex(hex) {
    return BigInt('0x' + hex);
}

// Hash singolo valore con Blake2s (troncato a 31 bytes)
function hashToField(data) {
    const seed = BigInt(data.split('_')[1] || 0);
    
    const h = blake.createHash('blake2s');
    h.update(Buffer.from(toHex32(seed), 'hex'));
    const hashBuffer = h.digest();
    
    // Tronca a 31 bytes (scarta il primo byte per stare sotto modulo BN254)
    const truncated = hashBuffer.slice(1); // Byte 1-31 (31 bytes totali)
    
    return BigInt('0x' + truncated.toString('hex')).toString();
}

// Hash coppia di nodi con Blake2s (troncato a 31 bytes)
function hashPair(left, right) {
    const h = blake.createHash('blake2s');
    
    // Concatena left e right (64 + 64 = 128 hex chars)
    const leftHex = toHex32(left);
    const rightHex = toHex32(right);
    
    h.update(Buffer.from(leftHex + rightHex, 'hex'));
    const hashBuffer = h.digest();
    
    // Tronca a 31 bytes (scarta il primo byte per stare sotto modulo BN254)
    const truncated = hashBuffer.slice(1); // Byte 1-31 (31 bytes totali)
    
    return BigInt('0x' + truncated.toString('hex')).toString();
}

// Genera whitelist
function generateWhitelist(size) {
    const whitelist = [];
    for (let i = 0; i < size; i++) {
        whitelist.push(`user_${i.toString().padStart(10, '0')}`);
    }
    return whitelist;
}

// Costruisci Merkle tree
function buildMerkleTree(whitelist) {
    console.log('\n Hashing foglie...');
    const leaves = whitelist.map((addr, idx) => {
        if (idx % 100 === 0) console.log(`   ${idx}/${whitelist.length}`);
        return hashToField(addr);
    });
    console.log('    Foglie hashate');
    
    console.log('\n Costruendo albero...');
    let currentLevel = leaves;
    const tree = [currentLevel];
    
    let levelNum = 0;
    while (currentLevel.length > 1) {
        console.log(`   Livello ${levelNum}: ${currentLevel.length} nodi`);
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const left = currentLevel[i];
            const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];
            const parent = hashPair(left, right);
            nextLevel.push(parent);
        }
        tree.push(nextLevel);
        currentLevel = nextLevel;
        levelNum++;
    }
    console.log('    Albero costruito');
    
    return { tree, leaves };
}

// Genera proof 
function generateProof(tree, leafIndex) {
    const pathElements = [];
    const pathIndices = [];
    
    let currentIndex = leafIndex;
    
    for (let level = 0; level < tree.length - 1; level++) {
        const currentLevel = tree[level];
        const isRightNode = currentIndex % 2 === 1;
        const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
        
        const sibling = siblingIndex < currentLevel.length 
            ? currentLevel[siblingIndex] 
            : currentLevel[currentIndex];
        
        pathElements.push(sibling);
        pathIndices.push(isRightNode ? '1' : '0');
        
        currentIndex = Math.floor(currentIndex / 2);
    }
    
    // Padding se necessario
    while (pathElements.length < TREE_DEPTH) {
        pathElements.push('0');
        pathIndices.push('0');
    }
    
    return { pathElements, pathIndices };
}

async function main() {
    try {
        console.log('\n Generando whitelist...');
        const whitelist = generateWhitelist(WHITELIST_SIZE);
        
        console.log(' Costruendo Merkle tree...');
        const { tree, leaves } = buildMerkleTree(whitelist);
        
        const root = tree[tree.length - 1][0];
        const leaf = leaves[YOUR_INDEX];
        
        console.log('\n Generando proof...');
        const { pathElements, pathIndices } = generateProof(tree, YOUR_INDEX);
        
        console.log('\n Risultati:');
        console.log(`   Root: ${root}`);
        console.log(`   Leaf: ${leaf}`);
        console.log(`   Path length: ${pathElements.filter(e => e !== '0').length}`);
        
        const proverToml = `# Merkle Tree Membership Proof - Depth ${TREE_DEPTH}
# Hash function: Blake2s
# Whitelist size: ${WHITELIST_SIZE}
# Your element: ${whitelist[YOUR_INDEX]}

# INPUT PRIVATO: il tuo elemento
leaf = "${leaf}"

# INPUT PRIVATO: direzioni (${TREE_DEPTH} elementi)
path_indices = [${pathIndices.join(', ')}]

# INPUT PRIVATO: hash siblings (${TREE_DEPTH} elementi)
path_elements = [${pathElements.map(e => `"${e}"`).join(', ')}]

# INPUT PUBBLICO: merkle root
root = "${root}"
`;
        
        const proverPath = path.join(OUTPUT_DIR, 'Prover.toml');
        fs.writeFileSync(proverPath, proverToml);
        console.log(`\n✅ Prover.toml generato: ${proverPath}`);
        
        const metaPath = path.join(OUTPUT_DIR, 'whitelist_metadata.json');
        fs.writeFileSync(metaPath, JSON.stringify({
            hash_function: 'blake2s',
            depth: TREE_DEPTH,
            size: WHITELIST_SIZE,
            your_index: YOUR_INDEX,
            your_address: whitelist[YOUR_INDEX],
            root: root,
            leaf: leaf
        }, null, 2));
        console.log(` Metadata salvati: ${metaPath}`);
        
        console.log('\n COMPLETATO! Prossimi passi:');
        console.log('   1. Aggiorna main.nr per usare Blake2s');
        console.log('   2. nargo compile');
        console.log('   3. nargo execute');
        
    } catch (error) {
        console.error('\n❌ ERRORE:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();