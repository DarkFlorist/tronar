import * as funtypes from 'funtypes'
import { UnionToIntersection } from '../types/types.js'

export const addressString = (address: bigint): `0x${ string }` => `0x${ address.toString(16).padStart(40, '0') }`

export function serialize<T, U extends funtypes.Codec<T>>(funtype: U, value: T) {
	return funtype.serialize(value) as ToWireType<U>
}

type ToWireType<T> =
	T extends funtypes.Intersect<infer U> ? UnionToIntersection<{ [I in keyof U]: ToWireType<U[I]> }[number]>
	: T extends funtypes.Union<infer U> ? { [I in keyof U]: ToWireType<U[I]> }[number]
	: T extends funtypes.Record<infer U, infer V> ? Record<funtypes.Static<U>, ToWireType<V>>
	: T extends funtypes.Partial<infer U, infer V> ? V extends true ? { readonly [K in keyof U]?: ToWireType<U[K]> } : { [K in keyof U]?: ToWireType<U[K]> }
	: T extends funtypes.Object<infer U, infer V> ? V extends true ? { readonly [K in keyof U]: ToWireType<U[K]> } : { [K in keyof U]: ToWireType<U[K]> }
	: T extends funtypes.Readonly<funtypes.Tuple<infer U>> ? { readonly [P in keyof U]: ToWireType<U[P]>}
	: T extends funtypes.Tuple<infer U> ? { [P in keyof U]: ToWireType<U[P]>}
	: T extends funtypes.ReadonlyArray<infer U> ? readonly ToWireType<U>[]
	: T extends funtypes.Array<infer U> ? ToWireType<U>[]
	: T extends funtypes.ParsedValue<infer U, infer _> ? ToWireType<U>
	: T extends funtypes.Codec<infer U> ? U
	: never

export const bigintToNumber = (value: bigint): number => {
	if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
		throw new Error('Conversion is unsafe, bigint value exceeds safe integer range.')
	}
	return Number(value)
}

export const stringAsHexString = (value: string): `0x${ string }` => {
	if (value.startsWith('0x')) return value as unknown as `0x${ string }`
	throw new Error(`String "${ value }" does not start with "0x"`)
}

export const bytes32String = (bytes32: bigint): `0x${ string }` => `0x${ bytes32.toString(16).padStart(64, '0') }`

