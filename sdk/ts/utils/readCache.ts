import { GovernanceVotesCache, ProposalEventsCache, ProposalsCache } from '../types/types.js'
import * as fs from 'fs'

export const getCacheProposals = () => {
	const network = 'mainnet'
	const file = `data/proposals_${ network }.json`
	if (fs.existsSync(file)) return ProposalsCache.parse(JSON.parse(fs.readFileSync(file, 'utf8')))
	return { proposalCount: 0n, cache: [] }
}

export const getCacheProposalEvents = () => {
	const network = 'mainnet'
	const file = `data/proposalEvents_${ network }.json`
	if (fs.existsSync(file)) return ProposalEventsCache.parse(JSON.parse(fs.readFileSync(file, 'utf8')))
	return { latestBlock: 0n, cache: [] }
}

export const getCacheGovernanceListVotes = () => {
	const network = 'mainnet'
	const file = `data/votes_${ network }.json`
	if (fs.existsSync(file)) return GovernanceVotesCache.parse(JSON.parse(fs.readFileSync(file, 'utf8')))
	return { latestBlock: 0n, cache: [] }
}
