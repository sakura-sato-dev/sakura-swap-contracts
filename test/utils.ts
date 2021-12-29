import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { SakuraSwap } from "../typechain";
import { tokenData } from "./data";


export const impersonateAddress = async (address: string) => {
    const hre = require('hardhat');
    await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [address],
    });
    return ethers.provider.getSigner(address);
};

export const scale = (value: number): BigNumber => {
    let div = 1;
    if (value < 1) {
        value = value * 1000000;
        div = 1000000;
    }
    return BigNumber.from(value).mul(BigNumber.from(10).pow(18)).div(BigNumber.from(div));
}

export const approve = async (token: string, contract: string, signer: any) => {
    const LpToken = await ethers.getContractFactory("LpToken");
    const sushi = new ethers.Contract(token, LpToken.interface, signer);
    await sushi.approve(contract, scale(100_000_000));
}

export const balanceOf = async (owner: SignerWithAddress, token: string, account: string): Promise<BigNumber> => {
    const LpToken = await ethers.getContractFactory("LpToken");
    const sushi = new ethers.Contract(token, LpToken.interface, owner);
    return BigNumber.from(await sushi.balanceOf(account));
}

export const addSupportedToken = async (sakuraSwap: SakuraSwap, token: string) => {
    const data = tokenData[token];
    await sakuraSwap.addSupportedToken(token, "Sakura " + data.name, "sak" + data.symbol, data.oracle);
}

export const deposit = async (sakuraSwap: SakuraSwap, token: string, account: string) => {
    await addSupportedToken(sakuraSwap, token);
    const signer = await impersonateAddress(account);
    await approve(token, sakuraSwap.address, signer);
    await sakuraSwap.connect(signer).deposit(token, scale(100));
}

export const getAmountIn = async (sakuraSwap: SakuraSwap, tokenIn: string, tokenOut: string, amount: BigNumber = scale(10)) => {
    return BigNumber.from(await sakuraSwap.getAmountIn(tokenIn, tokenOut, amount));
}

export const getAmountOut = async (sakuraSwap: SakuraSwap, tokenIn: string, tokenOut: string, amount: BigNumber = scale(10)) => {
    return BigNumber.from(await sakuraSwap.getAmountOut(tokenIn, tokenOut, amount));
}

export const swapIn = async (sakuraSwap: SakuraSwap, tokenIn: string, tokenOut: string, account: string, amount: BigNumber = scale(10)) => {
    const signer = await impersonateAddress(account);
    await approve(tokenIn, sakuraSwap.address, signer);
    await sakuraSwap.connect(signer).swapIn(tokenIn, tokenOut, amount);
}

export const swapOut = async (sakuraSwap: SakuraSwap, tokenIn: string, tokenOut: string, account: string, amount: BigNumber = scale(10)) => {
    const signer = await impersonateAddress(account);
    await approve(tokenIn, sakuraSwap.address, signer);
    await sakuraSwap.connect(signer).swapOut(tokenIn, tokenOut, amount);
}

export const getExchangeRate = async (sakuraSwap: SakuraSwap, tokenIn: string, tokenOut: string) => {
    return BigNumber.from(await sakuraSwap.getExchanageRate(tokenIn, tokenOut));
}

export const setBaseFee = async (sakuraSwap: SakuraSwap, amount: BigNumber) => {
    await sakuraSwap.setBaseFee(amount);
}

export const setImbalanceFee = async (sakuraSwap: SakuraSwap, amount: BigNumber) => {
    await sakuraSwap.setImbalanceFee(amount);
}

export const scaledMul = (a: BigNumber, b: BigNumber) => {
    return a.mul(b).div(BigNumber.from(10).pow(BigNumber.from(18)));
}

export const scaledDiv = (a: BigNumber, b: BigNumber) => {
    return a.mul(BigNumber.from(10).pow(BigNumber.from(18))).div(b);
}

export const getBaseFee = async (sakuraSwap: SakuraSwap) => {
    return await sakuraSwap.baseFee();
}

export const getImbalanceFee = async (sakuraSwap: SakuraSwap) => {
    return await sakuraSwap.imbalanceFee();
}