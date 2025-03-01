import { defineModel } from '@shuvi/redox'
import { delay } from '../utils'

export const id = defineModel({
	name: 'id',
	state: { id: 0 },
	reducers: {
		setId: (state, payload: number) => {
			state.id = payload
		},
	},
})
