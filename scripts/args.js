const args_abi = [
  'address',
  'uint256',
  'type(uint256 x, uint8 parity) d',
  "address",
  "address"
]

const args_values = [
  '0xb57490CDAABEDb450df33EfCdd93079A24ac5Ce5',
  '84432823270461485387310871833182886925643143330424776997873308187796891046056',
  {
    x: "0x5f400480f526524701e012e15c7d841fe38611854a91e30eadfb0e8d48772d56",
    parity: 0
  },
  '0x3234D9F7933d117F5a4e87fA11879BA4caC5151a',
  '0x4d7A51Caa1E79ee080A7a045B61f424Da8965A3c'
]

module.exports = {
  args_abi, args_values
}