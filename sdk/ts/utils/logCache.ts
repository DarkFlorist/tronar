import { ExecutedProposalsCache, GovernanceVotesCache, ProposalEventsCache, ProposalsCache } from '../types/types.js'

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
	if (!isNode) { // TODO: add node support
		const localData = localStorage.getItem(`proposals_${ network }`)
		if (localData) return ProposalsCache.parse(JSON.parse(localData))
	}
	const data = await fetchJSON(`proposals_${ network }`)
	return data ? ProposalsCache.parse(data) : { proposalCount: 0n, cache: [], dataRetrievedFinalizedBlockNumber: 0n, dataRetrievedFinalizedTimeStamp: 0n }
}

export const getCacheProposalEvents = async () => {
	if (!isNode) { // TODO: add node support
		const localData = localStorage.getItem(`proposalEvents_${ network }`)
		if (localData) return ProposalEventsCache.parse(JSON.parse(localData))
	}
	const data = await fetchJSON(`proposalEvents_${ network }`)
	return data ? ProposalEventsCache.parse(data) : { latestBlock: 0n, cache: [] }
}

export const getCacheGovernanceListVotes = async () => {
	if (!isNode) { // TODO: add node support
		const localData = localStorage.getItem(`votes_${ network }`)
		if (localData) return GovernanceVotesCache.parse(JSON.parse(localData))
	}
	const data = await fetchJSON(`votes_${ network }`)
	return data ? GovernanceVotesCache.parse(data) : { latestBlock: 0n, cache: [] }
}

export const getCacheExecutedProposals = async () => {
	if (!isNode) { // TODO: add node support
		const localData = localStorage.getItem(`executedProposals_${ network }`)
		if (localData) return ExecutedProposalsCache.parse(JSON.parse(localData))
	}
	const data = await fetchJSON(`executedProposals_${ network }`)
	return data ? ExecutedProposalsCache.parse(data) : { latestBlock: 0n, cache: [] }
}

export const storeLocalCacheProposals = async (cache: ProposalsCache) => {
	if (isNode) return // TODO: add node support
	localStorage.setItem(`proposals_${ network }`, JSON.stringify(ProposalsCache.serialize(cache)))
}

export const storeLocalCacheProposalEvents = async (cache: ProposalEventsCache) => {
	if (isNode) return // TODO: add node support
	localStorage.setItem(`proposalEvents_${ network }`, JSON.stringify(ProposalEventsCache.serialize(cache)))
}

export const storeLocalCacheGovernanceListVotes = async (cache: GovernanceVotesCache) => {
	if (isNode) return // TODO: add node support
	localStorage.setItem(`votes_${ network }`, JSON.stringify(GovernanceVotesCache.serialize(cache)))
}

export const storeLocalExecutedProposals = async (cache: ExecutedProposalsCache) => {
	if (isNode) return // TODO: add node support
	localStorage.setItem(`executedProposals_${ network }`, JSON.stringify(ExecutedProposalsCache.serialize(cache)))
}

export const clearLocalStorageCache = () => {
	localStorage.clear()
}
