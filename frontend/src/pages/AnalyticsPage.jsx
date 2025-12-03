// src/pages/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import AuthHeader from '../components/AuthHeader';
import RevenueAnalysis from '../components/RevenueAnalysis'; 
import ReservationList from '../components/ReservationList';
import PropertyManagement from '../components/PropertyManagement';
import './AnalyticsPage.css';

const SideMenu = ({ currentView, setView, isOpen, setIsOpen }) => {
  const handleSelect = (view) => {
    setView(view);
    setIsOpen(false); // Close menu on selection
  };

  return (
    <div className={`side-menu ${isOpen ? 'mobile-open' : ''}`}>
      <h3>メニュー</h3>
      <ul>
        <li>
          <button 
            className={currentView === 'revenue' ? 'active' : ''}
            onClick={() => handleSelect('revenue')}
          >
            売上分析
          </button>
        </li>
        <li>
          <button 
            className={currentView === 'reservations' ? 'active' : ''}
            onClick={() => handleSelect('reservations')}
          >
            月別予約一覧
          </button>
        </li>
        <li>
          <button
            className={currentView === 'properties' ? 'active' : ''}
            onClick={() => handleSelect('properties')}
          >
            施設管理
          </button>
        </li>
      </ul>
    </div>
  );
}

function AnalyticsPage() {
  const [view, setView] = useState('revenue');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


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
    <div className="app-root">
      <AuthHeader />
      <div className="analytics-page">
        <SideMenu 
          currentView={view} 
          setView={setView} 
          isOpen={isMenuOpen} 
          setIsOpen={setIsMenuOpen} 
        />
        {isMobile && isMenuOpen && <div className="overlay" onClick={() => setIsMenuOpen(false)}></div>}
        <div className="content-area">
          {isMobile && (
            <button className="hamburger-menu" onClick={() => setIsMenuOpen(true)}>
              &#9776;
            </button>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
