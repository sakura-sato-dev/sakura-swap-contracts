//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./LpToken.sol";

// TODO Add interface
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

    function swapIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn_
    ) external returns (uint256) {
        return swapInWithMinOut(tokenIn, tokenOut, amountIn_, 0);
    }

    function swapInWithMinOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn_,
        uint256 minAmountOut
    ) public returns (uint256) {
        require(_supportedTokens.contains(tokenIn), "Token not supported");
        require(_supportedTokens.contains(tokenOut), "Token not supported");
        uint256 amountOut_ = amountOut(tokenIn, tokenOut, amountIn_);
        require(amountOut_ >= minAmountOut, "Amount below minimum"); // TODO Test
        require(
            IERC20(tokenOut).balanceOf(address(this)) > amountOut_,
            "Insufficient liquidity"
        ); // TODO Test
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn_);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut_);
        return amountOut_;
    }

    function swapOut(
        address tokenIn,
        address tokenOut,
        uint256 amountOut_
    ) external returns (uint256) {
        return
            swapOutWithMaxIn(tokenIn, tokenOut, amountOut_, type(uint256).max);
    }

    function swapOutWithMaxIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut_,
        uint256 maxAmountIn
    ) public returns (uint256) {
        require(_supportedTokens.contains(tokenIn), "Token not supported");
        require(_supportedTokens.contains(tokenOut), "Token not supported");
        uint256 amountIn_ = amountIn(tokenIn, tokenOut, amountOut_);
        require(amountIn_ <= maxAmountIn, "Amount above maximum"); // TODO Test
        require(
            IERC20(tokenOut).balanceOf(address(this)) > amountOut_,
            "Insufficient liquidity"
        ); // TODO Test
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn_);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut_);
        return amountIn_;
    }

    function amountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (uint256) {
        return amountIn;
    }

    function amountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) public view returns (uint256) {
        return amountOut;
    }
}
