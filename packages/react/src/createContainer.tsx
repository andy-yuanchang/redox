import React, {
	createContext,
	useContext,
	PropsWithChildren,
	useEffect,
	useState,
	useMemo,
	useRef,
} from 'react'
import {
	validate,
	redox,
} from '@shuvi/redox'
import type {
	IModelManager,
  RedoxStore
 } from '@shuvi/redox';
import { createBatchManager } from './batchManager'
import { shadowEqual } from './utils'
import { IUseModel, ISelector, AnyModel } from './types'

function tuplify<T extends any[]>(...elements: T) {
	return elements
}

function getStateOrViews<
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(store: RedoxStore<IModel>, selector?: Selector) {
	const modelState = store.getState()
	if (!selector) {
		return modelState
	}
	const ModelViews = store.views || {}
	return selector(modelState, ModelViews)
}

function getStateDispatch<
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(model: IModel, modelManager: IModelManager, selector?: Selector) {
	const store = modelManager.get(model)
	const dispatch = store.dispatch
	return tuplify(getStateOrViews(store, selector), dispatch)
}

function initModel(
	model: AnyModel,
	modelManager: IModelManager,
	batchManager: ReturnType<typeof createBatchManager>
) {
	const store = modelManager.get(model)
	if (!batchManager.hasInitModel(model)) {
		batchManager.initModel(model)
		store.subscribe(function () {
			batchManager.triggerSubscribe(model) // render self;
		})
	}
}

const createUseModel =
	(
		modelManager: IModelManager,
		batchManager: ReturnType<typeof createBatchManager>
	) =>
	<
		IModel extends AnyModel,
		Selector extends ISelector<IModel>
	>(
		model: IModel,
		selector?: Selector
	) => {
		const initialValue = useMemo(() => {
			initModel(model, modelManager, batchManager)
			return getStateDispatch(model, modelManager, selector)
		}, [])

		const [modelValue, setModelValue] = useState(initialValue)

		const lastValueRef = useRef<any>(initialValue)

		useEffect(() => {
			const fn = () => {
				const newValue = getStateDispatch(model, modelManager, selector)
				if (!shadowEqual(lastValueRef.current[0], newValue[0])) {
					setModelValue(newValue as any)
					lastValueRef.current = newValue
				}
			}
			const unSubscribe = batchManager.addSubscribe(model, fn)

			return () => {
				unSubscribe()
			}
		}, [])

		return modelValue
	}

const createContainer = () => {
	const Context = createContext<{
		modelManager: IModelManager
		batchManager: ReturnType<typeof createBatchManager>
	}>(null as any)

	const Provider = (
		props: PropsWithChildren<{ modelManager?: IModelManager }>
	) => {
		const { children, modelManager: propsModelManager } = props

		let modelManager: IModelManager
		if (propsModelManager) {
			modelManager = propsModelManager
		} else {
			modelManager = redox()
		}
		const batchManager = createBatchManager()

		return (
			<Context.Provider value={{ modelManager, batchManager }}>
				{children}
			</Context.Provider>
		)
	}

	const useModel: IUseModel = <
		IModel extends AnyModel,
		Selector extends ISelector<IModel>
	>(
		model: IModel,
		selector?: Selector
	) => {
		const context = useContext(Context)

		validate(() => [
			[!Boolean(model), `useModel param model is necessary`],
			[
				!Boolean(context),
				`You should wrap your Component in CreateApp().Provider.`,
			],
		])

		const { modelManager, batchManager } = context

		return useMemo(
			() => createUseModel(modelManager, batchManager),
			[modelManager, batchManager]
		)(model, selector)
	}

	const useStaticModel: IUseModel = <
		IModel extends AnyModel,
		Selector extends ISelector<IModel>
	>(
		model: IModel,
		selector?: Selector
	) => {
		const context = useContext(Context)

		validate(() => [
			[
				!Boolean(context),
				'You should wrap your Component in CreateApp().Provider.',
			],
		])

		const { modelManager, batchManager } = context
		const initialValue = useMemo(() => {
			initModel(model, modelManager, batchManager)
			return getStateDispatch(model, modelManager, selector)
		}, [])

		const value = useRef<[any, any]>([
			// deep clone state in case mutate origin state accidentlly.
			JSON.parse(JSON.stringify(initialValue[0])),
			initialValue[1],
		])

		useEffect(() => {
			const fn = () => {
				const newValue = getStateDispatch(model, modelManager, selector)
				if (
					Object.prototype.toString.call(value.current[0]) === '[object Object]'
				) {
					// merge data to old reference
					Object.assign(value.current[0], newValue[0])
					Object.assign(value.current[1], newValue[1])
				}
			}
			const unSubscribe = batchManager.addSubscribe(model, fn)

			return () => {
				unSubscribe()
			}
		}, [])

		return value.current
	}

	return {
		Provider,
		useModel,
		useStaticModel,
	}
}

const useLocalModel: IUseModel = <
	IModel extends AnyModel,
	Selector extends ISelector<IModel>
>(
	model: IModel,
	selector?: Selector
) => {
	const [modelManager, batchManager] = useMemo(() => {
		const modelManager = redox()
		return [modelManager, createBatchManager()]
	}, [])

	return useMemo(() => createUseModel(modelManager, batchManager), [])(
		model,
		selector
	)
}

export { useLocalModel }

export default createContainer