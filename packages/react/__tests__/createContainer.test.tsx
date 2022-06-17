/**
 * @jest-environment jsdom
 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { defineModel, redox } from '@shuvi/redox'
import { act } from 'react-dom/test-utils'
import {
	createContainer,
	RedoxRoot,
	useRootStaticModel,
	useRootModel,
} from '../src'

import { sleep, countModel, countSelectorParameters } from './models'

let node: HTMLDivElement
beforeEach(() => {
	process.env.NODE_ENV = 'development'
	node = document.createElement('div')
	document.body.appendChild(node)
})

afterEach(() => {
	document.body.removeChild(node)
	;(node as unknown as null) = null
})

describe('useRootModel', () => {
	describe('useRootModel valid:', () => {
		test('valid name is required:', async () => {
			const tempModel = defineModel({
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootModel(tempModel)

				return (
					<>
						<div id="value">{state.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.render(
						<RedoxRoot>
							<App />
						</RedoxRoot>,
						node
					)
				})
			}).toThrow()
		})

		test('valid name should not be empty:', async () => {
			const tempModel = defineModel({
				name: '',
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootModel(tempModel)

				return (
					<>
						<div id="value">{state.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.render(
						<RedoxRoot>
							<App />
						</RedoxRoot>,
						node
					)
				})
			}).toThrow()
		})

		test('valid useRootModel should has parent RedoxRoot:', async () => {
			const tempModel = defineModel({
				name: 'tempModel',
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootModel(tempModel)

				return (
					<>
						<div id="value">{state.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.render(<App />, node)
				})
			}).toThrow()
		})
	})

	test('reducer worked:', async () => {
		const App = () => {
			const [state, actions] = useRootModel(countModel)

			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}
		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#value')?.innerHTML).toEqual('2')
	})

	test('immer worked:', async () => {
		const immer = defineModel({
			name: 'immer',
			state: {
				value: 1,
			},
			reducers: {
				add(state, payload: number = 1) {
					state.value += payload
				},
			},
		})
		const App = () => {
			const [state, actions] = useRootModel(immer)

			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}
		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#value')?.innerHTML).toEqual('2')
	})

	test('action worked:', async () => {
		const App = () => {
			const [state, actions] = useRootModel(countModel)

			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.asyncAdd(2)}>
						add
					</button>
				</>
			)
		}
		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		await sleep(250)
		expect(node.querySelector('#value')?.innerHTML).toEqual('3')
	})

	test('views worked:', async () => {
		let viewComputedTime = 0
		const views = defineModel({
			name: 'views',
			state: {
				value: 1,
				value1: 1,
			},
			reducers: {
				add(state, payload: number = 1) {
					state.value += payload
				},
			},
			views: {
				test() {
					viewComputedTime++
					return this.value1
				},
			},
		})
		const App = () => {
			const [state, actions] = useRootModel(views, function (stateAndViews) {
				return stateAndViews.test()
			})

			return (
				<>
					<div id="value">{state}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}
		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		expect(viewComputedTime).toBe(1)
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(viewComputedTime).toBe(1)
		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
	})

	test('selector worked:', async () => {
		const countSelector = function (stateAndViews: countSelectorParameters) {
			return {
				v: stateAndViews.value,
				t: stateAndViews.test(2),
			}
		}
		const App = () => {
			const [state, actions] = useRootModel(countModel, countSelector)

			return (
				<>
					<div id="v">{state.v}</div>
					<div id="t">{state.t}</div>
					<button id="button" type="button" onClick={() => actions.add(2)}>
						add
					</button>
				</>
			)
		}
		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#v')?.innerHTML).toEqual('1')
		expect(node.querySelector('#t')?.innerHTML).toEqual('3')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#v')?.innerHTML).toEqual('3')
		expect(node.querySelector('#t')?.innerHTML).toEqual('5')
	})

	test('depends worked:', async () => {
		const newModel = defineModel(
			{
				name: 'newModel',
				state: { value: 0 },
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
				actions: {
					async asyncAdd() {
						await this.$dep.countModel.asyncAdd(1)
						this.add(this.$dep.countModel.$state().value)
					},
				},
				views: {
					test() {
						return this.$dep.countModel.value * 2
					},
				},
			},
			[countModel]
		)

		const App = () => {
			const [state, actions] = useRootModel(newModel, function (stateAndViews) {
				return {
					v: stateAndViews.value,
					t: stateAndViews.test(),
				}
			})

			return (
				<>
					<div id="v">{state.v}</div>
					<div id="t">{state.t}</div>
					<button id="button" type="button" onClick={() => actions.asyncAdd()}>
						add
					</button>
				</>
			)
		}
		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#v')?.innerHTML).toEqual('0')
		expect(node.querySelector('#t')?.innerHTML).toEqual('2')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		await sleep(250)
		expect(node.querySelector('#v')?.innerHTML).toEqual('2')
		expect(node.querySelector('#t')?.innerHTML).toEqual('4')
	})

	describe('selector only run init and state changed:', () => {
		test('inlined selector:', async () => {
			let selectorRunCount = 0
			const App = () => {
				const [_state, actions] = useRootModel(countModel, function () {
					selectorRunCount++
					return 1
				})
				const [_index, setIndex] = React.useState(0)

				return (
					<>
						<button id="button" type="button" onClick={() => setIndex(1)}>
							setIndex
						</button>
						<button id="action" type="button" onClick={() => actions.add()}>
							action
						</button>
					</>
				)
			}
			act(() => {
				ReactDOM.render(
					<RedoxRoot>
						<App />
					</RedoxRoot>,
					node
				)
			})

			expect(selectorRunCount).toBe(2)
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(2)
			act(() => {
				node
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(3)
		})

		test('selector outside:', async () => {
			let selectorRunCount = 0
			const countSelector = function () {
				selectorRunCount++
				return 1
			}
			const App = () => {
				const [_state, actions] = useRootModel(countModel, countSelector)
				const [_index, setIndex] = React.useState(0)

				return (
					<>
						<button id="button" type="button" onClick={() => setIndex(1)}>
							setIndex
						</button>
						<button id="action" type="button" onClick={() => actions.add()}>
							action
						</button>
					</>
				)
			}
			act(() => {
				ReactDOM.render(
					<RedoxRoot>
						<App />
					</RedoxRoot>,
					node
				)
			})

			expect(selectorRunCount).toBe(2)
			act(() => {
				node
					.querySelector('#button')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(2)
			act(() => {
				node
					.querySelector('#action')
					?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
			})
			expect(selectorRunCount).toBe(3)
		})
	})

	test('useRootModel should keep state same ref:', async () => {
		let AppState: any = null
		let AppState1: any = null
		const App = () => {
			const [state, actions] = useRootModel(countModel)
			const [state1, _actions1] = useRootModel(countModel)
			AppState = state
			AppState1 = state1
			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add(1)}>
						add
					</button>
					<SubApp></SubApp>
				</>
			)
		}
		let SubAppState: any = null
		function SubApp() {
			const [state, _actions] = useRootModel(countModel)
			SubAppState = state
			return <></>
		}

		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')

		expect(AppState).toBeTruthy()
		expect(AppState === AppState1).toBeTruthy()
		expect(AppState === SubAppState).toBeTruthy()
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('2')
		expect(AppState === AppState1).toBeTruthy()
		expect(AppState === SubAppState).toBeTruthy()
	})

	test('useRootModel should keep actions same ref:', async () => {
		let AppActions: any = null
		let AppActions1: any = null
		const App = () => {
			const [state, actions] = useRootModel(countModel)
			const [_state1, actions1] = useRootModel(countModel)
			AppActions = actions
			AppActions1 = actions1
			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add(1)}>
						add
					</button>
					<SubApp></SubApp>
				</>
			)
		}
		let SubAppActions: any = null
		function SubApp() {
			const [_state, actions] = useRootModel(countModel)
			SubAppActions = actions
			return <></>
		}

		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')

		expect(AppActions).toBeTruthy()
		expect(AppActions === AppActions1).toBeTruthy()
		expect(AppActions === SubAppActions).toBeTruthy()
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('2')
		expect(AppActions === AppActions1).toBeTruthy()
		expect(AppActions === SubAppActions).toBeTruthy()
	})

	test('useRootModel should keep state no care component unmount or not:', async () => {
		const SubApp = () => {
			const [state, actions] = useRootModel(countModel)

			return (
				<>
					<div id="state">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		const App = () => {
			const [toggle, setToggle] = React.useState(true)
			return (
				<>
					<button id="toggle" type="button" onClick={() => setToggle(!toggle)}>
						add
					</button>
					{toggle ? <SubApp /> : null}
				</>
			)
		}

		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App></App>
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#state')?.innerHTML).toEqual('2')
		act(() => {
			node
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#state')?.innerHTML).toEqual(undefined)
		act(() => {
			node
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#state')?.innerHTML).toEqual('2')
	})
})

describe('useRootStaticModel', () => {
	describe('useRootStaticModel valid:', () => {
		test('name should be required:', async () => {
			const tempModel = defineModel({
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootStaticModel(tempModel)

				return (
					<>
						<div id="value">{state.current.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.render(
						<RedoxRoot>
							<App />
						</RedoxRoot>,
						node
					)
				})
			}).toThrow()
		})

		test('valid name should not be empty:', async () => {
			const tempModel = defineModel({
				name: '',
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootStaticModel(tempModel)

				return (
					<>
						<div id="value">{state.current.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.render(
						<RedoxRoot>
							<App />
						</RedoxRoot>,
						node
					)
				})
			}).toThrow()
		})

		test('valid useRootStaticModel should has parent RedoxRoot:', async () => {
			const tempModel = defineModel({
				name: 'tempModel',
				state: {
					value: 1,
				},
				reducers: {
					add(state, payload: number = 1) {
						state.value += payload
					},
				},
			})

			const App = () => {
				const [state, actions] = useRootStaticModel(tempModel)

				return (
					<>
						<div id="value">{state.current.value}</div>
						<button id="button" type="button" onClick={() => actions.add()}>
							add
						</button>
					</>
				)
			}

			expect(() => {
				act(() => {
					ReactDOM.render(<App />, node)
				})
			}).toThrow()
		})
	})

	test('useRootStaticModel should update value, but not rendered', () => {
		let renderTime = 0
		let currentCount = 0

		const StaticApp = () => {
			renderTime += 1

			const [state, dispatch] = useRootStaticModel(countModel)

			currentCount = state.current.value

			return (
				<>
					<div id="state">{state.current.value}</div>
					<button id="add" type="button" onClick={() => dispatch.add()}>
						add
					</button>
					<button
						id="updateCount"
						type="button"
						onClick={() => {
							currentCount = state.current.value
						}}
					>
						updateCount
					</button>
				</>
			)
		}

		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<StaticApp />
				</RedoxRoot>,
				node
			)
		})

		expect(renderTime).toBe(1)
		expect(currentCount).toBe(1)

		act(() => {
			node
				.querySelector('#add')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(renderTime).toBe(1)
		expect(currentCount).toBe(1)

		act(() => {
			node
				.querySelector('#updateCount')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(currentCount).toBe(2)
	})

	test('useRootStaticModel should state keep same ref', () => {
		let stateRef: any
		let stateRef1: any

		const StaticApp = () => {
			const [state, dispatch] = useRootStaticModel(countModel)
			const [_, setValue] = React.useState(false)

			if (!stateRef) {
				stateRef = state
			}

			stateRef1 = state

			return (
				<>
					<div id="state">{state.current.value}</div>
					<button
						id="add"
						type="button"
						onClick={() => {
							dispatch.add()
							setValue(true)
						}}
					>
						add
					</button>
				</>
			)
		}

		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<StaticApp />
				</RedoxRoot>,
				node
			)
		})

		act(() => {
			node
				.querySelector('#add')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(stateRef === stateRef1).toBeTruthy()
	})
})

describe('RedoxRoot', () => {
	test('RedoxRoot worked with useRootModel:', () => {
		const App = () => {
			const [state, actions] = useRootModel(countModel)
			return (
				<>
					<div id="value">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		act(() => {
			ReactDOM.render(
				<RedoxRoot>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#value')?.innerHTML).toEqual('2')
	})

	test('RedoxRoot worked with modelManager props:', () => {
		const App = () => {
			const [state] = useRootModel(countModel)
			return (
				<>
					<div id="value">{state.value}</div>
				</>
			)
		}

		const modelManager = redox()

		act(() => {
			ReactDOM.render(
				<RedoxRoot modelManager={modelManager}>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('1')
		modelManager.get(countModel).add(1)
		expect(node.querySelector('#value')?.innerHTML).toEqual('2')
	})

	test('RedoxRoot worked with modelManager props and initial state:', () => {
		const App = () => {
			const [state] = useRootModel(countModel)
			return (
				<>
					<div id="value">{state.value}</div>
				</>
			)
		}

		const modelManager = redox({
			initialState: {
				countModel: {
					value: 2,
				},
			},
		})

		act(() => {
			ReactDOM.render(
				<RedoxRoot modelManager={modelManager}>
					<App />
				</RedoxRoot>,
				node
			)
		})

		expect(node.querySelector('#value')?.innerHTML).toEqual('2')
	})
})

describe('createContainer:', () => {
	test('createContainer should return RedoxRoot and useSharedModel, useRootStaticModel:', () => {
		const {
			Provider: _Provider,
			useSharedModel: _useSharedModel,
			useStaticModel: _useStaticModel,
		} = createContainer()

		expect(_Provider).toBeTruthy()
		expect(_useSharedModel).toBeTruthy()
		expect(_useStaticModel).toBeTruthy()
	})

	test('Local RedoxRoot and useSharedModel should work:', () => {
		const { Provider: LocalProvider, useSharedModel } = createContainer()

		const SubApp = () => {
			const [state, actions] = useSharedModel(countModel)

			return (
				<>
					<div id="state">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		act(() => {
			ReactDOM.render(
				<LocalProvider>
					<SubApp />
				</LocalProvider>,
				node
			)
		})

		expect(node.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#state')?.innerHTML).toEqual('2')
	})

	test('nest useSharedModel should get it own RedoxRoot:', () => {
		const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
			createContainer()
		const { Provider: LocalProviderB, useSharedModel: useSharedModelB } =
			createContainer()

		const C = () => {
			const [stateA, _actionsA] = useSharedModelA(countModel)
			const [stateB, _actionsB] = useSharedModelB(countModel)

			return (
				<>
					<div id="stateCA">{stateA.value}</div>
					<div id="stateCB">{stateB.value}</div>
				</>
			)
		}

		const A = () => {
			const [state, actions] = useSharedModelA(countModel)

			return (
				<>
					<div id="stateA">{state.value}</div>
					<button id="buttonA" type="button" onClick={() => actions.add()}>
						add
					</button>
					<C></C>
				</>
			)
		}

		const B = () => {
			const [state, actions] = useSharedModelB(countModel)

			return (
				<>
					<div id="stateB">{state.value}</div>
					<button id="buttonB" type="button" onClick={() => actions.add()}>
						add
					</button>
					<C></C>
				</>
			)
		}

		act(() => {
			ReactDOM.render(
				<LocalProviderA>
					<LocalProviderB>
						<A></A>
						<B></B>
					</LocalProviderB>
				</LocalProviderA>,
				node
			)
		})

		expect(node.querySelector('#stateA')?.innerHTML).toEqual('1')
		expect(node.querySelector('#stateB')?.innerHTML).toEqual('1')
		expect(node.querySelector('#stateCA')?.innerHTML).toEqual('1')
		expect(node.querySelector('#stateCB')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#buttonA')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#stateA')?.innerHTML).toEqual('2')
		expect(node.querySelector('#stateB')?.innerHTML).toEqual('1')
		expect(node.querySelector('#stateCA')?.innerHTML).toEqual('2')
		expect(node.querySelector('#stateCB')?.innerHTML).toEqual('1')
	})

	test('each container should be isolation:', () => {
		const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
			createContainer()

		const A = (props: { id: number }) => {
			const [state, actions] = useSharedModelA(countModel)

			return (
				<>
					<div id={`stateA${props.id}`}>{state.value}</div>
					<button
						id={`buttonA${props.id}`}
						type="button"
						onClick={() => actions.add()}
					>
						add
					</button>
				</>
			)
		}

		const Warp = function (props: { id: number }) {
			return (
				<LocalProviderA>
					<A {...props}></A>
				</LocalProviderA>
			)
		}

		act(() => {
			ReactDOM.render(
				<>
					<Warp id={1}></Warp>
					<Warp id={2}></Warp>
				</>,
				node
			)
		})

		expect(node.querySelector('#stateA1')?.innerHTML).toEqual('1')
		expect(node.querySelector('#stateA2')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#buttonA1')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#stateA1')?.innerHTML).toEqual('2')
		expect(node.querySelector('#stateA2')?.innerHTML).toEqual('1')
	})

	test('share same modelManager can connect containers', () => {
		const modelManager = redox()
		const { Provider: LocalProviderA, useSharedModel: useSharedModelA } =
			createContainer()
		const { Provider: LocalProviderB, useSharedModel: useSharedModelB } =
			createContainer()

		const C = () => {
			const [stateA, _actionsA] = useSharedModelA(countModel)
			const [stateB, _actionsB] = useSharedModelB(countModel)

			return (
				<>
					<div id="stateCA">{stateA.value}</div>
					<div id="stateCB">{stateB.value}</div>
				</>
			)
		}

		const A = () => {
			const [state, actions] = useSharedModelA(countModel)

			return (
				<>
					<div id="stateA">{state.value}</div>
					<button id="buttonA" type="button" onClick={() => actions.add()}>
						add
					</button>
					<C></C>
				</>
			)
		}

		const B = () => {
			const [state, actions] = useSharedModelB(countModel)

			return (
				<>
					<div id="stateB">{state.value}</div>
					<button id="buttonB" type="button" onClick={() => actions.add()}>
						add
					</button>
					<C></C>
				</>
			)
		}

		act(() => {
			ReactDOM.render(
				<LocalProviderA modelManager={modelManager}>
					<LocalProviderB modelManager={modelManager}>
						<A></A>
						<B></B>
					</LocalProviderB>
				</LocalProviderA>,
				node
			)
		})

		expect(node.querySelector('#stateA')?.innerHTML).toEqual('1')
		expect(node.querySelector('#stateB')?.innerHTML).toEqual('1')
		expect(node.querySelector('#stateCA')?.innerHTML).toEqual('1')
		expect(node.querySelector('#stateCB')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#buttonA')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#stateA')?.innerHTML).toEqual('2')
		expect(node.querySelector('#stateB')?.innerHTML).toEqual('2')
		expect(node.querySelector('#stateCA')?.innerHTML).toEqual('2')
		expect(node.querySelector('#stateCB')?.innerHTML).toEqual('2')
	})

	test('when container unmount state change should not throw an error:', () => {
		const { Provider: LocalProvider, useSharedModel } = createContainer()

		const SubApp = () => {
			const [state, actions] = useSharedModel(countModel)

			return (
				<>
					<div id="state">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		const modelManager = redox()

		const App = () => {
			const [toggle, setToggle] = React.useState(true)
			return (
				<>
					<button id="toggle" type="button" onClick={() => setToggle(!toggle)}>
						add
					</button>
					{toggle ? (
						<LocalProvider modelManager={modelManager}>
							<SubApp />
						</LocalProvider>
					) : null}
				</>
			)
		}

		act(() => {
			ReactDOM.render(<App></App>, node)
		})

		expect(node.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#state')?.innerHTML).toEqual('2')
		act(() => {
			node
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		modelManager.get(countModel).add(1)
	})

	test('modelManager changed state change should be changed directly:', () => {
		const { Provider: LocalProvider, useSharedModel } = createContainer()

		const SubApp = () => {
			const [state, actions] = useSharedModel(countModel)

			return (
				<>
					<div id="state">{state.value}</div>
					<button id="button" type="button" onClick={() => actions.add()}>
						add
					</button>
				</>
			)
		}

		const modelManager0 = redox()
		const modelManager1 = redox()

		const App = () => {
			const [toggle, setToggle] = React.useState(true)
			return (
				<>
					<button id="toggle" type="button" onClick={() => setToggle(!toggle)}>
						toggle
					</button>
					<LocalProvider modelManager={toggle ? modelManager0 : modelManager1}>
						<SubApp />
					</LocalProvider>
				</>
			)
		}

		act(() => {
			ReactDOM.render(<App></App>, node)
		})

		expect(node.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#state')?.innerHTML).toEqual('2')
		act(() => {
			node
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#toggle')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#state')?.innerHTML).toEqual('2')
	})
})

// https://github.com/reactwg/react-18/discussions/70#discussioncomment-981298
describe('fix tearing bugs:', () => {
	test('Local RedoxRoot and useSharedModel should work:', () => {
		const { Provider: LocalProvider, useSharedModel } = createContainer()

		const counterModel = defineModel({
			name: 'counter',
			state: {
				counter: 0,
			},
			actions: {
				increment() {
					this.$modify((state) => state.counter++)
				},
			},
		})

		const modelManger = redox()

		const counterStore = modelManger.get(counterModel)

		const timer = setInterval(() => {
			counterStore.increment()
		}, 50)

		function SlowComponent() {
			let now = performance.now()
			while (performance.now() - now < 200) {
				// do nothing
			}
			const [state] = useSharedModel(counterModel)
			return <h3>Counter: {state.counter}</h3>
		}

		function App() {
			const [show, setShow] = React.useState(false)
			return (
				<div className="App">
					<button
						onClick={() => {
							React.startTransition(() => {
								setShow(!show)
								setTimeout(() => {
									clearInterval(timer)
								}, 60)
							})
						}}
					>
						toggle content
					</button>
					{show && (
						<>
							<SlowComponent />
							<SlowComponent />
							<SlowComponent />
							<SlowComponent />
							<SlowComponent />
						</>
					)}
				</div>
			)
		}

		act(() => {
			ReactDOM.render(
				<LocalProvider>
					<App />
				</LocalProvider>,
				node
			)
		})

		expect(node.querySelector('#state')?.innerHTML).toEqual('1')
		act(() => {
			node
				.querySelector('#button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		expect(node.querySelector('#state')?.innerHTML).toEqual('2')
	})
})
