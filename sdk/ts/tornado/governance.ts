import { AbiEvent, BlockNumber, BlockTag, decodeAbiParameters, decodeFunctionData, encodeAbiParameters, encodeFunctionData, GetLogsParameters, GetLogsReturnType, parseEventLogs, TimeoutError, TransactionNotFoundError } from 'viem'
import { mainnet } from 'viem/chains'
import { EthereumAddress, EthereumBytes32, EthereumQuantity, ExecutedProposals, GovernanceVotesCache, JoinedProposals, Proposal, ProposalEvents, Proposals, ProposalsCache, TornadoVotingReason, VoteComment, VoteCommentOrMissing } from '../types/types.js'
import { ABIS } from '../abi/abis.js'
import { addressString, bigintToNumber, createRange, serialize, stringAsHexString } from '../utils/utils.js'
import { CONTRACTS, EXECUTION_DELAY, EXECUTION_EXPIRATION, QUORUM_VOTES, TORNADO_GOVERNANCE_VOTING_DELAY } from '../utils/constants.js'
import { ReadClient, WriteClient } from '../utils/wallet.js'
import { getCacheExecutedProposals, getCacheGovernanceListVotes, getCacheProposalEvents, getCacheProposals, storeLocalCacheGovernanceListVotes, storeLocalCacheProposalEvents, storeLocalCacheProposals, storeLocalExecutedProposals } from '../utils/logCache.js'
import { JsonRpcResponseError } from '../testsuite/simulator/utils/errors.js'
import { bigIntMax } from '../utils/bigint.js'
import { queryTovarish } from './tovarish.js'

export const getProposalStatus = (proposal: Proposal, timestamp: bigint) => {
	if (timestamp <= proposal.startTime) return 'Pending'
	if (timestamp <= proposal.endTime) return 'Active'
	if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes + proposal.againstVotes < QUORUM_VOTES) return 'Defeated'
	if (proposal.executed) return 'Executed'
	if (timestamp >= proposal.endTime + EXECUTION_DELAY + EXECUTION_EXPIRATION) return 'Expired'
	if (timestamp >= proposal.endTime + EXECUTION_DELAY) return 'AwaitingExecution'
	return 'Timelocked'
}

export async function binarySearchLogs(client: ReadClient, logFilter: GetLogsParameters<AbiEvent>): Promise<GetLogsReturnType<AbiEvent, undefined, undefined, BlockNumber | BlockTag, BlockNumber | BlockTag>> {
	const getLastBlock = async () => {
		if ('toBlock' in logFilter) {
			if (typeof logFilter.toBlock === 'bigint') return logFilter.toBlock
			if (logFilter.toBlock === 'latest') return await client.getBlockNumber()
		}
		return await client.getBlockNumber()
	}
	if (logFilter.blockHash !== undefined) return await client.getLogs(logFilter)
	const logsSoFar: GetLogsReturnType<AbiEvent, undefined, undefined, BlockNumber | BlockTag, BlockNumber | BlockTag>[] = []

	const fetchLogs = async (fromBlock: bigint, toBlock: bigint): Promise<void> => {
		console.log(`getting logs: ${ fromBlock } -> ${ toBlock }`)
		if (toBlock < fromBlock) return
		try {
			const result = await client.getLogs({ ...logFilter, fromBlock, toBlock, blockHash: undefined })
			logsSoFar.push(result)
			console.log(`got logs: ${ fromBlock } -> ${ toBlock }: ${ result.length }. Have ${ logsSoFar.flat().length } logs so far`)
		} catch (error: unknown) {
			if (error instanceof JsonRpcResponseError || error instanceof TimeoutError) {
				const midBlock = fromBlock + ((toBlock - fromBlock) / 2n)
				await fetchLogs(fromBlock, midBlock)
				await fetchLogs(midBlock + 1n, toBlock)
			} else {
				throw error
			}
		}
	}

	const lastBlock = await getLastBlock()
	const firstBlock = 'fromBlock' in logFilter && typeof logFilter.fromBlock === 'bigint' ? logFilter.fromBlock : 0n
	await fetchLogs(firstBlock, lastBlock)
	console.log(`got logs: ${logsSoFar.flat().length}`)
	return logsSoFar.flat()
}

