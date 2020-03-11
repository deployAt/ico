const { accounts, contract } = require('@openzeppelin/test-environment')
const {
  BN,
  ether,
  send
  // constants,    // Common constants, like the zero address and largest integers
  // expectEvent,  // Assertions for emitted events
  // expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers')

const ZBTokenCrowdsale = contract.fromArtifact('ZBTokenCrowdsale')
const ZBToken = contract.fromArtifact('ZBToken')

describe('ZBTokenCrowdsale', () => {
  const [crowdsaleWallet, investor1, investor2] = accounts

  //token
  const name = 'ZBToken'
  const symbol = 'ZB'
  const decimals = 18

  //crowdsale
  const rate = 500
  const wallet = crowdsaleWallet
  const cap = ether('100')

  beforeEach(async () => {
    // Deploy token
    this.token = await ZBToken.new(name, symbol, decimals)
    // Deploy crowdsale
    this.crowdsale = await ZBTokenCrowdsale.new(
      rate,
      wallet,
      this.token.address,
      cap
    )
    // Add crowdsale as a minter
    await this.token.addMinter(this.crowdsale.address)
  })

  describe('crowdsale', () => {
    it('tracks the rate', async () => {
      const result = await this.crowdsale.rate()
      result.should.be.bignumber.equal(new BN(rate))
    })

    it('tracks the wallet', async () => {
      const result = await this.crowdsale.wallet()
      result.should.equal(wallet)
    })

    it('tracks the token', async () => {
      const result = await this.crowdsale.token()
      result.should.equal(this.token.address)
    })
  })

  describe('minted crowdsale', () => {
    it('mints token after purchase', async () => {
      const originalTotalSupply = await this.token.totalSupply()
      // send.ether(investor1, this.crowdsale.address, ether('1')) // ??? gas error
      await this.crowdsale.sendTransaction({
        value: ether('1'),
        from: investor1
      })
      const newTotalSupply = await this.token.totalSupply()
      newTotalSupply.should.be.bignumber.greaterThan(originalTotalSupply)
    })
  })

  describe('accteping payments', () => {
    it('should acctept payments', async () => {
      const value = ether('1')
      const purchaser = investor2
      await this.crowdsale.sendTransaction({ value, from: investor1 })
      await this.crowdsale.buyTokens(investor1, { value, from: purchaser })
    })
  })

  describe('buyTokens()', () => {
    describe('when the contribution is less than the min cap', () => {
      it('', () => {})
    })
  })
})
