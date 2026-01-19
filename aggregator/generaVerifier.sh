#!/bin/bash
set -e

echo "🔨 Generazione Verifier Aggregator (EVM)"
echo "========================================"


nargo compile

# VK con Keccak (per verifica on-chain)
echo "🔑 Generazione VK (keccak)..."
bb write_vk -b ./target/aggregator.json \
    -o ./target \
    --oracle_hash keccak

# Genera Verifier.sol
echo "📜 Generazione Verifier.sol..."
bb write_solidity_verifier -k ./target/vk \
    -o ./target/Verifier.sol

echo "✅ Verifier.sol generato!"