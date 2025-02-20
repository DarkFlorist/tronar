import { AbiEvent, BlockNumber, BlockTag, decodeAbiParameters, decodeFunctionData, encodeAbiParameters, encodeFunctionData, GetLogsParameters, GetLogsReturnType, parseEventLogs, TimeoutError, TransactionNotFoundError } from 'viem'
import { mainnet } from 'viem/chains'
import { EthereumAddress, EthereumBytes32, EthereumQuantity, ExecutedProposals, JoinedProposals, Proposal, ProposalEvents, TornadoVotingReason, VoteComment, VoteCommentOrMissing } from '../types/types.js'
import { ABIS } from '../abi/abis.js'
import { addressString, bigintToNumber, createRange, serialize, stringAsHexString } from '../utils/utils.js'
import { CONTRACTS, EXECUTION_DELAY, EXECUTION_EXPIRATION, QUORUM_VOTES, TORNADO_GOVERNANCE_VOTING_DELAY } from '../utils/constants.js'
import { ReadClient, WriteClient } from '../utils/wallet.js'
import { getCacheExecutedProposals, getCacheGovernanceListVotes, getCacheProposalEvents, getCacheProposals, storeLocalCacheGovernanceListVotes, storeLocalCacheProposalEvents, storeLocalCacheProposals, storeLocalExecutedProposals } from '../utils/logCache.js'
import { JsonRpcResponseError } from '../testsuite/simulator/utils/errors.js'
import { bigIntMax } from '../utils/bigint.js'

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

export const approveTorn = async (client: WriteClient, spender: EthereumAddress, amount: EthereumQuantity) => {
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.governance['TORN Token'],
		functionName: 'approve',
		address: addressString(CONTRACTS.mainnet.governance['TORN Token']),
		args: [addressString(spender), amount]
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

export const governanceListProposals = async (client: ReadClient, proposalCount: bigint) => {
	if (proposalCount === 0n) return []
	const lastFinalized = await client.getBlock({ includeTransactions: false, blockTag: 'finalized' })
	const cache = await getCacheProposals()
	const proposals = (createRange(Number(cache.proposalCount), Number(proposalCount))).map((x) => BigInt(x))
	const complete =  [...cache.cache, ...await Promise.all(proposals.map((proposal) => getProposal(client, proposal)))]

	const latestFinalizedTimeStamp = lastFinalized.timestamp
	const finalizedProposals = complete.filter((event) => event.startTime - TORNADO_GOVERNANCE_VOTING_DELAY <= latestFinalizedTimeStamp)
	await storeLocalCacheProposals({ proposalCount: bigIntMax(finalizedProposals.map((proposal) => proposal.proposalId)), cache: finalizedProposals })
	return complete
}

export const governanceListVotes = async (client: ReadClient, latestBlockNumber: bigint) => {
	const events = ABIS.mainnet.governance['Governance Impl'].filter((x) => x.type === 'event')
	const votedEvent = events.find((x) => x.name === 'Voted')
	if (votedEvent === undefined) throw new Error('no voting events in the abi')
	const lastFinalized = await client.getBlock({ includeTransactions: false, blockTag: 'finalized' })
	const cache = await getCacheGovernanceListVotes()
	const newestBlockN = (await client.getBlock()).number
	if (newestBlockN !== latestBlockNumber) throw new Error(`block mismatch ${newestBlockN} vs ${latestBlockNumber}`)
	const logs = await binarySearchLogs(client, {
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		event: votedEvent,
		args: { },
		fromBlock: cache.latestBlock,
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
	const complete = [...cache.cache, ...withReasons]
	await storeLocalCacheGovernanceListVotes({ latestBlock: lastFinalized.number, cache: complete.filter((event) => event.blockNumber <= lastFinalized.number) })
	return complete
}

export const governanceListVotesForId = async (client: ReadClient, latestBlockNumber: bigint, proposalId: EthereumQuantity) => {
	return (await governanceListVotes(client, latestBlockNumber)).filter((log) => log.proposalId === proposalId)
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

export const getJoinedProposals = async (client: ReadClient): Promise<JoinedProposals> => {
	const latestBlockPromise = client.getBlockNumber()
	const proposalCountPromise = governanceGetProposalCount(client)
	const latestBlock = await latestBlockPromise
	const proposalEventsPromise = getProposalEvents(client, latestBlock)
	const listVotesPromise = governanceListVotes(client, latestBlock)
	const executedProposalsPromise = getExecutedProposals(client, latestBlock)
	const proposalCount = await proposalCountPromise
	const allProposalsPromise = governanceListProposals(client, proposalCount)

	const allProposals = await allProposalsPromise
	const proposalEvents = await proposalEventsPromise
	const listVotes = await listVotesPromise
	const executedProposals = await executedProposalsPromise
	return allProposals.map((proposal) => ({
		...proposal,
		description: proposalEvents.find((event) => event.proposalId === proposal.proposalId)?.description,
		votes: listVotes.filter((vote) => vote.proposalId === proposal.proposalId),
		executed: executedProposals.find((executed) => executed.proposalId === proposal.proposalId) !== undefined
	}))
}
