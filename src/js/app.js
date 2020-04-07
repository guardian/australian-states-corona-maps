import loadJson from '../components/load-json/'
import getURLParams from "./modules/getURLParams"
import settings from "./settings.json"
import places from "./places.json"
import { App } from './modules/app'

const state = getURLParams("state") ? getURLParams("state") : "QLD"

var stateData = settings.find( item => item.state === state)

if ( state != null ) {

	loadJson(stateData.url)
	      .then((data) => {
	      	new App(data, state, stateData, places)
	      })

}

/*
// Version 1

if ( state != null ) {

	loadJson(`https://interactive.guim.co.uk/docsdata/1q5gdePANXci8enuiS4oHUJxcxC13d6bjMRSicakychE.json`)
	      .then((data) => {
	      	new App(data.sheets, state, stateData, places)
	      })

}

*/