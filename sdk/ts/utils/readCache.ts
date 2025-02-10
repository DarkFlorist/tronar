import { GovernanceVotesCache, ProposalEventsCache, ProposalsCache } from '../types/types.js'

const network = 'mainnet'
const isNode = typeof window === 'undefined'

const joinPath = async (...paths: string[]) => {
	if (typeof window !== 'undefined' || typeof document !== 'undefined') {
		return paths.join('/').replace(/\/+/g, '/')
	}
	const nodePath = await import('node:path')
	return nodePath.join(...paths)
}

const getCurrentFolder = async () => {
	if (typeof window !== 'undefined' || typeof document !== 'undefined') {
		return new URL('.', import.meta.url).pathname
	}
	const nodePath = await import('node:path')
	const { fileURLToPath } = await import('node:url')

	const __filename = fileURLToPath(import.meta.url)
	return nodePath.dirname(__filename)
}

const fetchJSON = async (file: string) => {
	const path = await joinPath(await getCurrentFolder(), '..', 'data', `${ file }.json`)
	if (isNode) {
		const { readFileSync, existsSync } = await import('fs')
		if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'))
	} else {
		try {
			const response = await fetch(path)
			if (!response.ok) throw new Error('Failed to fetch data')
			return await response.json()
		} catch {
			return null
		}
	}
	return null
}

export const getCacheProposals = async () => {
	const data = await fetchJSON(`proposals_${ network }`)
	return data ? ProposalsCache.parse(data) : { proposalCount: 0n, cache: [] }
}

export const getCacheProposalEvents = async () => {
	const data = await fetchJSON(`proposalEvents_${ network }`)
	return data ? ProposalEventsCache.parse(data) : { latestBlock: 0n, cache: [] }
}

export const getCacheGovernanceListVotes = async () => {
	const data = await fetchJSON(`votes_${ network }`)
	return data ? GovernanceVotesCache.parse(data) : { latestBlock: 0n, cache: [] }
}
