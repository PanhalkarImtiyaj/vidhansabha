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
import './KeleliKame.css';

// Utility function to safely format timestamps
const format1Timestamp = (timestamp) => {
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

function KeleliKame() {
  // State for stored data
  const [worksData, setWorksData] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // State for form
  const [showForm, setShowForm] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    image: null,
    imagePreview: null,
    title: '',
    description: ''
  });
  
  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();



  // Load works from Firestore on component mount
  useEffect(() => {
    console.log('Setting up Firestore listener for keleliKame collection');
    console.log('Firestore instance:', firestore);
    setDataLoading(true);
    
    const worksCollection = collection(firestore, 'keleliKame');
    const q = query(worksCollection, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Firestore snapshot received:', snapshot.size, 'documents');
      const worksArray = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Works data loaded:', worksArray);
      setWorksData(worksArray);
      setDataLoading(false);
    }, (error) => {
      console.error('Error fetching works:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      setWorksData([]);
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
        showWarning('फाइल त्रुटी', error.message);
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
        showWarning('फाइल त्रुटी', error.message);
      }
    }
  };


  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    
    console.log('Form submission started');
    console.log('Form data:', formData);
    console.log('Editing work:', editingWork);
    
    try {
      let imageData = null;
      
      // Upload image if exists
      if (formData.image) {
        console.log('Uploading image to Firebase Storage...');
        const uploadResult = await uploadImageWithFallback(formData.image, 'keleliKame');
        imageData = {
          url: uploadResult.url,
          fileName: uploadResult.originalName,
          storagePath: uploadResult.path,
          uploadMethod: uploadResult.uploadMethod,
          fileSize: (uploadResult.size / 1024 / 1024).toFixed(2) + ' MB',
          fileType: uploadResult.type
        };
        console.log('Image uploaded successfully:', imageData);
      }
      
      if (editingWork) {
        // Update existing work
        console.log('Updating existing work with ID:', editingWork.id);
        const updateData = {
          title: formData.title,
          description: formData.description,
          updatedAt: serverTimestamp()
        };
        
        // Only update image if new image is provided
        if (imageData) {
          // Delete old image from storage if it exists
          if (editingWork.imageData && editingWork.imageData.storagePath) {
            await deleteImageFromStorage(editingWork.imageData.storagePath);
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
        
        const workDocRef = doc(firestore, 'keleliKame', editingWork.id);
        console.log('Update data:', updateData);
        await updateDoc(workDocRef, updateData);
        console.log('Work updated successfully');
        showSuccess('यशस्वी!', 'काम यशस्वीरित्या अपडेट केले गेले!');
      } else {
        // Add new work
        console.log('Adding new work to Firestore');
        const worksCollection = collection(firestore, 'keleliKame');
        const newWorkData = {
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
        };
        console.log('New work data:', newWorkData);
        const docRef = await addDoc(worksCollection, newWorkData);
        console.log('Work added successfully with ID:', docRef.id);
        showSuccess('यशस्वी!', 'नवीन काम यशस्वीरित्या जोडले गेले!');
      }

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving work:', error);
      console.error('Error details:', error.code, error.message);
      showError('त्रुटी!', 'काम जतन करताना त्रुटी आली: ' + error.message);
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
    setEditingWork(null);
  };

  // Handle edit
  const handleEdit = (work) => {
    setFormData({
      ...work,
      image: null // Reset file input
    });
    setEditingWork(work);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (work) => {
    showConfirm(
      'काम हटवा',
      'तुम्हाला खात्री आहे की तुम्ही हे काम हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
      try {
        // Delete image from storage if exists
        if (work.imageData && work.imageData.storagePath) {
          await deleteImageFromStorage(work.imageData.storagePath);
        }
        // Also check for separate storagePath field (new structure)
        else if (work.storagePath) {
          await deleteImageFromStorage(work.storagePath);
        }
        
        // Delete document from Firestore
        const workDocRef = doc(firestore, 'keleliKame', work.id);
        await deleteDoc(workDocRef);
        showSuccess('हटवले!', 'काम यशस्वीरित्या हटवले गेले!');
      } catch (error) {
        console.error('Error deleting work:', error);
        showError('त्रुटी!', 'काम हटवताना त्रुटी आली: ' + error.message);
      }
    });
  };


  if (dataLoading) {
    return (
      <div className="keleli-kame-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="केलेली कामे लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="keleli-kame-container">
      <div className="keleli-kame-header">
        <h1><i className='bx bx-check-circle'></i> केलेली कामे</h1>
        <p>पूर्ण झालेली कामे व्यवस्थापित करा</p>
        <button 
          className="add-work-btn"
          onClick={() => setShowForm(true)}
        >
          <i className='bx bx-plus'></i> नवीन काम जोडा
        </button>
      </div>

      {/* Works Grid */}
      <div className="works-grid">
        {worksData.length === 0 ? (
          <div className="no-works">
            <i className='bx bx-info-circle'></i>
            <p>अजून कोणतीही कामे जोडली गेली नाहीत</p>
          </div>
        ) : (
          worksData.map((work) => (
            <div key={work.id} className="work-card">
              <div className="work-image">
                <img 
                  src={(work.imageData && work.imageData.url) || work.image || `https://via.placeholder.com/350x200/ff9933/ffffff?text=${encodeURIComponent(work.title || 'काम')}`}
                  alt={work.title}
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/350x200/ff9933/ffffff?text=${encodeURIComponent(work.title || 'काम')}`;
                  }}
                />
              </div>
              <div className="work-content">
                <h3 className="work-title">{work.title}</h3>
                <p className="work-description">{work.description}</p>
              </div>
              <div className="work-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(work)}
                  title="संपादित करा"
                >
                  <i className='bx bx-edit'></i>
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(work)}
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
                {editingWork ? 'काम संपादित करा' : 'नवीन काम जोडा'}
              </h2>
              <button className="close-btn" onClick={resetForm}>
                <i className='bx bx-x'></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="work-form">
              <div className="form-group">
                <label htmlFor="image"><i className='bx bx-image'></i> काम की फोटो अपलोड</label>
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
                <label htmlFor="title"><i className='bx bx-text'></i> कामाचे नाव / शीर्षक</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="कामाचे नाव टाका"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description"><i className='bx bx-detail'></i> कामाचा पूरा विवरण</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="कामाची संपूर्ण माहिती लिहा..."
                  rows="4"
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
                      {editingWork ? 'अपडेट करा' : 'जतन करा'}
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

export default KeleliKame;
