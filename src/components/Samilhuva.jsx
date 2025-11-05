import { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { Loader } from './common';
import { useAlert } from '../hooks/useAlert';
import UniversalAlert from './common/UniversalAlert';
import './Samilhuva.css';

// Utility function to safely format timestamps
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'तारीख उपलब्ध नाही';
  
  try {
    return new Date(timestamp).toLocaleString('mr-IN');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'तारीख उपलब्ध नाही';
  }
};

function Samilhuva() {
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();

  // Load join requests from Firebase Realtime Database
  useEffect(() => {
    setLoading(true);
    
    try {
      const joinRequestsRef = ref(database, 'join_requests');
      
      const unsubscribe = onValue(joinRequestsRef, (snapshot) => {
        console.log('🔥 Firebase Realtime Database join_requests node:', snapshot.exists() ? 'data found' : 'no data');
        console.log('🔍 Raw snapshot data:', snapshot.val());
        
        if (snapshot.exists()) {
          const requestsData = snapshot.val();
          console.log('📦 Raw join requests data:', requestsData);
          console.log('🔑 Data keys:', Object.keys(requestsData));
          
          const requestsArray = Object.keys(requestsData).map(key => {
            const item = requestsData[key];
            console.log(`🔍 Processing item ${key}:`, item);
            console.log(`🔑 Available fields in ${key}:`, Object.keys(item));
            
            const mappedItem = {
              id: key,
              ...item,
              // Map Firebase field names to component field names
              title: item.name || item.fullName || item.title || 'नाव नाही',
              description: item.message || item.description || item.reason || 'संदेश नाही',
              status: item.status || 'pending', // Default status
              // Ensure mobile and email fields are available
              mobile: item.mobile || item.phone || item.phoneNumber,
              email: item.email || item.emailAddress,
              name: item.name || item.fullName || item.title,
              // Handle timestamp field - convert to ISO string if it's a number
              createdAt: item.timestamp ? new Date(item.timestamp).toISOString() : (item.createdAt || new Date().toISOString())
            };
            
            console.log(`✅ Mapped item ${key}:`, mappedItem);
            return mappedItem;
          }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          console.log('✅ Join Requests Data Loaded from join_requests node:', requestsArray.length);
          console.log('📊 Join Requests Data:', requestsArray);
          setJoinRequests(requestsArray);
        } else {
          console.log('❌ No join requests found in join_requests node');
          console.log('💡 join_requests node is empty');
          setJoinRequests([]);
        }
        setLoading(false);
      }, (error) => {
        console.error('❌ Error loading join requests from Firebase Realtime Database join_requests node:', error);
        setJoinRequests([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up Firebase Realtime Database listener:', error);
      setJoinRequests([]);
      setLoading(false);
    }
  }, []);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleDelete = async (request) => {
    showConfirm(
      'विनंती हटवा',
      'तुम्हाला खात्री आहे की तुम्ही ही विनंती हटवू इच्छिता?',
      async () => {
        try {
          console.log('Deleting join request from join_requests node with ID:', request.id);
          const requestRef = ref(database, `join_requests/${request.id}`);
          await remove(requestRef);
          console.log('Join request deleted from join_requests node successfully');
          showSuccess('यशस्वी!', 'विनंती यशस्वीरित्या हटवली गेली!');
        } catch (error) {
          console.error('Error deleting join request from join_requests node:', error);
          showError('त्रुटी!', 'विनंती हटवताना त्रुटी आली: ' + error.message);
        }
      },
      'हटवा',
      'रद्द करा'
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ff9933';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'reviewed': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'प्रतीक्षामध्ये';
      case 'approved': return 'मंजूर';
      case 'rejected': return 'नाकारले';
      case 'reviewed': return 'पाहिले';
      default: return 'अज्ञात';
    }
  };

  if (loading) {
    return (
      <div className="samilhuva-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="सामिल्हुवा डेटा लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="samilhuva-container">
      <div className="samilhuva-header">
        <h1>सामिल्हुवा विनंत्या</h1>
        <p>पक्षात सामिल होण्यासाठीच्या विनंत्या पहा आणि त्यांचे व्यवस्थापन करा</p>
      </div>

      {/* Statistics */}
      <div className="stats-row">
        <div className="stat-card">
          <i className='bx bx-message-dots'></i>
          <div className="stat-info">
            <span className="stat-number">{joinRequests.length}</span>
            <span className="stat-label">एकूण विनंत्या</span>
          </div>
        </div>
        <div className="stat-card">
          <i className='bx bx-time'></i>
          <div className="stat-info">
            <span className="stat-number">{joinRequests.filter(r => r.status === 'pending').length}</span>
            <span className="stat-label">प्रतीक्षामध्ये</span>
          </div>
        </div>
        <div className="stat-card">
          <i className='bx bx-check-circle'></i>
          <div className="stat-info">
            <span className="stat-number">{joinRequests.filter(r => r.status === 'approved' || r.status === 'reviewed').length}</span>
            <span className="stat-label">मंजूर</span>
          </div>
        </div>
      </div>

      {/* Join Requests List */}
      <div className="requests-section">
        {joinRequests.length === 0 ? (
          <div className="empty-state">
            <i className='bx bx-message-dots'></i>
            <h3>Join Requests Node Empty</h3>
            <p>Firebase Realtime Database 'join_requests' node मध्ये अद्याप कोणतीही data नाही</p>
          </div>
        ) : (
          <div className="requests-grid">
            {joinRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header-card">
                  <div className="request-title-section">
                    <h3>{request.title || request.name || request.fullName || 'नाव नाही'}</h3>
                    <div 
                      className="status-badge" 
                      style={{ backgroundColor: getStatusColor(request.status) }}
                    >
                      {getStatusText(request.status)}
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="view-btn"
                      onClick={() => handleViewDetails(request)}
                      title="तपशील पहा"
                    >
                      <i className='bx bx-show'></i>
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(request)}
                      title="हटवा"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </div>

                <div className="request-content">
                  {/* Contact Information Section */}
                  <div className="contact-info-section">
                    <h4>संपर्क माहिती:</h4>
                    <div className="contact-fields">
                      <div className="contact-field">
                        <i className='bx bx-user'></i>
                        <span className="field-label">नाव:</span>
                        <span className="field-value">{request.name || request.fullName || request.title || 'नाव उपलब्ध नाही'}</span>
                      </div>
                      <div className="contact-field">
                        <i className='bx bx-phone'></i>
                        <span className="field-label">मोबाइल:</span>
                        <span className="field-value">{request.mobile || request.phone || 'मोबाइल उपलब्ध नाही'}</span>
                      </div>
                      <div className="contact-field">
                        <i className='bx bx-envelope'></i>
                        <span className="field-label">ईमेल:</span>
                        <span className="field-value">{request.email || 'ईमेल उपलब्ध नाही'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="request-description">
                    <h4>संदेश:</h4>
                    <p>{(() => {
                      const desc = request.description || request.message || request.reason || 'संदेश उपलब्ध नाही';
                      return desc.length > 150 ? desc.substring(0, 150) + '...' : desc;
                    })()}</p>
                  </div>
                  
                  <div className="request-meta">
                    {request.createdAt && (
                      <div className="meta-item">
                        <i className='bx bx-calendar'></i>
                        <span>प्राप्त: {formatTimestamp(request.createdAt)}</span>
                      </div>
                    )}
                    {request.address && (
                      <div className="meta-item">
                        <i className='bx bx-map'></i>
                        <span>पत्ता: {request.address}</span>
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
      {showModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>विनंती तपशील</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <i className='bx bx-x'></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3><i className='bx bx-user'></i> नाव</h3>
                <p>{selectedRequest.name || selectedRequest.fullName || selectedRequest.title || 'नाव उपलब्ध नाही'}</p>
              </div>

              <div className="detail-section">
                <h3><i className='bx bx-phone'></i> मोबाइल नंबर</h3>
                <p>{selectedRequest.mobile || selectedRequest.phone || 'मोबाइल नंबर उपलब्ध नाही'}</p>
              </div>

              <div className="detail-section">
                <h3><i className='bx bx-envelope'></i> ईमेल पत्ता</h3>
                <p>{selectedRequest.email || 'ईमेल पत्ता उपलब्ध नाही'}</p>
              </div>

              <div className="detail-section">
                <h3><i className='bx bx-detail'></i> संदेश/कारण</h3>
                <p>{selectedRequest.description || selectedRequest.message || selectedRequest.reason || 'संदेश उपलब्ध नाही'}</p>
              </div>

              {selectedRequest.address && (
                <div className="detail-section">
                  <h3><i className='bx bx-map'></i> पत्ता</h3>
                  <p>{selectedRequest.address}</p>
                </div>
              )}

              {selectedRequest.age && (
                <div className="detail-section">
                  <h3><i className='bx bx-calendar'></i> वय</h3>
                  <p>{selectedRequest.age}</p>
                </div>
              )}

              <div className="detail-section">
                <h3><i className='bx bx-info-circle'></i> स्थिती</h3>
                <div 
                  className="status-badge large" 
                  style={{ backgroundColor: getStatusColor(selectedRequest.status) }}
                >
                  {getStatusText(selectedRequest.status)}
                </div>
              </div>

              <div className="detail-section">
                <h3><i className='bx bx-calendar'></i> दिनांक माहिती</h3>
                <p><strong>प्राप्त:</strong> {formatTimestamp(selectedRequest.createdAt)}</p>
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

      {/* Custom Alert */}
      <UniversalAlert
        isOpen={alert.isOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
      />
    </div>
  );
}

export default Samilhuva;