// https://etherscan.io/address/0x5efda50f22d34f262c29268506c5fa42cb56a1ce#writeProxyContract
export const governanceLockStake = async (client: WriteClient, params: { owner: EthereumAddress, amount: EthereumQuantity, deadline: EthereumQuantity, v: EthereumQuantity, r: EthereumBytes32, s: EthereumBytes32 }) => {
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.governance['Governance Impl'],
		functionName: 'lock',
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		args: [addressString(params.owner), params.amount, params.deadline, bigintToNumber(params.v), stringAsHexString(serialize(EthereumBytes32, params.r)), stringAsHexString(serialize(EthereumBytes32, params.s))]
	})
}

export const governanceLockWithApproval = async (client: WriteClient, amount: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.governance['Governance Impl'],
		functionName: 'lockWithApproval',
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		args: [amount]
	})
}

export const approveTornForGovernance = async (client: WriteClient, amount: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.governance['TORN Token'],
		functionName: 'approve',
		address: addressString(CONTRACTS.mainnet.governance['TORN Token']),
		args: [addressString(CONTRACTS.mainnet.governance['Governance Contract']), amount]
	})
}

export const tornAllowanceForGovernance = async (client: WriteClient, user: EthereumAddress) => {
	return await client.readContract({
		abi: ABIS.mainnet.governance['TORN Token'],
		functionName: 'allowance',
		address: addressString(CONTRACTS.mainnet.governance['TORN Token']),
		args: [addressString(user), addressString(CONTRACTS.mainnet.governance['Governance Contract'])]
	})
}

export const governanceUnLockStake = async (client: WriteClient, amount: EthereumAddress) => {
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.governance['Governance Impl'],
		functionName: 'unlock',
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		args: [amount]
	})
}

export const governanceGetProposalCount = async (client: ReadClient) => {
	return await client.readContract({
		abi: ABIS.mainnet.governance['Governance Impl'],
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		functionName: 'proposalCount',
		args: []
	})
}

export const getProposal = async (client: ReadClient, proposalId: EthereumQuantity): Promise<Proposal> => {
	const returnValue = await client.readContract({
		abi: ABIS.mainnet.governance['Governance Impl'],
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		functionName: 'proposals',
		args: [proposalId]
	})
	return {
		proposer: EthereumAddress.parse(returnValue[0]),
		target: EthereumAddress.parse(returnValue[1]),
		startTime: returnValue[2],
		endTime: returnValue[3],
		forVotes: returnValue[4],
		againstVotes: returnValue[5],
		executed: returnValue[6],
		extended: returnValue[7],
		proposalId
	}
}

export const governanceListProposalsAndCache = async (client: ReadClient, proposalCount: bigint): Promise<{ proposals: Proposals,finalizedProposals: ProposalsCache }> => {
	const lastFinalized = await client.getBlock({ includeTransactions: false, blockTag: 'finalized' })
	const latestFinalizedTimeStamp = lastFinalized.timestamp
	const cache = await getCacheProposals()
	const missingProposals = (createRange(Number(cache.proposalCount + 1n), Number(proposalCount))).map((x) => BigInt(x))
	const nonCompleteProposals = cache.cache.filter((proposal) => proposal.endTime >= cache.dataRetrievedFinalizedTimeStamp)
	const completeProposals = cache.cache.filter((proposal) => proposal.endTime < cache.dataRetrievedFinalizedTimeStamp)
	const allProposals =  [...completeProposals, ...await Promise.all([...missingProposals, ...nonCompleteProposals.map((p) => p.proposalId)].map((proposalId) => getProposal(client, proposalId)))]

	const proposalsThatExistInFinalizedState = allProposals.filter((event) => event.startTime - TORNADO_GOVERNANCE_VOTING_DELAY <= latestFinalizedTimeStamp)
	const updatedCache = {
		proposalCount: bigIntMax(proposalsThatExistInFinalizedState.map((proposal) => proposal.proposalId)),
		cache: proposalsThatExistInFinalizedState.sort((a, b) => Number(a.proposalId - b.proposalId)),
		dataRetrievedFinalizedTimeStamp: latestFinalizedTimeStamp,
		dataRetrievedFinalizedBlockNumber: lastFinalized.number
	}
	await storeLocalCacheProposals(updatedCache)
	return { proposals: allProposals, finalizedProposals: updatedCache }
}

