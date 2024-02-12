// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IMuonClient.sol";

contract ERC20TokenTap is AccessControl {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    struct Distribution {
        address provider;
        address token;
        uint256 maxNumClaims;
        uint256 claimAmount;
        uint256 claimsCount;
        uint256 startTime;
        uint256 endTime;
        bool isRefunded;
    }

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    mapping(uint256 => bool) public usedClaims;
    mapping(uint256 => Distribution) public distributions;

    uint256 public lastDistributionId;

    uint256 public muonAppId;

    IMuonClient.PublicKey public muonPublicKey;

    IMuonClient public muon;

    address public muonValidGateway;

    event TokenDistributed(
        uint256 distributionId,
        address indexed provider,
        address indexed token,
        uint256 maxNumClaims,
        uint256 claimAmount
    );
    
    event TokensClaimed(
        address indexed token,
        address indexed user,
        uint256 claimId
    );

    event DistributionRefunded(
        address recipient,
        uint256 distributionId,
        uint256 amount
    );

    constructor(
        address admin,
        uint256 _muonAppId,
        IMuonClient.PublicKey memory _muonPublicKey,
        address _muon,
        address _muonValidGateway
    ) {
        muonAppId = _muonAppId;
        muonPublicKey = _muonPublicKey;
        muon = IMuonClient(_muon);
        muonValidGateway = _muonValidGateway;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DAO_ROLE, admin);
    }

    function distributeToken(
        address token,
        uint256 maxNumClaims,
        uint256 claimAmount,
        uint256 startTime,
        uint256 endTime
    ) external {
        require(token != address(0), "Invalid token");
        require(maxNumClaims > 0, "Invalid token");
        require(claimAmount > 0, "Invalid token");
        require(startTime > block.timestamp && endTime > startTime, "Invalid period");

        ++lastDistributionId;
        Distribution storage distribution = distributions[lastDistributionId];
        distribution.provider = msg.sender;
        distribution.token = token;
        distribution.maxNumClaims = maxNumClaims;
        distribution.claimAmount = claimAmount;
        distribution.startTime = startTime;
        distribution.endTime = endTime;

        uint256 totalAmount = claimAmount * maxNumClaims;
        uint256 balance = IERC20(token).balanceOf(address(this));

        IERC20(token).safeTransferFrom(
            msg.sender,
            address(this),
            totalAmount
        );

        uint256 receivedAmount = IERC20(token).balanceOf(address(this)) -
            balance;

        require(
            totalAmount == receivedAmount,
            "receivedAmount != totalAmount"
        );

        emit TokenDistributed(lastDistributionId, msg.sender, token, maxNumClaims, claimAmount);
    }

    function claimToken(
        address user,
        uint256 distributionId,
        uint256 claimId,
        bytes calldata reqId,
        IMuonClient.SchnorrSign calldata signature,
        bytes calldata gatewaySignature
    ) external {
        require(claimId > 0, "Invalid claimId");
        require(!usedClaims[claimId], "Already claimed");
        require(
            distributions[distributionId].provider != address(0),
            "Invalid distributionId"
        );
        require(
            distributions[distributionId].claimsCount < distributions[distributionId].maxNumClaims, 
            "Max num claims has been reached"
        );
        require(
            block.timestamp > distributions[distributionId].startTime && 
            block.timestamp <= distributions[distributionId].endTime
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                muonAppId,
                reqId,
                block.chainid,
                address(this),
                user,
                distributionId,
                claimId
            )
        );

        verifyMuonSig(reqId, hash, signature, gatewaySignature);

        distributions[distributionId].claimsCount += 1;
        usedClaims[claimId] = true;
        IERC20(distributions[distributionId].token).safeTransfer(
            user,
            distributions[distributionId].claimAmount
        );

        emit TokensClaimed(distributions[distributionId].token, user, claimId);
    }

    function withdrawReaminingTokens(address to, uint256 distributionId) external {
        require(msg.sender == distributions[distributionId].provider, "Not permitted");
        require(!distributions[distributionId].isRefunded, "Already refunded");
        require(block.timestamp > distributions[distributionId].endTime, "Distribution is still open");

        distributions[distributionId].isRefunded = true;

        uint256 refundAmount = distributions[distributionId].claimAmount * (
            distributions[distributionId].maxNumClaims - distributions[distributionId].claimsCount
        );

        IERC20(distributions[distributionId].token).safeTransfer(
            to,
            refundAmount
        );

        emit DistributionRefunded(to, distributionId, refundAmount);

    }

    function setMuonAppId(
        uint256 _muonAppId
    ) external onlyRole(DAO_ROLE) {
        muonAppId = _muonAppId;
    }

    function setMuonPublicKey(
        IMuonClient.PublicKey memory _muonPublicKey
    ) external onlyRole(DAO_ROLE) {
        muonPublicKey = _muonPublicKey;
    }

    function setMuonAddress(
        address _muonAddress
    ) external onlyRole(DAO_ROLE) {
        muon = IMuonClient(_muonAddress);
    }

    function setMuonGateway(
        address _gatewayAddress
    ) external onlyRole(DAO_ROLE) {
        muonValidGateway = _gatewayAddress;
    }

    function verifyMuonSig(
        bytes calldata reqId,
        bytes32 hash,
        IMuonClient.SchnorrSign calldata sign,
        bytes calldata gatewaySignature
    ) internal {
        bool verified = muon.muonVerify(
            reqId,
            uint256(hash),
            sign,
            muonPublicKey
        );
        require(verified, "Invalid signature!");

        hash = hash.toEthSignedMessageHash();
        address gatewaySignatureSigner = hash.recover(gatewaySignature);

        require(
            gatewaySignatureSigner == muonValidGateway,
            "Gateway is not valid"
        );
    }
}
