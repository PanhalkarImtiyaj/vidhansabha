import { useState, useEffect } from 'react';
import { 
  ref,
  push,
  onValue,
  remove,
  set
} from 'firebase/database';
import { database } from '../firebase/config';
import { uploadImageWithFallback, deleteImageFromStorage, validateImageFile } from '../utils/firebaseStorage';
import { Loader, UniversalAlert } from './common';
import { useAlert } from '../hooks/useAlert';
import './MajhyaBaddal.css';

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

function MajhyaBaddal() {
  // State for stored data
  const [personalInfoData, setPersonalInfoData] = useState([]);
  const [textSectionData, setTextSectionData] = useState([]);
  
  // Loading states
  const [personalInfoLoading, setPersonalInfoLoading] = useState(false);
  const [textSectionLoading, setTextSectionLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();
  
  // State for Personal Information Section
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    designation: '',
    profileImage: null,
    description: ''
  });

  // State for Text Section
  const [textSection, setTextSection] = useState({
    image: null,
    title: '',
    startYear: '',
    endYear: '',
    description: ''
  });

  // Load data from Firebase Realtime Database
  useEffect(() => {
    console.log('Setting up Firebase Realtime Database listeners...'); // Debug log
    setDataLoading(true);
    
    // Load Personal Information
    const personalInfoRef = ref(database, 'majhyaBaddal/personalInfo');
    const unsubscribePersonal = onValue(personalInfoRef, (snapshot) => {
      console.log('Personal info snapshot:', snapshot.val()); // Debug log
      const data = snapshot.val();
      if (data) {
        const personalArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        console.log('Personal info array:', personalArray); // Debug log
        // Sort by createdAt descending
        personalArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPersonalInfoData(personalArray);
      } else {
        console.log('No personal info data found'); // Debug log
        setPersonalInfoData([]);
      }
    }, (error) => {
      console.error('Error loading personal info:', error); // Debug log
      setPersonalInfoData([]);
    });

    // Load Text Section
    const textSectionRef = ref(database, 'majhyaBaddal/textSection');
    const unsubscribeText = onValue(textSectionRef, (snapshot) => {
      console.log('Text section snapshot:', snapshot.val()); // Debug log
      const data = snapshot.val();
      if (data) {
        const textArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        console.log('Text section array:', textArray); // Debug log
        // Sort by createdAt descending
        textArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTextSectionData(textArray);
      } else {
        console.log('No text section data found'); // Debug log
        setTextSectionData([]);
      }
    }, (error) => {
      console.error('Error loading text section:', error); // Debug log
      setTextSectionData([]);
    });

    // Set loading to false after both listeners are set up
    setTimeout(() => setDataLoading(false), 1000);
    
    return () => {
      unsubscribePersonal();
      unsubscribeText();
    };
  }, []);


  // Handle Personal Information form changes
  const handlePersonalInfoChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      try {
        validateImageFile(files[0], 5); // 5MB limit
        setPersonalInfo(prev => ({
          ...prev,
          [name]: files[0]
        }));
      } catch (error) {
        showError('फाइल त्रुटी', error.message);
        e.target.value = ''; // Clear the input
      }
    } else {
      setPersonalInfo(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle Text Section form changes
  const handleTextSectionChange = (e) => {
    const { name, value, files } = e.target;
    console.log('Field changed:', name, 'Value:', value); // Debug log
    if (files && files[0]) {
      try {
        validateImageFile(files[0], 5); // 5MB limit
        setTextSection(prev => ({
          ...prev,
          [name]: files[0]
        }));
      } catch (error) {
        showError('फाइल त्रुटी', error.message);
        e.target.value = ''; // Clear the input
      }
    } else {
      setTextSection(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle Personal Information form submission
  const handlePersonalInfoSubmit = async (e) => {
    e.preventDefault();
    setPersonalInfoLoading(true);
    
    console.log('Submitting personal info:', personalInfo); // Debug log
    
    try {
      let imageData = null;
      
      // Upload profile image if exists
      if (personalInfo.profileImage) {
        const uploadResult = await uploadImageWithFallback(
          personalInfo.profileImage, 
          'majhyaBaddal/personalInfo'
        );
        imageData = {
          url: uploadResult.url,
          fileName: uploadResult.originalName,
          storagePath: uploadResult.path,
          uploadMethod: uploadResult.uploadMethod,
          fileSize: (uploadResult.size / 1024 / 1024).toFixed(2) + ' MB',
          fileType: uploadResult.type
        };
      }
      
      const personalInfoRef = ref(database, 'majhyaBaddal/personalInfo');
      const dataToSave = {
        fullName: personalInfo.fullName,
        designation: personalInfo.designation,
        description: personalInfo.description,
        profileImage: imageData,
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
      };
      
      console.log('Data to save:', dataToSave); // Debug log
      
      const result = await push(personalInfoRef, dataToSave);
      console.log('Save result:', result.key); // Debug log
      
      // Reset form
      setPersonalInfo({
        fullName: '',
        designation: '',
        profileImage: null,
        description: ''
      });
      
      // Clear file input
      const fileInput = document.getElementById('profileImage');
      if (fileInput) fileInput.value = '';
      
      showSuccess('यशस्वी!', 'व्यक्तिगत माहिती यशस्वीरित्या जतन केली गेली!');
    } catch (error) {
      console.error('Error saving personal info:', error);
      showError('त्रुटी!', 'व्यक्तिगत माहिती जतन करताना त्रुटी आली: ' + error.message);
    } finally {
      setPersonalInfoLoading(false);
    }
  };

  // Handle Text Section form submission
  const handleTextSectionSubmit = async (e) => {
    e.preventDefault();
    setTextSectionLoading(true);
    
    console.log('Submitting text section:', textSection); // Debug log
    
    try {
      let imageData = null;
      
      // Upload image if exists
      if (textSection.image) {
        const uploadResult = await uploadImageWithFallback(
          textSection.image, 
          'majhyaBaddal/textSection'
        );
        imageData = {
          url: uploadResult.url,
          fileName: uploadResult.originalName,
          storagePath: uploadResult.path,
          uploadMethod: uploadResult.uploadMethod,
          fileSize: (uploadResult.size / 1024 / 1024).toFixed(2) + ' MB',
          fileType: uploadResult.type
        };
      }
      
      const textSectionRef = ref(database, 'majhyaBaddal/textSection');
      const dataToSave = {
        title: textSection.title,
        startYear: textSection.startYear,
        endYear: textSection.endYear,
        description: textSection.description,
        image: imageData,
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
      };
      
      console.log('Text section data to save:', dataToSave); // Debug log
      
      const result = await push(textSectionRef, dataToSave);
      console.log('Text section save result:', result.key); // Debug log
      
      // Reset form
      setTextSection({
        image: null,
        title: '',
        startYear: '',
        endYear: '',
        description: ''
      });
      
      // Clear file input
      const fileInput = document.getElementById('textImage');
      if (fileInput) fileInput.value = '';
      
      showSuccess('यशस्वी!', 'मजकूर विभाग यशस्वीरित्या जतन केला गेला!');
    } catch (error) {
      console.error('Error saving text section:', error);
      showError('त्रुटी!', 'मजकूर विभाग जतन करताना त्रुटी आली: ' + error.message);
    } finally {
      setTextSectionLoading(false);
    }
  };

  // Handle delete personal info
  const handleDeletePersonalInfo = async (item) => {
    showConfirm(
      'व्यक्तिगत माहिती हटवा',
      'तुम्हाला खात्री आहे की तुम्ही ही व्यक्तिगत माहिती हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
        try {
          // Delete image from storage if exists
          if (item.profileImage && item.profileImage.storagePath) {
            await deleteImageFromStorage(item.profileImage.storagePath);
          }
          
          // Delete from database
          const personalInfoRef = ref(database, `majhyaBaddal/personalInfo/${item.id}`);
          await remove(personalInfoRef);
          showSuccess('हटवले!', 'व्यक्तिगत माहिती यशस्वीरित्या हटवली गेली!');
        } catch (error) {
          console.error('Error deleting personal info:', error);
          showError('हटवताना त्रुटी!', 'व्यक्तिगत माहिती हटवताना त्रुटी आली: ' + error.message);
        }
      },
      'हो, हटवा'
    );
  };

  // Handle delete text section
  const handleDeleteTextSection = async (item) => {
    showConfirm(
      'मजकूर विभाग हटवा',
      'तुम्हाला खात्री आहे की तुम्ही हा मजकूर विभाग हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
        try {
          // Delete image from storage if exists
          if (item.image && item.image.storagePath) {
            await deleteImageFromStorage(item.image.storagePath);
          }
          
          // Delete from database
          const textSectionRef = ref(database, `majhyaBaddal/textSection/${item.id}`);
          await remove(textSectionRef);
          showSuccess('हटवले!', 'मजकूर विभाग यशस्वीरित्या हटवला गेला!');
        } catch (error) {
          console.error('Error deleting text section:', error);
          showError('हटवताना त्रुटी!', 'मजकूर विभाग हटवताना त्रुटी आली: ' + error.message);
        }
      },
      'हो, हटवा'
    );
  };

  if (dataLoading) {
    return (
      <div className="majhya-baddal-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="डेटा लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="majhya-baddal-container">
      <div className="majhya-baddal-header">
        <h1><i className='bx bx-user-circle'></i> माझ्याबद्दल व्यवस्थापन</h1>
        <p>व्यक्तिगत माहिती आणि मजकूर विभाग व्यवस्थापित करा</p>
      </div>

      <div className="admin-panel-content">
        {/* Personal Information Section */}
        <div className="admin-card">
          <div className="card-header">
            <h2><i className='bx bx-user'></i> व्यक्तिगत माहिती</h2>
          </div>
          <form onSubmit={handlePersonalInfoSubmit} className="admin-form" style={{position: 'relative'}}>            {personalInfoLoading && (
              <div className="form-loading-overlay">
                <Loader 
                  size="medium" 
                  color="primary" 
                  text="व्यक्तिगत माहिती सेव्ह करत आहे..." 
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="fullName"><i className='bx bx-user'></i> पूर्ण नाव</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={personalInfo.fullName}
                onChange={handlePersonalInfoChange}
                placeholder="पूर्ण नाव टाका"
                required
                disabled={personalInfoLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="designation"><i className='bx bx-briefcase'></i> पदनाम</label>
              <input
                type="text"
                id="designation"
                name="designation"
                value={personalInfo.designation}
                onChange={handlePersonalInfoChange}
                placeholder="पदनाम टाका"
                required
                disabled={personalInfoLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="profileImage"><i className='bx bx-image-add'></i> प्रोफाइल फोटो अपलोड</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="profileImage"
                  name="profileImage"
                  onChange={handlePersonalInfoChange}
                  accept="image/*"
                  className="file-input"
                  disabled={personalInfoLoading}
                />
                <label htmlFor="profileImage" className="file-input-label">
                  <i className="bx bx-cloud-upload"></i>
                  {personalInfo.profileImage ? personalInfo.profileImage.name : 'प्रोफाइल फोटो निवडा'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="personalDescription"><i className='bx bx-edit-alt'></i> वर्णन</label>
              <textarea
                id="personalDescription"
                name="description"
                value={personalInfo.description}
                onChange={handlePersonalInfoChange}
                placeholder="व्यक्ती किंवा प्रोफाइलबद्दल लिहा..."
                rows="4"
                required
                disabled={personalInfoLoading}
              ></textarea>
            </div>

            <button 
              type="submit" 
              className={`submit-btn ${personalInfoLoading ? 'loading-btn' : ''}`}
              disabled={personalInfoLoading}
            >
              {personalInfoLoading ? '' : (
                <>
                  <i className="bx bx-save"></i>
                  व्यक्तिगत माहिती सेव्ह करा
                </>
              )}
            </button>
          </form>
        </div>

        {/* Text Section */}
        <div className="admin-card">
          <div className="card-header">
            <h2><i className='bx bx-text'></i> मजकूर विभाग</h2>
          </div>
          <form onSubmit={handleTextSectionSubmit} className="admin-form" style={{position: 'relative'}}>            {textSectionLoading && (
              <div className="form-loading-overlay">
                <Loader 
                  size="medium" 
                  color="primary" 
                  text="मजकूर विभाग सेव्ह करत आहे..." 
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="textImage"><i className='bx bx-image'></i> फोटो अपलोड</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="textImage"
                  name="image"
                  onChange={handleTextSectionChange}
                  accept="image/*"
                  className="file-input"
                  disabled={textSectionLoading}
                />
                <label htmlFor="textImage" className="file-input-label">
                  <i className="bx bx-cloud-upload"></i>
                  {textSection.image ? textSection.image.name : 'फोटो निवडा'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="title"><i className='bx bx-heading'></i> शीर्षक</label>
              <input
                type="text"
                id="title"
                name="title"
                value={textSection.title}
                onChange={handleTextSectionChange}
                placeholder="शीर्षक टाका"
                required
                disabled={textSectionLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="startYear"><i className='bx bx-calendar'></i> प्रारंभ वर्ष</label>
              <select
                id="startYear"
                name="startYear"
                value={textSection.startYear || ''}
                onChange={handleTextSectionChange}
                disabled={textSectionLoading}
                required
              >
                <option value="">प्रारंभ वर्ष निवडा</option>
                {Array.from({length: 50}, (_, i) => {
                  const year = new Date().getFullYear() - 25 + i;
                  return <option key={year} value={year}>{year}</option>
                })}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="endYear"><i className='bx bx-calendar-check'></i> समाप्ती वर्ष</label>
              <select
                id="endYear"
                name="endYear"
                value={textSection.endYear || ''}
                onChange={handleTextSectionChange}
                disabled={textSectionLoading}
                required
              >
                <option value="">समाप्ती वर्ष निवडा</option>
                {Array.from({length: 50}, (_, i) => {
                  const year = new Date().getFullYear() - 25 + i;
                  return <option key={year} value={year}>{year}</option>
                })}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="textDescription"><i className='bx bx-detail'></i> वर्णन</label>
              <textarea
                id="textDescription"
                name="description"
                value={textSection.description}
                onChange={handleTextSectionChange}
                placeholder="अपलोड केलेल्या फोटो, प्रकल्प किंवा लेखाची माहिती लिहा..."
                rows="4"
                required
                disabled={textSectionLoading}
              ></textarea>
            </div>

            <button 
              type="submit" 
              className={`submit-btn ${textSectionLoading ? 'loading-btn' : ''}`}
              disabled={textSectionLoading}
            >
              {textSectionLoading ? '' : (
                <>
                  <i className="bx bx-save"></i>
                  मजकूर विभाग सेव्ह करा
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Display Saved Data */}
      <div className="saved-data-section">
        {/* Personal Information Data */}
        {personalInfoData.length > 0 && (
          <div className="admin-card">
            <div className="card-header">
              <h2><i className='bx bx-list-ul'></i> जतन केलेली व्यक्तिगत माहिती</h2>
            </div>
            <div className="data-list">
              {personalInfoData.map((item) => (
                <div key={item.id} className="data-item">
                  <div className="data-content">
                    <h3><i className='bx bx-user'></i> {item.fullName}</h3>
                    <p><strong>पदनाम:</strong> {item.designation}</p>
                    <p><strong>वर्णन:</strong> {item.description}</p>
                    {item.profileImage && (
                      <div className="image-info">
                        <p><strong>प्रोफाइल फोटो:</strong> {item.profileImage.fileName}</p>
                        {item.profileImage.url && (
                          <img 
                            src={item.profileImage.url} 
                            alt="Profile" 
                            className="preview-image"
                            style={{maxWidth: '100px', maxHeight: '100px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px'}}
                          />
                        )}
                      </div>
                    )}
                    <small className="timestamp">
                      <i className='bx bx-time'></i> {formatTimestamp(item.createdAt)}
                    </small>
                  </div>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeletePersonalInfo(item)}
                    title="हटवा"
                  >
                    <i className='bx bx-trash'></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text Section Data */}
        {textSectionData.length > 0 && (
          <div className="admin-card">
            <div className="card-header">
              <h2><i className='bx bx-list-ul'></i> जतन केलेले मजकूर विभाग</h2>
            </div>
            <div className="data-list">
              {textSectionData.map((item) => (
                <div key={item.id} className="data-item">
                  <div className="data-content">
                    <h3><i className='bx bx-text'></i> {item.title}</h3>
                    <p><strong>प्रारंभ वर्ष:</strong> {item.startYear || item.startDate}</p>
                    <p><strong>समाप्ती वर्ष:</strong> {item.endYear || item.endDate}</p>
                    <p><strong>वर्णन:</strong> {item.description}</p>
                    {item.image && (
                      <div className="image-info">
                        <p><strong>फोटो:</strong> {item.image.fileName}</p>
                        {item.image.url && (
                          <img 
                            src={item.image.url} 
                            alt="Text Section" 
                            className="preview-image"
                            style={{maxWidth: '100px', maxHeight: '100px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px'}}
                          />
                        )}
                      </div>
                    )}
                    <small className="timestamp">
                      <i className='bx bx-time'></i> {formatTimestamp(item.createdAt)}
                    </small>
                  </div>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteTextSection(item)}
                    title="हटवा"
                  >
                    <i className='bx bx-trash'></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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

export default MajhyaBaddal;