export const governanceListProposals = async (client: ReadClient, proposalCount: bigint) => {
	return (await governanceListProposalsAndCache(client, proposalCount)).proposals
}

export const governanceListVotes = async (client: ReadClient, tovarishUrl: string | undefined, latestBlockNumber: bigint, proposalsCache: ProposalsCache) => {
	const events = ABIS.mainnet.governance['Governance Impl'].filter((x) => x.type === 'event')
	const votedEvent = events.find((x) => x.name === 'Voted')
	if (votedEvent === undefined) throw new Error('no voting events in the abi')
	const lastFinalized = await client.getBlock({ includeTransactions: false, blockTag: 'finalized' })

	const updateCacheWithTovarishLogs = async (cache: GovernanceVotesCache) => {
		if (tovarishUrl === undefined) return cache
		const tovarishResult = await queryTovarish(tovarishUrl, { type: 'governance', fromBlock: cache.latestBlock }, 0, 60000, undefined)
		if (tovarishResult.responseState !== 'success') return cache
		const votesInBlockNumbers = tovarishResult.response.events.filter((event) => event.event === 'Voted' && event.blockNumber <= proposalsCache.dataRetrievedFinalizedBlockNumber).map((event) => event.blockNumber)
		if (votesInBlockNumbers.length < 10) return cache // just use normal retrieval methods as there's so few logs

		const uniqueBlocks = new Set(votesInBlockNumbers)
		const logs = await Promise.all(Array.from(uniqueBlocks).flatMap((blockNumber) => client.getLogs({
			address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
			event: votedEvent,
			args: { },
			fromBlock: blockNumber,
			toBlock: blockNumber
		})))
		const parsed = logs.flatMap((log) => parseEventLogs({ abi: [votedEvent], logs: log })).sort((a, b) => {
			if (a.blockNumber === b.blockNumber) return a.logIndex - b.logIndex
			return Number(a.blockNumber - b.blockNumber)
		})
		const moreParsed = parsed.map((log) => ({
			proposalId: log.args.proposalId,
			voter: EthereumAddress.parse(log.args.voter),
			support: log.args.support,
			votes: log.args.votes,
			blockNumber: log.blockNumber,
			transactionHash: EthereumBytes32.parse(log.transactionHash)
		}))

		const getLastOccurrences = (data: typeof moreParsed) => {
			const map = new Map<string, typeof data[number]>()
			for (const entry of data) {
				const key = `${ entry.proposalId }-${ entry.voter }`
				map.set(key, entry)
			}
			return Array.from(map.values())
		}
		const calculateVoteTotals = (data: ReturnType<typeof getLastOccurrences>) => {
			const results = new Map<bigint, { support: bigint, against: bigint }>()
			for (const entry of data) {
				if (!results.has(entry.proposalId)) results.set(entry.proposalId, { support: 0n, against: 0n })
				const voteData = results.get(entry.proposalId)!
				if (entry.support) voteData.support += entry.votes
				else voteData.against += entry.votes
			}
			return results
		}
		const votesThatMatter = getLastOccurrences([...cache.cache, ...moreParsed])
		const totalVotes = calculateVoteTotals(votesThatMatter)
		for (const [proposalId, { against, support }] of totalVotes.entries()) {
			const cachedProposal = proposalsCache.cache.find((cacheProposal) => cacheProposal.proposalId === proposalId)
			if (cachedProposal === undefined) {
				console.warn('Tovarish Lied, unknown proposalId')
				return cache // Tovarish client returned proposal ids that do not exist, lets not trust them for other stuff
			}
			if (cachedProposal.againstVotes !== against || cachedProposal.forVotes !== support) {
				console.warn('Tovarish Lied!')
				console.log(`against: ${ against }`)
				console.log(`support: ${ support }`)
				console.log(cachedProposal)
				return cache
			}
		}
		const votingReasons = await getVotingReasons(client, moreParsed.map((x) => x.transactionHash))
		if (moreParsed.length !== votingReasons.length) throw new Error ('length mismatch')
		const withReasons = moreParsed.map((moreParsedOne, index) => {
			if (votingReasons[index] === undefined) throw new Error ('length mismatch')
			return { ...moreParsedOne, comment: votingReasons[index] }
		})
		return { cache: [...cache.cache, ...withReasons], latestBlock: proposalsCache.dataRetrievedFinalizedBlockNumber }
	}

	const cacheWithTovarish = await updateCacheWithTovarishLogs(await getCacheGovernanceListVotes())
	const logs = await binarySearchLogs(client, {
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		event: votedEvent,
		args: { },
		fromBlock: cacheWithTovarish.latestBlock,
		toBlock: latestBlockNumber
	})
	const parsed = parseEventLogs({ abi: [votedEvent], logs })
	const moreParsed = parsed.map((log) => ({
		proposalId: log.args.proposalId,
		voter: EthereumAddress.parse(log.args.voter),
		support: log.args.support,
		votes: log.args.votes,
		blockNumber: log.blockNumber,
		transactionHash: EthereumBytes32.parse(log.transactionHash)
	}))
	const votingReasons = await getVotingReasons(client, moreParsed.map((x) => x.transactionHash))
	if (moreParsed.length !== votingReasons.length) throw new Error ('length mismatch')
	const withReasons = moreParsed.map((moreParsedOne, index) => {
		if (votingReasons[index] === undefined) throw new Error ('length mismatch')
		return { ...moreParsedOne, comment: votingReasons[index] }
	})
	const complete = [...cacheWithTovarish.cache, ...withReasons]
	await storeLocalCacheGovernanceListVotes({ latestBlock: lastFinalized.number, cache: complete.filter((event) => event.blockNumber <= lastFinalized.number) })
	return complete
}

