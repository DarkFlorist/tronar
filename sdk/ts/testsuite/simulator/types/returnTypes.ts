import * as funtypes from 'funtypes'
import { EthGetFeeHistoryResponse, EthGetLogsResponse, EthTransactionReceiptResponse, GetBlockReturn } from './jsonRpcTypes.js'
import { EthereumAddress, EthereumBytes32, EthereumData, EthereumQuantity, EthereumSignedTransactionWithBlockData, NonHexBigInt } from './wire-types.js'

export type NonForwardingRPCRequestSuccessfullReturnValue = funtypes.Static<typeof NonForwardingRPCRequestSuccessfullReturnValue>
export const NonForwardingRPCRequestSuccessfullReturnValue = funtypes.Union(
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getBlockByNumber'), result: GetBlockReturn }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getBlockByHash'), result: GetBlockReturn }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getBalance'), result: EthereumQuantity }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_estimateGas'), result: EthereumQuantity }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getTransactionByHash'), result: funtypes.Union(EthereumSignedTransactionWithBlockData, funtypes.Null) }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getTransactionReceipt'), result: EthTransactionReceiptResponse }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_subscribe'), result: funtypes.String }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_newFilter'), result: funtypes.String }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_unsubscribe'), result: funtypes.Boolean }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_uninstallFilter'), result: funtypes.Boolean }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_chainId'), result: EthereumQuantity }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('net_version'), result: NonHexBigInt }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_blockNumber'), result: EthereumQuantity }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getCode'), result: EthereumData }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('wallet_switchEthereumChain'), result: funtypes.Null }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_accounts'), result: funtypes.ReadonlyArray(EthereumAddress) }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('wallet_getPermissions'), result: funtypes.ReadonlyTuple(funtypes.ReadonlyObject({ eth_accounts: funtypes.ReadonlyObject({}) })) }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_gasPrice'), result: EthereumQuantity }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getTransactionCount'), result: EthereumQuantity }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getLogs'), result: EthGetLogsResponse }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_sendRawTransaction'), result: EthereumBytes32 }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_sendTransaction'), result: EthereumBytes32 }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_call'), result: EthereumData }),
	funtypes.ReadonlyObject({ method: funtypes.Union(funtypes.Literal('personal_sign'), funtypes.Literal('eth_signTypedData_v1'), funtypes.Literal('eth_signTypedData_v2'), funtypes.Literal('eth_signTypedData_v3'), funtypes.Literal('eth_signTypedData_v4'), funtypes.Literal('eth_signTypedData')), result: funtypes.String }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('web3_clientVersion'), result: funtypes.String }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_feeHistory'), result: EthGetFeeHistoryResponse }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getFilterChanges'), result: EthGetLogsResponse }),
	funtypes.ReadonlyObject({ method: funtypes.Literal('eth_getFilterLogs'), result: EthGetLogsResponse }),
)
