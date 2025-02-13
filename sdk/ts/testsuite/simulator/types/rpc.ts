import * as funtypes from 'funtypes'
import { EthereumQuantity } from './wire-types.js'

export type RpcEntry = funtypes.Static<typeof RpcEntry>
export const RpcEntry = funtypes.ReadonlyObject({
	name: funtypes.String,
	chainId: EthereumQuantity,
	httpsRpc: funtypes.String,
})

export type CodeMessageError = funtypes.Static<typeof CodeMessageError>
export const CodeMessageError = funtypes.ReadonlyObject({
	code: funtypes.Number,
	message: funtypes.String,
})
