import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { getExecutedProposals, getProposalEvents, governanceGetProposalCount, governanceListProposals, governanceListVotes } from './governance.js'
import { ExecutedProposalsCache, GovernanceVotesCache, ProposalEventsCache, ProposalsCache } from '../types/types.js'

export const createCaches = async () => {
	const { writeFileSync, existsSync, mkdirSync } = await import('fs')
	const dir = 'js/data/'
	if (!existsSync(dir)) mkdirSync(dir)
	const network = 'mainnet'
	const client = createPublicClient({ chain: mainnet, transport: http('https://ethereum.dark.florist', { batch: { wait: 100 } }) })

	const latestBlock = await client.getBlock({ includeTransactions: false, blockTag: 'finalized' })
	const proposalCount = await governanceGetProposalCount(client)

	console.log('Getting proposals')
	const allProposals = await governanceListProposals(client, proposalCount)
	const proposalsCache = { proposalCount, cache: allProposals, dataRetrievedFinalizedBlockNumber: latestBlock.number, dataRetrievedFinalizedTimeStamp: latestBlock.timestamp }
	writeFileSync(`${ dir }proposals_${ network }.json`, JSON.stringify(ProposalsCache.serialize(proposalsCache)), 'utf8')

	console.log('Getting proposal events')
	const proposalEvents = await getProposalEvents(client, latestBlock.number)
	writeFileSync(`${ dir }proposalEvents_${ network }.json`, JSON.stringify(ProposalEventsCache.serialize({ latestBlock: latestBlock.number, cache: proposalEvents })), 'utf8')

	console.log('Getting list votes')
	const listVotes = await governanceListVotes(client, undefined, latestBlock.number, proposalsCache)
	writeFileSync(`${ dir }votes_${ network }.json`, JSON.stringify(GovernanceVotesCache.serialize({ latestBlock: latestBlock.number, cache: listVotes })), 'utf8')

	console.log('Getting executed proposals')
	const executedProposals = await getExecutedProposals(client, latestBlock.number)
	writeFileSync(`${ dir }executedProposals_${ network }.json`, JSON.stringify(ExecutedProposalsCache.serialize({ latestBlock: latestBlock.number, cache: executedProposals })), 'utf8')
}
createCaches()
