import produce, { setAutoFreeze } from 'immer'
import {
	Action,
	State,
	ModelCollection,
	ReduxReducer,
	ReduxDispatch,
	Reducers,
	RedoxActions,
	Views,
	Store,
	Model,
	DispatchOfModel,
	RedoxViews,
	AnyModel,
} from './types'
import { createReducers } from './reducers'
import { createActions } from './actions'
import { createViews } from './views'
import validate from './validate'
import { emptyObject, readonlyDeepClone } from './utils'
import reduxDevTools from './reduxDevtools'

const randomString = () =>
	Math.random().toString(36).substring(7).split('').join('.')

const ActionTypes = {
	INIT: `@@redox/INIT${/* #__PURE__ */ randomString()}`,
	SET: '@@redox/SET',
	MODIFY: '@@redox/MODIFY',
}

type unSubscribe = () => void

export type IModelManager = {
	get<IModel extends AnyModel>(model: IModel): Store<IModel>
	_getRedox<IModel extends AnyModel>(model: IModel): RedoxStore<IModel>
	subscribe(model: AnyModel, fn: () => any): unSubscribe
	_getInitialState: (name: string) => State | undefined
	getSnapshot(): { [X: string]: State }
	destroy(): void
}

export type pluginHook<IModel extends AnyModel = AnyModel> = {
	onInit?(
		modelManager: IModelManager,
		initialState: Record<string, State>
	): void
	onModel?(model: IModel): void
	onStoreCreated?(Store: RedoxStoreProxy): void
	onDestroy?(): void
}

const proxyMethods = [
	'$state',
	'dispatch',
	'subscribe',
	'model',
	'$set',
	'$modify',
	'$reducer',
] as const

type IProxyMethods = typeof proxyMethods[number]

type RedoxStoreProxy = Pick<RedoxStore<AnyModel>, IProxyMethods>

export type IPlugin<IModel extends AnyModel = AnyModel, Option = any> = (
	option: Option
) => pluginHook<IModel>

type ICacheMap = Map<string, RedoxStore<any>>

export type RedoxOptions = {
	initialState?: Record<string, State>
	plugins?: [IPlugin, any?][]
}

export function redox(
	{
		initialState = emptyObject,
		plugins = [],
	}: RedoxOptions = {} as RedoxOptions
): IModelManager {
	const cacheMap: ICacheMap = new Map()
	let initState = initialState
	if (process.env.NODE_ENV === 'development') {
		plugins.unshift([reduxDevTools])
	}
	const hooks = plugins.map(([plugin, option]) => plugin(option))
	const modelManager = {
		get<IModel extends AnyModel>(model: IModel) {
			const redoxStore = modelManager._getRedox(model)
			return redoxStore.storeApi
		},
		_getInitialState: (name: string): State | undefined => {
			const result = initState[name]
			delete initState[name]
			return result
		},
		_getRedox<IModel extends AnyModel>(model: IModel) {
			const name = model.name
			let cacheStore = cacheMap.get(name)
			if (cacheStore) {
				return cacheStore as RedoxStore<IModel>
			}
			return initModel(model)
		},
		subscribe(model: AnyModel, fn: () => any) {
			const redoxStore = modelManager._getRedox(model)
			return redoxStore.subscribe(fn)
		},
		// only get change state
		getSnapshot() {
			const allState = {} as ReturnType<IModelManager['getSnapshot']>
			for (const [key, store] of cacheMap.entries()) {
				allState[key] = store.$state()
			}
			return allState
		},
		destroy() {
			hooks.map((hook) => hook.onDestroy?.())
			for (const store of cacheMap.values()) {
				store.destroy()
			}
			cacheMap.clear()
			initState = emptyObject
		},
	}
	function initModel<M extends AnyModel>(model: M): RedoxStore<M> {
		hooks.map((hook) => hook.onModel?.(model))

		const depends = model._depends
		if (depends) {
			depends.forEach((depend) => {
				modelManager._getRedox(depend) // trigger initial
			})
		}
		const store = new RedoxStore(model, modelManager)
		const storeProxy = new Proxy(store, {
			get(target, prop: IProxyMethods) {
				if (process.env.NODE_ENV === 'development') {
					validate(() => [
						[
							!proxyMethods.includes(prop),
							`invalidate props ${prop}, should be one of ${proxyMethods.join(
								' | '
							)}`,
						],
					])
				}
				return target[prop]
			},
		})
		hooks.map((hook) => hook.onStoreCreated?.(storeProxy))
		const storeName = model.name
		cacheMap.set(storeName, store)
		return store
	}
	hooks.map((hook) => hook.onInit?.(modelManager, initState))
	return modelManager
}

export class RedoxStore<IModel extends AnyModel> {
	public _beDepends: Set<RedoxStore<any>> = new Set()
	public _cache: IModelManager
	public model: Readonly<IModel>
	public storeApi: Store<IModel>
	public storeDepends: Record<string, Store<AnyModel>>
	public $state: () => IModel['state']
	public $actions = {} as DispatchOfModel<IModel>
	public $views = {} as RedoxViews<IModel['views']>
	public $reducer: ReduxReducer<IModel['state']> | null

	private currentState: IModel['state']
	private listeners: Set<() => void> = new Set()
	private isDispatching: boolean

