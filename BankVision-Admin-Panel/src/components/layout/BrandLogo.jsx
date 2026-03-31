import { Box } from '@mui/material';
import logoImage from '../../assets/images/bank-logo.png';

const BrandLogo = ({ size = 'medium', sx = {} }) => {
    const sizes = {
        small: {
            height: 32,
        },
        medium: {
            height: 48,
        },
        large: {
            height: 64,
        },
    };

    const currentSize = sizes[size] || sizes.medium;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                ...sx,
            }}
        >
            <img
                src={logoImage}
                alt="Mutual Trust Bank PLC"
                style={{
                    height: currentSize.height,
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                }}
            />
        </Box>
    );
};

export default BrandLogo;
