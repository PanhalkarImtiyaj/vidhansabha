import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebase/config';

// Sample feedback data for Firestore
const sampleFeedbacks = [
  {
    title: 'सरकारी योजनांची माहिती',
    description: 'आपल्या app मध्ये सरकारी योजनांची माहिती खूप चांगली आहे. कृपया आणखी योजना add करा जेणेकरून आम्हाला अधिक माहिती मिळेल. विशेषतः शेतकरी योजना आणि महिला कल्याण योजनांची माहिती द्यावी.',
    userInfo: {
      name: 'रमेश कुमार पाटील',
      email: 'ramesh.kumar@gmail.com',
      phone: '9876543210',
      village: 'सांगली'
    },
    status: 'new',
    category: 'suggestion',
    priority: 'medium',
    createdAt: serverTimestamp()
  },
  {
    title: 'App चा interface सुधारा',
    description: 'App चा interface चांगला आहे पण font size थोडा मोठा करावा. वयस्कर लोकांना वाचायला अडचण येते. Dark mode चा option देखील द्यावा. आणि voice command चा feature असेल तर खूप चांगले होईल.',
    userInfo: {
      name: 'सुनीता देशपांडे',
      email: 'sunita.deshpande@yahoo.com',
      phone: '8765432109',
      village: 'कोल्हापूर'
    },
    status: 'reviewed',
    category: 'improvement',
    priority: 'high',
    createdAt: serverTimestamp()
  },
  {
    title: 'नवीन feature ची सूचना',
    description: 'कृपया notification feature add करा. जेव्हा नवीन योजना येते तेव्हा आम्हाला notification येईल तर चांगले होईल. Push notification चा option द्या. SMS notification देखील उपयुक्त ठरेल.',
    userInfo: {
      name: 'अमित पाटील',
      email: 'amit.patil@hotmail.com',
      phone: '7654321098',
      village: 'सातारा'
    },
    status: 'resolved',
    category: 'feature_request',
    priority: 'high',
    createdAt: serverTimestamp()
  },
  {
    title: 'Language support',
    description: 'App मध्ये English आणि Hindi language चा support देखील द्यावा. काही लोकांना मराठी वाचता येत नाही. Multi-language support असेल तर सर्वांना उपयोग होईल. Regional languages देखील add करा.',
    userInfo: {
      name: 'प्रिया शर्मा',
      email: 'priya.sharma@gmail.com',
      phone: '6543210987',
      village: 'पुणे'
    },
    status: 'new',
    category: 'feature_request',
    priority: 'medium',
    createdAt: serverTimestamp()
  },
  {
    title: 'खूप चांगला app',
    description: 'हा app खरोखर उपयुक्त आहे. सरकारी कामकाजाची माहिती घरबसल्या मिळते. आपले खूप खूप धन्यवाद. असेच चांगले काम करत रहा. माझ्या गावातील सर्व लोकांना या app बद्दल सांगितले आहे.',
    userInfo: {
      name: 'विकास जोशी',
      email: 'vikas.joshi@rediffmail.com',
      phone: '5432109876',
      village: 'नाशिक'
    },
    status: 'reviewed',
    category: 'appreciation',
    priority: 'low',
    createdAt: serverTimestamp()
  },
  {
    title: 'समस्या निवारण',
    description: 'App मध्ये कधी कधी loading problem येते. Internet connection चांगले असूनही slow loading होते. कृपया या समस्येचे निराकरण करा. Offline mode चा feature असेल तर चांगले होईल.',
    userInfo: {
      name: 'मीरा कुलकर्णी',
      email: 'meera.kulkarni@gmail.com',
      phone: '4321098765',
      village: 'औरंगाबाद'
    },
    status: 'new',
    category: 'bug_report',
    priority: 'high',
    createdAt: serverTimestamp()
  },
  {
    title: 'PDF download समस्या',
    description: 'वचन section मधील PDF download करताना समस्या येते. PDF file corrupt होते. कृपया या समस्येचे निराकरण करा. Direct view चा option देखील द्यावा.',
    userInfo: {
      name: 'संजय महाजन',
      email: 'sanjay.mahajan@gmail.com',
      phone: '3210987654',
      village: 'अहमदनगर'
    },
    status: 'new',
    category: 'bug_report',
    priority: 'high',
    createdAt: serverTimestamp()
  },
  {
    title: 'मोबाइल responsive issue',
    description: 'छोट्या screen वर app properly display होत नाही. Button size मोठे करावेत. Touch response सुधारावा. Tablet view देखील optimize करावा.',
    userInfo: {
      name: 'अनिता गायकवाड',
      email: 'anita.gaikwad@yahoo.com',
      phone: '2109876543',
      village: 'लातूर'
    },
    status: 'reviewed',
    category: 'bug_report',
    priority: 'medium',
    createdAt: serverTimestamp()
  }
];

// Function to add sample feedbacks to Firestore
export const addSampleFeedbacksToFirestore = async () => {
  try {
    console.log('Adding sample feedbacks to Firestore feedbacks collection...');
    const feedbacksCollection = collection(firestore, 'feedbacks');
    
    for (const feedback of sampleFeedbacks) {
      const docRef = await addDoc(feedbacksCollection, feedback);
      console.log('Sample feedback added with ID:', docRef.id);
    }
    
    console.log('All sample feedbacks added successfully!');
    return { success: true, message: 'Sample feedbacks added successfully!' };
  } catch (error) {
    console.error('Error adding sample feedbacks:', error);
    return { success: false, error: error.message };
  }
};

// Function to add a single feedback (for testing)
export const addSingleFeedback = async (feedbackData) => {
  try {
    const feedbacksCollection = collection(firestore, 'feedbacks');
    const docRef = await addDoc(feedbacksCollection, {
      ...feedbackData,
      createdAt: serverTimestamp()
    });
    console.log('Feedback added with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding feedback:', error);
    return { success: false, error: error.message };
  }
};
