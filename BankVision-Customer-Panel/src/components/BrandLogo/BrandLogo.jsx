import { Box } from '@mui/material';
import logoImage from '../../assets/images/bank-logo.png';

const BrandLogo = ({ size = 'medium' }) => {
  // Responsive heights (xs/sm) so the logo shrinks on short mobile viewports
  // instead of pushing the rest of the form below the fold.
  const sizes = {
    small: { xs: 30, sm: 40 },
    medium: { xs: 40, sm: 60 },
    large: { xs: 56, sm: 80 },
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
      <Box
        component="img"
        src={logoImage}
        alt="Mutual Trust Bank PLC"
        sx={{
          height: currentSize,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
        }}
      />
    </Box>
  );
};

export default BrandLogo;
