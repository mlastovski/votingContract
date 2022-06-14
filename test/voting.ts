import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory, providers, BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";


describe("Voting Contract", function () {
  let Voting: ContractFactory;
  let voting: Contract;
  let creator: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr4: SignerWithAddress;
  const days = 24 * 60 * 60;

  before(async function () {
    [creator, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    Voting = await ethers.getContractFactory("Voting");
  });

  beforeEach(async function () {
    voting = await Voting.deploy();
    await voting.deployed();
  });

  it("Create: Should create 2 new votings", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await voting.connect(creator).createVoting("1", [addr2.address, addr1.address]);
  });

  it("Create: Should fail to create a new voting (Less than 2 candidates)", async function () {
    await expect(voting.connect(creator).createVoting("1", [addr3.address])).to.be.revertedWith("Should be at least 2 candidates");
  });

  it("Create: Should fail to create a new voting (Not owner address)", async function () {
    await expect(voting.connect(addr1).createVoting("2", [addr3.address, addr4.address])).to.be.revertedWith("You are not owner");
  });

  it("Create: Should fail to create a new voting (Duplicate candidates)", async function () {
    await expect(voting.connect(creator).createVoting("3", [addr3.address, addr3.address, addr4.address])).to.be.revertedWith("Should be all different addresses");
  });

  it("Vote: Should vote 3 times", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await voting.connect(addr1).vote("0", addr3.address, {value: parseEther("0.01")});
    await voting.connect(addr2).vote("0", addr4.address, {value: parseEther("0.01")});
    await voting.connect(creator).vote("0", addr4.address, {value: parseEther("0.01")});
  });

  it("Vote: Should fail to vote (Voting has finished)", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await ethers.provider.send('evm_increaseTime', [4 * days]);
    await ethers.provider.send('evm_mine', []);
    await expect(voting.connect(addr1).vote("0", addr3.address, {value: parseEther("0.01")})).to.be.revertedWith("Voting has finished");
  });

  it("Vote: Should fail to vote (Voting for self is prohibited)", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await expect(voting.connect(addr3).vote("0", addr3.address, {value: parseEther("0.01")})).to.be.revertedWith("Voting for self is prohibited");
  });

  it("Vote: Should fail to vote (Price must be 0.01 eth)", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await expect(voting.connect(addr3).vote("0", addr4.address, {value: parseEther("0.1")})).to.be.revertedWith("Price must be 0.01 eth");
  });

  it("Vote: Should fail to vote (There is no such candidate)", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await expect(voting.connect(addr3).vote("0", addr2.address, {value: parseEther("0.01")})).to.be.revertedWith("There is no such candidate");
  });

  it("Vote: Should fail to vote (You can vote only once)", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await voting.connect(addr3).vote("0", addr4.address, {value: parseEther("0.01")});
    await expect(voting.connect(addr3).vote("0", addr4.address, {value: parseEther("0.01")})).to.be.revertedWith("You can vote only once");
  });

  it("Finish voting: Should finish voting and get contract balance", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await voting.connect(addr3).vote("0", addr4.address, {value: parseEther("0.01")});
    await voting.connect(addr2).vote("0", addr4.address, {value: parseEther("0.01")});
    await voting.connect(addr4).vote("0", addr3.address, {value: parseEther("0.01")});
    await voting.connect(creator).vote("0", addr4.address, {value: parseEther("0.01")});
    await ethers.provider.send('evm_increaseTime', [4 * days]);
    await ethers.provider.send('evm_mine', []);
    await voting.connect(creator).finishVoting("0");
    const balance = await voting.connect(creator).getContractBalance();
    await expect(balance).to.equal(parseEther("0.004"));
  });

  it("Finish voting: Should fail to finish voting (Voting has not finished)", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await voting.connect(addr3).vote("0", addr4.address, {value: parseEther("0.01")});
    await voting.connect(addr2).vote("0", addr4.address, {value: parseEther("0.01")});
    await voting.connect(addr4).vote("0", addr3.address, {value: parseEther("0.01")});
    await voting.connect(creator).vote("0", addr4.address, {value: parseEther("0.01")});
    await expect(voting.connect(creator).finishVoting("0")).to.be.revertedWith("Voting has not finished");
  });

  it("Withdraw: Should withdraw", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await voting.connect(addr3).vote("0", addr4.address, {value: parseEther("0.01")});
    await voting.connect(addr2).vote("0", addr4.address, {value: parseEther("0.01")});
    await voting.connect(addr4).vote("0", addr3.address, {value: parseEther("0.01")});
    await voting.connect(creator).vote("0", addr4.address, {value: parseEther("0.01")});
    await ethers.provider.send('evm_increaseTime', [4 * days]);
    await ethers.provider.send('evm_mine', []);
    await voting.connect(creator).finishVoting("0");
    await voting.connect(creator).withdraw(parseEther("0.004"));
    const balance = await voting.connect(creator).getContractBalance();
    await expect(balance).to.equal(parseEther("0"));
  });

  it("Withdraw: Should fail to withdraw (Insufficient contract balance)", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await ethers.provider.send('evm_increaseTime', [4 * days]);
    await ethers.provider.send('evm_mine', []);
    await voting.connect(creator).finishVoting("0");
    await expect(voting.connect(creator).withdraw(parseEther("0.004"))).to.be.revertedWith("Insufficient contract balance");
  });

  it("Withdraw: Should fail to withdraw (You are not owner)", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await ethers.provider.send('evm_increaseTime', [4 * days]);
    await ethers.provider.send('evm_mine', []);
    await voting.connect(creator).finishVoting("0");
    await expect(voting.connect(addr1).withdraw(parseEther("0.004"))).to.be.revertedWith("You are not owner");
  });

  it("Votings info: Should get votings count", async function () {
    await voting.connect(creator).getVotingsCount();
  });

  it("Votings info: Should get votings info", async function () {
    await voting.connect(creator).createVoting("0", [addr3.address, addr4.address]);
    await voting.connect(creator).getVotingInfo("0");
  });
});
