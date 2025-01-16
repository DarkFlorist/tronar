
import { EthereumData } from './wire-types.js'

/*
pragma solidity ^0.8.18;

contract ecRecoverOverride {
	mapping(bytes32 => address) overrideToAddress;
	fallback (bytes calldata input) external returns (bytes memory) {
		(bytes32 hash, uint8 v, bytes32 r, bytes32 s) = abi.decode(input, (bytes32, uint8, bytes32, bytes32));
		address overridedAddress = overrideToAddress[keccak256(abi.encode(hash, v, r, s))];
		if (overridedAddress === address(0x0)) {
			(bool success, bytes memory data) = address(0x0000000000000000000000000000000000123456).call{gas: 10000}(input);
			require(success, 'failed to call moved ecrecover at address 0x0000000000000000000000000000000000123456');
			return data;
		} else {
			return abi.encode(overridedAddress);
		}
	}
}
*/

export const getEcRecoverOverride = () => {
	return EthereumData.parse('0x608060405234801561001057600080fd5b506000366060600080600080868681019061002b9190610238565b935093509350935060008060008686868660405160200161004f94939291906102bd565b60405160208183030381529060405280519060200120815260200190815260200160002060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610191576000806212345673ffffffffffffffffffffffffffffffffffffffff166127108b8b6040516100fa929190610341565b60006040518083038160008787f1925050503d8060008114610138576040519150601f19603f3d011682016040523d82523d6000602084013e61013d565b606091505b509150915081610182576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161017990610403565b60405180910390fd5b809750505050505050506101b9565b806040516020016101a29190610464565b604051602081830303815290604052955050505050505b915050805190602001f35b600080fd5b6000819050919050565b6101dc816101c9565b81146101e757600080fd5b50565b6000813590506101f9816101d3565b92915050565b600060ff82169050919050565b610215816101ff565b811461022057600080fd5b50565b6000813590506102328161020c565b92915050565b60008060008060808587031215610252576102516101c4565b5b6000610260878288016101ea565b945050602061027187828801610223565b9350506040610282878288016101ea565b9250506060610293878288016101ea565b91505092959194509250565b6102a8816101c9565b82525050565b6102b7816101ff565b82525050565b60006080820190506102d2600083018761029f565b6102df60208301866102ae565b6102ec604083018561029f565b6102f9606083018461029f565b95945050505050565b600081905092915050565b82818337600083830152505050565b60006103288385610302565b935061033583858461030d565b82840190509392505050565b600061034e82848661031c565b91508190509392505050565b600082825260208201905092915050565b7f6661696c656420746f2063616c6c206d6f7665642065637265636f766572206160008201527f742061646472657373203078303030303030303030303030303030303030303060208201527f3030303030303030303030303030313233343536000000000000000000000000604082015250565b60006103ed60548361035a565b91506103f88261036b565b606082019050919050565b6000602082019050818103600083015261041c816103e0565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061044e82610423565b9050919050565b61045e81610443565b82525050565b60006020820190506104796000830184610455565b9291505056fea26469706673582212207ddee236692b0fb014c4a668a714cba393524150b3782202194780d8b923261464736f6c63430008120033')
}

/*
pragma solidity ^0.8.18;

contract timeLockMulticall {
    event ExecuteTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature, bytes data, uint eta);

    function executeTransactions(address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory datas, uint eta) public payable {
        for (uint i = 0; i < targets.length; i++) {
            this.executeTransaction(targets[i], values[i], signatures[i], datas[i], eta);
        }
    }

    function executeTransaction(address target, uint value, string memory signature, bytes memory data, uint eta) public payable returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        bytes memory callData;
        if (bytes(signature).length === 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }

        // solium-disable-next-line security/no-call-value
        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        require(success, "Timelock::executeTransaction: Transaction execution reverted.");

        emit ExecuteTransaction(txHash, target, value, signature, data, eta);

        return returnData;
    }
}
*/

