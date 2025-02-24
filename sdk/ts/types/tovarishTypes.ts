import * as funtypes from 'funtypes'
import { EthereumAddress, EthereumBytes32 } from './types.js'
import { EthereumData, NonHexBigInt } from '../testsuite/simulator/types/wire-types.js'

export type TovarishQueryInput = funtypes.Static<typeof TovarishQueryInput>
export const TovarishQueryInput = funtypes.Union(
	funtypes.ReadonlyObject({
		type: funtypes.Literal('registry'),
		fromBlock: NonHexBigInt
	}),
	funtypes.ReadonlyObject({
		type: funtypes.Literal('governance'),
		fromBlock: NonHexBigInt
	}),
	funtypes.ReadonlyObject({
		type: funtypes.Literal('deposit'),
		recent: funtypes.Boolean,
		amount: funtypes.Union(funtypes.Literal('0.1'), funtypes.Literal('1'), funtypes.Literal('10'), funtypes.Literal('100')),
		fromBlock: NonHexBigInt,
		currency: funtypes.Literal('eth')
	})
)
export type TovarishQueryOutput = funtypes.Static<typeof TovarishQueryOutput>
export const TovarishQueryOutput = funtypes.Union(
	funtypes.ReadonlyObject({
		events: funtypes.ReadonlyArray(funtypes.Union(
			funtypes.ReadonlyObject({
				blockNumber: NonHexBigInt,
				logIndex: funtypes.Number,
				transactionHash: EthereumBytes32,
				event: funtypes.Literal('ProposalCreated'),
				id: funtypes.Number,
				proposer: EthereumAddress,
				target: EthereumAddress,
				startTime: funtypes.Number,
				endTime: funtypes.Number,
				description: funtypes.String,
			}),
			funtypes.ReadonlyObject({
				blockNumber: NonHexBigInt,
				logIndex: funtypes.Number,
				transactionHash: EthereumBytes32,
				event: funtypes.Literal('Voted'),
				proposalId: funtypes.Number,
				voter: EthereumAddress,
				support: funtypes.Boolean,
				votes: NonHexBigInt,
				from: EthereumAddress,
				input: EthereumData
			}),
			funtypes.ReadonlyObject({
				blockNumber: NonHexBigInt,
				logIndex: funtypes.Number,
				transactionHash: EthereumBytes32,
				event: funtypes.Literal('Delegated'),
				account: EthereumAddress,
				delegateTo: EthereumAddress
			}),
			funtypes.ReadonlyObject({
				blockNumber: NonHexBigInt,
				logIndex: funtypes.Number,
				transactionHash: EthereumBytes32,
				event: funtypes.Literal('Undelegated'),
				account: EthereumAddress,
				delegateFrom: EthereumAddress
			}),
		))
	})
)
