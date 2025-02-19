import { useSignal } from '@preact/signals'
import { OptionalSignal, useOptionalSignal } from '../utils/OptionalSignal.js'
import 'viem/window'
import { bytes32String, connectToWallet, checkSummedAddressString, createReadClient, createWriteClient, EthereumAddress, EthereumQuantity, governanceCastVote, governanceCreateProposal, governanceLockWithApproval, governanceUnLockStake, GovernanceVote, WriteClient, getTimestamp, getProposalStatus, getJoinedProposals, getTornBalance, JoinedProposals, JoinedProposal } from 'tronar'
import { formatEther } from 'viem'

export type AccountAddress = `0x${ string }`

interface ConnectWalletButtonProps {
	onAccountChange: (address: EthereumAddress | undefined) => void
	onError: (error: string | undefined) => void
}

interface WalletProps {
	writeClient: OptionalSignal<WriteClient>
}

export const humanReadableDate = (date: Date) => date.toISOString()

export function humanReadableDateFromSeconds(timeInSeconds: bigint) {
	return humanReadableDate(new Date(Number(timeInSeconds) * 1000))
}

export function customFormatEther(value: bigint, maxDecimals: number = 18, rounding: 'floor' | 'ceil' | 'round' = 'round') {
	const power = 10n ** BigInt(18 - maxDecimals)
	const remainder = value % power
	const firstDecimal = remainder / 10n ** BigInt(18 - maxDecimals - 1)
	let b = value - remainder
	if (rounding === 'ceil' || (rounding === 'round' && firstDecimal >= 5)) b += power
	return formatEther(b)
}


const ConnectWalletButton = ({ onAccountChange }: ConnectWalletButtonProps) => {
	const loadingAccount = useSignal<boolean>(false)
	const error = useSignal<string | undefined>(undefined)
	const maybeAccountAddress = useOptionalSignal<EthereumAddress>(undefined)

	const onAccountChangeCallBack = (address: EthereumAddress | undefined) => {
		if (address !== maybeAccountAddress.deepValue) onAccountChange(address)
		loadingAccount.value = false
	}
	const onAccountChangeError = (reason: string) => {
		error.value = reason
		loadingAccount.value = false
	}

	const connect = async () => {
		loadingAccount.value = true
		await connectToWallet(onAccountChangeCallBack, onAccountChangeError)
	}

	if (error.value !== undefined) return <p class = 'paragraph'> { error.value }</p>
	if (loadingAccount.value) return <></>

	return <button class = 'button is-primary' style = 'justify-self: right;' onClick = { connect }>
		Connect wallet
	</button>
}

const ProposalsComponent = ({ writeClient }: WalletProps) => {
	const proposals = useSignal<JoinedProposals>([])
	const timestamp = useSignal<EthereumQuantity>(0n)

	const fetchJoinedProposals = async () => {
		const client = createReadClient(window.ethereum)
		timestamp.value = await getTimestamp(client)
		proposals.value = await getJoinedProposals(client)
	}

	return (
		<div class = 'proposal-container'>
			<button class = 'button' onClick = { fetchJoinedProposals }>
				Get Proposals
			</button>
			{ proposals.value.map((proposal: JoinedProposal) => (
				<div class = 'proposal-card'>
					<div class = 'proposal-header'>
						<h2>Proposal #{ proposal.proposalId }</h2>
					</div>
					<div class = 'proposal-content'>
						<div class = 'proposal-details'>
							<div><strong>Proposer:</strong> { checkSummedAddressString(proposal.proposer) }</div>
							<div><strong>Target:</strong> { checkSummedAddressString(proposal.target) }</div>
							<div><strong>Start Time:</strong> { humanReadableDateFromSeconds(proposal.startTime) }</div>
							<div><strong>End Time:</strong> { humanReadableDateFromSeconds(proposal.endTime) }</div>
							<div><strong>For Votes:</strong> { customFormatEther(proposal.forVotes, 1) }</div>
							<div><strong>Against Votes:</strong> { customFormatEther(proposal.againstVotes, 1) }</div>
							<div><strong>Executed:</strong> { proposal.executed ? 'true' : 'false' }</div>
							<div><strong>Extended:</strong> { proposal.extended ? 'true' : 'false' }</div>
							<div><strong>Description:</strong> { proposal.description }</div>
							<div><strong>Status:</strong> { getProposalStatus(proposal, timestamp.value) }</div>
							<CastVote writeClient = { writeClient } proposalId = { proposal.proposalId } />
						</div>
						<div class = 'vote-section'>
							<div class = 'nested-table'>
								<div class = 'nested-header'>
									<div>Block Number</div>
									<div>Voter</div>
									<div>Support</div>
									<div>Votes</div>
									<div>Contact</div>
									<div>Message</div>
									<div>Transaction Hash</div>
								</div>
								{ proposal.votes.map((vote: GovernanceVote) => (
									<div class = 'nested-row'>
										<div>{ vote.blockNumber }</div>
										<div>{ checkSummedAddressString(vote.voter) }</div>
										<div>{ vote.support ? 'true' : 'false' }</div>
										<div>{ customFormatEther(vote.votes, 1) }</div>
										<div>{ vote.comment ? vote.comment.contact : '-' }</div>
										<div>{ vote.comment ? vote.comment.message : '-' }</div>
										<div>{ bytes32String(vote.transactionHash) }</div>
									</div>
								)) }
							</div>
						</div>
					</div>
				</div>
			)) }
		</div>
	)
}

