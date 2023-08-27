import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { task } from "hardhat/config";
import "@ethereum-waffle/mock-contract";

dotenv.config();

function missing_privateKey(): string {
  throw Error('PrivateKey missing')
}

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    gnosis: {
      url: `https://rpc.ankr.com/gnosis/${process.env.ANKR_KEY}`,
      chainId: 100,
      accounts: [process.env.PRIVATE_KEY || missing_privateKey()],
    },
    idchain: {
      url: 'https://idchain.one/rpc/',
      chainId: 74,
      accounts: [process.env.PRIVATE_KEY || missing_privateKey()]
    }
  },
  etherscan: {
    apiKey: {
      gnosis: process.env.GNOSISSCAN_API_KEY!,
    },
    customChains: [
      {
        network: "gnosis",
        chainId: 100,
        urls: {
          apiURL: "https://api.gnosisscan.io/api",
          browserURL: "https://gnosisscan.io/",
        },
      },
    ],
  },
};

task("verify-cli", "verify contract on the specified network")
  .addParam("address")
  .addParam("name")
  .setAction(async (taskArgs: any) => {
    
    const verify = require("./scripts/verify");

    await verify(taskArgs.address, `contracts/${taskArgs.name}.sol:${taskArgs.name}`);

  });

export default config;
