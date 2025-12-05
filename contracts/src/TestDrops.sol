// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract TestDrops {
    address public owner;
    uint256 public maxNativeClaim = 10 ether;
    uint256 public maxClaimERC20 = 10 * 1 ether;

    error ExceedsMaxClaim();
    error NotEnoughBalance();
    error ClaimFail();
    error Unauthorized();
    error InvalidToken();

    constructor() {
        owner = msg.sender;
    }

    modifier Owner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    receive() external payable {}

    function claimNative(address to, uint256 amount) external {
        if (amount > maxNativeClaim) revert ExceedsMaxClaim();
        if (address(this).balance < amount) revert NotEnoughBalance();
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert ClaimFail();
    }

    function claimERC20(address token, address to, uint256 amount) external {
        IERC20 erc20 = IERC20(token);
        if (amount > maxClaimERC20) revert ExceedsMaxClaim();
        if (amount > erc20.balanceOf(address(this))) revert NotEnoughBalance();
        if (!erc20.transfer(to, amount)) revert ClaimFail();
    }

    // the bellow (2) functions are developer functions meant to quickly withdraw any amount of tokens from the contract with no restrictions
    function withNative(address to, uint256 amount) external Owner {
        if (amount > address(this).balance) revert NotEnoughBalance();
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert ClaimFail();
    }

    function withERC(address token, address to, uint256 amount) external Owner {
        IERC20 erc20 = IERC20(token);
        if (amount > erc20.balanceOf(address(this))) revert NotEnoughBalance();
        if (!erc20.transfer(to, amount)) revert ClaimFail();
    }

    // setter functions
    function setMaxNativeClaim(uint256 amount) external Owner {
        maxNativeClaim = amount;
    }

    function setMaxERC20Claim(uint256 amount) external Owner {
        maxClaimERC20 = amount;
    }

    function changeOwner(address newOwner) external Owner {
        owner = newOwner;
    }
}
