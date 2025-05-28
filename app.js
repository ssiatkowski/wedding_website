// app.js
import { collection, doc, getDoc, getDocs, query, where, setDoc, addDoc, deleteDoc, writeBatch, limit, startAfter, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Use the same global `db` from firebase-init.js
const db = window.db;

// Cache management
const cache = {
  events: null,
  scheduleEvents: null,
  users: null,
  lastFetch: null,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

  isStale() {
    return !this.lastFetch || (Date.now() - this.lastFetch) > this.CACHE_DURATION;
  },

  async getEvents() {
    if (!this.events || this.isStale()) {
      const snap = await getDocs(collection(db, "events"));
      this.events = {};
      snap.forEach(d => this.events[d.id] = d.data().title);
      this.lastFetch = Date.now();
    }
    return this.events;
  },

  async getScheduleEvents() {
    if (!this.scheduleEvents || this.isStale()) {
      const snap = await getDocs(collection(db, "events"));
      this.scheduleEvents = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        start: d.data().start?.toDate ? d.data().start.toDate() : new Date(d.data().start),
        end: d.data().end?.toDate ? d.data().end.toDate() : new Date(d.data().end)
      }));
      this.lastFetch = Date.now();
    }
    return this.scheduleEvents;
  },

  async getUsers() {
    if (!this.users || this.isStale()) {
      const snap = await getDocs(collection(db, "users"));
      this.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.lastFetch = Date.now();
    }
    return this.users;
  },

  clear() {
    this.events = null;
    this.scheduleEvents = null;
    this.users = null;
    this.lastFetch = null;
  }
};

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
let previousRoute = null;

