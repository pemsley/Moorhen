import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MoorhenAboutMenuItem } from "../menu-item/MoorhenAboutMenuItem";
import { MoorhenControlsModal } from "../modal/MoorhenControlsModal";
import { MoorhenSearchBar } from "../misc/MoorhenSearchBar"
import { MenuItem } from "@mui/material";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";

export const MoorhenHelpMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [showControlsModal, setShowControlsModal] = useState<boolean>(false)
    const menuItemProps = {setPopoverIsShown, ...props}
    
    return <>
            < NavDropdown 
                title="Help" 
                id="help-nav-dropdown" 
                style={{display:'flex', alignItems:'center'}}
                autoClose={popoverIsShown ? false : 'outside'}
                show={props.currentDropdownId === props.dropdownId}
                onToggle={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId('-1')}}>
                     <MoorhenSearchBar {...props}/>
                     <hr></hr>
                     <MenuItem onClick={() => window.open('https://filomenosanchez.github.io/Moorhen/')}>Go to Moorhen blog...</MenuItem>
                     <MenuItem onClick={() => setShowControlsModal(true)}>Show controls...</MenuItem>
                     <MoorhenAboutMenuItem {...menuItemProps} />
            </NavDropdown >
            <MoorhenControlsModal {...props} showControlsModal={showControlsModal} setShowControlsModal={setShowControlsModal} />
        </>
}
