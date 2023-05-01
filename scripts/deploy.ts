import hre, { ethers } from "hardhat";
async function deploy() {
  const Factory = await ethers.getContractFactory("TokenTap");
  const tokenTap = await Factory.deploy();

  await tokenTap.deployed();

  console.log("TokenTap deployed to:", tokenTap.address);

  // verify
  await hre.run("verify:verify", {
    address: tokenTap.address,
    constructorArguments: [],
  });
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