// Define content translations
const content = {
  home: {
    en: {
      welcome: "Welcome",
      subtitle: "We hope you can join us on our special day, and will be thrilled to have you with us.",
      timeUntil: "Celebration Countdown",
      days: "days",
      hours: "hours",
      minutes: "minutes",
      seconds: "seconds",
      month: "September"
    },
    pl: {
      welcome: "Cześć",
      subtitle: "Mamy nadzieję, że dołączysz do nas w ten wyjątkowy dzień i będziemy zachwyceni, jeżeli będziesz z nami.",
      timeUntil: "Odliczanie do Uroczystości",
      days: "dni",
      hours: "godziny",
      minutes: "minuty",
      seconds: "sekundy",
      month: "Wrzesień"
    },
    gu: {
      welcome: "સ્વાગત છે",
      subtitle: "અમે આશા રાખીએ છીએ કે તમે અમારા ખાસ દિવસે અમારી સાથે જોડાઓ, અને અમને ખૂબ જ આનંદ થશે કે તમે અમારી સાથે હોશો.",
      timeUntil: "ઉજવણી સુધીનું ગણતરી",
      days: "દિવસો",
      hours: "કલાકો",
      minutes: "મિનિટ",
      seconds: "સેકન્ડ",
      month: "સપ્ટેમ્બર"
    }
  },
  schedule: {
    en: { 
      title: "Schedule",
      attire: "Attire"
    },
    pl: { 
      title: "Wydarzenia",
      attire: "Ubiór"
    },
    gu: { 
      title: "શેડ્યૂલ",
      attire: "પોશાક"
    }
  },
  travel: {
    en: {
      title: "Travel",
      flights: "Flights",
      hotels: "Hotels",
      laxInfo: "We recommend flying into LAX. From there you can either rent a car or use Uber/Lyft.",
      bookNow: "Book Now",
      groupCode: "Group Code",
      otherHotels: "Other Hotel Options",
      otherOptions: "Other Options",
      otherHotelsDesc: "There are several other hotels available in the Agoura Hills and Thousand Oaks area. Here is a google search for best locations.",
      airbnbTitle: "AirBnB",
      airbnbDesc: "There are many AirBnB options available in Agoura Hills and the surrounding areas. We recommend booking early as availability can be limited during peak seasons.",
      bookingTitle: "Booking.com",
      bookingDesc: "Browse additional hotel options in the area through Booking.com.",
      searchHotels: "Search Hotels",
      searchAirbnb: "Search AirBnB",
      searchBooking: "Search Booking.com",
      transportationTitle: "Transportation",
      transportationDesc: "We recommend renting a car for your stay.",
      getDirections: "Get Directions"
    },
    pl: {
      title: "Podróż",
      flights: "Loty",
      hotels: "Hotele",
      laxInfo: "Zalecamy przylot na LAX. Stamtąd możesz wynająć samochód lub skorzystać z Uber/Lyft.",
      bookNow: "Zarezerwuj teraz",
      groupCode: "Kod grupy",
      otherHotels: "Inne Opcje Hotelowe",
      otherOptions: "Inne Opcje",
      otherHotelsDesc: "W okolicach Agoura Hills i Thousand Oaks dostępnych jest kilka innych hoteli. Oto wyszukiwarka Google z najlepszymi lokalizacjami.",
      airbnbTitle: "AirBnB",
      airbnbDesc: "W Agoura Hills i okolicach dostępnych jest wiele opcji AirBnB. Zalecamy wczesną rezerwację, ponieważ dostępność może być ograniczona w sezonie.",
      bookingTitle: "Booking.com",
      bookingDesc: "Przeglądaj dodatkowe opcje hoteli w okolicy przez Booking.com.",
      searchHotels: "Szukaj Hotelów",
      searchAirbnb: "Szukaj AirBnB",
      searchBooking: "Szukaj na Booking.com",
      transportationTitle: "Transport",
      transportationDesc: "Zalecamy wynajęcie samochodu na miejscu.",
      getDirections: "Uzyskaj Instrukcje"
    },
    gu: {
      title: "મુસાફરી",
      flights: "ફ્લાઇટ્સ",
      hotels: "હોટેલ્સ",
      laxInfo: "અમે LAX માં ફ્લાઇટ કરવાની ભલામણ કરીએ છીએ. ત્યાંથી તમે કાર ભાડે લઈ શકો છો અથવા Uber/Lyft નો ઉપયોગ કરી શકો છો.",
      bookNow: "હવે બુક કરો",
      groupCode: "ગ્રુપ કોડ",
      otherHotels: "અન્ય હોટેલ વિકલ્પો",
      otherOptions: "અન્ય વિકલ્પો",
      otherHotelsDesc: "અગોરા હિલ્સ અને થાઉઝન્ડ ઓક્સ વિસ્તારમાં અન્ય કેટલાક હોટેલો ઉપલબ્ધ છે. અહીં શ્રેષ્ઠ સ્થાનો માટે Google શોધ છે.",
      airbnbTitle: "AirBnB",
      airbnbDesc: "અગોરા હિલ્સ અને આસપાસના વિસ્તારોમાં ઘણા AirBnB વિકલ્પો ઉપલબ્ધ છે. અમે શિખર સીઝનમાં ઉપલબ્ધતા મર્યાદિત હોઈ શકે છે, તેથી વહેલી બુકિંગની ભલામણ કરીએ છીએ.",
      bookingTitle: "Booking.com",
      bookingDesc: "Booking.com દ્વારા વિસ્તારમાં વધારાના હોટેલ વિકલ્પો બ્રાઉઝ કરો.",
      searchHotels: "હોટેલો શોધો",
      searchAirbnb: "AirBnB શોધો",
      searchBooking: "Booking.com પર શોધો",
      transportationTitle: "ટ્રાન્સપોર્ટ",
      transportationDesc: "તમે તમારા માટે વાપરવા માટે વાપરવાની વિગતો આપવાની જરૂર છે.",
      getDirections: "તમારી માટે માર્ગ મેળવવા માટે જાવો!"
    }
  },
  details: {
    en: {
      title: "Details",
      rsvp: "RSVP",
      rsvpText: "Please RSVP by July 13 so we can have an accurate headcount!",
      location: "LOCATION",
      locationText: "Our ceremony and reception are outdoors (though you can go in the house at any time) on a turf lawn. Please choose shoes that will be comfortable to wear on turf! Due to city noise ordinances we can't have music outdoors after 10pm; at that time we'll start the after party inside the house.",
      weather: "WEATHER",
      weatherText: "It's usually hot in the afternoon (~low 80s Fahrenheit) and cools down at night (~high 60s Fahrenheit).",
      questions: "QUESTIONS",
      questionsText: "Call or text either of us with any questions!",
      registry: "REGISTRY",
      registryText: "We haven't created a registry - your presence is truly the only gift we need!",
      kidsFAQ: "We love your children, but due to space restrictions, we respectfully request adults only. If this makes it challenging for you to attend, please reach out to us!"
    },
    pl: {
      title: "Szczegóły",
      rsvp: "RSVP",
      rsvpText: "Prosimy o potwierdzenie obecności do 13 lipca, abyśmy mogli dokładnie zaplanować uroczystość!",
      location: "LOKALIZACJA",
      locationText: "Nasza ceremonia i przyjęcie odbędą się na zewnątrz (choć możesz wejść do domu w dowolnym momencie) na trawniku. Prosimy o wybór wygodnego obuwia na trawę! Ze względu na przepisy dotyczące hałasu w mieście nie możemy mieć muzyki na zewnątrz po 22:00; w tym czasie rozpoczniemy after party w domu.",
      weather: "POGODA",
      weatherText: "Zazwyczaj jest gorąco po południu (~27°C) i chłodniej w nocy (~20°C).",
      questions: "PYTANIA",
      questionsText: "Zadzwoń lub napisz do nas z jakimikolwiek pytaniami!",
      registry: "LISTA PREZENTÓW",
      registryText: "Nie stworzyliśmy listy prezentów - Twoja obecność to naprawdę jedyny prezent, którego potrzebujemy!",
      kidsFAQ: "Kochamy Wasze dzieci, ale z powodu ograniczonej przestrzeni uprzejmie prosimy o obecność tylko dorosłych. Jeśli to sprawia, że trudno Wam będzie przyjechać, prosimy o kontakt!"
    },
    gu: {
      title: "વિગતો",
      rsvp: "RSVP",
      rsvpText: "ચોક્કસ માથાગણતી માટે 13 જુલાઈ સુધી RSVP કરો કૃપા કરીને!",
      location: "સ્થાન",
      locationText: "અમારી સમારંભ અને સ્વાગત બહાર (જોકે તમે કોઈપણ સમયે ઘરમાં જઈ શકો છો) ટર્ફ લોન પર છે. કૃપા કરીને ટર્ફ પર પહેરવા માટે આરામદાયક જૂતા પસંદ કરો! શહેરના ઘોંઘાટના ઓર્ડિનન્સને કારણે આપણે રાત્રે 10 વાગ્યા પછી બહાર સંગીત નથી રાખી શકતા; તે સમયે આપણે ઘરની અંદર after party શરૂ કરીશું.",
      weather: "હવામાન",
      weatherText: "દિવસે સામાન્ય રીતે ગરમ હોય છે (~27°C) અને રાત્રે ઠંડુ પડે છે (~20°C).",
      questions: "પ્રશ્નો",
      questionsText: "કોઈપણ પ્રશ્નો માટે અમને કૉલ કરો અથવા મેસેજ કરો!",
      registry: "રજિસ્ટ્રી",
      registryText: "અમે રજિસ્ટ્રી બનાવી નથી - તમારી હાજરી ખરેખર એકમાત્ર ભેટ છે જે અમને જોઈએ છે!",
      kidsFAQ: "અમે તમારા બાળકોને ખૂબ પ્રેમ કરીએ છીએ, પરંતુ જગ્યા અંગેના મર્યાદાને કારણે, અમે વિનમ્રતાપૂર્વક વિનંતી કરીએ છીએ કે કૃપા કરીને માત્ર પ્રૌઢો જ હાજર રહે. જો આ કારણે તમને હાજર રહેવું મુશ્કેલ થાય, તો અમારો સંપર્ક કરો!"
    }
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
    en: {
      title: "RSVP",
      submit: "Submit RSVP",
      resubmit: "Resubmit RSVP",
      allergies: "Allergies",
      allergiesPlaceholder: "Enter any allergies",
      dietaryRestrictions: "Dietary Restrictions",
      firstName: "First Name",
      lastName: "Last Name",
      firstNamePlaceholder: "First Name",
      lastNamePlaceholder: "Last Name",
      plusOneTitle: "Add a Guest",
      plusOneDescription: "You can add one guest to your group. Please provide their details below.",
      instructions: "Please indicate which events you will be able to attend by checking the corresponding boxes. If you have any dietary restrictions or allergies, please note them in the allergies section. Once you have completed your selections, click the submit button at the bottom of the page.",
      plusOneInstructions: "If you would like to bring a guest, please provide their information in the section below."
    },
    pl: {
      title: "RSVP",
      submit: "Wyślij RSVP",
      resubmit: "Wyślij ponownie RSVP",
      allergies: "Alergie",
      allergiesPlaceholder: "Wpisz alergie",
      dietaryRestrictions: "Ograniczenia Dietetyczne",
      firstName: "Imię",
      lastName: "Nazwisko",
      firstNamePlaceholder: "Imię",
      lastNamePlaceholder: "Nazwisko",
      plusOneTitle: "Dodaj gościa",
      plusOneDescription: "Możesz dodać jednego gościa do swojej grupy. Podaj jego dane poniżej.",
      instructions: "Prosimy o zaznaczenie wydarzeń, w których będziecie mogli uczestniczyć, zaznaczając odpowiednie pola. Jeśli macie jakieś ograniczenia dietetyczne lub alergie, prosimy o ich zaznaczenie w sekcji alergii. Po dokonaniu wyborów, kliknij przycisk wyślij na dole strony.",
      plusOneInstructions: "Jeśli chcielibyście przyprowadzić osobę towarzyszącą, prosimy o podanie jej danych w sekcji poniżej."
    },
    gu: {
      title: "RSVP",
      submit: "RSVP મોકલો",
      resubmit: "RSVP ફરીથી મોકલો",
      allergies: "એલર્જી",
      allergiesPlaceholder: "કોઈપણ એલર્જી લખો",
      dietaryRestrictions: "આહાર પ્રતિબંધો",
      firstName: "પ્રથમ નામ",
      lastName: "છેલ્લું નામ",
      firstNamePlaceholder: "પ્રથમ નામ",
      lastNamePlaceholder: "છેલ્લું નામ",
      plusOneTitle: "મહેમાન ઉમેરો",
      plusOneDescription: "તમે તમારા જૂથમાં એક મહેમાન ઉમેરી શકો છો. કૃપા કરીને તેમની વિગતો નીચે આપો.",
      instructions: "કૃપા કરીને તમે જે કાર્યક્રમોમાં ભાગ લઈ શકશો તેના માટે સંબંધિત બોક્સ ચેક કરો. જો તમને કોઈ ખોરાક પ્રતિબંધો અથવા એલર્જી હોય, તો કૃપા કરીને એલર્જી વિભાગમાં તેની નોંધ કરો. તમારી પસંદગી પૂર્ણ થયા પછી, પૃષ્ઠના તળિયે સબમિટ બટન પર ક્લિક કરો.",
      plusOneInstructions: "જો તમે કોઈ મહેમાનને લાવવા માંગતા હો, તો કૃપા કરીને નીચેના વિભાગમાં તેમની માહિતી આપો."
    }
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
  },
  attire: {
    en: {
      church: "Church Appropriate",
      indian: "Indian or Festive Semiformal",
      formal: "Formal",
      casual: "Casual"
    },
    pl: {
      church: "Odpowiedni do Kościoła",
      indian: "Indyjski lub Świąteczny Półformalny",
      formal: "Formalny",
      casual: "Swobodny"
    },
    gu: {
      church: "ચર્ચ માટે યોગ્ય",
      indian: "ભારતીય અથવા ઉત્સવ સેમિફોર્મલ",
      formal: "ફોર્મલ",
      casual: "કેઝ્યુઅલ"
    }
  },
  parking: {
    en: {
      valet: "Free Valet Available"
    },
    pl: {
      valet: "Darmowy Parking z Obsługą"
    },
    gu: {
      valet: "મફત વેલેટ ઉપલબ્ધ છે"
    }
  },
  transport: {
    en: {
      basic: "Uber/Lyft are available",
      shuttle: "Uber/Lyft are available. Starting at 9pm, we have also arranged for a shuttle back to our blocked hotels."
    },
    pl: {
      basic: "Dostępne Uber/Lyft",
      shuttle: "Dostępne Uber/Lyft. Od godziny 21:00 zorganizowaliśmy również transport powrotny do naszych zarezerwowanych hoteli."
    },
    gu: {
      basic: "Uber/Lyft ઉપલબ્ધ છે",
      shuttle: "Uber/Lyft ઉપલબ્ધ છે. રાત્રે 9 વાગ્યા થી, અમે અમારા બ્લોક કરેલા હોટેલોમાં પાછા જવા માટે શટલની વ્યવસ્થા પણ કરી છે."
    }
  },
  ceremony: {
    en: {
      title: "Ceremony",
      startTime: "Begins at 4:00pm. Guests may arrive at Villa di Rocca beginning at 3:30pm.",
      venue: "Villa di Rocca",
      address: "25255 Agoura Road, Agoura Hills, CA 91301",
      map: "https://www.google.com/maps/search/?api=1&query=Villa+di+Rocca"
    },
    pl: {
      title: "Ceremonia",
      startTime: "Rozpoczyna się o 16:00. Goście mogą przybywać do Villa di Rocca od 15:30.",
      venue: "Villa di Rocca",
      address: "25255 Agoura Road, Agoura Hills, CA 91301",
      map: "https://www.google.com/maps/search/?api=1&query=Villa+di+Rocca"
    },
    gu: {
      title: "વિધિ",
      startTime: "સામારંભ સાંજે 4:00 વાગ્યે શરૂ થશે. મહેમાનો 3:30 વાગ્યા પછી વિલા દિ રોકા પર પહોંચી શકે છે.",
      venue: "વિલા દિ રોકા",
      address: "25255 અગોરા રોકા, અગોરા હિલ્સ, કા 91301",
      map: "https://www.google.com/maps/search/?api=1&query=Villa+di+Rocca"
    }
  },
  indianAttire: {
    en: {
      title: "Indian Attire",
      text: "Contact us if you are interested in wearing Indian attire and would like help with Indian clothes!"
    },
    pl: {
      title: "Stroje Indyjskie",
      text: "Skontaktuj się z nami, jeśli jesteś zainteresowany założeniem indyjskiego stroju i chciałbyś uzyskać pomoc w wyborze ubrań!"
      },
    gu: {
      title: "ભારતીય પોશાક",
      text: "જો તમે ભારતીય પરિધાન પહેરવામાં રસ ધરાવતા હોવ અને ભારતીય કપડાં માટે મદદ મેળવવા ઈચ્છતા હોવ તો કૃપા કરીને અમારો સંપર્ક કરો!"
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
  
  // Only update navigation if user is logged in
  const uid = sessionStorage.getItem("weddingUser");
  if (uid) {
    const isAdmin = sessionStorage.getItem("isAdmin") === "true";
    renderNav(currentRoute, isAdmin, !currentUser?.hasRSVPed);
  }
  
  // Re-render current page without navigation
  if (currentUser) {
    routes[currentRoute].render(currentUser);
  } else {
    renderLogin(); // Re-render login page with new language
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
    <div class="login-container">
      <div class="login-background" style="background-image: url('images/photos/login_photo.jpg')"></div>
      <div class="login-overlay"></div>
      <div class="login-content">
        <div class="login-header">
          <h1>Alomi & Sebastian</h1>
          <h2>September 13, 2025</h2>
        </div>
        <form id="loginForm" class="login-form">
          <div class="input-group">
            <i class="fas fa-user"></i>
            <input id="first" placeholder="${getContent('login', 'firstName')}" required />
          </div>
          <div class="input-group">
            <i class="fas fa-user"></i>
            <input id="last"  placeholder="${getContent('login', 'lastName')}"  required />
          </div>
          <div class="input-group">
            <i class="fas fa-lock"></i>
            <input id="pass"  type="password" placeholder="${getContent('login', 'password')}" required />
          </div>
          <button class="login-button">${getContent('login', 'enter')}</button>
          <div id="loginError" class="error"></div>
        </form>
        <div id="suggestions"></div>
      </div>
    </div>
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

// Add this function after the other helper functions at the top
function preloadPhotos() {
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
  ];

  // Create an array to store the loading promises
  const preloadPromises = photos.map(src => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
  });

  // Return a promise that resolves when all images are loaded
  return Promise.allSettled(preloadPromises);
}

// Modify the finishLogin function to preload photos
async function finishLogin(uid, isAdmin = false){
  sessionStorage.setItem("weddingUser", uid);
  sessionStorage.setItem("isAdmin", isAdmin);
  
  // Start preloading photos in the background
  preloadPhotos().catch(err => console.warn('Some photos failed to preload:', err));
  
  // Navigate to home immediately without waiting for preload
  navigate("home");
}

// --- 4. Router & Nav ---
const routes = {
  home: { 
    title: () => {
      switch(currentLanguage) {
        case 'pl': return 'Start';
        case 'gu': return 'હોમ';
        default: return 'Home';
      }
    },
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
  // Filter routes based on admin status and hide registry
  const availableRoutes = Object.entries(routes).filter(([key]) => 
    (key !== "admin" || isAdmin) && key !== "registry"
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
  const isNewRoute = currentRoute !== route;
  previousRoute = currentRoute;
  currentRoute = route;
  
  // Update navigation
  renderNav(route, isAdmin, !currentUser.hasRSVPed);
  
  // Show navbar and hide menu button
  const navbar = document.getElementById('main-nav');
  const menuBtn = document.querySelector('.menu-button');
  if (navbar) navbar.classList.remove('hidden');
  if (menuBtn) menuBtn.classList.remove('visible');
  
  await routes[route].render(currentUser);

  // Scroll to top only if navigating to a new route
  if (isNewRoute) {
    window.scrollTo({
      top: 0,
      behavior: 'instant' // Use 'instant' instead of 'smooth' to prevent animation issues
    });
  }
}

// --- 5. Page Renderers ---
async function renderHome(user){
  app.innerHTML = `
    <div class="welcome-section">
      <div class="welcome-content">
        <div class="welcome-text">
          <h1 class="animated-title">${getContent('home', 'welcome')} ${user.preferredName ? user.preferredName : user.firstName}!</h1>
          <p class="subtitle animated-subtitle">${getContent('home', 'subtitle')}</p>
          <div class="date-location animated-card">
            <div class="date-badge">
              <span class="month">${getContent('home', 'month')}</span>
              <span class="day">13</span>
              <span class="year">2025</span>
            </div>
            <p class="location"><i class="fas fa-map-marker-alt"></i> Los Angeles, CA</p>
          </div>
          <div class="countdown animated-card">
            <p class="countdown-title">${getContent('home', 'timeUntil')}</p>
            <div id="countdown-timer" class="countdown-grid"></div>
          </div>
        </div>
        <div class="welcome-image animated-image">
          <img src="images/photos/photo8.jpg" alt="Wedding Photo" class="featured-photo">
          <div class="image-overlay">
            <div class="overlay-content">
              <span class="heart-icon">❤️</span>
              <span class="overlay-text">Sebastian & Alomi</span>
            </div>
          </div>
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
            <div class="countdown-number">${days}</div>
            <div class="countdown-label">${getContent('home', 'days')}</div>
          </div>
          <div class="countdown-item">
            <div class="countdown-number">${hours}</div>
            <div class="countdown-label">${getContent('home', 'hours')}</div>
          </div>
          <div class="countdown-item">
            <div class="countdown-number">${minutes}</div>
            <div class="countdown-label">${getContent('home', 'minutes')}</div>
          </div>
          <div class="countdown-item">
            <div class="countdown-number">${seconds}</div>
            <div class="countdown-label">${getContent('home', 'seconds')}</div>
          </div>
        `;
    }
  }
  
  updateCountdown();
  setInterval(updateCountdown, 1000); // Update every second
}

async function renderSchedule(user) {
  // Get events from cache
  const events = await cache.getScheduleEvents();
  
  let html = `
    <div class="schedule-container">
      <h1>${getContent('schedule', 'title')}</h1>
      <div class="events-grid">
  `;

  // Sort events by start time
  const sortedEvents = events.sort((a, b) => a.start - b.start);

  sortedEvents.forEach(ev => {
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

      // Get translated attire, parking, and transport text
      let attireText = ev.attire;
      if (ev.attire === "Church Appropriate") attireText = getContent('attire', 'church');
      else if (ev.attire === "Indian or Festive Semiformal") attireText = getContent('attire', 'indian');
      else if (ev.attire === "Formal") attireText = getContent('attire', 'formal');
      else if (ev.attire === "Casual") attireText = getContent('attire', 'casual');

      if (ev.indianAttire) attireText += ". " + getContent('indianAttire', 'text');

      let parkingText = ev.parking;
      if (ev.parking === "Free Valet Available") parkingText = getContent('parking', 'valet');

      let transportText = ev.transport;
      if (ev.transport === "Uber/Lyft are available") transportText = getContent('transport', 'basic');
      else if (ev.transport === "Uber/Lyft are available. Starting at 9pm, we have also arranged for a shuttle back to our blocked hotels.") 
        transportText = getContent('transport', 'shuttle');

      let ceremonyText = ev.ceremony ? getContent('ceremony', 'startTime') : '';

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
                  <strong>${getContent('schedule', 'attire')}:</strong> ${attireText}
                </div>
              </div>
            ` : ''}

            ${ev.parking ? `
              <div class="event-parking">
                <i class="fas fa-parking"></i>
                <div class="parking-details">
                  <strong>Parking:</strong> ${parkingText}
                </div>
              </div>
            ` : ''}

            ${ev.transport ? `
              <div class="event-transport">
                <i class="fas fa-car"></i>
                <div class="transport-details">
                  <strong>Transport:</strong> ${transportText}
                </div>
              </div>
            ` : ''}

            ${ceremonyText ? `
              <div class="event-ceremony">
                <i class="fas fa-ring"></i>
                <div class="ceremony-details">
                  <strong>${getContent('ceremony', 'title')}:</strong> ${ceremonyText}
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
            <div class="card-header">
              <div class="location-icon">
                <i class="fas fa-plane-arrival"></i>
              </div>
              <div class="location-details">
                <h3>LAX</h3>
              </div>
            </div>
            <p>${getContent('travel', 'laxInfo')}</p>
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
            <div class="card-header">
              <div class="hotel-icon">
                <i class="fas fa-building"></i>
              </div>
              <div class="hotel-details">
                <h3>Hampton Inn & Suites Agoura Hills</h3>
              </div>
            </div>
            <p class="hotel-address">30255 Agoura Road, Agoura Hills, CA 91301</p>
            <p class="hotel-code">${getContent('travel', 'groupCode')}: <strong>PSW</strong></p>
            <a href="https://www.hilton.com/en/hotels/agocahx-hampton-suites-agoura-hills/" 
               target="_blank" class="hotel-link">
              ${getContent('travel', 'bookNow')} <i class="fas fa-external-link-alt"></i>
            </a>
          </div>

          <div class="hotel-card">
            <div class="card-header">
              <div class="hotel-icon">
                <i class="fas fa-building"></i>
              </div>
              <div class="hotel-details">
                <h3>Courtyard Thousand Oaks Agoura Hills</h3>
              </div>
            </div>
            <p class="hotel-address">29505 Agoura Road, Agoura Hills, CA 91301</p>
            <a href="https://www.marriott.com/event-reservations/reservation-link.mi?id=1732310675274&key=GRP&guestreslink2=true&app=resvlink" 
               target="_blank" class="hotel-link">
              ${getContent('travel', 'bookNow')} <i class="fas fa-external-link-alt"></i>
            </a>
          </div>

          <div class="hotel-card">
            <div class="card-header">
              <div class="hotel-icon">
                <i class="fas fa-search-location"></i>
              </div>
              <div class="hotel-details">
                <h3>${getContent('travel', 'otherHotels')}</h3>
              </div>
            </div>
            <p>${getContent('travel', 'otherHotelsDesc')}</p>
            <a href="https://www.google.com/travel/search?q=hotels%20agoura%20hills&g2lb=4965990%2C4969803%2C72277293%2C72302247%2C72317059%2C72414906%2C72471280%2C72472051%2C72481459%2C72485658%2C72560029%2C72573224%2C72616120%2C72647020%2C72648289%2C72686036%2C72760082%2C72803964%2C72832976%2C72882230%2C72885032%2C72946003%2C72948010%2C72958594%2C72958624%2C72959983%2C72969407%2C72969663&hl=en-US&gl=us&ssta=1&ts=CAESCgoCCAMKAggDEAAafwphEjUyJTB4ODBlODIxMWUyM2FhMWM5NToweGFjMGVmNmFlMmRkZmZkZDY6DEFnb3VyYSBIaWxscxooChIJAJGQBJMHQUARpC69N1O4XcASEgnZBVkKhh1BQBGkLr1ncKddwBIaEhQKBwjpDxAJGAwSBwjpDxAJGA4YAjICCAEqBwoFOgNVU0Q&qs=CAE4BlpPCAEyS6oBSBABKgoiBmhvdGVscygAMh8QASIbkVoVClkeODeSTmJsydXSgEbugwLIWAf8D7ziMhcQAiITaG90ZWxzIGFnb3VyYSBoaWxscw&ap=KigKEgkAkZAEkwdBQBGkLr03U7hdwBISCdkFWQqGHUFAEaQuvWdwp13AMAJoAQ&ictx=111&ved=0CAAQ5JsGahcKEwiIgPr_p7ONAxUAAAAAHQAAAAAQBg" 
               target="_blank" class="hotel-link">
              ${getContent('travel', 'searchHotels')} <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        </div>
      </div>

      <div class="travel-section">
        <div class="section-header">
          <i class="fas fa-home"></i>
          <h2>${getContent('travel', 'otherOptions')}</h2>
        </div>
        <div class="section-content">
          <div class="hotel-card">
            <div class="card-header">
              <div class="hotel-icon">
                <i class="fas fa-home"></i>
              </div>
              <div class="hotel-details">
                <h3>${getContent('travel', 'airbnbTitle')}</h3>
              </div>
            </div>
            <p>${getContent('travel', 'airbnbDesc')}</p>
            <a href="https://www.airbnb.com/s/Agoura-Hills--CA/homes?refinement_paths%5B%5D=%2Fhomes&place_id=ChIJlRyqIx4h6IAR1v3fLa72Dqw&checkin=2025-09-12&checkout=2025-09-14&adults=2&query=Agoura%20Hills%2C%20CA&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=2025-06-01&monthly_length=3&monthly_end_date=2025-09-01&search_mode=regular_search&price_filter_input_type=2&price_filter_num_nights=2&channel=EXPLORE&source=structured_search_input_header&search_type=user_map_move&ne_lat=34.25319394821856&ne_lng=-118.604458777741&sw_lat=34.040701434194176&sw_lng=-118.88559867452989&zoom=12.622464229316126&zoom_level=12.622464229316126&search_by_map=true" 
               target="_blank" class="hotel-link">
              ${getContent('travel', 'searchAirbnb')} <i class="fas fa-external-link-alt"></i>
            </a>
          </div>

          <div class="hotel-card">
            <div class="card-header">
              <div class="hotel-icon">
                <i class="fas fa-hotel"></i>
              </div>
              <div class="hotel-details">
                <h3>${getContent('travel', 'bookingTitle')}</h3>
              </div>
            </div>
            <p>${getContent('travel', 'bookingDesc')}</p>
            <a href="https://www.booking.com/searchresults.html?ss=Agoura+Hills&ssne=Agoura+Hills&ssne_untouched=Agoura+Hills&efdco=1&label=gog235jc-1DCAMo7AFCDGFnb3VyYS1oaWxsc0gzWANoiQKIAQGYATG4ARfIAQzYAQPoAQH4AQKIAgGoAgO4AqK_tMEGwAIB0gIkMTg2M2VlOWQtMTY2Ny00MjY5LThmYzktMTMyNGM5M2JhZTQ52AIE4AIB&aid=356980&lang=en-us&sb=1&src_elem=sb&src=city&dest_id=20011229&dest_type=city&checkin=2025-09-12&checkout=2025-09-14&group_adults=2&no_rooms=1&group_children=0&sb_travel_purpose=leisure&sb_lp=1#map_opened" 
               target="_blank" class="hotel-link">
              ${getContent('travel', 'searchBooking')} <i class="fas fa-external-link-alt"></i>
            </a>
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

      // Use the same photo array as preloadPhotos
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
      ];

      // Create photo elements
      photos.forEach((photo, idx) => {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.style.animationDelay = (0.1 * idx) + 's'; // Stagger entrance
        item.innerHTML = `
          <div class="photo-wrapper">
            <img src="${photo}" alt="Wedding Photo" loading="lazy">
          </div>
        `;

        // Add click handler for lightbox
        item.querySelector('img').addEventListener('click', () => {
          showLightbox(photo);
        });

        // inside photos.forEach((photo, idx) => { … })
        item.style.opacity      = 0;            // start invisible
        item.style.marginBottom = '20px';       // vertical spacing between rows

        // then append it…
        photoGallery.appendChild(item);

        // and kick off a Web-Animations API fly-in+spin:
        item.animate([
          { transform: 'translateY(50px) rotate(-720deg)', opacity: 0 },
          { transform: 'translateY(-10px) rotate(20deg)', opacity: 1, offset: 0.6 },
          { transform: 'translateY(0)    rotate(0deg)', opacity: 1 }
        ], {
          duration: 800,
          easing:   'cubic-bezier(.38,.61,.6,1.02)',
          delay:    idx * 100,    // stagger by 100ms per photo
          fill:     'forwards'
        });

        photoGallery.appendChild(item);
      });

      // Initialize Masonry only on desktop
      let masonry = null;
      function initMasonry() {
        if (masonry) {
          masonry.destroy();
          masonry = null;
        }
      
        imagesLoaded('#photoGallery', function() {
          masonry = new Masonry('#photoGallery', {
            itemSelector: '.photo-item',
            percentPosition: true,
            transitionDuration: '0.3s',
            gutter: 10,
          });
      
          setTimeout(() => {
            if (masonry) {
              masonry.layout();
            }
          }, 100);
        });
      }
      

      // Initialize on load
      initMasonry();

      // Reinitialize on resize with debounce
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initMasonry, 250);
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
      </div>
    `;

    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';

    // Close lightbox on click
    lightbox.addEventListener('click', () => {
      lightbox.remove();
      document.body.style.overflow = '';
    });
  }

  // Load photos
  loadPhotos();
}

async function renderDetails()  {
  app.innerHTML = `
    <div class="details-container">
      <div class="details-section">
        <h2><i class="fas fa-calendar-check"></i> ${getContent('details', 'rsvp')}</h2>
        <div class="details-card">
          <p>${getContent('details', 'rsvpText')}</p>
        </div>
      </div>

      <div class="details-section">
        <h2><i class="fas fa-map-marked-alt"></i> ${getContent('details', 'location')}</h2>
        <div class="details-card">
          <p>${getContent('details', 'locationText')}</p>
        </div>
      </div>

      <div class="details-section">
        <h2><i class="fas fa-cloud-sun"></i> ${getContent('details', 'weather')}</h2>
        <div class="details-card">
          <p>${getContent('details', 'weatherText')}</p>
        </div>
      </div>

      ${currentUser.kidsFAQ ? `
      <div class="details-section">
        <h2><i class="fas fa-child"></i> Kids</h2>
        <div class="details-card">
          <p>${getContent('details', 'kidsFAQ')}</p>
        </div>
      </div>
      ` : ''}

      <div class="details-section">
        <h2><i class="fas fa-gift"></i> ${getContent('details', 'registry')}</h2>
        <div class="details-card">
          <p>${getContent('details', 'registryText')}</p>
        </div>
      </div>
      
      <div class="details-section">
        <h2><i class="fas fa-question-circle"></i> ${getContent('details', 'questions')}</h2>
        <div class="details-card">
          <p>${getContent('details', 'questionsText')}</p>
        </div>
      </div>
    </div>
  `;
}

// Add registry state tracking
let previousRegistryState = null;

async function renderRegistry() {
  const intros = {
    en: `Your presence at our wedding is the greatest gift in the world. 
         Please don't feel obligated to bring anything; but if you wish, below are some registry and cash-gift options.`,
    pl: `Twoja obecność na naszym weselu to największy prezent. 
         Prosimy, nie czuj się zobowiązany do przynoszenia czegokolwiek; jeśli jednak chcesz, poniżej znajdziesz opcje prezentów i kasy.`,
    gu: `અમારા લગ્નમાં તમારી હાજરી સર્વશ્રેષ્ઠ ભેટ છે. 
         કૃપા કરીને કંઈ લાવવાની તકેદારી महसूસ نہ કરો; પરંતુ જો તમે ઇચ્છો તો નીચે રજિસ્ટ્રી અને કેશ-ગિફ્ટ વિકલ્પો છે.`
  };

  // Get current user
  const uid = sessionStorage.getItem("weddingUser");
  if (!uid) {
    throw new Error("User not logged in");
  }

  // First verify the user exists
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) {
    throw new Error("User not found");
  }

  // Then fetch existing registry data
  const registryDoc = await getDoc(doc(db, "registry", uid));
  const existingData = registryDoc.exists() ? registryDoc.data() : null;

  app.innerHTML = `
    <div class="registry-container">
      <div class="registry-intro">${intros[currentLanguage]}</div>

      <section class="registry-section">
        <h2><i class="fas fa-gift"></i> Amazon Registry</h2>
        <p>Shop our curated Amazon list for items we'll enjoy for years to come.</p>
        <a href="https://www.amazon.com/registry/your-registry-link" target="_blank" class="hotel-link">
          View on Amazon <i class="fas fa-external-link-alt"></i>
        </a>
      </section>

      <section class="registry-section">
        <h2><i class="fas fa-money-bill-wave"></i> Cash Gift</h2>
        <p>Choose how you'd like to split up your gift contribution (enter total):</p>
        <div class="slider-wrapper">
          <div class="slider-label">Total amount</div>
          <div class="slider-controls">
            <span>$</span>
            <input type="number" id="totalAmount" value="${existingData?.totalAmount || 0}" min="0" step="1" class="manual-input">
          </div>
        </div>
        <div id="slidersContainer"></div>
        <button id="submitRegistry" class="hotel-link" ${!existingData?.totalAmount ? 'disabled' : ''}>${existingData ? 'Update Allocation' : 'Confirm Allocation'}</button>
        <div id="registryStatus" class="registry-status"></div>
      </section>
    </div>
  `;

  const categories = [
    { key: 'honeymoon',  label: 'Honeymoon Fund',    desc: 'Planning our dream trip to Switzerland.' },
    { key: 'puppy',      label: 'Puppy Fund',         desc: 'Pampering our dog Rex (and future puppy!).' },
    { key: 'baby',       label: 'Future Baby Fund',   desc: 'Saving for little ones down the road.' },
    { key: 'house',      label: 'Household Fund',     desc: 'Buying home essentials—and sharing the pics!' },
    { key: 'entertain',  label: 'Entertainment Fund', desc: 'Fun experiences—photos guaranteed!' }
  ];

  const totalInput = document.getElementById('totalAmount');
  const slidersDiv = document.getElementById('slidersContainer');
  const submitButton = document.getElementById('submitRegistry');
  const statusDiv = document.getElementById('registryStatus');

  // build each slider + manual box
  categories.forEach(cat => {
    const existingValue = existingData?.allocations?.[cat.key] || 0;
    const wr = document.createElement('div');
    wr.className = 'slider-wrapper';
    wr.innerHTML = `
      <div class="slider-label">${cat.label}</div>
      <div class="slider-controls">
        <input type="range" id="${cat.key}Slider" min="0" max="${existingData?.totalAmount || 0}" value="${existingValue}">
        <span>$</span>
        <input type="number" id="${cat.key}Manual" class="manual-input" min="0" max="${existingData?.totalAmount || 0}" step="1" value="${existingValue}" ${!existingData?.totalAmount ? 'disabled' : ''}>
      </div>
      <div class="slider-description">${cat.desc}</div>
    `;
    slidersDiv.appendChild(wr);
  });

  let busy = false;
  function getAll() {
    return categories.map(c => ({
      key: c.key,
      slider: document.getElementById(c.key + 'Slider'),
      manual: document.getElementById(c.key + 'Manual')
    }));
  }

  function redistribute(changed) {
    if (busy) return;
    busy = true;
    const total = Math.floor(+totalInput.value) || 0;
    let items = getAll();
    let sum = items.reduce((s, o) => s + +o.slider.value, 0);
    let over = sum - total;
    if (over > 0) {
      let others = items.filter(o => o.key !== changed);
      let pool = others.reduce((s, o) => s + +o.slider.value, 0);
      others.forEach(o => {
        const cur = +o.slider.value;
        const cut = pool > 0 ? Math.round(over * (cur / pool)) : Math.ceil(over / others.length);
        const next = Math.max(0, cur - cut);
        o.slider.value = next;
        o.manual.value = next;
      });
    }
    busy = false;
  }

  // wire events
  getAll().forEach(({ key, slider, manual }) => {
    slider.addEventListener('input', () => {
      manual.value = Math.floor(slider.value);
      redistribute(key);
    });
    manual.addEventListener('input', () => {
      const v = Math.min(Math.max(0, Math.floor(manual.value)), +totalInput.value);
      manual.value = v;
      slider.value = v;
      redistribute(key);
    });
  });

  // reconfigure when total changes
  totalInput.addEventListener('input', () => {
    const tot = Math.floor(+totalInput.value) || 0;
    getAll().forEach(({ slider, manual }) => {
      slider.max = tot;
      manual.max = tot;
      slider.disabled = tot === 0;
      manual.disabled = tot === 0;
      if (tot === 0) {
        slider.value = 0;
        manual.value = 0;
      }
    });
    // Enable/disable submit button based on total
    submitButton.disabled = tot === 0;
  });

  // submit
  submitButton.onclick = async () => {
    try {
      // Get current allocations
      const newAllocations = {};
      getAll().forEach(({ key, slider }) => {
        const amount = Math.floor(+slider.value);
        if (amount > 0) {
          newAllocations[key] = amount;
        }
      });

      const totalAmount = Math.floor(+totalInput.value);
      const newState = {
        allocations: newAllocations,
        totalAmount
      };

      // Only write if there are changes
      if (JSON.stringify(previousRegistryState) !== JSON.stringify(newState)) {
        // Show loading state
        submitButton.disabled = true;
        statusDiv.innerHTML = '<div class="loading">Saving your contribution...</div>';

        // Create batch
        const batch = writeBatch(db);
        const registryRef = doc(db, "registry", uid);
        
        batch.set(registryRef, {
          userId: uid,
          allocations: newAllocations,
          totalAmount,
          timestamp: new Date()
        });

        // Commit changes
        await batch.commit();

        // Update previous state
        previousRegistryState = newState;

        // Show success message
        statusDiv.innerHTML = '<div class="success">Thank you for your contribution!</div>';
        
        // Update button text
        submitButton.textContent = 'Update Allocation';
        
        // Reset form after 2 seconds
        setTimeout(() => {
          statusDiv.innerHTML = '';
          submitButton.disabled = false;
        }, 2000);
      } else {
        statusDiv.innerHTML = '<div class="info">No changes to save.</div>';
        setTimeout(() => {
          statusDiv.innerHTML = '';
        }, 2000);
      }

    } catch (error) {
      console.error("Error saving registry contribution:", error);
      statusDiv.innerHTML = '<div class="error">Error saving contribution. Please try again.</div>';
      submitButton.disabled = false;
    }
  };
}

