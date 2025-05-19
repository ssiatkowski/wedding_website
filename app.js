// app.js
import { collection, doc, getDoc, getDocs, query, where, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Use the same global `db` from firebase-init.js
const db = window.db;

// Ensure Firebase is initialized
if (!db) {
  console.error('Firebase not initialized. Make sure firebase-init.js is loaded before app.js');
  document.getElementById('app').innerHTML = '<div class="error">Error: Firebase not initialized. Please refresh the page.</div>';
}

// --- 2. Constants & Helpers ---
const GUEST_PASSWORD = "rex";
const ADMIN_PASSWORDS = {
  "sebastian siatkowski": "omgilovealomi",
  "alomi parikh": "omgilovesebo"
};

function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function fuzzyMatches(full, input){
  return full.toLowerCase().startsWith(input.toLowerCase());
}

// Add language state management
let currentLanguage = 'en';
let currentUser = null;

// Add currentRoute to track active route
let currentRoute = 'home';

// Define content translations
const content = {
  home: {
    en: {
      welcome: "Welcome",
      subtitle: "We're thrilled to have you join us on our special day",
      timeUntil: "Time Until Celebration",
      days: "days",
      hours: "hours",
      minutes: "minutes",
      seconds: "seconds"
    },
    pl: {
      welcome: "Witamy",
      subtitle: "Cieszymy się, że dołączysz do nas w ten wyjątkowy dzień",
      timeUntil: "Czas do Uroczystości",
      days: "dni",
      hours: "godziny",
      minutes: "minuty",
      seconds: "sekundy"
    },
    gu: {
      welcome: "સ્વાગત છે",
      subtitle: "આપણા ખાસ દિવસે તમને જોડાવા માટે આનંદિત છીએ",
      timeUntil: "ઉજવણી સુધીનો સમય",
      days: "દિવસો",
      hours: "કલાકો",
      minutes: "મિનિટ",
      seconds: "સેકન્ડ"
    }
  },
  schedule: {
    en: { title: "Schedule" },
    pl: { title: "Harmonogram" },
    gu: { title: "શેડ્યૂલ" }
  },
  travel: {
    en: {
      title: "Travel Information",
      flights: "Flights",
      hotels: "Hotels",
      laxInfo: "We recommend flying into LAX. From there you can either rent a car or use Uber/Lyft.",
      bookNow: "Book Now",
      groupCode: "Group Code"
    },
    pl: {
      title: "Informacje o podróży",
      flights: "Loty",
      hotels: "Hotele",
      laxInfo: "Zalecamy przylot na LAX. Stamtąd możesz wynająć samochód lub skorzystać z Uber/Lyft.",
      bookNow: "Zarezerwuj teraz",
      groupCode: "Kod grupy"
    },
    gu: {
      title: "પ્રવાસની માહિતી",
      flights: "ફ્લાઇટ્સ",
      hotels: "હોટેલ્સ",
      laxInfo: "અમે LAX માં ફ્લાઇટ કરવાની ભલામણ કરીએ છીએ. ત્યાંથી તમે કાર ભાડે લઈ શકો છો અથવા Uber/Lyft નો ઉપયોગ કરી શકો છો.",
      bookNow: "હવે બુક કરો",
      groupCode: "ગ્રુપ કોડ"
    }
  },
  details: {
    en: { title: "Details" },
    pl: { title: "Szczegóły" },
    gu: { title: "વિગતો" }
  },
  photos: {
    en: { title: "Photos" },
    pl: { title: "Zdjęcia" },
    gu: { title: "ફોટા" }
  },
  registry: {
    en: { title: "Registry" },
    pl: { title: "Rejestr" },
    gu: { title: "રજિસ્ટ્રી" }
  },
  rsvp: {
    en: { title: "RSVP" },
    pl: { title: "RSVP" },
    gu: { title: "RSVP" }
  },
  admin: {
    en: { title: "Admin" },
    pl: { title: "Admin" },
    gu: { title: "એડમિન" }
  },
  login: {
    en: {
      signIn: "Welcome—please sign in",
      firstName: "First Name",
      lastName: "Last Name",
      password: "Password",
      enter: "Enter",
      incorrectPassword: "Incorrect password.",
      noGuestFound: "No matching guest found.",
      didYouMean: "Did you mean:"
    },
    pl: {
      signIn: "Witamy—proszę się zalogować",
      firstName: "Imię",
      lastName: "Nazwisko",
      password: "Hasło",
      enter: "Wejdź",
      incorrectPassword: "Nieprawidłowe hasło.",
      noGuestFound: "Nie znaleziono gościa.",
      didYouMean: "Czy chodziło o:"
    },
    gu: {
      signIn: "સ્વાગત છે—કૃપા કરીને સાઇન ઇન કરો",
      firstName: "પ્રથમ નામ",
      lastName: "છેલ્લું નામ",
      password: "પાસવર્ડ",
      enter: "દાખલ કરો",
      incorrectPassword: "ખોટો પાસવર્ડ.",
      noGuestFound: "કોઈ મહેમાન મળ્યો નથી.",
      didYouMean: "શું તમારો મતલબ આ હતો:"
    }
  },
  dates: {
    en: {
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    },
    pl: {
      days: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'],
      months: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']
    },
    gu: {
      days: ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'],
      months: ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર']
    }
  }
};

// Helper function to get content in current language
function getContent(section, key) {
  return content[section]?.[currentLanguage]?.[key] || content[section]?.en?.[key] || key;
}

// Make setLanguage globally accessible
window.setLanguage = function(lang) {
  currentLanguage = lang;
  sessionStorage.setItem('weddingLanguage', lang);
  
  // Update active flag
  document.querySelectorAll('.language-flag').forEach(flag => {
    flag.classList.remove('active');
    if (flag.alt.toLowerCase() === lang) {
      flag.classList.add('active');
    }
  });
  
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";
  
  // Update navigation using currentRoute
  renderNav(currentRoute, isAdmin, !currentUser?.hasRSVPed);
  
  // Re-render current page without navigation
  if (currentUser) {
    routes[currentRoute].render(currentUser);
  }
}

function t(key) {
  return translations[currentLanguage][key] || translations.en[key] || key;
}

// Add language selector to the page
function renderLanguageSelector() {
  const selector = document.createElement('div');
  selector.className = 'language-selector';
  selector.innerHTML = `
    <img src="https://flagcdn.com/w40/us.png" alt="en" class="language-flag ${currentLanguage === 'en' ? 'active' : ''}" onclick="setLanguage('en')">
    <img src="https://flagcdn.com/w40/pl.png" alt="pl" class="language-flag ${currentLanguage === 'pl' ? 'active' : ''}" onclick="setLanguage('pl')">
    <img src="https://flagcdn.com/w40/in.png" alt="gu" class="language-flag ${currentLanguage === 'gu' ? 'active' : ''}" onclick="setLanguage('gu')">
  `;
  document.body.appendChild(selector);
}

// --- 3. Login Flow ---
function renderLogin(){
  document.getElementById("main-nav").style.display = "none";
  document.getElementById("app").innerHTML = `
    <form id="loginForm" class="login-form">
      <h2>${getContent('login', 'signIn')}</h2>
      <input id="first" placeholder="${getContent('login', 'firstName')}" required />
      <input id="last"  placeholder="${getContent('login', 'lastName')}"  required />
      <input id="pass"  type="password" placeholder="${getContent('login', 'password')}" required />
      <button>${getContent('login', 'enter')}</button>
      <div id="loginError" class="error"></div>
    </form>
    <div id="suggestions"></div>
  `;
  document.getElementById("loginForm").onsubmit = async e => {
    e.preventDefault();
  
    // grab the DOM elements first
    const firstInput = document.getElementById("first");
    const lastInput  = document.getElementById("last");
    const passInput  = document.getElementById("pass");
    const errDiv     = document.getElementById("loginError");
    const suggDiv    = document.getElementById("suggestions");
  
    // clear any old messages
    errDiv.textContent = "";
    suggDiv.innerHTML   = "";
  
    // then read their values
    const first = firstInput.value.trim();
    const last  = lastInput.value.trim();
    const pass  = passInput.value.toLowerCase();
    const fullName = `${first} ${last}`.toLowerCase();
  
    // 1) check password
    const isAdmin = ADMIN_PASSWORDS[fullName] === pass;
    if (!isAdmin && pass !== GUEST_PASSWORD.toLowerCase()) {
      errDiv.textContent = getContent('login', 'incorrectPassword');
      return;
    }
  
    // 2) exact-match query
    const q = query(
      collection(db, "users"),
      where("firstName", "==", first),
      where("lastName",  "==", last)
    );
    const snap = await getDocs(q);
    if (snap.size === 1) {
      const user = snap.docs[0].data();
      return finishLogin(snap.docs[0].id, isAdmin);
    }
  
    // 3) fuzzy suggestions
    const allSnap = await getDocs(collection(db, "users"));
    const matches = allSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u =>
        fuzzyMatches(u.firstName, first) ||
        fuzzyMatches(u.lastName,  last)
      )
      .filter(u => u.firstName !== "Alomi" && u.lastName !== "Siatkowski");
  
    if (!matches.length) {
      errDiv.textContent = getContent('login', 'noGuestFound');
      return;
    }
  
    // 4) render suggestions
    suggDiv.innerHTML = `<p>${getContent('login', 'didYouMean')}</p>` +
      matches.map(u =>
        `<button class="suggest-btn" data-uid="${u.id}">
           ${u.firstName} ${u.lastName}
         </button>`
      ).join("");
  
    suggDiv.querySelectorAll(".suggest-btn")
      .forEach(btn =>
        btn.addEventListener("click", () =>
          finishLogin(btn.dataset.uid, isAdmin)
        )
      );
  };
}

