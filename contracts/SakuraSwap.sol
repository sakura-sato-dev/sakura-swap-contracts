//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "./LpToken.sol";

// TODO Add interface
// TODO Store liquidity in Yearn Vaults
// TODO Add ETH Support
// TODO Add withdraw function
// TODO Add withdraw zap
// TODO Add zap in and zap out
// TODO Add arbitrage features

contract SakuraSwap is Ownable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    mapping(address => LpToken) public lpTokens;
    mapping(address => AggregatorV3Interface) public oracles;
    uint256 public baseFee;
    uint256 public imbalanceFee;

    EnumerableSet.AddressSet private _supportedTokens;
    mapping(address => uint256) private _virtualBalances;

    constructor() {
        baseFee = 0.002e18;
        imbalanceFee = 0.02e18;
    }

    function supportedTokens() external view returns (address[] memory) {
        uint256 length = _supportedTokens.length();
        address[] memory tokens = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            tokens[i] = _supportedTokens.at(i);
        }
        return tokens;
    }

    function deposit(address token, uint256 amount) external {
        require(_supportedTokens.contains(token), "Token not supported");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        lpTokens[token].mint(msg.sender, amount);
        _virtualBalances[token] += amount;
    }

    function swapIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256) {
        return swapInWithMinOut(tokenIn, tokenOut, amountIn, 0);
    }

    function swapInWithMinOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public returns (uint256) {
        require(_supportedTokens.contains(tokenIn), "Token not supported");
        require(_supportedTokens.contains(tokenOut), "Token not supported");
        uint256 amountOut = getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= minAmountOut, "Amount below minimum"); // TODO Test
        require(
            IERC20(tokenOut).balanceOf(address(this)) > amountOut,
            "Insufficient liquidity"
        ); // TODO Test
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        return amountOut;
    }

    function swapOut(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external returns (uint256) {
        return
            swapOutWithMaxIn(tokenIn, tokenOut, amountOut, type(uint256).max);
    }

    function swapOutWithMaxIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 maxAmountIn
    ) public returns (uint256) {
        require(_supportedTokens.contains(tokenIn), "Token not supported");
        require(_supportedTokens.contains(tokenOut), "Token not supported");
        uint256 amountIn = getAmountIn(tokenIn, tokenOut, amountOut);
        require(amountIn <= maxAmountIn, "Amount above maximum"); // TODO Test
        require(
            IERC20(tokenOut).balanceOf(address(this)) > amountOut,
            "Insufficient liquidity"
        ); // TODO Test
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        return amountIn;
    }

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (uint256) {
        uint256 amountOut = (amountIn * getExchanageRate(tokenIn, tokenOut)) /
            1e18;
        return
            (amountOut * _getFee(tokenIn, tokenOut, amountIn, amountOut)) /
            1e18;
    }

    function getAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) public view returns (uint256) {
        return (amountOut * getExchanageRate(tokenOut, tokenIn)) / 1e18;
    }

    function getExchanageRate(address tokenIn, address tokenOut)
        public
        view
        returns (uint256)
    {
        return (_getLatestPrice(tokenIn) * 1e18) / _getLatestPrice(tokenOut);
    }

    function _getLatestPrice(address token) internal view returns (uint256) {
        AggregatorV3Interface oracle = oracles[token];
        (, int256 price, , , ) = oracle.latestRoundData();
        return uint256(price) * 10**(18 - oracle.decimals());
    }

    function _getFee(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) internal view returns (uint256) {
        uint256 tokenInBalance = IERC20(tokenIn).balanceOf(address(this));
        uint256 tokenInDifferenceBefore = _dif(
            _virtualBalances[tokenIn],
            tokenInBalance
        );
        uint256 tokenInDifferenceAfter = _dif(
            _virtualBalances[tokenIn],
            tokenInBalance + amountIn
        );
        uint256 tokenOutBalance = IERC20(tokenOut).balanceOf(address(this));
        uint256 tokenOutDifferenceBefore = _dif(
            _virtualBalances[tokenOut],
            tokenOutBalance
        );
        uint256 tokenOutDifferenceAfter = _dif(
            _virtualBalances[tokenOut],
            tokenOutBalance - amountOut
        );
        uint256 totalBefore = tokenInDifferenceBefore +
            tokenOutDifferenceBefore;
        uint256 totalAfter = tokenInDifferenceAfter + tokenOutDifferenceAfter;
        return _feeMultiplier(totalBefore, totalAfter);
    }

    function _dif(uint256 a, uint256 b) private pure returns (uint256) {
        if (b >= a) return 0;
        return ((a - b) * 1e18) / a;
    }

    function _feeMultiplier(uint256 totalBefore, uint256 totalAfter)
        private
        view
        returns (uint256)
    {
        return
            (
                totalAfter < totalBefore
                    ? 1e18 + ((totalBefore - totalAfter) * imbalanceFee) / 1e18
                    : 1e18 - ((totalAfter - totalBefore) * imbalanceFee) / 1e18
            ) - baseFee;
    }

    function addSupportedToken(
        address token,
        string memory name,
        string memory symbol,
        address oracle
    ) external onlyOwner {
        // TODO Check is supported by Yearn
        require(!_supportedTokens.contains(token), "Token already supported");
        oracles[token] = AggregatorV3Interface(oracle);
        require(_getLatestPrice(token) > 0, "Invalid oracle");
        lpTokens[token] = new LpToken(name, symbol);
        _supportedTokens.add(token);
    }

    function setBaseFee(uint256 baseFee_) external onlyOwner {
        require(baseFee_ < 0.03e18, "Base fee too high");
        require(baseFee_ != baseFee, "Same as current value");
        baseFee = baseFee_;
    }

    function setImbalanceFee(uint256 imbalanceFee_) external onlyOwner {
        require(imbalanceFee_ != imbalanceFee, "Same as current value");
        imbalanceFee = imbalanceFee_;
    }
}
