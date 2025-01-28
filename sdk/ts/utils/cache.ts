import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { getProposalEvents, governanceGetProposalCount, governanceListProposals, governanceListVotes } from '../governance.js'
import { GovernanceVotesCache, ProposalEventsCache, ProposalsCache } from '../types/types.js'
import * as fs from 'fs'

export const createCaches = async () => {
	const network = 'mainnet'
	const client = createPublicClient({ chain: mainnet, transport: http('https://ethereum.dark.florist', { batch: { wait: 100 } }) })

	const latestBlock = await client.getBlockNumber()
	const proposalCount = await governanceGetProposalCount(client)

	console.log('Getting proposals')
	const allProposals = await governanceListProposals(client, proposalCount)
	fs.writeFileSync(`data/proposals_${ network }`, JSON.stringify(ProposalsCache.serialize({ proposalCount, cache: allProposals })), 'utf8')

	console.log('Getting proposal events')
	const proposalEvents = await getProposalEvents(client, latestBlock)
	fs.writeFileSync(`data/proposalEvents_${ network }`, JSON.stringify(ProposalEventsCache.serialize({ latestBlock, cache: proposalEvents })), 'utf8')

	console.log('Getting list votes')
	const listVotes = await governanceListVotes(client, latestBlock)
	fs.writeFileSync(`data/votes_${ network }`, JSON.stringify(GovernanceVotesCache.serialize({ latestBlock, cache: listVotes })), 'utf8')
}
