// ================= DO NOT EDIT =================
// This code is for the authentication page (index.html)
// It handles user login and new account creation.
// ===============================================

// --- 1. Firebase Configuration ---
// IMPORTANT: Replace this with your own Firebase project configuration.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// --- 2. Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- 3. Get HTML Elements ---
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const usernameInput = document.getElementById('username');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-btn');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const toggleText = document.getElementById('toggle-text');
const usernameGroup = document.getElementById('username-group');
const errorMessage = document.getElementById('error-message');

// --- 4. Toggle between Login and Sign Up ---
let isLogin = true;

toggleBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    authForm.reset(); // Clear form fields
    errorMessage.textContent = ''; // Clear any previous errors

    if (isLogin) {
        formTitle.textContent = 'تسجيل الدخول';
        formSubtitle.textContent = 'مرحبًا بعودتك! أدخل بياناتك للمتابعة.';
        submitBtn.textContent = 'تسجيل الدخول';
        toggleText.textContent = 'ليس لديك حساب؟';
        toggleBtn.textContent = 'أنشئ حسابًا جديدًا';
        usernameGroup.style.display = 'none';
    } else {
        formTitle.textContent = 'إنشاء حساب جديد';
        formSubtitle.textContent = 'خطوة بسيطة تفصلك عن ملفك التعريفي المميز.';
        submitBtn.textContent = 'إنشاء حساب';
        toggleText.textContent = 'لديك حساب بالفعل؟';
        toggleBtn.textContent = 'سجل الدخول';
        usernameGroup.style.display = 'block';
    }
});

// --- 5. Form Submission Logic ---
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    const username = usernameInput.value.toLowerCase().trim();
    errorMessage.textContent = '';
    submitBtn.disabled = true; // Prevent multiple clicks

    try {
        if (isLogin) {
            // --- LOGIN LOGIC ---
            await auth.signInWithEmailAndPassword(email, password);
            window.location.href = 'dashboard.html';
        } else {
            // --- SIGN UP LOGIC ---
            // Validate username
            if (!username || !/^[a-z0-9_.-]+$/.test(username)) {
                throw new Error('اسم المستخدم غير صالح. استخدم حروف إنجليزية صغيرة وأرقام فقط.');
            }

            // Check if username is already taken
            const usernameDoc = await db.collection('usernames').doc(username).get();
            if (usernameDoc.exists) {
                throw new Error('اسم المستخدم هذا محجوز. الرجاء اختيار اسم آخر.');
            }

            // Create user in Firebase Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Use a batch write to ensure all database operations succeed or fail together
            const batch = db.batch();

            // 1. Create the user document
            const userRef = db.collection('users').doc(user.uid);
            batch.set(userRef, {
                username: username,
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Reserve the username
            const usernameRef = db.collection('usernames').doc(username);
            batch.set(usernameRef, {
                uid: user.uid
            });

            // 3. Create the initial public profile document
            const profileRef = db.collection('profiles').doc(username);
            batch.set(profileRef, {
                name: 'اكتب اسمك هنا',
                bio: 'اكتب نبذة تعريفية قصيرة عنك.',
                avatarUrl: 'https://i.ibb.co/pzp61h2/khaleeji-avatar.png',
                background: 'url(https://i.ibb.co/3kC7qgM/bg1.jpg)',
                links: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                owner: user.uid // Link profile to the user's UID
            });

            // Commit the batch
            await batch.commit();
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        // Display a user-friendly error message
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage.textContent = 'البريد الإلكتروني غير مسجل.';
                break;
            case 'auth/wrong-password':
                errorMessage.textContent = 'كلمة المرور غير صحيحة.';
                break;
            case 'auth/email-already-in-use':
                errorMessage.textContent = 'هذا البريد الإلكتروني مستخدم بالفعل.';
                break;
            case 'auth/weak-password':
                errorMessage.textContent = 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.';
                break;
            default:
                errorMessage.textContent = error.message; // Show the original error message for other cases
        }
    } finally {
        submitBtn.disabled = false; // Re-enable the button
    }
});
