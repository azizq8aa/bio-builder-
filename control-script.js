// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB_JYPRWYnbAw4AvJ0yTXLfLbPNOUZG4tA",
    authDomain: "bio-builder-new.firebaseapp.com",
    databaseURL: "https://bio-builder-new-default-rtdb.firebaseio.com",
    projectId: "bio-builder-new",
    storageBucket: "bio-builder-new.firebasestorage.app",
    messagingSenderId: "618331429708",
    appId: "1:618331429708:web:4357af8958ac90a67d0de9"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

let currentUser = null;
let currentUsername = null;

// Social media platforms
const socialPlatforms = {
    instagram: { name: 'Instagram', icon: 'fab fa-instagram' },
    twitter: { name: 'Twitter', icon: 'fab fa-twitter' },
    facebook: { name: 'Facebook', icon: 'fab fa-facebook' },
    linkedin: { name: 'LinkedIn', icon: 'fab fa-linkedin' },
    youtube: { name: 'YouTube', icon: 'fab fa-youtube' },
    tiktok: { name: 'TikTok', icon: 'fab fa-tiktok' },
    snapchat: { name: 'Snapchat', icon: 'fab fa-snapchat' },
    whatsapp: { name: 'WhatsApp', icon: 'fab fa-whatsapp' },
    telegram: { name: 'Telegram', icon: 'fab fa-telegram' },
    website: { name: 'موقع ويب', icon: 'fas fa-globe' }
};

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
    } else {
        window.location.href = 'login.html';
    }
});

