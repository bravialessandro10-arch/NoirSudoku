import { expect } from "chai";
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

describe("HonkVerifier On-Chain Verification", function () {
  it("Verifica proof zk on-chain", async function () {
     let transcriptLib: any;
     let transcriptAddress: string;
     let verifier: any;
    // Deploy library mancante (ZKTranscriptLib)
    const TranscriptLibFactory = await ethers.getContractFactory("contracts/VerifierAggregator.sol:ZKTranscriptLib");
     transcriptLib = await TranscriptLibFactory.deploy();
    await transcriptLib.waitForDeployment();
     transcriptAddress = await transcriptLib.getAddress();

    // Deploy temp HonkVerifier con linking (risolve errore missing links)
    const VerifierFactory = await ethers.getContractFactory("contracts/VerifierAggregator.sol:HonkVerifier", {
      libraries: {
        ZKTranscriptLib: transcriptAddress,  // Link qui
      },
    });
     verifier = await VerifierFactory.deploy();
    await verifier.waitForDeployment();

    // Carica proof hex da file
    const proofPath = path.join(__dirname, "../../aggregator/target/proof_hex.txt");  
    const proof = fs.readFileSync(proofPath, "utf8").trim();

    // Carica publicInputs array da file (parse JSON)
    const publicInputsPath = path.join(__dirname, "../../aggregator/target/public_inputs_array.txt");
    const publicInputsStr = fs.readFileSync(publicInputsPath, "utf8").trim();
    const publicInputs = JSON.parse(publicInputsStr);

    // Chiama verify on-chain con proof e publicInputs
    const result = await verifier.verify(proof, publicInputs);

    expect(result).to.be.true;
    console.log("Verifica zk on-chain completata con successo!");
  });
});