function finishLogin(uid, isAdmin = false){
  sessionStorage.setItem("weddingUser", uid);
  sessionStorage.setItem("isAdmin", isAdmin);
  navigate("home");
}

// --- 4. Router & Nav ---
const routes = {
  home: { 
    title: () => getContent('home', 'welcome'),
    render: renderHome 
  },
  schedule: { 
    title: () => getContent('schedule', 'title'),
    render: renderSchedule 
  },
  travel: { 
    title: () => getContent('travel', 'title'),
    render: renderTravel 
  },
  details: { 
    title: () => getContent('details', 'title'),
    render: renderDetails 
  },
  photos: { 
    title: () => getContent('photos', 'title'),
    render: renderPhotos 
  },
  registry: { 
    title: () => getContent('registry', 'title'),
    render: renderRegistry 
  },
  rsvp: { 
    title: () => getContent('rsvp', 'title'),
    render: renderRSVP 
  },
  admin: { 
    title: () => getContent('admin', 'title'),
    render: renderAdmin 
  }
};

function renderNav(active, isAdmin, needsRSVP) {
  const nav = document.getElementById("main-nav");
  nav.style.display = "flex";
  
  // Filter routes based on admin status
  const availableRoutes = Object.entries(routes).filter(([key]) => 
    key !== "admin" || isAdmin
  );
  
  nav.innerHTML = availableRoutes.map(([k,v]) =>
    `<a data-route="${k}" class="${k===active?'active':''} ${k==='rsvp' && needsRSVP ? 'needs-rsvp':''}">${v.title()}</a>`
  ).join("");
  
  nav.querySelectorAll("a").forEach(a =>
    a.onclick = ()=> navigate(a.dataset.route)
  );
}

