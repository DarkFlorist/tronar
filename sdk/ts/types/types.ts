import * as funtypes from 'funtypes'
import { EthereumData } from './wire-types.js'
export type HexString = `0x${ string }`

const AddressParser: funtypes.ParsedValue<funtypes.String, bigint>['config'] = {
	parse: value => {
		if (!/^0x([a-fA-F0-9]{40})$/.test(value)) return { success: false, message: `${value} is not a hex string encoded address.` }
		return { success: true, value: BigInt(value) }
	},
	serialize: value => {
		if (typeof value !== 'bigint') return { success: false, message: `${typeof value} is not a bigint.`}
		return { success: true, value: `0x${value.toString(16).padStart(40, '0')}` }
	},
}

export const EthereumAddress = funtypes.String.withParser(AddressParser)
export type EthereumAddress = funtypes.Static<typeof EthereumAddress>

const BigIntParser: funtypes.ParsedValue<funtypes.String, bigint>['config'] = {
	parse: value => {
		if (!/^0x([a-fA-F0-9]{1,64})$/.test(value)) return { success: false, message: `${value} is not a hex string encoded number.` }
		return { success: true, value: BigInt(value) }
	},
	serialize: value => {
		if (typeof value !== 'bigint') return { success: false, message: `${typeof value} is not a bigint.`}
		return { success: true, value: `0x${value.toString(16)}` }
	},
}

export const EthereumQuantity = funtypes.String.withParser(BigIntParser)
export type EthereumQuantity = funtypes.Static<typeof EthereumQuantity>

const Bytes32Parser: funtypes.ParsedValue<funtypes.String, bigint>['config'] = {
	parse: value => {
		if (!/^0x([a-fA-F0-9]{64})$/.test(value)) return { success: false, message: `${value} is not a hex string encoded 32 byte value.` }
		return { success: true, value: BigInt(value) }
	},
	serialize: value => {
		if (typeof value !== 'bigint') return { success: false, message: `${typeof value} is not a bigint.`}
		return { success: true, value: `0x${value.toString(16).padStart(64, '0')}` }
	},
}
export const EthereumBytes32 = funtypes.String.withParser(Bytes32Parser)
export type EthereumBytes32 = funtypes.Static<typeof EthereumBytes32>

export type UnionToIntersection<T> = (T extends unknown ? (k: T) => void : never) extends (k: infer I) => void ? I : never

export const TornadoVotingReason = funtypes.ReadonlyTuple(funtypes.String, funtypes.String)
export type TornadoVotingReason = funtypes.Static<typeof TornadoVotingReason>

export type Proposal = funtypes.Static<typeof Proposal>
export const Proposal = funtypes.ReadonlyObject({
	proposer: EthereumAddress,
	target: EthereumAddress,
	startTime: EthereumQuantity,
	endTime: EthereumQuantity,
	forVotes: EthereumQuantity,
	againstVotes: EthereumQuantity,
	executed: funtypes.Boolean,
	extended: funtypes.Boolean,
})

export type Proposals = funtypes.Static<typeof Proposals>
export const Proposals = funtypes.ReadonlyArray(Proposal)

export type ProposalEvent = funtypes.Static<typeof ProposalEvent>
export const ProposalEvent = funtypes.ReadonlyObject({
    blockNumber: EthereumQuantity,
    description: funtypes.String,
    proposalId: EthereumQuantity,
    proposer: EthereumQuantity,
    target: EthereumQuantity,
    startTime: EthereumQuantity,
    endTime: EthereumQuantity,
})

export type ProposalEvents = funtypes.Static<typeof ProposalEvents>
export const ProposalEvents = funtypes.ReadonlyArray(ProposalEvent)

export type GovernanceVote = funtypes.Static<typeof GovernanceVote>
export const GovernanceVote = funtypes.ReadonlyObject({
	proposalId: EthereumQuantity,
	voter: EthereumAddress,
	support: funtypes.Boolean,
	votes: EthereumQuantity,
	blockNumber: EthereumQuantity,
	transactionHash: EthereumData,
})

export type GovernanceVotes = funtypes.Static<typeof GovernanceVotes>
export const GovernanceVotes = funtypes.ReadonlyArray(GovernanceVote)

export type ProposalsCache = funtypes.Static<typeof ProposalsCache>
export const ProposalsCache = funtypes.ReadonlyObject({
	proposalCount: EthereumQuantity,
	cache: Proposals
})

export type ProposalEventsCache = funtypes.Static<typeof ProposalEventsCache>
export const ProposalEventsCache = funtypes.ReadonlyObject({
	latestBlock: EthereumQuantity,
	cache: ProposalEvents
})

export type GovernanceVotesCache = funtypes.Static<typeof GovernanceVotesCache>
export const GovernanceVotesCache = funtypes.ReadonlyObject({
	latestBlock: EthereumQuantity,
	cache: GovernanceVotes,
})
