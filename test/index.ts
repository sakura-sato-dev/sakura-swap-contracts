import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { SakuraSwap } from "../typechain";
import { amountIn, amountOut, balanceOf, deposit, scale, swapIn, swapOut } from "./utils";

const SUSHI = "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2"
const YFI = "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e"

const SUSHI_OWNER = "0xd96Dd2337d964514Eb7E2E50d8Eea0d846feC960"
const YFI_OWNER = "0x53c286E0AbE87c9e6d4d95ebE62ceaFa4aFCE849"

describe("Sakura Swap Contract", () => {
  let sakuraSwap: SakuraSwap;

  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const SakuraSwap = await ethers.getContractFactory("SakuraSwap");
    sakuraSwap = await SakuraSwap.deploy();
    await sakuraSwap.deployed();
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await sakuraSwap.owner()).to.equal(owner.address);
    });
    it("Should be in mainnet fork", async function () {
      const LpToken = await ethers.getContractFactory("LpToken");
      const sushi = new ethers.Contract(SUSHI, LpToken.interface, owner);
      expect(await sushi.name()).to.equal("SushiToken");
    });
  });

  describe("Supported Tokens", () => {
    it("Should be empty by default", async () => {
      expect(await sakuraSwap.supportedTokens()).to.be.empty;
    })
    it("Should support adding", async () => {
      expect(await sakuraSwap.supportedTokens()).to.be.empty;
      await (await sakuraSwap.addSupportedToken(SUSHI, "Sakura Sushi", "sakSUSHI")).wait();
      expect(await sakuraSwap.supportedTokens()).to.eql([SUSHI]);
      const sushiLpToken = await ethers.getContractAt("LpToken", await sakuraSwap.lpTokens(SUSHI));
      expect(await sushiLpToken.name()).to.equal("Sakura Sushi");
      expect(await sushiLpToken.symbol()).to.equal("sakSUSHI");
      await (await sakuraSwap.addSupportedToken(YFI, "Sakura YFI", "sakYFI")).wait();
      expect(await sakuraSwap.supportedTokens()).to.eql([SUSHI, YFI]);
    })
    it("Should revert already supported", async () => {
      await (await sakuraSwap.addSupportedToken(YFI, "Sakura YFI", "sakYFI")).wait();
      await expect(
        sakuraSwap.addSupportedToken(YFI, "Sakura YFI", "sakYFI")
      ).to.be.revertedWith("Token already supported");
    })
  });

  describe("Depositing", () => {
    it("Should have SUSHI balance for impersonator", async () => {
      expect((await balanceOf(owner, SUSHI, SUSHI_OWNER)).gt(BigNumber.from(0))).to.be.true;
    })
    it("Should revert for unsupported token", async () => {
      await expect(
        sakuraSwap.deposit(SUSHI, scale(100))
      ).to.be.revertedWith("Token not supported");
    })
    it("Should deposit SUSHI", async () => {
      const userBalanceBefore = await balanceOf(owner, SUSHI, SUSHI_OWNER);
      await deposit(sakuraSwap, SUSHI, SUSHI_OWNER);
      const userBalanceAfter = await balanceOf(owner, SUSHI, SUSHI_OWNER);
      expect(userBalanceBefore.sub(userBalanceAfter)).to.equal(scale(100));
      expect(await balanceOf(owner, SUSHI, sakuraSwap.address)).to.equal(scale(100));
      const lpToken = await sakuraSwap.lpTokens(SUSHI);
      expect(await balanceOf(owner, lpToken, SUSHI_OWNER)).to.equal(scale(100));
    })
  })

  describe("Swapping", () => {
    it("Should revert for unsupported token in", async () => {
      await deposit(sakuraSwap, YFI, YFI_OWNER);
      await expect(
        sakuraSwap.swapOut(SUSHI, YFI, scale(10))
      ).to.be.revertedWith("Token not supported");
      await expect(
        sakuraSwap.swapIn(SUSHI, YFI, scale(10))
      ).to.be.revertedWith("Token not supported");
    })
    it("Should revert for unsupported token out", async () => {
      await deposit(sakuraSwap, SUSHI, SUSHI_OWNER);
      await expect(
        sakuraSwap.swapOut(SUSHI, YFI, scale(10))
      ).to.be.revertedWith("Token not supported");
      await expect(
        sakuraSwap.swapIn(SUSHI, YFI, scale(10))
      ).to.be.revertedWith("Token not supported");
    })
    it("Should swap in", async () => {
      await deposit(sakuraSwap, SUSHI, SUSHI_OWNER);
      await deposit(sakuraSwap, YFI, YFI_OWNER);
      const sushiBalanceBefore = await balanceOf(owner, SUSHI, SUSHI_OWNER);
      const yfiBalanceBefore = await balanceOf(owner, YFI, SUSHI_OWNER);
      const expected = await amountOut(sakuraSwap, SUSHI, YFI);
      await swapIn(sakuraSwap, SUSHI, YFI, SUSHI_OWNER);
      const sushiBalanceAfter = await balanceOf(owner, SUSHI, SUSHI_OWNER);
      const yfiBalanceAfter = await balanceOf(owner, YFI, SUSHI_OWNER);
      expect(sushiBalanceBefore.sub(sushiBalanceAfter)).to.equal(scale(10));
      expect(yfiBalanceAfter.sub(yfiBalanceBefore)).to.equal(expected);
    })
    it("Should swap out", async () => {
      await deposit(sakuraSwap, SUSHI, SUSHI_OWNER);
      await deposit(sakuraSwap, YFI, YFI_OWNER);
      const sushiBalanceBefore = await balanceOf(owner, SUSHI, SUSHI_OWNER);
      const yfiBalanceBefore = await balanceOf(owner, YFI, SUSHI_OWNER);
      const needed = await amountIn(sakuraSwap, SUSHI, YFI);
      await swapOut(sakuraSwap, SUSHI, YFI, SUSHI_OWNER, needed);
      const sushiBalanceAfter = await balanceOf(owner, SUSHI, SUSHI_OWNER);
      const yfiBalanceAfter = await balanceOf(owner, YFI, SUSHI_OWNER);
      expect(sushiBalanceBefore.sub(sushiBalanceAfter)).to.equal(needed);
      expect(yfiBalanceAfter.sub(yfiBalanceBefore)).to.equal(scale(10));
    })
  })
})
