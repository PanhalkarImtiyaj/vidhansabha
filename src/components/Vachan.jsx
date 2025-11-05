import { useState, useEffect } from 'react';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { database } from '../firebase/config';
import { uploadPDFWithFallback, deletePDFFromStorage, validatePDFFile } from '../utils/firebaseStorage';
import { Loader, VachanAlert } from './common';
import './Vachan.css';

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

function Vachan() {
  const [vachans, setVachans] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVachan, setEditingVachan] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Alert state
  const [alert, setAlert] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    pdfFile: null,
    pdfUrl: ''
  });

  // Alert helper functions
  const showAlert = (type, title, message, onConfirm = null) => {
    setAlert({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: onConfirm || (() => setAlert(prev => ({ ...prev, isOpen: false }))),
      onCancel: () => setAlert(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showConfirm = (title, message, onConfirm) => {
    setAlert({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        setAlert(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => setAlert(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Load vachans from Firebase
  useEffect(() => {
    const vachansRef = ref(database, 'vachans');
    setDataLoading(true);
    
    const unsubscribe = onValue(vachansRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const vachansArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setVachans(vachansArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        setVachans([]);
      }
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading vachans:', error);
      setVachans([]);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'pdfFile') {
      handleFileSelect(files[0]);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    
    try {
      validatePDFFile(file); // No size limit
      setFormData(prev => ({
        ...prev,
        pdfFile: file
      }));
    } catch (error) {
      showAlert('error', 'फाइल त्रुटी', error.message);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      showAlert('warning', 'अपूर्ण माहिती', 'कृपया शीर्षक प्रविष्ट करा!');
      return;
    }
    
    if (!formData.subtitle.trim()) {
      showAlert('warning', 'अपूर्ण माहिती', 'कृपया उपशीर्षक प्रविष्ट करा!');
      return;
    }
    
    setUploading(true);
    
    try {
      let pdfData = null;
      
      // Upload PDF if new file is selected
      if (formData.pdfFile) {
        console.log('Starting PDF upload to Firebase Storage...');
        const uploadResult = await uploadPDFWithFallback(formData.pdfFile, 'vachans');
        pdfData = {
          url: uploadResult.url,
          fileName: uploadResult.originalName,
          storagePath: uploadResult.path,
          uploadMethod: uploadResult.uploadMethod,
          fileSize: (uploadResult.size / 1024 / 1024).toFixed(2) + ' MB',
          fileType: uploadResult.type
        };
        console.log('PDF uploaded successfully:', pdfData);
      }
      
      const vachanData = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        pdfUrl: pdfData ? pdfData.url : (formData.pdfUrl || ''), // Keep backward compatibility
        pdfData: pdfData,
        // Separate fields for easy access
        ...(pdfData && {
          fileName: pdfData.fileName,
          fileSize: pdfData.fileSize,
          fileType: pdfData.fileType,
          storagePath: pdfData.storagePath,
          uploadMethod: pdfData.uploadMethod
        })
      };
      
      if (editingVachan) {
        // Update existing vachan
        const updateData = {
          title: vachanData.title,
          subtitle: vachanData.subtitle,
          updatedAt: new Date().toISOString()
        };
        
        // Only update PDF if new file is provided
        if (pdfData) {
          // Delete old PDF from storage if it exists
          if (editingVachan.pdfData && editingVachan.pdfData.storagePath) {
            await deletePDFFromStorage(editingVachan.pdfData.storagePath);
          }
          updateData.pdfData = pdfData;
          updateData.pdfUrl = pdfData.url; // Keep for backward compatibility
          
          // Add separate fields for easy access
          updateData.fileName = pdfData.fileName;
          updateData.fileSize = pdfData.fileSize;
          updateData.fileType = pdfData.fileType;
          updateData.storagePath = pdfData.storagePath;
          updateData.uploadMethod = pdfData.uploadMethod;
        }
        
        const vachanRef = ref(database, `vachans/${editingVachan.id}`);
        await update(vachanRef, updateData);
        showAlert('success', 'यशस्वी!', 'वचन यशस्वीरित्या अपडेट केले गेले!');
      } else {
        // Add new vachan
        const vachansRef = ref(database, 'vachans');
        await push(vachansRef, {
          ...vachanData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showAlert('success', 'यशस्वी!', 'नवीन वचन यशस्वीरित्या जोडले गेले!');
      }

      // Reset form
      setFormData({
        title: '',
        subtitle: '',
        pdfFile: null,
        pdfUrl: ''
      });
      setShowForm(false);
      setEditingVachan(null);
    } catch (error) {
      console.error('Error saving vachan:', error);
      showAlert('error', 'त्रुटी!', error.message || 'वचन जतन करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (vachan) => {
    setFormData({
      title: vachan.title || '',
      subtitle: vachan.subtitle || '',
      pdfFile: null,
      pdfUrl: (vachan.pdfData && vachan.pdfData.url) || vachan.pdfUrl || ''
    });
    setEditingVachan(vachan);
    setShowForm(true);
    
    // Scroll to form for better UX
    setTimeout(() => {
      const formElement = document.querySelector('.modal-overlay');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleDelete = async (vachan) => {
    showConfirm(
      'वचन हटवा',
      'तुम्हाला खात्री आहे की तुम्ही हे वचन हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
        try {
          // Delete PDF from storage if it exists
          if (vachan.pdfData && vachan.pdfData.storagePath) {
            await deletePDFFromStorage(vachan.pdfData.storagePath);
          }
          // Also check for separate storagePath field (new structure)
          else if (vachan.storagePath) {
            await deletePDFFromStorage(vachan.storagePath);
          }
          
          // Delete from database
          const vachanRef = ref(database, `vachans/${vachan.id}`);
          await remove(vachanRef);
          showAlert('success', 'हटवले!', 'वचन यशस्वीरित्या हटवले गेले!');
        } catch (error) {
          console.error('Error deleting vachan:', error);
          showAlert('error', 'हटवताना त्रुटी!', 'वचन हटवताना त्रुटी आली: ' + error.message);
        }
      }
    );
  };

  if (dataLoading) {
    return (
      <div className="vachan-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="वचन डेटा लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="vachan-container">
      <div className="vachan-header">
        <h1>वचन व्यवस्थापन</h1>
        <p>राजकीय नेत्याच्या वचनांचे व्यवस्थापन आणि प्रगती ट्रॅकिंग</p>
        <button 
          className="add-vachan-btn"
          onClick={() => {
            setShowForm(true);
            setEditingVachan(null);
            setFormData({
              title: '',
              subtitle: '',
              pdfFile: null,
              pdfUrl: ''
            });
          }}
        >
          <i className='bx bx-plus'></i>
          नवीन वचन जोडा
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingVachan ? 'वचन संपादित करा' : 'नवीन वचन जोडा'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <i className='bx bx-x'></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="vachan-form" style={{position: 'relative'}}>
              {uploading && (
                <div className="form-loading-overlay">
                  <Loader 
                    size="medium" 
                    color="primary" 
                    text="वचन सेव्ह करत आहे..." 
                  />
                </div>
              )}
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="title">शीर्षक *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="शीर्षक प्रविष्ट करा"
                    required
                    disabled={uploading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subtitle">उपशीर्षक *</label>
                  <input
                    type="text"
                    id="subtitle"
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleInputChange}
                    placeholder="उपशीर्षक प्रविष्ट करा"
                    required
                    disabled={uploading}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="pdfFile">PDF अपलोड करा</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="pdfFile"
                      name="pdfFile"
                      onChange={handleInputChange}
                      accept=".pdf"
                      className="file-input-hidden"
                      disabled={uploading}
                    />
                    <label 
                      htmlFor="pdfFile" 
                      className="file-upload-area"
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {!formData.pdfFile ? (
                        <div className="upload-content">
                          <i className='bx bx-cloud-upload'></i>
                          <div className="upload-text">
                            <span className="upload-main">PDF फाइल अपलोड करा</span>
                            <span className="upload-sub">क्लिक करा किंवा फाइल ड्रॅग करा</span>
                            <span className="upload-note">कोणत्याही साइझची PDF फाइल अपलोड करू शकता</span>
                          </div>
                        </div>
                      ) : (
                        <div className="selected-file">
                          <i className='bx bx-file-blank'></i>
                          <div className="file-info">
                            <span className="file-name">{formData.pdfFile.name}</span>
                            <span className="file-size">({(formData.pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                          </div>
                          <button 
                            type="button" 
                            className="remove-file-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({ ...prev, pdfFile: null }));
                            }}
                          >
                            <i className='bx bx-x'></i>
                          </button>
                        </div>
                      )}
                    </label>
                  </div>
                  {formData.pdfUrl && !formData.pdfFile && (
                    <div className="current-file">
                      <i className='bx bx-file-blank'></i>
                      <div className="current-file-info">
                        {editingVachan && editingVachan.pdfData ? (
                          <>
                            <span className="current-file-name">{editingVachan.pdfData.fileName}</span>
                            <span className="current-file-size">({editingVachan.pdfData.fileSize})</span>
                            <div className="current-file-actions">
                              {formData.pdfUrl.startsWith('data:') ? (
                                <a href={formData.pdfUrl} download={editingVachan.pdfData.fileName || "current.pdf"} className="file-action-link">
                                  <i className='bx bx-download'></i> डाउनलोड करा
                                </a>
                              ) : (
                                <a href={formData.pdfUrl} target="_blank" rel="noopener noreferrer" className="file-action-link">
                                  <i className='bx bx-show'></i> PDF पहा
                                </a>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="current-file-actions">
                            {formData.pdfUrl.startsWith('data:') ? (
                              <a href={formData.pdfUrl} download="current.pdf" className="file-action-link">
                                <i className='bx bx-download'></i> सद्या PDF डाउनलोड करा
                              </a>
                            ) : (
                              <a href={formData.pdfUrl} target="_blank" rel="noopener noreferrer" className="file-action-link">
                                <i className='bx bx-show'></i> सद्या PDF पहा
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                  रद्द करा
                </button>
                <button 
                  type="submit" 
                  className={`submit-btn ${uploading ? 'loading-btn' : ''}`} 
                  disabled={uploading}
                >
                  {uploading ? '' : (editingVachan ? 'अपडेट करा' : 'जतन करा')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vachans List */}
      <div className="vachans-section">
        <div className="section-header">
          <h2>वचन यादी ({vachans.length})</h2>
        </div>

        {vachans.length === 0 ? (
          <div className="empty-state">
            <i className='bx bx-file-blank'></i>
            <h3>कोणतेही वचन आढळले नाही</h3>
            <p>नवीन वचन जोडण्यासाठी वरील बटण दाबा</p>
          </div>
        ) : (
          <div className="vachans-grid">
            {vachans.map((vachan) => (
              <div key={vachan.id} className="vachan-card">
                <div className="vachan-header-card">
                  <h3>{vachan.title}</h3>
                  <div className="vachan-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(vachan)}
                      title="संपादित करा"
                    >
                      <i className='bx bx-edit'></i>
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(vachan)}
                      title="हटवा"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </div>

                <div className="vachan-content">
                  {vachan.subtitle && (
                    <p className="vachan-subtitle">{vachan.subtitle}</p>
                  )}
                  
                  <div className="vachan-details">
                    {vachan.createdAt && (
                      <div className="detail-item">
                        <i className='bx bx-calendar'></i>
                        <span>जोडले: {formatTimestamp(vachan.createdAt)}</span>
                      </div>
                    )}
                    
                    {(vachan.pdfUrl || (vachan.pdfData && vachan.pdfData.url)) && (
                      <div className="detail-item">
                        <i className='bx bx-file-blank'></i>
                        <div className="pdf-info">
                          {vachan.pdfData ? (
                            <>
                              <a 
                                href={vachan.pdfData.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="pdf-link"
                                title={vachan.pdfData.fileName || 'PDF पहा'}
                              >
                                <i className='bx bx-file-pdf'></i>
                                {vachan.pdfData.fileName || 'PDF पहा'}
                              </a>
                            </>
                          ) : (
                            // Backward compatibility for old data
                            <div className="pdf-legacy">
                              {vachan.pdfUrl.startsWith('data:') ? (
                                <a href={vachan.pdfUrl} download={`${vachan.title}.pdf`} className="pdf-link">
                                  <i className='bx bx-download'></i> PDF डाउनलोड करा
                                </a>
                              ) : (
                                <a href={vachan.pdfUrl} target="_blank" rel="noopener noreferrer" className="pdf-link">
                                  <i className='bx bx-show'></i> PDF पहा
                                </a>
                              )}
                              <small className="pdf-details">
                                <i className='bx bx-info-circle'></i> लेगसी डेटा
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Alert */}
      <VachanAlert
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

export default Vachan;