export const getCompoundGovernanceTimeLockMulticall = () => {
	return EthereumData.parse('0x6080604052600436106100295760003560e01c80630825f38f1461002e578063951c81db1461005e575b600080fd5b610048600480360381019061004391906105ab565b61007a565b60405161005591906106dd565b60405180910390f35b61007860048036038101906100739190610a4c565b610203565b005b606060008686868686604051602001610097959493929190610baa565b604051602081830303815290604052805190602001209050606060008651036100c2578490506100ee565b8580519060200120856040516020016100dc929190610c94565b60405160208183030381529060405290505b6000808973ffffffffffffffffffffffffffffffffffffffff1689846040516101179190610cbc565b60006040518083038185875af1925050503d8060008114610154576040519150601f19603f3d011682016040523d82523d6000602084013e610159565b606091505b50915091508161019e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161019590610d45565b60405180910390fd5b8973ffffffffffffffffffffffffffffffffffffffff16847fa560e3198060a2f10670c1ec5b403077ea6ae93ca8de1c32b451dc1a943cd6e78b8b8b8b6040516101eb9493929190610d65565b60405180910390a38094505050505095945050505050565b60005b8551811015610314573073ffffffffffffffffffffffffffffffffffffffff16630825f38f87838151811061023e5761023d610db8565b5b602002602001015187848151811061025957610258610db8565b5b602002602001015187858151811061027457610273610db8565b5b602002602001015187868151811061028f5761028e610db8565b5b6020026020010151876040518663ffffffff1660e01b81526004016102b8959493929190610baa565b6000604051808303816000875af11580156102d7573d6000803e3d6000fd5b505050506040513d6000823e3d601f19601f820116820180604052508101906103009190610e57565b50808061030c90610ecf565b915050610206565b505050505050565b6000604051905090565b600080fd5b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061035b82610330565b9050919050565b61036b81610350565b811461037657600080fd5b50565b60008135905061038881610362565b92915050565b6000819050919050565b6103a18161038e565b81146103ac57600080fd5b50565b6000813590506103be81610398565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b610417826103ce565b810181811067ffffffffffffffff82111715610436576104356103df565b5b80604052505050565b600061044961031c565b9050610455828261040e565b919050565b600067ffffffffffffffff821115610475576104746103df565b5b61047e826103ce565b9050602081019050919050565b82818337600083830152505050565b60006104ad6104a88461045a565b61043f565b9050828152602081018484840111156104c9576104c86103c9565b5b6104d484828561048b565b509392505050565b600082601f8301126104f1576104f06103c4565b5b813561050184826020860161049a565b91505092915050565b600067ffffffffffffffff821115610525576105246103df565b5b61052e826103ce565b9050602081019050919050565b600061054e6105498461050a565b61043f565b90508281526020810184848401111561056a576105696103c9565b5b61057584828561048b565b509392505050565b600082601f830112610592576105916103c4565b5b81356105a284826020860161053b565b91505092915050565b600080600080600060a086880312156105c7576105c6610326565b5b60006105d588828901610379565b95505060206105e6888289016103af565b945050604086013567ffffffffffffffff8111156106075761060661032b565b5b610613888289016104dc565b935050606086013567ffffffffffffffff8111156106345761063361032b565b5b6106408882890161057d565b9250506080610651888289016103af565b9150509295509295909350565b600081519050919050565b600082825260208201905092915050565b60005b8381101561069857808201518184015260208101905061067d565b60008484015250505050565b60006106af8261065e565b6106b98185610669565b93506106c981856020860161067a565b6106d2816103ce565b840191505092915050565b600060208201905081810360008301526106f781846106a4565b905092915050565b600067ffffffffffffffff82111561071a576107196103df565b5b602082029050602081019050919050565b600080fd5b600061074361073e846106ff565b61043f565b905080838252602082019050602084028301858111156107665761076561072b565b5b835b8181101561078f578061077b8882610379565b845260208401935050602081019050610768565b5050509392505050565b600082601f8301126107ae576107ad6103c4565b5b81356107be848260208601610730565b91505092915050565b600067ffffffffffffffff8211156107e2576107e16103df565b5b602082029050602081019050919050565b6000610806610801846107c7565b61043f565b905080838252602082019050602084028301858111156108295761082861072b565b5b835b81811015610852578061083e88826103af565b84526020840193505060208101905061082b565b5050509392505050565b600082601f830112610871576108706103c4565b5b81356108818482602086016107f3565b91505092915050565b600067ffffffffffffffff8211156108a5576108a46103df565b5b602082029050602081019050919050565b60006108c96108c48461088a565b61043f565b905080838252602082019050602084028301858111156108ec576108eb61072b565b5b835b8181101561093357803567ffffffffffffffff811115610911576109106103c4565b5b80860161091e89826104dc565b855260208501945050506020810190506108ee565b5050509392505050565b600082601f830112610952576109516103c4565b5b81356109628482602086016108b6565b91505092915050565b600067ffffffffffffffff821115610986576109856103df565b5b602082029050602081019050919050565b60006109aa6109a58461096b565b61043f565b905080838252602082019050602084028301858111156109cd576109cc61072b565b5b835b81811015610a1457803567ffffffffffffffff8111156109f2576109f16103c4565b5b8086016109ff898261057d565b855260208501945050506020810190506109cf565b5050509392505050565b600082601f830112610a3357610a326103c4565b5b8135610a43848260208601610997565b91505092915050565b600080600080600060a08688031215610a6857610a67610326565b5b600086013567ffffffffffffffff811115610a8657610a8561032b565b5b610a9288828901610799565b955050602086013567ffffffffffffffff811115610ab357610ab261032b565b5b610abf8882890161085c565b945050604086013567ffffffffffffffff811115610ae057610adf61032b565b5b610aec8882890161093d565b935050606086013567ffffffffffffffff811115610b0d57610b0c61032b565b5b610b1988828901610a1e565b9250506080610b2a888289016103af565b9150509295509295909350565b610b4081610350565b82525050565b610b4f8161038e565b82525050565b600081519050919050565b600082825260208201905092915050565b6000610b7c82610b55565b610b868185610b60565b9350610b9681856020860161067a565b610b9f816103ce565b840191505092915050565b600060a082019050610bbf6000830188610b37565b610bcc6020830187610b46565b8181036040830152610bde8186610b71565b90508181036060830152610bf281856106a4565b9050610c016080830184610b46565b9695505050505050565b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b6000819050919050565b610c52610c4d82610c0b565b610c37565b82525050565b600081905092915050565b6000610c6e8261065e565b610c788185610c58565b9350610c8881856020860161067a565b80840191505092915050565b6000610ca08285610c41565b600482019150610cb08284610c63565b91508190509392505050565b6000610cc88284610c63565b915081905092915050565b7f54696d656c6f636b3a3a657865637574655472616e73616374696f6e3a20547260008201527f616e73616374696f6e20657865637574696f6e2072657665727465642e000000602082015250565b6000610d2f603d83610b60565b9150610d3a82610cd3565b604082019050919050565b60006020820190508181036000830152610d5e81610d22565b9050919050565b6000608082019050610d7a6000830187610b46565b8181036020830152610d8c8186610b71565b90508181036040830152610da081856106a4565b9050610daf6060830184610b46565b95945050505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b6000610dfa610df58461050a565b61043f565b905082815260208101848484011115610e1657610e156103c9565b5b610e2184828561067a565b509392505050565b600082601f830112610e3e57610e3d6103c4565b5b8151610e4e848260208601610de7565b91505092915050565b600060208284031215610e6d57610e6c610326565b5b600082015167ffffffffffffffff811115610e8b57610e8a61032b565b5b610e9784828501610e29565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610eda8261038e565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203610f0c57610f0b610ea0565b5b60018201905091905056fea26469706673582212206ed4670d6b6a3ebf2a4daacf4121b9316dd4e5e39730647ad04c8dfcfb3c28ff64736f6c63430008120033')
}

