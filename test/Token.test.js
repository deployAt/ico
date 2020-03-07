//yarn test test/Token.test.js
const { accounts, contract, web3 } = require('@openzeppelin/test-environment')
require('chai').should()
// const { expect } = require('chai')
// https://docs.openzeppelin.com/test-helpers/
// const {
//   BN,           // Big Number support
//   constants,    // Common constants, like the zero address and largest integers
//   expectEvent,  // Assertions for emitted events
//   expectRevert, // Assertions for transactions that should fail
// } = require('@openzeppelin/test-helpers')

const Token = contract.fromArtifact('Token')

describe('Token', () => {
  // const [sender, receiver] = accounts
  const name = 'Token'
  const symbol = 'T'
  const decimals = 18

  beforeEach(async () => {
    this.token = await Token.new(name, symbol, decimals)
  })

  describe('deploy', () => {
    it('tracks the name', async () => {
      const result = await this.token.name()
      result.should.equal(name)
    })
  })

})
