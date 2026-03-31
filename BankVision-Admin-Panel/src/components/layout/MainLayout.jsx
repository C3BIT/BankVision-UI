import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    CssBaseline,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
    Menu,
    MenuItem,
    useTheme,
    useMediaQuery,
    Paper,
    Switch
} from '@mui/material';
import {
    LayoutDashboard,
    Users,
    Video,
    PhoneCall,
    LogOut,
    Menu as MenuIcon,
    ChevronLeft,
    Headphones,
    UserCheck,
    UserCircle,
    FileText,
    History,
    Bell,
    Settings,
    Shield,
    ClipboardList
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from './BrandLogo';
import logoIcon from '../../assets/images/bank-logo.svg';

const DRAWER_WIDTH = 280;

const MainLayout = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [whisperMode, setWhisperMode] = useState(false);

    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { text: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { text: 'Supervisor', icon: UserCheck, path: '/supervisor' },
        { text: 'Agent Monitor', icon: Users, path: '/agent-monitor' },
        { text: 'Manager', icon: UserCircle, path: '/managers' },
        { text: 'Reports', icon: FileText, path: '/reports' },
        { text: 'Call History', icon: History, path: '/call-history' },
        { text: 'Recordings', icon: Video, path: '/recordings' },
        { text: 'Service Audit Log', icon: ClipboardList, path: '/service-audit' },
        { text: 'Settings', icon: Settings, path: '/settings' },
    ];

    const drawer = ( // Renamed from drawerContent
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
            {/* Sidebar Header / Logo */}
            <Box sx={{ p: 2.5, px: 3 }}>
                <BrandLogo size="small" />
            </Box>

            {/* Navigation Items */}
            <List sx={{ px: 2, flexGrow: 1 }}>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                onClick={() => {
                                    navigate(item.path);
                                    if (isMobile) setMobileOpen(false); // Keep mobile drawer closing logic
                                }}
                                selected={isActive}
                                sx={{
                                    borderRadius: 2,
                                    bgcolor: isActive ? 'primary.main' : 'transparent',
                                    color: isActive ? 'common.white' : 'text.secondary',
                                    '&:hover': {
                                        bgcolor: isActive ? 'primary.dark' : 'action.hover',
                                    },
                                    '&.Mui-selected': {
                                        bgcolor: 'primary.main',
                                        color: 'common.white',
                                        '&:hover': {
                                            bgcolor: 'primary.dark',
                                        },
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 40,
                                        color: isActive ? 'inherit' : 'text.secondary',
                                    }}
                                >
                                    <item.icon size={20} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: '0.9rem',
                                        fontWeight: isActive ? 600 : 400
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            {/* Bottom Section: Notifications, Settings, Profile */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <List>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton sx={{ borderRadius: 2 }}>
                            <ListItemIcon sx={{ minWidth: 40 }}><Bell size={20} /></ListItemIcon>
                            <ListItemText primary="Notifications" primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>
                    </ListItem>
                </List>

                {/* Profile Card */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}
                >
                    <Avatar src={user?.avatar} sx={{ width: 40, height: 40, bgcolor: 'primary.light' }}>
                        {user?.name?.[0] || 'A'}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Welcome back 👋
                        </Typography>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {user?.name || 'Admin User'}
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={handleLogout} color="error">
                        <LogOut size={16} />
                    </IconButton>
                </Paper>
            </Box>
        </Box>
    );

    const drawerWidth = DRAWER_WIDTH; // Ensure drawerWidth is defined for the return block

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <CssBaseline />

            {/* Topbar */}
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` }, // Updated width
                    ml: { sm: `${drawerWidth}px` }, // Updated ml
                    bgcolor: 'background.paper', // Updated bgcolor
                    color: 'text.primary',
                    boxShadow: 'none', // Updated boxShadow
                    borderBottom: '1px solid', // Updated borderBottom
                    borderColor: 'divider', // Updated borderColor
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }} // Updated display breakpoint
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* Centered Logo in Header (Optional based on design, maybe just Spacer) */}
                    <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                        <Box
                            component="img"
                            src={logoIcon}
                            alt="Logo"
                            sx={{ height: 32, width: 'auto', display: { xs: 'none', md: 'block' } }}
                        />
                    </Box>

                    {/* Whisper Toggle & User */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'grey.100', px: 2, py: 0.5, borderRadius: 10 }}>
                            <Typography variant="caption" fontWeight="bold" color={whisperMode ? 'success.main' : 'text.secondary'}>
                                Whisper Mode
                            </Typography>
                            <Switch
                                size="small"
                                checked={whisperMode}
                                onChange={(e) => setWhisperMode(e.target.checked)}
                                color="success"
                            />
                        </Box>
                        <IconButton sx={{ bgcolor: 'grey.100' }} onClick={handleMenuOpen}>
                            <Headphones size={20} />
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                            <MenuItem onClick={handleLogout}>Logout</MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid', borderColor: 'divider' },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;
