import 'pako';
import $ from 'jquery';
import { EnerLib, Model, parseMMCIF, parsePDB, atomsToHierarchy } from '../WebGL/mgMiniMol';
import { CalcSecStructure } from '../WebGL/mgSecStr';
import { ColourScheme } from '../WebGL/mgWebGLAtomsToPrimitives';
import { GetSplinesColoured } from '../WebGL/mgSecStr';
import { getMultipleBonds } from '../WebGL/mgWebGLAtomsToPrimitives';
import { atomsToSpheresInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { contactsToCylindersInfo, contactsToLinesInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { readMapFromArrayBuffer, mapToMapGrid } from '../WebGL/mgWebGLReadMap';
import { singletonsToLinesInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { DisplayBuffer, getEncodedData } from '../WebGL/mgWebGL';
import { v4 as uuidv4 } from 'uuid';
import { postCootMessage, readTextFile, readDataFile } from '../BabyGruUtils'

export function BabyGruMolecule(cootWorker) {
    this.cootWorker = cootWorker
    this.enerLib = new EnerLib()
    this.HBondsAssigned = false
    this.displayObjects = {
        ribbons: [],
        bonds: [],
        sticks: []
    }
};

BabyGruMolecule.prototype.loadToCootFromFile = function (source) {
    const $this = this
    return new Promise((resolve, reject) => {
        return readTextFile(source)
            .then(coordData => {
                return postCootMessage($this.cootWorker, {
                    message: 'read_pdb',
                    name: source.name,
                    data: coordData
                }).then(e => {
                    $this.name = e.data.result.name
                    $this.coordMolNo = e.data.result.coordMolNo
                    resolve($this)
                })
            })
    })
}

BabyGruMolecule.prototype.loadToCootFromEBI = function (pdbCode) {
    const $this = this
    return new Promise((resolve, reject) => {
        //Remember to change this to an appropriate URL for downloads in produciton, and to deal with the consequent CORS headache
        return fetch(`/download/${pdbCode}.cif`, { mode: "no-cors" })
            .then(response => {
                return response.text()
            }).then((coordData) => {
                return postCootMessage($this.cootWorker, {
                    message: 'read_pdb',
                    name: pdbCode,
                    data: coordData
                }).then(e => {
                    $this.name = e.data.result.name
                    $this.coordMolNo = e.data.result.coordMolNo
                    resolve($this)
                })
            })
            .catch((err) => { console.log(err) })
    })
}

BabyGruMolecule.prototype.getAtoms = function () {
    const $this = this;
    return postCootMessage($this.cootWorker, { message: "get_atoms", coordMolNo: $this.coordMolNo })
}

BabyGruMolecule.prototype.fetchCoordsAndDraw = function (style, gl) {
    return this.getAtoms()
        .then(result => {
            return new Promise((resolve, reject) => {
                const webMGAtoms = this.webMGAtomsFromFileString(result.data.result.pdbData)
                console.log(gl, gl.current)
                gl.current.setOrigin(webMGAtoms.atoms[0].centre())
                switch (style) {
                    case 'ribbons':
                        this.drawRibbons(webMGAtoms, gl.current)
                        break;
                    case 'bonds':
                        this.drawBonds(webMGAtoms, gl.current, 0)
                        break;
                    case 'sticks':
                        this.drawSticks(webMGAtoms, gl.current, 0)
                        break;
                    default:
                        break;
                }
                resolve(true)
            })
        })
}

BabyGruMolecule.prototype.show = function (style, gl) {
    if (this.displayObjects[style].length == 0) {
        this.fetchCoordsAndDraw(style, gl)
    }
    else {
        this.displayObjects[style].forEach(displayBuffer => {
            displayBuffer.visible = true
        })
    }
    gl.current.drawScene()
}

BabyGruMolecule.prototype.hide = function (style, gl) {
    this.displayObjects[style].forEach(displayBuffer => {
        displayBuffer.visible = false
    })
    gl.current.drawScene()
}

BabyGruMolecule.prototype.webMGAtomsFromFileString = function (fileString) {
    let result = { atoms: [] }
    var possibleIndentedLines = fileString.split("\n");
    var unindentedLines = possibleIndentedLines.map(line => line.trim())
    try {
        result = parseMMCIF(unindentedLines);
        if (typeof result.atoms === 'undefined') {
            result = parsePDB(unindentedLines)
        }
    }
    catch (err) {
        console.log('Err', err)
        result = parsePDB(unindentedLines)
    }
    return result
}

BabyGruMolecule.prototype.drawBonds = function (webMGAtoms, gl, colourSchemeIndex) {

    var $this = this
    if (typeof webMGAtoms["atoms"] === 'undefined') return;
    var model = webMGAtoms["atoms"][0];

    const colourScheme = new ColourScheme(webMGAtoms);
    var atomColours = colourScheme.colourByChain({
        "nonCByAtomType": true,
        'C': colourScheme.order_colours[colourSchemeIndex % colourScheme.order_colours.length]
    });

    var contactsAndSingletons = model.getBondsContactsAndSingletons();
    var contacts = contactsAndSingletons["contacts"];
    var singletons = contactsAndSingletons["singletons"];
    var linePrimitiveInfo = contactsToCylindersInfo(contacts, 0.1, atomColours);
    var singletonPrimitiveInfo = singletonsToLinesInfo(singletons, 4, atomColours);

    var linesAndSpheres = []
    linesAndSpheres.push(linePrimitiveInfo);
    linesAndSpheres.push(singletonPrimitiveInfo);

    const objects = linesAndSpheres.filter(item => {
        return typeof item.sizes !== "undefined" &&
            item.sizes.length > 0 &&
            item.sizes[0].length > 0 &&
            item.sizes[0][0].length > 0
    })

    objects.forEach(object => {
        var a = gl.appendOtherData(object, true);
        $this.displayObjects.bonds = $this.displayObjects.bonds.concat(a)
    })
    gl.buildBuffers();
    gl.drawScene();
}

BabyGruMolecule.prototype.drawRibbons = function (webMGAtoms, gl) {

    const selectionString = '/*/*'

    //Attempt to apply selection, storing old hierarchy
    const oldHierarchy = webMGAtoms.atoms
    if (typeof selectionString === 'string') {
        try {
            const selectedAtoms = webMGAtoms.atoms[0].getAtoms(selectionString)
            if (selectedAtoms.length === 0) {
                webMGAtoms.atoms = oldHierarchy
                return
            }
            webMGAtoms.atoms = atomsToHierarchy(selectedAtoms)
        }
        catch (err) {
            webMGAtoms.atoms = oldHierarchy
            return
        }
    }

    if (typeof webMGAtoms.atoms === 'undefined' || webMGAtoms.atoms.length === 0) {
        webMGAtoms.atoms = oldHierarchy
        return;
    }

    if (typeof (webMGAtoms["modamino"]) !== "undefined") {
        webMGAtoms["modamino"].forEach(modifiedResidue => {
            Model.prototype.getPeptideLibraryEntry(modifiedResidue, this.enerLib);
        })
    }

    //Sort out H-bonding
    this.enerLib.AssignHBTypes(webMGAtoms, true);
    var model = webMGAtoms.atoms[0];
    model.calculateHBonds();

    var flagBulge = true;
    CalcSecStructure(webMGAtoms.atoms, flagBulge);

    const colourScheme = new ColourScheme(webMGAtoms);
    const atomColours = colourScheme.colourByChain({ "nonCByAtomType": true });

    const coloured_splines_info = GetSplinesColoured(webMGAtoms, atomColours);
    const objects = coloured_splines_info.filter(item => {
        return typeof item.sizes !== "undefined" &&
            item.sizes.length > 0 &&
            item.sizes[0].length > 0 &&
            item.sizes[0][0].length > 0
    })

    objects.forEach(object => {
        const a = gl.appendOtherData(object, true);
        this.displayObjects.ribbons = this.displayObjects.ribbons.concat(a)
    })

    gl.buildBuffers();
    gl.drawScene();

    //Restore odlHierarchy
    webMGAtoms.atoms = oldHierarchy
    return
}

BabyGruMolecule.prototype.drawSticks = function (webMGAtoms, gl) {
    let hier = webMGAtoms["atoms"];

    let colourScheme = new ColourScheme(webMGAtoms);
    let atomColours = colourScheme.colourByAtomType();


    let model = hier[0];
    /*
    let atoms = model.getAllAtoms();
    contacts = model.SeekContacts(atoms,atoms,0.6,1.6);
    */
    let contactsAndSingletons = model.getBondsContactsAndSingletons();
    let contacts = contactsAndSingletons["contacts"];
    let singletons = contactsAndSingletons["singletons"];
    let linePrimitiveInfo = contactsToLinesInfo(contacts, 2, atomColours);
    let singletonPrimitiveInfo = singletonsToLinesInfo(singletons, 2, atomColours);
    linePrimitiveInfo["display_class"] = "bonds";
    singletonPrimitiveInfo["display_class"] = "bonds";

    let objects = [linePrimitiveInfo, singletonPrimitiveInfo];

    objects.forEach(object => {
        const a = gl.appendOtherData(object, true);
        this.displayObjects.sticks = this.displayObjects.sticks.concat(a)
    })

    gl.buildBuffers();
    gl.drawScene();

}

