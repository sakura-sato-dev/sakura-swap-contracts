//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./LpToken.sol";

// TODO Store liquidity in Yearn Vaults
// TODO Add ETH Support

contract SakuraSwap is Ownable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _supportedTokens;

    mapping(address => LpToken) public lpTokens;

    constructor() {}

    function supportedTokens() external view returns (address[] memory) {
        uint256 length = _supportedTokens.length();
        address[] memory tokens = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            tokens[i] = _supportedTokens.at(i);
        }
        return tokens;
    }

    function addSupportedToken(
        address token,
        string memory name,
        string memory symbol
    ) external onlyOwner {
        // TODO Check is supported by Yearn
        // TODO Check is supported by Chainlink
        require(!_supportedTokens.contains(token), "Token already supported");
        lpTokens[token] = new LpToken(name, symbol);
        _supportedTokens.add(token);
    }

    function deposit(address token, uint256 amount) external {
        require(_supportedTokens.contains(token), "Token not supported");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        lpTokens[token].mint(msg.sender, amount);
    }
}
