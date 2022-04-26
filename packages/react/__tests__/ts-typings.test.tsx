/**
 * @jest-environment jsdom
 */

import * as React from 'react'
import { defineModel } from '@shuvi/redox'
import {
	useModel,
	useGlobalModel,
	useStaticModel,
	ISelectorParams,
} from '../src'

type customType = 'custom' | 'custom0'

const count = defineModel({
	name: 'count',
	state: {
		value: 1,
		s: '',
	},
	reducers: {
		addValue(state, payload: number = 1) {
			return {
				...state,
				value: state.value + payload,
			}
		},
		setString(state, payload: customType) {
			return {
				...state,
				s: payload,
			}
		},
	},
	effects: {
		async asyncAdd(arg0: number) {
			this.addValue(arg0)
		},
		async asyncStr(arg0: number, arg1?: customType) {
			if (arg1) {
				this.addValue(arg0)
			}
		},
	},
	views: {
		viewNumber(state, _dependsState, args: number): number {
			return state.value + args
		},
		viewString(state, _dependsState, args?: customType) {
			return state.s + args || ''
		},
	},
})

type countSelectorParameters = ISelectorParams<typeof count>
const countSelector = function (stateAndViews: countSelectorParameters) {
	return {
		v: stateAndViews.value,
		n: stateAndViews.viewNumber(1),
		s: stateAndViews.viewString(),
		scustom: stateAndViews.viewString('custom'),
	}
}

describe('typings:', () => {
	test('selector type:', () => {
		const countSelectorTemp = function (
			stateAndViews: countSelectorParameters
		) {
			return {
				v: stateAndViews.value,
				s: stateAndViews.viewString(),
			}
		}
		type temp = typeof countSelectorTemp
	})
	test('useModel state and action:', () => {
		function App() {
			const [state, action] = useModel(count)
			state.value
			state.s
			action.addValue()
			action.addValue(1)
			action.setString('custom')
			action.asyncAdd(1)
			action.asyncStr(1)
			action.asyncStr(1, 'custom')
			return <></>
		}
	})

	test('useModel state and action with selector inline:', () => {
		function App() {
			const [state, action] = useModel(count, function (stateAndViews) {
				return {
					n: stateAndViews.value,
					viewS: stateAndViews.viewString(),
				}
			})
			state.n
			state.viewS
			action.addValue()
			action.addValue(1)
			action.setString('custom')
			action.asyncAdd(1)
			action.asyncStr(1)
			action.asyncStr(1, 'custom')
			return <></>
		}
	})

	test('useModel state and action with selector:', () => {
		function App() {
			const [state, action] = useModel(count, countSelector)
			state.n
			state.v
			state.s
			state.scustom
			action.addValue()
			action.addValue()
			action.addValue(1)
			action.setString('custom')
			action.asyncAdd(1)
			action.asyncStr(1)
			action.asyncStr(1, 'custom')
			return <></>
		}
	})
	test('useGlobalModel state and action:', () => {
		function App() {
			const [state, action] = useGlobalModel(count)
			state.value
			state.s
			action.addValue()
			action.addValue(1)
			action.setString('custom')
			action.asyncAdd(1)
			action.asyncStr(1)
			action.asyncStr(1, 'custom')
			return <></>
		}
	})
	test('useGlobalModel state and action with selector inline:', () => {
		function App() {
			const [state, action] = useGlobalModel(count, function (stateAndViews) {
				return {
					n: stateAndViews.value,
					viewS: stateAndViews.viewString(),
				}
			})
			state.n
			state.viewS
			action.addValue()
			action.addValue(1)
			action.setString('custom')
			action.asyncAdd(1)
			action.asyncStr(1)
			action.asyncStr(1, 'custom')
			return <></>
		}
	})
	test('useGlobalModel state and action with selector:', () => {
		function App() {
			const [state, action] = useGlobalModel(count, countSelector)
			state.n
			state.v
			state.s
			state.scustom
			action.addValue()
			action.addValue()
			action.addValue(1)
			action.setString('custom')
			action.asyncAdd(1)
			action.asyncStr(1)
			action.asyncStr(1, 'custom')
			return <></>
		}
	})
	test('useStaticModel state and action:', () => {
		function App() {
			const [state, action] = useStaticModel(count)
			state.value
			state.s
			action.addValue()
			action.addValue(1)
			action.setString('custom')
			action.asyncAdd(1)
			action.asyncStr(1)
			action.asyncStr(1, 'custom')
			return <></>
		}
	})
	test('useStaticModel state and action with selector inline:', () => {
		function App() {
			const [state, action] = useStaticModel(count, function (stateAndViews) {
				return {
					n: stateAndViews.value,
					viewS: stateAndViews.viewString(),
				}
			})
			state.n
			state.viewS
			action.addValue()
			action.addValue(1)
			action.setString('custom')
			action.asyncAdd(1)
			action.asyncStr(1)
			action.asyncStr(1, 'custom')
			return <></>
		}
	})
	test('useStaticModel state and action with selector:', () => {
		function App() {
			const [state, action] = useStaticModel(count, countSelector)
			state.n
			state.v
			state.s
			state.scustom
			action.addValue()
			action.addValue()
			action.addValue(1)
			action.setString('custom')
			action.asyncAdd(1)
			action.asyncStr(1)
			action.asyncStr(1, 'custom')
			return <></>
		}
	})
})