async function renderRSVP(user){
  const snap = await getDocs(query(collection(db,"users"),
    where("groupId","==",user.groupId)));
  const members = snap.docs.map(d=>({ uid:d.id, ...d.data() }));
  // Ensure main user is first, +1 second
  members.sort((a, b) => {
    if (a.uid === user.uid) return -1;
    if (b.uid === user.uid) return 1;
    if (a.isPlusOne && a.plusOneOf === user.uid) return 1;
    if (b.isPlusOne && b.plusOneOf === user.uid) return -1;
    return 0;
  });

  // Define events and their IDs
  const events = [
    { id: "Church", title: "Church Ceremony" },
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

  let html = `
    <div class="rsvp-container">
      <h1>${getContent('rsvp', 'title')}: ${user.groupId}</h1>
      <div class="rsvp-instructions">
        <p>${getContent('rsvp', 'instructions')}</p>
        ${user.plusOneAllowed ? `<p>${getContent('rsvp', 'plusOneInstructions')}</p>` : ''}
      </div>
      <table class="rsvp-table">
        <thead>
          <tr>
            <th>${getContent('rsvp', 'title')}</th>`;
  
  // Only show events that at least one member is invited to
  const invitedEvents = events.filter(ev => 
    members.some(m => m[`invited${ev.id}`])
  );
  
  invitedEvents.forEach(ev=> html+=`<th>${ev.title}</th>`);
  html += `<th>${getContent('rsvp', 'allergies')}\n/ ${getContent('rsvp', 'dietaryRestrictions')}</th></tr></thead><tbody>`;

  members.forEach(m=>{
    html += `<tr><td>${m.firstName} ${m.lastName}</td>`;
    invitedEvents.forEach(ev=>{
      const key = `invited${ev.id}`;
      if (m[key]) {
        const rsvpKey = `${m.uid}_${ev.id}`;
        const isChecked = rsvps[rsvpKey] ? 'checked' : '';
        html += `<td data-label="${ev.title}"><input type="checkbox"
                   data-uid="${m.uid}" data-event="${ev.id}"
                   ${isChecked}></td>`;
      }
    });
    // Add allergies input field
    html += `<td data-label="${getContent('rsvp', 'allergies')} /\n${getContent('rsvp', 'dietaryRestrictions')}"><input type="text" class="allergies-input" 
              data-uid="${m.uid}" 
              value="${m.allergies || ''}" 
              placeholder="${getContent('rsvp', 'allergiesPlaceholder')}"
              style="width: 90%;"></td>`;
    html += "</tr>";
  });

  // Add +1 row if user has plusOneAllowed
  if (user.plusOneAllowed) {
    html += `<tr class="plus-one-row">
      <td>
        <div class="plus-one-name-container">
          <input type="text" id="plusOneFirstName" placeholder="${getContent('rsvp', 'firstNamePlaceholder')}" class="plus-one-name" maxlength="30">
          <input type="text" id="plusOneLastName" placeholder="${getContent('rsvp', 'lastNamePlaceholder')}" class="plus-one-name" maxlength="30">
        </div>
      </td>`;
    
    invitedEvents.forEach(ev => {
      html += `<td data-label="${ev.title}">
        <input type="checkbox" class="plus-one-event" data-event="${ev.id}">
      </td>`;
    });
    
    html += `<td data-label="${getContent('rsvp', 'allergies')} /\n${getContent('rsvp', 'dietaryRestrictions')}">
      <input type="text" id="plusOneAllergies" class="allergies-input" placeholder="${getContent('rsvp', 'allergiesPlaceholder')}" style="width: 90%;">
    </td></tr>`;
  }

  html += `</tbody></table>
    <button id="submitRSVP">${user.hasRSVPed ? getContent('rsvp', 'resubmit') : getContent('rsvp', 'submit')}</button>
  </div>`;
  app.innerHTML = html;

  document.getElementById('submitRSVP').onclick = async () => {
    try {
      const submitButton = document.getElementById('submitRSVP');
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      // Create success message div if it doesn't exist
      let successMsg = document.querySelector('.rsvp-success');
      if (!successMsg) {
        successMsg = document.createElement('div');
        successMsg.className = 'rsvp-success';
        document.querySelector('.rsvp-container').insertBefore(
          successMsg,
          document.querySelector('.rsvp-table')
        );
      }
      successMsg.style.display = 'none';

      // Create a batch for all writes
      const batch = writeBatch(db);

      // Save RSVPs for existing members
      Array.from(document.querySelectorAll("input[type=checkbox]:not(.plus-one-event)")).forEach(cb => {
        const rsvpRef = doc(db, "rsvps", `${cb.dataset.uid}_${cb.dataset.event}`);
        batch.set(rsvpRef, {
          userId: cb.dataset.uid,
          eventId: cb.dataset.event,
          attending: cb.checked
        });
      });

      // Save allergies for existing members
      Array.from(document.querySelectorAll(".allergies-input:not(#plusOneAllergies)")).forEach(input => {
        const userRef = doc(db, "users", input.dataset.uid);
        batch.update(userRef, { allergies: input.value.trim() });
      });

      // Handle +1 guest if present
      if (members.length === 1) {
        const plusOneFirstName = document.getElementById('plusOneFirstName').value.trim();
        const plusOneLastName = document.getElementById('plusOneLastName').value.trim();
        const plusOneAllergies = document.getElementById('plusOneAllergies').value.trim();
        
        if (plusOneFirstName && plusOneLastName) {
          const eventIds = ["Church", "WelcomeParty", "MainWedding", "SundayBrunchEarly", "SundayBrunchLate"];
          const plusOneInvites = {};
          const plusOneRSVPs = {};
          
          // Read from the form for each event
          for (const evId of eventIds) {
            const cb = document.querySelector(`.plus-one-event[data-event="${evId}"]`);
            plusOneInvites[`invited${evId}`] = !!cb;
            plusOneRSVPs[evId] = cb && cb.checked;
          }

          const plusOneRef = doc(collection(db, "users"));
          batch.set(plusOneRef, {
            firstName: plusOneFirstName,
            lastName: plusOneLastName,
            groupId: user.groupId,
            allergies: plusOneAllergies,
            isPlusOne: true,
            plusOneOf: user.uid,
            hasRSVPed: true,
            ...plusOneInvites
          });

          for (const evId of eventIds) {
            const rsvpRef = doc(db, "rsvps", `${plusOneRef.id}_${evId}`);
            batch.set(rsvpRef, {
              userId: plusOneRef.id,
              eventId: evId,
              attending: plusOneRSVPs[evId]
            });
          }
        }
      }

      // Mark all group members as having RSVPed
      members.forEach(member => {
        const userRef = doc(db, "users", member.uid);
        batch.update(userRef, { hasRSVPed: true });
      });

      // Commit all changes in one batch
      await batch.commit();

      // Clear cache since we've made changes
      cache.clear();

      // Update success message and button
      successMsg.innerHTML = `
        <div class="success-content">
          <i class="fas fa-check-circle"></i>
          <p>Thank you for your RSVP! Your response has been recorded.</p>
          <p class="success-subtitle">You can update your response anytime before July 13, 2025.</p>
        </div>
      `;
      successMsg.style.display = 'block';
      
      // Smooth scroll to success message
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Update button state
      submitButton.disabled = false;
      submitButton.textContent = getContent('rsvp', 'resubmit');
      
      // Update user's hasRSVPed status locally to maintain state
      user.hasRSVPed = true;

    } catch (error) {
      console.error("Error submitting RSVP:", error);
      const submitButton = document.getElementById('submitRSVP');
      submitButton.disabled = false;
      submitButton.textContent = user.hasRSVPed ? getContent('rsvp', 'resubmit') : getContent('rsvp', 'submit');
      
      // Show error message
      let errorMsg = document.querySelector('.rsvp-error');
      if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.className = 'rsvp-error';
        document.querySelector('.rsvp-container').insertBefore(
          errorMsg,
          document.querySelector('.rsvp-table')
        );
      }
      errorMsg.innerHTML = `
        <div class="error-content">
          <i class="fas fa-exclamation-circle"></i>
          <p>There was an error submitting your RSVP. Please try again.</p>
        </div>
      `;
      errorMsg.style.display = 'block';
    }
  };
}

