import { List, ListItem, ListItemIcon, ListItemText, IconButton, Typography, Box } from '@mui/material';
import { Phone, Email, Home, AccountCircle, ChevronRight } from '@mui/icons-material';
import PropTypes from 'prop-types';

const ServicesList = ({ onServiceSelect }) => {
    const services = [
        { id: 'phoneChange', icon: <Phone color="primary" />, label: 'Mobile Number Change' },
        { id: 'emailChange', icon: <Email color="primary" />, label: 'Email Change' },
        { id: 'address', icon: <Home color="primary" />, label: 'Address Change' },
        { id: 'account', icon: <AccountCircle color="primary" />, label: 'Dormant Account Activation' }
    ];

    return (
        <Box sx={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#CEC1DF',
            borderRadius: '8px',
        }}>
            <Typography variant="h6" sx={{ textAlign: 'center', mb: 2, color: 'white' }}>
                Services
            </Typography>
            <List sx={{ width: '100%' }}>
                {services.map((service) => (
                    <ListItem
                        key={service.id}
                        button
                        onClick={() => onServiceSelect(service.id)}
                        sx={{
                            backgroundColor: '#EFF1F94D',
                            borderRadius: '8px',
                            mb: 1,
                            border: '1px solid white',
                            '&:hover': {
                                backgroundColor: '#EFF1F94D'
                            }
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                backgroundColor: '#f0f4f8'
                            }}>
                                {service.icon}
                            </Box>
                        </ListItemIcon>

                        <ListItemText primary={service.label} sx={{ color: '#366D8C' }} />

                        <IconButton
                            edge="end"
                            sx={{
                                background: 'linear-gradient(to right, #13A183, #5EBA4F)',
                                borderRadius: '50%',
                                width: 40,
                                height: 40,
                                ml: 1,
                                '&:hover': {
                                    background: 'linear-gradient(to right, #119173, #4ca43e)',
                                }
                            }}
                        >
                            <ChevronRight sx={{ color: 'white' }} />
                        </IconButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

ServicesList.propTypes = {
    onServiceSelect: PropTypes.func.isRequired
};

export default ServicesList;
