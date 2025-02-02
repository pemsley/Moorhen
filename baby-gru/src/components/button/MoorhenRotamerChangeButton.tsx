import { useCallback, useRef, useState } from "react"
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase"
import { moorhen } from "../../types/moorhen";
import { MoorhenContextButtonBase } from "./MoorhenContextButtonBase";
import { libcootApi } from "../../types/libcoot";
import { Button, Card, Overlay, Stack } from "react-bootstrap";
import { ArrowBackIosOutlined, ArrowForwardIosOutlined, CheckOutlined, CloseOutlined, FirstPageOutlined } from "@mui/icons-material";
import Draggable from "react-draggable";

export const MoorhenRotamerChangeButton = (props: moorhen.EditButtonProps | moorhen.ContextButtonProps) => {
    const theButton = useRef<null | HTMLButtonElement>(null)
    const fragmentMolecule = useRef<null | moorhen.Molecule>(null)
    const chosenMolecule = useRef<null | moorhen.Molecule>(null)
    const selectedFragmentRef = useRef<{ cid: string; alt_conf: string; }>({ cid: '', alt_conf: '' })
    const [showAccept, setShowAccept] = useState<boolean>(false)
    const [rotamerName, setRotamerName] = useState<string>('')
    const [rotamerRank, setRotamerRank] = useState<number| null>(null)
    const [rotamerProbability, setRotamerProbability] = useState<number | null>(null)
    
    const changeRotamer = useCallback(async (command: string) => {
        const rotamerInfo = await props.commandCentre.current.cootCommand({
            returnType: 'rotamer_info_t',
            command: command,
            commandArgs: [fragmentMolecule.current.molNo, selectedFragmentRef.current.cid, selectedFragmentRef.current.alt_conf],
        }, true) as moorhen.WorkerResponse<libcootApi.RotamerInfoJS>
        
        fragmentMolecule.current.atomsDirty = true
        fragmentMolecule.current.clearBuffersOfStyle('selection', props.glRef)
        fragmentMolecule.current.drawSelection(props.glRef, selectedFragmentRef.current.cid)
        await fragmentMolecule.current.redraw(props.glRef)
        
        return rotamerInfo
    
    }, [props.commandCentre, props.glRef])

    const acceptTransform = useCallback(async () => {
        await props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'replace_fragment',
            commandArgs: [chosenMolecule.current.molNo, fragmentMolecule.current.molNo, selectedFragmentRef.current.cid],
        }, true)
        
        chosenMolecule.current.atomsDirty = true
        await chosenMolecule.current.redraw(props.glRef)
        props.changeMolecules({ action: 'Remove', item: fragmentMolecule.current })
        fragmentMolecule.current.delete(props.glRef)
        chosenMolecule.current.unhideAll(props.glRef)
        
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: chosenMolecule.current.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
    
    }, [props.changeMolecules, props.glRef, props.commandCentre])

    const rejectTransform = useCallback(async () => {
        props.changeMolecules({ action: 'Remove', item: fragmentMolecule.current })
        fragmentMolecule.current.delete(props.glRef)
        chosenMolecule.current.unhideAll(props.glRef)
    }, [props.changeMolecules, props.glRef])

    const doRotamerChange = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, p: string = '') => {
        chosenMolecule.current = molecule
        selectedFragmentRef.current.cid = `//${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`
        selectedFragmentRef.current.alt_conf = chosenAtom.alt_conf === "" ? "" : chosenAtom.alt_conf
        if (!selectedFragmentRef.current.cid) {
            return
        }
        chosenMolecule.current.hideCid(selectedFragmentRef.current.cid, props.glRef)
        
        /* Copy the component to move into a new molecule */
        const newMolecule = await molecule.copyFragmentUsingCid(selectedFragmentRef.current.cid, props.backgroundColor, props.defaultBondSmoothness, props.glRef, false)
        
        /* Next rotaner */
        const rotamerInfo = await props.commandCentre.current.cootCommand({
            returnType: 'rotamer_info_t',
            command: 'change_to_next_rotamer',
            commandArgs: [newMolecule.molNo, selectedFragmentRef.current.cid, selectedFragmentRef.current.alt_conf],
        }, true) as moorhen.WorkerResponse<libcootApi.RotamerInfoJS>
        
        /* redraw */
        newMolecule.drawSelection(props.glRef, selectedFragmentRef.current.cid)
        await newMolecule.updateAtoms()
        Object.keys(molecule.displayObjects)
            .filter(style => { return ['CRs', 'CBs', 'ligands', 'gaussian', 'MolecularSurface', 'VdWSurface', 'DishyBases', 'VdwSpheres', 'allHBonds'].includes(style) })
            .forEach(async style => {
                if (molecule.displayObjects[style].length > 0 &&
                    molecule.displayObjects[style][0].visible) {
                    await newMolecule.drawWithStyleFromAtoms(style, props.glRef)
                }
        })
        
        fragmentMolecule.current = newMolecule
        props.changeMolecules({ action: "Add", item: newMolecule })
        return rotamerInfo
    }
    
    if (props.mode === 'context') {

        const getPopOverContents = (rotamerInfo: moorhen.WorkerResponse<libcootApi.RotamerInfoJS>) =>{
            const rotamerName = rotamerInfo.data.result.result.name
            const rotamerRank = rotamerInfo.data.result.result.rank
            const rotamerProbability = rotamerInfo.data.result.result.richardson_probability

            return <Draggable>
                    <Card style={{position: 'absolute', width: '15rem', cursor: 'move'}} onMouseOver={() => props.setOpacity(1)} onMouseOut={() => props.setOpacity(0.5)}>
                      <Card.Header>Accept new rotamer ?</Card.Header>
                      <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                      <span>Current rotamer: {rotamerName} ({rotamerRank+1}<sup>{rotamerRank === 0 ? 'st' : rotamerRank === 1 ? 'nd' : rotamerRank === 2 ? 'rd' : 'th'}</sup>)</span>
                      <br></br>
                      <span>Probability: {rotamerProbability}%</span>
                        <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                            <Button onClick={async () => {
                                const rotamerInfo = await changeRotamer('change_to_first_rotamer')
                                props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
                                }}><FirstPageOutlined/></Button>
                            <Button onClick={async () => {
                                const rotamerInfo = await changeRotamer('change_to_previous_rotamer')
                                props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
                            }}><ArrowBackIosOutlined/></Button>
                            <Button onClick={async () => {
                                const rotamerInfo = await changeRotamer('change_to_next_rotamer')
                                props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
                            }}><ArrowForwardIosOutlined/></Button>
                        </Stack>
                        <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                          <Button onClick={() => {
                                acceptTransform()
                                props.setOpacity(0.5)
                                props.setOverrideMenuContents(false)
                                props.setShowContextMenu(false)
                          }}><CheckOutlined /></Button>
                          <Button className="mx-2" onClick={() => {
                                rejectTransform()
                                props.setOpacity(0.5)
                                props.setOverrideMenuContents(false)
                                props.setShowContextMenu(false)
                          }}><CloseOutlined /></Button>
                        </Stack>
                      </Card.Body>
                    </Card>
                  </Draggable>
        }
    
        const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, p: string) => {
            const rotamerInfo = await doRotamerChange(molecule, chosenAtom, p)
            props.setOpacity(0.5)
            props.setOverrideMenuContents(getPopOverContents(rotamerInfo))
        }

        return <MoorhenContextButtonBase 
                    icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} alt="change rotamer" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rotamers.svg`}/>}
                    toolTipLabel="Change rotamers"
                    nonCootCommand={nonCootCommand}
                    {...props}
                />

    } else {

        const nonCootCommand = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
            const rotamerInfo = await doRotamerChange(molecule, chosenAtom)
            setRotamerName(rotamerInfo.data.result.result.name)
            setRotamerRank(rotamerInfo.data.result.result.rank)
            setRotamerProbability(rotamerInfo.data.result.result.richardson_probability)
            setShowAccept(true)
        }
    
        return <><MoorhenEditButtonBase
                    ref={theButton}
                    toolTip="Next rotamer"
                    buttonIndex={props.buttonIndex}
                    selectedButtonIndex={props.selectedButtonIndex}
                    setSelectedButtonIndex={props.setSelectedButtonIndex}
                    needsMapData={false}
                    cootCommand={false}
                    nonCootCommand={nonCootCommand}
                    prompt="Click atom in residue to change rotamers"
                    icon={<img style={{ width: '100%', height: '100%' }} alt="change rotamer" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rotamers.svg`} />}
                    {...props}
                />
                <Overlay target={theButton.current} show={showAccept} placement="top">
                    {({ placement, arrowProps, show: _show, popper, ...props }) => (
                        <div
                            {...props}
                            style={{
                                position: 'absolute', padding: '2px 10px', borderRadius: 3,
                                backgroundColor: props.backgroundColor, zIndex: 99999,
                                ...props.style,
                            }}
                        >
                            <Card className="mx-2">
                                <Card.Header >Accept rotamer ?</Card.Header>
                                <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                                    <span>Current rotamer: {rotamerName} ({rotamerRank + 1}<sup>{rotamerRank === 0 ? 'st' : rotamerRank === 1 ? 'nd' : rotamerRank === 2 ? 'rd' : 'th'}</sup>)</span>
                                    <br></br>
                                    <span>Probability: {rotamerProbability}%</span>
                                    <Stack gap={2} direction='horizontal' style={{ paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                                        <Button onClick={async () => {
                                            const rotamerInfo = await changeRotamer('change_to_first_rotamer')
                                            setRotamerName(rotamerInfo.data.result.result.name)
                                            setRotamerRank(rotamerInfo.data.result.result.rank)
                                            setRotamerProbability(rotamerInfo.data.result.result.richardson_probability)                                    
                                        }}><FirstPageOutlined /></Button>
                                        <Button onClick={async () => {
                                            const rotamerInfo = await changeRotamer('change_to_previous_rotamer')
                                            setRotamerName(rotamerInfo.data.result.result.name)
                                            setRotamerRank(rotamerInfo.data.result.result.rank)
                                            setRotamerProbability(rotamerInfo.data.result.result.richardson_probability)                                    
                                        }}><ArrowBackIosOutlined /></Button>
                                        <Button onClick={async () => {
                                            const rotamerInfo = await changeRotamer('change_to_next_rotamer')
                                            setRotamerName(rotamerInfo.data.result.result.name)
                                            setRotamerRank(rotamerInfo.data.result.result.rank)
                                            setRotamerProbability(rotamerInfo.data.result.result.richardson_probability)                                    
                                        }}><ArrowForwardIosOutlined /></Button>
                                    </Stack>
                                    <Stack gap={2} direction='horizontal' style={{ paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                                        <Button onClick={() => {
                                            acceptTransform()
                                            setShowAccept(false)
                                        }}><CheckOutlined /></Button>
                                        <Button className="mx-2" onClick={() => {
                                            rejectTransform()
                                            setShowAccept(false)
                                        }}><CloseOutlined /></Button>
                                    </Stack>
                                </Card.Body>
                            </Card>
                        </div>
                    )}
                </Overlay>
        </>
    }
}

