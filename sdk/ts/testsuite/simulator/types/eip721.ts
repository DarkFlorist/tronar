import * as funtypes from 'funtypes'
import { JSONEncodeableObject, isJSON } from '../utils/json.js'
import { serialize } from './wire-types.js'

type EIP712MessageUnderlying = funtypes.Static<typeof EIP712MessageUnderlying>
const EIP712MessageUnderlying = funtypes.ReadonlyObject({
	types: funtypes.Record(funtypes.String, funtypes.ReadonlyArray(
		funtypes.ReadonlyObject({
			name: funtypes.String,
			type: funtypes.String,
		})
	)),
	primaryType: funtypes.String,
	domain: JSONEncodeableObject,
	message: JSONEncodeableObject,
})

const EIP712MessageParser: funtypes.ParsedValue<funtypes.String, EIP712MessageUnderlying>['config'] = {
	parse: value => {
		if (!isJSON(value) || !EIP712MessageUnderlying.test(JSON.parse(value))) return { success: false, message: `${ value } is not EIP712 message` }
		return { success: true, value: EIP712MessageUnderlying.parse(JSON.parse(value)) }
	},
	serialize: value => {
		if (!EIP712MessageUnderlying.test(value)) return { success: false, message: `${ value } is not a EIP712 message.`}
		return { success: true, value: JSON.stringify(serialize(EIP712MessageUnderlying, value)) }
	},
}

export type EIP712Message = funtypes.Static<typeof EIP712Message>
export const EIP712Message = funtypes.String.withParser(EIP712MessageParser)
