//yarn test test/Token.test.js
const { accounts, contract, web3 } = require('@openzeppelin/test-environment')
// require('chai').should()
// https://docs.openzeppelin.com/test-helpers/
// const {
//   BN,           // Big Number support
//   // constants,    // Common constants, like the zero address and largest integers
//   // expectEvent,  // Assertions for emitted events
//   // expectRevert, // Assertions for transactions that should fail
// } = require('@openzeppelin/test-helpers')

const ZBToken = contract.fromArtifact('ZBToken')

describe('ZBToken', () => {
  // const [sender, receiver] = accounts
  const name = 'ZBToken'
  const symbol = 'ZB'
  const decimals = 18

  beforeEach(async () => {
    this.token = await ZBToken.new(name, symbol, decimals)
  })

  describe('token attributes', () => {
    it('has the correct name', async () => {
      const result = await this.token.name()
      result.should.equal(name)
    })

    it('has the correct symbol', async () => {
      const result = await this.token.symbol()
      result.should.equal(symbol)
    })

    it('has the correct decimals', async () => {
      const result = await this.token.decimals()
      result.should.be.bignumber.equal('18')
    })
  })

})
