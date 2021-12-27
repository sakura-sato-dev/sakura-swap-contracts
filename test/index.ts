import { expect } from "chai";
import { ethers } from "hardhat";
import { SakuraSwap } from "../typechain";

const SUSHI = "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2"
const YFI = "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e"

describe("Supported Tokens", () => {
  let sakuraSwap: SakuraSwap;
  it("Should deploy contract", async () => {
    const SakuraSwap = await ethers.getContractFactory("SakuraSwap");
    sakuraSwap = await SakuraSwap.deploy();
    await sakuraSwap.deployed();

  });
  it("Should be empty by default", async () => {
    expect(await sakuraSwap.supportedTokens()).to.be.empty;
  })
  it("Should support adding", async () => {
    expect(await sakuraSwap.supportedTokens()).to.be.empty;
    await (await sakuraSwap.addSupportedToken(SUSHI)).wait();
    expect(await sakuraSwap.supportedTokens()).to.eql([SUSHI]);
    await (await sakuraSwap.addSupportedToken(YFI)).wait();
    expect(await sakuraSwap.supportedTokens()).to.eql([SUSHI, YFI]);
  })
  it("Should revert already supported", async () => {
    await expect(
      sakuraSwap.addSupportedToken(YFI)
    ).to.be.revertedWith("Token already supported");
  })
});
