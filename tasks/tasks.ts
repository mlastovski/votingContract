// npx hardhat createVoting --index 0 --candidates []
import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

task("deploy", "Deploys contract to the network")
  .setAction(async (_args, { ethers }) => {
    const [owner] = await ethers.getSigners();
    console.log("Deploying contract using owner address:", owner.address);
    console.log("Owner's balance:", (await owner.getBalance()).toString());
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    await voting.deployed();
    console.log("Voting deployed to: ", voting.address);
});

task("createVoting", "Creates voting")
  .addParam("index", "Voting index")
  .addParam("candidates", "Array of candidates")
  .setAction(async (taskArgs, { ethers }) => {
    const candidates = taskArgs.candidates.split(", ");

    const Voting = await ethers.getContractFactory("Voting");
    const voting = Voting.attach(contractAddress);
    const transaction = await voting.createVoting(taskArgs.index, candidates);
    await transaction.wait();
    console.log(transaction);
    
  });

task("getVotingInfo", "Gets voting info")
  .addParam("index", "VotingInfo index")
  .setAction(async (taskArgs, { ethers }) => {
    const index = taskArgs.index;
    const Voting = await ethers.getContractFactory("Voting");
    const voting = Voting.attach(contractAddress);
    const transaction = await voting.getVotingInfo(index);
    console.log(`VIEW, Voting info: ${transaction}`);
  });

task("vote", "Vote")
  .addParam("index", "voting index")
  .addParam("candidate", "candidate")
  .setAction(async (taskArgs, { ethers }) => {
    const Voting = await ethers.getContractFactory("Voting");
    const voting = Voting.attach(contractAddress);
    const transaction = await voting.vote(taskArgs.index, taskArgs.candidate, { value: parseEther("0.01") });
    console.log(`New vote: ${transaction}`);
  });

task("finishVoting", "Finish voting")
  .addParam("index", "voting index")
  .setAction(async (taskArgs, { ethers }) => {
    const Voting = await ethers.getContractFactory("Voting");
    const voting = Voting.attach(contractAddress);
    try {
      const transaction = await voting.finishVoting(taskArgs.index);
      console.log(transaction);
    } catch(e) {
      console.log(e);
    }

  });

task("withdraw", "Withdraw")
  .addParam("amount", "amount")
  .setAction(async (taskArgs, { ethers }) => {
    const Voting = await ethers.getContractFactory("Voting");
    const voting = Voting.attach(contractAddress);
    try {
      const transaction = await voting.withdraw(taskArgs.amount);
      console.log(transaction);
    } catch(e) {
      console.log(e);
    }
  });

task("getContractBalance", "Get contract balance")
  .addParam("address", "address")
  .setAction(async (taskArgs, { ethers }) => {
    const Voting = await ethers.getContractFactory("Voting");
    const voting = Voting.attach(taskArgs.address);
    const transaction = await voting.getContractBalance();
    console.log(transaction);
  });

task("getVotingsCount", "Gets voting count")
  .addParam("address", "address")
  .setAction(async (taskArgs, { ethers }) => {
    const Voting = await ethers.getContractFactory("Voting");
    const voting = Voting.attach(taskArgs.address);
    const transaction = await voting.getVotingsCount();
    console.log(`VIEW, Votings count: ${transaction}`);
  });

module.exports = {};