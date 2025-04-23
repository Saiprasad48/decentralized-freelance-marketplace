const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Voting (Dispute Resolution)", function () {
  let DAO, dao, owner, voter1, voter2, voter3;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();
    DisputeDAO = await ethers.getContractFactory("DisputeDAO");
    dao = await DisputeDAO.deploy();
    await dao.waitForDeployment();
  });

  it("should allow users to submit a dispute", async function () {
    await expect(dao.connect(owner).submitDispute("Dispute about job #1"))
      .to.emit(dao, "DisputeSubmitted")
      .withArgs(1, owner.address, "Dispute about job #1");
  });

  it("should allow voting and resolve dispute", async function () {
    await dao.connect(owner).submitDispute("Dispute about job #1");
    await dao.connect(voter1).vote(1, true);  // vote in favor
    await dao.connect(voter2).vote(1, false); // vote against

    // Assume resolveDispute tallies and emits event
    await expect(dao.connect(owner).resolveDispute(1))
      .to.emit(dao, "DisputeResolved")
      .withArgs(1, true); // true if majority in favor
  });

  it("should not allow double voting", async function () {
    await dao.connect(owner).submitDispute("Dispute about job #1");
    await dao.connect(voter1).vote(1, true);
    await expect(
      dao.connect(voter1).vote(1, false)
    ).to.be.revertedWith("Already voted");
  });

  it("should not allow voting on non-existent dispute", async function () {
    await expect(
      dao.connect(voter1).vote(999, true)
    ).to.be.revertedWith("Dispute does not exist");
  });
});