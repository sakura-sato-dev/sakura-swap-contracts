import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { SakuraSwap } from "../typechain";
import { approve, balanceOf, impersonateAddress, scale } from "./utils";

const SUSHI = "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2"
const YFI = "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e"

const SUSHI_OWNER = "0xd96Dd2337d964514Eb7E2E50d8Eea0d846feC960"

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
      expect(await balanceOf(owner, SUSHI, SUSHI_OWNER)).to.not.equal(0);
    })
    it("Should revert for unsupported token", async () => {
      await expect(
        sakuraSwap.deposit(SUSHI, scale(100))
      ).to.be.revertedWith("Token not supported");
    })
    it("Should deposit SUSHI", async () => {
      await (await sakuraSwap.addSupportedToken(SUSHI, "Sakura Sushi", "sakSUSHI")).wait();
      const signer = await impersonateAddress("0xd96Dd2337d964514Eb7E2E50d8Eea0d846feC960");
      await approve(SUSHI, sakuraSwap.address, signer);
      const userBalanceBefore = await balanceOf(owner, SUSHI, SUSHI_OWNER);
      await (await sakuraSwap.connect(signer).deposit(SUSHI, scale(100))).wait();
      const userBalanceAfter = await balanceOf(owner, SUSHI, SUSHI_OWNER);
      expect(BigNumber.from(userBalanceBefore).sub(BigNumber.from(userBalanceAfter))).to.equal(scale(100));
      expect(BigNumber.from(await balanceOf(owner, SUSHI, sakuraSwap.address))).to.equal(scale(100));
      const lpToken = await sakuraSwap.lpTokens(SUSHI);
      expect(BigNumber.from(await balanceOf(owner, lpToken, SUSHI_OWNER))).to.equal(scale(100));
    })
  })
})