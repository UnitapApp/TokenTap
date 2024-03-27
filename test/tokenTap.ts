import {
  MockContract,
  deployMockContract,
} from "@ethereum-waffle/mock-contract";
import { IERC20__factory, ERC20TokenTap, ERC20Test } from "../typechain-types";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumberish, BigNumber, ContractReceipt } from "ethers";
import { expect } from "chai";

describe("ERC20TokenTap", async () => {
  let tokenTap: ERC20TokenTap;
  let token1: MockContract;
  let usdc: ERC20Test;
  let token2: MockContract;
  let unitapServer: SignerWithAddress;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let invalidServer: SignerWithAddress;
  const ONE = ethers.utils.parseEther("1");
  let initiatorBalanceBeforeDistribute: BigNumber;
  let initiatorBalanceAfterDistributeToken2: BigNumber;
  let distributeGas: BigNumber;
  let distributeGas2: BigNumber;

  const accessControlMessage =
    "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0x3b5d4cc60d3ec3516ee8ae083bd60934f6eb2a6c54b1229985c41bfb092b2603";

  const adminRoleMessage =
    "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0x0000000000000000000000000000000000000000000000000000000000000000";

  const muonPublicKey = {
    x: "0x5f400480f526524701e012e15c7d841fe38611854a91e30eadfb0e8d48772d56",
    parity: 0,
  };

  beforeEach(async () => {
    [admin, unitapServer, user1, user2, invalidServer] =
      await ethers.getSigners();

    const tokenTapFactory = await ethers.getContractFactory("ERC20TokenTap");

    tokenTap = await tokenTapFactory
      .connect(admin)
      .deploy(
        admin.address,
        "84432823270461485387310871833182886925643143330424776997873308187796891046056",
        muonPublicKey,
        "0x3234D9F7933d117F5a4e87fA11879BA4caC5151a",
        "0x4d7A51Caa1E79ee080A7a045B61f424Da8965A3c"
      );

    const usdcFactory = await ethers.getContractFactory("ERC20Test");
    usdc = await usdcFactory.connect(admin).deploy();
    await usdc.deployed();

    await usdc.mint(user1.address, ONE.mul(300));

    initiatorBalanceBeforeDistribute = await ethers.provider.getBalance(
      user1.address
    );

    await tokenTap
      .connect(admin)
      .grantRole(await tokenTap.DEFAULT_ADMIN_ROLE(), unitapServer.address);
  });

  it("should be able to distribute usdc token successfully", async () => {
    await usdc.connect(user1).approve(tokenTap.address, ONE.mul(250));
    const usdcBalanceBeforeTx = await usdc
      .connect(user1)
      .balanceOf(user1.address);

    const now = await time.latest();
    const token = usdc.address;
    const maxNumClaims = 5;
    const claimAmount = ONE.mul(50);
    const startTime = now + 10;
    const endTime = now + 20;
    let initiatorBalanceBeforeDistributeToken =
      await ethers.provider.getBalance(user1.address);

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("0"),
      });

    const usdcBalanceAfterTx = await usdc
      .connect(user1)
      .balanceOf(user1.address);

    let initiatorBalanceAfterDistributeToken = await ethers.provider.getBalance(
      user1.address
    );

    const receipt = await tx.wait();

    distributeGas = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

    expect(
      initiatorBalanceBeforeDistributeToken.sub(
        initiatorBalanceAfterDistributeToken
      )
    ).to.eq(distributeGas);

    expect(usdcBalanceBeforeTx.sub(usdcBalanceAfterTx)).to.eq(
      claimAmount.mul(maxNumClaims)
    );

    expect(await usdc.balanceOf(tokenTap.address)).to.eq(
      claimAmount.mul(maxNumClaims)
    );

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("0")
    );
    let distributions = await tokenTap.distributions(1);
    expect(distributions.provider).to.eq(user1.address);
    expect(distributions.token).to.eq(usdc.address);
    expect(distributions.startTime).to.eq(startTime);
    expect(distributions.endTime).to.eq(endTime);
    expect(distributions.maxNumClaims).to.eq(maxNumClaims);
    expect(distributions.claimAmount).to.eq(claimAmount);
    expect(distributions.isRefunded).to.eq(false);
    let lastDistributionId = await tokenTap.lastDistributionId();
    expect(lastDistributionId.eq(1));
  });

  it("should not be able to distribute usdc token with invalid amount", async () => {
    const now = await time.latest();
    const token = usdc.address;
    const maxNumClaims = 1;
    const claimAmount = ONE.mul(400);
    const startTime = now + 10;
    const endTime = now + 20;

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
          value: ethers.utils.parseEther("0"),
        })
    ).to.be.revertedWith("ERC20: insufficient allowance");

    await usdc.connect(user1).approve(tokenTap.address, ONE.mul(400));

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
          value: ethers.utils.parseEther("0"),
        })
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("should not be able to distribute usdc token with invalid maxNumber", async () => {
    await usdc.connect(user1).approve(tokenTap.address, ONE.mul(250));
    const token = usdc.address;
    const claimAmount = ONE.mul(50);
    const now = await time.latest();
    const maxNumClaims = 0;
    const startTime = now + 10;
    const endTime = now + 20;

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
          value: ethers.utils.parseEther("0"),
        })
    ).to.be.revertedWith("Invalid maxNumClaims");
  });

  it("should not be able to distribute usdc token with invalid date", async () => {
    await usdc.connect(user1).approve(tokenTap.address, ONE.mul(250));
    const token = usdc.address;
    const claimAmount = ONE.mul(50);
    const now = await time.latest();
    const maxNumClaims = 5;

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, now, now + 20, {
          value: ethers.utils.parseEther("0"),
        })
    ).to.be.revertedWith("Invalid period");

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, now + 20, now + 20, {
          value: ethers.utils.parseEther("0"),
        })
    ).to.be.revertedWith("Invalid period");

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, now + 20, now + 10, {
          value: ethers.utils.parseEther("0"),
        })
    ).to.be.revertedWith("Invalid period");
  });

  it("should be able to distribute native token successfully", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("0.01");
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("0.05"),
      });

    const receipt = tx.wait();

    distributeGas = (await receipt).cumulativeGasUsed.mul(
      (await receipt).effectiveGasPrice
    );

    let initiatorBalanceAfterDistributeToken = await ethers.provider.getBalance(
      user1.address
    );

    expect(
      initiatorBalanceBeforeDistribute
        .sub(initiatorBalanceAfterDistributeToken)
        .sub(distributeGas)
    ).to.eq(ethers.utils.parseEther("0.05"));

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("0.05")
    );

    let distributions = await tokenTap.distributions(1);
    expect(distributions.provider).to.eq(user1.address);
    expect(distributions.token).to.eq(ethers.constants.AddressZero);
    expect(distributions.startTime).to.eq(startTime);
    expect(distributions.endTime).to.eq(endTime);
    expect(distributions.maxNumClaims).to.eq(maxNumClaims);
    expect(distributions.claimAmount).to.eq(claimAmount);
    expect(distributions.isRefunded).to.eq(false);

    let lastDistributionId = await tokenTap.lastDistributionId();
    expect(lastDistributionId.eq(1));

    initiatorBalanceBeforeDistribute = await ethers.provider.getBalance(
      user1.address
    );

    const tx2 = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("0.05"),
      });

    const receipt2 = tx2.wait();

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("0.1")
    );

    distributeGas2 = (await receipt2).cumulativeGasUsed.mul(
      (await receipt2).effectiveGasPrice
    );

    let initiatorBalanceAfterDistributeToken2 =
      await ethers.provider.getBalance(user1.address);

    expect(
      initiatorBalanceBeforeDistribute
        .sub(initiatorBalanceAfterDistributeToken2)
        .sub(distributeGas2)
    ).to.eq(ethers.utils.parseEther("0.05"));

    distributions = await tokenTap.distributions(2);
    expect(distributions.provider).to.eq(user1.address);
    expect(distributions.token).to.eq(ethers.constants.AddressZero);
    expect(distributions.startTime).to.eq(startTime);
    expect(distributions.endTime).to.eq(endTime);
    expect(distributions.maxNumClaims).to.eq(maxNumClaims);
    expect(distributions.claimAmount).to.eq(claimAmount);
    expect(distributions.isRefunded).to.eq(false);

    lastDistributionId = await tokenTap.lastDistributionId();
    expect(lastDistributionId.eq(2));
  });

  it("should not be able to distribute native token with invalid amount", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("0.01");
    const startTime = now + 10;
    const endTime = now + 20;

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
          value: ethers.utils.parseEther("0.02"),
        })
    ).to.be.revertedWith("!msg.value");

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
          value: ethers.utils.parseEther("0"),
        })
    ).to.be.revertedWith("!msg.value");

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
          value: ethers.utils.parseEther("2"),
        })
    ).to.be.revertedWith("!msg.value");
  });

  it("should not be able to distribute native token with invalid maxNumber", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 0;
    const claimAmount = ethers.utils.parseEther("0.01");
    const startTime = now + 10;
    const endTime = now + 20;

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
          value: ethers.utils.parseEther("0.02"),
        })
    ).to.be.revertedWith("Invalid maxNumClaims");
  });

  it("should not be able to distribute native token with invalid date", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("0.01");

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, now, now + 20, {
          value: ethers.utils.parseEther("0.02"),
        })
    ).to.be.revertedWith("Invalid period");

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, now + 20, now + 20, {
          value: ethers.utils.parseEther("0.02"),
        })
    ).to.be.revertedWith("Invalid period");

    await expect(
      tokenTap
        .connect(user1)
        .distributeToken(token, maxNumClaims, claimAmount, now + 20, now + 10, {
          value: ethers.utils.parseEther("0.02"),
        })
    ).to.be.revertedWith("Invalid period");
  });

  it("should not be able to set muon address if has not access control", async () => {
    await expect(
      tokenTap
        .connect(user1)
        .setMuonAddress("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a")
    ).to.be.revertedWith(accessControlMessage);
  });

  it("should be able to set muon address successfully if has access control", async () => {
    await tokenTap
      .connect(admin)
      .setMuonAddress("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a");
  });

  it("should not be able to set muon App ID if has not access control", async () => {
    await expect(
      tokenTap
        .connect(user1)
        .setMuonAppId("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a")
    ).to.be.revertedWith(accessControlMessage);
  });

  it("should be able to set muon  App ID successfully if has access control", async () => {
    await tokenTap
      .connect(admin)
      .setMuonAppId("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a");
  });

  it("should not be able to set muon gate way if has not access control", async () => {
    await expect(
      tokenTap
        .connect(user1)
        .setMuonGateway("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a")
    ).to.be.revertedWith(accessControlMessage);
  });

  it("should be able to set muon gate way successfully if has access control", async () => {
    await tokenTap
      .connect(admin)
      .setMuonGateway("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a");
  });

  it("should not be able to set muon public key if has not access control", async () => {
    await expect(
      tokenTap.connect(user1).setMuonPublicKey(muonPublicKey)
    ).to.be.revertedWith(accessControlMessage);
  });

  it("should be able to set muon public key successfully if has access control", async () => {
    await tokenTap.connect(admin).setMuonPublicKey(muonPublicKey);
  });

  it("admin should be able to set access control", async () => {
    const DAO_ROLE = await tokenTap.DAO_ROLE();
    const DEFAULT_ADMIN_ROLE = await tokenTap.DEFAULT_ADMIN_ROLE();
    await tokenTap.connect(admin).grantRole(DAO_ROLE, user1.address);
    await tokenTap.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, user1.address);
  });

  it("has role should be false", async () => {
    const DEFAULT_ADMIN_ROLE = await tokenTap.DEFAULT_ADMIN_ROLE();
    const DAO_ROLE = await tokenTap.DAO_ROLE();

    expect(
      await tokenTap.connect(admin).hasRole(DEFAULT_ADMIN_ROLE, user1.address)
    ).to.eq(false);

    expect(
      await tokenTap.connect(admin).hasRole(DAO_ROLE, user1.address)
    ).to.eq(false);
  });

  it("has role should be true", async () => {
    const DEFAULT_ADMIN_ROLE = await tokenTap.DEFAULT_ADMIN_ROLE();
    const DAO_ROLE = await tokenTap.DAO_ROLE();

    await tokenTap.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, user1.address);
    await tokenTap.connect(admin).grantRole(DAO_ROLE, user1.address);
    expect(
      await tokenTap.connect(admin).hasRole(DAO_ROLE, user1.address)
    ).to.eq(true);
  });

  it("should be able to set values if has DAO role", async () => {
    const DAO_ROLE = await tokenTap.DAO_ROLE();
    await tokenTap.connect(admin).grantRole(DAO_ROLE, user1.address);
    expect(
      await tokenTap.connect(admin).hasRole(DAO_ROLE, user1.address)
    ).to.eq(true);

    await tokenTap
      .connect(user1)
      .setMuonAddress("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a");

    await tokenTap
      .connect(user1)
      .setMuonAppId("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a");

    await tokenTap
      .connect(user1)
      .setMuonGateway("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a");

    await tokenTap.connect(user1).setMuonPublicKey(muonPublicKey);
  });

  it("should not be able to set values if just has admin role", async () => {
    const DEFAULT_ADMIN_ROLE = await tokenTap.DEFAULT_ADMIN_ROLE();
    await tokenTap.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, user1.address);

    expect(
      await tokenTap.connect(admin).hasRole(DEFAULT_ADMIN_ROLE, user1.address)
    ).to.eq(true);
    await expect(
      tokenTap
        .connect(user1)
        .setMuonAddress("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a")
    ).to.be.revertedWith(accessControlMessage);

    await expect(
      tokenTap
        .connect(user1)
        .setMuonAppId("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a")
    ).to.be.revertedWith(accessControlMessage);

    await expect(
      tokenTap
        .connect(user1)
        .setMuonGateway("0x3234D9F7933d117F5a4e87fA11879BA4caC5151a")
    ).to.be.revertedWith(accessControlMessage);

    await expect(
      tokenTap.connect(user1).setMuonPublicKey(muonPublicKey)
    ).to.be.revertedWith(accessControlMessage);
  });

  it("Admin should be able to withdraw", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("1");
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("5"),
      });

    const receipt = tx.wait();

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("5")
    );

    const user2BalanceBefore = await ethers.provider.getBalance(user2.address);

    await tokenTap
      .connect(admin)
      .adminWithdraw(ethers.utils.parseEther("2"), user2.address, token, {});

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("3")
    );

    const user2BalanceAfter = await ethers.provider.getBalance(user2.address);

    expect(user2BalanceAfter.sub(user2BalanceBefore)).to.eq(
      ethers.utils.parseEther("2")
    );
  });

  it("user (not admin) should not be able to withdraw", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("1");
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("5"),
      });

    const receipt = tx.wait();

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("5")
    );

    await expect(
      tokenTap
        .connect(user1)
        .adminWithdraw(ethers.utils.parseEther("2"), user2.address, token, {})
    ).to.be.revertedWith(
      "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
    );

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("5")
    );
  });

  it("admin should not be able to withdraw invalid amount", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("1");
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("5"),
      });

    const receipt = tx.wait();

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("5")
    );

    await expect(
      tokenTap
        .connect(admin)
        .adminWithdraw(ethers.utils.parseEther("6"), user2.address, token, {})
    ).to.be.rejected;

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("5")
    );
  });

  it("should be able to extend Distribution", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("1");
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("5"),
      });

    const receipt = tx.wait();
    let lastDistributionId = await tokenTap.lastDistributionId();
    let distributions = await tokenTap.distributions(lastDistributionId);

    await tokenTap
      .connect(user1)
      .extendDistribution(lastDistributionId, 7, endTime, {
        value: ethers.utils.parseEther("2"),
      });
  });

  it("should not be able to extend Distribution if is not provider", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("1");
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("5"),
      });

    const receipt = tx.wait();
    let lastDistributionId = await tokenTap.lastDistributionId();
    let distributions = await tokenTap.distributions(lastDistributionId);

    await expect(
      tokenTap
        .connect(admin)
        .extendDistribution(lastDistributionId, 7, endTime, {
          value: ethers.utils.parseEther("2"),
        })
    ).to.be.revertedWith("Not permitted");
  });

  it("should not be able to extend Distribution with invalid value", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("1");
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("5"),
      });

    const receipt = tx.wait();
    let lastDistributionId = await tokenTap.lastDistributionId();
    let distributions = await tokenTap.distributions(lastDistributionId);

    await expect(
      tokenTap
        .connect(user1)
        .extendDistribution(lastDistributionId, 7, endTime, {
          value: ethers.utils.parseEther("1"),
        })
    ).to.be.revertedWith("!msg.value");

    await expect(
      tokenTap
        .connect(user1)
        .extendDistribution(lastDistributionId, 7, endTime, {
          value: ethers.utils.parseEther("0"),
        })
    ).to.be.revertedWith("!msg.value");

    await expect(
      tokenTap
        .connect(user1)
        .extendDistribution(lastDistributionId, 7, endTime, {
          value: ethers.utils.parseEther("10"),
        })
    ).to.be.revertedWith("!msg.value");
  });

  it("should not be able to extend Distribution with invalid end time", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("1");
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("5"),
      });

    const receipt = tx.wait();
    let lastDistributionId = await tokenTap.lastDistributionId();

    await expect(
      tokenTap
        .connect(user1)
        .extendDistribution(lastDistributionId, 7, startTime, {
          value: ethers.utils.parseEther("2"),
        })
    ).to.be.revertedWith("Invalid endTime");

    await expect(
      tokenTap.connect(user1).extendDistribution(lastDistributionId, 7, 0, {
        value: ethers.utils.parseEther("2"),
      })
    ).to.be.revertedWith("Invalid endTime");
  });

  it("should be not able to extend Distribution invalid maxMumClaims", async () => {
    const now = await time.latest();
    const token = ethers.constants.AddressZero;
    const maxNumClaims = 5;
    const claimAmount = ethers.utils.parseEther("1");
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("5"),
      });

    const receipt = tx.wait();
    let lastDistributionId = await tokenTap.lastDistributionId();
    let distributions = await tokenTap.distributions(lastDistributionId);

    await expect(
      tokenTap
        .connect(user1)
        .extendDistribution(lastDistributionId, 4, endTime, {
          value: ethers.utils.parseEther("2"),
        })
    ).to.be.revertedWith("Invalid maxNumClaims");

    await expect(
      tokenTap
        .connect(user1)
        .extendDistribution(lastDistributionId, 0, endTime, {
          value: ethers.utils.parseEther("0"),
        })
    ).to.be.revertedWith("Invalid maxNumClaims");
  });

  it("Admin should be able to withdraw usdc token", async () => {
    await usdc.connect(user1).approve(tokenTap.address, ONE.mul(250));
    const now = await time.latest();
    const token = usdc.address;
    const maxNumClaims = 5;
    const claimAmount = ONE.mul(50);
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("0"),
      });

    const receipt = tx.wait();

    expect(await usdc.balanceOf(tokenTap.address)).to.eq(
      claimAmount.mul(maxNumClaims)
    );

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("0")
    );

    const user2UsdcBalanceBefore = await usdc
      .connect(user1)
      .balanceOf(user2.address);

    await tokenTap
      .connect(admin)
      .adminWithdraw(ethers.utils.parseEther("2"), user2.address, token, {});

    expect(await usdc.balanceOf(tokenTap.address)).to.eq(
      ethers.utils.parseEther("248")
    );

    const user2UsdcBalanceAfter = await usdc
      .connect(user1)
      .balanceOf(user2.address);

    expect(
      user2UsdcBalanceAfter
        .sub(user2UsdcBalanceBefore)
        .eq(ethers.utils.parseEther("2"))
    );
  });

  it("user (not admin) should not be able to withdraw usdcToken", async () => {
    await usdc.connect(user1).approve(tokenTap.address, ONE.mul(250));
    const now = await time.latest();
    const token = usdc.address;
    const maxNumClaims = 5;
    const claimAmount = ONE.mul(50);
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("0"),
      });

    const receipt = tx.wait();

    expect(await usdc.balanceOf(tokenTap.address)).to.eq(
      claimAmount.mul(maxNumClaims)
    );

    await expect(
      tokenTap
        .connect(user1)
        .adminWithdraw(ethers.utils.parseEther("2"), user2.address, token, {})
    ).to.be.revertedWith(
      "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
    );

    expect(await usdc.balanceOf(tokenTap.address)).to.eq(
      claimAmount.mul(maxNumClaims)
    );

    expect(await ethers.provider.getBalance(tokenTap.address)).to.eq(
      ethers.utils.parseEther("0")
    );
  });

  it("admin should not be able to withdraw invalid amount usdcToken", async () => {
    await usdc.connect(user1).approve(tokenTap.address, ONE.mul(450));
    const now = await time.latest();
    const token = usdc.address;
    const maxNumClaims = 5;
    const claimAmount = ONE.mul(50);
    const startTime = now + 10;
    const endTime = now + 20;

    const tx = await tokenTap
      .connect(user1)
      .distributeToken(token, maxNumClaims, claimAmount, startTime, endTime, {
        value: ethers.utils.parseEther("0"),
      });

    const receipt = tx.wait();

    expect(await usdc.balanceOf(tokenTap.address)).to.eq(
      claimAmount.mul(maxNumClaims)
    );

    await expect(
      tokenTap
        .connect(admin)
        .adminWithdraw(ethers.utils.parseEther("260"), user2.address, token, {})
    ).to.be.rejected;

    expect(await usdc.balanceOf(tokenTap.address)).to.eq(
      claimAmount.mul(maxNumClaims)
    );
  });
});
