import React from 'react';
import ReactDOM from 'react-dom/client';
import { MoorhenContainer } from '../src/components/MoorhenContainer';
import { MoorhenMolecule } from "../src/utils/MoorhenMolecule"
import { MoorhenMap } from "../src/utils/MoorhenMap"
import { PreferencesContextProvider, getDefaultValues } from "../src/utils/MoorhenPreferences";
import reportWebVitals from '../src/reportWebVitals'
import localforage from 'localforage';
import '../src/index.css';
import '../src/App.css';

export default class MoorhenWrapper {
  constructor(urlPrefix) {
    this.urlPrefix = urlPrefix
    this.monomerLibrary = `${this.urlPrefix}/baby-gru/monomers/`
    this.controls = null
    this.updateInterval = null
    this.workMode = null
    this.inputFiles = null
    this.rootId = null
    this.preferences = null
    this._interval = null
    this.exportCallback = () => {}
    reportWebVitals()
  }

  setWorkMode(mode='build') {
    if (['build', 'view', 'view-update'].includes(mode)) {
      this.workMode = mode
    } else {
      console.error(`Unrecognised working mode set in moorhen ${mode}`)
    } 
  }

  setPreferences(preferences) {
    this.preferences = JSON.parse(preferences)
  }

  setRootId(rootId) {
    this.rootId = rootId
  }

  setInputFiles(inputFiles) {
    this.inputFiles = inputFiles
  }

  setUpdateInterval(miliseconds) {
    this.updateInterval = miliseconds
  }

  setMonomerLibrary(uri) {
    this.monomerLibrary = uri
  }

  addOnExportListener(callbackFunction){
    this.exportCallback = callbackFunction
  }

  removeUpdateInterval() {
    if(this._interval !== null) {
      clearInterval(this._interval)
    }
  }

  forwardControls(controls) {
    console.log('Fetched controls', {controls})
    this.controls = controls
  }

  async exportBackups() {
    const keys = await this.controls.timeCapsuleRef.current.storageInstance.keys()
    const responses = await Promise.all(
      keys.map(key => this.controls.timeCapsuleRef.current.storageInstance.getItem(key))
    )
    let storedBackups = {}
    keys.forEach((key, index) => storedBackups[key] = responses[index])
    return storedBackups
  }

  async importBackups(backups) {
    const storedVersion = await this.controls.timeCapsuleRef.current.storageInstance.getItem(JSON.stringify({type: 'version'}))
    const newVersion = backups[JSON.stringify({type: 'version'})]
    if (newVersion === storedVersion) {
      await this.controls.timeCapsuleRef.current.storageInstance.clear()
      await Promise.all(
        Object.keys(backups).forEach(key => 
          this.controls.timeCapsuleRef.current.storageInstance.setItem(JSON.stringify(key), backups[JSON.stringify(key)])
        )
      )
    }
  }

  async exportPreferences() {
    const defaultPreferences = getDefaultValues()                
    const responses = await Promise.all(
      Object.keys(defaultPreferences).map(key => localforage.getItem(key))
    )
    let storedPrefereneces = {}
    Object.keys(defaultPreferences).forEach((key, index) => storedPrefereneces[key] = responses[index])
    return JSON.stringify(storedPrefereneces)
  }

  async importPreferences(preferences) {
    const storedVersion = await localforage.getItem('version')
    const defaultPreferences = getDefaultValues()                

    if (storedVersion === defaultPreferences.version) {
      await Promise.all(Object.keys(preferences).map(key => {
        if (key === 'shortCuts') {
          return localforage.setItem(key, JSON.stringify(preferences[key]))
        } else {
          return localforage.setItem(key, preferences[key])
        }
      }))
    }
  }

  async loadMtzData(inputFile, mapName, selectedColumns) {
    const newMap = new MoorhenMap(this.controls.commandCentre)
    return new Promise(async (resolve, reject) => {
      try {
        await newMap.loadToCootFromMtzURL(inputFile, mapName, selectedColumns)
        this.controls.changeMaps({ action: 'Add', item: newMap })
        this.controls.setActiveMap(newMap)
        return resolve(newMap)
      } catch (err) {
        console.log(`Cannot fetch mtz from ${inputFile}`)
        return reject(err)
      }
    })
  }

  async loadPdbData(inputFile, molName) {
    const newMolecule = new MoorhenMolecule(this.controls.commandCentre, this.monomerLibrary)
    return new Promise(async (resolve, reject) => {
        try {
            await newMolecule.loadToCootFromURL(inputFile, molName)
            await newMolecule.fetchIfDirtyAndDraw('CBs', this.controls.glRef)
            this.controls.changeMolecules({ action: "Add", item: newMolecule })
            newMolecule.centreOn(this.controls.glRef, null, false)
            return resolve(newMolecule)
        } catch (err) {
            console.log(`Cannot fetch molecule from ${inputFile}`)
            return reject(err)
        }   
    })
  }

  async loadInputFiles() {
    const results = await Promise.all(
      this.inputFiles.map(file => {
        if (file.type === 'pdb') {
          return this.loadPdbData(...file.args)
        } else if (file.type === 'mtz') {
          return this.loadMtzData(...file.args)
        }
    }))

    setTimeout(() => {
      results.forEach((result, index) => {
        if (result?.type === 'map') {
          let newMapContour = new CustomEvent("newMapContour", {
            "detail": {
                molNo: result.molNo,
                mapRadius: 13,
                cootContour: true,
                contourLevel: 0.8,
                litLines: false,
            }
        });               
        document.dispatchEvent(newMapContour);
        }
      })
    }, 2500)
  }

  async updateMolecules() {
    await Promise.all(
      this.controls.moleculesRef.current.map(molecule => {
        return molecule.delete(this.controls.glRef)
          .then(_ => this.controls.changeMolecules({ action: 'Remove', item: molecule }))
      })  
    )
    await Promise.all(
      this.inputFiles.filter(file => file.type === 'pdb').map(file => this.loadInputFiles(...file.args))
    )
  }

  waitForInitialisation() {
    const checkCootIsInitialised = resolve => {
      if (this.controls) {
        resolve()
      } else {
        setTimeout(_ => checkCootIsInitialised(resolve), 500);
      }  
    }
    return new Promise(checkCootIsInitialised)
  }

  renderMoorhen() {
    const rootDiv = document.getElementById(this.rootId)
    const root = ReactDOM.createRoot(rootDiv)
    root.render(
      <React.StrictMode>
        <div className="App">
          <PreferencesContextProvider>
            <MoorhenContainer 
              urlPrefix={this.urlPrefix}
              forwardControls={this.forwardControls.bind(this)}
              disableFileUploads={true}
              exportCallback={this.exportCallback.bind(this)}
              monomerLibraryPath={this.monomerLibrary}
              viewOnly={this.workMode === 'view'}
              />
          </PreferencesContextProvider>
        </div>
      </React.StrictMode>
    );
  }

  async start() {
    if (this.preferences) {
      await this.importPreferences(this.preferences)
    }

    this.renderMoorhen()
    await this.waitForInitialisation()
    await this.loadInputFiles()
    
    if(this.updateInterval !== null) {
      this._interval = setInterval(()=> {
        this.updateMolecules()
      }, this.updateInterval)
    }

  }
}

