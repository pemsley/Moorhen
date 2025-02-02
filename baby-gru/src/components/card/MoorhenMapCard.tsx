import { useEffect, useState, useRef, useCallback, useMemo, Fragment } from "react";
import { Card, Form, Button, Col, DropdownButton, Stack, Dropdown, OverlayTrigger, ToggleButton } from "react-bootstrap";
import { doDownload } from '../../utils/MoorhenUtils';
import { getNameLabel } from "./cardUtils"
import { VisibilityOffOutlined, VisibilityOutlined, ExpandMoreOutlined, ExpandLessOutlined, DownloadOutlined, Settings, FileCopyOutlined, RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined, AddOutlined, RemoveOutlined } from '@mui/icons-material';
import { MoorhenMapSettingsMenuItem } from "../menu-item/MoorhenMapSettingsMenuItem";
import { MoorhenRenameDisplayObjectMenuItem } from "../menu-item/MoorhenRenameDisplayObjectMenuItem"
import { MoorhenDeleteDisplayObjectMenuItem } from "../menu-item/MoorhenDeleteDisplayObjectMenuItem"
import MoorhenSlider from "../misc/MoorhenSlider";
import { IconButton, MenuItem, Tooltip } from "@mui/material";
import { SketchPicker } from "react-color";
import { MoorhenSideBarAccordionPropsInterface } from '../list/MoorhenSideBar';
import { moorhen } from "../../types/moorhen"

type ActionButtonType = {
    label: string;
    compressed: () => JSX.Element;
    expanded: null | ( () => JSX.Element );
}

interface MoorhenMapCardPropsInterface extends MoorhenSideBarAccordionPropsInterface {
    key: number;
    index: number;
    map: moorhen.Map;
    initialContour: number;
    initialRadius: number;
    currentDropdownMolNo: number;
    setCurrentDropdownMolNo: React.Dispatch<React.SetStateAction<number>>;
}

