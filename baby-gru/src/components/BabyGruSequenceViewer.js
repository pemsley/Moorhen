import { useEffect, useRef, useState, useCallback } from "react"
import { residueCodesOneToThree, nucleotideCodesOneToThree } from '../utils/BabyGruUtils'
import ProtvistaManager from "protvista-manager";
import ProtvistaSequence from "protvista-sequence";
import ProtvistaNavigation from "protvista-navigation";
import ProtvistaTrack from "protvista-track";

window.customElements.define("protvista-navigation", ProtvistaNavigation);
window.customElements.define("protvista-sequence", ProtvistaSequence);
window.customElements.define("protvista-track", ProtvistaTrack);
window.customElements.define("protvista-manager", ProtvistaManager);
    
/**
* For a given sequence length, calculate the range of 40 residues in the middle
* @param {Number} rulerStart integer that determines where to start the ruler numbering
* @param {Number} sequenceLength sequence lenght
* @returns {Array} An array containing the display start and display end consisting of a range of 40 residues
*/
 const calculateDisplayStartAndEnd = (rulerStart, sequenceLength) => {
    if (sequenceLength <= 40) {
        return [parseFloat(rulerStart), parseFloat(sequenceLength + rulerStart)]
    }
    let middleIndex = Math.round((sequenceLength) / 2)
    return [parseFloat(middleIndex - 20 + rulerStart), parseFloat(middleIndex + 20 + rulerStart)]        
}

/**
* For a given sequence, obtain the actual sequence to be displayed with "-" as gaps
* @param {BabyGruMolecule.sequence.sequence} sequence
* @returns {Array} An array containing the ruler start, actual sequence length with gaps and the final sequence to be displayed
*/
const parseSequenceData = (sequence) => {
    let rulerStart = sequence[0].resNum
    let finalSequence = Array(sequence[sequence.length-1].resNum).fill('-')
    let seqLenght = sequence[sequence.length-1].resNum - rulerStart + 1

    sequence.forEach(residue => {
        finalSequence[residue.resNum - 1] = residue.resCode
    })

    return [rulerStart, seqLenght, finalSequence.join('')]
}


