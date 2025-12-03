// src/pages/AnalyticsPage.jsx
import React, { useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BusinessIcon from '@mui/icons-material/Business';

import Header from '../components/Header';
import RevenueAnalysis from '../components/RevenueAnalysis'; 
import ReservationList from '../components/ReservationList';
import PropertyManagement from '../components/PropertyManagement';

const drawerWidth = 240;

const SideMenu = ({ currentView, setView }) => {
  const menuItems = [
    { text: '売上分析', view: 'revenue', icon: <DashboardIcon /> },
    { text: '月別予約一覧', view: 'reservations', icon: <ListAltIcon /> },
    { text: '施設管理', view: 'properties', icon: <BusinessIcon /> },
  ];

  return (
    <div>
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={currentView === item.view}
              onClick={() => setView(item.view)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );
};

function AnalyticsPage() {
  const [view, setView] = useState('revenue');
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const renderContent = () => {
    switch (view) {
      case 'revenue':
        return <RevenueAnalysis />; 
      case 'reservations':
        return <ReservationList />;
      case 'properties':
        return <PropertyManagement />;
      default:
        return <div>コンテンツを選択してください</div>;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Header onMenuClick={handleDrawerToggle} />
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        <SideMenu currentView={view} setView={setView} />
      </Drawer>
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
          zIndex: (theme) => theme.zIndex.drawer + 2 // Ensure it's above the AppBar
        }}
      >
        <SideMenu currentView={view} setView={(v) => { setView(v); setMobileOpen(false); }} />
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        {renderContent()}
      </Box>
    </Box>
  );
}

export default AnalyticsPage;