const Balance = ({ writeClient }: WalletProps) => {
	const balance = useSignal<EthereumQuantity | undefined>(undefined)
	const fetchBalance = async () => {
		if (writeClient.deepValue === undefined) return
		balance.value = await getTornBalance(writeClient.deepValue, EthereumAddress.parse(writeClient.deepValue.account.address))
	}
	return <div class = 'container'>
		<div class = 'element-card'>
			<div class = 'element-header'>
				<h2>Torn balance</h2>
			</div>
			<div class = 'element-content'>
				<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchBalance }>
					Get Balance
				</button>
				<p>Torn Balance: { balance.value !== undefined ? customFormatEther(balance.value, 1): '' }</p>
			</div>
		</div>
	</div>
}

const CreateProposal = ({ writeClient }: WalletProps) => {
	const target = useSignal<string>('')
	const description = useSignal<string>('')

	const createProposal = async () => {
		if (writeClient.deepValue === undefined) return
		const targetAddr = EthereumAddress.safeParse(target.value)
		if (!targetAddr.success) return
		await governanceCreateProposal(writeClient.deepValue, targetAddr.value, description.value)
	}

	return <div class = 'container'>
		<div class = 'element-card'>
			<div class = 'element-header'>
				<h2>Create proposal</h2>
			</div>
			<div class = 'element-content'>
				<div style = 'margin-bottom: 1rem;' class = 'item'>
					<label class = 'label'>Target Address</label>
					<input
						class = 'input'
						type = 'text'
						placeholder = '0x...'
						value = { target.value }
						onInput = { (e) => target.value = (e.target as HTMLInputElement).value }
					/>
				</div>
				<div style = 'margin-bottom: 1rem;' class = 'item'>
					<label class = 'label'>Description</label>
					<textarea
						class = 'textarea'
						placeholder = 'Proposal description'
						value = { description.value }
						onInput = { (e) => description.value = (e.target as HTMLTextAreaElement).value }
					/>
				</div>
				<button class = 'button item' style = 'justify-self: right;' onClick = { createProposal }>
					Create Proposal
				</button>
			</div>
		</div>
	</div>
}

const LockTornWithApproval = ({ writeClient }: WalletProps) => {
	const tornToUse = useSignal<string>('')

	const LockTorn = async () => {
		if (writeClient.deepValue === undefined) return
		const tornBigInt = EthereumQuantity.safeParse(tornToUse.value)
		if (!tornBigInt.success) return
		await governanceLockWithApproval(writeClient.deepValue, tornBigInt.value)
	}

	return <div class = 'container'>
		<div class = 'element-card'>
			<div class = 'element-header'>
				<h2>Lock Torn</h2>
			</div>
			<div class = 'element-content'>
				<label class = 'label' >Torn To use</label>
				<input
					class = 'input'
					type = 'text'
					placeholder = '1234...'
					value = { tornToUse.value }
					onInput = { (e) => tornToUse.value = (e.target as HTMLInputElement).value }
				/>
				<button class = 'button item' style = 'justify-self: right;' onClick = { LockTorn }>
					Lock Torn
				</button>
			</div>
		</div>
	</div>
}

