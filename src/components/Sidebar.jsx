import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CustomAlert } from './common';
import 'boxicons/css/boxicons.min.css';
import './Sidebar.css';

function Sidebar({ activePage, onPageChange, menuItems }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const { currentUser, logout } = useAuth();

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && isMobileOpen && !event.target.closest('.sidebar') && !event.target.closest('.mobile-menu-btn')) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isMobileOpen]);

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const handlePageChange = (pageId) => {
    onPageChange(pageId);
    if (isMobile) {
      setIsMobileOpen(false); // Close mobile menu after selection
    }
  };

  const toggleDropdown = (menuId) => {
    setOpenDropdown(openDropdown === menuId ? null : menuId);
  };

  // menuItems now comes from props
  // Fallback if menuItems not provided
  const defaultMenuItems = [
    { id: 'home', icon: 'bx-home', label: 'होम', hasDropdown: false },
    { id: 'banner', icon: 'bx-image', label: 'बॅनर' },
  ];
  
  const items = menuItems || defaultMenuItems;

  const handleLogout = () => {
    setShowLogoutAlert(true);
  };

  const confirmLogout = async () => {
    setShowLogoutAlert(false);
    await logout();
  };

  const cancelLogout = () => {
    setShowLogoutAlert(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      {isMobile && (
        <div className="mobile-top-bar">
          <button 
            className="mobile-menu-btn"
            onClick={toggleMobileMenu}
            title="Menu"
          >
            <i className={`bx ${isMobileOpen ? 'bx-x' : 'bx-menu'}`}></i>
          </button>
          
          <div className="mobile-admin-info">
            <div className="mobile-admin-avatar">
              <i className='bx bx-user'></i>
            </div>
            <div className="mobile-admin-details">
              <span className="mobile-admin-name">Admin Login</span>
              <span className="mobile-admin-email">{currentUser?.email || 'admin@ncp.com'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && (
        <div 
          className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`}
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile && isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-circle">
            <img 
              src="/images/login-logo.png" 
              alt="Logo"
              style={{ width: '100px', height: '100px', objectFit: 'contain' }}
            />
          </div>
          {!isCollapsed && (
            <div className="logo-text-container">
              <h2 className="logo-title">राष्ट्रवादी काँग्रेस पक्ष</h2>
              <p className="logo-subtitle">शरदचंद्र पवार</p>
            </div>
          )}
        </div>
        {!isMobile && (
          <button 
            className="collapse-btn" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <i className="bx bx-menu"></i>
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <div key={item.id} className="nav-item-container">
            <button
              className={`nav-item ${activePage === item.id || (item.subItems && item.subItems.some(sub => sub.id === activePage)) ? 'active' : ''}`}
              onClick={() => {
                if (item.hasDropdown) {
                  toggleDropdown(item.id);
                } else {
                  handlePageChange(item.id);
                }
              }}
              title={isCollapsed ? item.label : ''}
            >
              <i className={`bx ${item.icon} nav-icon`}></i>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
              {!isCollapsed && item.hasDropdown && (
                <i className={`bx ${openDropdown === item.id ? 'bx-chevron-down' : 'bx-chevron-right'} nav-arrow`}></i>
              )}
              {!isCollapsed && !item.hasDropdown && (
                <i className='bx bx-chevron-right nav-arrow'></i>
              )}
            </button>
            
            {item.hasDropdown && !isCollapsed && (
              <div className={`dropdown-menu ${openDropdown === item.id ? 'open' : ''}`}>
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    className={`dropdown-item ${activePage === subItem.id ? 'active' : ''}`}
                    onClick={() => handlePageChange(subItem.id)}
                  >
                    <i className={`bx ${subItem.icon} dropdown-icon`}></i>
                    <span className="dropdown-label">{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            <i className='bx bx-user'></i>
          </div>
          {!isCollapsed && (
            <div className="user-details">
              <div className="user-name">
                {currentUser?.displayName || currentUser?.email?.split('@')[0]}
              </div>
              <div className="user-email">{currentUser?.email}</div>
            </div>
          )}
        </div>
        <button 
          className="logout-btn" 
          onClick={handleLogout}
          title="Logout"
        >
          <i className='bx bx-log-out logout-icon'></i>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>

    {/* Custom Logout Alert */}
    <CustomAlert
      isOpen={showLogoutAlert}
      message="तुम्हाला खात्री आहे की तुम्ही लॉगआउट करू इच्छिता? तुमचे सर्व काम सेव्ह केले आहे याची खात्री करा."
      onConfirm={confirmLogout}
      onCancel={cancelLogout}
    />
    </>
  );
}

export default Sidebar;
