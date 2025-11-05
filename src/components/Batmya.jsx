import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  orderBy,
  query,
  serverTimestamp 
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { uploadImageWithFallback, deleteImageFromStorage, validateImageFile } from '../utils/firebaseStorage';
import { Loader, UniversalAlert } from './common';
import { useAlert } from '../hooks/useAlert';
import './Batmya.css';

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

function Batmya() {
  // State for stored data
  const [newsData, setNewsData] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();
  
  // State for form
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [formData, setFormData] = useState({
    image: null,
    title: '',
    description: ''
  });

  // Load news from Firestore
  useEffect(() => {
    const newsCollection = collection(firestore, 'batmya');
    const q = query(newsCollection, orderBy('createdAt', 'desc'));
    setDataLoading(true);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newsArray = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNewsData(newsArray);
      setDataLoading(false);
    }, (error) => {
      console.error('Error fetching news:', error);
      setNewsData([]);
      setDataLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    
    if (files && files[0]) {
      try {
        validateImageFile(files[0], 5); // 5MB limit
        // Create URL for image preview
        const imageUrl = URL.createObjectURL(files[0]);
        setFormData(prev => ({
          ...prev,
          [name]: files[0],
          imagePreview: imageUrl
        }));
      } catch (error) {
        showError('त्रुटी!', error.message);
        e.target.value = ''; // Clear the input
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.target.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.target.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.target.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      try {
        validateImageFile(files[0], 5); // 5MB limit
        const imageUrl = URL.createObjectURL(files[0]);
        setFormData(prev => ({
          ...prev,
          image: files[0],
          imagePreview: imageUrl
        }));
      } catch (error) {
        showError('त्रुटी!', error.message);
      }
    }
  };


  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    
    try {
      let imageData = null;
      
      // Upload image if exists
      if (formData.image) {
        const uploadResult = await uploadImageWithFallback(formData.image, 'batmya');
        imageData = {
          url: uploadResult.url,
          fileName: uploadResult.originalName,
          storagePath: uploadResult.path,
          uploadMethod: uploadResult.uploadMethod,
          fileSize: (uploadResult.size / 1024 / 1024).toFixed(2) + ' MB',
          fileType: uploadResult.type
        };
      }
      
      if (editingNews) {
        // Update existing news
        const updateData = {
          title: formData.title,
          description: formData.description,
          updatedAt: serverTimestamp()
        };
        
        // Only update image if new image is provided
        if (imageData) {
          // Delete old image from storage if it exists
          if (editingNews.imageData && editingNews.imageData.storagePath) {
            await deleteImageFromStorage(editingNews.imageData.storagePath);
          }
          updateData.imageData = imageData;
          updateData.image = imageData.url; // Keep for backward compatibility
          
          // Add separate fields for easy access
          updateData.fileName = imageData.fileName;
          updateData.fileSize = imageData.fileSize;
          updateData.fileType = imageData.fileType;
          updateData.storagePath = imageData.storagePath;
          updateData.uploadMethod = imageData.uploadMethod;
        }
        
        const newsDocRef = doc(firestore, 'batmya', editingNews.id);
        await updateDoc(newsDocRef, updateData);
        showSuccess('यशस्वी!', 'बातमी यशस्वीरित्या अपडेट केली गेली!');
      } else {
        // Add new news
        const newsCollection = collection(firestore, 'batmya');
        await addDoc(newsCollection, {
          title: formData.title,
          description: formData.description,
          image: imageData ? imageData.url : null, // Keep for backward compatibility
          imageData: imageData,
          // Separate fields for easy access
          ...(imageData && {
            fileName: imageData.fileName,
            fileSize: imageData.fileSize,
            fileType: imageData.fileType,
            storagePath: imageData.storagePath,
            uploadMethod: imageData.uploadMethod
          }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showSuccess('यशस्वी!', 'नवीन बातमी यशस्वीरित्या जोडली गेली!');
      }

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving news:', error);
      showError('त्रुटी!', 'बातमी जतन करताना त्रुटी आली: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Reset form and close
  const resetForm = () => {
    setFormData({
      image: null,
      imagePreview: null,
      title: '',
      description: ''
    });
    setShowForm(false);
    setEditingNews(null);
  };

  // Handle edit
  const handleEdit = (news) => {
    setFormData({
      ...news,
      image: null // Reset file input
    });
    setEditingNews(news);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (news) => {
    showConfirm(
      'बातमी हटवा',
      'तुम्हाला खात्री आहे की तुम्ही ही बातमी हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
      try {
        // Delete image from storage if exists
        if (news.imageData && news.imageData.storagePath) {
          await deleteImageFromStorage(news.imageData.storagePath);
        }
        // Also check for separate storagePath field (new structure)
        else if (news.storagePath) {
          await deleteImageFromStorage(news.storagePath);
        }
        
        // Delete document from Firestore
        const newsDocRef = doc(firestore, 'batmya', news.id);
        await deleteDoc(newsDocRef);
        showSuccess('हटवली!', 'बातमी यशस्वीरित्या हटवली गेली!');
      } catch (error) {
        console.error('Error deleting news:', error);
        showError('त्रुटी!', 'बातमी हटवताना त्रुटी आली: ' + error.message);
      }
    });
  };

  if (dataLoading) {
    return (
      <div className="batmya-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="बातम्या लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="batmya-container">
      <div className="batmya-header">
        <h1><i className='bx bx-news'></i> बातम्या/कार्यक्रम</h1>
        <p>नवीन बातम्या आणि कार्यक्रम व्यवस्थापित करा</p>
        <button 
          className="add-news-btn"
          onClick={() => setShowForm(true)}
        >
          <i className='bx bx-plus'></i> नवीन बातमी जोडा
        </button>
      </div>

      {/* News Grid */}
      <div className="news-grid">
        {newsData.length === 0 ? (
          <div className="no-news">
            <i className='bx bx-info-circle'></i>
            <p>अजून कोणत्याही बातम्या जोडल्या गेल्या नाहीत</p>
          </div>
        ) : (
          newsData.map((news) => (
            <div key={news.id} className="news-card">
              <div className="news-image">
                <img 
                  src={(news.imageData && news.imageData.url) || news.image || `https://via.placeholder.com/350x200/ff9933/ffffff?text=${encodeURIComponent(news.title || 'बातमी')}`}
                  alt={news.title}
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/350x200/ff9933/ffffff?text=${encodeURIComponent(news.title || 'बातमी')}`;
                  }}
                />
              </div>
              <div className="news-content">
                <h3 className="news-title">{news.title}</h3>
                <p className="news-description">{news.description}</p>
                <div className="news-date">
                  <i className='bx bx-time'></i>
                  <span>{formatTimestamp(news.createdAt)}</span>
                </div>
              </div>
              <div className="news-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(news)}
                  title="संपादित करा"
                >
                  <i className='bx bx-edit'></i>
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(news)}
                  title="हटवा"
                >
                  <i className='bx bx-trash'></i>
                </button>
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
                {editingNews ? 'बातमी संपादित करा' : 'नवीन बातमी जोडा'}
              </h2>
              <button className="close-btn" onClick={resetForm}>
                <i className='bx bx-x'></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="news-form">
              <div className="form-group">
                <label htmlFor="image"><i className='bx bx-image'></i> बातमीची फोटो अपलोड</label>
                <div className="file-upload-container">
                  <input
                    type="file"
                    id="image"
                    name="image"
                    onChange={handleInputChange}
                    accept="image/*"
                    className="file-input"
                  />
                  <label 
                    htmlFor="image" 
                    className="file-upload-label"
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="upload-content">
                      <i className='bx bx-cloud-upload'></i>
                      <span className="upload-text">
                        {formData.image ? formData.image.name : 'फोटो निवडा किंवा येथे ड्रॅग करा'}
                      </span>
                      <span className="upload-hint">JPG, PNG, GIF, WebP (Max 5MB)</span>
                    </div>
                  </label>
                  {formData.image && (
                    <div className="file-preview">
                      <i className='bx bx-check-circle'></i>
                      <span>फाइल निवडली गेली: {formData.image.name}</span>
                      {formData.imagePreview && (
                        <div className="image-preview-container">
                          <img 
                            src={formData.imagePreview} 
                            alt="Preview" 
                            className="image-preview"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="title"><i className='bx bx-text'></i> बातमीचे शीर्षक</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="बातमीचे शीर्षक टाका"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description"><i className='bx bx-detail'></i> बातमीचा संपूर्ण विवरण</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="बातमीची संपूर्ण माहिती लिहा..."
                  rows="6"
                  required
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  <i className='bx bx-x'></i> रद्द करा
                </button>
                <button 
                  type="submit" 
                  className={`submit-btn ${submitLoading ? 'loading-btn' : ''}`}
                  disabled={submitLoading}
                >
                  {submitLoading ? (
                    <>
                      <i className='bx bx-loader-alt bx-spin'></i>
                      जतन करत आहे...
                    </>
                  ) : (
                    <>
                      <i className='bx bx-save'></i>
                      {editingNews ? 'अपडेट करा' : 'जतन करा'}
                    </>
                  )}
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

export default Batmya;
