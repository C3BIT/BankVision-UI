import { Box } from '@mui/material';
import logoImage from '../../assets/images/bank-logo.png';

const BrandLogo = ({ size = 'medium' }) => {
  const sizes = {
    small: {
      height: 40,
    },
    medium: {
      height: 60,
    },
    large: {
      height: 80,
    },
  };

  const currentSize = sizes[size];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
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
