import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@ethereum-waffle/mock-contract";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
};

export default config;