async function navigate(route){
  const uid = sessionStorage.getItem("weddingUser");
  if (!uid) return renderLogin();

  const uDoc = await getDoc(doc(db, "users", uid));
  if (!uDoc.exists()){ sessionStorage.removeItem("weddingUser"); return renderLogin(); }
  currentUser = { uid, ...uDoc.data() };

  // Check if user is admin
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";
  
  // Only show admin route for admin users
  if (route === "admin" && !isAdmin) {
    route = "home";
  }

  // Update current route
  currentRoute = route;
  
  renderNav(route, isAdmin, !currentUser.hasRSVPed);
  await routes[route].render(currentUser);
}

// --- 5. Page Renderers ---
async function renderHome(user){
  app.innerHTML = `
    <div class="welcome-section">
      <div class="welcome-content">
        <div class="welcome-text">
          <h1>${getContent('home', 'welcome')}, ${user.preferredName ? user.preferredName : user.firstName}!</h1>
          <p class="subtitle">${getContent('home', 'subtitle')}</p>
          <div class="date-location">
            <p class="date">September 13, 2025</p>
            <p class="location">Los Angeles, CA</p>
          </div>
          <div class="countdown">
            <p>${getContent('home', 'timeUntil')}</p>
            <div id="countdown-timer"></div>
          </div>
        </div>
        <div class="welcome-image">
          <img src="images/photos/photo35.jpg" alt="Wedding Photo" class="featured-photo">
        </div>
      </div>
    </div>
  `;

  // Add countdown timer with real-time updates
  const weddingDate = new Date('2025-09-13');
  function updateCountdown() {
    if (currentRoute === "home") {
        const now = new Date();
        const diff = weddingDate - now;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('countdown-timer').innerHTML = `
        <div class="countdown-item">
            <span class="countdown-number">${days}</span>
            <span class="countdown-label">${getContent('home', 'days')}</span>, 
            <span class="countdown-number">${hours}</span>
            <span class="countdown-label">${getContent('home', 'hours')}</span>, 
        </div>
        <div class="countdown-item">
            <span class="countdown-number">${minutes}</span>
            <span class="countdown-label">${getContent('home', 'minutes')}</span>, 
            <span class="countdown-number">${seconds}</span>
            <span class="countdown-label">${getContent('home', 'seconds')}</span>
        </div>
        `;
    }
  }
  
  updateCountdown();
  setInterval(updateCountdown, 1000); // Update every second
}

