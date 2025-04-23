async function main() {
  const [deployer] = await ethers.getSigners();

  // Deploy Escrow contract
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
  await escrow.waitForDeployment();
  console.log("Escrow deployed to:", await escrow.getAddress());

  // Deploy ReputationToken contract (FIX: pass deployer.address)
  const ReputationToken = await ethers.getContractFactory("ReputationToken");
  const repToken = await ReputationToken.deploy(deployer.address);
  await repToken.waitForDeployment();
  console.log("ReputationToken deployed to:", await repToken.getAddress());

  // Deploy DAO contract
  const DisputeDAO = await ethers.getContractFactory("DisputeDAO");
  const dao = await DisputeDAO.deploy();
  await dao.waitForDeployment();
  console.log("DAO deployed to:", await dao.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
