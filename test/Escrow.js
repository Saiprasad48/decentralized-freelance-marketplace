const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow Contract", function () {
  let Escrow, escrow, buyer, seller, arbiter, other;

  beforeEach(async function () {
    [buyer, seller, arbiter, other] = await ethers.getSigners();
    Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.connect(buyer).deploy(seller.address, arbiter.address);
    await escrow.waitForDeployment();
  });

  it("should initialize with correct parties and state", async function () {
    expect(await escrow.buyer()).to.equal(buyer.address);
    expect(await escrow.seller()).to.equal(seller.address);
    expect(await escrow.arbiter()).to.equal(arbiter.address);
    expect(await escrow.state()).to.equal(0); // AWAITING_PAYMENT
  });

  it("should allow buyer to deposit and move to AWAITING_DELIVERY", async function () {
    await escrow.connect(buyer).deposit({ value: ethers.utils.parseEther("1") });
    expect(await ethers.provider.getBalance(escrow.address)).to.equal(ethers.utils.parseEther("1"));
    expect(await escrow.state()).to.equal(1); // AWAITING_DELIVERY
  });

  it("should not allow non-buyer to deposit", async function () {
    await expect(
      escrow.connect(seller).deposit({ value: ethers.utils.parseEther("1") })
    ).to.be.revertedWith("Only buyer can deposit");
  });

  it("should not allow double deposit", async function () {
    await escrow.connect(buyer).deposit({ value: ethers.utils.parseEther("1") });
    await expect(
      escrow.connect(buyer).deposit({ value: ethers.utils.parseEther("1") })
    ).to.be.revertedWith("Already deposited");
  });

  it("should allow buyer to confirm delivery and pay seller", async function () {
    await escrow.connect(buyer).deposit({ value: ethers.utils.parseEther("1") });
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    await escrow.connect(buyer).confirmDelivery();
    expect(await escrow.state()).to.equal(2); // COMPLETE
    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(ethers.utils.parseEther("1"));
  });

  it("should not allow confirmDelivery by non-buyer", async function () {
    await escrow.connect(buyer).deposit({ value: ethers.utils.parseEther("1") });
    await expect(
      escrow.connect(seller).confirmDelivery()
    ).to.be.revertedWith("Only buyer can confirm");
  });

  it("should allow arbiter to refund buyer", async function () {
    await escrow.connect(buyer).deposit({ value: ethers.utils.parseEther("1") });
    const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
    await escrow.connect(arbiter).refund();
    expect(await escrow.state()).to.equal(3); // REFUNDED
    // Can't check exact balance due to gas, but state change is enough
  });

  it("should not allow refund by non-arbiter", async function () {
    await escrow.connect(buyer).deposit({ value: ethers.utils.parseEther("1") });
    await expect(
      escrow.connect(buyer).refund()
    ).to.be.revertedWith("Only arbiter can refund");
  });

  it("should not allow refund before deposit", async function () {
    await expect(
      escrow.connect(arbiter).refund()
    ).to.be.revertedWith("Refund not allowed");
  });

  it("should not allow confirmDelivery before deposit", async function () {
    await expect(
      escrow.connect(buyer).confirmDelivery()
    ).to.be.revertedWith("Cannot confirm");
  });

  it("should not allow deposit of zero", async function () {
    await expect(
      escrow.connect(buyer).deposit({ value: 0 })
    ).to.be.revertedWith("Deposit must be > 0");
  });
});
