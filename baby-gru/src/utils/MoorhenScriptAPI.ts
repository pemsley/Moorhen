import { moorhen } from "../types/moorhen"
import { webGL } from "../types/mgWebGL";

interface MoorhenScriptApiInterface {
    molecules: moorhen.Molecule[];
    maps: moorhen.Map[];
    glRef: React.RefObject<webGL.MGWebGL>;
}

export class MoorhenScriptApi implements MoorhenScriptApiInterface {
    
    molecules: moorhen.Molecule[];
    maps: moorhen.Map[];
    glRef: React.RefObject<webGL.MGWebGL>;

    constructor(molecules: moorhen.Molecule[], maps: moorhen.Map[], glRef: React.RefObject<webGL.MGWebGL>) {
        this.molecules = molecules
        this.maps = maps
        this.glRef = glRef
    }

    doRigidBodyFit = async (molNo: number, cidsString: string, mapNo: number) => {
        const selectedMolecule = this.molecules.find(molecule => molecule.molNo === molNo)
        if (typeof selectedMolecule !== 'undefined') {
            await selectedMolecule.rigidBodyFit(cidsString, mapNo)
            selectedMolecule.setAtomsDirty(true)
            await selectedMolecule.redraw(this.glRef)
        } else {
            console.log(`Unable to find molecule number ${molNo}`)
        }
    }
    
    exe(src: string) {
        // This env defines the variables accesible within the user-defined code
        let env = {
            molecules: this.molecules.reduce((obj, molecule) => {
                obj[molecule.molNo] = molecule
                return obj
            }, {}),
            maps: this.maps.reduce((obj, map) => {
                obj[map.molNo] = map
                return obj
            }, {}),
            rigid_body_fit: this.doRigidBodyFit
        };
        
        (new Function( "with(this) { " + src + "}")).call(env)
    }
}