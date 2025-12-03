// src/pages/AnalyticsPage.jsx
import React, { useState } from 'react';
import AuthHeader from '../components/AuthHeader';
import RevenueAnalysis from '../components/RevenueAnalysis'; 
import ReservationList from '../components/ReservationList';
import PropertyManagement from '../components/PropertyManagement';
import './AnalyticsPage.css';

const SideMenu = ({ currentView, setView }) => {
  return (
    <div className="side-menu">
      <h3>メニュー</h3>
      <ul>
        <li>
          <button 
            className={currentView === 'revenue' ? 'active' : ''}
            onClick={() => setView('revenue')}
          >
            売上分析
          </button>
        </li>
        <li>
          <button 
            className={currentView === 'reservations' ? 'active' : ''}
            onClick={() => setView('reservations')}
          >
            月別予約一覧
          </button>
        </li>
        <li>
          <button
            className={currentView === 'properties' ? 'active' : ''}
            onClick={() => setView('properties')}
          >
            施設管理
          </button>
        </li>
      </ul>
    </div>
  );
}

function AnalyticsPage() {
  const [view, setView] = useState('revenue'); // 'revenue', 'reservations', or 'properties'

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
        <SideMenu currentView={view} setView={setView} />
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
