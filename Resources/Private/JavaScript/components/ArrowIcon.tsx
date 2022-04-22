import React from 'react';
import styled from 'styled-components';

const IconSvg = styled.svg`
    transform: rotate(90deg);
    vertical-align: middle;
`

const ArrowIcon = ({ style }) => {
    return (
        <IconSvg
            style={style}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 384 512"
            width="10"
            height="14"
        >
            <path fill="currentColor"
                  d="M342.6 182.6C336.4 188.9 328.2 192 319.1 192s-16.38-3.125-22.62-9.375L224 109.3V432c0 44.13-35.89 80-80 80H32c-17.67 0-32-14.31-32-32s14.33-32 32-32h112C152.8 448 160 440.8 160 432V109.3L86.62 182.6c-12.5 12.5-32.75 12.5-45.25 0s-12.5-32.75 0-45.25l127.1-128c12.5-12.5 32.75-12.5 45.25 0l128 128C355.1 149.9 355.1 170.1 342.6 182.6z" />
        </IconSvg>
    )
}

export default React.memo(ArrowIcon);