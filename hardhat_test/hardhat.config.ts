import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1  // Minimo per ridurre dimensione
      },
      // NON usare viaIR con verifier ZK - causa stack too deep!
      evmVersion: "cancun"
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,  //  Permette contratti grandi
      gas: 100000000,
      blockGasLimit: 100000000
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      allowUnlimitedContractSize: true   // Fondamentale per evitare errori di size per contratti > 24KB
    }
  }
};

export default config;