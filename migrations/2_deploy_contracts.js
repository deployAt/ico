//truffle migrate --reset
//truffle migrate --network kovan
//truffle networks
//truffle exec scripts/seed.js
//truffle exec scripts/seed.js --network kovan
//heroku logs --tail
const Token = artifacts.require('Token')

module.exports = async function (deployer) {
  // const accounts = await web3.eth.getAccounts()
  await deployer.deploy(Token)
}
