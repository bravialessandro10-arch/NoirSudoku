#!/bin/bash
set -e

echo "=== PREPARO PROOF AGGREGATA ==="
echo ""


# 1. Converti proof in hex
echo "[1] Converting proof to hex..."
PROOF_HEX="0x$(xxd -p -c 0 target/proof)"
PROOF_SIZE=$(wc -c < target/proof)
echo "    Proof size: $PROOF_SIZE bytes"

# 2. Leggi public inputs (è un JSON array)
echo ""
echo "[2] Processing public inputs..."




    echo "    Converting binary public inputs to hex..."
    PUBLIC_INPUTS_HEX=$(xxd -p -c 0 target/public_inputs)
    PUBLIC_INPUTS_SIZE=$(wc -c < target/public_inputs)
    NUM_INPUTS=$((PUBLIC_INPUTS_SIZE / 32))
    
    echo "    Found $NUM_INPUTS public inputs"
    
    # Crea array
    PUBLIC_INPUTS_ARRAY="["
    for i in $(seq 0 $((NUM_INPUTS - 1))); do
        OFFSET=$((i * 64))
        INPUT_HEX="0x${PUBLIC_INPUTS_HEX:$OFFSET:64}"
        
        if [ $i -eq 0 ]; then
            PUBLIC_INPUTS_ARRAY="$PUBLIC_INPUTS_ARRAY\"$INPUT_HEX\""
        else
            PUBLIC_INPUTS_ARRAY="$PUBLIC_INPUTS_ARRAY,\"$INPUT_HEX\""
        fi
        
        echo "    Input $i: $INPUT_HEX"
    done
    PUBLIC_INPUTS_ARRAY="$PUBLIC_INPUTS_ARRAY]"


echo ""
echo "=== PARAMETRI PER VERIFIER SOLIDITY ==="
echo ""
echo "Function: verify(bytes calldata _proof, bytes32[] calldata _publicInputs)"
echo ""
echo "Parameter 1 - _proof:"
echo "$PROOF_HEX"
echo ""
echo "Parameter 2 - _publicInputs:"
echo "$PUBLIC_INPUTS_ARRAY"
echo ""

# Salva
echo "$PROOF_HEX" > target/proof_hex.txt
echo "$PUBLIC_INPUTS_ARRAY" > target/public_inputs_array.txt

echo "Files salvati:"
echo "  - target/proof_hex.txt"
echo "  - target/public_inputs_array.txt"