export const MoorhenMapCard = (props: MoorhenMapCardPropsInterface) => {
    const [cootContour, setCootContour] = useState<boolean>(true)
    const [mapRadius, setMapRadius] = useState<number>(props.initialRadius)
    const [mapContourLevel, setMapContourLevel] = useState<number>(props.initialContour)
    const [mapLitLines, setMapLitLines] = useState<boolean>(props.defaultMapLitLines)
    const [mapSolid, setMapSolid] = useState<boolean>(props.defaultMapSurface)
    const [mapOpacity, setMapOpacity] = useState<number>(1.0)
    const [isCollapsed, setIsCollapsed] = useState<boolean>(!props.defaultExpandDisplayCards);
    const [currentName, setCurrentName] = useState<string>(props.map.name);
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [mapColour, setMapColour] = useState<{ r: number; g: number; b: number; } | null>(null)
    const nextOrigin = useRef<number[]>([])
    const busyContouring = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)

    useEffect(() => {
        props.map.fetchMapRmsd()
        setMapColour({
            r: 255 * props.map.rgba.r,
            g: 255 * props.map.rgba.g,
            b: 255 * props.map.rgba.b,
        })
    }, [])

    const handleColorChange = (color: { rgb: {r: number; g: number; b: number;} }) => {
        try {
            props.map.setColour(color.rgb.r / 255., color.rgb.g / 255., color.rgb.b / 255., props.glRef)
            setMapColour({r: color.rgb.r, g: color.rgb.g, b: color.rgb.b})
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const mapSettingsProps = {
        mapOpacity, setMapOpacity, mapSolid, setMapSolid, mapLitLines, setMapLitLines, setPopoverIsShown, glRef: props.glRef, map: props.map
    }

    const handleDownload = async () => {
        let response = await props.map.getMap()
        doDownload([response.data.result.mapData], `${props.map.name.replace('.mtz', '.map')}`)
        props.setCurrentDropdownMolNo(-1)
    }

    const handleVisibility = () => {
        if (!cootContour) {
            props.map.mapRadius = mapRadius
            props.map.makeCootLive(props.glRef)
            setCootContour(true)
        } else {
            props.map.makeCootUnlive(props.glRef)
            setCootContour(false)
        }
        props.setCurrentDropdownMolNo(-1)
    }

    const handleDuplicate = async () => {
        const newMap = await props.map.duplicate()
        return props.changeMaps({ action: "Add", item: newMap })
    }

    const actionButtons: { [key: number] : ActionButtonType } = {
        1: {
            label: cootContour ? "Hide map" : "Show map",
            compressed: () => { return (<MenuItem key='hide-show-map' onClick={handleVisibility}>{cootContour ? "Hide map" : "Show map"}</MenuItem>) },
            expanded: () => {
                return (<Button key='hide-show-map' size="sm" variant="outlined" onClick={handleVisibility}>
                    {cootContour ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                </Button>)
            },
        },
        2: {
            label: "Download Map",
            compressed: () => { return (<MenuItem key='donwload-map' onClick={handleDownload}>Download map</MenuItem>) },
            expanded: () => {
                return (<Button key='donwload-map' size="sm" variant="outlined" onClick={handleDownload}>
                    <DownloadOutlined />
                </Button>)
            },
        },
        3: {
            label: 'Rename map',
            compressed: () => { return (<MoorhenRenameDisplayObjectMenuItem key='rename-map' setPopoverIsShown={setPopoverIsShown} setCurrentName={setCurrentName} item={props.map} />) },
            expanded: null
        },
        4: {
            label: "Map draw settings",
            compressed: () => { return (<MoorhenMapSettingsMenuItem key='map-draw-settings' disabled={!cootContour} {...mapSettingsProps} />) },
            expanded: null
        },
        5: {
            label: "Duplicate map",
            compressed: () => { return (<MenuItem key='duplicate-map' onClick={handleDuplicate}>Duplicate map</MenuItem>) },
            expanded: () => {
                return (<Button key='duplicate-map' size="sm" variant="outlined" onClick={handleDuplicate}>
                    <FileCopyOutlined />
                </Button>)
            },
        },
        6: {
            label: "Centre on map",
            compressed: () => { return (<MenuItem key='centre-on-map'onClick={() => props.map.centreOnMap(props.glRef)}>Centre on map</MenuItem>) },
            expanded: null
        },
    }

    const getButtonBar = (sideBarWidth: number) => {
        const maximumAllowedWidth = sideBarWidth * 0.55
        let currentlyUsedWidth = 0
        let expandedButtons: JSX.Element[] = []
        let compressedButtons: JSX.Element[] = []

        Object.keys(actionButtons).forEach(key => {
            if (actionButtons[key].expanded === null) {
                compressedButtons.push(actionButtons[key].compressed())
            } else {
                currentlyUsedWidth += 60
                if (currentlyUsedWidth < maximumAllowedWidth) {
                    expandedButtons.push(actionButtons[key].expanded())
                } else {
                    compressedButtons.push(actionButtons[key].compressed())
                }
            }
        })

        compressedButtons.push((
            <MoorhenDeleteDisplayObjectMenuItem
                key='delete-map'
                setPopoverIsShown={setPopoverIsShown}
                glRef={props.glRef}
                changeItemList={props.changeMaps}
                item={props.map}
                setActiveMap={props.setActiveMap}
                activeMap={props.activeMap} />
        ))

        return <Fragment>
            {expandedButtons}
            <DropdownButton
                title={<Settings />}
                size="sm"
                variant="outlined"
                autoClose={popoverIsShown ? false : 'outside'}
                show={props.currentDropdownMolNo === props.map.molNo}
                onToggle={() => { props.map.molNo !== props.currentDropdownMolNo ? props.setCurrentDropdownMolNo(props.map.molNo) : props.setCurrentDropdownMolNo(-1) }}>
                {compressedButtons}
            </DropdownButton>
            <Button size="sm" variant="outlined"
                onClick={() => {
                    setIsCollapsed(!isCollapsed)
                }}>
                {isCollapsed ? < ExpandMoreOutlined /> : <ExpandLessOutlined />}
            </Button>
        </Fragment>
    }

    const doContourIfDirty = () => {
        if (isDirty.current) {
            busyContouring.current = true
            isDirty.current = false
            props.map.doCootContour(props.glRef,
                ...nextOrigin.current as [number, number, number],
                props.map.mapRadius,
                props.map.contourLevel)
                .then(() => {
                    busyContouring.current = false
                    doContourIfDirty()
                })
        }
    }

    const handleOriginUpdate = useCallback((evt: moorhen.OriginUpdateEvent) => {
        nextOrigin.current = [...evt.detail.origin.map((coord: number) => -coord)]
        props.map.contourLevel = mapContourLevel
        props.map.mapRadius = mapRadius
        isDirty.current = true
        if (props.map.cootContour) {
            if (!busyContouring.current) {
                doContourIfDirty()
            }
        }
    }, [mapContourLevel, mapRadius])

    const handleWheelContourLevelCallback = useCallback((evt: moorhen.WheelContourLevelEvent) => {
        let newMapContourLevel: number
        if (props.map.cootContour && props.map.molNo === props.activeMap.molNo) {
            if (evt.detail.factor > 1) {
                newMapContourLevel = mapContourLevel + props.contourWheelSensitivityFactor
            } else {
                newMapContourLevel = mapContourLevel - props.contourWheelSensitivityFactor
            }
            
            setMapContourLevel(newMapContourLevel)
            props.setToastContent(
                <h5 style={{margin: 0}}>
                    <span>
                        {`Level: ${newMapContourLevel.toFixed(2)} ${props.map.mapRmsd ? '(' + (newMapContourLevel / props.map.mapRmsd).toFixed(2) + ' rmsd)' : ''}`}
                    </span>
                </h5>
            )
    
        }
    }, [mapContourLevel, mapRadius, props.activeMap?.molNo, props.map.molNo, props.map.cootContour])

    const handleRadiusChangeCallback = useCallback((evt: moorhen.MapRadiusChangeEvent) => {
        if (props.map.cootContour && props.map.molNo === props.activeMap.molNo) {
            setMapRadius(mapRadius + evt.detail.factor)
        }
    }, [mapRadius, props.activeMap?.molNo, props.map.molNo, props.map.cootContour])

    const handleNewMapContour = useCallback((evt: moorhen.NewMapContourEvent) => {
        if (props.map.molNo === evt.detail.molNo) {
            setCootContour(evt.detail.cootContour)
            setMapContourLevel(evt.detail.contourLevel)
            setMapLitLines(evt.detail.litLines)
            setMapRadius(evt.detail.mapRadius)
        }
    }, [props.map.molNo])

    useMemo(() => {
        if (currentName === "") {
            return
        }
        props.map.name = currentName

    }, [currentName]);

    useEffect(() => {
        document.addEventListener("originUpdate", handleOriginUpdate);
        document.addEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
        document.addEventListener("newMapContour", handleNewMapContour);
        document.addEventListener("mapRadiusChanged", handleRadiusChangeCallback);
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate);
            document.removeEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback);
            document.removeEventListener("newMapContour", handleNewMapContour);
            document.removeEventListener("mapRadiusChanged", handleRadiusChangeCallback);
        };
    }, [handleOriginUpdate, props.activeMap?.molNo]);

    useEffect(() => {
        props.map.setAlpha(mapOpacity, props.glRef)
    }, [mapOpacity])

    useEffect(() => {
        setCootContour(props.map.cootContour)
        nextOrigin.current = props.glRef.current.origin.map(coord => -coord)
        props.map.litLines = mapLitLines
        props.map.solid = mapSolid
        props.map.contourLevel = mapContourLevel
        props.map.mapRadius = mapRadius
        isDirty.current = true
        if (props.map.cootContour && !busyContouring.current) {
            doContourIfDirty()
        }

    }, [mapRadius, mapContourLevel, mapLitLines, mapSolid])

    const increaseLevelButton = <IconButton onClick={() => setMapContourLevel(mapContourLevel + props.contourWheelSensitivityFactor)} style={{padding: 0}}>
                                    <AddOutlined/>
                                </IconButton>
    const decreaseLevelButton = <IconButton onClick={() => setMapContourLevel(mapContourLevel - props.contourWheelSensitivityFactor)} style={{padding: 0}}>
                                    <RemoveOutlined/>
                                </IconButton>
    const increaseRadiusButton = <IconButton onClick={() => setMapRadius(mapRadius + 2)} style={{padding: 0}}>
                                    <AddOutlined/>
                                </IconButton>
    const decreaseRadiusButton = <IconButton onClick={() => setMapRadius(mapRadius - 2)} style={{padding: 0}}>
                                    <RemoveOutlined/>
                                </IconButton>

    const getMapColourSelector = () => {
        if (mapColour === null) {
            return null
        }

        const dropdown =  
        <Dropdown>
            <Dropdown.Toggle variant="outlined" className="map-colour-dropdown">
                <div style={{
                    width: '20px', 
                    height: '20px', 
                    background: props.map.isDifference ? 'linear-gradient( -45deg, green, green 49%, white 49%, white 51%, red 51% )' : `rgb(${mapColour.r},${mapColour.g},${mapColour.b})`, 
                    borderRadius: '50%'
                }}/>
            </Dropdown.Toggle>
            <Dropdown.Menu style={{display: props.map.isDifference ? 'none' : '', padding: 0, margin: 0, zIndex: 9999}}>
                <SketchPicker color={mapColour} onChange={handleColorChange} disableAlpha={true} />
            </Dropdown.Menu>
        </Dropdown>

        if (props.map.isDifference) {
            return <>{dropdown}</>
        } 

        return <OverlayTrigger
                placement="bottom"
                overlay={
                    <Tooltip 
                        id="map-colour-label-tooltip" 
                        title=""
                        style={{
                            zIndex: 9999,
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            padding: '2px 10px',
                            color: 'white',
                            borderRadius: 3,
                        }}>
                            <div>
                                Change map colour
                            </div>
                    </Tooltip>
                }>
                   {dropdown}
                </OverlayTrigger>
    }

    return <Card className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.map.molNo}>
        <Card.Header style={{ padding: '0.1rem' }}>
            <Stack gap={2} direction='horizontal'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left', color: props.isDark ? 'white' : 'black' }}>
                    {getNameLabel(props.map)}
                    {getMapColourSelector()}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                    {getButtonBar(props.sideBarWidth)}
                </Col>
            </Stack>
        </Card.Header>
        <Card.Body style={{ display: isCollapsed ? 'none' : '', padding: '0.5rem' }}>
            <Stack direction='horizontal' gap={4}>
                <ToggleButton
                    type="checkbox"
                    variant={props.isDark ? "outline-light" : "outline-primary"}
                    checked={props.map === props.activeMap}
                    style={{ marginLeft: '0.1rem', marginRight: '0.5rem', justifyContent: 'space-betweeen', display: 'flex' }}
                    onClick={() => props.setActiveMap(props.map)}
                    value={""}                >
                    {props.map === props.activeMap ? <RadioButtonCheckedOutlined/> : <RadioButtonUncheckedOutlined/>}
                    <span style={{marginLeft: '0.5rem'}}>Active</span>
                </ToggleButton>
                <Col>
                    <Form.Group controlId="contouringLevel" className="mb-3">
                        <span>{`Lvl: ${mapContourLevel.toFixed(2)} ${props.map.mapRmsd ? '(' + (mapContourLevel / props.map.mapRmsd).toFixed(2) + ' rmsd)' : ''}`}</span>
                        <MoorhenSlider
                            minVal={0.001}
                            maxVal={5}
                            showMinMaxVal={false}
                            decrementButton={decreaseLevelButton}
                            incrementButton={increaseLevelButton}
                            allowExternalFeedback={true}
                            logScale={true}
                            showSliderTitle={false}
                            isDisabled={!cootContour}
                            initialValue={props.initialContour}
                            externalValue={mapContourLevel}
                            setExternalValue={setMapContourLevel}
                        />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group controlId="contouringRadius" className="mb-3">
                        <MoorhenSlider
                            minVal={0.01}
                            maxVal={100}
                            showMinMaxVal={false}
                            decrementButton={decreaseRadiusButton} 
                            incrementButton={increaseRadiusButton} 
                            allowExternalFeedback={true} 
                            logScale={false} 
                            sliderTitle="Radius" 
                            decimalPlaces={2} 
                            isDisabled={!cootContour} 
                            initialValue={props.initialRadius} 
                            externalValue={mapRadius} 
                            setExternalValue={setMapRadius}
                        />
                    </Form.Group>
                </Col>
            </Stack>
        </Card.Body>
    </Card >
}

