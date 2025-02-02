import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MoorhenMapMaskingMenuItem } from "../menu-item/MoorhenMapMaskingMenuItem";
import { MoorhenSharpenBlurMapMenuItem } from "../menu-item/MoorhenSharpenBlurMapMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";

export const MoorhenCryoMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
        < NavDropdown
            title="Cryo"
            id="cryo-nav-dropdown"
            style={{ display: 'flex', alignItems: 'center' }}
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId('-1') }}>
            <MoorhenSharpenBlurMapMenuItem {...menuItemProps} />
            <MoorhenMapMaskingMenuItem  {...menuItemProps} />
        </NavDropdown>
    </>
}