	constructor(model: IModel, cache: IModelManager) {
		this._cache = cache
		this.model = model
		this.storeDepends = {}
		enhanceReducer(model)
		const reducer = createModelReducer(model)
		this.$reducer = reducer
		this.currentState =
			(this.model.name && this._cache._getInitialState(this.model.name)) ||
			model.state
		this.isDispatching = false

		if (process.env.NODE_ENV === 'development') {
			let lastState = this.getState()
			let $stateCache = readonlyDeepClone(lastState)
			this.$state = () => {
				if (lastState === this.getState()) {
					return $stateCache
				}
				lastState = this.getState()
				$stateCache = readonlyDeepClone(lastState)
				return $stateCache
			}
		} else {
			this.$state = this.getState
		}

		this.dispatch({ type: ActionTypes.INIT })

		enhanceModel(this)

		this.storeApi = getStoreApi(this)

		const depends = this.model._depends
		// collection _beDepends, a depends b, when b update, call a need update
		if (depends) {
			depends.forEach((depend) => {
				const dependStore = this._cache._getRedox(depend)
				this.addBeDepends(dependStore)
				this.storeDepends[depend.name] = dependStore.storeApi
			})
		}
	}

	getState = () => {
		return this.currentState!
	}

	$set = (newState: State) => {
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[
					typeof newState === 'bigint' || typeof newState === 'symbol',
					"'BigInt' and 'Symbol' are not assignable to the State",
				],
			])
		}
		return this.dispatch({
			type: ActionTypes.SET,
			payload: newState,
		})
	}

	$modify = (modifier: (state: State) => void) => {
		return this.dispatch({
			type: ActionTypes.MODIFY,
			payload: modifier,
		})
	}

	subscribe = (listener: () => void) => {
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[
					typeof listener !== 'function',
					`Expected the listener to be a function`,
				],
				[
					this.isDispatching,
					'You may not call store.subscribe() while the reducer is executing.',
				],
			])
		}

		this.listeners.add(listener)

		return () => {
			if (process.env.NODE_ENV === 'development') {
				validate(() => [
					[
						this.isDispatching,
						'You may not unsubscribe from a store listener while the reducer is executing. ',
					],
				])
			}

			this.listeners.delete(listener)
		}
	}

	dispatch: ReduxDispatch = (action) => {
		if (process.env.NODE_ENV === 'development') {
			validate(() => [
				[
					typeof action.type === 'undefined',
					'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.',
				],
				[this.isDispatching, 'Reducers may not dispatch actions.'],
			])
		}

		let nextState

		try {
			this.isDispatching = true
			nextState = this.$reducer!(this.currentState, action)
		} finally {
			this.isDispatching = false
		}

		if (nextState !== this.currentState) {
			this.currentState = nextState
			// trigger self listeners
			this._triggerListener()
			// trigger beDepends listeners
			for (const beDepend of this._beDepends) {
				beDepend._triggerListener()
			}
		}

		return action
	}

	private addBeDepends = (dependStore: RedoxStore<any>) => {
		dependStore._beDepends.add(this)
	}

	_triggerListener = () => {
		for (const listener of this.listeners) {
			listener()
		}
	}

	destroy = () => {
		// @ts-ignore
		this.currentState = null
		this.$reducer = null
		this.listeners.clear()
		this._beDepends.clear()
		this.model = emptyObject
		this._cache = emptyObject
		if (this.$views) {
			const viewsKeys = Object.keys(this.$views)
			for (const viewsKey of viewsKeys) {
				// @ts-ignore
				this.$views[viewsKey] = null
			}
			this.$views = emptyObject
		}
	}
}

function getStoreApi<M extends AnyModel = AnyModel>(
	redoxStore: RedoxStore<M>
): Store<M> {
	const store = {} as Store<M>
	store.$state = redoxStore.$state
	store.$set = redoxStore.$set
	store.$modify = redoxStore.$modify
	Object.assign(store, redoxStore.$actions, redoxStore.$views)
	return store
}

function enhanceModel<IModel extends AnyModel>(
	redoxStore: RedoxStore<IModel>
): void {
	createReducers(redoxStore)
	if (redoxStore.model.actions) createActions(redoxStore)
	if (redoxStore.model.views) createViews(redoxStore)
}

function enhanceReducer<
	N extends string,
	S extends State,
	MC extends ModelCollection,
	R extends Reducers<S>,
	RA extends RedoxActions,
	V extends Views
>(model: Model<N, S, MC, R, RA, V>) {
	model.reducers = {
		...(model.reducers ? model.reducers : {}),
		[ActionTypes.MODIFY]: function (state: S, payload: (s: S) => any) {
			if (process.env.NODE_ENV === 'development') {
				validate(() => [
					[
						typeof payload !== 'function',
						'Expected the payload to be a Function',
					],
				])
			}
			payload(state)
		},
	} as R
}

setAutoFreeze(false)

export function createModelReducer<
	N extends string,
	S extends State,
	MC extends ModelCollection,
	R extends Reducers<S>,
	RA extends RedoxActions,
	V extends Views
>(model: Model<N, S, MC, R, RA, V>): ReduxReducer<S, Action> {
	// select and run a reducer based on the incoming action
	return (state: S = model.state, action: Action): S => {
		if (action.type === ActionTypes.SET) {
			return action.payload
		}

		const reducer = model.reducers![action.type]
		if (typeof reducer === 'function') {
			// immer does not support 'undefined' state
			if (state === undefined) return reducer(state, action.payload) as S
			return produce(state, (draft: any) => reducer(draft, action.payload) as S)
		}

		return state
	}
}