const UnLockStake = ({ writeClient }: WalletProps) => {
	const tornToUse = useSignal<string>('0')

	const LockTorn = async () => {
		if (writeClient.deepValue === undefined) return
		const tornBigInt = EthereumQuantity.safeParse(tornToUse.value)
		if (!tornBigInt.success) return
		await governanceUnLockStake(writeClient.deepValue, tornBigInt.value)
	}

	return <div class = 'container'>
		<div class = 'element-card'>
			<div class = 'element-header'>
				<h2>Unlock Torn</h2>
			</div>
			<div class = 'element-content'>
				<label class = 'label' >Unlock torn</label>
				<input
					class = 'input'
					type = 'text'
					placeholder = '1234...'
					value = { tornToUse.value }
					onInput = { (e) => tornToUse.value = (e.target as HTMLInputElement).value }
				/>
				<button class = 'button item' style = 'justify-self: right;' onClick = { LockTorn }>
					UnLock Torn
				</button>
			</div>
		</div>
	</div>
}

interface CastVoteProps {
	writeClient: OptionalSignal<WriteClient>
	proposalId: EthereumQuantity
}

const CastVote = ({ writeClient, proposalId }: CastVoteProps) => {
	const support = useSignal<boolean>(false)
	const contact = useSignal<string>('')
	const message = useSignal<string>('')

	const vote = async () => {
		if (writeClient.deepValue === undefined) return
		const contactS = contact.value
		const messageS = message.value
		await governanceCastVote(writeClient.deepValue, proposalId, support.value, contactS.length || messageS.length ? { contact: contactS, message: messageS } : undefined)
	}

	return <div class = 'container'>
		<div class = 'element-card'>
			<div class = 'element-header'>
				<h2>Cast vote</h2>
			</div>
			<div class = 'element-content'>
				<div style = 'margin-bottom: 1rem;' class = 'item'>
					<label class = 'label'>Support</label>
					<select
						class = 'select'
						value = { support.value ? 'yes' : 'no' }
						onInput = { (e) => support.value = (e.target as HTMLSelectElement).value === 'yes' }
					>
						<option value = 'yes'>Yes</option>
						<option value = 'no'>No</option>
					</select>
				</div>
				<div style = 'margin-bottom: 1rem;' class = 'item'>
					<label class = 'label'>Contact</label>
					<input
						class = 'input'
						type = 'text'
						placeholder = ''
						value = { contact.value }
						onInput = { (e) => contact.value = (e.target as HTMLInputElement).value }
					/>
				</div>
				<div style = 'margin-bottom: 1rem;' class = 'item'>
					<label class = 'label'>Message</label>
					<input
						class = 'input'
						type = 'text'
						placeholder = ''
						value = { message.value }
						onInput = { (e) => message.value = (e.target as HTMLInputElement).value }
					/>
				</div>
				<button class = 'button item' style = 'align-self: auto' onClick = { vote }>
					Vote
				</button>
			</div>
		</div>
	</div>
}

export function App() {
	const writeClient = useOptionalSignal<WriteClient>(undefined)
	const handleAccountChange = (address: EthereumAddress | undefined) => {
		if (address !== undefined) {
			writeClient.deepValue = createWriteClient(window.ethereum, address)
		} else {
			writeClient.deepValue = undefined
		}
		console.log('Account changed:', address)
	}

	const handleError = (error: string | undefined) => {
		console.error('Error:', error)
	}

	return <main style = 'overflow: auto;'>
		<p>{ writeClient.deepValue?.account.address } </p>
		<ConnectWalletButton onAccountChange = { handleAccountChange } onError = { handleError } />
		<Balance writeClient = { writeClient }/>
		<ProposalsComponent writeClient = { writeClient }/>
		<LockTornWithApproval writeClient = { writeClient }/>
		<UnLockStake writeClient = { writeClient }/>
		<CreateProposal writeClient = { writeClient }/>
	</main>
}
