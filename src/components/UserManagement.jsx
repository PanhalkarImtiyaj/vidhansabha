import { useState, useEffect } from 'react';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { database } from '../firebase/config';
import { Loader, UniversalAlert } from './common';
import { useAlert } from '../hooks/useAlert';
import './UserManagement.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    department: '',
    designation: '',
    address: '',
    status: 'active',
    projectsAssigned: {
      banner: false,
      vachan: false,
      majhyaBaddal: false,
      keleliKame: false,
      batmya: false,
      samasyaManda: false,
      margdarshak: false,
      mahatvachiSank: false,
      sarkariyojna: false,
      pratikriya: false,
      sampark: false
    }
  });

  // Load users from Firebase
  useEffect(() => {
    const usersRef = ref(database, 'users');
    setDataLoading(true);
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setUsers(usersArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        setUsers([]);
      }
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading users:', error);
      setUsers([]);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('project_')) {
      const projectName = name.replace('project_', '');
      setFormData(prev => ({
        ...prev,
        projectsAssigned: {
          ...prev.projectsAssigned,
          [projectName]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showWarning('अपूर्ण माहिती', 'कृपया नाव प्रविष्ट करा!');
      return;
    }
    
    if (!formData.email.trim()) {
      showWarning('अपूर्ण माहिती', 'कृपया ईमेल प्रविष्ट करा!');
      return;
    }

    setSubmitLoading(true);
    
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        address: formData.address.trim(),
        status: formData.status,
        projectsAssigned: formData.projectsAssigned
      };
      
      if (editingUser) {
        const userRef = ref(database, `users/${editingUser.id}`);
        await update(userRef, {
          ...userData,
          updatedAt: new Date().toISOString()
        });
        showSuccess('यशस्वी!', 'वापरकर्ता यशस्वीरित्या अपडेट केला गेला!');
      } else {
        const usersRef = ref(database, 'users');
        await push(usersRef, {
          ...userData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showSuccess('यशस्वी!', 'नवीन वापरकर्ता यशस्वीरित्या जोडला गेला!');
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'user',
        department: '',
        designation: '',
        address: '',
        status: 'active',
        projectsAssigned: {
          banner: false,
          vachan: false,
          majhyaBaddal: false,
          keleliKame: false,
          batmya: false,
          samasyaManda: false,
          margdarshak: false,
          mahatvachiSank: false,
          sarkariyojna: false,
          pratikriya: false,
          sampark: false
        }
      });
      setShowForm(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      showError('त्रुटी!', 'वापरकर्ता जतन करताना त्रुटी आली: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (user) => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'user',
      department: user.department || '',
      designation: user.designation || '',
      address: user.address || '',
      status: user.status || 'active',
      projectsAssigned: user.projectsAssigned || {
        banner: false,
        vachan: false,
        majhyaBaddal: false,
        keleliKame: false,
        batmya: false,
        samasyaManda: false,
        margdarshak: false,
        mahatvachiSank: false,
        sarkariyojna: false,
        pratikriya: false,
        sampark: false
      }
    });
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async (user) => {
    showConfirm(
      'वापरकर्ता हटवा',
      'तुम्हाला खात्री आहे की तुम्ही हा वापरकर्ता हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
      try {
        const userRef = ref(database, `users/${user.id}`);
        await remove(userRef);
        showSuccess('हटवला!', 'वापरकर्ता यशस्वीरित्या हटवला गेला!');
      } catch (error) {
        console.error('Error deleting user:', error);
        showError('त्रुटी!', 'वापरकर्ता हटवताना त्रुटी आली: ' + error.message);
      }
    });
  };

  const getAssignedProjectsCount = (projectsAssigned) => {
    if (!projectsAssigned) return 0;
    return Object.values(projectsAssigned).filter(Boolean).length;
  };

  if (dataLoading) {
    return (
      <div className="user-management-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="वापरकर्ता डेटा लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h1><i className='bx bx-group'></i> वापरकर्ता व्यवस्थापन</h1>
        <p>सिस्टम वापरकर्ते आणि त्यांचे प्रकल्प व्यवस्थापित करा</p>
        <button 
          className="add-user-btn"
          onClick={() => {
            setShowForm(true);
            setEditingUser(null);
            setFormData({
              name: '',
              email: '',
              phone: '',
              role: 'user',
              department: '',
              designation: '',
              address: '',
              status: 'active',
              projectsAssigned: {
                banner: false,
                vachan: false,
                majhyaBaddal: false,
                keleliKame: false,
                batmya: false,
                samasyaManda: false,
                margdarshak: false,
                mahatvachiSank: false,
                sarkariyojna: false,
                pratikriya: false,
                sampark: false
              }
            });
          }}
        >
          <i className='bx bx-plus'></i>
          नवीन वापरकर्ता जोडा
        </button>
      </div>

      {/* Users Stats */}
      <div className="users-stats">
        <div className="stat-card">
          <i className='bx bx-group'></i>
          <div className="stat-info">
            <span className="stat-number">{users.length}</span>
            <span className="stat-label">एकूण वापरकर्ते</span>
          </div>
        </div>
        <div className="stat-card">
          <i className='bx bx-check-circle'></i>
          <div className="stat-info">
            <span className="stat-number">{users.filter(u => u.status === 'active').length}</span>
            <span className="stat-label">सक्रिय वापरकर्ते</span>
          </div>
        </div>
        <div className="stat-card">
          <i className='bx bx-user-check'></i>
          <div className="stat-info">
            <span className="stat-number">{users.filter(u => u.role === 'admin').length}</span>
            <span className="stat-label">प्रशासक</span>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content user-modal">
            <div className="modal-header">
              <h2>{editingUser ? 'वापरकर्ता संपादित करा' : 'नवीन वापरकर्ता जोडा'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <i className='bx bx-x'></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="user-form" style={{position: 'relative'}}>
              {submitLoading && (
                <div className="form-loading-overlay">
                  <Loader 
                    size="medium" 
                    color="primary" 
                    text="वापरकर्ता सेव्ह करत आहे..." 
                  />
                </div>
              )}
              
              <div className="form-sections">
                {/* Basic Information */}
                <div className="form-section">
                  <h3>मूलभूत माहिती</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="name">पूर्ण नाव *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="वापरकर्त्याचे पूर्ण नाव"
                        required
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">ईमेल पत्ता *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="user@example.com"
                        required
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">फोन नंबर</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="9876543210"
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="role">भूमिका</label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        disabled={submitLoading}
                      >
                        <option value="user">वापरकर्ता</option>
                        <option value="admin">प्रशासक</option>
                        <option value="moderator">मॉडरेटर</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="department">विभाग</label>
                      <input
                        type="text"
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        placeholder="IT विभाग"
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="designation">पदनाम</label>
                      <input
                        type="text"
                        id="designation"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        placeholder="सॉफ्टवेअर डेव्हलपर"
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="address">पत्ता</label>
                      <textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="पूर्ण पत्ता"
                        rows="3"
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="status">स्थिती</label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        disabled={submitLoading}
                      >
                        <option value="active">सक्रिय</option>
                        <option value="inactive">निष्क्रिय</option>
                        <option value="suspended">निलंबित</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Project Assignments */}
                <div className="form-section">
                  <h3>प्रकल्प नियुक्ती</h3>
                  <div className="projects-grid">
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_banner"
                          checked={formData.projectsAssigned.banner}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>बॅनर व्यवस्थापन</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_vachan"
                          checked={formData.projectsAssigned.vachan}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>वचन व्यवस्थापन</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_majhyaBaddal"
                          checked={formData.projectsAssigned.majhyaBaddal}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>माझ्याबद्दल</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_keleliKame"
                          checked={formData.projectsAssigned.keleliKame}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>केलेली कामे</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_batmya"
                          checked={formData.projectsAssigned.batmya}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>बातम्या/कार्यक्रम</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_samasyaManda"
                          checked={formData.projectsAssigned.samasyaManda}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>समस्या मांडा</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_margdarshak"
                          checked={formData.projectsAssigned.margdarshak}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>मार्गदर्शक</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_mahatvachiSank"
                          checked={formData.projectsAssigned.mahatvachiSank}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>महत्त्वाची संकेतस्थळे</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_sarkariyojna"
                          checked={formData.projectsAssigned.sarkariyojna}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>सरकारी योजना</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_pratikriya"
                          checked={formData.projectsAssigned.pratikriya}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>प्रतिक्रिया</span>
                      </label>
                    </div>
                    
                    <div className="project-item">
                      <label>
                        <input
                          type="checkbox"
                          name="project_sampark"
                          checked={formData.projectsAssigned.sampark}
                          onChange={handleInputChange}
                          disabled={submitLoading}
                        />
                        <span>संपर्क</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                  रद्द करा
                </button>
                <button 
                  type="submit" 
                  className={`submit-btn ${submitLoading ? 'loading-btn' : ''}`} 
                  disabled={submitLoading}
                >
                  {submitLoading ? '' : (editingUser ? 'अपडेट करा' : 'जतन करा')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="users-section">
        <div className="section-header">
          <h2>वापरकर्ता यादी ({users.length})</h2>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">
            <i className='bx bx-group'></i>
            <h3>कोणतेही वापरकर्ते आढळले नाही</h3>
            <p>नवीन वापरकर्ता जोडण्यासाठी वरील बटण दाबा</p>
          </div>
        ) : (
          <div className="users-grid">
            {users.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-card-header">
                  <div className="user-avatar">
                    <i className='bx bx-user'></i>
                  </div>
                  <div className="user-info">
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                    {user.designation && <span className="designation">{user.designation}</span>}
                  </div>
                  <div className="user-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(user)}
                      title="संपादित करा"
                    >
                      <i className='bx bx-edit'></i>
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(user)}
                      title="हटवा"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </div>

                <div className="user-card-body">
                  <div className="user-details">
                    <div className="detail-item">
                      <span className="label">भूमिका:</span>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === 'admin' ? 'प्रशासक' : 
                         user.role === 'moderator' ? 'मॉडरेटर' : 'वापरकर्ता'}
                      </span>
                    </div>
                    
                    {user.department && (
                      <div className="detail-item">
                        <span className="label">विभाग:</span>
                        <span>{user.department}</span>
                      </div>
                    )}
                    
                    <div className="detail-item">
                      <span className="label">स्थिती:</span>
                      <span className={`status-badge ${user.status}`}>
                        {user.status === 'active' ? 'सक्रिय' : 
                         user.status === 'inactive' ? 'निष्क्रिय' : 'निलंबित'}
                      </span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="label">प्रकल्प:</span>
                      <span className="projects-count">
                        {getAssignedProjectsCount(user.projectsAssigned)} नियुक्त
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Alert Component */}
      <UniversalAlert
        isOpen={alert.isOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
        confirmText={alert.type === 'confirm' ? 'हो, हटवा' : 'ठीक आहे'}
        cancelText="रद्द करा"
      />
    </div>
  );
}

export default UserManagement;
