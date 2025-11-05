import { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { Loader, UniversalAlert } from './common';
import { useAlert } from '../hooks/useAlert';
import './Pratikriya.css';

function Pratikriya() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();

  // Load feedbacks from Realtime Database: feedbacks2
  useEffect(() => {
    setLoading(true);

    try {
      const feedbacksRef = ref(database, 'feedbacks2');
      const unsubscribe = onValue(
        feedbacksRef,
        (snapshot) => {
          const value = snapshot.val();
          if (value) {
            const list = Object.entries(value).map(([id, item]) => ({ id, ...item }));
            setFeedbacks(list);
          } else {
            setFeedbacks([]);
          }
          setLoading(false);
        },
        (error) => {
          console.error('❌ Error loading feedbacks from Realtime Database:', error);
          setFeedbacks([]);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up Realtime Database listener:', error);
      setFeedbacks([]);
      setLoading(false);
    }
  }, []);

  const handleDelete = async (id) => {
    showConfirm(
      'प्रतिक्रिया हटवा',
      'तुम्हाला खात्री आहे की तुम्ही ही प्रतिक्रिया हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
        try {
          await remove(ref(database, `feedbacks2/${id}`));
          showSuccess('हटवली!', 'प्रतिक्रिया यशस्वीरित्या हटवली गेली!');
        } catch (error) {
          console.error('❌ Error deleting feedback:', error);
          showError('त्रुटी!', 'हटवताना त्रुटी आली: ' + error.message);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="pratikriya-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="Realtime Database मधून डेटा लोड होत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="pratikriya-container">
      <div className="pratikriya-header">
        <div className="header-content">
          <div className="header-text">
            <h1>प्रतिक्रिया</h1>
            <p>नाव, ईमेल आणि संदेश</p>
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <i className='bx bx-message-dots'></i>
            <div className="stat-info">
              <span className="stat-number">{feedbacks.length}</span>
              <span className="stat-label">एकूण प्रतिक्रिया</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedbacks List (Realtime DB: feedbacks2) */}
      <div className="feedbacks-section">
        {/* <div className="section-header">
          <h2>Realtime Database: feedbacks2 ({feedbacks.length})</h2>
          <small style={{color: '#666', marginTop: '0.5rem', display: 'block'}}>
            Firebase Realtime Database मधील डेटा
          </small>
        </div> */}

        {feedbacks.length === 0 ? (
          <div className="empty-state">
            <i className='bx bx-message-dots'></i>
            <h3>डेटा उपलब्ध नाही</h3>
            <p>Realtime Database 'feedbacks2' मध्ये अद्याप कोणताही डेटा नाही</p>
          </div>
        ) : (
          <div className="feedbacks-grid">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="feedback-card">
                <div className="feedback-header-card">
                  <div className="feedback-title-section">
                    <h3>{feedback.name || 'नाव उपलब्ध नाही'}</h3>
                  </div>
                  <div className="feedback-actions">
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(feedback.id)}
                      title="हटवा"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </div>

                <div className="feedback-content">
                  <div className="feedback-description">
                    <p>{feedback.message || 'संदेश उपलब्ध नाही'}</p>
                  </div>
                  
                  <div className="feedback-meta">
                    {feedback.phone && (
                      <div className="meta-item">
                        <i className='bx bx-phone'></i>
                        <span>फोन: {feedback.phone}</span>
                      </div>
                    )}
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

export default Pratikriya;