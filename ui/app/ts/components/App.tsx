import { useSignal } from '@preact/signals'
import { useOptionalSignal } from '../utils/OptionalSignal.js'
import 'viem/window'
import { connectToWallet } from '@tronar/components/connect.js'
import { EthereumQuantity, GovernanceVote, GovernanceVotes, Proposal, ProposalEvent, ProposalEvents, Proposals } from '@tronar/types/types.js'
import { getProposalEvents, getProposals, getGovernanceListVotes, getTornBalance, governanceCreateProposal, governanceLockWithApproval, governanceUnLockStake, governanceCastVote } from '@tronar/governance.js'
import { createReadClient } from '@tronar/wallet.js'

export type AccountAddress = `0x${ string }`

interface WalletComponentProps {
	onAccountChange: (address: AccountAddress | undefined) => void
	onError: (error: string | undefined) => void
}

const WalletComponent = ({ onAccountChange }: WalletComponentProps) => {
	const loadingAccount = useSignal<boolean>(false)
	const error = useSignal<string | undefined>(undefined)
	const maybeAccountAddress = useOptionalSignal<AccountAddress>(undefined)

	const onAccountChangeCallBack = (address: AccountAddress | undefined) => {
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

	return maybeAccountAddress.value !== undefined ? (
		<p style = 'color: gray; justify-self: right;'>{ `Connected with ${ maybeAccountAddress.value }` }</p>
	) : (
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { connect }>
			{ `Connect wallet` }
		</button>
	)
}

const ProposalEvents = () => {
	const proposalEvents = useSignal<ProposalEvents>(false)

	const fetchProposalEvents = async () => {
		const client = createReadClient(window.ethereum)
		const blockNum = client.getBlockNumber()
		proposalEvents.value = await getProposalEvents(client, blockNum)
	}

	return <div>
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchProposalEvents }>
			{ `getProposalEvents` }
		</button>
		<title>ProposalEvents</title>
		<table>
			<tr>
				<th>Block Number</th>
				<th>Proposal ID</th>
				<th>Proposer</th>
				<th>Description</th>
				<th>Start Time</th>
				<th>End Time</th>
				<th>Target</th>
			</tr>
			{ proposalEvents.value.map((proposal: ProposalEvent) => <tr>
				<td>{ proposal.blockNumber }</td>
				<td>{ proposal.proposalId }</td>
				<td>{ proposal.proposer }</td>
				<td>{ proposal.description }</td>
				<td>{ proposal.startTime }</td>
				<td>{ proposal.endTime }</td>
				<td>{ proposal.target }</td>
			</tr>) }
		</table>
	</div>
}

const Proposals = () => {
	const proposals = useSignal<Proposals>(false)

	const fetchProposalEvents = async () => {
		const client = createReadClient(window.ethereum)
		const blockNum = client.getBlockNumber()
		proposals.value = await getProposals(client, blockNum)
	}

	return <div>
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchProposalEvents }>
			{ `getProposals` }
		</button>
		<title>Proposals</title>
		<table>
			<tr>
				<th>Proposer</th>
				<th>Target</th>
				<th>Start Time</th>
				<th>End Time</th>
				<th>For Votes</th>
				<th>Against Votes</th>
				<th>Executed</th>
				<th>Extended</th>
			</tr>
			{ proposals.value.map((proposal: Proposal) => <tr>
				<td>{ proposal.proposer }</td>
				<td>{ proposal.target }</td>
				<td>{ proposal.startTime }</td>
				<td>{ proposal.endTime }</td>
				<td>{ proposal.forVotes }</td>
				<td>{ proposal.againstVotes }</td>
				<td>{ proposal.executed }</td>
				<td>{ proposal.extended }</td>
			</tr>) }
		</table>
	</div>
}

const Votes = () => {
	const votes = useSignal<GovernanceVotes>(false)
	const fetchProposalEvents = async () => {
		const client = createReadClient(window.ethereum)
		const blockNum = client.getBlockNumber()
		votes.value = await getGovernanceListVotes(client, blockNum)
	}
	return <div>
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchProposalEvents }>
			{ `getGovernanceListVotes` }
		</button>
		<title>Votes</title>
		<table>
			<tr>
				<th>Block Number</th>
				<th>Proposal ID</th>
				<th>Voter</th>
				<th>Support</th>
				<th>Votes</th>
				<th>Transaction Hash</th>
			</tr>
			{ votes.value.map((vote: GovernanceVote) => <tr>
				<td>{ vote.blockNumber }</td>
				<td>{ vote.proposalId }</td>
				<td>{ vote.voter }</td>
				<td>{ vote.support }</td>
				<td>{ vote.votes }</td>
				<td>{ vote.transactionHash }</td>
			</tr>) }
		</table>
	</div>
}

