import validate, { validateModel } from './validate'
import {
	RedoxActions,
	Model,
	MakeDeps,
	Reducers,
	Views,
	State,
	Tuple,
} from './types'

export const defineModel = <
	N extends string,
	S extends State,
	R extends Reducers<S>,
	E extends RedoxActions,
	MC extends MakeDeps<D>,
	V extends Views,
	D extends any[] = []
>(
	modelOptions: Omit<Model<N, S, MC, R, E, V>, 'depends'>,
	depends?: Tuple<D>
) => {
	if (process.env.NODE_ENV === 'development') {
		validate(() => [
			[
				depends && !Array.isArray(depends),
				`second argument depends should be an array, now is ${typeof depends} !`,
			],
		])
		validateModel(modelOptions)
	}
	const finalModel = modelOptions as Model<N, S, MC, R, E, V>
	finalModel._depends = depends
	return finalModel
}
