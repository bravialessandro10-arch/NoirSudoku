#!/bin/bash
set -e

DEPTH=12
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MAX_ELEMENTS=$((2**DEPTH))

echo "🔨 Generazione Proof Merkle Tree (Depth ${DEPTH}) con Metriche"
echo "============================================"
echo "Max elementi: ${MAX_ELEMENTS}"
echo ""

# 1. Compila circuito (con misurazione tempo)
echo "📦 Compilazione circuito..."
COMPILE_START=$(date +%s%N)
nargo compile
COMPILE_END=$(date +%s%N)
COMPILE_TIME=$(echo "scale=3; ($COMPILE_END - $COMPILE_START) / 1000000000" | bc)

if [ $? -ne 0 ]; then
    echo "❌ Errore compilazione"
    exit 1
fi

# 2. Genera VK (con misurazione tempo)
echo "🔑 Generazione verification key..."
VK_START=$(date +%s%N)
bb write_vk -b ./target/merkle_depth12.json -o ./target --oracle_hash keccak
VK_END=$(date +%s%N)
VK_TIME=$(echo "scale=3; ($VK_END - $VK_START) / 1000000000" | bc)

if [ $? -ne 0 ]; then
    echo "❌ Errore generazione VK"
    exit 1
fi

# 3. Genera Verifier Solidity
echo "📜 Generazione Verifier.sol..."
VERIFIER_START=$(date +%s%N)
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol
VERIFIER_END=$(date +%s%N)
VERIFIER_TIME=$(echo "scale=3; ($VERIFIER_END - $VERIFIER_START) / 1000000000" | bc)

# 4. Esegui circuito (genera witness con misurazione)
echo "⚙️  Esecuzione witness generation..."
WITNESS_START=$(date +%s%N)
nargo execute
WITNESS_END=$(date +%s%N)
WITNESS_TIME=$(echo "scale=3; ($WITNESS_END - $WITNESS_START) / 1000000000" | bc)

if [ $? -ne 0 ]; then
    echo "❌ Errore esecuzione"
    exit 1
fi

# 5. Genera proof (CON MISURAZIONE PRECISA)
echo "🔐 Generazione proof..."
PROOF_START=$(date +%s%N)
bb prove -b ./target/merkle_depth12.json \
    -w ./target/merkle_depth12.gz \
    -o ./target \
    --oracle_hash keccak
PROOF_END=$(date +%s%N)
PROOF_TIME=$(echo "scale=3; ($PROOF_END - $PROOF_START) / 1000000000" | bc)

if [ $? -ne 0 ]; then
    echo "❌ Errore generazione proof"
    exit 1
fi

# 6. MISURA DIMENSIONI FILE
PROOF_SIZE=$(stat -f%z ./target/proof 2>/dev/null || stat -c%s ./target/proof)
VK_SIZE=$(stat -f%z ./target/vk 2>/dev/null || stat -c%s ./target/vk)
WITNESS_SIZE=$(stat -f%z ./target/merkle_depth12.gz 2>/dev/null || stat -c%s ./target/merkle_depth12.gz)
VERIFIER_SIZE=$(stat -f%z ./target/Verifier.sol 2>/dev/null || stat -c%s ./target/Verifier.sol)

# Converti in KB
PROOF_KB=$(echo "scale=2; $PROOF_SIZE / 1024" | bc)
VK_KB=$(echo "scale=2; $VK_SIZE / 1024" | bc)
WITNESS_KB=$(echo "scale=2; $WITNESS_SIZE / 1024" | bc)
VERIFIER_KB=$(echo "scale=2; $VERIFIER_SIZE / 1024" | bc)

# Calcola tempo totale
TOTAL_TIME=$(echo "scale=3; $COMPILE_TIME + $VK_TIME + $WITNESS_TIME + $PROOF_TIME + $VERIFIER_TIME" | bc)