export const getVotingReasons = async (client: ReadClient, transactionHashes: EthereumBytes32[]): Promise<VoteCommentOrMissing[]> => {
	return await Promise.all(transactionHashes.map(async (transactionHash) => {
		try {
			const abi = ABIS.mainnet.governance['Governance Impl']
			const transaction = await client.getTransaction({ hash: stringAsHexString(serialize(EthereumBytes32, transactionHash)) })
			if (transaction.to !== addressString(CONTRACTS.mainnet.governance['Governance Contract'])) throw new Error('not a transaction to governance contract')
			const { functionName, args } = decodeFunctionData({ abi, data: transaction.input });
			if (functionName !== 'castVote' && functionName !== 'castDelegatedVote') throw new Error(`${ functionName } is not castVote or castDelegatedVote`)
			const functionData = encodeFunctionData({ abi, functionName, args })
			const messageData = transaction.input.slice(functionData.length)
			if (messageData.length === 0) return { type: 'No comment provided' } as const
			const jsonString = decodeAbiParameters([{ name: 'jsonString', type: 'string' }], `0x${ messageData }`)[0]
			try {
				const [contact, message] = TornadoVotingReason.parse(JSON.parse(jsonString))
				return { type: 'Comment provided', comment: { contact, message } } as const
			} catch(error: unknown) {
				return { type: 'Comment provided', comment: { contact: '', message: jsonString } } as const
			}
		} catch(error: unknown) {
			if (error instanceof TransactionNotFoundError) return { type: 'Unable to retrieve comment' } as const
			throw error
		}
	}))
}

export const getExecutedProposals = async (client: ReadClient, latestBlockNumber: bigint): Promise<ExecutedProposals> => {
	const events = ABIS.mainnet.governance['Governance Impl'].filter((x) => x.type === 'event')
	const proposalExecutedEvent = events.find((x) => x.name === 'ProposalExecuted')
	if (proposalExecutedEvent === undefined) throw new Error('no proposal executed events in the abi')
	const lastFinalized = await client.getBlock({ includeTransactions: false, blockTag: 'finalized' })
	const cache = await getCacheExecutedProposals()
	const logs = await binarySearchLogs(client, {
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		event: proposalExecutedEvent,
		fromBlock: cache.latestBlock,
		toBlock: latestBlockNumber
	})
	const parsed = parseEventLogs({ abi: [proposalExecutedEvent], logs })
	const complete = [...cache.cache, ...parsed.map((log) => ({ proposalId: log.args.proposalId, blockNumber: log.blockNumber }))]
	await storeLocalExecutedProposals({ latestBlock: lastFinalized.number, cache: complete.filter((event) => event.blockNumber <= lastFinalized.number) })
	return complete
}

