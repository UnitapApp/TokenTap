# TokenTap Contract

This contract allows users to claim tokens by providing a valid signature from an authorized signer.

## Imports

- **AccessControl** from OpenZeppelin's `@openzeppelin/contracts/access/AccessControl.sol`
- **SafeERC20** from OpenZeppelin's `@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol`
- **IERC20** from OpenZeppelin's `@openzeppelin/contracts/token/ERC20/IERC20.sol`

## Roles

- **UNITAP_ROLE**: Role assigned to signers who can authorize token claims.

## Storage

- **usedNonces**: A mapping of users' addresses to nonces they've used in order to prevent replay attacks.

## Events

- **TokensClaimed**: Emitted when a user successfully claims tokens.

## Errors

- **InvalidSignature**: Thrown when the provided signature is not valid.
- **NonceAlreadyUsed**: Thrown when the provided nonce has already been used.

## Functions

- **constructor**: Initializes the contract and grants the deployer the admin and UNITAP_ROLE.
- **claimToken**: Allows a user to claim tokens by providing a valid signature from an authorized signer.
- **recoverSigner**: Recovers the address of the signer from the provided message and signature.
