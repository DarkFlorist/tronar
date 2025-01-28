import { GovernanceVotesCache, ProposalEventsCache, ProposalsCache } from '../types/types.js'
import * as fs from 'fs'

export const getCacheProposals = () => {
	const network = 'mainnet'
	const file = `data/proposals_${ network }`
	if (fs.existsSync(file)) return ProposalsCache.parse(fs.readFileSync(file))
	return { proposalCount: 0n, cache: [] }
}

export const getCacheProposalEvents = () => {
	const network = 'mainnet'
	const file = `data/proposalEvents_${ network }`
	if (fs.existsSync(file)) return ProposalEventsCache.parse(fs.readFileSync(file))
	return { latestBlock: 0n, cache: [] }
}

export const getCacheGovernanceListVotes = () => {
	const network = 'mainnet'
	const file = `data/votes_${ network }`
	if (fs.existsSync(file)) return GovernanceVotesCache.parse(fs.readFileSync(file))
	return { latestBlock: 0n, cache: [] }
}
