import { useState, useEffect } from 'react';
import { 
  ref,
  push,
  onValue,
  remove,
  set
} from 'firebase/database';
import { database } from '../firebase/config';
import { Loader } from './common';
import { useAlert } from '../hooks/useAlert';
import UniversalAlert from './common/UniversalAlert';
import './MahatvachiSank.css';

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

function MahatvachiSank() {
  // State for stored data
  const [websitesData, setWebsitesData] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // State for form
  const [showForm, setShowForm] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    url: ''
  });

  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();


  // Load websites from Firebase Realtime Database
  useEffect(() => {
    const websitesRef = ref(database, 'mahatvachiSank');
    setDataLoading(true);
    
    const unsubscribe = onValue(websitesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const websitesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sort by createdAt descending
        websitesArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setWebsitesData(websitesArray);
      } else {
        setWebsitesData([]);
      }
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading websites:', error);
      setWebsitesData([]);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingWebsite) {
        // Update existing website
        const websiteRef = ref(database, `mahatvachiSank/${editingWebsite.id}`);
        await set(websiteRef, {
          ...formData,
          createdAt: editingWebsite.createdAt, // Keep original creation date
          updatedAt: new Date().toISOString()
        });
        showSuccess('यशस्वी!', 'संकेतस्थळ यशस्वीरित्या अपडेट केले गेले!');
      } else {
        // Add new website
        const websitesRef = ref(database, 'mahatvachiSank');
        await push(websitesRef, {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showSuccess('यशस्वी!', 'नवीन संकेतस्थळ यशस्वीरित्या जोडले गेले!');
      }

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving website:', error);
      showError('त्रुटी!', 'संकेतस्थळ जतन करताना त्रुटी आली: ' + error.message);
    }
  };

  // Reset form and close
  const resetForm = () => {
    setFormData({
      title: '',
      url: ''
    });
    setShowForm(false);
    setEditingWebsite(null);
  };

  // Handle edit
  const handleEdit = (website) => {
    setFormData({
      ...website
    });
    setEditingWebsite(website);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (website) => {
    showConfirm(
      'संकेतस्थळ हटवा',
      'तुम्हाला खात्री आहे की तुम्ही हे संकेतस्थळ हटवू इच्छिता?',
      async () => {
        try {
          const websiteRef = ref(database, `mahatvachiSank/${website.id}`);
          await remove(websiteRef);
          showSuccess('यशस्वी!', 'संकेतस्थळ यशस्वीरित्या हटवले गेले!');
        } catch (error) {
          console.error('Error deleting website:', error);
          showError('त्रुटी!', 'संकेतस्थळ हटवताना त्रुटी आली: ' + error.message);
        }
      },
      'हटवा',
      'रद्द करा'
    );
  };

  // Handle website visit
  const handleVisitWebsite = (url) => {
    if (url) {
      // Add https:// if not present
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(fullUrl, '_blank');
    }
  };

  if (dataLoading) {
    return (
      <div className="mahatvachi-sank-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="संकेतस्थळे लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="mahatvachi-sank-container">
      <div className="mahatvachi-sank-header">
        <h1><i className='bx bx-search-alt'></i> महत्त्वाची संकेतस्थळे</h1>
        <p>उपयुक्त सरकारी आणि महत्त्वाच्या संकेतस्थळांची यादी</p>
        <button 
          className="add-website-btn"
          onClick={() => setShowForm(true)}
        >
          <i className='bx bx-plus'></i> नवीन संकेतस्थळ जोडा
        </button>
      </div>

      {/* Websites List */}
      <div className="websites-list">
        {websitesData.length === 0 ? (
          <div className="no-websites">
            <i className='bx bx-info-circle'></i>
            <p>अजून कोणतीही संकेतस्थळे जोडली गेली नाहीत</p>
          </div>
        ) : (
          websitesData.map((website) => (
            <div key={website.id} className="website-item">
              <div className="website-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(website)}
                  title="संपादित करा"
                >
                  <i className='bx bx-edit'></i>
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(website)}
                  title="हटवा"
                >
                  <i className='bx bx-trash'></i>
                </button>
              </div>

              <div className="website-content" onClick={() => handleVisitWebsite(website.url)}>
                <div className="website-header">
                  <h3 className="website-title">{website.title}</h3>
                </div>
                
                <div className="website-url">
                  <i className='bx bx-link'></i>
                  <span>{website.url}</span>
                </div>

                <div className="visit-indicator">
                  <i className='bx bx-right-arrow-alt'></i>
                  <span>भेट द्या</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="form-modal-overlay" onClick={resetForm}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>
                <i className='bx bx-plus-circle'></i>
                {editingWebsite ? 'संकेतस्थळ संपादित करा' : 'नवीन संकेतस्थळ जोडा'}
              </h2>
              <button className="close-btn" onClick={resetForm}>
                <i className='bx bx-x'></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="website-form">
              <div className="form-group">
                <label htmlFor="title"><i className='bx bx-text'></i> संकेतस्थळाचे नाव</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="उदा. महाराष्ट्र सरकार"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="url"><i className='bx bx-link'></i> संकेतस्थळाचा पत्ता (URL)</label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://www.maharashtra.gov.in/"
                  required
                />
              </div>


              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  <i className='bx bx-x'></i> रद्द करा
                </button>
                <button type="submit" className="submit-btn">
                  <i className='bx bx-save'></i>
                  {editingWebsite ? 'अपडेट करा' : 'जतन करा'}
                </button>
              </div>
            </form>
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

export default MahatvachiSank;