async function renderSchedule(user){
  const snap = await getDocs(collection(db,"events"));
  let html = `
    <div class="schedule-container">
      <h1>${getContent('schedule', 'title')}</h1>
      <div class="events-grid">
  `;

  // Sort events by start time, properly handling Firestore timestamps
  const events = snap.docs
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        start: data.start?.toDate ? data.start.toDate() : new Date(data.start),
        end: data.end?.toDate ? data.end.toDate() : new Date(data.end)
      };
    })
    .sort((a, b) => a.start - b.start);

  events.forEach(ev => {
    const flag = "invited"+capitalize(ev.id);
    // Special case for after party - show if invited to main wedding
    const shouldShow = ev.id === "weddingAfterParty" 
      ? user.invitedMainWedding 
      : user[flag];

    if (shouldShow) {
      // Format the date using translated day and month names
      const dayName = getContent('dates', 'days')[ev.start.getDay()];
      const monthName = getContent('dates', 'months')[ev.start.getMonth()];
      const formattedDate = `${dayName}, ${monthName} ${ev.start.getDate()}`;
      
      const timeOptions = { hour: 'numeric', minute: '2-digit' };
      const formattedStartTime = ev.start.toLocaleTimeString('en-US', timeOptions);
      const formattedEndTime = ev.end.toLocaleTimeString('en-US', timeOptions);

      // Format the address and create Google Maps link
      const address = ev.location.split('<br>').map(part => part.trim()).join(', ');
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

      html += `
        <div class="event-card">
          <div class="event-header">
            <h2>${ev.title}</h2>
            <div class="event-date">${formattedDate}</div>
          </div>
          
          <div class="event-details">
            <div class="event-time">
              <i class="far fa-clock"></i>
              ${formattedStartTime} - ${formattedEndTime}
            </div>
            
            <div class="event-location">
              <i class="fas fa-map-marker-alt"></i>
              <a href="${mapsUrl}" target="_blank" class="address-link">
                ${ev.location.split('<br>').map(part => part.trim()).join('<br>')}
              </a>
            </div>

            ${ev.description ? `
              <div class="event-description">
                <i class="fas fa-info-circle"></i>
                ${ev.description}
              </div>
            ` : ''}

            ${ev.attire ? `
              <div class="event-attire">
                <i class="fas fa-tshirt"></i>
                <div class="attire-details">
                  <strong>Attire:</strong> ${ev.attire}
                </div>
              </div>
            ` : ''}

            ${ev.parking ? `
              <div class="event-parking">
                <i class="fas fa-parking"></i>
                <div class="parking-details">
                  <strong>Parking:</strong> ${ev.parking}
                </div>
              </div>
            ` : ''}

            ${ev.transport ? `
              <div class="event-transport">
                <i class="fas fa-car"></i>
                <div class="transport-details">
                  <strong>Transport:</strong> ${ev.transport}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
  });

  html += `
      </div>
    </div>
  `;
  app.innerHTML = html;
}

