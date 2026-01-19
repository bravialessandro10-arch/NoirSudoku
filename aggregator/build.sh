#!/bin/bash
set -e

cd ..
cd Sudoku44

nargo compile
bb write_vk --verifier_target noir-recursive-no-zk -b ./target/Sudoku44.json -o ./target
cd ..

cd Sudoku99
bb write_vk --verifier_target noir-recursive-no-zk -b ./target/Sudoku99.json -o ./target
cd ..

cd aggregator
nargo compile
bb write_vk --verifier_target evm -b ./target/aggregator.json -o ./target
bb write_solidity_verifier -k ./target/vk -o ./target/VerifierAggregator.sol
cd ..

echo "Done"