const Balance = () => {
	const balance = useSignal<EthereumQuantity>(false)
	const fetchBalance = async () => {
		const client = createReadClient(window.ethereum)
		balance.value = await getTornBalance(client, client.account)
	}
	return <div>
		<button class = 'button is-primary' style = 'justify-self: right;' onClick = { fetchBalance }>
			{ `getGovernanceListVotes` }
		</button>
		<title>Torn Balance</title>
		<table>
			<tr>
				<th>Balance</th>
			</tr>
			<tr>
				<td>{ Balance }</td>
			</tr>
		</table>
	</div>
}

const CreateProposal = () => {
	const target = useSignal<EthereumQuantity>('')
	const description = useSignal<string>('')

	const createProposal = async () => {
		const client = createReadClient(window.ethereum)
		await governanceCreateProposal(client, target.value, description.value)
	}

	return <div>
		<title>Create proposal</title>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label' >Target Address</label>
			<input
				class = 'input'
				type = 'text'
				placeholder = '0x...'
				value = { target.value }
				onInput = { (e) => target.value = (e.target as HTMLInputElement).value }
			/>
		</div>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label'>Description</label>
			<textarea
				class = 'textarea'
				placeholder = 'Proposal description'
				value = { description.value }
				onInput = { (e) => description.value = (e.target as HTMLTextAreaElement).value }
			/>
		</div>
		<button
			class = 'button is-primary'
			style = 'justify-self: right;'
			onClick = { createProposal }
		>
			{ `Create Proposal` }
		</button>
	</div>
}

const LockTornWithApproval = () => {
	const tornToUse = useSignal<EthereumQuantity>(0n)

	const LockTorn = async () => {
		const client = createReadClient(window.ethereum)
		await governanceLockWithApproval(client, tornToUse)
	}

	return <div>
		<title>Lock Torn</title>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label' >Torn To use</label>
			<input
				class = 'input'
				type = 'text'
				placeholder = '0x...'
				value = { tornToUse.value }
				onInput = { (e) => tornToUse.value = (e.target as HTMLInputElement).value }
			/>
		</div>
		<button
			class = 'button is-primary'
			style = 'justify-self: right;'
			onClick = { LockTorn }
		>
			{ `Lock Torn` }
		</button>
	</div>
}

const UnLockStake = () => {
	const tornToUse = useSignal<EthereumQuantity>(0n)

	const LockTorn = async () => {
		const client = createReadClient(window.ethereum)
		await governanceUnLockStake(client, tornToUse)
	}

	return <div>
		<title>Unlock Torn</title>
		<div style = 'margin-bottom: 1rem;'>
			<label class = 'label' >Unlock torn</label>
			<input
				class = 'input'
				type = 'text'
				placeholder = '0x...'
				value = { tornToUse.value }
				onInput = { (e) => tornToUse.value = (e.target as HTMLInputElement).value }
			/>
		</div>
		<button
			class = 'button is-primary'
			style = 'justify-self: right;'
			onClick = { LockTorn }
		>
			{ `UnLock Torn` }
		</button>
	</div>
}


const CastVote = () => {
    const proposalId = useSignal<EthereumQuantity>(0n)
    const support = useSignal<boolean>(false)

    const vote = async () => {
        const client = createReadClient(window.ethereum)
        await governanceCastVote(client, proposalId, support)
    }

    return <div>
        <title>Cast vote</title>
        <div style="margin-bottom: 1rem;">
            <label class="label">proposalId</label>
            <input
                class="input"
                type="text"
                placeholder="1."
                value={proposalId.value}
                onInput={(e) => proposalId.value = (e.target as HTMLInputElement).value}
            />
        </div>
        <div style="margin-bottom: 1rem;">
            <label class="label">Support</label>
            <select
                class="select"
                value={support.value ? "yes" : "no"}
                onInput={(e) => support.value = (e.target as HTMLSelectElement).value === "yes"}
            >
                <option value="yes">Yes</option>
                <option value="no">No</option>
            </select>
        </div>
        <button
            class="button is-primary"
            style="justify-self: right;"
            onClick={vote}
        >
            {`Vote`}
        </button>
    </div>
}

export function App() {
	const handleAccountChange = (address: AccountAddress | undefined) => {
		console.log('Account changed:', address)
	}

	const handleError = (error: string | undefined) => {
		console.error('Error:', error)
	}

	return <main style = 'overflow: auto;'>
		<WalletComponent onAccountChange = { handleAccountChange } onError = { handleError } />
		<ProposalEvents/>
		<Proposals/>
		<Votes/>
		<LockTornWithApproval/>
		<UnLockStake/>
		<CreateProposal/>
		<CastVote/>
	</main>
}
