import { useState, useEffect } from 'react';
import { ref, push, onValue, update, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { uploadImageWithFallback, deleteImageFromStorage, validateImageFile } from '../utils/firebaseStorage';
import { Loader, UniversalAlert } from './common';
import { useAlert } from '../hooks/useAlert';
import './PakshaManu.css';

function PakshaManu() {
  // State for stored data
  const [partiesData, setPartiesData] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();
  
  // State for form
  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    image: null,
    imagePreview: null,
    title: '',
    description: ''
  });

  // Load parties from Firebase
  useEffect(() => {
    const partiesRef = ref(database, 'pakshaManu');
    setDataLoading(true);
    
    const unsubscribe = onValue(partiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const partiesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setPartiesData(partiesArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        setPartiesData([]);
      }
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading parties:', error);
      setPartiesData([]);
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

  // Reset form and close
  const resetForm = () => {
    setFormData({
      image: null,
      imagePreview: null,
      title: '',
      description: ''
    });
    setShowForm(false);
    setEditingParty(null);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    
    try {
      let imageData = null;
      
      // Upload image if exists
      if (formData.image) {
        const uploadResult = await uploadImageWithFallback(formData.image, 'pakshaManu');
        imageData = {
          url: uploadResult.url,
          fileName: uploadResult.originalName,
          storagePath: uploadResult.path,
          uploadMethod: uploadResult.uploadMethod,
          fileSize: (uploadResult.size / 1024 / 1024).toFixed(2) + ' MB',
          fileType: uploadResult.type
        };
      }
      
      if (editingParty) {
        // Update existing party
        const updateData = {
          title: formData.title,
          description: formData.description,
          updatedAt: new Date().toISOString()
        };
        
        // Only update image if new image is provided
        if (imageData) {
          // Delete old image from storage if it exists
          if (editingParty.imageData && editingParty.imageData.storagePath) {
            await deleteImageFromStorage(editingParty.imageData.storagePath);
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
        
        const partyRef = ref(database, `pakshaManu/${editingParty.id}`);
        await update(partyRef, updateData);
        showSuccess('यशस्वी!', 'पक्ष यशस्वीरित्या अपडेट केला गेला!');
      } else {
        // Add new party
        const partiesRef = ref(database, 'pakshaManu');
        await push(partiesRef, {
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
        showSuccess('यशस्वी!', 'नवा पक्ष यशस्वीरित्या जोडला गेला!');
      }

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving party:', error);
      showError('त्रुटी!', 'पक्ष जतन करताना त्रुटी आली: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (party) => {
    setFormData({
      ...party,
      image: null // Reset file input
    });
    setEditingParty(party);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (party) => {
    showConfirm(
      'पक्ष हटवा',
      'तुम्हाला खात्री आहे की तुम्ही हा पक्ष हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
        try {
          // Delete image from storage if exists
          if (party.imageData && party.imageData.storagePath) {
            await deleteImageFromStorage(party.imageData.storagePath);
          }
          // Also check for separate storagePath field (new structure)
          else if (party.storagePath) {
            await deleteImageFromStorage(party.storagePath);
          }
          
          // Delete from database
          const partyRef = ref(database, `pakshaManu/${party.id}`);
          await remove(partyRef);
          showSuccess('हटवला!', 'पक्ष यशस्वीरित्या हटवला गेला!');
        } catch (error) {
          console.error('Error deleting party:', error);
          showError('त्रुटी!', 'पक्ष हटवताना त्रुटी आली: ' + error.message);
        }
      }
    );
  };

  if (dataLoading) {
    return (
      <div className="paksha-manu-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="पक्ष माहिती लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="paksha-manu-container">
      <div className="paksha-manu-header">
        <h1><i className='bx bx-flag'></i> पक्ष मेनू</h1>
        <p>राजकीय पक्षांची माहिती आणि चिन्हे</p>
        <button 
          className="add-party-btn"
          onClick={() => setShowForm(true)}
        >
          <i className='bx bx-plus'></i> नवीन पक्ष जोडा
        </button>
      </div>

      {/* Parties Grid */}
      <div className="parties-grid">
        {partiesData.length === 0 ? (
          <div className="no-parties">
            <i className='bx bx-info-circle'></i>
            <p>अजून कोणतेही पक्ष जोडले गेले नाहीत</p>
          </div>
        ) : (
          partiesData.map((party) => (
            <div key={party.id} className="party-card">
              <div className="party-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(party)}
                  title="संपादित करा"
                >
                  <i className='bx bx-edit'></i>
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(party)}
                  title="हटवा"
                >
                  <i className='bx bx-trash'></i>
                </button>
              </div>

              <div className="party-content">
                <h3 className="party-title">{party.title}</h3>
                
                <div className="party-image">
                  <img 
                    src={(party.imageData && party.imageData.url) || party.image || `https://via.placeholder.com/200x200/ff9933/ffffff?text=${encodeURIComponent(party.title || 'पक्ष')}`}
                    alt={party.title}
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/200x200/ff9933/ffffff?text=${encodeURIComponent(party.title || 'पक्ष')}`;
                    }}
                  />
                </div>

                <p className="party-description">{party.description}</p>
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
                {editingParty ? 'पक्ष संपादित करा' : 'नवीन पक्ष जोडा'}
              </h2>
              <button className="close-btn" onClick={resetForm}>
                <i className='bx bx-x'></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="party-form">
              <div className="form-group">
                <label htmlFor="title"><i className='bx bx-flag'></i> पक्षाचे नाव</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="पक्षाचे पूर्ण नाव टाका"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="image"><i className='bx bx-image'></i> पक्षाची फोटो/चिन्ह</label>
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
                  placeholder="पक्षाचा संक्षिप्त परिचय, त्यांचे विचार किंवा प्रेरणादायी संदेश लिहा..."
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
                      {editingParty ? 'अपडेट करा' : 'जतन करा'}
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

export default PakshaManu;