async function renderTravel(){
  app.innerHTML = `
    <div class="travel-container">
      <h1>${getContent('travel', 'title')}</h1>
      
      <div class="travel-section">
        <div class="section-header">
          <i class="fas fa-plane"></i>
          <h2>${getContent('travel', 'flights')}</h2>
        </div>
        <div class="section-content">
          <div class="location-card">
            <div class="location-icon">
              <i class="fas fa-plane-arrival"></i>
            </div>
            <div class="location-details">
              <h3>LAX</h3>
              <p>${getContent('travel', 'laxInfo')}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="travel-section">
        <div class="section-header">
          <i class="fas fa-hotel"></i>
          <h2>${getContent('travel', 'hotels')}</h2>
        </div>
        <div class="section-content">
          <div class="hotel-card">
            <div class="hotel-icon">
              <i class="fas fa-building"></i>
            </div>
            <div class="hotel-details">
              <h3>Hampton Inn & Suites Agoura Hills</h3>
              <p class="hotel-address">30255 Agoura Road, Agoura Hills, CA 91301</p>
              <p class="hotel-code">${getContent('travel', 'groupCode')}: <strong>PSW</strong></p>
              <a href="https://www.hilton.com/en/hotels/agocahx-hampton-suites-agoura-hills/" 
                 target="_blank" class="hotel-link">
                ${getContent('travel', 'bookNow')} <i class="fas fa-external-link-alt"></i>
              </a>
            </div>
          </div>

          <div class="hotel-card">
            <div class="hotel-icon">
              <i class="fas fa-building"></i>
            </div>
            <div class="hotel-details">
              <h3>Courtyard Thousand Oaks Agoura Hills</h3>
              <p class="hotel-address">29505 Agoura Road, Agoura Hills, CA 91301</p>
              <a href="https://www.marriott.com/event-reservations/reservation-link.mi?id=1732310675274&key=GRP&guestreslink2=true&app=resvlink" 
                 target="_blank" class="hotel-link">
                ${getContent('travel', 'bookNow')} <i class="fas fa-external-link-alt"></i>
              </a>
            </div>
          </div>

          <div class="hotel-card">
            <div class="hotel-icon">
              <i class="fas fa-info-circle"></i>
            </div>
            <div class="hotel-details">
              <h3>Other Hotel Options</h3>
              <p>There are several other hotels available in the Agoura Hills and Thousand Oaks area. We recommend checking booking sites for the best rates and availability.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="travel-section">
        <div class="section-header">
          <i class="fas fa-home"></i>
          <h2>AirBnB Options</h2>
        </div>
        <div class="section-content">
          <div class="hotel-card">
            <div class="hotel-icon">
              <i class="fas fa-home"></i>
            </div>
            <div class="hotel-details">
              <h3>AirBnB Accommodations</h3>
              <p>There are many AirBnB options available in Agoura Hills and the surrounding areas. We recommend booking early as availability can be limited during peak seasons.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderPhotos() {
  app.innerHTML = `
    <div class="photos-container">
      <h1>${getContent('photos', 'title')}</h1>
      <div class="photo-gallery" id="photoGallery">
        <!-- Photos will be loaded here -->
        <div class="photo-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading photos...</p>
        </div>
      </div>
    </div>
  `;

  // Function to load and display photos
  async function loadPhotos() {
    try {
      const photoGallery = document.getElementById('photoGallery');
      photoGallery.innerHTML = ''; // Clear loading message

      // Get all photos from the directory
      const photos = [
        'images/photos/photo1.jpg',
        'images/photos/photo2.jpg',
        'images/photos/photo3.jpg',
        'images/photos/photo4.jpg',
        'images/photos/photo5.jpg',
        'images/photos/photo6.jpg',
        'images/photos/photo7.jpg',
        'images/photos/photo8.jpg',
        'images/photos/photo9.jpg',
        'images/photos/photo10.jpg',
        'images/photos/photo11.jpg',
        'images/photos/photo12.jpg',
        'images/photos/photo13.jpg',
        'images/photos/photo14.jpg',
        'images/photos/photo15.jpg',
        'images/photos/photo16.jpg',
        'images/photos/photo17.jpg',
        'images/photos/photo18.jpg',
        'images/photos/photo19.jpg',
        'images/photos/photo20.jpg',
        'images/photos/photo21.jpg',
        'images/photos/photo22.jpg',
        'images/photos/photo23.jpg',
        'images/photos/photo24.jpg',
        'images/photos/photo25.jpg',
        'images/photos/photo26.jpg',
        'images/photos/photo27.jpg',
        'images/photos/photo28.jpg',
        'images/photos/photo29.jpg',
        'images/photos/photo30.jpg',
        'images/photos/photo31.jpg',
        'images/photos/photo32.jpg',
        'images/photos/photo33.jpg',
        'images/photos/photo34.jpg',
        'images/photos/photo35.jpg',
        'images/photos/photo36.jpg',
        
      ];

      // Create photo elements
      photos.forEach(photo => {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.innerHTML = `
          <div class="photo-wrapper">
            <img src="${photo}" alt="Wedding Photo" loading="lazy">
            <div class="photo-overlay">
              <i class="fas fa-expand"></i>
            </div>
          </div>
        `;

        // Add click handler for lightbox
        item.querySelector('img').addEventListener('click', () => {
          showLightbox(photo);
        });

        photoGallery.appendChild(item);
      });

      // Initialize Masonry after images are loaded
      imagesLoaded('#photoGallery', function() {
        new Masonry('#photoGallery', {
          itemSelector: '.photo-item',
          columnWidth: '.photo-item',
          percentPosition: true,
          transitionDuration: '0.3s'
        });
      });
    } catch (error) {
      console.error('Error loading photos:', error);
      document.getElementById('photoGallery').innerHTML = `
        <div class="photo-error">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error loading photos. Please try again later.</p>
        </div>
      `;
    }
  }

  // Lightbox functionality
  function showLightbox(imageSrc) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-content">
        <img src="${imageSrc}" alt="Wedding Photo">
        <button class="lightbox-close">&times;</button>
      </div>
    `;

    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';

    // Close lightbox on click
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.className === 'lightbox-close') {
        lightbox.remove();
        document.body.style.overflow = '';
      }
    });
  }

  // Load photos
  loadPhotos();
}