# 7. REPORT DETTAGLIATO
echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 REPORT METRICHE - MERKLE TREE DEPTH ${DEPTH}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "⏱️  TEMPI DI ESECUZIONE:"
echo "   ┌─────────────────────────────────────────────────────┐"
echo "   │ Compilation:          ${COMPILE_TIME}s                    │"
echo "   │ VK Generation:        ${VK_TIME}s                    │"
echo "   │ Verifier Generation:  ${VERIFIER_TIME}s                    │"
echo "   │ Witness Generation:   ${WITNESS_TIME}s                    │"
echo "   │ ⭐ PROOF Generation:  ${PROOF_TIME}s ⭐             │"
echo "   ├─────────────────────────────────────────────────────┤"
echo "   │ TOTALE:               ${TOTAL_TIME}s                    │"
echo "   └─────────────────────────────────────────────────────┘"
echo ""
echo "📦 DIMENSIONI FILE:"
echo "   ┌─────────────────────────────────────────────────────┐"
echo "   │ ⭐ Proof:             ${PROOF_KB} KB (${PROOF_SIZE} bytes) ⭐     │"
echo "   │ Verification Key:     ${VK_KB} KB (${VK_SIZE} bytes)       │"
echo "   │ Witness:              ${WITNESS_KB} KB (${WITNESS_SIZE} bytes)      │"
echo "   │ Verifier.sol:         ${VERIFIER_KB} KB (${VERIFIER_SIZE} bytes)  │"
echo "   └─────────────────────────────────────────────────────┘"
echo ""
echo "📈 CARATTERISTICHE CIRCUITO:"
echo "   • Tree Depth:          ${DEPTH}"
echo "   • Max elementi:        ${MAX_ELEMENTS}"
echo "   • Livelli albero:      ${DEPTH}"
echo "   • Public inputs:       1 (root)"
echo "   • Hash function:       Blake2s"
echo "   • Schema:              UltraHonk"
echo ""
echo "════════════════════════════════════════════════════════════"

# 8. SALVA METRICHE IN FILE CSV
METRICS_FILE="./target/metrics_depth${DEPTH}.csv"

if [ ! -f "$METRICS_FILE" ]; then
    echo "timestamp,depth,max_elements,compile_time,vk_time,verifier_time,witness_time,proof_time,total_time,proof_size_bytes,proof_size_kb,vk_size_kb,witness_size_kb,verifier_size_kb" > "$METRICS_FILE"
fi

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "$TIMESTAMP,$DEPTH,$MAX_ELEMENTS,$COMPILE_TIME,$VK_TIME,$VERIFIER_TIME,$WITNESS_TIME,$PROOF_TIME,$TOTAL_TIME,$PROOF_SIZE,$PROOF_KB,$VK_KB,$WITNESS_KB,$VERIFIER_KB" >> "$METRICS_FILE"

echo "💾 Metriche salvate in: $METRICS_FILE"
echo ""

# 9. CREA REPORT TESTUALE
REPORT_FILE="./target/report_depth${DEPTH}.txt"
cat > "$REPORT_FILE" << EOF
═══════════════════════════════════════════════════════════════
MERKLE TREE DEPTH ${DEPTH} - ZERO-KNOWLEDGE PROOF GENERATION REPORT
═══════════════════════════════════════════════════════════════

Data: $TIMESTAMP

PARAMETRI CHIAVE (per tesi):
─────────────────────────────────────────────────────────────
- Tempo Generazione Proof:    ${PROOF_TIME}s
- Dimensione Proof:            ${PROOF_KB} KB (${PROOF_SIZE} bytes)

BREAKDOWN COMPLETO:
─────────────────────────────────────────────────────────────
Tempi:
  - Compilation:               ${COMPILE_TIME}s
  - VK generation:             ${VK_TIME}s
  - Verifier generation:       ${VERIFIER_TIME}s
  - Witness generation:        ${WITNESS_TIME}s
  - Proof generation:          ${PROOF_TIME}s
  - TOTALE:                    ${TOTAL_TIME}s

Dimensioni:
  - Proof:                     ${PROOF_KB} KB
  - Verification Key:          ${VK_KB} KB
  - Witness (compressed):      ${WITNESS_KB} KB
  - Verifier.sol:              ${VERIFIER_KB} KB

CARATTERISTICHE CIRCUITO:
─────────────────────────────────────────────────────────────
  - Tipo:                      Merkle Tree Membership
  - Tree Depth:                ${DEPTH}
  - Max elementi:              ${MAX_ELEMENTS}
  - Public inputs:             1 (root)
  - Private inputs:            $((DEPTH * 2 + 1))
  - Hash function:             Blake2s (31 bytes output)
  - Schema:                    UltraHonk
  - Hash Oracle:               Keccak

SCALABILITÀ:
─────────────────────────────────────────────────────────────
  - Depth 7:                   128 elementi
  - Depth 8:                   256 elementi
  - Depth 10:                  1,024 elementi
  - Depth 12 (attuale):        4,096 elementi
  - Depth 15:                  32,768 elementi

═══════════════════════════════════════════════════════════════
EOF

echo "📄 Report testuale salvato in: $REPORT_FILE"
echo ""
echo "✅ GENERAZIONE COMPLETATA CON SUCCESSO!"
echo ""
echo "📁 File generati:"
echo "  - Prover.toml (input)"
echo "  - target/proof (prova ZK)"
echo "  - target/vk (verification key)"
echo "  - target/Verifier.sol (contratto Solidity)"
echo "  - target/metrics_depth${DEPTH}.csv (metriche CSV)"
echo "  - target/report_depth${DEPTH}.txt (report testuale)"
echo ""