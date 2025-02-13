import { createPublicClient, createWalletClient, custom, EIP1193Provider, http, publicActions } from 'viem'
import { mainnet } from 'viem/chains'
import { addressString } from './utils.js'
import { EthereumAddress } from '../types/types.js'
import 'viem/window'

const DEFAULT_HTTP = 'https://ethereum.dark.florist'

export const createReadClient = (ethereum: EIP1193Provider | undefined, cacheTime: number = 10_000) => {
	if (ethereum === undefined) return createPublicClient({ chain: mainnet, transport: http(DEFAULT_HTTP, { batch: { wait: 100 } }) })
	return createWalletClient({ chain: mainnet, transport: custom(ethereum), cacheTime }).extend(publicActions)
}

export const createWriteClient = (ethereum: EIP1193Provider | undefined, accountAddress: bigint, cacheTime: number = 10_000) => {
	if (ethereum === undefined) throw new Error('no window.ethereum injected')
	if (accountAddress === undefined) throw new Error('no accountAddress!')
	return createWalletClient({ account: addressString(accountAddress), chain: mainnet, transport: custom(ethereum), cacheTime: cacheTime }).extend(publicActions)
}

export type WriteClient = ReturnType<typeof createWriteClient>
export type ReadClient = ReturnType<typeof createReadClient> | ReturnType<typeof createWriteClient>

export const requestAccounts = async () => {
	if (window.ethereum === undefined) throw new Error('no window.ethereum injected')
	const reply = await window.ethereum.request({ method: 'eth_requestAccounts', params: undefined })
	return reply[0]
}

export const getAccounts = async () => {
	if (window.ethereum === undefined) throw new Error('no window.ethereum injected')
	const reply = await window.ethereum.request({ method: 'eth_accounts', params: undefined })
	return reply[0]
}

export const connectToWallet = async (onAccountChange: (address: EthereumAddress | undefined) => void, onAccountChangeError: (error: string) => void, promptUserIfNeeded: boolean = true) => {
	if (window.ethereum === undefined) return onAccountChangeError('no window.ethereum detected')
	window.ethereum.on('accountsChanged', (accounts) => { onAccountChange?.(EthereumAddress.parse(accounts[0])) })
	window.ethereum.on('chainChanged', async () => { console.log('chain changed!') })
	const fetchAccount = async () => {
		const fetchedAccount = await getAccounts()
		if (fetchedAccount === undefined && promptUserIfNeeded) return await requestAccounts()
		return fetchedAccount
	}
	const fetchedAccount = await fetchAccount()
	if (fetchedAccount) {
		onAccountChange?.(EthereumAddress.parse(fetchedAccount))
	} else {
		onAccountChange(undefined)
	}
}
