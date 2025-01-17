import { approveTorn, getProposal, getProposalEvents, getTornBalance, getVotingReasons, governanceCastVote, governanceCreateProposal, governanceGetProposalCount, governanceListProposals, governanceListVotes, governanceLockWithApproval, governanceUnLockStake } from '../governance.js'
import { EthereumAddress, EthereumQuantity } from '../types/types.js'
import { CONTRACTS } from '../utils/constants.js'
import { runTestsSequentially } from './testsuite/ethSimulateTestSuite.js'
import { addressString } from '../utils/utils.js'
import { createWriteClient } from '../wallet.js'
import { getMockedEthSimulateWindowEthereum, MockWindowEthereum } from './testsuite/simulator/MockWindowEthereum.js'
import { encodeAbiParameters, keccak256 } from 'viem'

const vitalik = 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045n

const canGetProposalCount = async () => {
	const client = createWriteClient(getMockedEthSimulateWindowEthereum(), vitalik)
	const proposalCount = await governanceGetProposalCount(client)
	if (proposalCount <= 0n) throw new Error('No proposals')
}

const listProposals = async () => {
	const client = createWriteClient(getMockedEthSimulateWindowEthereum(), vitalik)
	const proposals = await governanceListProposals(client)
	if (proposals.length <= 0n) throw new Error('No proposals')
}

const listVotes = async () => {
	const client = createWriteClient(getMockedEthSimulateWindowEthereum(), vitalik)
	const votes = await governanceListVotes(client, 0n)
	if (votes.length <= 0n) throw new Error('No proposals')
}

const votingReasons = async () => {
	const client = createWriteClient(getMockedEthSimulateWindowEthereum(), vitalik)
	const votingReason = await getVotingReasons(client, [0x62ac750b4f522bad1711d313fac4d4e0015246ecb6f2d39b86cec067601df326n])
	if (votingReason[0]?.message !== 'Torn holders who have skin in the game will be the admins for the new group. ') throw new Error('Wrong voting reason')
}

const mintTorn = async (mockWindowEthereum: MockWindowEthereum, mintAmounts: { address: EthereumAddress, amount: EthereumQuantity }[]) => {
	const tornAddress = CONTRACTS.mainnet.governance['TORN Token']
	const overrides = mintAmounts.map((mintAmounts) => {
		const encodedKeySlotHash = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [addressString(mintAmounts.address), 0n]))
		return { key: encodedKeySlotHash, value: mintAmounts.amount }
	})
	const stateSets = overrides.reduce((acc, current) => {
		acc[current.key] = current.value
		return acc
	}, {} as { [key: string]: bigint } )
	await mockWindowEthereum.addStateOverrides({ [addressString(tornAddress)]: { stateDiff: stateSets }})
}

const createProposalAndVote = async() => {
	const mockedWindowEthereum = getMockedEthSimulateWindowEthereum()
	const client = createWriteClient(mockedWindowEthereum, vitalik)
	const description = 'hello world'
	const target = 0xffbac21a641dcfe4552920138d90f3638b3c9fban

	const tornToUse = 2000000000000000000000n
	await mintTorn(mockedWindowEthereum, [{ address: vitalik, amount: tornToUse }])
	const tornBalance = await getTornBalance(client, vitalik)
	if (tornBalance !== tornToUse) throw new Error(`Wrong torn balance ${ tornBalance } !== ${ tornToUse }`)
	await approveTorn(client, CONTRACTS.mainnet.governance['Governance Contract'], tornToUse)
	await governanceLockWithApproval(client, tornToUse)
	await governanceCreateProposal(client, { target, description })
	const newProposalId = await governanceGetProposalCount(client)
	const proposalData = await getProposal(client, newProposalId)
	if (proposalData.target !== target) throw new Error('Target is wrong')
	if (proposalData.proposer !== vitalik) throw new Error('Proposer is wrong')
	if (proposalData.forVotes !== 0n) throw new Error('For votes are wrong')
	if (proposalData.executed !== false) throw new Error('Execution is wrong')
	const proposals = await getProposalEvents(client)
	const ourProposalEvent = proposals.find((proposal) => proposal.proposalId === newProposalId)
	if (ourProposalEvent === undefined) throw new Error('Proposal event was not found')
	if (ourProposalEvent.description !== description) throw new Error('description mismatch')
	if (ourProposalEvent.proposalId !== newProposalId) throw new Error('proposalId mismatch')
	if (ourProposalEvent.proposer !== vitalik) throw new Error('proposer mismatch')
	if (ourProposalEvent.target !== target) throw new Error('target mismatch')
	const VOTING_DELAY = 75n
	await mockedWindowEthereum.advanceTime(VOTING_DELAY)
	await governanceCastVote(client, newProposalId, true)
	const votes = await governanceListVotes(client, newProposalId)
	const ourVote = votes[0]
	if (votes.length !== 1 || ourVote === undefined) throw new Error('Cant see our vote')
	if (ourVote.proposalId !== newProposalId) throw new Error('Wrong proposalid')
	if (ourVote.support !== true) throw new Error('Wrong support')
	if (ourVote.voter !== vitalik) throw new Error('Wrong voterAddress')
	if (ourVote.votes !== tornToUse) throw new Error('Wrong votes count')
	await mockedWindowEthereum.advanceTime(100000000000n)
	await governanceUnLockStake(client, tornToUse)
}

const allTests = async () => {
	await runTestsSequentially([
		['Can get proposal count', canGetProposalCount, undefined],
		['Can list proposals', listProposals, undefined],
		['Can list votes', listVotes, undefined],
		['Can get voting reasons', votingReasons, undefined],
		['Can create Proposals and vote', createProposalAndVote, undefined]
	])
}
allTests()
