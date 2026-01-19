#!/bin/bash
# convert_merkle_proof.sh
set -e

echo "=== PREPARO PROOF MERKLE TREE ==="
echo ""

# 1. Verifica file
if [ ! -f "target/proof" ] || [ ! -f "target/public_inputs" ]; then
    echo "❌ File mancanti!"
    exit 1
fi

# 2. Converti proof
echo "[1] Converting proof to hex..."
PROOF_HEX="0x$(xxd -p -c 0 target/proof)"
PROOF_SIZE=$(wc -c < target/proof)
echo "    Proof: $PROOF_SIZE bytes"

# 3. Converti public inputs (solo 1 elemento: la root!)
echo "[2] Converting public inputs..."
PUBLIC_INPUTS_HEX=$(xxd -p -c 0 target/public_inputs)
PUBLIC_INPUTS_SIZE=$(wc -c < target/public_inputs)
NUM_INPUTS=$((PUBLIC_INPUTS_SIZE / 32))

echo "    Public inputs: $NUM_INPUTS elemento(i)"

if [ $NUM_INPUTS -ne 1 ]; then
    echo "⚠️  Warning: Expected 1 input (merkle root), got $NUM_INPUTS"
fi

# 4. Estrai root (BIG-ENDIAN)
INPUT_HEX_NO_PREFIX=${PUBLIC_INPUTS_HEX:0:64}
ROOT_HEX="0x$INPUT_HEX_NO_PREFIX"

# Decodifica per visualizzazione
VALUE_HEX_CLEAN=$(echo "$INPUT_HEX_NO_PREFIX" | sed 's/^0*//')
if [ -z "$VALUE_HEX_CLEAN" ]; then
    ROOT_DEC=0
else
    ROOT_DEC=$((16#$VALUE_HEX_CLEAN))
fi

# 5. Visualizza info
echo ""
echo "📋 Merkle Tree Proof Info:"
echo ""
echo "    Public Input (Merkle Root):"
echo "    • Hex: $ROOT_HEX"
echo "    • Dec: $ROOT_DEC"
echo ""

# 6. Genera JSON per Solidity (array con 1 elemento)
PUBLIC_INPUTS_JSON="[\"$ROOT_HEX\"]"

# 7. Salva
echo "$PROOF_HEX" > target/proof_hex.txt
echo "$PUBLIC_INPUTS_JSON" > target/public_inputs_array.txt

# 8. Output
echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Parametri per verify(bytes _proof, bytes32[] _publicInputs)"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Proof size: $(echo "scale=2; $PROOF_SIZE / 1024" | bc) KB"
echo "Public inputs: $NUM_INPUTS elemento (merkle root)"
echo ""
echo "Proof (primi 100 char): ${PROOF_HEX:0:100}..."
echo ""
echo "Public Input (root): $ROOT_HEX"
echo ""
echo "Files salvati:"
echo "  - target/proof_hex.txt"
echo "  - target/public_inputs_array.txt"
echo ""

# 9. Info aggiuntive
echo "📊 Merkle Tree Info:"
echo "  - Tree depth: 10 (da Prover.toml)"
echo "  - Whitelist size: 1024 foglie"
echo "  - Hash function: Blake2s"
echo "  - Privacy: ✅ Leaf, path nascosti"
echo "  - Public: ✅ Solo merkle root"
echo ""