import { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { Loader } from './common';
import { useAlert } from '../hooks/useAlert';
import UniversalAlert from './common/UniversalAlert';
import './SamasyaManda.css';

// Utility function to safely format timestamps
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'तारीख उपलब्ध नाही';
  
  try {
    // Handle ISO date strings from Firebase Realtime Database
    return new Date(timestamp).toLocaleString('mr-IN');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'तारीख उपलब्ध नाही';
  }
};

function SamasyaManda() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();

  // Load problems from Firebase Realtime Database - report_issues node
  useEffect(() => {
    setLoading(true);
    
    try {
      const problemsRef = ref(database, 'report_issues');
      
      const unsubscribe = onValue(problemsRef, (snapshot) => {
        console.log('🔥 Firebase Realtime Database report_issues node:', snapshot.exists() ? 'data found' : 'no data');
        console.log('🔍 Raw snapshot data:', snapshot.val());
        
        if (snapshot.exists()) {
          const problemsData = snapshot.val();
          console.log('📦 Raw problems data:', problemsData);
          console.log('🔑 Data keys:', Object.keys(problemsData));
          
          const problemsArray = Object.keys(problemsData).map(key => {
            const item = problemsData[key];
            console.log(`🔍 Processing item ${key}:`, item);
            console.log(`🔑 Available fields in ${key}:`, Object.keys(item));
            
            const mappedItem = {
              id: key,
              ...item,
              // Map Firebase field names to component field names - try multiple possible field names
              title: item.feedback || item.feedbacks || item.title || item.name || item.subject || 'शीर्षक नाही',
              description: item.problem || item.problems || item.description || item.details || item.message || 'वर्णन नाही',
              status: item.status || 'new' // Default status if not provided
            };
            
            console.log(`✅ Mapped item ${key}:`, mappedItem);
            return mappedItem;
          });
          
          console.log('📋 Problems array before sorting:', problemsArray);
          
          // Sort by createdAt if available, otherwise keep original order
          const sortedArray = problemsArray.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return 0; // Keep original order if no createdAt
          });
          
          console.log('✅ Problems Data Loaded from report_issues node:', sortedArray.length);
          console.log('📊 Final Report Issues Data:', sortedArray);
          console.log('🔍 Sample data structure:', sortedArray[0] || 'No data available');
          setProblems(sortedArray);
        } else {
          console.log('❌ No problems found in report_issues node');
          console.log('💡 report_issues node is empty');
          setProblems([]);
        }
        setLoading(false);
      }, (error) => {
        console.error('❌ Error loading problems from Firebase Realtime Database:', error);
        setProblems([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up Firebase Realtime Database listener:', error);
      setProblems([]);
      setLoading(false);
    }
  }, []);

  const handleViewDetails = (problem) => {
    setSelectedProblem(problem);
    setShowModal(true);
  };

  const handleDelete = async (problem) => {
    showConfirm(
      'समस्या हटवा',
      'तुम्हाला खात्री आहे की तुम्ही ही समस्या हटवू इच्छिता?',
      async () => {
        try {
          console.log('Deleting problem from report_issues node with ID:', problem.id);
          const problemRef = ref(database, `report_issues/${problem.id}`);
          await remove(problemRef);
          console.log('Problem deleted from report_issues node successfully');
          showSuccess('यशस्वी!', 'समस्या यशस्वीरित्या हटवली गेली!');
        } catch (error) {
          console.error('Error deleting problem from report_issues node:', error);
          showError('त्रुटी!', 'समस्या हटवताना त्रुटी आली: ' + error.message);
        }
      },
      'हटवा',
      'रद्द करा'
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return '#ff9933';
      case 'reviewed': return '#10b981';
      case 'resolved': return '#3b82f6';
      case 'inProgress': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'new': return 'नवीन';
      case 'reviewed': return 'पाहिले';
      case 'resolved': return 'सोडवले';
      case 'inProgress': return 'प्रगतीत';
      default: return 'अज्ञात';
    }
  };

  if (loading) {
    return (
      <div className="samasya-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="समस्या डेटा लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="samasya-container">
      <div className="samasya-header">
        <h1>समस्या व्यवस्थापन</h1>
        <p>नागरिकांकडून आलेल्या समस्या पहा आणि त्यांचे निराकरण करा</p>
        <div className="stats-row">
          <div className="stat-card">
            <i className='bx bx-message-dots'></i>
            <div className="stat-info">
              <span className="stat-number">{problems.length}</span>
              <span className="stat-label">एकूण समस्या</span>
            </div>
          </div>
          <div className="stat-card">
            <i className='bx bx-time'></i>
            <div className="stat-info">
              <span className="stat-number">{problems.filter(p => p.status === 'new').length}</span>
              <span className="stat-label">नवीन समस्या</span>
            </div>
          </div>
          <div className="stat-card">
            <i className='bx bx-check-circle'></i>
            <div className="stat-info">
              <span className="stat-number">{problems.filter(p => p.status === 'resolved' || p.status === 'reviewed').length}</span>
              <span className="stat-label">सोडवलेली</span>
            </div>
          </div>
        </div>
      </div>


      {/* Problems List */}
      <div className="problems-section">

        {problems.length === 0 ? (
          <div className="empty-state">
            <i className='bx bx-message-dots'></i>
            <h3>Report Issues Node Empty</h3>
            <p>Firebase Realtime Database 'report_issues' node मध्ये अद्याप कोणतीही data नाही</p>
          </div>
        ) : (
          <div className="problems-grid">
            {problems.map((problem) => (
              <div key={problem.id} className="problem-card">
                <div className="problem-header-card">
                  <div className="problem-title-section">
                    <h3>{problem.title || problem.feedback || problem.feedbacks || problem.name || problem.subject || 'शीर्षक नाही'}</h3>
                    <div 
                      className="status-badge" 
                      style={{ backgroundColor: getStatusColor(problem.status) }}
                    >
                      {getStatusText(problem.status)}
                    </div>
                  </div>
                  <div className="problem-actions">
                    <button 
                      className="view-btn"
                      onClick={() => handleViewDetails(problem)}
                      title="तपशील पहा"
                    >
                      <i className='bx bx-show'></i>
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(problem)}
                      title="हटवा"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </div>

                <div className="problem-content">
                  <div className="problem-description">
                    <p>{(() => {
                      const desc = problem.description || problem.problem || problem.problems || problem.details || problem.message || 'वर्णन उपलब्ध नाही';
                      return desc.length > 150 ? desc.substring(0, 150) + '...' : desc;
                    })()}</p>
                  </div>
                  
                  <div className="problem-meta">
                    {problem.createdAt && (
                      <div className="meta-item">
                        <i className='bx bx-calendar'></i>
                        <span>प्राप्त: {formatTimestamp(problem.createdAt)}</span>
                      </div>
                    )}
                    {problem.userInfo && (
                      <div className="meta-item">
                        <i className='bx bx-user'></i>
                        <span>वापरकर्ता: {problem.userInfo.name || 'अज्ञात'}</span>
                      </div>
                    )}
                    {problem.location && (
                      <div className="meta-item">
                        <i className='bx bx-map'></i>
                        <span>स्थान: {problem.location}</span>
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
      {showModal && selectedProblem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>समस्या तपशील</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <i className='bx bx-x'></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3><i className='bx bx-text'></i> शीर्षक</h3>
                <p>{selectedProblem.title || selectedProblem.feedback || selectedProblem.feedbacks || selectedProblem.name || selectedProblem.subject || 'शीर्षक उपलब्ध नाही'}</p>
              </div>

              <div className="detail-section">
                <h3><i className='bx bx-detail'></i> संपूर्ण वर्णन</h3>
                <p>{selectedProblem.description || selectedProblem.problem || selectedProblem.problems || selectedProblem.details || selectedProblem.message || 'वर्णन उपलब्ध नाही'}</p>
              </div>

              {selectedProblem.location && (
                <div className="detail-section">
                  <h3><i className='bx bx-map'></i> समस्येचे स्थान</h3>
                  <p>{selectedProblem.location}</p>
                </div>
              )}

              {selectedProblem.userInfo && (
                <div className="detail-section">
                  <h3><i className='bx bx-user'></i> वापरकर्ता माहिती</h3>
                  <div className="user-details">
                    <p><strong>नाव:</strong> {selectedProblem.userInfo.name || 'उपलब्ध नाही'}</p>
                    <p><strong>ईमेल:</strong> {selectedProblem.userInfo.email || 'उपलब्ध नाही'}</p>
                    <p><strong>फोन:</strong> {selectedProblem.userInfo.phone || 'उपलब्ध नाही'}</p>
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h3><i className='bx bx-info-circle'></i> स्थिती</h3>
                <div 
                  className="status-badge large" 
                  style={{ backgroundColor: getStatusColor(selectedProblem.status) }}
                >
                  {getStatusText(selectedProblem.status)}
                </div>
              </div>

              <div className="detail-section">
                <h3><i className='bx bx-calendar'></i> दिनांक माहिती</h3>
                <p><strong>प्राप्त:</strong> {formatTimestamp(selectedProblem.createdAt)}</p>
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

export default SamasyaManda;
