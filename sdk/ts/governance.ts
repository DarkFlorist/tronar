import { decodeAbiParameters, decodeFunctionData, encodeFunctionData } from 'viem'
import { mainnet } from 'viem/chains'
import { EthereumAddress, EthereumBytes32, EthereumQuantity, TornadoVotingReason } from './types/types.js'
import { ABIS } from './abi/abis.js'
import { addressString, bigintToNumber, serialize, stringAsHexString } from './utils/utils.js'
import { CONTRACTS } from './utils/constants.js'
import { ReadClient, WriteClient } from './wallet.js'
import { EthereumData } from './tests/testsuite/wire-types.js'

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

type Proposal = {
	// Creator of the proposal
	proposer: EthereumAddress
	// target addresses for the call to be made
	target: EthereumAddress
	// The block at which voting begins
	startTime: EthereumQuantity
	// The block at which voting ends: votes must be cast prior to this block
	endTime: EthereumQuantity
	// Current number of votes in favor of this proposal
	forVotes: EthereumQuantity
	// Current number of votes in opposition to this proposal
	againstVotes: EthereumQuantity
	// Flag marking whether the proposal has been executed
	executed: boolean
	// Flag marking whether the proposal voting time has been extended
	// Voting time can be extended once, if the proposal outcome has changed during CLOSING_PERIOD
	extended: boolean
}

export const getProposal = async (client: ReadClient, proposalId: EthereumQuantity): Promise<Proposal> => {
	const returnValue = await client.readContract({
		abi: ABIS.mainnet.governance['Governance Impl'],
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		functionName: 'proposals',
		args: [proposalId]
	})

	if (returnValue[0] === undefined ||
		returnValue[1] === undefined ||
		returnValue[2] === undefined ||
		returnValue[3] === undefined ||
		returnValue[4] === undefined ||
		returnValue[5] === undefined ||
		returnValue[6] === undefined ||
		returnValue[7] === undefined
	) throw new Error('malformed output')
	return {
		proposer: EthereumAddress.parse(returnValue[0]),
		target: EthereumAddress.parse(returnValue[1]),
		startTime: returnValue[2],
		endTime: returnValue[3],
		forVotes: returnValue[4],
		againstVotes: returnValue[5],
		executed: returnValue[6],
		extended: returnValue[7]
	}
}

export const governanceListProposals = async (client: ReadClient) => {
	const proposalCount = await governanceGetProposalCount(client)
	if (proposalCount === 0n) return []
	const proposals = Array.from(Array(proposalCount).keys()).map((x) => BigInt(x))
	return await Promise.all(proposals.map((proposal) => getProposal(client, proposal)))
}



export const governanceListVotes = async (client: ReadClient, _proposalId: EthereumQuantity) => {
	const events = ABIS.mainnet.governance['Governance Impl'].filter((x) => x.type === 'event')
	const votedEvent = events.find((x) => x.name === 'Voted')
	if (votedEvent === undefined) throw new Error('no voting events in the abi')

	const logs = await client.getLogs({
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		event: votedEvent,
		args: { },
		fromBlock: 20953618n, //TODO, add cache
		toBlock: 'latest'
	})
	console.log('logs')
	return logs.map((log) => {
		console.log(log)
		if (log.args.proposalId === undefined || log.args.voter === undefined || log.args.support === undefined || log.args.votes === undefined) throw new Error('args was undefined')
		return {
			voterAddress: EthereumAddress.parse(log.address),
			proposalId: log.args.proposalId,
			voter: EthereumAddress.parse(log.args.voter),
			support: log.args.support,
			votes: log.args.votes,
			blockNumber: log.blockNumber,
			transactionHash: EthereumData.parse(log.transactionHash)
		}
	})
}

export const getVotingReasons = async (client: ReadClient, transactionHashes: EthereumBytes32[]) => {
	return await Promise.all(transactionHashes.map(async (transactionHash) => {
		const abi = ABIS.mainnet.governance['Governance Impl']
		const transaction = await client.getTransaction({ hash: stringAsHexString(serialize(EthereumBytes32, transactionHash)) })
		console.log('got tx')
		console.log(transaction)
		if (transaction.to !== addressString(CONTRACTS.mainnet.governance['Governance Contract'])) throw new Error('not a transaction to governance contract')
		const { functionName, args } = decodeFunctionData({ abi, data: transaction.input });
		if (functionName !== 'castVote' && functionName !== 'castDelegatedVote') throw new Error(`${ functionName } is not castVote or castDelegatedVote`)
		const functionData = encodeFunctionData({ abi, functionName, args })
		console.log('encoed')
		console.log(transaction.input)
		const jsonString = decodeAbiParameters([{ name: 'jsonString', type: 'string' }], `0x${ transaction.input.slice(functionData.length) }`)[0]
		console.log(jsonString)
		const [contact, message] = TornadoVotingReason.parse(JSON.parse(jsonString))
		return { contact, message }
	}))
}

export const getProposalEvents = async (client: ReadClient) => {
	const events = ABIS.mainnet.governance['Governance Impl'].filter((x) => x.type === 'event')
	const votedEvent = events.find((x) => x.name === 'ProposalCreated')
	if (votedEvent === undefined) throw new Error('no voting events in the abi')
	const logs = await client.getLogs({
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		event: votedEvent,
		fromBlock: 20953618n, //TODO, add cache
		toBlock: 'latest'
	})
	return logs.map((log) => {
		if (log.args.description === undefined ||
			log.args.target === undefined ||
			log.args.startTime === undefined ||
			log.args.endTime === undefined ||
			log.args.id === undefined
		) throw new Error('args was undefined')
		return {
			blockNumber: log.blockNumber,
			description: log.args.description,
			proposalId: log.args.id,
			proposer: EthereumAddress.parse(log.args.proposer),
			target: EthereumAddress.parse(log.args.target),
			startTime: log.args.startTime,
			endTime: log.args.endTime,
		}
	})
}

export const governanceCastVote = async (client: WriteClient, proposalId: EthereumQuantity, support: boolean) => {
	return await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.governance['Governance Impl'],
		functionName: 'castVote',
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		args: [proposalId, support]
	})
}

export const governanceCreateProposal = async (client: WriteClient, params: { target: EthereumAddress, description: string }) => {
	const proposalId = await client.writeContract({
		chain: mainnet,
		abi: ABIS.mainnet.governance['Governance Impl'],
		functionName: 'propose',
		address: addressString(CONTRACTS.mainnet.governance['Governance Contract']),
		args: [addressString(params.target), params.description]
	})
	return EthereumQuantity.parse(proposalId)
}

export const getTornBalance = async(client: WriteClient, account: EthereumAddress) => {
	return await client.readContract({
		abi: ABIS.mainnet.governance['TORN Token'],
		address: addressString(CONTRACTS.mainnet.governance['TORN Token']),
		functionName: 'balanceOf',
		args: [addressString(account)]
	})
}