// Load user data
async function loadUserData() {
    try {
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('uid').equalTo(currentUser.uid).once('value');
        
        if (snapshot.exists()) {
            const userData = Object.values(snapshot.val())[0];
            currentUsername = userData.username;
            
            document.getElementById('profile-url').value = 
                `${window.location.origin}/view.html?user=${currentUsername}`;
            
            await loadProfile();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('خطأ في تحميل البيانات', 'error');
    }
}

// Load profile data
async function loadProfile() {
    try {
        const profileRef = database.ref('profiles/' + currentUsername);
        const snapshot = await profileRef.once('value');
        
        if (snapshot.exists()) {
            const profileData = snapshot.val();
            
            document.getElementById('name').value = profileData.name || '';
            document.getElementById('bio').value = profileData.bio || '';
            document.getElementById('background-color').value = profileData.backgroundColor || '#667eea';
            
            loadSocialLinks(profileData.socialLinks || []);
            updatePreview();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('خطأ في تحميل الملف الشخصي', 'error');
    }
}

// Load social links
function loadSocialLinks(socialLinks) {
    const container = document.getElementById('social-links-container');
    container.innerHTML = '';
    
    socialLinks.forEach((link, index) => {
        addSocialLinkItem(link.platform, link.url, index);
    });
    
    if (socialLinks.length === 0) {
        addSocialLinkItem();
    }
}

// Add social link item
function addSocialLinkItem(platform = '', url = '', index = null) {
    const container = document.getElementById('social-links-container');
    const linkItem = document.createElement('div');
    linkItem.className = 'social-link-item';
    
    const platformOptions = Object.keys(socialPlatforms).map(key => 
        `<option value="${key}" ${key === platform ? 'selected' : ''}>${socialPlatforms[key].name}</option>`
    ).join('');
    
    linkItem.innerHTML = `
        <select onchange="updatePreview()">
            <option value="">اختر المنصة</option>
            ${platformOptions}
        </select>
        <input type="url" placeholder="رابط المنصة" value="${url}" oninput="updatePreview()">
        <button type="button" class="remove-link-btn" onclick="removeSocialLink(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(linkItem);
    updatePreview();
}

// Add social link
function addSocialLink() {
    addSocialLinkItem();
}

// Remove social link
function removeSocialLink(button) {
    button.parentElement.remove();
    updatePreview();
}

// Update preview
function updatePreview() {
    const name = document.getElementById('name').value || 'اسمك هنا';
    const bio = document.getElementById('bio').value || 'نبذة تعريفية قصيرة';
    const backgroundColor = document.getElementById('background-color').value;
    
    document.getElementById('preview-name').textContent = name;
    document.getElementById('preview-bio').textContent = bio;
    
    const previewScreen = document.getElementById('preview-screen');
    previewScreen.style.background = `linear-gradient(135deg, ${backgroundColor}, ${adjustColor(backgroundColor, -20)})`;
    
    renderPreviewSocialLinks();
}

// Render preview social links
function renderPreviewSocialLinks() {
    const container = document.getElementById('preview-social-links');
    container.innerHTML = '';
    
    const socialLinkItems = document.querySelectorAll('.social-link-item');
    
    socialLinkItems.forEach(item => {
        const select = item.querySelector('select');
        const input = item.querySelector('input');
        const platform = select.value;
        const url = input.value.trim();
        
        if (platform && url && socialPlatforms[platform]) {
            const linkElement = document.createElement('div');
            linkElement.className = 'social-link';
            linkElement.innerHTML = `
                <div class="social-icon ${platform}">
                    <i class="${socialPlatforms[platform].icon}"></i>
                </div>
                <span>${socialPlatforms[platform].name}</span>
            `;
            container.appendChild(linkElement);
        }
    });
}

// Upload avatar
document.getElementById('avatar-input').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showMessage('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const storageRef = storage.ref(`avatars/${currentUsername}/${Date.now()}_${file.name}`);
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        document.getElementById('preview-avatar').style.backgroundImage = `url("${downloadURL}")`;
        document.getElementById('preview-avatar').innerHTML = '';
        
        await database.ref('profiles/' + currentUsername + '/avatar').set(downloadURL);
        
        showMessage('تم رفع الصورة الشخصية بنجاح', 'success');
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showMessage('خطأ في رفع الصورة الشخصية', 'error');
    } finally {
        showLoading(false);
    }
});

// Upload background
document.getElementById('background-input').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showMessage('حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const storageRef = storage.ref(`backgrounds/${currentUsername}/${Date.now()}_${file.name}`);
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        document.getElementById('preview-screen').style.backgroundImage = `url("${downloadURL}")`;
        
        await database.ref('profiles/' + currentUsername + '/backgroundImage').set(downloadURL);
        
        showMessage('تم رفع صورة الخلفية بنجاح', 'success');
    } catch (error) {
        console.error('Error uploading background:', error);
        showMessage('خطأ في رفع صورة الخلفية', 'error');
    } finally {
        showLoading(false);
    }
});

// Background color change
document.getElementById('background-color').addEventListener('change', async function() {
    const color = this.value;
    updatePreview();
    
    try {
        await database.ref('profiles/' + currentUsername + '/backgroundColor').set(color);
    } catch (error) {
        console.error('Error saving background color:', error);
    }
});

// Save profile
async function saveProfile() {
    if (!currentUsername) {
        showMessage('خطأ: لم يتم العثور على اسم المستخدم', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const name = document.getElementById('name').value.trim();
        const bio = document.getElementById('bio').value.trim();
        const backgroundColor = document.getElementById('background-color').value;
        
        const socialLinks = [];
        const socialLinkItems = document.querySelectorAll('.social-link-item');
        
        socialLinkItems.forEach(item => {
            const select = item.querySelector('select');
            const input = item.querySelector('input');
            const platform = select.value;
            const url = input.value.trim();
            
            if (platform && url) {
                socialLinks.push({ platform, url });
            }
        });
        
        const profileData = {
            name,
            bio,
            backgroundColor,
            socialLinks,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref('profiles/' + currentUsername).update(profileData);
        
        showMessage('تم حفظ البيانات بنجاح!', 'success');
        updatePreview();
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showMessage('حدث خطأ في حفظ البيانات', 'error');
    } finally {
        showLoading(false);
    }
}

// Copy profile URL
function copyProfileUrl() {
    const urlInput = document.getElementById('profile-url');
    urlInput.select();
    urlInput.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        showMessage('تم نسخ الرابط بنجاح!', 'success');
    } catch (error) {
        showMessage('فشل في نسخ الرابط', 'error');
    }
}

// Sign out
async function signOut() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            showMessage('خطأ في تسجيل الخروج', 'error');
        }
    }
}

// Show message
function showMessage(text, type) {
    // Create message element
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Show/hide loading
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

// Utility function to adjust color
function adjustColor(color, amount) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

// Initialize preview on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for real-time preview
    document.getElementById('name').addEventListener('input', updatePreview);
    document.getElementById('bio').addEventListener('input', updatePreview);
    
    // Initialize preview
    updatePreview();
});