export const BabyGruSequenceViewer = (props) => {
    const managerRef = useRef(null);
    const sequenceRef = useRef(null);
    const navigationRef = useRef(null);
    const selectedResiduesTrackRef = useRef(null)
    const [message, setMessage] = useState("");
    const [rulerStart, seqLenght, displaySequence] = parseSequenceData(props.sequence.sequence)
    const [start, end] = calculateDisplayStartAndEnd(rulerStart, seqLenght);
    const hoveredResidueColor = '#FFEB3B66'
    const transparentColor = '#FFEB3B00'


    /**
     * Clear highlighted residue range
     */
    const clearSelection = () => {
        const dummyData = [
            {
                "accession": "backgroundLine",
                "color": "red",
                "shape": "line",
                "start": "",
                "end": ""
            },
            {
                "accession": "Outliers",
                "shape": "triangle",
                "color": "red",
                "locations": [{"fragments": []}]
            }
        ]

        selectedResiduesTrackRef.current.data = dummyData
    }
    
    /**
     * Sets a range of highlighted residues in the sequence viewer 
     * @param {Number} start The first residues of the range
     * @param {Number} end The last residue of the range
     */
    const setSelection = (start, end) => {

        let fragments = [{
            "start": start,
            "end": start
        }]

        if (end !== null) {
            fragments.push({
                "start": end,
                "end": end
            })
        }

        const selectedResiduesTrackData  = [
            {
                "accession": "backgroundLine",
                "color": "red",
                "shape": "line",
                "start": start,
                "end": end ? end : start
            },
            {
                "accession": "Outliers",
                "shape": "triangle",
                "color": "red",
                "locations": [{"fragments": fragments}]
            }
        ]
      
        selectedResiduesTrackRef.current.data = selectedResiduesTrackData
    }

    /**
     * Sets a highlighted residue in the sequence viewer 
     * @param {Number} start The first residues of the range
     * @param {Number} end The last residue of the range
     */
    const setHighlight = (resNum) => {
        sequenceRef.current.trackHighlighter.changedCallBack('highlightstart', resNum)
        sequenceRef.current.trackHighlighter.changedCallBack('highlightend', resNum)
    } 

    /**
     * Hook used to handle hovering events on the visualisation panel
     */
    useEffect(() => {
        if (props.hoveredAtom===null || props.hoveredAtom.molecule === null || props.hoveredAtom.cid === null || sequenceRef.current === null) {
            return
        }

        const [_, insCode, chainId, resInfo, atomName]   = props.hoveredAtom.cid.split('/')

        if (chainId !== props.sequence.chain || !resInfo) {
            return
        }
        
        const resNum = resInfo.split('(')[0]
        
        if (!resNum) {
            return
        }
        
        setMessage(props.hoveredAtom.cid)
        setHighlight(resNum)

    }, [props.hoveredAtom])

    
    /**
     * Callback to handle changes in the protvista component
     */
    const handleChange = useCallback((evt) => {
        if (evt.detail.eventtype === "click") {
            if (evt.detail.feature !== null && !(evt.detail.highlight.includes(','))) {
                props.setClickedResidue({modelIndex:0, molName:props.molecule.name, chain:props.sequence.chain, seqNum:evt.detail.feature.start})
                props.setSelectedResidues(null)
            } else if (evt.detail.highlight.includes(',')) {
                let residues;
                if (props.clickedResidue === null) {
                    props.setClickedResidue({modelIndex: 0, molName: props.molecule.name, chain: props.sequence.chain, seqNum: evt.detail.feature.start})
                    return
                } else if (props.selectedResidues === null || props.selectedResidues.length < 2){
                    residues = [props.clickedResidue.seqNum, evt.detail.feature.start]
                } else {
                    residues = [evt.detail.feature.start, ...props.selectedResidues]
                }
                props.setSelectedResidues([Math.min(...residues), Math.max(...residues)])
                props.setClickedResidue({modelIndex: 0, molName: props.molecule.name, chain: props.sequence.chain, seqNum: evt.detail.feature.start})
            }
        } else if (evt.detail.eventtype === "mouseover") {
            if (evt.detail.feature !== null) {
                const cid =`//${props.sequence.chain}/${evt.detail.feature.start}(${props.sequence.type==="polypeptide(L)" ? residueCodesOneToThree[evt.detail.feature.aa] : nucleotideCodesOneToThree[evt.detail.feature.aa]})/CA`
                props.setHoveredAtom({ molecule: props.molecule, cid: cid })
            }
        } else if (evt.detail.eventtype === "mouseout") {
            setMessage("")
        }
    }, [props.clickedResidue])


    /**
     * Hook used to control mouse events. Adds an event listener on the protvista-sequence component for mouse clicks 
     * and mouse over. It will also disable mouse double click.
     */
    useEffect(()=> {
        if (sequenceRef.current === null) {
            return;
        }

        const disableDoubleClick = (evt) => {
            console.log("Double-click is disabled in the sequence viewer...")
            evt.preventDefault()
            evt.stopPropagation()
        }
        
        sequenceRef.current.addEventListener("change", handleChange)
        sequenceRef.current.addEventListener('dblclick', disableDoubleClick, true)

        return () => {
            if (sequenceRef && sequenceRef.current) {
                sequenceRef.current.removeEventListener('change', handleChange);
                sequenceRef.current.removeEventListener('dblclick', disableDoubleClick, true);
            }
        };
        
    }, [handleChange]);    
    
    /**
     * Hook used to control mouse events. Adds an event listener on the protvista-sequence component for mouse clicks 
     * and mouse over. It will also disable mouse double click.
     */
    useEffect(()=> {       
        sequenceRef.current._displaystart = start
        sequenceRef.current._displayend = end
        sequenceRef.current.trackHighlighter.element._highlightcolor = hoveredResidueColor
        navigationRef.current._displaystart = start
        navigationRef.current._displayend = end
        selectedResiduesTrackRef.current._displaystart = start
        selectedResiduesTrackRef.current._displayend = end
        selectedResiduesTrackRef.current.trackHighlighter.element._highlightcolor = transparentColor
        
    }, []);    
    
    /**
     * Hook used to clear the current selection if user selects residue from different chain
     */
    useEffect(() => {       
        if (props.clickedResidue && props.clickedResidue.chain != props.sequence.chain) {
            clearSelection()
        } else if (props.clickedResidue && !props.selectedResidues) {
            setSelection(props.clickedResidue.seqNum, null)
        }

    }, [props.clickedResidue]);

    /**
     * Hook used to set a range of highlighted residues
     */
    useEffect(()=> {
        if (props.selectedResidues !== null  && props.clickedResidue.chain === props.sequence.chain) {
          setSelection(...props.selectedResidues)
        }
    }, [props.selectedResidues]);

    return (
        <div className='align-items-center' style={{marginBottom:'0', padding:'0'}}>
            <span>{`${props.molecule.name}${message ? "" : "/" + props.sequence.chain}${message}`}</span>
            <div style={{width: '100%'}}>
                <protvista-manager ref={managerRef}>
                    <protvista-navigation 
                        ref={navigationRef}
                        length={seqLenght}
                        rulerStart={rulerStart}
                        displaystart={start}
                        displayend={end}
                        use-ctrl-to-zoom
                        />
                    <protvista-sequence
                        ref={sequenceRef}
                        sequence={displaySequence}
                        length={seqLenght} 
                        numberofticks="10"
                        displaystart={start}
                        displayend={end}
                        use-ctrl-to-zoom
                        />
                    <protvista-track 
                        ref={selectedResiduesTrackRef}
                        length={seqLenght} 
                        displaystart={start}
                        displayend={end}
                        height='10'
                        use-ctrl-to-zoom
                        />
                </protvista-manager>
            </div>    
        </div>
    )
    
}