async function renderDetails()  {
  app.innerHTML = `
    <div class="details-container">
      <div class="details-section">
        <h2><i class="fas fa-calendar-check"></i> RSVP</h2>
        <div class="details-card">
          <p>Please RSVP by July 13 so we can have an accurate headcount!</p>
        </div>
      </div>

      <div class="details-section">
        <h2><i class="fas fa-map-marked-alt"></i> LOCATION</h2>
        <div class="details-card">
          <p>Our ceremony and reception are outdoors (though you can go in the house at any time) on a turf lawn. Please choose shoes that will be comfortable to wear on turf! Due to city noise ordinances we can't have music outdoors after 10pm; at that time we'll start the after party inside the house.</p>
        </div>
      </div>

      <div class="details-section">
        <h2><i class="fas fa-cloud-sun"></i> WEATHER</h2>
        <div class="details-card">
          <p>It's usually hot in the afternoon (~low 80s Fahrenheit) and cools down at night (~high 60s Fahrenheit).</p>
        </div>
      </div>

      <div class="details-section">
        <h2><i class="fas fa-question-circle"></i> QUESTIONS</h2>
        <div class="details-card">
          <p>Call or text either of us with any questions!</p>
        </div>
      </div>
    </div>
  `;
}
async function renderRegistry()   { app.innerHTML = `<h1>Registry</h1><p>…give us moneys…</p>`; }

