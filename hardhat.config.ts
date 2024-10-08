import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import { HttpNetworkUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-toolbox";
import { task } from "hardhat/config";
import "@ethereum-waffle/mock-contract";
import '@openzeppelin/hardhat-upgrades';

dotenv.config();

function missing_privateKey(): string {
  throw Error('PrivateKey missing')
}

const networks: { [networkName: string]: HttpNetworkUserConfig } = {
  sepolia: {
    url: "https://rpc.ankr.com/eth_sepolia",
    chainId: 11155111,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!]
  },
  goerli: {
    url: "https://rpc.ankr.com/eth_goerli",
    chainId: 5,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!]
  },
  bscTestnet: {
    url: "https://rpc.ankr.com/bsc_testnet_chapel",
    chainId: 97,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!]
  },
  polygon: {
    url: `https://rpc.ankr.com/polygon/${process.env.ANKR_KEY}`,
    chainId: 137,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!]
  },
  polygonMumbai: {
    url: `https://rpc.ankr.com/polygon_mumbai/`,
    chainId: 80001,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!]
  },
  lineaTestnet: {
    url: `https://rpc.sepolia.linea.build`,
    chainId: 59141,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!]
  },
  lineaMainnet: {
    url: `https://rpc.linea.build`,
    chainId: 59144,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!]
  },
  optimisticEthereum: {
    url: `https://rpc.ankr.com/optimism/${process.env.ANKR_KEY}`,
    chainId: 10,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!]
  },
  arb: {
    url: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!],
  },
  rootstock: {
    url: "https://public-node.rsk.co",
    chainId: 30,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!],
  },
  optimism: {
    url: "https://rpc.ankr.com/optimism",
    chainId: 10,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!],
  },
  opBnb: {
    url: `https://opbnb-rpc.publicnode.com`,
    chainId: 204,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!]  
  },
  base: {
    url: "https://rpc.ankr.com/base",
    chainId: 8453,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!],
  },
  zora: {
    url: "https://rpc.zora.energy",
    chainId: 7777777,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!],
  },
  celo: {
    url: "https://rpc.ankr.com/celo",
    chainId: 42220,
    accounts: [process.env.PRIVATE_KEY || missing_privateKey()!],
  },
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
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
    },
    ...networks
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_KEY || "",
      sepolia: process.env.ETHERSCAN_KEY || "",
      goerli: process.env.ETHERSCAN_KEY || "",
      bscTestnet: process.env.BSCSCAN_KEY || "",
      polygon: process.env.POLYGON_KEY || "",
      polygonMumbai: process.env.POLYGON_KEY || "",
      lineaTestnet: process.env.LINEASCAN_KEY || "",
      lineaMainnet: process.env.LINEASCAN_KEY || "",
      optimisticEthereum: process.env.OPTIMISM_KEY || "",
      arbitrumOne: process.env.ARB_SCAN || "",
      rootstock: process.env.ROOTSTOCK_KEY || "",
      opBnb: process.env.OPBNB_KEY || "",
      base: process.env.BASE_SCAN || "",
      celo: process.env.CELO_SCAN || "",
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
      {
        network: "ftm",
        chainId: 250,
        urls: {
          apiURL: "https://ftmscan.com/",
          browserURL: "https://ftmscan.com/",
        },
      },
      {
        network: "lineaTestnet",
        chainId: 59141,
        urls: {
          apiURL: "https://api-sepolia.lineascan.build/api",
          browserURL: "https://sepolia.lineascan.build/",
        },
      },
      {
        network: "lineaMainnet",
        chainId: 59144,
        urls: {
          apiURL: "https://api.lineascan.build/api",
          browserURL: "https://lineascan.build/",
        },
      },
      {
        network: "rootstock",
        chainId: 30,
        urls: {
          apiURL: "https://rootstock.blockscout.com/api/",
          browserURL: "https://rootstock.blockscout.com/",
        },
      },
      {
        network: "opBnb",
        chainId: 204,
        urls: {
          apiURL: `https://open-platform.nodereal.io/${process.env.OPBNB_KEY}/op-bnb-mainnet/contract/`,
          browserURL: "https://mainnet.opbnbscan.com",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: `https://api.basescan.org/api`,
          browserURL: "https://basescan.org/",
        },
      },
      {
        network: "zora",
        chainId: 7777777,
        urls: {
          apiURL: "https://explorer.zora.energy/api/v2/",
          browserURL: "https://explorer.zora.energy/",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: `https://api.celoscan.io/api`,
          browserURL: "https://celoscan.io/",
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