/*
library GetCode {
	function at(address addr) public view returns (bytes memory code) {
		assembly {
			// retrieve the size of the code, this needs assembly
			let size := extcodesize(addr)
			// allocate output byte array - this could also be done without assembly
			// by using code = new bytes(size)
			code := mload(0x40)
			// new "memory end" including padding
			mstore(0x40, add(code, and(add(add(size, 0x20), 0x1f), not(0x1f))))
			// store length in memory
			mstore(code, size)
			// actually retrieve the code, this needs assembly
			extcodecopy(addr, add(code, 0x20), 0, size)
		}
	}
}
*/

export const getCodeByteCode = () => {
	return EthereumData.parse('0x73000000000000000000000000000000000000000030146080604052600436106100355760003560e01c8063dce4a4471461003a575b600080fd5b610054600480360381019061004f91906100f8565b61006a565b60405161006191906101b5565b60405180910390f35b6060813b6040519150601f19601f602083010116820160405280825280600060208401853c50919050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006100c58261009a565b9050919050565b6100d5816100ba565b81146100e057600080fd5b50565b6000813590506100f2816100cc565b92915050565b60006020828403121561010e5761010d610095565b5b600061011c848285016100e3565b91505092915050565b600081519050919050565b600082825260208201905092915050565b60005b8381101561015f578082015181840152602081019050610144565b60008484015250505050565b6000601f19601f8301169050919050565b600061018782610125565b6101918185610130565b93506101a1818560208601610141565b6101aa8161016b565b840191505092915050565b600060208201905081810360008301526101cf818461017c565b90509291505056fea26469706673582212206a5f0cd9f230619fa520fc4b9d4b518643258cad412f2fa33945ce528b4b895164736f6c63430008120033')
}