async function renderRSVP(user){
  const snap = await getDocs(query(collection(db,"users"),
    where("groupId","==",user.groupId)));
  const members = snap.docs.map(d=>({ uid:d.id, ...d.data() }));
  
  // Define events and their IDs
  const events = [
    { id: "Church", title: "Catholic Ceremony" },
    { id: "WelcomeParty", title: "Welcome Party" },
    { id: "MainWedding", title: "Wedding" },
    { id: "SundayBrunchEarly", title: "Sunday Brunch" },
    { id: "SundayBrunchLate", title: "Sunday Brunch" }
  ];

  // Get existing RSVPs for this group
  const rsvpSnap = await getDocs(collection(db,"rsvps"));
  const rsvps = {};
  rsvpSnap.docs.forEach(d => {
    const data = d.data();
    rsvps[`${data.userId}_${data.eventId}`] = data.attending;
  });

  let html = `<h1>RSVP: ${user.groupId}</h1>
    <table><thead><tr><th>Guest</th>`;
  
  // Only show events that at least one member is invited to
  const invitedEvents = events.filter(ev => 
    members.some(m => m[`invited${ev.id}`])
  );
  
  invitedEvents.forEach(ev=> html+=`<th>${ev.title}</th>`);
  html += `<th>Allergies</th></tr></thead><tbody>`;

  members.forEach(m=>{
    html += `<tr><td>${m.firstName} ${m.lastName}</td>`;
    invitedEvents.forEach(ev=>{
      const key = `invited${ev.id}`;
      if (m[key]) {
        const rsvpKey = `${m.uid}_${ev.id}`;
        const isChecked = rsvps[rsvpKey] ? 'checked' : '';
        html += `<td><input type="checkbox"
                   data-uid="${m.uid}" data-event="${ev.id}"
                   ${isChecked}></td>`;
      }
    });
    // Add allergies input field
    html += `<td><input type="text" class="allergies-input" 
              data-uid="${m.uid}" 
              value="${m.allergies || ''}" 
              placeholder="Enter any allergies"></td>`;
    html += "</tr>";
  });
  html += `</tbody></table>
    <button id="submitRSVP">${user.hasRSVPed ? 'Resubmit RSVP' : 'Submit RSVP'}</button>`;
  app.innerHTML = html;

  document.getElementById('submitRSVP').onclick = async ()=>{
    // Save RSVPs
    document.querySelectorAll("input[type=checkbox]").forEach(async cb=>{
      await setDoc(doc(db,"rsvps",`${cb.dataset.uid}_${cb.dataset.event}`),{
        userId:cb.dataset.uid,
        eventId:cb.dataset.event,
        attending:cb.checked
      });
    });

    // Save allergies
    document.querySelectorAll(".allergies-input").forEach(async input => {
      await setDoc(doc(db,"users",input.dataset.uid),{
        allergies: input.value.trim()
      }, { merge: true });
    });

    await setDoc(doc(db,"users",user.uid),{ hasRSVPed:true },{ merge:true });
    navigate("home");
  };
}

