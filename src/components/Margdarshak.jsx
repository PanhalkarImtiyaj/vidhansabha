import { useState, useEffect } from 'react';
import { ref, push, onValue, update, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { uploadImageWithFallback, deleteImageFromStorage, validateImageFile } from '../utils/firebaseStorage';
import { Loader, UniversalAlert } from './common';
import { useAlert } from '../hooks/useAlert';
import './Margdarshak.css';

function Margdarshak() {
  // State for stored data
  const [leadersData, setLeadersData] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();
  const [editingLeader, setEditingLeader] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    image: null,
    imagePreview: null,
    title: '',
    description: ''
  });

  // Load leaders from Firebase
  useEffect(() => {
    const leadersRef = ref(database, 'margdarshak');
    setDataLoading(true);
    
    const unsubscribe = onValue(leadersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const leadersArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setLeadersData(leadersArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        setLeadersData([]);
      }
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading leaders:', error);
      setLeadersData([]);
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
    
    try {
      let imageData = null;
      
      // Upload image if exists
      if (formData.image) {
        const uploadResult = await uploadImageWithFallback(formData.image, 'margdarshak');
        imageData = {
          url: uploadResult.url,
          fileName: uploadResult.originalName,
          storagePath: uploadResult.path,
          uploadMethod: uploadResult.uploadMethod,
          fileSize: (uploadResult.size / 1024 / 1024).toFixed(2) + ' MB',
          fileType: uploadResult.type
        };
      }
      
      if (editingLeader) {
        // Update existing leader
        const updateData = {
          title: formData.title,
          description: formData.description,
          updatedAt: new Date().toISOString()
        };
        
        // Only update image if new image is provided
        if (imageData) {
          // Delete old image from storage if it exists
          if (editingLeader.imageData && editingLeader.imageData.storagePath) {
            await deleteImageFromStorage(editingLeader.imageData.storagePath);
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
        
        const leaderRef = ref(database, `margdarshak/${editingLeader.id}`);
        await update(leaderRef, updateData);
        showSuccess('यशस्वी!', 'मार्गदर्शक यशस्वीरित्या अपडेट केले गेले!');
      } else {
        // Add new leader
        const leadersRef = ref(database, 'margdarshak');
        await push(leadersRef, {
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showSuccess('यशस्वी!', 'नवीन मार्गदर्शक यशस्वीरित्या जोडले गेले!');
      }

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving leader:', error);
      showError('त्रुटी!', 'मार्गदर्शक जतन करताना त्रुटी आली: ' + error.message);
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
    setEditingLeader(null);
  };

  // Handle edit
  const handleEdit = (leader) => {
    setFormData({
      ...leader,
      image: null // Reset file input
    });
    setEditingLeader(leader);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (leader) => {
    showConfirm(
      'मार्गदर्शक हटवा',
      'तुम्हाला खात्री आहे की तुम्ही हे मार्गदर्शक हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
      try {
        // Delete image from storage if exists
        if (leader.imageData && leader.imageData.storagePath) {
          await deleteImageFromStorage(leader.imageData.storagePath);
        }
        // Also check for separate storagePath field (new structure)
        else if (leader.storagePath) {
          await deleteImageFromStorage(leader.storagePath);
        }
        
        // Delete from database
        const leaderRef = ref(database, `margdarshak/${leader.id}`);
        await remove(leaderRef);
        showSuccess('हटवले!', 'मार्गदर्शक यशस्वीरित्या हटवले गेले!');
      } catch (error) {
        console.error('Error deleting leader:', error);
        showError('त्रुटी!', 'मार्गदर्शक हटवताना त्रुटी आली: ' + error.message);
      }
    });
  };

  if (dataLoading) {
    return (
      <div className="margdarshak-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="मार्गदर्शक माहिती लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="margdarshak-container">
      <div className="margdarshak-header">
        <h1><i className='bx bx-target-lock'></i> मार्गदर्शक</h1>
        <p>प्रेरणादायी नेते आणि मार्गदर्शक व्यक्तिमत्त्वे</p>
        <button 
          className="add-leader-btn"
          onClick={() => setShowForm(true)}
        >
          <i className='bx bx-plus'></i> नवीन मार्गदर्शक जोडा
        </button>
      </div>

      {/* Leaders Grid */}
      <div className="leaders-grid">
        {leadersData.length === 0 ? (
          <div className="no-leaders">
            <i className='bx bx-info-circle'></i>
            <p>अजून कोणतेही मार्गदर्शक जोडले गेले नाहीत</p>
          </div>
        ) : (
          leadersData.map((leader) => (
            <div key={leader.id} className="leader-card">
              <div className="leader-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(leader)}
                  title="संपादित करा"
                >
                  <i className='bx bx-edit'></i>
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(leader)}
                  title="हटवा"
                >
                  <i className='bx bx-trash'></i>
                </button>
              </div>

              <div className="leader-content">
                <h3 className="leader-title">{leader.title}</h3>
                
                <div className="leader-image">
                  <img 
                    src={(leader.imageData && leader.imageData.url) || leader.image || `https://via.placeholder.com/200x200/ff9933/ffffff?text=${encodeURIComponent(leader.title || 'मार्गदर्शक')}`}
                    alt={leader.title}
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/200x200/ff9933/ffffff?text=${encodeURIComponent(leader.title || 'मार्गदर्शक')}`;
                    }}
                  />
                </div>

                <p className="leader-description">{leader.description}</p>
                
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
                {editingLeader ? 'मार्गदर्शक संपादित करा' : 'नवीन मार्गदर्शक जोडा'}
              </h2>
              <button className="close-btn" onClick={resetForm}>
                <i className='bx bx-x'></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="leader-form">
              <div className="form-group">
                <label htmlFor="title"><i className='bx bx-user'></i> मार्गदर्शकाचे नाव</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="मार्गदर्शकाचे पूर्ण नाव टाका"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="image"><i className='bx bx-image'></i> मार्गदर्शकाची फोटो</label>
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
                <label htmlFor="description"><i className='bx bx-detail'></i> संक्षिप्त परिचय / विचार</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="मार्गदर्शकाचा संक्षिप्त परिचय, त्यांचे विचार किंवा प्रेरणादायी संदेश लिहा..."
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
                      {editingLeader ? 'अपडेट करा' : 'जतन करा'}
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

export default Margdarshak;