// Remove pagination constants
// const USERS_PER_PAGE = 20;
// let currentPage = 1;

async function renderAdmin(user) {
  try {
    // Fetch all users
    const userSnap = await getDocs(query(
      collection(db, "users"),
      orderBy("groupId")
    ));

    // Get events from cache
    const events = await cache.getEvents();

    // Fetch RSVPs for all users in batches of 30
    const userIds = userSnap.docs.map(doc => doc.id);
    const rsvps = {};
    
    // Split userIds into chunks of 30
    for (let i = 0; i < userIds.length; i += 30) {
      const chunk = userIds.slice(i, i + 30);
      const rsvpSnap = await getDocs(query(
        collection(db, "rsvps"),
        where("userId", "in", chunk)
      ));
      
      rsvpSnap.docs.forEach(doc => {
        const { userId, eventId, attending } = doc.data();
        if (!rsvps[userId]) rsvps[userId] = {};
        rsvps[userId][eventId] = attending;
      });
    }

    // Build the admin view
    let html = `
      <div class="admin-dashboard">
        <h1>Admin Dashboard</h1>
        
        <div class="admin-actions">
          <button id="addUserBtn" class="admin-button">
            <i class="fas fa-user-plus"></i> Add New User
          </button>
          <button id="clearFilters" class="admin-button">Clear Filters</button>
        </div>

        <div class="table-container">
          <table id="adminTable" class="admin-table">
            <thead>
              <tr>
                <th data-sort="groupId">Group <i class="fas fa-sort"></i></th>
                <th data-sort="name">Guest <i class="fas fa-sort"></i></th>
                <th data-sort="hasRSVPed">Has RSVPed <i class="fas fa-sort"></i></th>
                <th data-sort="isPlusOne">Is +1 <i class="fas fa-sort"></i></th>
                <th data-sort="plusOneAllowed">Has +1 <i class="fas fa-sort"></i></th>
                <th data-sort="kidsFAQ">Kids FAQ <i class="fas fa-sort"></i></th>
                <th data-sort="invitedChurch">Church <i class="fas fa-sort"></i></th>
                <th data-sort="invitedWelcomeParty">Welcome Party <i class="fas fa-sort"></i></th>
                <th data-sort="invitedMainWedding">Wedding <i class="fas fa-sort"></i></th>
                <th data-sort="invitedSundayBrunchEarly">Brunch (Early) <i class="fas fa-sort"></i></th>
                <th data-sort="invitedSundayBrunchLate">Brunch (Late) <i class="fas fa-sort"></i></th>
                <th data-sort="allergies">Allergies <i class="fas fa-sort"></i></th>
                <th data-sort="actions">Actions <i class="fas fa-sort"></i></th>
              </tr>
              <tr id="filterRow">
                <th><input type="text" placeholder="Filter group..." data-filter="groupId"></th>
                <th><input type="text" placeholder="Filter name..." data-filter="name"></th>
                <th>
                  <select data-filter="hasRSVPed">
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </th>
                <th>
                  <select data-filter="isPlusOne">
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </th>
                <th>
                  <select data-filter="plusOneAllowed">
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </th>
                <th>
                  <select data-filter="kidsFAQ">
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </th>
                <th>
                  <select data-filter="Church">
                    <option value="">All</option>
                    <option value="invited">Invited</option>
                    <option value="not-invited">Not Invited</option>
                    <option value="rsvp-yes">Invited - RSVPed Yes</option>
                    <option value="rsvp-no">Invited - RSVPed No</option>
                  </select>
                </th>
                <th>
                  <select data-filter="WelcomeParty">
                    <option value="">All</option>
                    <option value="invited">Invited</option>
                    <option value="not-invited">Not Invited</option>
                    <option value="rsvp-yes">Invited - RSVPed Yes</option>
                    <option value="rsvp-no">Invited - RSVPed No</option>
                  </select>
                </th>
                <th>
                  <select data-filter="MainWedding">
                    <option value="">All</option>
                    <option value="invited">Invited</option>
                    <option value="not-invited">Not Invited</option>
                    <option value="rsvp-yes">Invited - RSVPed Yes</option>
                    <option value="rsvp-no">Invited - RSVPed No</option>
                  </select>
                </th>
                <th>
                  <select data-filter="SundayBrunchEarly">
                    <option value="">All</option>
                    <option value="invited">Invited</option>
                    <option value="not-invited">Not Invited</option>
                    <option value="rsvp-yes">Invited - RSVPed Yes</option>
                    <option value="rsvp-no">Invited - RSVPed No</option>
                  </select>
                </th>
                <th>
                  <select data-filter="SundayBrunchLate">
                    <option value="">All</option>
                    <option value="invited">Invited</option>
                    <option value="not-invited">Not Invited</option>
                    <option value="rsvp-yes">Invited - RSVPed Yes</option>
                    <option value="rsvp-no">Invited - RSVPed No</option>
                  </select>
                </th>
                <th><input type="text" placeholder="Filter allergies..." data-filter="allergies"></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            ${userSnap.docs.map(doc => {
              const user = doc.data();
              // 1) build your event‐cells string
              const eventCells = [
                'Church','WelcomeParty','MainWedding','SundayBrunchEarly','SundayBrunchLate'
              ].map(evId => {
                const invited = user[`invited${evId}`];
                const rsvp   = rsvps[user.id]?.[evId];
                return `
                  <td class="admin-event-status">
                    <div class="admin-event-invited">
                      <input type="checkbox" ${invited ? 'checked' : ''} data-event="${evId}">
                    </div>
                    ${invited
                      ? `<div class="admin-event-rsvp ${rsvp===true?'rsvp-yes':rsvp===false?'rsvp-no':''}">
                           ${ rsvp===true ? '✔' : rsvp===false ? '✖' : '' }
                         </div>`
                      : ''
                    }
                  </td>`;
              }).join('');

              // 2) return the full <tr>
              return `
                <tr data-user-id="${user.id}">
                  <td>${user.groupId}</td>
                  <td>${user.firstName} ${user.lastName}</td>
                  <td>${user.hasRSVPed ? '✔' : '✖'}</td>
                  <td>${user.isPlusOne ? '✔' : ''}</td>
                  <td>
                    <input type="checkbox" class="plus-one-allowed" ${user.plusOneAllowed ? 'checked' : ''}>
                  </td>
                  <td>
                    <input type="checkbox" class="kids-faq" ${user.kidsFAQ ? 'checked' : ''}>
                  </td>
                  ${eventCells}
                  <td>${user.allergies||''}</td>
                  <td>
                    <button class="edit-user-btn">✎</button>
                    <button class="clear-rsvp-btn" ${user.hasRSVPed?'':'disabled'}>🗑</button>
                  </td>
                </tr>`;
            }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("app").innerHTML = html.trim();

    // Add event listeners for sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        sortTable(field);
      });
    });

    // Add event listeners for filtering
    document.querySelectorAll('[data-filter]').forEach(input => {
      input.addEventListener('input', () => {
        filterTable();
      });
    });

    // Clear filters button
    document.getElementById('clearFilters').addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(input => {
        input.value = '';
      });
      filterTable();
    });

    // Add event listeners for user actions
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        const userId = row.dataset.userId;
        showEditUserModal(users.find(u => u.id === userId));
      });
    });

    document.querySelectorAll('.clear-rsvp-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to clear this user\'s RSVPs?')) return;
        
        const row = e.target.closest('tr');
        const userId = row.dataset.userId;
        await clearUserRSVPs(userId);
        renderAdmin(user); // Refresh the page
      });
    });

    // Add new user button
    document.getElementById('addUserBtn').addEventListener('click', () => {
      showAddUserModal();
    });

    // Add event listeners for event checkboxes
    document.querySelectorAll('input[type="checkbox"][data-event]').forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const userId = e.target.closest('tr').dataset.userId;
        const event = e.target.dataset.event;
        const checked = e.target.checked;
        
        await updateUserEvent(userId, event, checked);
      });
    });

    // Add event listeners for plusOneAllowed checkboxes
    document.querySelectorAll('.plus-one-allowed').forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const userId = e.target.closest('tr').dataset.userId;
        const checked = e.target.checked;
        
        try {
          await setDoc(doc(db, "users", userId), {
            plusOneAllowed: checked
          }, { merge: true });
        } catch (error) {
          console.error("Error updating plusOneAllowed:", error);
          alert("Error updating plusOneAllowed. Please try again.");
          // Revert checkbox state
          e.target.checked = !checked;
        }
      });
    });

    // Add event listeners for kidsFAQ checkboxes
    document.querySelectorAll('.kids-faq').forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const userId = e.target.closest('tr').dataset.userId;
        const checked = e.target.checked;
        
        try {
          await setDoc(doc(db, "users", userId), {
            kidsFAQ: checked
          }, { merge: true });
        } catch (error) {
          console.error("Error updating kidsFAQ:", error);
          alert("Error updating kidsFAQ. Please try again.");
          // Revert checkbox state
          e.target.checked = !checked;
        }
      });
    });

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

// Helper functions for admin page
async function updateUserEvent(userId, event, invited) {
  try {
    await setDoc(doc(db, "users", userId), {
      [`invited${event}`]: invited
    }, { merge: true });
  } catch (error) {
    console.error("Error updating user event:", error);
    alert("Error updating user event. Please try again.");
  }
}

async function clearUserRSVPs(userId) {
  try {
    // Clear hasRSVPed flag
    await setDoc(doc(db, "users", userId), {
      hasRSVPed: false
    }, { merge: true });

    // Delete all RSVPs for this user
    const rsvpSnap = await getDocs(query(collection(db, "rsvps"), where("userId", "==", userId)));
    const deletePromises = rsvpSnap.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error clearing RSVPs:", error);
    alert("Error clearing RSVPs. Please try again.");
  }
}

function showEditUserModal(user) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Edit User</h2>
      <form id="editUserForm">
        <div class="form-group">
          <label>First Name:</label>
          <input type="text" name="firstName" value="${user.firstName}" required>
        </div>
        <div class="form-group">
          <label>Last Name:</label>
          <input type="text" name="lastName" value="${user.lastName}" required>
        </div>
        <div class="form-group">
          <label>Preferred Name:</label>
          <input type="text" name="preferredName" value="${user.preferredName || ''}">
        </div>
        <div class="form-group">
          <label>Group ID:</label>
          <input type="text" name="groupId" value="${user.groupId}" required>
        </div>
        <div class="form-group">
          <label>Allergies:</label>
          <input type="text" name="allergies" value="${user.allergies || ''}">
        </div>
        <div class="modal-actions">
          <button type="submit" class="save-btn">Save</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.cancel-btn').onclick = () => {
    modal.remove();
  };

  modal.querySelector('#editUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = Object.fromEntries(formData.entries());
    
    try {
      await setDoc(doc(db, "users", user.id), updates, { merge: true });
      modal.remove();
      renderAdmin(user); // Refresh the page
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error updating user. Please try again.");
    }
  };
}

function showAddUserModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Add New User</h2>
      <form id="addUserForm">
        <div class="form-group">
          <label>First Name:</label>
          <input type="text" name="firstName" required>
        </div>
        <div class="form-group">
          <label>Last Name:</label>
          <input type="text" name="lastName" required>
        </div>
        <div class="form-group">
          <label>Preferred Name:</label>
          <input type="text" name="preferredName">
        </div>
        <div class="form-group">
          <label>Group ID:</label>
          <input type="text" name="groupId" required>
        </div>
        <div class="form-group">
          <label>Allergies:</label>
          <input type="text" name="allergies">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" name="plusOneAllowed">
            Allow +1
          </label>
        </div>
        <div class="event-checkboxes">
          <h3>Invited Events:</h3>
          <label><input type="checkbox" name="invitedChurch"> Church</label>
          <label><input type="checkbox" name="invitedWelcomeParty"> Welcome Party</label>
          <label><input type="checkbox" name="invitedMainWedding"> Wedding</label>
          <label><input type="checkbox" name="invitedSundayBrunchEarly"> Sunday Brunch (Early)</label>
          <label><input type="checkbox" name="invitedSundayBrunchLate"> Sunday Brunch (Late)</label>
        </div>
        <div class="modal-actions">
          <button type="submit" class="save-btn">Add User</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.cancel-btn').onclick = () => {
    modal.remove();
  };

  modal.querySelector('#addUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = {
      ...Object.fromEntries(formData.entries()),
      hasRSVPed: false,
      isPlusOne: false
    };

    // Convert checkbox values to booleans
    ['invitedChurch', 'invitedWelcomeParty', 'invitedMainWedding', 
     'invitedSundayBrunchEarly', 'invitedSundayBrunchLate', 'plusOneAllowed'].forEach(field => {
      userData[field] = formData.get(field) === 'on';
    });
    
    try {
      await addDoc(collection(db, "users"), userData);
      modal.remove();
      renderAdmin(); // Refresh the page
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Error adding user. Please try again.");
    }
  };
}

function sortTable(field) {
  const table = document.getElementById('adminTable');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  const th = table.querySelector(`th[data-sort="${field}"]`);
  const isAsc = th.classList.contains('asc');
  
  // Clear all sort indicators
  table.querySelectorAll('th').forEach(th => {
    th.classList.remove('asc', 'desc');
  });
  
  // Set new sort indicator
  th.classList.toggle('asc', !isAsc);
  th.classList.toggle('desc', isAsc);

  rows.sort((a, b) => {
    let aVal, bVal;
    
    if (field === 'name') {
      aVal = a.querySelector('.user-name').textContent.trim();
      bVal = b.querySelector('.user-name').textContent.trim();
    } else if (field === 'hasRSVPed' || field === 'isPlusOne') {
      aVal = a.querySelector(`td:nth-child(${field === 'hasRSVPed' ? 3 : 4})`).querySelector('i.fa-check') !== null;
      bVal = b.querySelector(`td:nth-child(${field === 'hasRSVPed' ? 3 : 4})`).querySelector('i.fa-check') !== null;
    } else {
      aVal = a.querySelector(`td:nth-child(${Array.from(th.parentNode.children).indexOf(th) + 1})`).textContent.trim();
      bVal = b.querySelector(`td:nth-child(${Array.from(th.parentNode.children).indexOf(th) + 1})`).textContent.trim();
    }
    
    if (aVal === bVal) return 0;
    if (isAsc) {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  rows.forEach(row => tbody.appendChild(row));
}

function filterTable() {
  const table = document.getElementById('adminTable');
  const rows = table.querySelectorAll('tbody tr');
  const filters = {};
  
  // Collect all filter values
  document.querySelectorAll('[data-filter]').forEach(input => {
    const value = input.value.toLowerCase();
    if (value) { // Only add non-empty filters
      filters[input.dataset.filter] = value;
    }
  });
  
  let visibleCount = 0;
  rows.forEach(row => {
    let show = true;

    for (const [field, value] of Object.entries(filters)) {
      if (!show) break; // Skip remaining checks if already hidden

      switch (field) {
        case 'name':
          const guestCell = row.cells[1];
          if (!guestCell.textContent.toLowerCase().includes(value)) show = false;
          break;
        case 'groupId':
          const groupCell = row.cells[0];
          if (!groupCell.textContent.toLowerCase().includes(value)) show = false;
          break;
        case 'hasRSVPed':
          const rsvpCell = row.cells[2];
          const hasCheck = rsvpCell.textContent.trim() === '✔';
          if ((value === 'true' && !hasCheck) || (value === 'false' && hasCheck)) show = false;
          break;
        case 'isPlusOne':
          const plusOneCell = row.cells[3];
          const isPlusOne = plusOneCell.textContent.trim() === '✔';
          if ((value === 'true' && !isPlusOne) || (value === 'false' && isPlusOne)) show = false;
          break;
        case 'plusOneAllowed':
          const plusOneAllowedCell = row.cells[4];
          const plusOneAllowed = plusOneAllowedCell.querySelector('input[type="checkbox"]').checked;
          if ((value === 'true' && !plusOneAllowed) || (value === 'false' && plusOneAllowed)) show = false;
          break;
        case 'kidsFAQ':
          const kidsFAQCell = row.cells[5];
          const kidsFAQ = kidsFAQCell.querySelector('input[type="checkbox"]').checked;
          if ((value === 'true' && !kidsFAQ) || (value === 'false' && kidsFAQ)) show = false;
          break;
        case 'allergies':
          const allergiesCell = row.cells[row.cells.length - 2];
          if (!allergiesCell.textContent.toLowerCase().includes(value)) show = false;
          break;
        case 'Church':
        case 'WelcomeParty':
        case 'MainWedding':
        case 'SundayBrunchEarly':
        case 'SundayBrunchLate':
          const eventCell = row.querySelector(`td.admin-event-status input[data-event="${field}"]`)?.closest('td');
          if (!eventCell) {
            show = false;
            break;
          }
          const isInvited = eventCell.querySelector('input[type="checkbox"]').checked;
          const rsvpStatus = eventCell.querySelector('.admin-event-rsvp');
          const rsvpYes = rsvpStatus?.classList.contains('rsvp-yes');
          const rsvpNo = rsvpStatus?.classList.contains('rsvp-no');
          switch(value) {
            case 'invited':
              if (!isInvited) show = false;
              break;
            case 'not-invited':
              if (isInvited) show = false;
              break;
            case 'rsvp-yes':
              if (!isInvited || !rsvpYes) show = false;
              break;
            case 'rsvp-no':
              if (!isInvited || !rsvpNo) show = false;
              break;
          }
          break;
      }
    }
    row.style.display = show ? '' : 'none';
    if (show) visibleCount++;
  });
  // Show visible count above the table
  let countDiv = document.getElementById('guestCount');
  if (!countDiv) {
    countDiv = document.createElement('div');
    countDiv.id = 'guestCount';
    countDiv.style.margin = '10px 0';
    table.parentNode.insertBefore(countDiv, table);
  }
  countDiv.textContent = `Guests shown: ${visibleCount}`;
}

// --- 6. Bootstrap ---
window.addEventListener("DOMContentLoaded", ()=>{
  currentLanguage = sessionStorage.getItem('weddingLanguage') || 'en';
  renderLanguageSelector();
  
  // Add menu button and mobile menu
  const menuButton = document.createElement('button');
  menuButton.className = 'menu-button';
  menuButton.innerHTML = '<i class="fas fa-bars"></i>';
  document.body.appendChild(menuButton);

  const mobileMenu = document.createElement('div');
  mobileMenu.className = 'mobile-menu';
  mobileMenu.innerHTML = `
    <button class="close-button"><i class="fas fa-times"></i></button>
    <div class="mobile-menu-content"></div>
  `;
  document.body.appendChild(mobileMenu);

  // Add overlay
  const menuOverlay = document.createElement('div');
  menuOverlay.className = 'menu-overlay';
  document.body.appendChild(menuOverlay);

  // Scroll handling
  let lastScroll = 0;
  const navbar = document.getElementById('main-nav');
  const menuBtn = document.querySelector('.menu-button');

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    const navbarHeight = navbar.offsetHeight;
    
    // Show/hide navbar and menu button based on scroll position
    if (currentScroll > navbarHeight) {
      navbar.classList.add('hidden');
      menuBtn.classList.add('visible');
    } else {
      navbar.classList.remove('hidden');
      menuBtn.classList.remove('visible');
    }
    
    lastScroll = currentScroll;
  });

  function closeMenu() {
    mobileMenu.classList.remove('visible');
    menuOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  function openMenu() {
    mobileMenu.classList.add('visible');
    menuOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    
    // Copy navigation items to mobile menu
    const menuContent = mobileMenu.querySelector('.mobile-menu-content');
    menuContent.innerHTML = '';
    document.querySelectorAll('#main-nav a').forEach(link => {
      const newLink = link.cloneNode(true);
      // Preserve the data-route attribute and active class
      newLink.setAttribute('data-route', link.getAttribute('data-route'));
      if (link.classList.contains('active')) {
        newLink.classList.add('active');
      }
      newLink.addEventListener('click', (e) => {
        e.preventDefault();
        const route = newLink.getAttribute('data-route');
        if (route) {
          navigate(route);
          closeMenu();
        }
      });
      menuContent.appendChild(newLink);
    });
  }

  // Menu button click handler
  menuButton.addEventListener('click', openMenu);

  // Close button click handler
  mobileMenu.querySelector('.close-button').addEventListener('click', closeMenu);

  // Close menu when clicking overlay
  menuOverlay.addEventListener('click', closeMenu);

  if (sessionStorage.getItem("weddingUser")) navigate("home");
  else renderLogin();
});