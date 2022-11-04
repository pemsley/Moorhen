import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import VolumeDown from '@mui/icons-material/VolumeDown';
import VolumeUp from '@mui/icons-material/VolumeUp';

export default function BabyGruSlider(props) {
    const [value, setValue] = React.useState(props.intialValue);
    const setValueTimer = React.createRef(null)
    const [externalValue, setExternalValue] = React.useState(5)

    React.useEffect(() => {
        props.setExternalValue(parseFloat(externalValue))
    }, [externalValue])

    const handleChange = (event, newValue) => {
        setValue(newValue);
        if (props.logScale) {
            const log10MaxVal = Math.log10(props.maxVal)
            const log10MinVal = Math.log10(Math.max(props.minVal, 0.00000001))
            const log10NewVal = log10MinVal + (newValue/100) * (log10MaxVal-log10MinVal)
            const newVal = Math.pow(10., log10NewVal)
            setExternalValue(newVal)
        }
        else {
            setExternalValue(props.minVal + (newValue/100.)*(props.maxVal-props.minVal))
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <span>{props.sliderTitle}: {props.externalValue.toFixed(3)}</span>
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                {props.minVal}
                <Slider value={value} onChange={handleChange} />
                {props.maxVal}
            </Stack>
        </Box>
    );
}
BabyGruSlider.defaultProps={
    minVal:0, maxVal:100, setExternalValue:()=>{}, logScale:false
}