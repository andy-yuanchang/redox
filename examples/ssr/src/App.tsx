import React from 'react'
import SSR from './components/SSR'
import Basic from './components/Basic'
import Views from './components/Views'
import List from './components/List'
import Repeat from './components/Repeat'
import type { IModelManager } from '@shuvi/redox'
import { RedoxRoot } from '@shuvi/redox-react'

function App(props: { modelManager?: IModelManager }) {
	return (
		<>
			<RedoxRoot {...props}>
				<SSR />
				<Basic />
				<Views />
				<List />
				<Repeat />
			</RedoxRoot>
		</>
	)
}

export default App
