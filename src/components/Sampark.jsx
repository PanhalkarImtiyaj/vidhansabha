import { useState, useEffect } from 'react';
import { ref, onValue, push, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { Loader, UniversalAlert } from './common';
import { useAlert } from '../hooks/useAlert';
import './Sampark.css';

// Utility function to safely format timestamps
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'तारीख उपलब्ध नाही';
  
  try {
    // Handle Firestore timestamp objects {seconds, nanoseconds}
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString('mr-IN');
    }
    
    // Handle Firestore timestamp with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString('mr-IN');
    }
    
    // Handle regular date strings or Date objects
    return new Date(timestamp).toLocaleString('mr-IN');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'तारीख उपलब्ध नाही';
  }
};

function Sampark() {
  const [contacts, setContacts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    address: '',
    description: ''
  });


  // Load contacts from Firebase
  useEffect(() => {
    setDataLoading(true);
    const contactsRef = ref(database, 'sampark');
    const unsubscribe = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const contactsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setContacts(contactsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        setContacts([]);
      }
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading contacts:', error);
      setContacts([]);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ phone: '', email: '', address: '', description: '' });
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const contactsRef = ref(database, 'sampark');
      await push(contactsRef, {
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        description: formData.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      resetForm();
      showSuccess('यशस्वी!', 'संपर्क माहिती यशस्वीरित्या जतन केली गेली!');
    } catch (error) {
      console.error('Error saving contact:', error);
      showError('त्रुटी!', 'संपर्क जतन करताना त्रुटी आली: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewDetails = (contact) => {
    setSelectedContact(contact);
    setShowModal(true);
  };

  const handleDelete = async (contact) => {
    showConfirm(
      'संपर्क हटवा',
      'तुम्हाला खात्री आहे की तुम्ही हा संपर्क हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
      try {
        const contactRef = ref(database, `sampark/${contact.id}`);
        await remove(contactRef);
        showSuccess('हटवला!', 'संपर्क यशस्वीरित्या हटवला गेला!');
      } catch (error) {
        console.error('Error deleting contact:', error);
        showError('त्रुटी!', 'संपर्क हटवताना त्रुटी आली: ' + error.message);
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return '#ff9933';
      case 'contacted': return '#3b82f6';
      case 'resolved': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'new': return 'नवीन';
      case 'contacted': return 'संपर्क केला';
      case 'resolved': return 'सोडवले';
      default: return 'अज्ञात';
    }
  };

  if (dataLoading) {
    return (
      <div className="sampark-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="संपर्क माहिती लोड होत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="sampark-container">
      <div className="sampark-header">
        <h1>संपर्क व्यवस्थापन</h1>
        <p>फोन, ईमेल, पत्ता आणि वर्णन जतन करा</p>
        <button 
          className="add-contact-btn"
          onClick={() => setShowForm(true)}
        >
          <i className='bx bx-plus'></i> नवीन संपर्क जोडा
        </button>
        <div className="stats-row">
          <div className="stat-card">
            <i className='bx bx-phone'></i>
            <div className="stat-info">
              <span className="stat-number">{contacts.length}</span>
              <span className="stat-label">एकूण संपर्क</span>
            </div>
          </div>
          {/* <div className="stat-card">
            <i className='bx bx-time'></i>
            <div className="stat-info">
              <span className="stat-number">{contacts.filter(c => c.status === 'new').length}</span>
              <span className="stat-label">नवीन संपर्क</span>
            </div>
          </div> */}
          {/* <div className="stat-card">
            <i className='bx bx-check-circle'></i>
            <div className="stat-info">
              <span className="stat-number">{contacts.filter(c => c.status === 'resolved').length}</span>
              <span className="stat-label">सोडवलेले</span>
            </div>
          </div> */}
        </div>
      </div>

      {/* Contacts List */}
      <div className="contacts-section">
        <div className="section-header">
          <h2>संपर्क यादी ({contacts.length})</h2>
        </div>

        {contacts.length === 0 ? (
          <div className="empty-state">
            <i className='bx bx-phone'></i>
            <h3>कोणताही संपर्क आढळला नाही</h3>
            <p>अद्याप कोणतीही संपर्क विनंती प्राप्त झालेली नाही</p>
          </div>
        ) : (
          <div className="contacts-grid">
            {contacts.map((contact) => (
              <div key={contact.id} className="contact-card">
                <div className="contact-header-card">
                  <div className="contact-title-section">
                    <h3>{contact.email || contact.phone || 'संपर्क'}</h3>
                    <div 
                      className="status-badge" 
                      style={{ backgroundColor: getStatusColor(contact.status) }}
                    >
                      {getStatusText(contact.status)}
                    </div>
                  </div>
                  <div className="contact-actions">
                    <button 
                      className="view-btn"
                      onClick={() => handleViewDetails(contact)}
                      title="तपशील पहा"
                    >
                      <i className='bx bx-show'></i>
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(contact)}
                      title="हटवा"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </div>

                <div className="contact-content">
                  <div className="contact-info">
                    {contact.email && (
                      <div className="info-item">
                        <i className='bx bx-envelope'></i>
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="info-item">
                        <i className='bx bx-phone'></i>
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.address && (
                      <div className="info-item">
                        <i className='bx bx-map'></i>
                        <span>{contact.address}</span>
                      </div>
                    )}
                  </div>
                  
                  {(contact.description || contact.message) && (
                    <div className="contact-message">
                      <p>{(contact.description || contact.message).length > 100 ? 
                        (contact.description || contact.message).substring(0, 100) + '...' : 
                        (contact.description || contact.message)
                      }</p>
                    </div>
                  )}
                  
                  <div className="contact-meta">
                    {contact.createdAt && (
                      <div className="meta-item">
                        <i className='bx bx-calendar'></i>
                        <span>प्राप्त: {formatTimestamp(contact.createdAt)}</span>
                      </div>
                    )}
                    {contact.address && (
                      <div className="meta-item">
                        <i className='bx bx-current-location'></i>
                        <span>पत्ता: {contact.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedContact && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>संपर्क तपशील</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <i className='bx bx-x'></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3><i className='bx bx-envelope'></i> ईमेल</h3>
                <p>{selectedContact.email || 'ईमेल उपलब्ध नाही'}</p>
              </div>

              <div className="detail-section">
                <h3><i className='bx bx-phone'></i> फोन नंबर</h3>
                <p>{selectedContact.phone || 'फोन नंबर उपलब्ध नाही'}</p>
              </div>

              {selectedContact.description && (
                <div className="detail-section">
                  <h3><i className='bx bx-detail'></i> वर्णन</h3>
                  <p>{selectedContact.description}</p>
                </div>
              )}

              {selectedContact.address && (
                <div className="detail-section">
                  <h3><i className='bx bx-map'></i> पत्ता</h3>
                  <p>{selectedContact.address}</p>
                </div>
              )}

              <div className="detail-section">
                <h3><i className='bx bx-info-circle'></i> स्थिती</h3>
                <div 
                  className="status-badge large" 
                  style={{ backgroundColor: getStatusColor(selectedContact.status) }}
                >
                  {getStatusText(selectedContact.status)}
                </div>
              </div>

              <div className="detail-section">
                <h3><i className='bx bx-calendar'></i> दिनांक माहिती</h3>
                <p><strong>प्राप्त:</strong> {formatTimestamp(selectedContact.createdAt)}</p>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="close-modal-btn" 
                onClick={() => setShowModal(false)}
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className='bx bx-plus-circle'></i> नवीन संपर्क जोडा</h2>
              <button className="close-btn" onClick={resetForm}>
                <i className='bx bx-x'></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="party-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">ईमेल</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="उदा. user@example.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">फोन</label>
                  <input 
                    type="text" 
                    id="phone" 
                    name="phone" 
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="उदा. 9876543210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">पत्ता</label>
                <input 
                  type="text" 
                  id="address" 
                  name="address" 
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="पूर्ण पत्ता लिहा"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">वर्णन</label>
                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="तपशीलवार माहिती लिहा"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  रद्द करा
                </button>
                <button type="submit" className={`submit-btn ${submitLoading ? 'loading-btn' : ''}`} disabled={submitLoading}>
                  {submitLoading ? 'जतन करत आहे...' : 'जतन करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default Sampark;
