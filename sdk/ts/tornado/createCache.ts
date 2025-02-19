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

	const latestBlock = await client.getBlockNumber()
	const proposalCount = await governanceGetProposalCount(client)

	console.log('Getting proposals')
	const allProposals = await governanceListProposals(client, proposalCount)
	writeFileSync(`${ dir }proposals_${ network }.json`, JSON.stringify(ProposalsCache.serialize({ proposalCount, cache: allProposals })), 'utf8')

	console.log('Getting proposal events')
	const proposalEvents = await getProposalEvents(client, latestBlock)
	writeFileSync(`${ dir }proposalEvents_${ network }.json`, JSON.stringify(ProposalEventsCache.serialize({ latestBlock, cache: proposalEvents })), 'utf8')

	console.log('Getting list votes')
	const listVotes = await governanceListVotes(client, latestBlock)
	writeFileSync(`${ dir }votes_${ network }.json`, JSON.stringify(GovernanceVotesCache.serialize({ latestBlock, cache: listVotes })), 'utf8')

	console.log('Getting executed proposals')
	const executedProposals = await getExecutedProposals(client, latestBlock)
	writeFileSync(`${ dir }executedProposals_${ network }.json`, JSON.stringify(ExecutedProposalsCache.serialize({ latestBlock, cache: executedProposals })), 'utf8')
}
createCaches()
