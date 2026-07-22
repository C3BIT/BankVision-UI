import {
    Box,
} from '@mui/material';
import PropTypes from 'prop-types';

const AppLayout = ({ children }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: { xs: '100dvh', sm: '100vh' } }}>
            <Box component="main" sx={{ flexGrow: 1 }}>
                {children}
            </Box>
        </Box>
    );
};

AppLayout.propTypes = {
    children: PropTypes.node.isRequired,
};

export default AppLayout;
