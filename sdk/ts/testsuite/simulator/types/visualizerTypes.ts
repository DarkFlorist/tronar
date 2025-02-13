
import * as funtypes from 'funtypes'
import { EthereumAddress, EthereumQuantity, EthereumSendableSignedTransaction, EthereumTimestamp } from './wire-types.js'
import { SignMessageParams } from './jsonRpcSigningTypes.js'
import { EthSimulateV1CallResult, StateOverrides } from './ethSimulateTypes.js'

export type SimulatedTransaction = funtypes.Static<typeof SimulatedTransaction>
export const SimulatedTransaction = funtypes.ReadonlyObject({
	realizedGasPrice: EthereumQuantity,
	preSimulationTransaction: EthereumSendableSignedTransaction,
	ethSimulateV1CallResult: EthSimulateV1CallResult,
})

export type EstimateGasError = funtypes.Static<typeof EstimateGasError>
export const EstimateGasError = funtypes.ReadonlyObject({
	error: funtypes.ReadonlyObject({
		code: funtypes.Number,
		message: funtypes.String,
		data: funtypes.String
	})
})

export type SignedMessageTransaction = funtypes.Static<typeof SignedMessageTransaction>
export const SignedMessageTransaction = funtypes.ReadonlyObject({
	created: EthereumTimestamp,
	fakeSignedFor: EthereumAddress,
	originalRequestParameters: SignMessageParams,
	simulationMode: funtypes.Boolean,
	messageIdentifier: EthereumQuantity,
})

export type SimulationStateInputBlock = funtypes.Static<typeof SimulationStateInputBlock>
export const SimulationStateInputBlock = funtypes.ReadonlyObject({
	stateOverrides: StateOverrides,
	transactions: funtypes.ReadonlyArray(EthereumSendableSignedTransaction),
	signedMessages: funtypes.ReadonlyArray(SignedMessageTransaction),
	timeIncreaseDelta: EthereumQuantity,
})

export type SimulationStateInput = funtypes.Static<typeof SimulationStateInput>
export const SimulationStateInput = funtypes.ReadonlyObject({
	blocks: funtypes.ReadonlyArray(SimulationStateInputBlock)
})

export type SimulationStateBlock = funtypes.Static<typeof SimulationStateBlock>
export const SimulationStateBlock = funtypes.ReadonlyObject({
	stateOverrides: StateOverrides,
	simulatedTransactions: funtypes.ReadonlyArray(SimulatedTransaction),
	signedMessages: funtypes.ReadonlyArray(SignedMessageTransaction),
	timeIncreaseDelta: EthereumQuantity
})

export type SimulationState = funtypes.Static<typeof SimulationState>
export const SimulationState = funtypes.ReadonlyObject({
	blocks: funtypes.ReadonlyArray(SimulationStateBlock),
	blockNumber: EthereumQuantity,
	blockTimestamp: EthereumTimestamp,
	baseFeePerGas: EthereumQuantity,
	simulationConductedTimestamp: EthereumTimestamp,
})

export type SimulationUpdatingState = funtypes.Static<typeof SimulationUpdatingState>
export const SimulationUpdatingState = funtypes.Union(funtypes.Literal('updating'), funtypes.Literal('done'), funtypes.Literal('failed'))

export type SimulationResultState = funtypes.Static<typeof SimulationResultState>
export const SimulationResultState = funtypes.Union(funtypes.Literal('done'), funtypes.Literal('invalid'), funtypes.Literal('corrupted'))

export type NamedTokenId = funtypes.Static<typeof NamedTokenId>
export const NamedTokenId = funtypes.ReadonlyObject({
	tokenAddress: EthereumAddress,
	tokenId: EthereumQuantity,
	tokenIdName: funtypes.String
})