/*
// modified from here: https://github.com/safe-global/safe-smart-account/blob/main/contracts/proxies/SafeProxy.sol
pragma solidity 0.8.18;

contract GnosisSafeProxyProxy {
	function delegateCallExecute(address target, bytes memory callData) payable external returns (bytes memory) {
		(bool success, bytes memory returnData) = payable(target).delegatecall(callData);
		require(success, "Delegate call failed");
		return returnData;
	}

	/// forwards all transactions to 0x0000000000000000000000000000000000920515
	fallback() external payable {
		assembly {
			let _originalGnosisSafeProxy := 0x0000000000000000000000000000000000920515
			calldatacopy(0, 0, calldatasize())
			let success := delegatecall(gas(), _originalGnosisSafeProxy, 0, calldatasize(), 0, 0)
			returndatacopy(0, 0, returndatasize())
			if iszero(success) {
				revert(0, returndatasize())
			}
			return(0, returndatasize())
		}
	}
}
*/
export const getGnosisSafeProxyProxy = () => {
	return EthereumData.parse('0x6080604052600436106100225760003560e01c80639fe839781461004957610023565b5b629205153660008037600080366000845af43d6000803e80610044573d6000fd5b3d6000f35b610063600480360381019061005e91906102eb565b610079565b60405161007091906103c6565b60405180910390f35b60606000808473ffffffffffffffffffffffffffffffffffffffff16846040516100a39190610424565b600060405180830381855af49150503d80600081146100de576040519150601f19603f3d011682016040523d82523d6000602084013e6100e3565b606091505b509150915081610128576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161011f90610498565b60405180910390fd5b809250505092915050565b6000604051905090565b600080fd5b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061017282610147565b9050919050565b61018281610167565b811461018d57600080fd5b50565b60008135905061019f81610179565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6101f8826101af565b810181811067ffffffffffffffff82111715610217576102166101c0565b5b80604052505050565b600061022a610133565b905061023682826101ef565b919050565b600067ffffffffffffffff821115610256576102556101c0565b5b61025f826101af565b9050602081019050919050565b82818337600083830152505050565b600061028e6102898461023b565b610220565b9050828152602081018484840111156102aa576102a96101aa565b5b6102b584828561026c565b509392505050565b600082601f8301126102d2576102d16101a5565b5b81356102e284826020860161027b565b91505092915050565b600080604083850312156103025761030161013d565b5b600061031085828601610190565b925050602083013567ffffffffffffffff81111561033157610330610142565b5b61033d858286016102bd565b9150509250929050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610381578082015181840152602081019050610366565b60008484015250505050565b600061039882610347565b6103a28185610352565b93506103b2818560208601610363565b6103bb816101af565b840191505092915050565b600060208201905081810360008301526103e0818461038d565b905092915050565b600081905092915050565b60006103fe82610347565b61040881856103e8565b9350610418818560208601610363565b80840191505092915050565b600061043082846103f3565b915081905092915050565b600082825260208201905092915050565b7f44656c65676174652063616c6c206661696c6564000000000000000000000000600082015250565b600061048260148361043b565b915061048d8261044c565b602082019050919050565b600060208201905081810360008301526104b181610475565b905091905056fea26469706673582212203e96f34ac95ff29da01f27c2e715937c3b3829ae9ffeb1111dd78145a79362dc64736f6c63430008120033')
}
