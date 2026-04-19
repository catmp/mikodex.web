import { pokeApiFetch } from './pokeapi'
import { TYPE_LIST } from '../constants/types'

export const getType    = (name) => pokeApiFetch(`type/${name}`)
export const getAllTypes = ()     => Promise.all(TYPE_LIST.map(getType))
