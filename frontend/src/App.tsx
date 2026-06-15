import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  BrainCircuit, 
  TrendingUp, 
  Package, 
  MessageSquare, 
  FileText, 
  ThumbsUp 
} from 'lucide-react';

// Import Pages
import PlantDashboard from './pages/PlantDashboard';
import EquipmentDetail from './pages/EquipmentDetail';
import AlertCenter from './pages/AlertCenter';
import RCAWorkspace from './pages/RCAWorkspace';
import PredictionView from './pages/PredictionView';
import SparePlanning from './pages/SparePlanning';
import MaintenanceWizard from './pages/MaintenanceWizard';
import ReportsLogbook from './pages/ReportsLogbook';
import FeedbackReview from './pages/FeedbackReview';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);

  const handleSelectEquipment = (id: string) => {
    setSelectedEquipmentId(id);
    setActiveTab('detail');
  };

  const handleSelectAlert = (id: number) => {
    setSelectedAlertId(id);
    setActiveTab('rca');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <PlantDashboard 
            onSelectEquipment={handleSelectEquipment} 
            onSelectAlert={handleSelectAlert} 
          />
        );
      case 'detail':
        return selectedEquipmentId ? (
          <EquipmentDetail 
            equipmentId={selectedEquipmentId} 
            onBack={() => setActiveTab('dashboard')} 
          />
        ) : (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <h3>No Equipment Selected</h3>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('dashboard')}>
              Go to Dashboard
            </button>
          </div>
        );
      case 'alerts':
        return (
          <AlertCenter 
            onSelectAlert={handleSelectAlert} 
          />
        );
      case 'rca':
        return (
          <RCAWorkspace 
            alertId={selectedAlertId} 
            onBack={() => setActiveTab('alerts')} 
            onGenerateReport={() => setActiveTab('reports')} 
          />
        );
      case 'predictions':
        return (
          <PredictionView 
            onSelectEquipment={handleSelectEquipment}
          />
        );
      case 'spares':
        return <SparePlanning />;
      case 'chat':
        return <MaintenanceWizard />;
      case 'reports':
        return (
          <ReportsLogbook 
            preselectedAlertId={selectedAlertId} 
            onClearPreselect={() => setSelectedAlertId(null)}
          />
        );
      case 'feedback':
        return <FeedbackReview />;
      default:
        return <PlantDashboard onSelectEquipment={handleSelectEquipment} onSelectAlert={handleSelectAlert} />;
    }
  };

  return (
    <div>
      {/* Navigation Header */}
      <nav className="navbar">
        <a href="#dashboard" className="nav-logo" onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={24} color="#3b82f6" />
          <span>STEEL_MAINTENANCE</span>
        </a>
        
        <div className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'dashboard' || activeTab === 'detail' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <AlertTriangle size={18} />
            Alerts
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'rca' ? 'active' : ''}`}
            onClick={() => setActiveTab('rca')}
          >
            <BrainCircuit size={18} />
            RCA Lab
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            <TrendingUp size={18} />
            Predictions
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'spares' ? 'active' : ''}`}
            onClick={() => setActiveTab('spares')}
          >
            <Package size={18} />
            Spares
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={18} />
            Wizard Chat
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText size={18} />
            Logbook
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <ThumbsUp size={18} />
            Feedback
          </button>

        </div>
      </nav>

      {/* Main Page Content */}
      <main className="page-container">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
