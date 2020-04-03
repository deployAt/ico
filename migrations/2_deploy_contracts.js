//truffle migrate --reset
//truffle migrate --network kovan
//truffle networks
//truffle exec scripts/seed.js
//truffle exec scripts/seed.js --network kovan
//heroku logs --tail
const { BN, ether, time } = require('@openzeppelin/test-helpers')

const ZBToken = artifacts.require('ZBToken')
const ZBTokenCrowdsale = artifacts.require('ZBTokenCrowdsale')

module.exports = async function(deployer, network, accounts) {
  // const accounts = await web3.eth.getAccounts()
  await deployer.deploy(ZBToken, 'ZBToken', 'ZB', 18)
  const deployedToken = await ZBToken.deployed()

  // helpers
  const block = await web3.eth.getBlock('latest')
  const latest = new BN(block.timestamp)

  // crowdsale args
  const preICOrate = 500
  const wallet = accounts[0]
  const token = deployedToken.address
  const cap = ether('100')
  const goal = ether('20')
  const openingTime = latest.add(time.duration.minutes(10))
  const closingTime = openingTime.add(time.duration.weeks(1))
  const releaseTime = openingTime.add(time.duration.days(1))
  const foundersFund = accounts[1]
  const foundationFund = accounts[1]
  const partnersFund = accounts[1]

  await deployer.deploy(
    ZBTokenCrowdsale,
    preICOrate,
    wallet,
    token,
    cap,
    openingTime,
    closingTime,
    goal,
    foundersFund,
    foundationFund,
    partnersFund,
    releaseTime
  )
}
