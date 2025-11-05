import { useState, useEffect } from 'react';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { database } from '../firebase/config';
import { Loader, UniversalAlert } from './common';
import { useAlert } from '../hooks/useAlert';
import './Sarkariyojna.css';

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

function Sarkariyojna() {
  const [schemes, setSchemes] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();
  const [editingScheme, setEditingScheme] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eligibility: '',
    howToApply: '',
    requiredDocuments: ''
  });

  // Load schemes from Firebase
  useEffect(() => {
    const schemesRef = ref(database, 'sarkariyojna');
    setDataLoading(true);
    
    const unsubscribe = onValue(schemesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const schemesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setSchemes(schemesArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        setSchemes([]);
      }
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading schemes:', error);
      setSchemes([]);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      showWarning('अपूर्ण माहिती', 'कृपया योजनेचे शीर्षक प्रविष्ट करा!');
      return;
    }
    
    if (!formData.description.trim()) {
      showWarning('अपूर्ण माहिती', 'कृपया योजनेचे वर्णन प्रविष्ट करा!');
      return;
    }
    
    setSubmitLoading(true);
    
    try {
      const schemeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        eligibility: formData.eligibility.trim(),
        howToApply: formData.howToApply.trim(),
        requiredDocuments: formData.requiredDocuments.trim()
      };
      
      if (editingScheme) {
        // Update existing scheme
        const schemeRef = ref(database, `sarkariyojna/${editingScheme.id}`);
        await update(schemeRef, {
          ...schemeData,
          updatedAt: new Date().toISOString()
        });
        showSuccess('यशस्वी!', 'योजना यशस्वीरित्या अपडेट केली गेली!');
      } else {
        // Add new scheme
        const schemesRef = ref(database, 'sarkariyojna');
        await push(schemesRef, {
          ...schemeData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showSuccess('यशस्वी!', 'नवीन योजना यशस्वीरित्या जोडली गेली!');
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        eligibility: '',
        howToApply: '',
        requiredDocuments: ''
      });
      setShowForm(false);
      setEditingScheme(null);
    } catch (error) {
      console.error('Error saving scheme:', error);
      showError('त्रुटी!', error.message || 'योजना जतन करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (scheme) => {
    setFormData({
      title: scheme.title || '',
      description: scheme.description || '',
      eligibility: scheme.eligibility || '',
      howToApply: scheme.howToApply || '',
      requiredDocuments: scheme.requiredDocuments || ''
    });
    setEditingScheme(scheme);
    setShowForm(true);
  };

  const handleDelete = async (scheme) => {
    showConfirm(
      'योजना हटवा',
      'तुम्हाला खात्री आहे की तुम्ही ही योजना हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
      try {
        const schemeRef = ref(database, `sarkariyojna/${scheme.id}`);
        await remove(schemeRef);
        showSuccess('हटवली!', 'योजना यशस्वीरित्या हटवली गेली!');
      } catch (error) {
        console.error('Error deleting scheme:', error);
        showError('त्रुटी!', 'योजना हटवताना त्रुटी आली: ' + error.message);
      }
    });
  };

  if (dataLoading) {
    return (
      <div className="sarkariyojna-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="सरकारी योजना लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="sarkariyojna-container">
      <div className="sarkariyojna-header">
        <h1>सरकारी योजना व्यवस्थापन</h1>
        <p>सरकारी योजनांची माहिती व्यवस्थापित करा</p>
        <button 
          className="add-scheme-btn"
          onClick={() => {
            setShowForm(true);
            setEditingScheme(null);
            setFormData({
              title: '',
              description: '',
              eligibility: '',
              howToApply: '',
              requiredDocuments: ''
            });
          }}
        >
          <i className='bx bx-plus'></i>
          नवीन योजना जोडा
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingScheme ? 'योजना संपादित करा' : 'नवीन योजना जोडा'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <i className='bx bx-x'></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="scheme-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="title"><i className='bx bx-text'></i> योजनेचे शीर्षक *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="योजनेचे शीर्षक प्रविष्ट करा"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description"><i className='bx bx-detail'></i> योजनेचे वर्णन *</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="योजनेचे तपशीलवार वर्णन प्रविष्ट करा"
                    rows="4"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="eligibility"><i className='bx bx-check-circle'></i> पात्रता निकष</label>
                  <textarea
                    id="eligibility"
                    name="eligibility"
                    value={formData.eligibility}
                    onChange={handleInputChange}
                    placeholder="या योजनेसाठी कोण पात्र आहे ते प्रविष्ट करा"
                    rows="3"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="howToApply"><i className='bx bx-edit-alt'></i> अर्ज कसा करावा</label>
                  <textarea
                    id="howToApply"
                    name="howToApply"
                    value={formData.howToApply}
                    onChange={handleInputChange}
                    placeholder="या योजनेसाठी अर्ज करण्याची प्रक्रिया प्रविष्ट करा"
                    rows="3"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="requiredDocuments"><i className='bx bx-file'></i> आवश्यक कागदपत्रे</label>
                  <textarea
                    id="requiredDocuments"
                    name="requiredDocuments"
                    value={formData.requiredDocuments}
                    onChange={handleInputChange}
                    placeholder="या योजनेसाठी लागणारी कागदपत्रे प्रविष्ट करा"
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                  रद्द करा
                </button>
                <button type="submit" className="submit-btn" disabled={submitLoading}>
                  {submitLoading ? 'प्रक्रिया सुरू आहे...' : (editingScheme ? 'अपडेट करा' : 'जतन करा')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schemes List */}
      <div className="schemes-section">
        <div className="section-header">
          <h2>योजना यादी ({schemes.length})</h2>
        </div>

        {schemes.length === 0 ? (
          <div className="empty-state">
            <i className='bx bx-building'></i>
            <h3>कोणतीही योजना आढळली नाही</h3>
            <p>नवीन योजना जोडण्यासाठी वरील बटण दाबा</p>
          </div>
        ) : (
          <div className="schemes-grid">
            {schemes.map((scheme) => (
              <div key={scheme.id} className="scheme-card">
                <div className="scheme-header-card">
                  <h3>{scheme.title}</h3>
                  <div className="scheme-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(scheme)}
                      title="संपादित करा"
                    >
                      <i className='bx bx-edit'></i>
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(scheme)}
                      title="हटवा"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </div>

                <div className="scheme-content">
                  <div className="scheme-description">
                    <h4><i className='bx bx-detail'></i> वर्णन:</h4>
                    <p>{scheme.description}</p>
                  </div>
                  
                  {scheme.eligibility && (
                    <div className="scheme-eligibility">
                      <h4><i className='bx bx-check-circle'></i> पात्रता निकष:</h4>
                      <p>{scheme.eligibility}</p>
                    </div>
                  )}
                  
                  {scheme.howToApply && (
                    <div className="scheme-apply">
                      <h4><i className='bx bx-edit-alt'></i> अर्ज कसा करावा:</h4>
                      <p>{scheme.howToApply}</p>
                    </div>
                  )}
                  
                  {scheme.requiredDocuments && (
                    <div className="scheme-documents">
                      <h4><i className='bx bx-file'></i> आवश्यक कागदपत्रे:</h4>
                      <p>{scheme.requiredDocuments}</p>
                    </div>
                  )}
                  
                  <div className="scheme-meta">
                    {scheme.createdAt && (
                      <div className="meta-item">
                        <i className='bx bx-calendar'></i>
                        <span>जोडले: {formatTimestamp(scheme.createdAt)}</span>
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

export default Sarkariyojna;