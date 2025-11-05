import { useState } from 'react';
import Sidebar from './Sidebar';
import Banner from './Banner';
import Vachan from './Vachan';
import MajhyaBaddal from './MajhyaBaddal';
import KeleliKame from './KeleliKame';
import Batmya from './Batmya';
import SamasyaManda from './SamasyaManda';
import Margdarshak from './Margdarshak';
import MahatvachiSank from './MahatvachiSank';
import Sarkariyojna from './Sarkariyojna';
import Pratikriya from './Pratikriya';
import Sampark from './Sampark';
import Samilhuva from './Samilhuva';
import PakshaManu from './PakshaManu';
import heroAdminImg from '../assets/images/hero-admin.png';
import sharadPawarImg from '../assets/images/sharad_pawar.png';
import './DashboardLayout.css';

function DashboardLayout() {
  const [activePage, setActivePage] = useState('home');

  // Menu items from Sidebar
  const menuItems = [
    { 
      id: 'home', 
      icon: 'bx-home', 
      label: 'होम',
      hasDropdown: false
    },
    { 
      id: 'menu', 
      icon: 'bx-menu', 
      label: 'मुख्य मेनू',
      hasDropdown: true,
      subItems: [
        { id: 'vachan', icon: 'bx-file-blank', label: 'माझा वचननामा' },
        { id: 'majhyabaddal', icon: 'bx-user', label: 'माझ्याबद्दल' },
        { id: 'kelelikame', icon: 'bx-briefcase', label: 'केलेली कामे' },
        { id: 'batmya-karyakram', icon: 'bx-news', label: 'बातम्या/कार्यक्रम' },
        { id: 'samasya-manda', icon: 'bx-message-dots', label: 'समस्या मांडा' },
      ]
    },
    { id: 'banner', icon: 'bx-image', label: 'बॅनर' },
    { id: 'maadarshak', icon: 'bx-target-lock', label: 'मार्गदर्शक' },
    { id: 'mahatvashi', icon: 'bx-search-alt', label: 'महत्त्वाशी संकेतस्थळे' },
    { id: 'sarkariyojna', icon: 'bx-building', label: 'सरकारी योजना' },
    // { id: 'takrari', icon: 'bx-link', label: 'तक्रारी द्या' },
    { id: 'pratikriya', icon: 'bx-help-circle', label: 'प्रतिक्रिया किंवा सूचना' },
    { id: 'sampark', icon: 'bx-phone', label: 'संपर्क करा' },
    { id: 'samilhuva', icon: 'bx-group', label: 'सामिल्हुवा' },
    { id: 'paksha-manu', icon: 'bx-flag', label: 'पक्ष मेनू' },
    // { id: 'bhasha', icon: 'bx-globe', label: 'भाषा बदला' },
    // { id: 'theme', icon: 'bx-palette', label: 'थीम बदला' },
  ];

  const handlePageChange = (pageId) => {
    console.log('Navigating to:', pageId); // Debug log
    setActivePage(pageId);
  };

  const renderContent = () => {
    switch (activePage) {
      case 'banner':
        return <Banner />;
      case 'vachan':
        return <Vachan />;
      case 'majhyabaddal':
        return <MajhyaBaddal />;
      case 'kelelikame':
        return <KeleliKame />;
      case 'maadarshak':
        return <Margdarshak />;
      case 'mahatvashi':
        return <MahatvachiSank />;
      case 'batmya-karyakram':
        return <Batmya />;
      case 'samasya-manda':
        return <SamasyaManda />;
      case 'sarkariyojna':
        return <Sarkariyojna />;
      case 'pratikriya':
        return <Pratikriya />;
      case 'sampark':
        return <Sampark />;
      case 'samilhuva':
        return <Samilhuva />;
      case 'paksha-manu':
        return <PakshaManu />;
      case 'home':
        return (
          <div className="content-wrapper">
            <div className="content-body">
              {/* Hero Section */}
              <div className="hero-section">
                {/* Leader Image at Hero Top */}
                <div className="hero-top-leader">
                  <div className="leader-container">
                    <img src={sharadPawarImg} alt="Sharad Pawar" className="hero-leader-img" />
                    <span className="leader-title">मार्गदर्शक</span>
                  </div>
                </div>
                
                <div className="hero-content">
                  <div className="hero-text">
                    <h1 className="hero-title">स्वागत आहे</h1>
                    <p className="hero-subtitle">आमच्या डिजिटल प्लॅटफॉर्मवर</p>
                    <p className="hero-description">
                      नागरिकांच्या सेवेसाठी आणि प्रशासकीय कार्यांसाठी एक संपूर्ण समाधान
                    </p>
                  </div>
                  <div className="hero-image">
                    <div className="hero-image-placeholder">
                      <img src={heroAdminImg} alt="Admin Hero" className="hero-admin-img" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Cards at Bottom */}
              <div className="menu-cards-grid">
                <div className="menu-section">
                  <h3 className="section-title">मुख्य मेनू</h3>
                  <div className="cards-row">
                    {/* First Row */}
                    <div className="cards-column">
                      {/* वचन व्यवस्थापन */}
                      <div 
                        className="menu-card"
                        onClick={() => setActivePage('vachan')}
                      >
                        <div className="card-icon">
                          <i className='bx bx-file-blank'></i>
                        </div>
                        <h4 className="card-title">माझा वचननामा</h4>
                        <div className="card-arrow">
                          <i className='bx bx-right-arrow-alt'></i>
                        </div>
                      </div>
                      
                      {/* समस्या मांडा */}
                      <div 
                        className="menu-card"
                        onClick={() => setActivePage('samasya-manda')}
                      >
                        <div className="card-icon">
                          <i className='bx bx-message-dots'></i>
                        </div>
                        <h4 className="card-title">समस्या मांडा</h4>
                        <div className="card-arrow">
                          <i className='bx bx-right-arrow-alt'></i>
                        </div>
                      </div>
                    </div>

                    {/* Other Cards */}
                    {(menuItems.find(menu => menu.id === 'menu')?.subItems || []).filter(item => item.id !== 'vachan' && item.id !== 'samasya-manda').map((item) => (
                      <div 
                        key={item.id} 
                        className="menu-card"
                        onClick={() => setActivePage(item.id)}
                      >
                        <div className="card-icon">
                          <i className={`bx ${item.icon}`}></i>
                        </div>
                        <h4 className="card-title">{item.label}</h4>
                        <div className="card-arrow">
                          <i className='bx bx-right-arrow-alt'></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="content-wrapper">
            <div className="content-header">
              <h1>पृष्ठ निवडले नाही</h1>
              <p>कृपया साइडबारमधून एक पर्याय निवडा</p>
            </div>
            
            <div className="content-body">
              <div className="info-card">
                <i className='bx bx-info-circle card-icon'></i>
                <h2>सक्रिय पृष्ठ: {activePage}</h2>
                <p>या पृष्ठासाठी अद्याप सामग्री उपलब्ध नाही.</p>
              </div>
            </div>
          </div>
        );
    }
  };  
  return (
    <div className="dashboard-layout">
      <Sidebar 
        activePage={activePage} 
        onPageChange={handlePageChange}
        menuItems={menuItems}
      />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default DashboardLayout;
