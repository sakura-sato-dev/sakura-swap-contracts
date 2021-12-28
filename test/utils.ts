import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { SakuraSwap } from "../typechain";


export const impersonateAddress = async (address: string) => {
    const hre = require('hardhat');
    await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [address],
    });
    return ethers.provider.getSigner(address);
};

export const scale = (value: number): BigNumber => {
    return BigNumber.from(value).mul(BigNumber.from(10).pow(18));
}

export const approve = async (token: string, contract: string, signer: any) => {
    const LpToken = await ethers.getContractFactory("LpToken");
    const sushi = new ethers.Contract(token, LpToken.interface, signer);
    await (await sushi.approve(contract, scale(100_000_000))).wait();
}

export const balanceOf = async (owner: SignerWithAddress, token: string, account: string): Promise<BigNumber> => {
    const LpToken = await ethers.getContractFactory("LpToken");
    const sushi = new ethers.Contract(token, LpToken.interface, owner);
    return BigNumber.from(await sushi.balanceOf(account));
}

export const deposit = async (sakuraSwap: SakuraSwap, token: string, account: string) => {
    await (await sakuraSwap.addSupportedToken(token, "Mock Name", "SYMBOL")).wait();
    const signer = await impersonateAddress(account);
    await approve(token, sakuraSwap.address, signer);
    await (await sakuraSwap.connect(signer).deposit(token, scale(100))).wait();
}

export const amountIn = async (sakuraSwap: SakuraSwap, tokenIn: string, tokenOut: string, amount: BigNumber = scale(10)) => {
    return BigNumber.from(await sakuraSwap.amountIn(tokenIn, tokenOut, amount));
}

export const amountOut = async (sakuraSwap: SakuraSwap, tokenIn: string, tokenOut: string, amount: BigNumber = scale(10)) => {
    return BigNumber.from(await sakuraSwap.amountOut(tokenIn, tokenOut, amount));
}

export const swapIn = async (sakuraSwap: SakuraSwap, tokenIn: string, tokenOut: string, account: string, amount: BigNumber = scale(10)) => {
    const signer = await impersonateAddress(account);
    await approve(tokenIn, sakuraSwap.address, signer);
    await (await sakuraSwap.connect(signer).swapIn(tokenIn, tokenOut, amount)).wait();
}

export const swapOut = async (sakuraSwap: SakuraSwap, tokenIn: string, tokenOut: string, account: string, amount: BigNumber = scale(10)) => {
    const signer = await impersonateAddress(account);
    await approve(tokenIn, sakuraSwap.address, signer);
    await (await sakuraSwap.connect(signer).swapOut(tokenIn, tokenOut, amount)).wait();
}