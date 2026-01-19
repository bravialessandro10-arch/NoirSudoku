#!/bin/bash
set -e

echo "🔨 Generazione Proof Sudoku 4×4 con Metriche"
echo "============================================"

# 1. Compila circuito
echo "📦 Compilazione..."
nargo compile

if [ $? -ne 0 ]; then
    echo "❌ Errore compilazione"
    exit 1
fi

# 2. Genera VK (con misurazione tempo)
echo "🔑 Generazione verification key..."
VK_START=$(date +%s%N)
bb write_vk -b ./target/Sudoku44.json -o ./target --oracle_hash keccak
VK_END=$(date +%s%N)
VK_TIME=$(echo "scale=3; ($VK_END - $VK_START) / 1000000000" | bc)

# 3. Genera Verifier Solidity
echo "📜 Generazione Verifier.sol..."
VERIFIER_START=$(date +%s%N)
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol
VERIFIER_END=$(date +%s%N)
VERIFIER_TIME=$(echo "scale=3; ($VERIFIER_END - $VERIFIER_START) / 1000000000" | bc)

# 4. Crea Prover.toml
echo "📝 Generazione Prover.toml..."
cat > Prover.toml << 'EOF'
problema = [
    [1, 0, 3, 0],
    [0, 3, 0, 1],
    [0, 1, 0, 3],
    [3, 0, 1, 0]
]

soluzione = [
    [1, 2, 3, 4],
    [4, 3, 2, 1],
    [2, 1, 4, 3],
    [3, 4, 1, 2]
]
EOF

# 5. Esegui circuito (genera witness con misurazione)
echo "⚙️  Esecuzione circuito..."
WITNESS_START=$(date +%s%N)
nargo execute
WITNESS_END=$(date +%s%N)
WITNESS_TIME=$(echo "scale=3; ($WITNESS_END - $WITNESS_START) / 1000000000" | bc)

if [ $? -ne 0 ]; then
    echo "❌ Errore esecuzione"
    exit 1
fi

# 6. Genera proof (CON MISURAZIONE PRECISA)
echo "🔐 Generazione proof..."
PROOF_START=$(date +%s%N)
bb prove -b ./target/Sudoku44.json \
    -w ./target/Sudoku44.gz \
    -o ./target \
    --oracle_hash keccak
PROOF_END=$(date +%s%N)
PROOF_TIME=$(echo "scale=3; ($PROOF_END - $PROOF_START) / 1000000000" | bc)

# 7. MISURA DIMENSIONI FILE
PROOF_SIZE=$(stat -f%z ./target/proof 2>/dev/null || stat -c%s ./target/proof)
VK_SIZE=$(stat -f%z ./target/vk 2>/dev/null || stat -c%s ./target/vk)
WITNESS_SIZE=$(stat -f%z ./target/Sudoku44.gz 2>/dev/null || stat -c%s ./target/Sudoku44.gz)
VERIFIER_SIZE=$(stat -f%z ./target/Verifier.sol 2>/dev/null || stat -c%s ./target/Verifier.sol)

# Converti in KB
PROOF_KB=$(echo "scale=2; $PROOF_SIZE / 1024" | bc)
VK_KB=$(echo "scale=2; $VK_SIZE / 1024" | bc)
WITNESS_KB=$(echo "scale=2; $WITNESS_SIZE / 1024" | bc)
VERIFIER_KB=$(echo "scale=2; $VERIFIER_SIZE / 1024" | bc)

# Calcola tempo totale
TOTAL_TIME=$(echo "scale=3; $VK_TIME + $WITNESS_TIME + $PROOF_TIME + $VERIFIER_TIME" | bc)

# 8. REPORT DETTAGLIATO
echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 REPORT METRICHE - SUDOKU 4×4"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "⏱️  TEMPI DI ESECUZIONE:"
echo "   ┌─────────────────────────────────────────────────────┐"
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
echo "   • Dimensione griglia:  4×4"
echo "   • Celle totali:        16"
echo "   • Public inputs:       16"
echo "   • Blocchi 2×2:         4"
echo "   • Range valori:        1-4"
echo ""
echo "════════════════════════════════════════════════════════════"

# 9. SALVA METRICHE IN FILE CSV
METRICS_FILE="./target/metrics_4x4.csv"

if [ ! -f "$METRICS_FILE" ]; then
    echo "timestamp,vk_time,verifier_time,witness_time,proof_time,total_time,proof_size_bytes,proof_size_kb,vk_size_kb,witness_size_kb,verifier_size_kb" > "$METRICS_FILE"
fi

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "$TIMESTAMP,$VK_TIME,$VERIFIER_TIME,$WITNESS_TIME,$PROOF_TIME,$TOTAL_TIME,$PROOF_SIZE,$PROOF_KB,$VK_KB,$WITNESS_KB,$VERIFIER_KB" >> "$METRICS_FILE"

echo "💾 Metriche salvate in: $METRICS_FILE"
echo ""

# 10. CREA REPORT TESTUALE
REPORT_FILE="./target/report_4x4.txt"
cat > "$REPORT_FILE" << EOF
═══════════════════════════════════════════════════════════════
SUDOKU 4×4 - ZERO-KNOWLEDGE PROOF GENERATION REPORT
═══════════════════════════════════════════════════════════════

Data: $TIMESTAMP

PARAMETRI CHIAVE (per tesi):
─────────────────────────────────────────────────────────────
- Tempo Generazione Proof:    ${PROOF_TIME}s
- Dimensione Proof:            ${PROOF_KB} KB (${PROOF_SIZE} bytes)

BREAKDOWN COMPLETO:
─────────────────────────────────────────────────────────────
Tempi:
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
  - Tipo:                      Sudoku 4×4
  - Celle totali:              16
  - Public inputs:             16
  - Blocchi 2×2:               4
  - Schema:                    UltraHonk
  - Hash Oracle:               Keccak

═══════════════════════════════════════════════════════════════
EOF

echo "📄 Report testuale salvato in: $REPORT_FILE"
echo ""
echo "✅ GENERAZIONE COMPLETATA CON SUCCESSO!"
echo ""