import { createPublicClient, createWalletClient, custom, EIP1193Provider, http, publicActions } from 'viem'
import { mainnet } from 'viem/chains'
import { addressString } from './utils/utils.js'

export const createReadClient = (ethereum: EIP1193Provider | undefined) => {
	if (ethereum === undefined) {
		return createPublicClient({ chain: mainnet, transport: http('https://ethereum.dark.florist', { batch: { wait: 100 } }) })
	}
	return createWalletClient({ chain: mainnet, transport: custom(ethereum) }).extend(publicActions)
}

export const createWriteClient = (ethereum: EIP1193Provider | undefined, accountAddress: bigint) => {
	if (ethereum === undefined) throw new Error('no window.ethereum injected')
	if (accountAddress === undefined) throw new Error('no accountAddress!')
	return createWalletClient({ account: addressString(accountAddress), chain: mainnet, transport: custom(ethereum) }).extend(publicActions)
}

export type WriteClient = ReturnType<typeof createWriteClient>
export type ReadClient = ReturnType<typeof createReadClient> | ReturnType<typeof createWriteClient>
