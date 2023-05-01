import {
  MockContract,
  deployMockContract,
} from "@ethereum-waffle/mock-contract";
import { IERC20__factory, TokenTap } from "../typechain-types";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { expect } from "chai";

describe("TokenTap", async () => {
  let tokenTap: TokenTap;
  let token1: MockContract;
  let token2: MockContract;
  let unitapServer: SignerWithAddress;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let invalidServer: SignerWithAddress;

  beforeEach(async () => {
    [admin, unitapServer, user1, user2, invalidServer] =
      await ethers.getSigners();

    const tokenTapFactory = await ethers.getContractFactory("TokenTap");
    tokenTap = await tokenTapFactory.connect(admin).deploy();

    token1 = await deployMockContract(admin, IERC20__factory.abi);
    token2 = await deployMockContract(admin, IERC20__factory.abi);

    await tokenTap
      .connect(admin)
      .grantRole(await tokenTap.UNITAP_ROLE(), unitapServer.address);
  });

  it("should be able to claim with valid signature", async () => {
    const user = user1.address;
    const token = token1.address;
    const amount = 100;
    const nonce = 1;

    const message = ethers.utils.solidityPack(
      ["address", "address", "uint256", "uint32"],
      [user, token, amount, nonce]
    );

    const messageHash = ethers.utils.keccak256(message);

    // personal sign using unitapServer
    const signature = await ethers.provider.send("personal_sign", [
      messageHash,
      unitapServer.address,
    ]);

    await token1.mock.transfer.withArgs(user, amount).returns(true);

    await tokenTap.claimToken(user, token, amount, nonce, signature);
  });

  it("should reject invalid signature", async () => {
    const user = user1.address;
    const token = token1.address;
    const amount = 100;
    const nonce = 1;

    const message = ethers.utils.solidityPack(
      ["address", "address", "uint256", "uint32"],
      [user, token, amount, nonce]
    );

    const messageHash = ethers.utils.keccak256(message);

    // personal sign using unitapServer
    const signature = await ethers.provider.send("personal_sign", [
      messageHash,
      invalidServer.address,
    ]);

    await expect(
      tokenTap.claimToken(user, token, amount, nonce, signature)
    ).to.be.revertedWithCustomError(tokenTap, "InvalidSignature");
  });

  it("should rejected already used nonce", async () => {
    const user = user1.address;
    const token = token1.address;
    const amount = 100;
    const nonce = 1;

    const message = ethers.utils.solidityPack(
      ["address", "address", "uint256", "uint32"],
      [user, token, amount, nonce]
    );

    const messageHash = ethers.utils.keccak256(message);

    // personal sign using unitapServer
    const signature = await ethers.provider.send("personal_sign", [
      messageHash,
      unitapServer.address,
    ]);

    await token1.mock.transfer.withArgs(user, amount).returns(true);

    await tokenTap.claimToken(user, token, amount, nonce, signature);

    await expect(
      tokenTap.claimToken(user, token, amount, nonce, signature)
    ).to.be.revertedWithCustomError(tokenTap, "NonceAlreadyUsed");
  });
  it("handle claims for different tokens and users simultaneously.", async () => {
    const u1 = user1.address;
    const u2 = user2.address;
    const t1 = token1.address;
    const t2 = token2.address;
    const amount1 = 100;
    const amount2 = 200;
    const nonce1 = 1;
    const nonce2 = 2;

    const message1 = ethers.utils.solidityPack(
      ["address", "address", "uint256", "uint32"],
      [u1, t1, amount1, nonce1]
    );

    const messageHash1 = ethers.utils.keccak256(message1);

    const signature1 = await ethers.provider.send("personal_sign", [
      messageHash1,
      unitapServer.address,
    ]);

    const message2 = ethers.utils.solidityPack(
      ["address", "address", "uint256", "uint32"],
      [u2, t2, amount2, nonce2]
    );

    const messageHash2 = ethers.utils.keccak256(message2);

    const signature2 = await ethers.provider.send("personal_sign", [
      messageHash2,
      unitapServer.address,
    ]);

    await token1.mock.transfer.withArgs(u1, amount1).returns(true);
    await token2.mock.transfer.withArgs(u2, amount2).returns(true);

    await tokenTap.claimToken(u1, t1, amount1, nonce1, signature1);
    await tokenTap.claimToken(u2, t2, amount2, nonce2, signature2);
  });
});
