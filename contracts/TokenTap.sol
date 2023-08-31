// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenTap is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant UNITAP_ROLE = keccak256("UNITAP_ROLE");

    mapping(address => mapping(uint32 => bool)) public usedNonces;

    event TokensClaimed(
        address indexed token,
        address indexed user,
        uint256 amount,
        uint32 nonce
    );

    error InvalidSignature();
    error NonceAlreadyUsed();

    constructor(address admin, address unitap) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UNITAP_ROLE, unitap);
    }

    function claimToken(
        address user,
        address token,
        uint256 amount,
        uint32 nonce,
        bytes memory signature
    ) external {
        if (usedNonces[user][nonce]) revert NonceAlreadyUsed();

        bytes32 messageHash = keccak256(
            abi.encodePacked(user, token, amount, nonce)
        );

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";

        bytes32 digest = keccak256(abi.encodePacked(prefix, messageHash));

        address signer = recoverSigner(digest, signature);

        if (!hasRole(UNITAP_ROLE, signer)) revert InvalidSignature();

        usedNonces[user][nonce] = true;
        IERC20(token).safeTransfer(user, amount);

        emit TokensClaimed(token, user, amount, nonce);
    }

    function recoverSigner(
        bytes32 message,
        bytes memory signature
    ) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := and(mload(add(signature, 65)), 255)
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature v value");

        return ecrecover(message, v, r, s);
    }
}
