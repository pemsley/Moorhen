import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MoorhenAboutMenuItem } from "./MoorhenMenuItem";
import { MenuItem } from "@mui/material";

export const MoorhenHelpMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
            < NavDropdown 
                title="Help" 
                id="help-nav-dropdown" 
                style={{display:'flex', alignItems:'center'}}
                autoClose={popoverIsShown ? false : 'outside'}
                show={props.currentDropdownId === props.dropdownId}
                onToggle={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
                    {/**<MoorhenSearchBar {...props}/>
                     *<hr></hr>
                    */}
                     <MenuItem onClick={() => window.open('https://filomenosanchez.github.io/Moorhen/')}>Go to Moorhen blog...</MenuItem>
                    <MoorhenAboutMenuItem {...menuItemProps} />
            </NavDropdown >
        </>
    }