async function renderAdmin(user) {
  try {
    // Fetch all events
    const evSnap = await getDocs(collection(db, "events"));
    const events = {};
    evSnap.forEach(d => events[d.id] = d.data().title);

    // Fetch all users
    const userSnap = await getDocs(collection(db, "users"));
    const users = {};
    userSnap.forEach(d => users[d.id] = d.data());

    // Fetch all RSVPs
    const rsvpSnap = await getDocs(collection(db, "rsvps"));
    const rows = rsvpSnap.docs.map(rs => {
      const { userId, eventId, attending } = rs.data();
      const u = users[userId];
      if (!u) {
        console.warn(`User ${userId} not found for RSVP`);
        return null;
      }
      return {
        name: `${u.firstName} ${u.lastName}`,
        group: u.groupId,
        event: events[eventId] || eventId,
        attending: attending ? "Yes" : "No",
        allergies: u.allergies || ""
      };
    }).filter(r => r !== null);

    // Calculate statistics
    const stats = {
      total: rows.length,
      attending: rows.filter(r => r.attending === "Yes").length,
      byEvent: {},
      byGroup: {},
      withAllergies: rows.filter(r => r.allergies).length
    };

    rows.forEach(r => {
      stats.byEvent[r.event] = (stats.byEvent[r.event] || 0) + 1;
      stats.byGroup[r.group] = (stats.byGroup[r.group] || 0) + 1;
    });

    // Build the admin view
    let html = `
      <div class="admin-dashboard">
        <h1>RSVP Dashboard</h1>
        
        <div class="stats-section">
          <h2>Statistics</h2>
          <div class="stats-grid">
            <div class="stat-box">
              <h3>Total RSVPs</h3>
              <p>${stats.total}</p>
            </div>
            <div class="stat-box">
              <h3>Attending</h3>
              <p>${stats.attending}</p>
            </div>
            <div class="stat-box">
              <h3>With Allergies</h3>
              <p>${stats.withAllergies}</p>
            </div>
          </div>
        </div>

        <div class="filters">
          <select id="eventFilter">
            <option value="">All Events</option>
            ${Object.keys(stats.byEvent).map(ev => 
              `<option value="${ev}">${ev} (${stats.byEvent[ev]})</option>`
            ).join("")}
          </select>
          <select id="groupFilter">
            <option value="">All Groups</option>
            ${Object.keys(stats.byGroup).map(group => 
              `<option value="${group}">${group} (${stats.byGroup[group]})</option>`
            ).join("")}
          </select>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Group</th>
                <th>Event</th>
                <th>Attending</th>
                <th>Allergies</th>
              </tr>
            </thead>
            <tbody id="rsvpTableBody">
              ${rows.map(r => `
                <tr data-event="${r.event}" data-group="${r.group}">
                  <td>${r.name}</td>
                  <td>${r.group}</td>
                  <td>${r.event}</td>
                  <td>${r.attending}</td>
                  <td>${r.allergies}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("app").innerHTML = html;

    // Add filter functionality
    const eventFilter = document.getElementById("eventFilter");
    const groupFilter = document.getElementById("groupFilter");
    const tableBody = document.getElementById("rsvpTableBody");

    function applyFilters() {
      const eventValue = eventFilter.value;
      const groupValue = groupFilter.value;

      tableBody.querySelectorAll("tr").forEach(row => {
        const eventMatch = !eventValue || row.dataset.event === eventValue;
        const groupMatch = !groupValue || row.dataset.group === groupValue;
        row.style.display = eventMatch && groupMatch ? "" : "none";
      });
    }

    eventFilter.addEventListener("change", applyFilters);
    groupFilter.addEventListener("change", applyFilters);
  } catch (error) {
    console.error("Error rendering admin view:", error);
    document.getElementById("app").innerHTML = `
      <div class="error-message">
        <h1>Error Loading Admin Dashboard</h1>
        <p>There was an error loading the admin dashboard. Please try refreshing the page.</p>
        <p>Error details: ${error.message}</p>
      </div>
    `;
  }
}

// --- 6. Bootstrap ---
window.addEventListener("DOMContentLoaded", ()=>{
  currentLanguage = sessionStorage.getItem('weddingLanguage') || 'en';
  renderLanguageSelector();
  if (sessionStorage.getItem("weddingUser")) navigate("home");
  else renderLogin();
});