import { useState, useEffect } from 'react';
import { database } from '../firebase/config';
import { 
  ref,
  push,
  onValue,
  remove,
  set
} from 'firebase/database';
import { uploadImageWithFallback, deleteImageFromStorage, validateImageFile } from '../utils/firebaseStorage';
import { Loader, UniversalAlert } from './common';
import { useAlert } from '../hooks/useAlert';
import './Banner.css';

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

function Banner() {
  const [banners, setBanners] = useState([]);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [storageAvailable, setStorageAvailable] = useState(false);

  // Custom alert hook
  const { alert, showSuccess, showError, showWarning, showConfirm } = useAlert();

  // Check network connectivity
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Test Firebase Storage availability
  useEffect(() => {
    const testStorageConnectivity = async () => {
      try {
        // Try to create a simple test reference
        const testRef = storageRef(storage, 'test/connectivity-test.txt');
        // Just creating a reference doesn't make a network call, so this should work
        setStorageAvailable(true);
        console.log('Firebase Storage reference created successfully');
      } catch (error) {
        console.warn('Firebase Storage not available:', error);
        setStorageAvailable(false);
      }
    };

    testStorageConnectivity();
  }, []);

  // Load banners from Firebase Realtime Database on component mount
  useEffect(() => {
    const bannersRef = ref(database, 'banners');
    setDataLoading(true);
    
    const unsubscribe = onValue(bannersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const bannersArray = Object.keys(data).map(key => {
          const bannerData = data[key];
          return {
            id: key,
            ...bannerData,
            isActive: new Date() >= new Date(bannerData.startDate) && new Date() <= new Date(bannerData.endDate)
          };
        });
        // Sort by createdAt descending
        bannersArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBanners(bannersArray);
        setConnectionStatus('online'); // If we can load data, we're connected
      } else {
        setBanners([]);
      }
      setDataLoading(false);
    }, (error) => {
      console.error('Firebase Realtime Database connection error:', error);
      setConnectionStatus('error');
      setBanners([]);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);
  const handleFileSelect = (file) => {
    console.log('handleFileSelect called with:', file);
    try {
      validateImageFile(file, 5); // 5MB limit
      setBannerFile(file);
    } catch (error) {
      showError('फाइल त्रुटी', error.message);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };



  const handleAddBanner = async (e) => {
    e.preventDefault();
    
    // Check connectivity first
    if (connectionStatus === 'offline') {
      showWarning('कनेक्शन त्रुटी', 'इंटरनेट कनेक्शन नाही. कृपया कनेक्शन तपासा.');
      return;
    }
    
    if (!bannerFile || !bannerTitle.trim() || !startDate || !endDate) {
      showWarning('अपूर्ण माहिती', 'कृपया सर्व फील्ड भरा (फाइल, शीर्षक, सुरुवातीची तारीख, शेवटची तारीख)');
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      showWarning('तारीख त्रुटी', 'शेवटची तारीख सुरुवातीच्या तारखेपेक्षा नंतरची असावी');
      return;
    }

    setIsLoading(true);
    
    try {
      // Upload image to Firebase Storage with fallback to base64
      const uploadResult = await uploadImageWithFallback(bannerFile, 'banners');
      
      const { url: imageUrl, path: storagePath, uploadMethod, fileName, originalName, size, type } = uploadResult;
      
      // Create structured image data object
      const imageData = {
        url: imageUrl,
        fileName: originalName,
        storagePath: storagePath,
        uploadMethod: uploadMethod,
        fileSize: (size / 1024 / 1024).toFixed(2) + ' MB',
        fileType: type
      };
      
      // Save banner data to Firebase Realtime Database
      const bannersRef = ref(database, 'banners');
      const newBannerData = {
        title: bannerTitle.trim(),
        url: imageUrl, // Keep for backward compatibility
        fileName: originalName,
        fileSize: (size / 1024 / 1024).toFixed(2) + ' MB',
        fileType: type,
        storagePath: storagePath, // Separate storage path field
        uploadMethod: uploadMethod,
        imageData: imageData, // Structured storage data
        startDate: startDate,
        endDate: endDate,
        createdAt: new Date().toISOString(),
        createdBy: 'admin'
      };
      
      await push(bannersRef, newBannerData);
      
      // Clear form
      setBannerFile(null);
      setBannerTitle('');
      setStartDate('');
      setEndDate('');
      setIsLoading(false);
      
      showSuccess('यशस्वी!', `बॅनर यशस्वीरित्या जोडला गेला! (${uploadMethod === 'storage' ? 'Firebase Storage' : 'Base64'} पद्धतीने)`);
    } catch (error) {
      console.error('Error adding banner:', error);
      showError('त्रुटी!', 'बॅनर जोडताना त्रुटी आली: ' + error.message);
      setIsLoading(false);
    }
  };

  const handleDeleteBanner = async (banner) => {
    showConfirm(
      'बॅनर हटवा',
      'तुम्हाला खात्री आहे की तुम्ही हा बॅनर हटवू इच्छिता? ही क्रिया पूर्ववत करता येणार नाही.',
      async () => {
        try {
          // Delete from Firebase Storage if storagePath exists
          if (banner.imageData && banner.imageData.storagePath) {
            await deleteImageFromStorage(banner.imageData.storagePath);
          } else if (banner.storagePath) {
            // Backward compatibility for old data structure
            await deleteImageFromStorage(banner.storagePath);
          }
          
          // Delete from Firebase Realtime Database
          const bannerRef = ref(database, `banners/${banner.id}`);
          await remove(bannerRef);
          
          showSuccess('हटवले!', 'बॅनर यशस्वीरित्या हटवला गेला!');
        } catch (error) {
          console.error('Error deleting banner:', error);
          showError('हटवताना त्रुटी!', 'बॅनर हटवताना त्रुटी आली: ' + error.message);
        }
      },
      'हो, हटवा'
    );
  };

  if (dataLoading) {
    return (
      <div className="banner-container">
        <Loader 
          overlay={true}
          size="large" 
          color="primary" 
          text="बॅनर डेटा लोड करत आहे..." 
        />
      </div>
    );
  }

  return (
    <div className="banner-container">
      <div className="banner-header">
        <h1><i className='bx bx-image'></i> बॅनर व्यवस्थापन</h1>
        <p>येथे तुम्ही नवीन बॅनर जोडू शकता आणि विद्यमान बॅनर व्यवस्थापित करू शकता</p>
        {connectionStatus !== 'online' && (
          <div className={`connection-status ${connectionStatus}`}>
            <i className={`bx ${connectionStatus === 'offline' ? 'bx-wifi-off' : 'bx-error'}`}></i>
            <span>
              {connectionStatus === 'offline' 
                ? 'इंटरनेट कनेक्शन नाही' 
                : 'Firebase कनेक्शन समस्या'}
            </span>
          </div>
        )}
      </div>

      <div className="banner-form-section">
        <div className="form-card">
          <h2>नवीन बॅनर जोडा</h2>
          <form onSubmit={handleAddBanner} className="banner-form">
            <div className="form-group">
              <label htmlFor="bannerTitle">बॅनर शीर्षक</label>
              <input
                type="text"
                id="bannerTitle"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder="बॅनरचे शीर्षक प्रविष्ट करा"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bannerFile">बॅनर फाइल</label>
              <div 
                className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${bannerFile ? 'file-selected' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => {
                  console.log('Upload area clicked');
                  document.getElementById('bannerFile').click();
                }}
              >
                <input
                  type="file"
                  id="bannerFile"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={(e) => {
                    console.log('File input onChange triggered');
                    console.log('Files:', e.target.files);
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('File selected:', file.name);
                      handleFileSelect(file);
                    } else {
                      console.log('No file selected');
                    }
                  }}
                  className="file-input"
                />
                <div className="file-upload-content">
                  {bannerFile ? (
                    <div className="file-selected-info">
                      <i className='bx bx-check-circle file-success-icon'></i>
                      <div className="file-details">
                        <p className="file-name">{bannerFile.name}</p>
                        <p className="file-size">{(bannerFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button 
                        type="button" 
                        className="remove-file-btn"
                        onClick={() => setBannerFile(null)}
                      >
                        <i className='bx bx-x'></i>
                      </button>
                    </div>
                  ) : (
                    <div className="file-upload-placeholder">
                      <i className='bx bx-cloud-upload upload-icon'></i>
                      <p className="upload-text">फाइल अपलोड करण्यासाठी क्लिक करा किंवा येथे ड्रॅग करा</p>
                      <p className="upload-hint">JPG, PNG, GIF, WebP (Max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="date-fields-row">
              <div className="form-group">
                <label htmlFor="startDate">सुरुवातीची तारीख</label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="endDate">शेवटची तारीख</label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className='bx bx-loader-alt bx-spin'></i>
                  जोडत आहे...
                </>
              ) : (
                <>
                  <i className='bx bx-plus'></i>
                  बॅनर जोडा
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="banners-list-section">
        <h2>विद्यमान बॅनर ({banners.length})</h2>
        
        {banners.length === 0 ? (
          <div className="empty-state">
            <i className='bx bx-image-alt'></i>
            <h3>कोणतेही बॅनर नाहीत</h3>
            <p>वरील फॉर्म वापरून तुमचा पहिला बॅनर जोडा</p>
          </div>
        ) : (
          <div className="banners-grid">
            {banners.map((banner) => (
              <div key={banner.id} className="banner-card">
                <div className="banner-image-container">
                  <img 
                    src={banner.url} 
                    alt={banner.title}
                    className="banner-image"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NS41IDQyLjVMMTAwIDU3TDEyNSAzMkwxNTAgNTdWNzVIODVWNDIuNVoiIGZpbGw9IiNEMUQ1REIiLz4KPGNpcmNsZSBjeD0iNzUiIGN5PSI0MCIgcj0iNSIgZmlsbD0iI0QxRDVEQiIvPgo8L3N2Zz4K';
                    }}
                  />
                  <div className="banner-overlay">
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteBanner(banner)}
                      title="बॅनर हटवा"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </div>
                
                <div className="banner-info">
                  <div className="banner-header-info">
                    <h3 className="banner-title">{banner.title}</h3>
                    <span className={`banner-status ${banner.isActive ? 'active' : 'inactive'}`}>
                      {banner.isActive ? 'सक्रिय' : 'निष्क्रिय'}
                    </span>
                  </div>
                  
                  <div className="banner-dates">
                    <div className="date-info">
                      <i className='bx bx-calendar-event'></i>
                      <span>सुरुवात: {new Date(banner.startDate).toLocaleDateString('mr-IN')}</span>
                    </div>
                    <div className="date-info">
                      <i className='bx bx-calendar-x'></i>
                      <span>समाप्ती: {new Date(banner.endDate).toLocaleDateString('mr-IN')}</span>
                    </div>
                  </div>
                  
                  <p className="banner-date">जोडले: {formatTimestamp(banner.createdAt)}</p>
                  
                </div>
              </div>
            ))}
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

export default Banner;
