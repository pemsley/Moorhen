import { useState } from "react"
import { Col, Row, Form, Card, Button } from 'react-bootstrap';
import { MoorhenSideBarAccordionPropsInterface } from "../list/MoorhenSideBar";
import { moorhen } from "../../types/moorhen";
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase"
import MoorhenSlider from '../misc/MoorhenSlider' 
import { libcootApi } from "../../types/libcoot";

export const MoorhenPepflipsDifferenceMap = (props: MoorhenSideBarAccordionPropsInterface) => {
    const [selectedRmsd, setSelectedRmsd] = useState<number>(4.5)
    
    const filterMapFunction = (map: moorhen.Map) => map.isDifference

    const flipPeptide = async (selectedMolNo: number, chainId: string, insCode: string,  seqNum: number) => {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "flipPeptide_cid",
            commandArgs: [selectedMolNo, `/${insCode}/${chainId}/${seqNum}/C`, ''],
            changesMolecules: [selectedMolNo]
        }, true)

        if (props.refineAfterMod) {
            await props.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'refine_residues_using_atom_cid',
                commandArgs: [selectedMolNo, `/${insCode}/${chainId}/${seqNum}`, 'TRIPLE', 4000],
                changesMolecules: [selectedMolNo]
            }, true)    
        }

        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedMolNo)
        selectedMolecule.setAtomsDirty(true)
        selectedMolecule.redraw(props.glRef)
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: {origin: props.glRef.current.origin,  modifiedMolecule: selectedMolecule.molNo} })
        document.dispatchEvent(scoresUpdateEvent)
    }

    const handleFlip = (...args: [number, string, string, number]) => {
        if (args.every(arg => arg !== null)) {
            flipPeptide(...args)
        }
    }

    const fetchCardData = async (selectedModel: number, selectedMap: number): Promise<libcootApi.InterestingPlaceDataJS[]> => {

        if (selectedRmsd === null) {
            return null
        }
        
        const inputData: moorhen.cootCommandKwargs = {
            message:'coot_command',
            command: "pepflips_using_difference_map", 
            returnType:'interesting_places_data',
            commandArgs:[selectedModel, selectedMap, selectedRmsd]
        }
        
        let response = await props.commandCentre.current.cootCommand(inputData) as moorhen.WorkerResponse<libcootApi.InterestingPlaceDataJS[]>
        let newPepflips = response.data.result.result

        return newPepflips
    }
    
    const getCards = (selectedModel: number, selectedMap: number, newPepflips: libcootApi.InterestingPlaceDataJS[]): JSX.Element[] => {

        return newPepflips.map((flip, index) => {
            return <Card key={index} style={{marginTop: '0.5rem'}}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {flip.buttonLabel}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                            props.glRef.current.setOriginAnimated([-flip.coordX, -flip.coordY, -flip.coordZ])
                                }}>
                                    View
                                </Button>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                            handleFlip(selectedModel, flip.chainId, flip.insCode,  flip.resNum)
                                }}>
                                    Flip
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
        })

    }

    return <MoorhenValidationListWidgetBase 
                molecules={props.molecules}
                maps={props.maps}
                backgroundColor={props.backgroundColor}
                sideBarWidth={props.sideBarWidth}
                dropdownId={props.dropdownId}
                accordionDropdownId={props.accordionDropdownId}
                showSideBar={props.showSideBar}
                filterMapFunction={filterMapFunction}
                fetchData={fetchCardData}
                getCards={getCards}
                extraControlFormValue={selectedRmsd}
                extraControlForm={
                    <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                        <Form.Group controlId="rmsdSlider" style={{margin:'0.5rem', width: '100%'}}>
                            <MoorhenSlider minVal={2.5} maxVal={7.0} logScale={false} sliderTitle="RMSD" initialValue={4.5} externalValue={selectedRmsd} setExternalValue={setSelectedRmsd}/>
                        </Form.Group>
                    </Col>
                }
            />
}
