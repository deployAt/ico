//truffle migrate --reset
//truffle migrate --network kovan
//truffle networks
//truffle exec scripts/seed.js
//truffle exec scripts/seed.js --network kovan
//heroku logs --tail
const ZBToken = artifacts.require('ZBToken')

module.exports = async function (deployer) {
  // const accounts = await web3.eth.getAccounts()
  await deployer.deploy(ZBToken, 'ZBToken', 'ZB', 18)
}
