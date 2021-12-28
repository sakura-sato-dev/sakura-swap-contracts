import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";


export const impersonateAddress = async (address: string) => {
    const hre = require('hardhat');
    await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [address],
    });
    return ethers.provider.getSigner(address);
};

export const scale = (value: number) => {
    return BigNumber.from(value).mul(BigNumber.from(10).pow(18));
}

export const approve = async (token: string, contract: string, signer: any) => {
    const LpToken = await ethers.getContractFactory("LpToken");
    const sushi = new ethers.Contract(token, LpToken.interface, signer);
    await (await sushi.approve(contract, scale(100_000_000))).wait();
}

export const balanceOf = async (owner: SignerWithAddress, token: string, account: string) => {
    const LpToken = await ethers.getContractFactory("LpToken");
    const sushi = new ethers.Contract(token, LpToken.interface, owner);
    return sushi.balanceOf(account);
}