export const getProposalEvents = async (client: ReadClient, latestBlockNumber: bigint): Promise<ProposalEvents> => {
	const events = ABIS.mainnet.governance['Governance Impl'].filter((x) => x.type === 'event')
	const proposalEvent = events.find((x) => x.name === 'ProposalCreated')
	if (proposalEvent === undefined) throw new Error('no voting events in the abi')
	const lastFinalized = await client.getBlock({ includeTransactions: false, blockTag: 'finalized' })
	const cache = await getCacheProposalEvents()
	const logs = await binarySearchLogs(client, {
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		event: proposalEvent,
		fromBlock: cache.latestBlock,
		toBlock: latestBlockNumber
	})
	const parsed = parseEventLogs({ abi: [proposalEvent], logs })
	const complete = [...cache.cache, ...parsed.map((log) => ({
		blockNumber: log.blockNumber,
		description: log.args.description,
		proposalId: log.args.id,
		proposer: EthereumAddress.parse(log.args.proposer),
		target: EthereumAddress.parse(log.args.target),
		startTime: log.args.startTime,
		endTime: log.args.endTime
	}))]
	await storeLocalCacheProposalEvents({ latestBlock: lastFinalized.number, cache: complete.filter((event) => event.blockNumber <= lastFinalized.number) })
	return complete
}

export const governanceCastVote = async (client: WriteClient, proposalId: EthereumQuantity, support: boolean, comment: VoteComment | undefined) => {
	const commentString = comment === undefined ? undefined : JSON.stringify(serialize(TornadoVotingReason, [comment.contact, comment.message] as const))
	const input = encodeFunctionData({
		abi: ABIS.mainnet.governance['Governance Impl'],
		functionName: 'castVote',
		args: [proposalId, support],
	})
	const request = await client.prepareTransactionRequest({
		chain: mainnet,
		data: commentString === undefined ? input : `${ input }${ encodeAbiParameters([{ name: 'jsonString', type: 'string' }], [commentString]).slice(2) }`,
		to: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
	})
	return await client.sendTransaction(request)
}

export const governanceCreateProposal = async (client: WriteClient, target: EthereumAddress, description: string) => {
	const proposalId = await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.governance['Governance Impl'],
		functionName: 'propose',
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		args: [addressString(target), description]
	})
	return EthereumQuantity.parse(proposalId)
}

export const getTornBalance = async(client: ReadClient, account: EthereumAddress) => {
	return await client.readContract({
		abi: ABIS.mainnet.governance['TORN Token'],
		address: addressString(CONTRACTS.mainnet.governance['TORN Token']),
		functionName: 'balanceOf',
		args: [addressString(account)]
	})
}

export const getJoinedProposals = async (client: ReadClient, tovarishUrl: string | undefined): Promise<JoinedProposals> => {
	const latestBlockPromise = client.getBlockNumber()
	const proposalCountPromise = governanceGetProposalCount(client)
	const latestBlock = await latestBlockPromise
	const proposalEventsPromise = getProposalEvents(client, latestBlock)
	const executedProposalsPromise = getExecutedProposals(client, latestBlock)
	const proposalCount = await proposalCountPromise
	const allProposals = await governanceListProposalsAndCache(client, proposalCount)
	const listVotes = await governanceListVotes(client, tovarishUrl, latestBlock, allProposals.finalizedProposals)
	const proposalEvents = await proposalEventsPromise
	const executedProposals = await executedProposalsPromise
	return allProposals.proposals.map((proposal) => ({
		...proposal,
		description: proposalEvents.find((event) => event.proposalId === proposal.proposalId)?.description,
		votes: listVotes.filter((vote) => vote.proposalId === proposal.proposalId),
		executed: executedProposals.find((executed) => executed.proposalId === proposal.proposalId) !== undefined
	}))
}
